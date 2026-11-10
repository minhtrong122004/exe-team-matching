using Auth.Repository.Entities;
using Auth.Repository.Interfaces;
using Auth.Services.DTOs;
using Auth.Services.Interfaces;
using Auth.Services.Security;
using Exe.BuildingBlocks.Auth;
using Exe.BuildingBlocks.Exceptions;
using FluentValidation;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Auth.Services.Implementations;

/// <summary>
/// Quản lý phiên đăng nhập: đăng nhập Google, Refresh Token Rotation, đăng xuất, điều khoản BR-34 và thông tin tài khoản hiện tại.
/// </summary>
public class AuthService : IAuthService
{
    private readonly IAccountRepository _accountRepository;
    private readonly IRefreshTokenRepository _refreshTokenRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ITokenService _tokenService;
    private readonly IGoogleTokenVerifier _googleTokenVerifier;
    private readonly JwtOptions _jwtOptions;
    private readonly IValidator<GoogleLoginRequest> _googleLoginValidator;
    private readonly IValidator<RefreshTokenRequest> _refreshValidator;
    private readonly IValidator<LogoutRequest> _logoutValidator;
    private readonly ILogger<AuthService> _logger;

    public AuthService(
        IAccountRepository accountRepository,
        IRefreshTokenRepository refreshTokenRepository,
        IUnitOfWork unitOfWork,
        ITokenService tokenService,
        IGoogleTokenVerifier googleTokenVerifier,
        IOptions<JwtOptions> jwtOptions,
        IValidator<GoogleLoginRequest> googleLoginValidator,
        IValidator<RefreshTokenRequest> refreshValidator,
        IValidator<LogoutRequest> logoutValidator,
        ILogger<AuthService> logger)
    {
        _accountRepository = accountRepository;
        _refreshTokenRepository = refreshTokenRepository;
        _unitOfWork = unitOfWork;
        _tokenService = tokenService;
        _googleTokenVerifier = googleTokenVerifier;
        _jwtOptions = jwtOptions.Value;
        _googleLoginValidator = googleLoginValidator;
        _refreshValidator = refreshValidator;
        _logoutValidator = logoutValidator;
        _logger = logger;
    }

    public async Task<AuthResponse> LoginWithGoogleAsync(GoogleLoginRequest request, CancellationToken ct = default)
    {
        var validationResult = await _googleLoginValidator.ValidateAsync(request, ct);
        if (!validationResult.IsValid)
        {
            throw new FluentValidation.ValidationException(validationResult.Errors);
        }

        var identity = await _googleTokenVerifier.VerifyAsync(request.IdToken, ct);
        if (identity == null || !identity.EmailVerified || string.IsNullOrWhiteSpace(identity.Email))
        {
            throw new UnauthorizedException("Không xác thực được tài khoản Google. Vui lòng đăng nhập lại.", "INVALID_GOOGLE_TOKEN");
        }

        var normalizedEmail = identity.Email.Trim().ToLowerInvariant();

        // Tài khoản chỉ được tạo khi import danh sách FAP hoặc do Moderator cấp, nên có tài khoản nghĩa là có trong danh sách.
        var account = await _accountRepository.GetByEmailAsync(normalizedEmail, ct);
        if (account == null)
        {
            _logger.LogWarning("Google sign-in rejected: {Email} is not on the FAP list", normalizedEmail);
            throw new ForbiddenException($"Email {normalizedEmail} không có trong danh sách sinh viên. Vui lòng đăng nhập bằng đúng email trên FAP hoặc liên hệ Moderator.", "NOT_IN_FAP_LIST");
        }

        if (!account.IsActive)
        {
            _logger.LogWarning("Google sign-in rejected for locked account {AccountId}", account.Id);
            throw new ForbiddenException("Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Moderator.", "ACCOUNT_LOCKED");
        }

        var now = DateTime.UtcNow;
        var (rawRefreshToken, tokenHash) = _tokenService.GenerateRefreshToken();

        await _refreshTokenRepository.AddAsync(new RefreshToken
        {
            Id = Guid.NewGuid(),
            AccountId = account.Id,
            TokenHash = tokenHash,
            ExpiresAt = now.AddDays(_jwtOptions.RefreshTokenExpirationDays),
            CreatedAt = now
        }, ct);
        await _unitOfWork.SaveChangesAsync(ct);

        _logger.LogInformation("Account logged in with Google: {AccountId}", account.Id);

        return new AuthResponse(
            _tokenService.GenerateAccessToken(account),
            rawRefreshToken,
            new AuthUserDto(
                account.Id,
                account.Email,
                account.RegistrationFullName,
                account.Role.ToString(),
                account.AcceptedTermsAt.HasValue,
                account.AcceptedTermsAt,
                account.StudentCode)
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
            _logger.LogWarning("Refresh attempt for non-existent or inactive account {AccountId}", token.AccountId);
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
            new AuthUserDto(
                account.Id,
                account.Email,
                account.RegistrationFullName,
                account.Role.ToString(),
                account.AcceptedTermsAt.HasValue,
                account.AcceptedTermsAt,
                account.StudentCode)
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

    /// <summary>
    /// Sinh viên xác nhận đồng ý quy định ghép nhóm và sự điều phối của Moderator/Giảng viên ở lần đầu đăng nhập (BR-34).
    /// </summary>
    public async Task<AcceptTermsResponse> AcceptTermsAsync(Guid accountId, CancellationToken ct = default)
    {
        var account = await _accountRepository.GetByIdAsync(accountId, ct);
        if (account == null)
        {
            throw new NotFoundException("Không tìm thấy thông tin tài khoản.", "ACCOUNT_NOT_FOUND");
        }

        if (!account.AcceptedTermsAt.HasValue)
        {
            var now = DateTime.UtcNow;
            account.AcceptedTermsAt = now;
            account.UpdatedAt = now;
            await _accountRepository.UpdateAsync(account, ct);
            await _unitOfWork.SaveChangesAsync(ct);
            _logger.LogInformation("Account {AccountId} accepted EXE team matching terms (BR-34) at {AcceptedTermsAt}", account.Id, now);
        }

        return new AcceptTermsResponse(
            "Đã xác nhận đồng ý quy định ghép nhóm và sự điều phối của Moderator/Giảng viên.",
            true,
            account.AcceptedTermsAt!.Value
        );
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
            account.UpdatedAt,
            account.AcceptedTermsAt.HasValue,
            account.AcceptedTermsAt,
            account.StudentCode
        );
    }
}
