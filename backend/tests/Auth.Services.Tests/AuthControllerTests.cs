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
        public Task<AuthResponse> LoginWithGoogleAsync(GoogleLoginRequest request, CancellationToken ct = default)
        {
            return Task.FromResult(new AuthResponse(
                "fake-jwt-access-token",
                "fake-refresh-token",
                new AuthUserDto(Guid.NewGuid(), "user@gmail.com", "Họ Tên", "Student")
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

        public Task<AcceptTermsResponse> AcceptTermsAsync(Guid accountId, CancellationToken ct = default)
        {
            return Task.FromResult(new AcceptTermsResponse(
                "Đã xác nhận đồng ý quy định ghép nhóm.",
                true,
                DateTime.UtcNow
            ));
        }
    }

    private class FakeAdminAccountService : IAdminAccountService
    {
        public Task<PagedResult<AccountResponse>> GetAccountsPagedAsync(GetAccountsQuery query, CancellationToken ct = default)
        {
            var items = new List<AccountResponse>
            {
                new(Guid.NewGuid(), "moderator@fpt.edu.vn", "Moderator User", "Moderator", true, DateTime.UtcNow)
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
            return Task.FromResult(new AccountResponse(Guid.NewGuid(), request.Email, request.FullName, request.Role ?? "Lecturer", true, DateTime.UtcNow));
        }

        public Task<ProvisionFapStudentsResponse> ProvisionFapStudentsAsync(ProvisionFapStudentsRequest request, CancellationToken ct = default)
        {
            return Task.FromResult(new ProvisionFapStudentsResponse(
                request.SemesterCode,
                request.SubjectCode,
                request.Students.Count,
                request.Students.Count,
                0,
                new List<ProvisionStudentResultItem>()
            ));
        }
    }

    [Fact]
    public async Task LoginWithGoogle_Returns200OK_AndAllowsAnonymous()
    {
        var controller = new AuthController(new FakeAuthService(), new FakeAdminAccountService(), new FakeCurrentUser());

        var result = await controller.LoginWithGoogle(new GoogleLoginRequest("id-token"), CancellationToken.None);

        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.NotEmpty(Assert.IsType<AuthResponse>(okResult.Value).AccessToken);

        var method = typeof(AuthController).GetMethod(nameof(AuthController.LoginWithGoogle));
        Assert.NotNull(method!.GetCustomAttribute<AllowAnonymousAttribute>());
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
        // Verify Authorize(Roles = "Moderator") on moderator actions
        var lockMethod = typeof(AuthController).GetMethod(nameof(AuthController.LockAccount));
        Assert.NotNull(lockMethod);
        var authAttr = lockMethod.GetCustomAttribute<AuthorizeAttribute>();
        Assert.NotNull(authAttr);
        Assert.Equal("Moderator", authAttr.Roles);

        var accountsMethod = typeof(AuthController).GetMethod(nameof(AuthController.GetAccounts));
        Assert.NotNull(accountsMethod);
        var authAttr2 = accountsMethod.GetCustomAttribute<AuthorizeAttribute>();
        Assert.NotNull(authAttr2);
        Assert.Equal("Moderator", authAttr2.Roles);

        var createLecturerMethod = typeof(AuthController).GetMethod(nameof(AuthController.CreateLecturer));
        Assert.NotNull(createLecturerMethod);
        var authAttr3 = createLecturerMethod.GetCustomAttribute<AuthorizeAttribute>();
        Assert.NotNull(authAttr3);
        Assert.Equal("Moderator", authAttr3.Roles);
    }

    [Fact]
    public async Task CreateLecturer_Returns201Created_WithAccountResponse()
    {
        var fakeAuth = new FakeAuthService();
        var fakeAdmin = new FakeAdminAccountService();
        var fakeCurrentUser = new FakeCurrentUser { UserId = Guid.NewGuid(), Role = "Moderator" };
        var controller = new AuthController(fakeAuth, fakeAdmin, fakeCurrentUser);

        var request = new CreateLecturerRequest("lecturer@fpt.edu.vn", "Thầy Giáo A");
        var result = await controller.CreateLecturer(request, CancellationToken.None);

        var objectResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status201Created, objectResult.StatusCode);
        var account = Assert.IsType<AccountResponse>(objectResult.Value);
        Assert.Equal("lecturer@fpt.edu.vn", account.Email);
        Assert.Equal("Thầy Giáo A", account.FullName);
        Assert.Equal("Lecturer", account.Role);
    }
}
