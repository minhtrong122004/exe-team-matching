using System.Reflection;
using Exe.BuildingBlocks.Exceptions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using User.API.Controllers;
using User.Repository.Enums;
using User.Services.DTOs;
using User.Services.Interfaces;
using User.Services.Tests.TestDoubles;
using Xunit;

namespace User.Services.Tests;

public class SkillsControllerTests
{
    private class FakeSkillService : ISkillService
    {
        public Task<IReadOnlyList<SkillResponse>> GetAllSkillsAsync(CancellationToken ct = default)
        {
            var list = new List<SkillResponse>
            {
                new(Guid.NewGuid(), "C#", SkillCategory.Technical, "Language", DateTime.UtcNow),
                new(Guid.NewGuid(), "React", SkillCategory.Technical, "Framework", DateTime.UtcNow)
            };
            return Task.FromResult<IReadOnlyList<SkillResponse>>(list);
        }

        public Task<IReadOnlyList<SkillResponse>> GetSkillsByCategoryAsync(SkillCategory category, CancellationToken ct = default)
        {
            var list = new List<SkillResponse>
            {
                new(Guid.NewGuid(), "C#", category, "Language", DateTime.UtcNow)
            };
            return Task.FromResult<IReadOnlyList<SkillResponse>>(list);
        }

        public Task<SkillResponse> GetSkillByIdAsync(Guid id, CancellationToken ct = default)
        {
            return Task.FromResult(new SkillResponse(id, "C#", SkillCategory.Technical, "Language", DateTime.UtcNow));
        }

        public Task<SkillResponse> CreateSkillAsync(CreateSkillRequest request, CancellationToken ct = default)
        {
            return Task.FromResult(new SkillResponse(Guid.NewGuid(), request.Name, request.Category, request.Description, DateTime.UtcNow));
        }

        public Task<IReadOnlyList<UserSkillResponse>> GetUserSkillsAsync(Guid userId, CancellationToken ct = default)
        {
            var list = new List<UserSkillResponse>
            {
                new(Guid.NewGuid(), "C#", SkillCategory.Technical, 4, DateTime.UtcNow)
            };
            return Task.FromResult<IReadOnlyList<UserSkillResponse>>(list);
        }

        public Task<UserSkillResponse> AddSkillToUserAsync(Guid userId, AddUserSkillRequest request, CancellationToken ct = default)
        {
            return Task.FromResult(new UserSkillResponse(request.SkillId, "C#", SkillCategory.Technical, request.Level, DateTime.UtcNow));
        }

        public Task<UserSkillResponse> UpdateUserSkillProficiencyAsync(Guid userId, Guid skillId, UpdateUserSkillProficiencyRequest request, CancellationToken ct = default)
        {
            return Task.FromResult(new UserSkillResponse(skillId, "C#", SkillCategory.Technical, request.Level, DateTime.UtcNow));
        }

        public Task RemoveSkillFromUserAsync(Guid userId, Guid skillId, CancellationToken ct = default)
        {
            return Task.CompletedTask;
        }

        public Task<IReadOnlyList<UserSkillResponse>> SetUserSkillsAsync(Guid userId, BatchSetUserSkillsRequest request, CancellationToken ct = default)
        {
            var list = request.Skills.Select(s => new UserSkillResponse(
                s.SkillId,
                "SkillName",
                SkillCategory.Technical,
                s.Level,
                DateTime.UtcNow
            )).ToList();

            return Task.FromResult<IReadOnlyList<UserSkillResponse>>(list);
        }
    }

    [Fact]
    public void Controller_HasAuthorizeAttribute()
    {
        var attr = typeof(SkillsController).GetCustomAttribute<AuthorizeAttribute>();
        Assert.NotNull(attr);
    }

    [Fact]
    public void CreateSkill_HasAdminOnlyAuthorizeAttribute()
    {
        // Decision 1: POST /skills chỉ dành cho Admin
        var method = typeof(SkillsController).GetMethod(nameof(SkillsController.CreateSkill));
        Assert.NotNull(method);
        var authAttr = method.GetCustomAttribute<AuthorizeAttribute>();
        Assert.NotNull(authAttr);
        Assert.Equal("Admin", authAttr.Roles);
    }

