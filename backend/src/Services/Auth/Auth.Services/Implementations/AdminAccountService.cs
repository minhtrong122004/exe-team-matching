using System.Text.Json;
using Auth.Repository.Entities;
using Auth.Repository.Enums;
using Auth.Repository.Interfaces;
using Auth.Services.DTOs;
using Auth.Services.Interfaces;
using Auth.Services.Security;
using Exe.BuildingBlocks.Exceptions;
using Exe.BuildingBlocks.Paging;
using Exe.Contracts.Events;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Auth.Services.Implementations;

/// <summary>
/// Triển khai các tính năng quản trị tài khoản dành cho Admin:
/// Phân trang, chi tiết, khóa/mở khóa tài khoản, và khởi tạo tài khoản Giảng viên (Lecturer).
/// </summary>
public class AdminAccountService : IAdminAccountService
{
    private readonly IAccountRepository _accountRepository;
    private readonly IRefreshTokenRepository _refreshTokenRepository;
    private readonly IOutboxRepository _outboxRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IValidator<CreateLecturerRequest> _createLecturerValidator;
    private readonly ILogger<AdminAccountService> _logger;

    public AdminAccountService(
        IAccountRepository accountRepository,
        IRefreshTokenRepository refreshTokenRepository,
        IOutboxRepository outboxRepository,
        IUnitOfWork unitOfWork,
        IPasswordHasher passwordHasher,
        IValidator<CreateLecturerRequest> createLecturerValidator,
        ILogger<AdminAccountService> logger)
    {
        _accountRepository = accountRepository;
        _refreshTokenRepository = refreshTokenRepository;
        _outboxRepository = outboxRepository;
        _unitOfWork = unitOfWork;
        _passwordHasher = passwordHasher;
        _createLecturerValidator = createLecturerValidator;
        _logger = logger;
    }

    public async Task<PagedResult<AccountResponse>> GetAccountsPagedAsync(GetAccountsQuery query, CancellationToken ct = default)
    {
        var ascending = query.SortDir?.Equals("asc", StringComparison.OrdinalIgnoreCase) ?? false;
        var (items, totalCount) = await _accountRepository.GetPagedAsync(
            query.Search,
            query.Role,
            query.IsActive,
            query.SortBy ?? "createdAt",
            ascending,
            query.Page,
            query.PageSize,
            ct
        );

        var dtos = items.Select(a => new AccountResponse(
            a.Id,
            a.Email,
            a.RegistrationFullName,
            a.Role.ToString(),
            a.IsActive,
            a.CreatedAt,
            a.UpdatedAt
        )).ToList();

        return PagedResult<AccountResponse>.Create(dtos, query.Page, query.PageSize, totalCount);
    }

    public async Task<AccountResponse> GetAccountByIdAsync(Guid id, CancellationToken ct = default)
    {
        var account = await _accountRepository.GetByIdAsync(id, ct);
        if (account == null)
        {
            throw new NotFoundException("Không tìm thấy thông tin tài khoản.", "ACCOUNT_NOT_FOUND");
        }

        return new AccountResponse(
            account.Id,
            account.Email,
            account.RegistrationFullName,
            account.Role.ToString(),
            account.IsActive,
            account.CreatedAt,
            account.UpdatedAt
        );
    }

    public async Task<AccountResponse> LockAccountAsync(Guid id, CancellationToken ct = default)
    {
        var account = await _accountRepository.GetByIdAsync(id, ct);
        if (account == null)
        {
            throw new NotFoundException("Không tìm thấy tài khoản để khóa.", "ACCOUNT_NOT_FOUND");
        }

        account.IsActive = false;
        account.UpdatedAt = DateTime.UtcNow;

        await _accountRepository.UpdateAsync(account, ct);
        // Thu hồi toàn bộ Refresh Token của tài khoản bị khóa
        await _refreshTokenRepository.RevokeAllForAccountAsync(id, "AccountLockedByAdmin", ct);
        await _unitOfWork.SaveChangesAsync(ct);

        _logger.LogInformation("Account {AccountId} has been locked by administrator", id);

        return new AccountResponse(
            account.Id,
            account.Email,
            account.RegistrationFullName,
            account.Role.ToString(),
            account.IsActive,
            account.CreatedAt,
            account.UpdatedAt
        );
    }

