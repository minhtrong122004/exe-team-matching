using System.Text.Json;
using Auth.Repository.Entities;
using Auth.Repository.Enums;
using Auth.Repository.Interfaces;
using Auth.Services.DTOs;
using Auth.Services.Interfaces;
using Auth.Services.Security;
using Exe.BuildingBlocks.Auth;
using Exe.BuildingBlocks.Exceptions;
using Exe.Contracts.Events;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Auth.Services.Implementations;

/// <summary>
/// Triển khai nghiệp vụ xác thực chính theo kiến trúc Transactional Outbox và Refresh Token Rotation.
/// </summary>
public class AuthService : IAuthService
{
    private readonly IAccountRepository _accountRepository;
    private readonly IRefreshTokenRepository _refreshTokenRepository;
    private readonly IOutboxRepository _outboxRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IPasswordHasher _passwordHasher;
    private readonly ITokenService _tokenService;
    private readonly JwtOptions _jwtOptions;
    private readonly IValidator<RegisterRequest> _registerValidator;
    private readonly IValidator<LoginRequest> _loginValidator;
    private readonly IValidator<RefreshTokenRequest> _refreshValidator;
    private readonly IValidator<LogoutRequest> _logoutValidator;
    private readonly ILogger<AuthService> _logger;

    public AuthService(
        IAccountRepository accountRepository,
        IRefreshTokenRepository refreshTokenRepository,
        IOutboxRepository outboxRepository,
        IUnitOfWork unitOfWork,
        IPasswordHasher passwordHasher,
        ITokenService tokenService,
        IOptions<JwtOptions> jwtOptions,
        IValidator<RegisterRequest> registerValidator,
        IValidator<LoginRequest> loginValidator,
        IValidator<RefreshTokenRequest> refreshValidator,
        IValidator<LogoutRequest> logoutValidator,
        ILogger<AuthService> logger)
    {
        _accountRepository = accountRepository;
        _refreshTokenRepository = refreshTokenRepository;
        _outboxRepository = outboxRepository;
        _unitOfWork = unitOfWork;
        _passwordHasher = passwordHasher;
        _tokenService = tokenService;
        _jwtOptions = jwtOptions.Value;
        _registerValidator = registerValidator;
        _loginValidator = loginValidator;
        _refreshValidator = refreshValidator;
        _logoutValidator = logoutValidator;
        _logger = logger;
    }