    [Fact]
    public void GetSkills_DoesNotRequireAdminRole()
    {
        // GET /skills cho phép mọi user đã authenticated
        var method = typeof(SkillsController).GetMethod(nameof(SkillsController.GetSkills));
        Assert.NotNull(method);
        var authAttr = method.GetCustomAttribute<AuthorizeAttribute>();
        // Không có override riêng cho Role -> dùng [Authorize] chung của controller
        Assert.Null(authAttr?.Roles);
    }

    [Fact]
    public async Task GetSkills_WithoutCategory_CallsGetAllSkills()
    {
        var service = new FakeSkillService();
        var currentUser = new FakeCurrentUser { UserId = Guid.NewGuid(), Role = "Student" };
        var controller = new SkillsController(service, currentUser);

        var result = await controller.GetSkills(null, CancellationToken.None);

        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.Equal(StatusCodes.Status200OK, okResult.StatusCode);
        var list = Assert.IsAssignableFrom<IReadOnlyList<SkillResponse>>(okResult.Value);
        Assert.Equal(2, list.Count);
    }

    [Fact]
    public async Task GetSkills_WithCategory_CallsGetByCategory()
    {
        var service = new FakeSkillService();
        var currentUser = new FakeCurrentUser { UserId = Guid.NewGuid(), Role = "Student" };
        var controller = new SkillsController(service, currentUser);

        var result = await controller.GetSkills(SkillCategory.Technical, CancellationToken.None);

        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.Equal(StatusCodes.Status200OK, okResult.StatusCode);
        var list = Assert.IsAssignableFrom<IReadOnlyList<SkillResponse>>(okResult.Value);
        Assert.Single(list);
    }

    [Fact]
    public async Task CreateSkill_Returns201Created_WithLocation()
    {
        var service = new FakeSkillService();
        var currentUser = new FakeCurrentUser { UserId = Guid.NewGuid(), Role = "Admin" };
        var controller = new SkillsController(service, currentUser);

        var request = new CreateSkillRequest("Docker", SkillCategory.Technical, "Containerization tool");
        var result = await controller.CreateSkill(request, CancellationToken.None);

        var createdResult = Assert.IsType<CreatedAtActionResult>(result);
        Assert.Equal(StatusCodes.Status201Created, createdResult.StatusCode);
        var skill = Assert.IsType<SkillResponse>(createdResult.Value);
        Assert.Equal("Docker", skill.Name);
    }

    [Fact]
    public async Task GetSkillById_Returns200OK()
    {
        var service = new FakeSkillService();
        var currentUser = new FakeCurrentUser { UserId = Guid.NewGuid() };
        var controller = new SkillsController(service, currentUser);
        var skillId = Guid.NewGuid();

        var result = await controller.GetSkillById(skillId, CancellationToken.None);

        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.Equal(StatusCodes.Status200OK, okResult.StatusCode);
        var skill = Assert.IsType<SkillResponse>(okResult.Value);
        Assert.Equal(skillId, skill.Id);
    }

    [Fact]
    public async Task GetCurrentUserSkills_WhenAuthenticated_Returns200OK()
    {
        var service = new FakeSkillService();
        var userId = Guid.NewGuid();
        var currentUser = new FakeCurrentUser { UserId = userId, Role = "Student" };
        var controller = new SkillsController(service, currentUser);

        var result = await controller.GetCurrentUserSkills(CancellationToken.None);

        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.Equal(StatusCodes.Status200OK, okResult.StatusCode);
        var skills = Assert.IsAssignableFrom<IReadOnlyList<UserSkillResponse>>(okResult.Value);
        Assert.Single(skills);
    }