    public async Task<AccountResponse> UnlockAccountAsync(Guid id, CancellationToken ct = default)
    {
        var account = await _accountRepository.GetByIdAsync(id, ct);
        if (account == null)
        {
            throw new NotFoundException("Không tìm thấy tài khoản để mở khóa.", "ACCOUNT_NOT_FOUND");
        }

        account.IsActive = true;
        account.UpdatedAt = DateTime.UtcNow;

        await _accountRepository.UpdateAsync(account, ct);
        await _unitOfWork.SaveChangesAsync(ct);

        _logger.LogInformation("Account {AccountId} has been unlocked by administrator", id);

        return new AccountResponse(
            account.Id,
            account.Email,
            account.RegistrationFullName,
            account.Role.ToString(),
            account.IsActive,
            account.CreatedAt,
            account.UpdatedAt
        );
    }

    public async Task<AccountResponse> CreateLecturerAsync(CreateLecturerRequest request, CancellationToken ct = default)
    {
        // 1. Kiểm tra tính hợp lệ của dữ liệu đầu vào
        var validationResult = await _createLecturerValidator.ValidateAsync(request, ct);
        if (!validationResult.IsValid)
        {
            throw new FluentValidation.ValidationException(validationResult.Errors);
        }

        // 2. Chuẩn hóa email
        var normalizedEmail = request.Email.Trim().ToLowerInvariant();

        // 3. Kiểm tra trùng lặp email trước khi mở transaction
        if (await _accountRepository.ExistsByEmailAsync(normalizedEmail, ct))
        {
            throw new ConflictException("Email đã được đăng ký trong hệ thống.", "EMAIL_ALREADY_EXISTS");
        }

        // 4. Băm mật khẩu bằng BCrypt
        var passwordHash = _passwordHasher.HashPassword(request.Password);
        var now = DateTime.UtcNow;

        // 5. Khởi tạo đối tượng Account với vai trò Lecturer
        var account = new Account
        {
            Id = Guid.NewGuid(),
            Email = normalizedEmail,
            PasswordHash = passwordHash,
            RegistrationFullName = request.FullName.Trim(),
            Role = AccountRole.Lecturer,
            IsActive = true,
            EmailConfirmed = true,
            EmailConfirmedAt = now,
            CreatedAt = now,
            UpdatedAt = now
        };

        // 6. Tạo sự kiện UserRegisteredEvent cho Transactional Outbox (Role = Lecturer)
        var userRegisteredEvent = new UserRegisteredEvent(
            EventId: Guid.NewGuid(),
            UserId: account.Id,
            Email: account.Email,
            FullName: account.RegistrationFullName,
            Role: account.Role.ToString(),
            OccurredAt: now
        );

        var outboxMessage = new OutboxMessage
        {
            Id = Guid.NewGuid(),
            EventType = nameof(UserRegisteredEvent),
            Payload = JsonSerializer.Serialize(userRegisteredEvent, new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase
            }),
            CreatedAt = now
        };

        // 7. Lưu nguyên tử Account + OutboxMessage trong cùng một Transaction
        try
        {
            await _unitOfWork.ExecuteInTransactionAsync(async () =>
            {
                await _accountRepository.AddAsync(account, ct);
                await _outboxRepository.AddAsync(outboxMessage, ct);
                await _unitOfWork.SaveChangesAsync(ct);
            }, ct);
        }
        catch (DbUpdateException ex)
        {
            _logger.LogWarning(ex, "DbUpdateException during lecturer provisioning for email {Email}", normalizedEmail);
            throw new ConflictException("Email đã được đăng ký trong hệ thống.", "EMAIL_ALREADY_EXISTS");
        }

        // 8. Ghi log an toàn tuyệt đối không lộ mật khẩu hay password hash
        _logger.LogInformation("Lecturer account created successfully by administrator: {AccountId} with email {Email}", account.Id, account.Email);

        return new AccountResponse(
            account.Id,
            account.Email,
            account.RegistrationFullName,
            account.Role.ToString(),
            account.IsActive,
            account.CreatedAt,
            account.UpdatedAt
        );
    }
}
