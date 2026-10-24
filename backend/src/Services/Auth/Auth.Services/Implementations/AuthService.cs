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
/// Triển khai nghiệp vụ xác thực chính theo kiến trúc Transactional Outbox, Refresh Token Rotation,
/// và quy trình xác thực email bằng mã OTP 6 số qua Brevo API (Gate D, E, F, H, I).
/// </summary>
public class AuthService : IAuthService
{
    private readonly IAccountRepository _accountRepository;
    private readonly IRefreshTokenRepository _refreshTokenRepository;
    private readonly IOutboxRepository _outboxRepository;
    private readonly IEmailVerificationChallengeRepository _challengeRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IPasswordHasher _passwordHasher;
    private readonly ITokenService _tokenService;
    private readonly IOtpService _otpService;
    private readonly IEmailSender _emailSender;
    private readonly JwtOptions _jwtOptions;
    private readonly IValidator<RegisterRequest> _registerValidator;
    private readonly IValidator<LoginRequest> _loginValidator;
    private readonly IValidator<RefreshTokenRequest> _refreshValidator;
    private readonly IValidator<LogoutRequest> _logoutValidator;
    private readonly IValidator<VerifyEmailRequest> _verifyEmailValidator;
    private readonly IValidator<ResendVerificationRequest> _resendVerificationValidator;
    private readonly IValidator<ForgotPasswordRequest> _forgotPasswordValidator;
    private readonly IValidator<ResetPasswordRequest> _resetPasswordValidator;
    private readonly ILogger<AuthService> _logger;

    public AuthService(
        IAccountRepository accountRepository,
        IRefreshTokenRepository refreshTokenRepository,
        IOutboxRepository outboxRepository,
        IEmailVerificationChallengeRepository challengeRepository,
        IUnitOfWork unitOfWork,
        IPasswordHasher passwordHasher,
        ITokenService tokenService,
        IOtpService otpService,
        IEmailSender emailSender,
        IOptions<JwtOptions> jwtOptions,
        IValidator<RegisterRequest> registerValidator,
        IValidator<LoginRequest> loginValidator,
        IValidator<RefreshTokenRequest> refreshValidator,
        IValidator<LogoutRequest> logoutValidator,
        IValidator<VerifyEmailRequest> verifyEmailValidator,
        IValidator<ResendVerificationRequest> resendVerificationValidator,
        IValidator<ForgotPasswordRequest> forgotPasswordValidator,
        IValidator<ResetPasswordRequest> resetPasswordValidator,
        ILogger<AuthService> logger)
    {
        _accountRepository = accountRepository;
        _refreshTokenRepository = refreshTokenRepository;
        _outboxRepository = outboxRepository;
        _challengeRepository = challengeRepository;
        _unitOfWork = unitOfWork;
        _passwordHasher = passwordHasher;
        _tokenService = tokenService;
        _otpService = otpService;
        _emailSender = emailSender;
        _jwtOptions = jwtOptions.Value;
        _registerValidator = registerValidator;
        _loginValidator = loginValidator;
        _refreshValidator = refreshValidator;
        _logoutValidator = logoutValidator;
        _verifyEmailValidator = verifyEmailValidator;
        _resendVerificationValidator = resendVerificationValidator;
        _forgotPasswordValidator = forgotPasswordValidator;
        _resetPasswordValidator = resetPasswordValidator;
        _logger = logger;
    }

