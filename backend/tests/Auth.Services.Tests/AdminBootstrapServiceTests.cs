using Auth.Repository.Entities;
using Auth.Repository.Enums;
using Auth.Services.DTOs;
using Auth.Services.Implementations;
using Auth.Services.Security;
using Auth.Services.Tests.TestDoubles;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Xunit;

namespace Auth.Services.Tests;

public class AdminBootstrapServiceTests
{
    private readonly FakeHostEnvironment _environment = new();
    private readonly FakeAccountRepository _accountRepository = new();
    private readonly FakeUnitOfWork _unitOfWork = new();
    private readonly IPasswordHasher _passwordHasher = new BCryptPasswordHasher();

    private AdminBootstrapService CreateService(AdminBootstrapOptions options)
    {
        return new AdminBootstrapService(
            _environment,
            _accountRepository,
            _unitOfWork,
            _passwordHasher,
            Options.Create(options),
            new Auth.Services.Tests.TestDoubles.NullLogger<AdminBootstrapService>()
        );
    }

    [Fact]
    public async Task BootstrapAdmin_WhenOutsideDevelopment_ThrowsInvalidOperationException()
    {
        _environment.EnvironmentName = Environments.Production;
        var options = new AdminBootstrapOptions
        {
            AdminEmail = "admin@exe.local",
            AdminPassword = "AdminPassword@123"
        };
        var service = CreateService(options);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => service.BootstrapAdminAsync());
        Assert.Contains("strictly prohibited outside the Development environment", ex.Message);
        Assert.Empty(_accountRepository.Accounts);
    }

    [Theory]
    [InlineData(null, "AdminPassword@123")]
    [InlineData("", "AdminPassword@123")]
    [InlineData("   ", "AdminPassword@123")]
    [InlineData("admin@exe.local", null)]
    [InlineData("admin@exe.local", "")]
    [InlineData("admin@exe.local", "   ")]
    public async Task BootstrapAdmin_WhenCredentialsMissing_ThrowsInvalidOperationException(string? email, string? password)
    {
        var options = new AdminBootstrapOptions
        {
            AdminEmail = email,
            AdminPassword = password
        };
        var service = CreateService(options);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => service.BootstrapAdminAsync());
        Assert.Contains("Admin bootstrap credentials are not configured", ex.Message);
        Assert.Empty(_accountRepository.Accounts);
    }

    [Theory]
    [InlineData("not-an-email")]
    [InlineData("admin@")]
    [InlineData("@exe.local")]
    public async Task BootstrapAdmin_WhenEmailFormatInvalid_ThrowsInvalidOperationException(string invalidEmail)
    {
        var options = new AdminBootstrapOptions
        {
            AdminEmail = invalidEmail,
            AdminPassword = "AdminPassword@123"
        };
        var service = CreateService(options);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => service.BootstrapAdminAsync());
        Assert.Contains("not in a valid email format", ex.Message);
        Assert.Empty(_accountRepository.Accounts);
    }

    [Theory]
    [InlineData("short1!")] // < 8
    [InlineData("lowercase123!")] // no uppercase
    [InlineData("UPPERCASE123!")] // no lowercase isn't checked, but let's check uppercase/digit/special
    [InlineData("NoDigitsInPassword!")] // no digits
    [InlineData("NoSpecialChar1234")] // no special
    public async Task BootstrapAdmin_WhenPasswordDoesNotMeetComplexity_ThrowsInvalidOperationException(string weakPassword)
    {
        var options = new AdminBootstrapOptions
        {
            AdminEmail = "admin@exe.local",
            AdminPassword = weakPassword
        };
        var service = CreateService(options);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => service.BootstrapAdminAsync());
        Assert.Contains("does not meet complexity requirements", ex.Message);
        Assert.Empty(_accountRepository.Accounts);
    }

    [Fact]
    public async Task BootstrapAdmin_WhenAdminAccountAlreadyExists_ThrowsInvalidOperationException()
    {
        // Seed an existing admin account
        _accountRepository.Accounts.Add(new Account
        {
            Id = Guid.NewGuid(),
            Email = "existing_admin@exe.local",
            PasswordHash = "hash",
            RegistrationFullName = "Existing Admin",
            Role = AccountRole.Admin,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        });

        var options = new AdminBootstrapOptions
        {
            AdminEmail = "new_admin@exe.local",
            AdminPassword = "NewAdminPassword@123"
        };
        var service = CreateService(options);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => service.BootstrapAdminAsync());
        Assert.Contains("An Admin account already exists in ExeAuthDb", ex.Message);
        Assert.Single(_accountRepository.Accounts); // No new account added
    }

    [Fact]
    public async Task BootstrapAdmin_WhenEmailAlreadyExistsWithAnotherRole_ThrowsInvalidOperationException()
    {
        // Seed an existing student with the same email
        _accountRepository.Accounts.Add(new Account
        {
            Id = Guid.NewGuid(),
            Email = "student@exe.local",
            PasswordHash = "hash",
            RegistrationFullName = "Student User",
            Role = AccountRole.Student,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        });

        var options = new AdminBootstrapOptions
        {
            AdminEmail = "student@exe.local",
            AdminPassword = "AdminPassword@123"
        };
        var service = CreateService(options);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => service.BootstrapAdminAsync());
        Assert.Contains("already exists", ex.Message);
        Assert.Single(_accountRepository.Accounts);
    }

    [Fact]
    public async Task BootstrapAdmin_WhenValidInDevelopment_CreatesAdminAccountAndReturnsResponse()
    {
        var options = new AdminBootstrapOptions
        {
            AdminEmail = "Admin@EXE.Local ", // test trimming & case handling
            AdminPassword = "AdminSecret@2026",
            AdminFullName = " Lead Administrator "
        };
        var service = CreateService(options);

        var result = await service.BootstrapAdminAsync();

        Assert.NotNull(result);
        Assert.Equal("admin@exe.local", result.Email);
        Assert.Equal("Lead Administrator", result.FullName);
        Assert.Equal("Admin", result.Role);
        Assert.True(result.IsActive);
        Assert.NotEqual(Guid.Empty, result.Id);

        // Verify database persistence
        var savedAccount = Assert.Single(_accountRepository.Accounts);
        Assert.Equal(result.Id, savedAccount.Id);
        Assert.Equal("admin@exe.local", savedAccount.Email);
        Assert.Equal(AccountRole.Admin, savedAccount.Role);
        Assert.True(savedAccount.IsActive);
        Assert.True(_unitOfWork.SaveChangesCalls > 0);

        // Verify password was hashed with BCrypt and can be verified
        Assert.NotEqual("AdminSecret@2026", savedAccount.PasswordHash);
        Assert.True(_passwordHasher.VerifyPassword("AdminSecret@2026", savedAccount.PasswordHash));
    }

    [Fact]
    public async Task BootstrapAdmin_SequentialOrConcurrentCalls_AllowsOnlyOneAdminCreation()
    {
        var options = new AdminBootstrapOptions
        {
            AdminEmail = "admin@exe.local",
            AdminPassword = "AdminSecret@2026",
            AdminFullName = "Lead Administrator"
        };
        var service = CreateService(options);

        // First bootstrap succeeds
        var result1 = await service.BootstrapAdminAsync();
        Assert.NotNull(result1);

        // Second bootstrap must fail because an Admin already exists
        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => service.BootstrapAdminAsync());
        Assert.Contains("An Admin account already exists in ExeAuthDb", ex.Message);

        // Verify only 1 account exists
        Assert.Single(_accountRepository.Accounts);
    }
}

public class FakeHostEnvironment : IHostEnvironment
{
    public string EnvironmentName { get; set; } = Environments.Development;
    public string ApplicationName { get; set; } = "Auth.API";
    public string ContentRootPath { get; set; } = "/app";
    public IFileProvider ContentRootFileProvider { get; set; } = null!;
}
