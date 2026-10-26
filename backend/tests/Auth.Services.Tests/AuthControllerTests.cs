using System.Reflection;
using Auth.API.Controllers;
using Auth.Services.DTOs;
using Auth.Services.Interfaces;
using Auth.Services.Tests.TestDoubles;
using Exe.BuildingBlocks.Exceptions;
using Exe.BuildingBlocks.Paging;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Auth.Services.Tests;

public class AuthControllerTests
{
    private class FakeAuthService : IAuthService
    {
        public Task<RegisterResponse> RegisterAsync(RegisterRequest request, CancellationToken ct = default)
        {
            return Task.FromResult(new RegisterResponse(
                "Đăng ký thành công",
                request.Email,
                DateTime.UtcNow.AddMinutes(5)
            ));
        }

        public Task<VerifyEmailResponse> VerifyEmailAsync(VerifyEmailRequest request, CancellationToken ct = default)
        {
            return Task.FromResult(new VerifyEmailResponse(
                "Xác thực thành công",
                request.Email
            ));
        }

        public Task<ResendVerificationResponse> ResendVerificationAsync(ResendVerificationRequest request, CancellationToken ct = default)
        {
            return Task.FromResult(new ResendVerificationResponse(
                "Mã mới đã gửi",
                request.Email,
                60,
                DateTime.UtcNow.AddMinutes(5)
            ));
        }

        public Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken ct = default)
        {
            return Task.FromResult(new AuthResponse(
                "fake-jwt-access-token",
                "fake-refresh-token",
                new AuthUserDto(Guid.NewGuid(), request.Email, "Họ Tên", "Student")
            ));
        }

        public Task<AuthResponse> RefreshTokenAsync(RefreshTokenRequest request, CancellationToken ct = default)
        {
            return Task.FromResult(new AuthResponse(
                "new-fake-jwt",
                "new-fake-refresh",
                new AuthUserDto(Guid.NewGuid(), "user@fpt.edu.vn", "Họ Tên", "Student")
            ));
        }

        public Task LogoutAsync(LogoutRequest request, CancellationToken ct = default)
        {
            return Task.CompletedTask;
        }

        public Task<AccountResponse> GetCurrentAccountAsync(Guid accountId, CancellationToken ct = default)
        {
            return Task.FromResult(new AccountResponse(
                accountId,
                "current@fpt.edu.vn",
                "Current User",
                "Student",
                true,
                DateTime.UtcNow
            ));
        }

        public Task<ForgotPasswordResponse> ForgotPasswordAsync(ForgotPasswordRequest request, CancellationToken ct = default)
        {
            return Task.FromResult(new ForgotPasswordResponse(
                "Mã OTP đã được gửi",
                request.Email,
                60,
                DateTime.UtcNow.AddMinutes(5)
            ));
        }