    [Fact]
    public async Task GetCurrentUserSkills_WhenUnauthenticated_ThrowsUnauthorizedException()
    {
        var service = new FakeSkillService();
        var currentUser = new FakeCurrentUser { UserId = null };
        var controller = new SkillsController(service, currentUser);

        await Assert.ThrowsAsync<UnauthorizedException>(() => controller.GetCurrentUserSkills(CancellationToken.None));
    }

    [Fact]
    public async Task SetCurrentUserSkills_WhenAuthenticated_Returns200OK()
    {
        var service = new FakeSkillService();
        var userId = Guid.NewGuid();
        var currentUser = new FakeCurrentUser { UserId = userId, Role = "Student" };
        var controller = new SkillsController(service, currentUser);

        var request = new BatchSetUserSkillsRequest(new List<UserSkillItemRequest>
        {
            new(Guid.NewGuid(), 4),
            new(Guid.NewGuid(), 5)
        });

        var result = await controller.SetCurrentUserSkills(request, CancellationToken.None);

        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.Equal(StatusCodes.Status200OK, okResult.StatusCode);
        var skills = Assert.IsAssignableFrom<IReadOnlyList<UserSkillResponse>>(okResult.Value);
        Assert.Equal(2, skills.Count);
    }

    [Fact]
    public async Task SetCurrentUserSkills_WhenUnauthenticated_ThrowsUnauthorizedException()
    {
        var service = new FakeSkillService();
        var currentUser = new FakeCurrentUser { UserId = null };
        var controller = new SkillsController(service, currentUser);

        var request = new BatchSetUserSkillsRequest(new List<UserSkillItemRequest>());
        await Assert.ThrowsAsync<UnauthorizedException>(() => controller.SetCurrentUserSkills(request, CancellationToken.None));
    }

    [Fact]
    public async Task UpdateUserSkillProficiency_WhenAuthenticated_Returns200OK()
    {
        var service = new FakeSkillService();
        var userId = Guid.NewGuid();
        var skillId = Guid.NewGuid();
        var currentUser = new FakeCurrentUser { UserId = userId, Role = "Student" };
        var controller = new SkillsController(service, currentUser);

        var request = new UpdateUserSkillProficiencyRequest(5);
        var result = await controller.UpdateUserSkillProficiency(skillId, request, CancellationToken.None);

        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.Equal(StatusCodes.Status200OK, okResult.StatusCode);
        var userSkill = Assert.IsType<UserSkillResponse>(okResult.Value);
        Assert.Equal(5, userSkill.Level);
    }

    [Fact]
    public async Task UpdateUserSkillProficiency_WhenUnauthenticated_ThrowsUnauthorizedException()
    {
        var service = new FakeSkillService();
        var currentUser = new FakeCurrentUser { UserId = null };
        var controller = new SkillsController(service, currentUser);

        var request = new UpdateUserSkillProficiencyRequest(3);
        await Assert.ThrowsAsync<UnauthorizedException>(() => controller.UpdateUserSkillProficiency(Guid.NewGuid(), request, CancellationToken.None));
    }

    [Fact]
    public async Task RemoveSkillFromUser_WhenAuthenticated_Returns204NoContent()
    {
        var service = new FakeSkillService();
        var userId = Guid.NewGuid();
        var skillId = Guid.NewGuid();
        var currentUser = new FakeCurrentUser { UserId = userId, Role = "Student" };
        var controller = new SkillsController(service, currentUser);

        var result = await controller.RemoveSkillFromUser(skillId, CancellationToken.None);

        var noContentResult = Assert.IsType<NoContentResult>(result);
        Assert.Equal(StatusCodes.Status204NoContent, noContentResult.StatusCode);
    }

    [Fact]
    public async Task RemoveSkillFromUser_WhenUnauthenticated_ThrowsUnauthorizedException()
    {
        var service = new FakeSkillService();
        var currentUser = new FakeCurrentUser { UserId = null };
        var controller = new SkillsController(service, currentUser);

        await Assert.ThrowsAsync<UnauthorizedException>(() => controller.RemoveSkillFromUser(Guid.NewGuid(), CancellationToken.None));
    }
}