    /// <summary>
    /// Đăng ký tài khoản sinh viên mới (Gate C, D, E, H).
    /// Tuyệt đối KHÔNG trả về access/refresh token và KHÔNG sinh UserRegisteredEvent vào outbox trước khi email được xác thực.
    /// </summary>
    public async Task<RegisterResponse> RegisterAsync(RegisterRequest request, CancellationToken ct = default)
    {
        // 1. Kiểm tra tính hợp lệ của dữ liệu đầu vào (cho phép mọi domain hợp lệ như Gmail, Outlook, FPT)
        var validationResult = await _registerValidator.ValidateAsync(request, ct);
        if (!validationResult.IsValid)
        {
            throw new FluentValidation.ValidationException(validationResult.Errors);
        }

        // 2. Chuẩn hóa email
        var normalizedEmail = request.Email.Trim().ToLowerInvariant();

        // 3. Kiểm tra trùng lặp email
        var existingAccount = await _accountRepository.GetByEmailAsync(normalizedEmail, ct);
        var now = DateTime.UtcNow;
        Account account;

        if (existingAccount != null)
        {
            // Nếu tài khoản đã xác thực email thành công -> Báo lỗi trùng lặp
            if (existingAccount.EmailConfirmed)
            {
                throw new ConflictException("Email đã được đăng ký và kích hoạt trong hệ thống.", "EMAIL_ALREADY_EXISTS");
            }

            // Nếu tài khoản đang ở trạng thái chờ xác thực (PendingVerification) -> Cập nhật thông tin và cấp mã OTP mới
            existingAccount.PasswordHash = _passwordHasher.HashPassword(request.Password);
            existingAccount.RegistrationFullName = request.FullName.Trim();
            existingAccount.UpdatedAt = now;
            await _accountRepository.UpdateAsync(existingAccount, ct);
            account = existingAccount;
            _logger.LogInformation("Pending account re-registered, refreshed credentials for AccountId {AccountId}", account.Id);
        }
        else
        {
            // Băm mật khẩu (BCrypt WorkFactor 11)
            var passwordHash = _passwordHasher.HashPassword(request.Password);

            // Khởi tạo Account — Đăng ký công khai luôn gán vai trò Student, trạng thái EmailConfirmed = false (PendingVerification)
            account = new Account
            {
                Id = Guid.NewGuid(),
                Email = normalizedEmail,
                PasswordHash = passwordHash,
                RegistrationFullName = request.FullName.Trim(),
                Role = AccountRole.Student,
                IsActive = true,
                EmailConfirmed = false,
                EmailConfirmedAt = null,
                CreatedAt = now,
                UpdatedAt = now
            };

            await _accountRepository.AddAsync(account, ct);
            _logger.LogInformation("New student account created in pending verification state: {AccountId}", account.Id);
        }

        // 4. Hủy bỏ mọi challenge cũ chưa sử dụng của tài khoản này
        await _challengeRepository.InvalidatePreviousChallengesAsync(account.Id, Auth.Repository.Enums.ChallengePurpose.EmailVerification, ct);

        // 5. Sinh mã OTP 6 số ngẫu nhiên CSPRNG và băm kèm salt (Gate E)
        var otp = _otpService.GenerateSixDigitOtp();
        var (otpHash, salt) = _otpService.HashOtp(otp);

        var challenge = new EmailVerificationChallenge
        {
            Id = Guid.NewGuid(),
            AccountId = account.Id,
            Email = account.Email,
            OtpHash = otpHash,
            Salt = salt,
            ExpiresAt = now.AddMinutes(5), // Hiệu lực 5 phút
            FailedAttempts = 0,
            ResendAvailableAt = now.AddSeconds(60), // Cooldown 60 giây
            IsUsed = false,
            CreatedAt = now
        };

        await _challengeRepository.AddAsync(challenge, ct);
        await _unitOfWork.SaveChangesAsync(ct);

        // 6. Gửi email xác thực OTP qua Brevo Transactional Email API (Gate F)
        // Tuyệt đối không log chuỗi OTP plaintext
        _logger.LogInformation("Sending verification OTP email via Brevo to {Email}", normalizedEmail);
        await _emailSender.SendVerificationOtpAsync(account.Email, account.RegistrationFullName, otp, ct);

        // 7. Trả về phản hồi đăng ký thành công (KHÔNG có JWT token)
        return new RegisterResponse(
            "Đăng ký tài khoản thành công. Vui lòng kiểm tra email để nhận mã xác thực OTP kích hoạt tài khoản.",
            account.Email,
            challenge.ExpiresAt
        );
    }

