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

public class RefreshTokenTests
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

    public RefreshTokenTests()
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

    private async Task<(Account Account, string RawToken, RefreshToken Entity)> SeedAccountWithTokenAsync(
        DateTime? expiresAt = null,
        DateTime? revokedAt = null,
        string? revokeReason = null)
    {
        var account = new Account
        {
            Id = Guid.NewGuid(),
            Email = "student_refresh@fpt.edu.vn",
            PasswordHash = _passwordHasher.HashPassword("Password@123"),
            RegistrationFullName = "Sinh Viên Refresh",
            Role = AccountRole.Student,
            IsActive = true,
            EmailConfirmed = true,
            EmailConfirmedAt = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow
        };
        await _accountRepo.AddAsync(account);

        var (rawToken, tokenHash) = _tokenService.GenerateRefreshToken();
        var entity = new RefreshToken
        {
            Id = Guid.NewGuid(),
            AccountId = account.Id,
            TokenHash = tokenHash,
            ExpiresAt = expiresAt ?? DateTime.UtcNow.AddDays(7),
            CreatedAt = DateTime.UtcNow,
            RevokedAt = revokedAt,
            RevokeReason = revokeReason
        };
        await _refreshTokenRepo.AddAsync(entity);

        return (account, rawToken, entity);
    }

    [Fact]
    public async Task Refresh_WithExpiredToken_ShouldThrowUnauthorized()
    {
        // 8. Refresh-token expiration
        var service = CreateService();
        var (_, rawToken, _) = await SeedAccountWithTokenAsync(expiresAt: DateTime.UtcNow.AddDays(-1));

        var ex = await Assert.ThrowsAsync<UnauthorizedException>(() =>
            service.RefreshTokenAsync(new RefreshTokenRequest(rawToken)));

        Assert.Equal("REFRESH_TOKEN_EXPIRED", ex.ErrorCode);
    }

    [Fact]
    public async Task Refresh_WithValidToken_ShouldRotateTokenSafely()
    {
        // 9. Refresh-token rotation
        var service = CreateService();
        var (account, rawToken, oldEntity) = await SeedAccountWithTokenAsync();

        var response = await service.RefreshTokenAsync(new RefreshTokenRequest(rawToken));

        Assert.NotNull(response);
        Assert.NotEmpty(response.AccessToken);
        Assert.NotEmpty(response.RefreshToken);
        Assert.NotEqual(rawToken, response.RefreshToken);

        // Verify old token is revoked with link to new token
        Assert.NotNull(oldEntity.RevokedAt);
        Assert.Equal("ReplacedByNewToken", oldEntity.RevokeReason);
        Assert.NotNull(oldEntity.ReplacedByTokenId);

        // Verify new token exists in repository and is active
        var newHash = _tokenService.HashToken(response.RefreshToken);
        var newEntity = _refreshTokenRepo.RefreshTokens.FirstOrDefault(t => t.TokenHash == newHash);
        Assert.NotNull(newEntity);
        Assert.Equal(oldEntity.ReplacedByTokenId, newEntity.Id);
        Assert.Null(newEntity.RevokedAt);
        Assert.Equal(account.Id, newEntity.AccountId);
    }

    [Fact]
    public async Task Refresh_WithReusedRevokedToken_ShouldRevokeAllSessions()
    {
        // 10. Refresh-token reuse behavior
        var service = CreateService();
        // Seed token revoked outside 5-second grace window (e.g., 10 minutes ago)
        var (account, rawToken, _) = await SeedAccountWithTokenAsync(
            revokedAt: DateTime.UtcNow.AddMinutes(-10),
            revokeReason: "ReplacedByNewToken"
        );

        // Add a second active token for the same account (e.g., on another device)
        var (_, anotherRawToken, secondToken) = await SeedAccountWithTokenAsync();
        secondToken.AccountId = account.Id;

        // Submitting the already revoked token simulates token theft
        var ex = await Assert.ThrowsAsync<UnauthorizedException>(() =>
            service.RefreshTokenAsync(new RefreshTokenRequest(rawToken)));

        Assert.Equal("TOKEN_REUSE_DETECTED", ex.ErrorCode);

        // All tokens for this account must be revoked immediately
        Assert.NotNull(secondToken.RevokedAt);
        Assert.Equal("RevokedDueToReuseAttempt", secondToken.RevokeReason);
    }

    [Fact]
    public async Task Refresh_WithConcurrentInFlightToken_WithinGracePeriod_ShouldThrowConcurrentRefreshWithoutWipingAll()
    {
        // 11. Concurrent refresh behavior
        var service = CreateService();
        // Revoked just 1 second ago due to concurrent in-flight rotation
        var (account, rawToken, _) = await SeedAccountWithTokenAsync(
            revokedAt: DateTime.UtcNow.AddSeconds(-1),
            revokeReason: "ReplacedByNewToken"
        );

        // Also have an active token
        var (newRawToken, newHash) = _tokenService.GenerateRefreshToken();
        var activeToken = new RefreshToken
        {
            Id = Guid.NewGuid(),
            AccountId = account.Id,
            TokenHash = newHash,
            ExpiresAt = DateTime.UtcNow.AddDays(7),
            CreatedAt = DateTime.UtcNow
        };
        await _refreshTokenRepo.AddAsync(activeToken);

        var ex = await Assert.ThrowsAsync<UnauthorizedException>(() =>
            service.RefreshTokenAsync(new RefreshTokenRequest(rawToken)));

        Assert.Equal("CONCURRENT_REFRESH", ex.ErrorCode);
        // Ensure other active tokens were NOT wiped out in concurrent race condition
        Assert.Null(activeToken.RevokedAt);
    }

    [Fact]
    public async Task Logout_ShouldRevokeRefreshToken()
    {
        // 12. Logout revocation
        var service = CreateService();
        var (_, rawToken, entity) = await SeedAccountWithTokenAsync();

        await service.LogoutAsync(new LogoutRequest(rawToken));

        Assert.NotNull(entity.RevokedAt);
        Assert.Equal("UserLogout", entity.RevokeReason);

        // Trying to refresh with logged-out token should fail
        var ex = await Assert.ThrowsAsync<UnauthorizedException>(() =>
            service.RefreshTokenAsync(new RefreshTokenRequest(rawToken)));

        Assert.True(ex.ErrorCode is "TOKEN_REUSE_DETECTED" or "INVALID_REFRESH_TOKEN");
    }
}
