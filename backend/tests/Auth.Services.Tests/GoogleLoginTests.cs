using Auth.Repository.Entities;
using Auth.Repository.Enums;
using Auth.Services.DTOs;
using Auth.Services.Implementations;
using Auth.Services.Security;
using Auth.Services.Tests.TestDoubles;
using Auth.Services.Validators;
using Exe.BuildingBlocks.Auth;
using Exe.BuildingBlocks.Exceptions;
using Microsoft.Extensions.Options;

namespace Auth.Services.Tests;

public class GoogleLoginTests
{
    private readonly FakeAccountRepository _accountRepo = new();
    private readonly FakeRefreshTokenRepository _refreshTokenRepo = new();
    private readonly FakeGoogleTokenVerifier _verifier = new();

    private AuthService CreateService()
    {
        var jwtOptions = Options.Create(new JwtOptions
        {
            Issuer = "exe-auth",
            Audience = "exe-api",
            Key = "a-very-long-and-secure-secret-key-for-testing-1234567890",
            AccessTokenExpirationMinutes = 60,
            RefreshTokenExpirationDays = 7
        });

        return new AuthService(
            _accountRepo,
            _refreshTokenRepo,
            new FakeUnitOfWork(),
            new TokenService(jwtOptions),
            _verifier,
            jwtOptions,
            new GoogleLoginRequestValidator(),
            new RefreshTokenRequestValidator(),
            new LogoutRequestValidator(),
            new NullLogger<AuthService>());
    }

    private Account SeedAccount(string email, bool isActive = true)
    {
        var account = new Account
        {
            Id = Guid.NewGuid(),
            Email = email,
            RegistrationFullName = "Sinh Viên A",
            Role = AccountRole.Student,
            StudentCode = "SE190001",
            IsActive = isActive,
            CreatedAt = DateTime.UtcNow
        };
        _accountRepo.Accounts.Add(account);
        return account;
    }

    [Fact]
    public async Task EmailOnList_IssuesTokensForThatAccount()
    {
        var account = SeedAccount("sinhvien@gmail.com");
        _verifier.Identity = new GoogleIdentity("sinhvien@gmail.com", true, "Tên Trên Google");

        var response = await CreateService().LoginWithGoogleAsync(new GoogleLoginRequest("token"));

        Assert.NotEmpty(response.AccessToken);
        Assert.NotEmpty(response.RefreshToken);
        Assert.Equal(account.Id, response.User.Id);
        Assert.Equal("Student", response.User.Role);
        Assert.Equal(account.Id, Assert.Single(_refreshTokenRepo.RefreshTokens).AccountId);
    }

    [Fact]
    public async Task EmailMatch_IgnoresCaseAndSurroundingSpaces()
    {
        var account = SeedAccount("sinhvien@gmail.com");
        _verifier.Identity = new GoogleIdentity("  SinhVien@Gmail.com ", true, null);

        var response = await CreateService().LoginWithGoogleAsync(new GoogleLoginRequest("token"));

        Assert.Equal(account.Id, response.User.Id);
    }

    [Fact]
    public async Task AnyEmailDomainOnTheList_IsAccepted()
    {
        SeedAccount("sinhvien@fpt.edu.vn");
        _verifier.Identity = new GoogleIdentity("sinhvien@fpt.edu.vn", true, null);

        var response = await CreateService().LoginWithGoogleAsync(new GoogleLoginRequest("token"));

        Assert.Equal("sinhvien@fpt.edu.vn", response.User.Email);
    }

    [Fact]
    public async Task EmailNotOnList_IsRejectedAndMessageNamesTheEmail()
    {
        SeedAccount("sinhvien@gmail.com");
        _verifier.Identity = new GoogleIdentity("nguoila@gmail.com", true, null);

        var ex = await Assert.ThrowsAsync<ForbiddenException>(() =>
            CreateService().LoginWithGoogleAsync(new GoogleLoginRequest("token")));

        Assert.Equal("NOT_IN_FAP_LIST", ex.ErrorCode);
        Assert.Contains("nguoila@gmail.com", ex.Message);
        Assert.Empty(_refreshTokenRepo.RefreshTokens);
    }

    [Fact]
    public async Task LockedAccount_IsRejected()
    {
        SeedAccount("sinhvien@gmail.com", isActive: false);
        _verifier.Identity = new GoogleIdentity("sinhvien@gmail.com", true, null);

        var ex = await Assert.ThrowsAsync<ForbiddenException>(() =>
            CreateService().LoginWithGoogleAsync(new GoogleLoginRequest("token")));

        Assert.Equal("ACCOUNT_LOCKED", ex.ErrorCode);
    }

    [Fact]
    public async Task InvalidToken_IsRejected()
    {
        SeedAccount("sinhvien@gmail.com");
        _verifier.Identity = null;

        var ex = await Assert.ThrowsAsync<UnauthorizedException>(() =>
            CreateService().LoginWithGoogleAsync(new GoogleLoginRequest("bad-token")));

        Assert.Equal("INVALID_GOOGLE_TOKEN", ex.ErrorCode);
    }

    [Fact]
    public async Task UnverifiedGoogleEmail_IsRejectedEvenIfOnList()
    {
        SeedAccount("sinhvien@gmail.com");
        _verifier.Identity = new GoogleIdentity("sinhvien@gmail.com", false, null);

        var ex = await Assert.ThrowsAsync<UnauthorizedException>(() =>
            CreateService().LoginWithGoogleAsync(new GoogleLoginRequest("token")));

        Assert.Equal("INVALID_GOOGLE_TOKEN", ex.ErrorCode);
    }

    [Fact]
    public async Task EmptyToken_FailsValidation()
    {
        await Assert.ThrowsAsync<FluentValidation.ValidationException>(() =>
            CreateService().LoginWithGoogleAsync(new GoogleLoginRequest("")));
    }

    [Fact]
    public async Task Verifier_WithoutClientId_RejectsInsteadOfSkippingAudienceCheck()
    {
        var verifier = new GoogleTokenVerifier(
            Options.Create(new GoogleAuthOptions { ClientId = " " }),
            new NullLogger<GoogleTokenVerifier>());

        Assert.Null(await verifier.VerifyAsync("any-token"));
    }
}
