using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Project.Repository.Enums;
using Project.Services.DTOs;
using Project.Services.Exceptions;
using Project.Services.Interfaces;
using System.Security.Claims;

namespace Project.API.Controllers;

/// <summary>
/// Quản lý ý tưởng dự án EXE.
/// Tất cả route đi qua API Gateway: http://localhost:5000/api/projects
/// </summary>
[ApiController]
[Route("api/projects")]
[Produces("application/json")]
public class ProjectsController : ControllerBase
{
    private readonly IProjectService _projectService;
    private readonly ILogger<ProjectsController> _logger;

    public ProjectsController(IProjectService projectService, ILogger<ProjectsController> logger)
    {
        _projectService = projectService;
        _logger         = logger;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET /api/projects
    // ─────────────────────────────────────────────────────────────────────────

    /// <summary>
    /// Lấy danh sách ý tưởng dự án EXE có phân trang, tìm kiếm và lọc.
    /// Công khai — không yêu cầu đăng nhập.
    /// </summary>
    [HttpGet]
    [AllowAnonymous]
    [ProducesResponseType(typeof(PagedProjectResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetProjects(
        [FromQuery] string?       search   = null,
        [FromQuery] ProjectDomain? domain  = null,
        [FromQuery] ProjectStatus? status  = null,
        [FromQuery] Guid?         ownerId  = null,
        [FromQuery] string        sortBy   = "createdAt",
        [FromQuery] string        sortDir  = "desc",
        [FromQuery] int           page     = 1,
        [FromQuery] int           pageSize = 10,
        CancellationToken ct = default)
    {
        var query = new GetProjectsQuery(search, domain, status, ownerId, sortBy, sortDir, page, pageSize);
        var result = await _projectService.GetProjectsAsync(query, ct);
        return Ok(result);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET /api/projects/{id}
    // ─────────────────────────────────────────────────────────────────────────

    /// <summary>Lấy chi tiết một ý tưởng dự án theo ID.</summary>
    [HttpGet("{id:guid}")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(ProjectResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetProjectById(Guid id, CancellationToken ct = default)
    {
        var result = await _projectService.GetProjectByIdAsync(id, ct);
        return Ok(result);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // POST /api/projects
    // ─────────────────────────────────────────────────────────────────────────

    /// <summary>
    /// Tạo ý tưởng dự án mới.
    /// Yêu cầu đăng nhập — OwnerId lấy từ JWT token.
    /// </summary>
    [HttpPost]
    [Authorize]
    [ProducesResponseType(typeof(ProjectResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> CreateProject(
        [FromBody] CreateProjectRequest request,
        CancellationToken ct = default)
    {
        var currentUserId = GetCurrentUserId();
        var result = await _projectService.CreateProjectAsync(request, currentUserId, ct);

        _logger.LogInformation(
            "Project created: projectId={ProjectId}, ownerId={OwnerId}, title={Title}",
            result.Id, result.OwnerId, result.Title);

        // 201 Created + header Location trỏ đến tài nguyên mới tạo
        return CreatedAtAction(nameof(GetProjectById), new { id = result.Id }, result);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PUT /api/projects/{id}
    // ─────────────────────────────────────────────────────────────────────────

    /// <summary>
    /// Cập nhật thông tin ý tưởng dự án.
    /// Yêu cầu đăng nhập và phải là chủ dự án.
    /// </summary>
    [HttpPut("{id:guid}")]
    [Authorize]
    [ProducesResponseType(typeof(ProjectResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateProject(
        Guid id,
        [FromBody] UpdateProjectRequest request,
        CancellationToken ct = default)
    {
        var currentUserId = GetCurrentUserId();
        var result = await _projectService.UpdateProjectAsync(id, request, currentUserId, ct);

        _logger.LogInformation(
            "Project updated: projectId={ProjectId}, updatedBy={UserId}",
            id, currentUserId);

        return Ok(result);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // DELETE /api/projects/{id}
    // ─────────────────────────────────────────────────────────────────────────

    /// <summary>
    /// Xóa ý tưởng dự án.
    /// Yêu cầu đăng nhập và phải là chủ dự án.
    /// </summary>
    [HttpDelete("{id:guid}")]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteProject(Guid id, CancellationToken ct = default)
    {
        var currentUserId = GetCurrentUserId();
        await _projectService.DeleteProjectAsync(id, currentUserId, ct);

        _logger.LogInformation(
            "Project deleted: projectId={ProjectId}, deletedBy={UserId}",
            id, currentUserId);

        return NoContent();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Private helpers
    // ─────────────────────────────────────────────────────────────────────────

    /// <summary>Lấy UserId của người dùng đang đăng nhập từ JWT claim 'sub'.</summary>
    private Guid GetCurrentUserId()
    {
        var sub = User.FindFirstValue(ClaimTypes.NameIdentifier)
               ?? User.FindFirstValue("sub");

        if (Guid.TryParse(sub, out var userId))
            return userId;

        throw new UnauthorizedAccessException("Invalid or missing user identity in token.");
    }
}
