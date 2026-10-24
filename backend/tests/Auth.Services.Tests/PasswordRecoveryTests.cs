using Auth.Repository.Entities;
using Auth.Repository.Enums;
using Auth.Services.DTOs;
using Auth.Services.Implementations;
using Auth.Services.Interfaces;
using Auth.Services.Security;
using Auth.Services.Tests.TestDoubles;
using Auth.Services.Validators;
using Exe.BuildingBlocks.Auth;
using Exe.BuildingBlocks.Exceptions;
using Microsoft.Extensions.Options;

namespace Auth.Services.Tests;

public class PasswordRecoveryTests
{
    private readonly FakeAccountRepository _accountRepo = new();
    private readonly FakeRefreshTokenRepository _refreshTokenRepo = new();
    private readonly FakeOutboxRepository _outboxRepo = new();
    private readonly FakeEmailVerificationChallengeRepository _challengeRepo = new();
    private readonly FakeUnitOfWork _unitOfWork = new();
    private readonly IPasswordHasher _passwordHasher = new BCryptPasswordHasher();
    private readonly IOtpService _otpService = new OtpService();
    private readonly FakeEmailSender _emailSender = new();
    private readonly ITokenService _tokenService;
    private readonly IOptions<JwtOptions> _jwtOptions;

    public PasswordRecoveryTests()
    {
        _jwtOptions = Options.Create(new JwtOptions
        {
            Issuer = "exe-auth",
            Audience = "exe-api",
            Key = "a-very-long-and-secure-secret-key-for-testing-1234567890",
            AccessTokenExpirationMinutes = 60,
            RefreshTokenExpirationDays = 7
        });

        _tokenService = new TokenService(_jwtOptions);
    }

    private AuthService CreateService()
    {
        return new AuthService(
            _accountRepo,
            _refreshTokenRepo,
            _outboxRepo,
            _challengeRepo,
            _unitOfWork,
            _passwordHasher,
            _tokenService,
            _otpService,
            _emailSender,
            _jwtOptions,
            new RegisterRequestValidator(),
            new LoginRequestValidator(),
            new RefreshTokenRequestValidator(),
            new LogoutRequestValidator(),
            new VerifyEmailRequestValidator(),
            new ResendVerificationRequestValidator(),
            new ForgotPasswordRequestValidator(),
            new ResetPasswordRequestValidator(),
            new NullLogger<AuthService>()
        );
    }

