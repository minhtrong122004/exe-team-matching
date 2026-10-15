using Exe.BuildingBlocks.Paging;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Project.Services.DTOs;
using Project.Services.Interfaces;

namespace Project.API.Controllers;

/// <summary>
/// Quản lý ý tưởng dự án EXE.
/// Tất cả route đi qua API Gateway: http://localhost:5000/api/projects
/// Lỗi (400/401/403/404) trả về ProblemDetails do GlobalExceptionHandler (BuildingBlocks) xử lý.
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
    /// Lấy danh sách ý tưởng dự án EXE có phân trang, tìm kiếm, lọc và sắp xếp.
    /// sortBy: title | domain | status | updatedAt | createdAt (mặc định, sortDir=desc).
    /// </summary>
    [HttpGet]
    [AllowAnonymous]
    [ProducesResponseType<PagedResult<ProjectSummaryResponse>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResult<ProjectSummaryResponse>>> GetProjects(
        [FromQuery] ProjectQuery query,
        CancellationToken ct = default)
    {
        return Ok(await _projectService.GetProjectsAsync(query, ct));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET /api/projects/{id}
    // ─────────────────────────────────────────────────────────────────────────

    /// <summary>Lấy chi tiết một ý tưởng dự án theo ID.</summary>
    [HttpGet("{id:guid}")]
    [AllowAnonymous]
    [ProducesResponseType<ProjectResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ProjectResponse>> GetProjectById(Guid id, CancellationToken ct = default)
    {
        return Ok(await _projectService.GetProjectByIdAsync(id, ct));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // POST /api/projects
    // ─────────────────────────────────────────────────────────────────────────

    /// <summary>
    /// Tạo ý tưởng dự án mới.
    /// Yêu cầu đăng nhập — OwnerId lấy từ JWT token.
    /// </summary>
    [HttpPost]
    [ProducesResponseType<ProjectResponse>(StatusCodes.Status201Created)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<ProjectResponse>> CreateProject(
        [FromBody] CreateProjectRequest request,
        CancellationToken ct = default)
    {
        var result = await _projectService.CreateProjectAsync(request, ct);

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
    [ProducesResponseType<ProjectResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ProjectResponse>> UpdateProject(
        Guid id,
        [FromBody] UpdateProjectRequest request,
        CancellationToken ct = default)
    {
        var result = await _projectService.UpdateProjectAsync(id, request, ct);

        _logger.LogInformation("Project updated: projectId={ProjectId}", id);

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
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteProject(Guid id, CancellationToken ct = default)
    {
        await _projectService.DeleteProjectAsync(id, ct);

        _logger.LogInformation("Project deleted: projectId={ProjectId}", id);

        return NoContent();
    }
}