        public Task<ResetPasswordResponse> ResetPasswordAsync(ResetPasswordRequest request, CancellationToken ct = default)
        {
            return Task.FromResult(new ResetPasswordResponse(
                "Mật khẩu đã được cập nhật thành công.",
                request.Email
            ));
        }
    }

    private class FakeAdminAccountService : IAdminAccountService
    {
        public Task<PagedResult<AccountResponse>> GetAccountsPagedAsync(GetAccountsQuery query, CancellationToken ct = default)
        {
            var items = new List<AccountResponse>
            {
                new(Guid.NewGuid(), "admin@fpt.edu.vn", "Admin User", "Admin", true, DateTime.UtcNow)
            };
            return Task.FromResult(PagedResult<AccountResponse>.Create(items, 1, 10, 1));
        }

        public Task<AccountResponse> GetAccountByIdAsync(Guid id, CancellationToken ct = default)
        {
            return Task.FromResult(new AccountResponse(id, "u@fpt.edu.vn", "Name", "Student", true, DateTime.UtcNow));
        }

        public Task<AccountResponse> LockAccountAsync(Guid id, CancellationToken ct = default)
        {
            return Task.FromResult(new AccountResponse(id, "u@fpt.edu.vn", "Name", "Student", false, DateTime.UtcNow));
        }

        public Task<AccountResponse> UnlockAccountAsync(Guid id, CancellationToken ct = default)
        {
            return Task.FromResult(new AccountResponse(id, "u@fpt.edu.vn", "Name", "Student", true, DateTime.UtcNow));
        }

        public Task<AccountResponse> CreateLecturerAsync(CreateLecturerRequest request, CancellationToken ct = default)
        {
            return Task.FromResult(new AccountResponse(Guid.NewGuid(), request.Email, request.FullName, "Lecturer", true, DateTime.UtcNow));
        }
    }

    [Fact]
    public async Task Register_Returns201Created_WithRegisterResponse()
    {
        var fakeAuth = new FakeAuthService();
        var fakeAdmin = new FakeAdminAccountService();
        var fakeCurrentUser = new FakeCurrentUser();
        var controller = new AuthController(fakeAuth, fakeAdmin, fakeCurrentUser);

        var request = new RegisterRequest("sv@gmail.com", "Password@123", "Sinh Vien");
        var result = await controller.Register(request, CancellationToken.None);

        var objectResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status201Created, objectResult.StatusCode);
        var registerResponse = Assert.IsType<RegisterResponse>(objectResult.Value);
        Assert.Equal("sv@gmail.com", registerResponse.Email);
    }

    [Fact]
    public async Task VerifyEmail_Returns200OK_WithVerifyEmailResponse()
    {
        var fakeAuth = new FakeAuthService();
        var fakeAdmin = new FakeAdminAccountService();
        var fakeCurrentUser = new FakeCurrentUser();
        var controller = new AuthController(fakeAuth, fakeAdmin, fakeCurrentUser);

        var request = new VerifyEmailRequest("sv@gmail.com", "123456");
        var result = await controller.VerifyEmail(request, CancellationToken.None);

        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.Equal(StatusCodes.Status200OK, okResult.StatusCode);
        var verifyResponse = Assert.IsType<VerifyEmailResponse>(okResult.Value);
        Assert.Equal("sv@gmail.com", verifyResponse.Email);
    }

    [Fact]
    public async Task ResendVerification_Returns200OK_WithResendVerificationResponse()
    {
        var fakeAuth = new FakeAuthService();
        var fakeAdmin = new FakeAdminAccountService();
        var fakeCurrentUser = new FakeCurrentUser();
        var controller = new AuthController(fakeAuth, fakeAdmin, fakeCurrentUser);

        var request = new ResendVerificationRequest("sv@gmail.com");
        var result = await controller.ResendVerification(request, CancellationToken.None);

        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.Equal(StatusCodes.Status200OK, okResult.StatusCode);
        var resendResponse = Assert.IsType<ResendVerificationResponse>(okResult.Value);
        Assert.Equal("sv@gmail.com", resendResponse.Email);
        Assert.Equal(60, resendResponse.ResendCooldownSeconds);
    }

    [Fact]
    public async Task Login_Returns200OK_WithAuthResponse()
    {
        var fakeAuth = new FakeAuthService();
        var fakeAdmin = new FakeAdminAccountService();
        var fakeCurrentUser = new FakeCurrentUser();
        var controller = new AuthController(fakeAuth, fakeAdmin, fakeCurrentUser);

        var request = new LoginRequest("sv@fpt.edu.vn", "Password@123");
        var result = await controller.Login(request, CancellationToken.None);

        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.Equal(StatusCodes.Status200OK, okResult.StatusCode);
        var authResponse = Assert.IsType<AuthResponse>(okResult.Value);
        Assert.NotEmpty(authResponse.AccessToken);
    }

    [Fact]
    public async Task Refresh_Returns200OK_WithAuthResponse()
    {
        var fakeAuth = new FakeAuthService();
        var fakeAdmin = new FakeAdminAccountService();
        var fakeCurrentUser = new FakeCurrentUser();
        var controller = new AuthController(fakeAuth, fakeAdmin, fakeCurrentUser);

        var request = new RefreshTokenRequest("sample-token");
        var result = await controller.Refresh(request, CancellationToken.None);

        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.Equal(StatusCodes.Status200OK, okResult.StatusCode);
    }

    [Fact]
    public async Task Logout_Returns200OK()
    {
        var fakeAuth = new FakeAuthService();
        var fakeAdmin = new FakeAdminAccountService();
        var fakeCurrentUser = new FakeCurrentUser();
        var controller = new AuthController(fakeAuth, fakeAdmin, fakeCurrentUser);

        var request = new LogoutRequest("sample-token");
        var result = await controller.Logout(request, CancellationToken.None);

        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.Equal(StatusCodes.Status200OK, okResult.StatusCode);
    }

    [Fact]
    public async Task GetCurrentUser_WhenAuthenticated_Returns200OK()
    {
        var fakeAuth = new FakeAuthService();
        var fakeAdmin = new FakeAdminAccountService();
        var userId = Guid.NewGuid();
        var fakeCurrentUser = new FakeCurrentUser { UserId = userId, Role = "Student" };
        var controller = new AuthController(fakeAuth, fakeAdmin, fakeCurrentUser);

        var result = await controller.GetCurrentUser(CancellationToken.None);

        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.Equal(StatusCodes.Status200OK, okResult.StatusCode);
        var account = Assert.IsType<AccountResponse>(okResult.Value);
        Assert.Equal(userId, account.Id);
    }

    [Fact]
    public async Task GetCurrentUser_WhenUnauthenticated_ThrowsUnauthorized()
    {
        var fakeAuth = new FakeAuthService();
        var fakeAdmin = new FakeAdminAccountService();
        var fakeCurrentUser = new FakeCurrentUser { UserId = null };
        var controller = new AuthController(fakeAuth, fakeAdmin, fakeCurrentUser);

        await Assert.ThrowsAsync<UnauthorizedException>(() => controller.GetCurrentUser(CancellationToken.None));
    }

    [Fact]
    public void AdminEndpoints_ShouldHaveAdminAuthorizeAttribute()
    {
        // Verify Authorize(Roles = "Admin") on admin actions
        var lockMethod = typeof(AuthController).GetMethod(nameof(AuthController.LockAccount));
        Assert.NotNull(lockMethod);
        var authAttr = lockMethod.GetCustomAttribute<AuthorizeAttribute>();
        Assert.NotNull(authAttr);
        Assert.Equal("Admin", authAttr.Roles);

        var accountsMethod = typeof(AuthController).GetMethod(nameof(AuthController.GetAccounts));
        Assert.NotNull(accountsMethod);
        var authAttr2 = accountsMethod.GetCustomAttribute<AuthorizeAttribute>();
        Assert.NotNull(authAttr2);
        Assert.Equal("Admin", authAttr2.Roles);

        var createLecturerMethod = typeof(AuthController).GetMethod(nameof(AuthController.CreateLecturer));
        Assert.NotNull(createLecturerMethod);
        var authAttr3 = createLecturerMethod.GetCustomAttribute<AuthorizeAttribute>();
        Assert.NotNull(authAttr3);
        Assert.Equal("Admin", authAttr3.Roles);
    }

    [Fact]
    public async Task CreateLecturer_Returns201Created_WithAccountResponse()
    {
        var fakeAuth = new FakeAuthService();
        var fakeAdmin = new FakeAdminAccountService();
        var fakeCurrentUser = new FakeCurrentUser { UserId = Guid.NewGuid(), Role = "Admin" };
        var controller = new AuthController(fakeAuth, fakeAdmin, fakeCurrentUser);

        var request = new CreateLecturerRequest("lecturer@fpt.edu.vn", "Password@123", "Thầy Giáo A");
        var result = await controller.CreateLecturer(request, CancellationToken.None);

        var objectResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status201Created, objectResult.StatusCode);
        var account = Assert.IsType<AccountResponse>(objectResult.Value);
        Assert.Equal("lecturer@fpt.edu.vn", account.Email);
        Assert.Equal("Thầy Giáo A", account.FullName);
        Assert.Equal("Lecturer", account.Role);
    }

    [Fact]
    public async Task ForgotPassword_Returns200Ok_WithForgotPasswordResponse()
    {
        var fakeAuth = new FakeAuthService();
        var fakeAdmin = new FakeAdminAccountService();
        var fakeCurrentUser = new FakeCurrentUser();
        var controller = new AuthController(fakeAuth, fakeAdmin, fakeCurrentUser);

        var request = new ForgotPasswordRequest("student@fpt.edu.vn");
        var result = await controller.ForgotPassword(request, CancellationToken.None);

        var okResult = Assert.IsType<OkObjectResult>(result);
        var response = Assert.IsType<ForgotPasswordResponse>(okResult.Value);
        Assert.Equal("student@fpt.edu.vn", response.Email);
        Assert.Equal(60, response.ResendCooldownSeconds);
    }

    [Fact]
    public async Task ResetPassword_Returns200Ok_WithResetPasswordResponse()
    {
        var fakeAuth = new FakeAuthService();
        var fakeAdmin = new FakeAdminAccountService();
        var fakeCurrentUser = new FakeCurrentUser();
        var controller = new AuthController(fakeAuth, fakeAdmin, fakeCurrentUser);

        var request = new ResetPasswordRequest("student@fpt.edu.vn", "123456", "NewPassword@123", "NewPassword@123");
        var result = await controller.ResetPassword(request, CancellationToken.None);

        var okResult = Assert.IsType<OkObjectResult>(result);
        var response = Assert.IsType<ResetPasswordResponse>(okResult.Value);
        Assert.Equal("student@fpt.edu.vn", response.Email);
    }

    [Fact]
    public void PasswordRecoveryEndpoints_ShouldHaveAllowAnonymousAttribute()
    {
        var forgotMethod = typeof(AuthController).GetMethod(nameof(AuthController.ForgotPassword));
        Assert.NotNull(forgotMethod);
        Assert.NotNull(forgotMethod.GetCustomAttribute<AllowAnonymousAttribute>());

        var resetMethod = typeof(AuthController).GetMethod(nameof(AuthController.ResetPassword));
        Assert.NotNull(resetMethod);
        Assert.NotNull(resetMethod.GetCustomAttribute<AllowAnonymousAttribute>());
    }
}