    private async Task<Account> SeedConfirmedAccountAsync(string email = "user@fpt.edu.vn", string rawPassword = "OldPassword@123")
    {
        var account = new Account
        {
            Id = Guid.NewGuid(),
            Email = email.Trim().ToLowerInvariant(),
            PasswordHash = _passwordHasher.HashPassword(rawPassword),
            Role = AccountRole.Student,
            RegistrationFullName = "Nguyễn Văn Test",
            IsActive = true,
            EmailConfirmed = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        await _accountRepo.AddAsync(account);
        return account;
    }

    [Fact]
    public async Task ForgotPassword_WhenAccountDoesNotExist_ReturnsGenericSuccess_WithoutSendingEmail()
    {
        var service = CreateService();
        var request = new ForgotPasswordRequest("nonexistent@fpt.edu.vn");

        var response = await service.ForgotPasswordAsync(request);

        Assert.NotNull(response);
        Assert.Contains("Nếu email của bạn tồn tại", response.Message);
        Assert.Equal("nonexistent@fpt.edu.vn", response.Email);
        Assert.Empty(_emailSender.SentPasswordResetEmails);
    }

    [Fact]
    public async Task ForgotPassword_WhenAccountExists_CreatesChallengeAndSendsEmail()
    {
        var account = await SeedConfirmedAccountAsync("student@fpt.edu.vn");
        var service = CreateService();
        var request = new ForgotPasswordRequest(account.Email);

        var response = await service.ForgotPasswordAsync(request);

        Assert.NotNull(response);
        Assert.Equal(account.Email, response.Email);
        Assert.Equal(60, response.ResendCooldownSeconds);
        Assert.Single(_emailSender.SentPasswordResetEmails);
        var sentEmail = _emailSender.SentPasswordResetEmails.First();
        Assert.Equal(account.Email, sentEmail.Email);
        Assert.Equal(6, sentEmail.Otp.Length);

        var activeChallenge = await _challengeRepo.GetActiveChallengeByAccountIdAsync(account.Id, ChallengePurpose.PasswordReset);
        Assert.NotNull(activeChallenge);
        Assert.Equal(ChallengePurpose.PasswordReset, activeChallenge.Purpose);
        Assert.False(activeChallenge.IsUsed);
    }

    [Fact]
    public async Task ForgotPassword_WhenCooldownActive_ThrowsBadRequestException()
    {
        var account = await SeedConfirmedAccountAsync("student@fpt.edu.vn");
        var service = CreateService();

        // First request
        await service.ForgotPasswordAsync(new ForgotPasswordRequest(account.Email));

        // Immediate second request within 60s cooldown
        var ex = await Assert.ThrowsAsync<BadRequestException>(() =>
            service.ForgotPasswordAsync(new ForgotPasswordRequest(account.Email)));

        Assert.Equal("RESEND_COOLDOWN", ex.ErrorCode);
    }

    [Fact]
    public async Task ForgotPassword_WhenHourlyLimitExceeded_ThrowsBadRequestException()
    {
        var account = await SeedConfirmedAccountAsync("student@fpt.edu.vn");
        var service = CreateService();

        // Seed 5 existing challenges in the last hour
        for (int i = 0; i < 5; i++)
        {
            await _challengeRepo.AddAsync(new EmailVerificationChallenge
            {
                Id = Guid.NewGuid(),
                AccountId = account.Id,
                Email = account.Email,
                OtpHash = "hash",
                Salt = "salt",
                ExpiresAt = DateTime.UtcNow.AddMinutes(5),
                ResendAvailableAt = DateTime.UtcNow.AddSeconds(-10), // expired cooldown
                Purpose = ChallengePurpose.PasswordReset,
                CreatedAt = DateTime.UtcNow.AddMinutes(-10 * (i + 1))
            });
        }

        var ex = await Assert.ThrowsAsync<BadRequestException>(() =>
            service.ForgotPasswordAsync(new ForgotPasswordRequest(account.Email)));

        Assert.Equal("TOO_MANY_RESENDS", ex.ErrorCode);
    }

    [Fact]
    public async Task ResetPassword_WhenChallengeNotFound_ThrowsBadRequestException()
    {
        var account = await SeedConfirmedAccountAsync("student@fpt.edu.vn");
        var service = CreateService();

        var request = new ResetPasswordRequest(account.Email, "123456", "NewPassword@123", "NewPassword@123");

        var ex = await Assert.ThrowsAsync<BadRequestException>(() =>
            service.ResetPasswordAsync(request));

        Assert.Equal("CHALLENGE_NOT_FOUND", ex.ErrorCode);
    }

    [Fact]
    public async Task ResetPassword_WhenOtpIncorrect_IncrementsFailedAttempts_AndThrowsBadRequestException()
    {
        var account = await SeedConfirmedAccountAsync("student@fpt.edu.vn");
        var service = CreateService();

        // Request forgot password to generate challenge
        await service.ForgotPasswordAsync(new ForgotPasswordRequest(account.Email));

        var request = new ResetPasswordRequest(account.Email, "000000", "NewPassword@123", "NewPassword@123");

        var ex = await Assert.ThrowsAsync<BadRequestException>(() =>
            service.ResetPasswordAsync(request));

        Assert.Equal("INVALID_OTP", ex.ErrorCode);

        var challenge = await _challengeRepo.GetActiveChallengeByAccountIdAsync(account.Id, ChallengePurpose.PasswordReset);
        Assert.NotNull(challenge);
        Assert.Equal(1, challenge.FailedAttempts);
    }

    [Fact]
    public async Task ResetPassword_WhenOtpValid_UpdatesPassword_AndRevokesAllRefreshTokens()
    {
        var account = await SeedConfirmedAccountAsync("student@fpt.edu.vn", "OldPassword@123");
        var service = CreateService();

        // Seed an active refresh token
        var refreshToken = new RefreshToken
        {
            Id = Guid.NewGuid(),
            AccountId = account.Id,
            TokenHash = "some-token-hash",
            ExpiresAt = DateTime.UtcNow.AddDays(7),
            CreatedAt = DateTime.UtcNow
        };
        await _refreshTokenRepo.AddAsync(refreshToken);

        // Request forgot password
        await service.ForgotPasswordAsync(new ForgotPasswordRequest(account.Email));
        var sentEmail = _emailSender.SentPasswordResetEmails.Last();
        var otp = sentEmail.Otp;

        // Reset password with valid OTP
        var newPassword = "NewSecurePassword@2026";
        var resetRequest = new ResetPasswordRequest(account.Email, otp, newPassword, newPassword);
        var response = await service.ResetPasswordAsync(resetRequest);

        Assert.NotNull(response);
        Assert.Contains("thành công", response.Message);

        // Verify password was updated
        var updatedAccount = await _accountRepo.GetByIdAsync(account.Id);
        Assert.NotNull(updatedAccount);
        Assert.True(_passwordHasher.VerifyPassword(newPassword, updatedAccount.PasswordHash));
        Assert.False(_passwordHasher.VerifyPassword("OldPassword@123", updatedAccount.PasswordHash));

        // Verify challenge is marked used
        var challenge = await _challengeRepo.GetActiveChallengeByAccountIdAsync(account.Id, ChallengePurpose.PasswordReset);
        Assert.Null(challenge);

        // Verify all refresh tokens revoked
        var activeTokens = _refreshTokenRepo.RefreshTokens
            .Where(t => t.AccountId == account.Id && t.RevokedAt == null)
            .ToList();
        Assert.Empty(activeTokens);
    }

    [Fact]
    public async Task ResetPassword_WhenPasswordsDoNotMatch_FailsValidation()
    {
        var service = CreateService();
        var request = new ResetPasswordRequest("user@fpt.edu.vn", "123456", "Password@123", "MismatchPassword@456");

        await Assert.ThrowsAsync<FluentValidation.ValidationException>(() =>
            service.ResetPasswordAsync(request));
    }
}
