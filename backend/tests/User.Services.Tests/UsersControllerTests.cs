using System.Reflection;
using Exe.BuildingBlocks.Paging;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using User.API.Controllers;
using User.Repository.Enums;
using User.Services.DTOs;
using User.Services.Interfaces;
using Xunit;

namespace User.Services.Tests;

public class UsersControllerTests
{
    private class FakeUserProfileService : IUserProfileService
    {
        public Task<CandidateProfileResponse> GetProfileByIdAsync(Guid userId, CancellationToken ct = default)
        {
            return Task.FromResult(new CandidateProfileResponse(
                userId,
                "Nguyen Van A",
                "Student",
                "Hanoi",
                Major.SE,
                "Developer",
                "Backend Dev",
                UserAvailability.LookingForTeam,
                new List<string> { "EdTech" },
                new List<UserSkillResponse>(),
                DateTime.UtcNow,
                DateTime.UtcNow
            ));
        }

        public Task<UserProfileResponse> GetCurrentUserProfileAsync(CancellationToken ct = default)
        {
            return Task.FromResult(new UserProfileResponse(
                Guid.Parse("11111111-1111-1111-1111-111111111111"),
                "user@fpt.edu.vn",
                "Nguyen Van A",
                "Student",
                "SE123456",
                "Hanoi",
                Major.SE,
                "Developer",
                "Backend Dev",
                UserAvailability.LookingForTeam,
                new List<string> { "EdTech" },
                new List<UserSkillResponse>(),
                DateTime.UtcNow,
                DateTime.UtcNow
            ));
        }

        public Task<UserProfileResponse> UpdateCurrentUserProfileAsync(UpdateUserProfileRequest request, CancellationToken ct = default)
        {
            return Task.FromResult(new UserProfileResponse(
                Guid.Parse("11111111-1111-1111-1111-111111111111"),
                "user@fpt.edu.vn",
                request.FullName,
                "Student",
                request.StudentCode,
                request.Campus,
                request.Major,
                request.Bio,
                request.DesiredRole,
                request.Availability,
                request.Interests ?? new List<string>(),
                new List<UserSkillResponse>(),
                DateTime.UtcNow,
                DateTime.UtcNow
            ));
        }

        public Task<UserProfileResponse> UpdateUserProfileAsync(Guid userId, UpdateUserProfileRequest request, CancellationToken ct = default)
        {
            return UpdateCurrentUserProfileAsync(request, ct);
        }

        public Task<PagedResult<CandidateProfileResponse>> SearchProfilesAsync(UserSearchFilter filter, CancellationToken ct = default)
        {
            var item = new CandidateProfileResponse(
                Guid.NewGuid(),
                "Search User",
                "Student",
                "Hanoi",
                Major.SE,
                "Bio",
                "Role",
                UserAvailability.LookingForTeam,
                new List<string>(),
                new List<UserSkillResponse>(),
                DateTime.UtcNow,
                DateTime.UtcNow
            );

            return Task.FromResult(PagedResult<CandidateProfileResponse>.Create(new List<CandidateProfileResponse> { item }, filter.Page, filter.PageSize, 1));
        }

        public Task<IReadOnlyList<CandidateProfileResponse>> GetBatchProfilesAsync(IEnumerable<Guid> userIds, CancellationToken ct = default)
        {
            var list = userIds.Select(id => new CandidateProfileResponse(
                id,
                "Batch User",
                "Student",
                null,
                null,
                null,
                null,
                UserAvailability.LookingForTeam,
                new List<string>(),
                new List<UserSkillResponse>(),
                DateTime.UtcNow,
                DateTime.UtcNow
            )).ToList();

            return Task.FromResult<IReadOnlyList<CandidateProfileResponse>>(list);
        }

        public Task<UserProfileResponse> CreateEmptyProfileAsync(CreateUserProfileInternalRequest request, CancellationToken ct = default)
        {
            return Task.FromResult(new UserProfileResponse(
                request.UserId,
                request.Email,
                request.FullName,
                request.Role,
                null, null, null, null, null,
                UserAvailability.LookingForTeam,
                new List<string>(),
                new List<UserSkillResponse>(),
                DateTime.UtcNow,
                DateTime.UtcNow
            ));
        }
    }

    [Fact]
    public void Controller_HasAuthorizeAttribute()
    {
        // Yêu cầu xác thực JWT trên tất cả endpoint của UsersController
        var attr = typeof(UsersController).GetCustomAttribute<AuthorizeAttribute>();
        Assert.NotNull(attr);
    }

    [Fact]
    public void Controller_RoutePrefix_IsApiUsers()
    {
        var attr = typeof(UsersController).GetCustomAttribute<RouteAttribute>();
        Assert.NotNull(attr);
        Assert.Equal("api/users", attr.Template);
    }

    [Fact]
    public async Task GetCurrentUserProfile_Returns200OK_WithProfile()
    {
        var service = new FakeUserProfileService();
        var controller = new UsersController(service);

        var result = await controller.GetCurrentUserProfile(CancellationToken.None);

        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.Equal(StatusCodes.Status200OK, okResult.StatusCode);
        var profile = Assert.IsType<UserProfileResponse>(okResult.Value);
        Assert.Equal("user@fpt.edu.vn", profile.Email);
    }

    [Fact]
    public async Task UpdateCurrentUserProfile_Returns200OK_WithUpdatedProfile()
    {
        var service = new FakeUserProfileService();
        var controller = new UsersController(service);

        var request = new UpdateUserProfileRequest("Nguyen Van Updated", "SE123456", "Hanoi", Major.SE, "Updated bio");
        var result = await controller.UpdateCurrentUserProfile(request, CancellationToken.None);

        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.Equal(StatusCodes.Status200OK, okResult.StatusCode);
        var profile = Assert.IsType<UserProfileResponse>(okResult.Value);
        Assert.Equal("Nguyen Van Updated", profile.FullName);
    }

    [Fact]
    public async Task GetProfileById_Returns200OK_WithProfile()
    {
        var service = new FakeUserProfileService();
        var controller = new UsersController(service);
        var targetId = Guid.NewGuid();

        var result = await controller.GetProfileById(targetId, CancellationToken.None);

        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.Equal(StatusCodes.Status200OK, okResult.StatusCode);
        var profile = Assert.IsType<CandidateProfileResponse>(okResult.Value);
        Assert.Equal(targetId, profile.UserId);
    }

    [Fact]
    public async Task SearchProfiles_Returns200OK_WithPagedResult()
    {
        var service = new FakeUserProfileService();
        var controller = new UsersController(service);

        var filter = new UserSearchFilter("Search", Major.SE, null, UserAvailability.LookingForTeam, "FullName", "asc", 1, 10);
        var result = await controller.SearchProfiles(filter, CancellationToken.None);

        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.Equal(StatusCodes.Status200OK, okResult.StatusCode);
        var paged = Assert.IsType<PagedResult<CandidateProfileResponse>>(okResult.Value);
        Assert.Single(paged.Items);
    }

    [Fact]
    public async Task GetBatchProfiles_Returns200OK_WithListOfProfiles()
    {
        var service = new FakeUserProfileService();
        var controller = new UsersController(service);

        var id1 = Guid.NewGuid();
        var id2 = Guid.NewGuid();
        var request = new BatchUsersRequest(new List<Guid> { id1, id2 });

        var result = await controller.GetBatchProfiles(request, CancellationToken.None);

        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.Equal(StatusCodes.Status200OK, okResult.StatusCode);
        var list = Assert.IsAssignableFrom<IReadOnlyList<CandidateProfileResponse>>(okResult.Value);
        Assert.Equal(2, list.Count);
    }
}