    /// <summary>
    /// Xác thực email người dùng bằng mã OTP 6 số (Gate D, E, H, I).
    /// Sau khi xác thực hợp lệ, kích hoạt Account và ghi nhận sự kiện UserRegisteredEvent vào Transactional Outbox.
    /// </summary>
    public async Task<VerifyEmailResponse> VerifyEmailAsync(VerifyEmailRequest request, CancellationToken ct = default)
    {
        var validationResult = await _verifyEmailValidator.ValidateAsync(request, ct);
        if (!validationResult.IsValid)
        {
            throw new FluentValidation.ValidationException(validationResult.Errors);
        }

        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        var account = await _accountRepository.GetByEmailAsync(normalizedEmail, ct);

        if (account == null)
        {
            throw new NotFoundException("Không tìm thấy tài khoản với email này.", "ACCOUNT_NOT_FOUND");
        }

        if (account.EmailConfirmed)
        {
            return new VerifyEmailResponse("Tài khoản của bạn đã được xác thực trước đó. Vui lòng đăng nhập.", account.Email);
        }

        var challenge = await _challengeRepository.GetActiveChallengeByAccountIdAsync(account.Id, Auth.Repository.Enums.ChallengePurpose.EmailVerification, ct);
        if (challenge == null)
        {
            throw new BadRequestException("Không tìm thấy yêu cầu xác thực email hoặc mã OTP đã hết hạn. Vui lòng yêu cầu gửi lại mã mới.", "CHALLENGE_NOT_FOUND");
        }

        var now = DateTime.UtcNow;

        if (challenge.ExpiresAt <= now)
        {
            challenge.IsUsed = true;
            await _challengeRepository.UpdateAsync(challenge, ct);
            await _unitOfWork.SaveChangesAsync(ct);
            throw new BadRequestException("Mã xác thực OTP đã hết hạn (5 phút). Vui lòng yêu cầu gửi lại mã xác thực mới.", "OTP_EXPIRED");
        }

        if (challenge.FailedAttempts >= 5)
        {
            challenge.IsUsed = true;
            await _challengeRepository.UpdateAsync(challenge, ct);
            await _unitOfWork.SaveChangesAsync(ct);
            throw new ForbiddenException("Bạn đã nhập sai mã OTP quá 5 lần. Vui lòng yêu cầu gửi lại mã xác thực mới.", "MAX_FAILED_ATTEMPTS");
        }

        var isValidOtp = _otpService.VerifyOtp(request.Otp, challenge.OtpHash, challenge.Salt);
        if (!isValidOtp)
        {
            challenge.FailedAttempts++;
            await _challengeRepository.UpdateAsync(challenge, ct);
            await _unitOfWork.SaveChangesAsync(ct);

            var remaining = Math.Max(0, 5 - challenge.FailedAttempts);
            _logger.LogWarning("Invalid OTP attempt for Account {AccountId}. Failed attempts: {Attempts}", account.Id, challenge.FailedAttempts);

            throw new BadRequestException($"Mã xác thực không chính xác. Bạn còn {remaining} lần thử.", "INVALID_OTP");
        }

        // OTP hợp lệ: Đánh dấu đã dùng, kích hoạt tài khoản và phát sinh UserRegisteredEvent vào Transactional Outbox
        challenge.IsUsed = true;
        challenge.UsedAt = now;

        account.EmailConfirmed = true;
        account.EmailConfirmedAt = now;
        account.UpdatedAt = now;

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

        await _unitOfWork.ExecuteInTransactionAsync(async () =>
        {
            await _challengeRepository.UpdateAsync(challenge, ct);
            await _accountRepository.UpdateAsync(account, ct);
            await _outboxRepository.AddAsync(outboxMessage, ct);
            await _unitOfWork.SaveChangesAsync(ct);
        }, ct);

        _logger.LogInformation("Account {AccountId} successfully verified email and emitted UserRegisteredEvent to Outbox", account.Id);

        return new VerifyEmailResponse(
            "Xác thực email thành công! Tài khoản của bạn đã được kích hoạt. Vui lòng đăng nhập.",
            account.Email
        );
    }

