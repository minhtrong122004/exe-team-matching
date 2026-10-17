using System.Text.Json;
using Auth.Repository.Enums;
using Auth.Services.DTOs;
using Auth.Services.Implementations;
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
    private readonly FakeUnitOfWork _unitOfWork = new();
    private readonly IPasswordHasher _passwordHasher = new BCryptPasswordHasher();
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
            _unitOfWork,
            _passwordHasher,
            _tokenService,
            _jwtOptions,
            new RegisterRequestValidator(),
            new LoginRequestValidator(),
            new RefreshTokenRequestValidator(),
            new LogoutRequestValidator(),
            new NullLogger<AuthService>()
        );
    }

    [Fact]
    public async Task Register_WithLecturerOrAdminRole_ShouldFailValidation()
    {
        // 1. Student-only public registration
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
    public async Task Register_WithValidStudentData_ShouldSucceedAndPersistAccountAndOutbox()
    {
        // 1 & 14. Student registration & OutboxMessage creation
        var service = CreateService();

        var request = new RegisterRequest(
            "student@fpt.edu.vn",
            "StrongPass@2026",
            "Lê Văn Sinh Viên",
            Role: "Student"
        );

        var response = await service.RegisterAsync(request);

        Assert.NotNull(response);
        Assert.NotEmpty(response.AccessToken);
        Assert.NotEmpty(response.RefreshToken);
        Assert.Equal("student@fpt.edu.vn", response.User.Email);
        Assert.Equal("Lê Văn Sinh Viên", response.User.FullName);
        Assert.Equal("Student", response.User.Role);

        // Verify account persisted
        var account = _accountRepo.Accounts.FirstOrDefault(a => a.Email == "student@fpt.edu.vn");
        Assert.NotNull(account);
        Assert.Equal(AccountRole.Student, account.Role);
        Assert.True(account.IsActive);
        Assert.True(_passwordHasher.VerifyPassword("StrongPass@2026", account.PasswordHash));

        // Verify RefreshToken persisted
        var token = _refreshTokenRepo.RefreshTokens.FirstOrDefault(t => t.AccountId == account.Id);
        Assert.NotNull(token);
        Assert.Null(token.RevokedAt);

        // 14. Verify OutboxMessage created
        var outbox = _outboxRepo.Messages.FirstOrDefault();
        Assert.NotNull(outbox);
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
    public async Task Register_WithDuplicateEmail_ShouldThrowConflictException()
    {
        // 2. Duplicate email registration
        var service = CreateService();

        var request1 = new RegisterRequest(
            "test_duplicate@fpt.edu.vn",
            "StrongPass@2026",
            "Nguyễn Văn A"
        );

        await service.RegisterAsync(request1);

        var request2 = new RegisterRequest(
            "TEST_DUPLICATE@FPT.EDU.VN", // Test case-insensitivity
            "StrongPass@2026",
            "Nguyễn Văn A"
        );

        var ex = await Assert.ThrowsAsync<ConflictException>(() => service.RegisterAsync(request2));
        Assert.Equal("EMAIL_ALREADY_EXISTS", ex.ErrorCode);
    }
}
