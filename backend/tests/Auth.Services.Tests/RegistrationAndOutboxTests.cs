using System.Text.Json;
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
using Exe.Contracts.Events;
using Microsoft.Extensions.Options;

namespace Auth.Services.Tests;

public class RegistrationAndOutboxTests
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

    public RegistrationAndOutboxTests()
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

    [Fact]
    public async Task Register_WithLecturerOrAdminRole_ShouldFailValidation()
    {
        // Student-only public registration
        var service = CreateService();

        var lecturerRequest = new RegisterRequest(
            "lecturer@fpt.edu.vn",
            "StrongPass@2026",
            "TS. Nguyễn Văn B",
            Role: "Lecturer"
        );

        var adminRequest = new RegisterRequest(
            "admin@fpt.edu.vn",
            "StrongPass@2026",
            "Admin User",
            Role: "Admin"
        );

        await Assert.ThrowsAsync<FluentValidation.ValidationException>(() => service.RegisterAsync(lecturerRequest));
        await Assert.ThrowsAsync<FluentValidation.ValidationException>(() => service.RegisterAsync(adminRequest));
    }

    [Fact]
    public async Task Register_WithGmail_ShouldSucceedAndCreatePendingAccountWithoutTokensOrOutbox()
    {
        // Gate C, D, E, H: Accepts Gmail, no tokens issued, no Outbox message before verification
        var service = CreateService();

        var request = new RegisterRequest(
            "student.test@gmail.com",
            "StrongPass@2026",
            "Lê Văn Sinh Viên",
            Role: "Student"
        );

        var response = await service.RegisterAsync(request);

        Assert.NotNull(response);
        Assert.Equal("student.test@gmail.com", response.Email);
        Assert.True(response.ExpiresAt > DateTime.UtcNow);

        // Account persisted with EmailConfirmed = false (PendingVerification)
        var account = _accountRepo.Accounts.FirstOrDefault(a => a.Email == "student.test@gmail.com");
        Assert.NotNull(account);
        Assert.Equal(AccountRole.Student, account.Role);
        Assert.True(account.IsActive);
        Assert.False(account.EmailConfirmed);
        Assert.Null(account.EmailConfirmedAt);

        // Verify RefreshTokens NOT created before email verification
        var tokens = _refreshTokenRepo.RefreshTokens.Where(t => t.AccountId == account.Id).ToList();
        Assert.Empty(tokens);

        // Verify OutboxMessage NOT created before email verification (Gate I)
        Assert.Empty(_outboxRepo.Messages);

        // Verify EmailVerificationChallenge created
        var challenge = _challengeRepo.Challenges.FirstOrDefault(c => c.AccountId == account.Id);
        Assert.NotNull(challenge);
        Assert.False(challenge.IsUsed);
        Assert.NotEmpty(challenge.OtpHash);
        Assert.NotEmpty(challenge.Salt);

        // Verify Email was dispatched via EmailSender with 6-digit OTP
        var sentEmail = Assert.Single(_emailSender.SentEmails, e => e.Email == "student.test@gmail.com");
        Assert.Matches(@"^\d{6}$", sentEmail.Otp);
    }

    [Fact]
    public async Task Register_WithFptEmail_ShouldSucceed()
    {
        // Gate C: Accepts FPT institutional email
        var service = CreateService();

        var request = new RegisterRequest(
            "student@fpt.edu.vn",
            "StrongPass@2026",
            "Nguyễn FPT",
            Role: "Student"
        );

        var response = await service.RegisterAsync(request);
        Assert.NotNull(response);
        Assert.Equal("student@fpt.edu.vn", response.Email);
    }

    [Fact]
    public async Task Register_WithInvalidEmail_ShouldThrowValidationException()
    {
        var service = CreateService();

        var request = new RegisterRequest(
            "not-an-email",
            "StrongPass@2026",
            "Nguyễn Văn A"
        );

        await Assert.ThrowsAsync<FluentValidation.ValidationException>(() => service.RegisterAsync(request));
    }

    [Fact]
    public async Task Register_WithDuplicateVerifiedEmail_ShouldThrowConflictException()
    {
        var service = CreateService();

        var account = new Account
        {
            Id = Guid.NewGuid(),
            Email = "verified@gmail.com",
            PasswordHash = _passwordHasher.HashPassword("Pass@1234"),
            RegistrationFullName = "Đã Xác Thực",
            Role = AccountRole.Student,
            IsActive = true,
            EmailConfirmed = true,
            CreatedAt = DateTime.UtcNow
        };
        await _accountRepo.AddAsync(account);

        var request = new RegisterRequest(
            "VERIFIED@GMAIL.COM",
            "StrongPass@2026",
            "Đã Xác Thực 2"
        );

        var ex = await Assert.ThrowsAsync<ConflictException>(() => service.RegisterAsync(request));
        Assert.Equal("EMAIL_ALREADY_EXISTS", ex.ErrorCode);
    }

    [Fact]
    public async Task VerifyEmail_WithCorrectOtp_ShouldActivateAccountAndEmitUserRegisteredEvent()
    {
        // Gate D, E, H, I: Verification activates account & writes to Transactional Outbox
        var service = CreateService();

        var regRequest = new RegisterRequest(
            "student.verify@outlook.com",
            "StrongPass@2026",
            "Phan Văn Xác Thực"
        );

        await service.RegisterAsync(regRequest);

        var sentEmail = _emailSender.SentEmails.First(e => e.Email == "student.verify@outlook.com");
        var otp = sentEmail.Otp;

        var verifyRequest = new VerifyEmailRequest("student.verify@outlook.com", otp);
        var verifyResponse = await service.VerifyEmailAsync(verifyRequest);

        Assert.NotNull(verifyResponse);
        Assert.Equal("student.verify@outlook.com", verifyResponse.Email);

        // Account is now EmailConfirmed = true
        var account = _accountRepo.Accounts.First(a => a.Email == "student.verify@outlook.com");
        Assert.True(account.EmailConfirmed);
        Assert.NotNull(account.EmailConfirmedAt);

        // Challenge marked IsUsed = true
        var challenge = _challengeRepo.Challenges.First(c => c.AccountId == account.Id);
        Assert.True(challenge.IsUsed);
        Assert.NotNull(challenge.UsedAt);

        // Outbox message persisted exactly once (Gate I)
        var outbox = Assert.Single(_outboxRepo.Messages);
        Assert.Equal(nameof(UserRegisteredEvent), outbox.EventType);
        Assert.Null(outbox.ProcessedAt);

        var eventData = JsonSerializer.Deserialize<UserRegisteredEvent>(outbox.Payload, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });
        Assert.NotNull(eventData);
        Assert.Equal(account.Id, eventData.UserId);
        Assert.Equal(account.Email, eventData.Email);
        Assert.Equal("Student", eventData.Role);
    }

    [Fact]
    public async Task VerifyEmail_WithIncorrectOtp_ShouldFailAndIncrementFailedAttempts()
    {
        var service = CreateService();

        await service.RegisterAsync(new RegisterRequest("wrong.otp@gmail.com", "StrongPass@2026", "Test"));

        var verifyRequest = new VerifyEmailRequest("wrong.otp@gmail.com", "000000");

        var ex = await Assert.ThrowsAsync<BadRequestException>(() => service.VerifyEmailAsync(verifyRequest));
        Assert.Equal("INVALID_OTP", ex.ErrorCode);

        var challenge = _challengeRepo.Challenges.First(c => c.Email == "wrong.otp@gmail.com");
        Assert.Equal(1, challenge.FailedAttempts);
        Assert.False(challenge.IsUsed);
    }

    [Fact]
    public async Task VerifyEmail_WithMaxFailedAttempts_ShouldLockChallenge()
    {
        var service = CreateService();

        await service.RegisterAsync(new RegisterRequest("lock.challenge@gmail.com", "StrongPass@2026", "Test"));

        var challenge = _challengeRepo.Challenges.First(c => c.Email == "lock.challenge@gmail.com");
        challenge.FailedAttempts = 5;

        var ex = await Assert.ThrowsAsync<ForbiddenException>(() =>
            service.VerifyEmailAsync(new VerifyEmailRequest("lock.challenge@gmail.com", "123456")));

        Assert.Equal("MAX_FAILED_ATTEMPTS", ex.ErrorCode);
    }

    [Fact]
    public async Task VerifyEmail_WithExpiredOtp_ShouldThrowBadRequest()
    {
        var service = CreateService();

        await service.RegisterAsync(new RegisterRequest("expired.otp@gmail.com", "StrongPass@2026", "Test"));

        var challenge = _challengeRepo.Challenges.First(c => c.Email == "expired.otp@gmail.com");
        challenge.ExpiresAt = DateTime.UtcNow.AddMinutes(-1); // Expired

        var sentEmail = _emailSender.SentEmails.First(e => e.Email == "expired.otp@gmail.com");

        var ex = await Assert.ThrowsAsync<BadRequestException>(() =>
            service.VerifyEmailAsync(new VerifyEmailRequest("expired.otp@gmail.com", sentEmail.Otp)));

        Assert.Equal("OTP_EXPIRED", ex.ErrorCode);
    }

    [Fact]
    public async Task VerifyEmail_WhenReused_ShouldBeRejected()
    {
        var service = CreateService();

        await service.RegisterAsync(new RegisterRequest("reused@gmail.com", "StrongPass@2026", "Test"));
        var sentEmail = _emailSender.SentEmails.First(e => e.Email == "reused@gmail.com");

        // First verification succeeds
        await service.VerifyEmailAsync(new VerifyEmailRequest("reused@gmail.com", sentEmail.Otp));

        // Reusing OTP on already verified account
        var response = await service.VerifyEmailAsync(new VerifyEmailRequest("reused@gmail.com", sentEmail.Otp));
        Assert.Contains("trước đó", response.Message);
    }

    [Fact]
    public async Task ResendVerification_WithinCooldown_ShouldThrowBadRequest()
    {
        var service = CreateService();

        await service.RegisterAsync(new RegisterRequest("cooldown@gmail.com", "StrongPass@2026", "Test"));

        // Immediately try to resend
        var ex = await Assert.ThrowsAsync<BadRequestException>(() =>
            service.ResendVerificationAsync(new ResendVerificationRequest("cooldown@gmail.com")));

        Assert.Equal("RESEND_COOLDOWN", ex.ErrorCode);
    }

    [Fact]
    public async Task ResendVerification_AfterCooldown_ShouldInvalidateOldChallengeAndSendNewOtp()
    {
        var service = CreateService();

        await service.RegisterAsync(new RegisterRequest("resend.success@gmail.com", "StrongPass@2026", "Test"));
        var firstChallenge = _challengeRepo.Challenges.First(c => c.Email == "resend.success@gmail.com");

        // Simulate cooldown elapsed
        firstChallenge.ResendAvailableAt = DateTime.UtcNow.AddSeconds(-1);

        var resendResponse = await service.ResendVerificationAsync(new ResendVerificationRequest("resend.success@gmail.com"));

        Assert.NotNull(resendResponse);
        Assert.Equal(60, resendResponse.ResendCooldownSeconds);

        // First challenge invalidated
        Assert.True(firstChallenge.IsUsed);

        // Second challenge created
        var activeChallenge = await _challengeRepo.GetActiveChallengeByEmailAsync("resend.success@gmail.com");
        Assert.NotNull(activeChallenge);
        Assert.False(activeChallenge.IsUsed);
        Assert.NotEqual(firstChallenge.Id, activeChallenge.Id);

        // 2 emails sent
        var sentEmails = _emailSender.SentEmails.Where(e => e.Email == "resend.success@gmail.com").ToList();
        Assert.Equal(2, sentEmails.Count);
    }
}