    public async Task<AuthResponse> RegisterAsync(RegisterRequest request, CancellationToken ct = default)
    {
        // 1. Kiểm tra tính hợp lệ của dữ liệu đầu vào
        var validationResult = await _registerValidator.ValidateAsync(request, ct);
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

        // 4. Băm mật khẩu (BCrypt WorkFactor 11)
        var passwordHash = _passwordHasher.HashPassword(request.Password);
        var now = DateTime.UtcNow;

        // 5. Khởi tạo Account — Đăng ký công khai luôn gán vai trò Student
        var account = new Account
        {
            Id = Guid.NewGuid(),
            Email = normalizedEmail,
            PasswordHash = passwordHash,
            RegistrationFullName = request.FullName.Trim(),
            Role = AccountRole.Student,
            IsActive = true,
            CreatedAt = now,
            UpdatedAt = now
        };

        // 6. Tạo Refresh Token đầu tiên
        var (rawRefreshToken, tokenHash) = _tokenService.GenerateRefreshToken();
        var refreshToken = new RefreshToken
        {
            Id = Guid.NewGuid(),
            AccountId = account.Id,
            TokenHash = tokenHash,
            ExpiresAt = now.AddDays(_jwtOptions.RefreshTokenExpirationDays),
            CreatedAt = now
        };

        // 7. Tạo sự kiện UserRegisteredEvent cho Transactional Outbox
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

        // 8. Lưu nguyên tử Account + RefreshToken + OutboxMessage trong cùng một Transaction
        try
        {
            await _unitOfWork.ExecuteInTransactionAsync(async () =>
            {
                await _accountRepository.AddAsync(account, ct);
                await _refreshTokenRepository.AddAsync(refreshToken, ct);
                await _outboxRepository.AddAsync(outboxMessage, ct);
                await _unitOfWork.SaveChangesAsync(ct);
            }, ct);
        }
        catch (DbUpdateException ex)
        {
            _logger.LogWarning(ex, "DbUpdateException during registration for email {Email}", normalizedEmail);
            throw new ConflictException("Email đã được đăng ký trong hệ thống.", "EMAIL_ALREADY_EXISTS");
        }

        _logger.LogInformation("Account registered successfully: {AccountId} with role {Role}", account.Id, account.Role);

        // 9. Cấp phát JWT Access Token và trả về thông tin
        var accessToken = _tokenService.GenerateAccessToken(account);

        return new AuthResponse(
            accessToken,
            rawRefreshToken,
            new AuthUserDto(account.Id, account.Email, account.RegistrationFullName, account.Role.ToString())
        );
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken ct = default)
    {
        var validationResult = await _loginValidator.ValidateAsync(request, ct);
        if (!validationResult.IsValid)
        {
            throw new FluentValidation.ValidationException(validationResult.Errors);
        }

        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        var account = await _accountRepository.GetByEmailAsync(normalizedEmail, ct);

        // Thông báo lỗi chung tránh dò quét tài khoản (Account Enumeration)
        if (account == null || !_passwordHasher.VerifyPassword(request.Password, account.PasswordHash))
        {
            _logger.LogWarning("Failed login attempt for email {Email}", normalizedEmail);
            throw new UnauthorizedException("Email hoặc mật khẩu không chính xác.", "INVALID_CREDENTIALS");
        }

        if (!account.IsActive)
        {
            _logger.LogWarning("Login rejected for inactive/locked account {AccountId}", account.Id);
            throw new ForbiddenException("Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Quản trị viên.", "ACCOUNT_LOCKED");
        }

        var now = DateTime.UtcNow;
        var (rawRefreshToken, tokenHash) = _tokenService.GenerateRefreshToken();

        var refreshToken = new RefreshToken
        {
            Id = Guid.NewGuid(),
            AccountId = account.Id,
            TokenHash = tokenHash,
            ExpiresAt = now.AddDays(_jwtOptions.RefreshTokenExpirationDays),
            CreatedAt = now
        };

        await _refreshTokenRepository.AddAsync(refreshToken, ct);
        await _unitOfWork.SaveChangesAsync(ct);

        _logger.LogInformation("Account logged in successfully: {AccountId}", account.Id);

        var accessToken = _tokenService.GenerateAccessToken(account);

        return new AuthResponse(
            accessToken,
            rawRefreshToken,
            new AuthUserDto(account.Id, account.Email, account.RegistrationFullName, account.Role.ToString())
        );
    }