    /// <summary>
    /// Gửi lại mã OTP xác thực email (Gate E, H).
    /// Áp dụng cooldown 60 giây và giới hạn 5 lần/giờ. Vô hiệu hóa OTP cũ.
    /// </summary>
    public async Task<ResendVerificationResponse> ResendVerificationAsync(ResendVerificationRequest request, CancellationToken ct = default)
    {
        var validationResult = await _resendVerificationValidator.ValidateAsync(request, ct);
        if (!validationResult.IsValid)
        {
            throw new FluentValidation.ValidationException(validationResult.Errors);
        }

        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        var account = await _accountRepository.GetByEmailAsync(normalizedEmail, ct);

        if (account == null)
        {
            throw new NotFoundException("Không tìm thấy tài khoản với email này.", "ACCOUNT_NOT_FOUND");
        }

        if (account.EmailConfirmed)
        {
            throw new ConflictException("Tài khoản này đã được xác thực email trước đó. Vui lòng đăng nhập.", "EMAIL_ALREADY_VERIFIED");
        }

        var now = DateTime.UtcNow;

        // 1. Kiểm tra Cooldown 60s
        var activeChallenge = await _challengeRepository.GetActiveChallengeByAccountIdAsync(account.Id, Auth.Repository.Enums.ChallengePurpose.EmailVerification, ct);
        if (activeChallenge != null && activeChallenge.ResendAvailableAt.HasValue && activeChallenge.ResendAvailableAt.Value > now)
        {
            var remainingSeconds = (int)Math.Ceiling((activeChallenge.ResendAvailableAt.Value - now).TotalSeconds);
            _logger.LogWarning("Resend rejected due to cooldown for Account {AccountId}. Remaining: {Seconds}s", account.Id, remainingSeconds);
            throw new BadRequestException($"Vui lòng chờ {remainingSeconds} giây trước khi yêu cầu gửi lại mã xác thực.", "RESEND_COOLDOWN");
        }

        // 2. Kiểm tra giới hạn 5 lần/giờ
        var resendsInLastHour = await _challengeRepository.CountResendsInLastHourAsync(account.Id, Auth.Repository.Enums.ChallengePurpose.EmailVerification, ct);
        if (resendsInLastHour >= 5)
        {
            _logger.LogWarning("Hourly resend limit exceeded for Account {AccountId} ({Count} resends)", account.Id, resendsInLastHour);
            throw new ForbiddenException("Bạn đã vượt quá số lần yêu cầu gửi lại mã trong vòng 1 giờ (tối đa 5 lần). Vui lòng thử lại sau.", "HOURLY_LIMIT_EXCEEDED");
        }

        // 3. Vô hiệu hóa mọi challenge cũ
        await _challengeRepository.InvalidatePreviousChallengesAsync(account.Id, Auth.Repository.Enums.ChallengePurpose.EmailVerification, ct);

        // 4. Sinh mã OTP mới và băm kèm salt
        var otp = _otpService.GenerateSixDigitOtp();
        var (otpHash, salt) = _otpService.HashOtp(otp);

        var newChallenge = new EmailVerificationChallenge
        {
            Id = Guid.NewGuid(),
            AccountId = account.Id,
            Email = account.Email,
            OtpHash = otpHash,
            Salt = salt,
            ExpiresAt = now.AddMinutes(5),
            FailedAttempts = 0,
            ResendAvailableAt = now.AddSeconds(60),
            IsUsed = false,
            CreatedAt = now
        };

        await _challengeRepository.AddAsync(newChallenge, ct);
        await _unitOfWork.SaveChangesAsync(ct);

        // 5. Gửi email
        _logger.LogInformation("Resending verification OTP email via Brevo to {Email}", normalizedEmail);
        await _emailSender.SendVerificationOtpAsync(account.Email, account.RegistrationFullName, otp, ct);

        return new ResendVerificationResponse(
            "Mã xác thực mới đã được gửi tới email của bạn.",
            account.Email,
            60,
            newChallenge.ExpiresAt
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

        // Kiểm tra tài khoản đã xác thực email hay chưa (Gate D, H)
        if (!account.EmailConfirmed)
        {
            _logger.LogWarning("Login rejected for unverified account {AccountId}", account.Id);
            throw new ForbiddenException("Tài khoản chưa được xác thực email. Vui lòng kiểm tra mã OTP để kích hoạt tài khoản.", "EMAIL_NOT_CONFIRMED");
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
        if (account == null || !account.IsActive || !account.EmailConfirmed)
        {
            _logger.LogWarning("Refresh attempt for non-existent, inactive, or unverified account {AccountId}", token.AccountId);
            throw new UnauthorizedException("Tài khoản không tồn tại, chưa xác thực hoặc đã bị khóa.", "ACCOUNT_LOCKED");
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

    /// <summary>
    /// Gửi mã OTP đặt lại mật khẩu qua Brevo Email (Giai đoạn 2 - Password Recovery).
    /// </summary>
    public async Task<ForgotPasswordResponse> ForgotPasswordAsync(ForgotPasswordRequest request, CancellationToken ct = default)
    {
        var validationResult = await _forgotPasswordValidator.ValidateAsync(request, ct);
        if (!validationResult.IsValid)
        {
            throw new FluentValidation.ValidationException(validationResult.Errors);
        }

        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        var account = await _accountRepository.GetByEmailAsync(normalizedEmail, ct);

        // Security: Không tiết lộ email có tồn tại trong hệ thống hay không để chống account enumeration
        if (account == null || !account.IsActive || !account.EmailConfirmed)
        {
            _logger.LogInformation("Password reset requested for non-existent or unconfirmed account: {Email}", normalizedEmail);
            return new ForgotPasswordResponse(
                "Nếu email của bạn tồn tại và đã được kích hoạt trong hệ thống, mã xác thực OTP đặt lại mật khẩu đã được gửi đến hộp thư.",
                normalizedEmail,
                60,
                DateTime.UtcNow.AddMinutes(5)
            );
        }

        // Kiểm tra cooldown 60s
        var activeChallenge = await _challengeRepository.GetActiveChallengeByAccountIdAsync(account.Id, ChallengePurpose.PasswordReset, ct);
        if (activeChallenge != null && activeChallenge.ResendAvailableAt.HasValue && activeChallenge.ResendAvailableAt.Value > DateTime.UtcNow)
        {
            var remainingSeconds = (int)Math.Ceiling((activeChallenge.ResendAvailableAt.Value - DateTime.UtcNow).TotalSeconds);
            throw new BadRequestException(
                $"Vui lòng đợi {remainingSeconds} giây trước khi yêu cầu gửi lại mã OTP đặt lại mật khẩu.",
                "RESEND_COOLDOWN");
        }

        // Rate limiting: Tối đa 5 lần gửi lại mã trong 1 giờ
        var resendsInLastHour = await _challengeRepository.CountResendsInLastHourAsync(account.Id, ChallengePurpose.PasswordReset, ct);
        if (resendsInLastHour >= 5)
        {
            throw new BadRequestException(
                "Bạn đã yêu cầu gửi mã quá nhiều lần trong 1 giờ qua. Vui lòng thử lại sau.",
                "TOO_MANY_RESENDS");
        }

        // Vô hiệu hóa mọi challenge PasswordReset cũ
        await _challengeRepository.InvalidatePreviousChallengesAsync(account.Id, ChallengePurpose.PasswordReset, ct);

        // Sinh mã OTP 6 số CSPRNG ngẫu nhiên và băm kèm salt
        var otp = _otpService.GenerateSixDigitOtp();
        var (otpHash, salt) = _otpService.HashOtp(otp);
        var now = DateTime.UtcNow;

        var newChallenge = new EmailVerificationChallenge
        {
            Id = Guid.NewGuid(),
            AccountId = account.Id,
            Email = normalizedEmail,
            Purpose = ChallengePurpose.PasswordReset,
            OtpHash = otpHash,
            Salt = salt,
            ExpiresAt = now.AddMinutes(5),
            ResendAvailableAt = now.AddSeconds(60),
            FailedAttempts = 0,
            IsUsed = false,
            CreatedAt = now
        };

        await _challengeRepository.AddAsync(newChallenge, ct);
        await _unitOfWork.SaveChangesAsync(ct);

        // Gửi email qua Brevo
        await _emailSender.SendPasswordResetOtpAsync(normalizedEmail, account.RegistrationFullName, otp, ct);

        _logger.LogInformation("Password reset OTP generated and email dispatched to {Email}", normalizedEmail);

        return new ForgotPasswordResponse(
            "Mã xác thực OTP đặt lại mật khẩu đã được gửi đến email của bạn.",
            normalizedEmail,
            60,
            newChallenge.ExpiresAt
        );
    }

    /// <summary>
    /// Đặt lại mật khẩu bằng mã OTP và thiết lập mật khẩu mới (Giai đoạn 2 - Password Recovery).
    /// </summary>
    public async Task<ResetPasswordResponse> ResetPasswordAsync(ResetPasswordRequest request, CancellationToken ct = default)
    {
        var validationResult = await _resetPasswordValidator.ValidateAsync(request, ct);
        if (!validationResult.IsValid)
        {
            throw new FluentValidation.ValidationException(validationResult.Errors);
        }

        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        var account = await _accountRepository.GetByEmailAsync(normalizedEmail, ct);
        if (account == null)
        {
            throw new NotFoundException("Tài khoản không tồn tại trong hệ thống.", "ACCOUNT_NOT_FOUND");
        }

        if (!account.IsActive)
        {
            throw new ForbiddenException("Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.", "ACCOUNT_LOCKED");
        }

        var challenge = await _challengeRepository.GetActiveChallengeByAccountIdAsync(account.Id, ChallengePurpose.PasswordReset, ct);
        if (challenge == null || challenge.IsUsed)
        {
            throw new BadRequestException(
                "Không tìm thấy yêu cầu đặt lại mật khẩu hợp lệ hoặc mã OTP đã được sử dụng. Vui lòng yêu cầu mã mới.",
                "CHALLENGE_NOT_FOUND");
        }

        if (challenge.FailedAttempts >= 5)
        {
            challenge.IsUsed = true;
            await _challengeRepository.UpdateAsync(challenge, ct);
            await _unitOfWork.SaveChangesAsync(ct);

            throw new ForbiddenException(
                "Bạn đã nhập sai mã OTP quá 5 lần. Yêu cầu đặt lại mật khẩu này đã bị khóa vì lý do an toàn. Vui lòng yêu cầu mã mới.",
                "MAX_FAILED_ATTEMPTS");
        }

        if (challenge.ExpiresAt <= DateTime.UtcNow)
        {
            challenge.IsUsed = true;
            await _challengeRepository.UpdateAsync(challenge, ct);
            await _unitOfWork.SaveChangesAsync(ct);

            throw new BadRequestException(
                "Mã OTP đã hết hạn (quá 5 phút). Vui lòng yêu cầu gửi lại mã mới.",
                "OTP_EXPIRED");
        }

        var isOtpValid = _otpService.VerifyOtp(request.Otp, challenge.OtpHash, challenge.Salt);
        if (!isOtpValid)
        {
            challenge.FailedAttempts++;
            await _challengeRepository.UpdateAsync(challenge, ct);
            await _unitOfWork.SaveChangesAsync(ct);

            var remainingAttempts = Math.Max(0, 5 - challenge.FailedAttempts);
            if (remainingAttempts <= 0)
            {
                challenge.IsUsed = true;
                await _challengeRepository.UpdateAsync(challenge, ct);
                await _unitOfWork.SaveChangesAsync(ct);

                throw new ForbiddenException(
                    "Bạn đã nhập sai mã OTP quá 5 lần. Yêu cầu đặt lại mật khẩu này đã bị khóa vì lý do an toàn.",
                    "MAX_FAILED_ATTEMPTS");
            }

            throw new BadRequestException(
                $"Mã OTP không chính xác. Bạn còn lại {remainingAttempts} lần thử.",
                "INVALID_OTP");
        }

        // OTP hợp lệ: Đổi mật khẩu
        challenge.IsUsed = true;
        challenge.UsedAt = DateTime.UtcNow;
        await _challengeRepository.UpdateAsync(challenge, ct);

        account.PasswordHash = _passwordHasher.HashPassword(request.NewPassword);
        account.UpdatedAt = DateTime.UtcNow;
        await _accountRepository.UpdateAsync(account, ct);

        // Thu hồi toàn bộ Refresh Tokens cũ để force logout trên mọi thiết bị
        await _refreshTokenRepository.RevokeAllForAccountAsync(account.Id, "Password reset by user", ct);

        await _unitOfWork.SaveChangesAsync(ct);

        _logger.LogInformation("Password reset successfully for account {AccountId} ({Email})", account.Id, normalizedEmail);

        return new ResetPasswordResponse(
            "Đặt lại mật khẩu thành công. Bạn có thể đăng nhập bằng mật khẩu mới ngay bây giờ.",
            normalizedEmail
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
            account.UpdatedAt
        );
    }
}
