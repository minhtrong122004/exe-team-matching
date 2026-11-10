using System.Text.Json;
using Auth.Repository.Entities;
using Auth.Repository.Enums;
using Auth.Repository.Interfaces;
using Auth.Services.DTOs;
using Auth.Services.Interfaces;
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
    private readonly IValidator<CreateLecturerRequest> _createLecturerValidator;
    private readonly IValidator<ProvisionFapStudentsRequest> _provisionFapValidator;
    private readonly ILogger<AdminAccountService> _logger;

    public AdminAccountService(
        IAccountRepository accountRepository,
        IRefreshTokenRepository refreshTokenRepository,
        IOutboxRepository outboxRepository,
        IUnitOfWork unitOfWork,
        IValidator<CreateLecturerRequest> createLecturerValidator,
        IValidator<ProvisionFapStudentsRequest> provisionFapValidator,
        ILogger<AdminAccountService> logger)
    {
        _accountRepository = accountRepository;
        _refreshTokenRepository = refreshTokenRepository;
        _outboxRepository = outboxRepository;
        _unitOfWork = unitOfWork;
        _createLecturerValidator = createLecturerValidator;
        _provisionFapValidator = provisionFapValidator;
        _logger = logger;
    }

    private static AccountResponse MapToResponse(Account a) => new(
        a.Id,
        a.Email,
        a.RegistrationFullName,
        a.Role.ToString(),
        a.IsActive,
        a.CreatedAt,
        a.UpdatedAt,
        a.AcceptedTermsAt.HasValue,
        a.AcceptedTermsAt,
        a.StudentCode
    );

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

        var dtos = items.Select(MapToResponse).ToList();

        return PagedResult<AccountResponse>.Create(dtos, query.Page, query.PageSize, totalCount);
    }

    public async Task<AccountResponse> GetAccountByIdAsync(Guid id, CancellationToken ct = default)
    {
        var account = await _accountRepository.GetByIdAsync(id, ct);
        if (account == null)
        {
            throw new NotFoundException("Không tìm thấy thông tin tài khoản.", "ACCOUNT_NOT_FOUND");
        }

        return MapToResponse(account);
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

        return MapToResponse(account);
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

        return MapToResponse(account);
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

        var now = DateTime.UtcNow;

        var targetRole = !string.IsNullOrWhiteSpace(request.Role) &&
                         request.Role.Trim().Equals("Moderator", StringComparison.OrdinalIgnoreCase)
            ? AccountRole.Moderator
            : AccountRole.Lecturer;

        // 4. Khởi tạo đối tượng Account với vai trò Lecturer hoặc Moderator
        var account = new Account
        {
            Id = Guid.NewGuid(),
            Email = normalizedEmail,
            RegistrationFullName = request.FullName.Trim(),
            Role = targetRole,
            AcceptedTermsAt = now,
            IsActive = true,
            CreatedAt = now,
            UpdatedAt = now
        };

        // 5. Tạo sự kiện UserRegisteredEvent cho Transactional Outbox
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

        // 6. Lưu nguyên tử Account + OutboxMessage trong cùng một Transaction
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
            _logger.LogWarning(ex, "DbUpdateException during staff provisioning for email {Email}", normalizedEmail);
            throw new ConflictException("Email đã được đăng ký trong hệ thống.", "EMAIL_ALREADY_EXISTS");
        }

        _logger.LogInformation("{Role} account created successfully by administrator: {AccountId} with email {Email}", account.Role, account.Id, account.Email);

        return MapToResponse(account);
    }

    public async Task<ProvisionFapStudentsResponse> ProvisionFapStudentsAsync(ProvisionFapStudentsRequest request, CancellationToken ct = default)
    {
        var validationResult = await _provisionFapValidator.ValidateAsync(request, ct);
        if (!validationResult.IsValid)
        {
            throw new FluentValidation.ValidationException(validationResult.Errors);
        }

        var semesterCode = request.SemesterCode.Trim().ToUpperInvariant();
        var subjectCode = request.SubjectCode.Trim().ToUpperInvariant();
        var results = new List<ProvisionStudentResultItem>();
        var newlyCreatedCount = 0;
        var existingCount = 0;
        var now = DateTime.UtcNow;

        foreach (var item in request.Students)
        {
            var normalizedEmail = item.Email.Trim().ToLowerInvariant();
            var normalizedStudentCode = item.StudentCode.Trim().ToUpperInvariant();
            var fullName = item.FullName.Trim();

            var existingAccount = await _accountRepository.GetByEmailAsync(normalizedEmail, ct);
            if (existingAccount != null)
            {
                existingCount++;

                if (string.IsNullOrWhiteSpace(existingAccount.StudentCode) && !string.IsNullOrWhiteSpace(normalizedStudentCode))
                {
                    existingAccount.StudentCode = normalizedStudentCode;
                    existingAccount.UpdatedAt = now;
                    await _accountRepository.UpdateAsync(existingAccount, ct);
                }

                results.Add(new ProvisionStudentResultItem(
                    existingAccount.Id,
                    existingAccount.StudentCode ?? normalizedStudentCode,
                    existingAccount.RegistrationFullName,
                    existingAccount.Email,
                    IsNewlyCreated: false,
                    StatusMessage: $"Tài khoản đã tồn tại, đã ghi nhận vào danh sách {semesterCode} - {subjectCode}."
                ));
                continue;
            }

            var newAccount = new Account
            {
                Id = Guid.NewGuid(),
                Email = normalizedEmail,
                RegistrationFullName = fullName,
                Role = AccountRole.Student,
                StudentCode = normalizedStudentCode,
                AcceptedTermsAt = null,
                IsActive = true,
                CreatedAt = now,
                UpdatedAt = now
            };

            var normalizedMajor = NormalizeMajor(item.Major);

            var userRegisteredEvent = new UserRegisteredEvent(
                EventId: Guid.NewGuid(),
                UserId: newAccount.Id,
                Email: newAccount.Email,
                FullName: newAccount.RegistrationFullName,
                Role: newAccount.Role.ToString(),
                OccurredAt: now,
                SchemaVersion: 1,
                StudentCode: normalizedStudentCode,
                SemesterCode: semesterCode,
                SubjectCode: subjectCode,
                Major: normalizedMajor
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

            await _unitOfWork.ExecuteInTransactionAsync(async () =>
            {
                await _accountRepository.AddAsync(newAccount, ct);
                await _outboxRepository.AddAsync(outboxMessage, ct);
                await _unitOfWork.SaveChangesAsync(ct);
            }, ct);

            newlyCreatedCount++;
            results.Add(new ProvisionStudentResultItem(
                newAccount.Id,
                normalizedStudentCode,
                newAccount.RegistrationFullName,
                newAccount.Email,
                IsNewlyCreated: true,
                StatusMessage: "Đã cấp tài khoản mới."
            ));
        }

        _logger.LogInformation(
            "FAP student provisioning completed for {SemesterCode}-{SubjectCode}: {NewlyCreated} newly created, {Existing} existing",
            semesterCode, subjectCode, newlyCreatedCount, existingCount);

        return new ProvisionFapStudentsResponse(
            semesterCode,
            subjectCode,
            results.Count,
            newlyCreatedCount,
            existingCount,
            results
        );
    }

    private static string? NormalizeMajor(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return null;
        var trimmed = raw.Trim();
        var upper = trimmed.ToUpperInvariant();

        if (upper is "SE" or "KỸ THUẬT PHẦN MỀM" or "KY THUAT PHAN MEM" or "SOFTWARE ENGINEERING" or "KTPM")
            return "SE";
        if (upper is "AI" or "TRÍ TUỆ NHÂN TẠO" or "TRI TUE NHAN TAO" or "ARTIFICIAL INTELLIGENCE")
            return "AI";
        if (upper is "IA" or "AN TOÀN THÔNG TIN" or "AN TOAN THONG TIN" or "INFORMATION ASSURANCE" or "ATTT")
            return "IA";
        if (upper is "GD" or "THIẾT KẾ ĐỒ HỌA" or "THIET KE DO HOA" or "GRAPHIC DESIGN" or "TKDH")
            return "GD";
        if (upper is "MKT" or "MK" or "MARKETING" or "DIGITAL MARKETING")
            return "MKT";
        if (upper is "IB" or "KINH DOANH QUỐC TẾ" or "KINH DOANH QUOC TE" or "INTERNATIONAL BUSINESS" or "KDQT" or "QUẢN TRỊ KINH DOANH" or "QTKD")
            return "IB";

        return upper;
    }
}