    public async Task<AuthResponse> RefreshTokenAsync(RefreshTokenRequest request, CancellationToken ct = default)
    {
        var validationResult = await _refreshValidator.ValidateAsync(request, ct);
        if (!validationResult.IsValid)
        {
            throw new FluentValidation.ValidationException(validationResult.Errors);
        }

        var tokenHash = _tokenService.HashToken(request.RefreshToken);
        var token = await _refreshTokenRepository.GetByTokenHashAsync(tokenHash, ct);

        if (token == null)
        {
            _logger.LogWarning("Refresh token hash not found in store.");
            throw new UnauthorizedException("Refresh token không hợp lệ hoặc không tồn tại.", "INVALID_REFRESH_TOKEN");
        }

        var now = DateTime.UtcNow;

        // Xử lý phát hiện Token Reuse
        if (token.RevokedAt != null)
        {
            // Cửa sổ ân hạn (Grace Window) 5 giây cho các request bất đồng bộ gần như đồng thời từ Frontend
            if (token.RevokeReason == "ReplacedByNewToken" &&
                token.RevokedAt.HasValue &&
                (now - token.RevokedAt.Value) < TimeSpan.FromSeconds(5))
            {
                _logger.LogWarning("Concurrent refresh token request detected within grace period for Account {AccountId}", token.AccountId);
                throw new UnauthorizedException("Refresh token đang được xử lý đồng thời. Vui lòng sử dụng token mới nhất.", "CONCURRENT_REFRESH");
            }

            // Tấn công tái sử dụng token thực sự -> Thu hồi toàn bộ Refresh Token của tài khoản
            _logger.LogCritical("Security Alert: Refresh token reuse detected for AccountId {AccountId}! Revoking all sessions.", token.AccountId);
            await _refreshTokenRepository.RevokeAllForAccountAsync(token.AccountId, "RevokedDueToReuseAttempt", ct);
            await _unitOfWork.SaveChangesAsync(ct);

            throw new UnauthorizedException("Phát hiện bất thường về phiên làm việc. Mọi phiên đăng nhập của tài khoản đã bị thu hồi vì lý do an toàn.", "TOKEN_REUSE_DETECTED");
        }

        if (token.ExpiresAt <= now)
        {
            _logger.LogInformation("Refresh token expired for AccountId {AccountId}", token.AccountId);
            throw new UnauthorizedException("Refresh token đã hết hạn. Vui lòng đăng nhập lại.", "REFRESH_TOKEN_EXPIRED");
        }

        var account = await _accountRepository.GetByIdAsync(token.AccountId, ct);
        if (account == null || !account.IsActive)
        {
            _logger.LogWarning("Refresh attempt for non-existent or locked account {AccountId}", token.AccountId);
            throw new UnauthorizedException("Tài khoản không tồn tại hoặc đã bị khóa.", "ACCOUNT_LOCKED");
        }

        // Tạo Refresh Token mới và đánh dấu token cũ đã bị thay thế (Token Rotation)
        var (rawNewRefreshToken, newRefreshTokenHash) = _tokenService.GenerateRefreshToken();
        var newRefreshToken = new RefreshToken
        {
            Id = Guid.NewGuid(),
            AccountId = account.Id,
            TokenHash = newRefreshTokenHash,
            ExpiresAt = now.AddDays(_jwtOptions.RefreshTokenExpirationDays),
            CreatedAt = now
        };

        // Thêm newRefreshToken trước để ID của nó tồn tại trong bảng trước khi token cũ tham chiếu tới
        await _refreshTokenRepository.AddAsync(newRefreshToken, ct);

        token.RevokedAt = now;
        token.RevokeReason = "ReplacedByNewToken";
        token.ReplacedByTokenId = newRefreshToken.Id;

        await _refreshTokenRepository.UpdateAsync(token, ct);
        await _unitOfWork.SaveChangesAsync(ct);

        _logger.LogInformation("Refresh token rotated successfully for AccountId {AccountId}", account.Id);

        var accessToken = _tokenService.GenerateAccessToken(account);

        return new AuthResponse(
            accessToken,
            rawNewRefreshToken,
            new AuthUserDto(account.Id, account.Email, account.RegistrationFullName, account.Role.ToString())
        );
    }

    public async Task LogoutAsync(LogoutRequest request, CancellationToken ct = default)
    {
        var validationResult = await _logoutValidator.ValidateAsync(request, ct);
        if (!validationResult.IsValid)
        {
            throw new FluentValidation.ValidationException(validationResult.Errors);
        }

        var tokenHash = _tokenService.HashToken(request.RefreshToken);
        var token = await _refreshTokenRepository.GetByTokenHashAsync(tokenHash, ct);

        if (token != null && token.RevokedAt == null)
        {
            token.RevokedAt = DateTime.UtcNow;
            token.RevokeReason = "UserLogout";
            await _refreshTokenRepository.UpdateAsync(token, ct);
            await _unitOfWork.SaveChangesAsync(ct);
            _logger.LogInformation("Refresh token revoked due to logout for AccountId {AccountId}", token.AccountId);
        }
    }

    public async Task<AccountResponse> GetCurrentAccountAsync(Guid accountId, CancellationToken ct = default)
    {
        var account = await _accountRepository.GetByIdAsync(accountId, ct);
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
}
