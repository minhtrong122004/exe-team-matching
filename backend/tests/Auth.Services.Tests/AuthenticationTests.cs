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

public class AuthenticationTests
{
    private readonly FakeAccountRepository _accountRepo = new();
    private readonly FakeRefreshTokenRepository _refreshTokenRepo = new();
    private readonly FakeOutboxRepository _outboxRepo = new();
    private readonly FakeUnitOfWork _unitOfWork = new();
    private readonly FakeEmailVerificationChallengeRepository _challengeRepo = new();
    private readonly IOtpService _otpService = new OtpService();
    private readonly FakeEmailSender _emailSender = new();
    private readonly IPasswordHasher _passwordHasher = new BCryptPasswordHasher();
    private readonly ITokenService _tokenService;
    private readonly IOptions<JwtOptions> _jwtOptions;

    public AuthenticationTests()
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
    public async Task Login_WithValidCredentials_ShouldReturnAuthResponse()
    {
        // 4. Valid login
        var service = CreateService();
        var password = "CorrectPassword@2026";
        var account = new Account
        {
            Id = Guid.NewGuid(),
            Email = "student@fpt.edu.vn",
            PasswordHash = _passwordHasher.HashPassword(password),
            RegistrationFullName = "Trần Thị Sinh Viên",
            Role = AccountRole.Student,
            IsActive = true,
            EmailConfirmed = true,
            EmailConfirmedAt = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow
        };
        await _accountRepo.AddAsync(account);

        var response = await service.LoginAsync(new LoginRequest(account.Email, password));

        Assert.NotNull(response);
        Assert.NotEmpty(response.AccessToken);
        Assert.NotEmpty(response.RefreshToken);
        Assert.Equal(account.Email, response.User.Email);
        Assert.Equal(account.RegistrationFullName, response.User.FullName);
        Assert.Equal("Student", response.User.Role);
    }

    [Fact]
    public async Task Login_WithWrongPassword_ShouldThrowUnauthorized()
    {
        // 5. Invalid credentials (wrong password)
        var service = CreateService();
        var account = new Account
        {
            Id = Guid.NewGuid(),
            Email = "student@fpt.edu.vn",
            PasswordHash = _passwordHasher.HashPassword("CorrectPassword@2026"),
            RegistrationFullName = "Trần Thị Sinh Viên",
            Role = AccountRole.Student,
            IsActive = true,
            EmailConfirmed = true,
            EmailConfirmedAt = DateTime.UtcNow
        };
        await _accountRepo.AddAsync(account);

        var ex = await Assert.ThrowsAsync<UnauthorizedException>(() =>
            service.LoginAsync(new LoginRequest("student@fpt.edu.vn", "WrongPassword!")));

        Assert.Equal("INVALID_CREDENTIALS", ex.ErrorCode);
    }

    [Fact]
    public async Task Login_WithNonExistentEmail_ShouldThrowUnauthorized()
    {
        // 5. Invalid credentials (non-existent email)
        var service = CreateService();

        var ex = await Assert.ThrowsAsync<UnauthorizedException>(() =>
            service.LoginAsync(new LoginRequest("nonexistent@fpt.edu.vn", "SomePassword@123")));

        Assert.Equal("INVALID_CREDENTIALS", ex.ErrorCode);
    }

    [Fact]
    public async Task Login_WithUnverifiedAccount_ShouldThrowForbidden()
    {
        // Gate D, H: Unverified pending account login rejected
        var service = CreateService();
        var password = "CorrectPassword@2026";
        var account = new Account
        {
            Id = Guid.NewGuid(),
            Email = "unverified@gmail.com",
            PasswordHash = _passwordHasher.HashPassword(password),
            RegistrationFullName = "Nguyễn Chờ Xác Thực",
            Role = AccountRole.Student,
            IsActive = true,
            EmailConfirmed = false, // Pending verification
            CreatedAt = DateTime.UtcNow
        };
        await _accountRepo.AddAsync(account);

        var ex = await Assert.ThrowsAsync<ForbiddenException>(() =>
            service.LoginAsync(new LoginRequest("unverified@gmail.com", password)));

        Assert.Equal("EMAIL_NOT_CONFIRMED", ex.ErrorCode);
    }

    [Fact]
    public async Task Login_WithInactiveAccount_ShouldThrowForbidden()
    {
        // 6. Inactive account login
        var service = CreateService();
        var password = "CorrectPassword@2026";
        var account = new Account
        {
            Id = Guid.NewGuid(),
            Email = "locked@fpt.edu.vn",
            PasswordHash = _passwordHasher.HashPassword(password),
            RegistrationFullName = "Nguyễn Bị Khóa",
            Role = AccountRole.Student,
            IsActive = false, // Locked
            EmailConfirmed = true,
            CreatedAt = DateTime.UtcNow
        };
        await _accountRepo.AddAsync(account);

        var ex = await Assert.ThrowsAsync<ForbiddenException>(() =>
            service.LoginAsync(new LoginRequest("locked@fpt.edu.vn", password)));

        Assert.Equal("ACCOUNT_LOCKED", ex.ErrorCode);
    }
}
