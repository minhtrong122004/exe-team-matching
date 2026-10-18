using Exe.BuildingBlocks.Paging;
using Exe.BuildingBlocks.Web;
using FluentValidation;
using Project.Repository.Entities;
using Project.Repository.Interfaces;
using Project.Services.DTOs;
using Project.Services.Interfaces;

namespace Project.Services.Implementations;

/// <summary>
/// Triển khai nghiệp vụ Project Service.
/// Chỉ phụ thuộc vào IProjectRepository (không biết DbContext, không biết HTTP).
/// </summary>
public class ProjectService : IProjectService
{
    private readonly IProjectRepository _projectRepository;
    private readonly ICurrentUser _currentUser;
    private readonly IValidator<CreateProjectRequest> _createValidator;
    private readonly IValidator<UpdateProjectRequest> _updateValidator;

    public ProjectService(
        IProjectRepository projectRepository,
        ICurrentUser currentUser,
        IValidator<CreateProjectRequest> createValidator,
        IValidator<UpdateProjectRequest> updateValidator)
    {
        _projectRepository = projectRepository;
        _currentUser       = currentUser;
        _createValidator   = createValidator;
        _updateValidator   = updateValidator;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Query
    // ─────────────────────────────────────────────────────────────────────────

    public async Task<PagedResult<ProjectSummaryResponse>> GetProjectsAsync(
        ProjectQuery query,
        CancellationToken ct = default)
    {
        var page = await _projectRepository.GetPagedAsync(
            search:     query.Search,
            domain:     query.Domain,
            status:     query.Status,
            ownerId:    query.OwnerId,
            sortBy:     query.SortBy,
            descending: query.IsDescending,
            page:       query.NormalizedPage,      // tối thiểu 1
            pageSize:   query.NormalizedPageSize,  // 1–50 (CLAUDE.md mục 10)
            ct:         ct);

        return page.Map(MapToSummary);
    }

    public async Task<ProjectResponse> GetProjectByIdAsync(Guid id, CancellationToken ct = default)
    {
        var project = await _projectRepository.GetByIdAsync(id, ct)
            ?? throw new NotFoundException("Project", id);

        return MapToResponse(project);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Command
    // ─────────────────────────────────────────────────────────────────────────

    public async Task<ProjectResponse> CreateProjectAsync(
        CreateProjectRequest request,
        CancellationToken ct = default)
    {
        await _createValidator.ValidateAndThrowAsync(request, ct);

        var now = DateTime.UtcNow;
        var project = new ProjectEntity
        {
            Id        = Guid.NewGuid(),
            OwnerId   = _currentUser.UserId,
            Title     = request.Title.Trim(),
            Problem   = request.Problem.Trim(),
            Solution  = request.Solution.Trim(),
            Domain    = request.Domain,
            Status    = Repository.Enums.ProjectStatus.Draft, // mặc định Draft khi tạo mới
            CreatedAt = now,
            UpdatedAt = now
        };
        SyncTags(project, request.Tags);

        await _projectRepository.AddAsync(project, ct);

        return MapToResponse(project);
    }

    public async Task<ProjectResponse> UpdateProjectAsync(
        Guid id,
        UpdateProjectRequest request,
        CancellationToken ct = default)
    {
        await _updateValidator.ValidateAndThrowAsync(request, ct);

        var project = await _projectRepository.GetByIdAsync(id, ct)
            ?? throw new NotFoundException("Project", id);

        // ── Kiểm tra quyền sở hữu ────────────────────────────────────────────
        if (project.OwnerId != _currentUser.UserId)
            throw new ForbiddenException("Chỉ chủ dự án mới được chỉnh sửa ý tưởng này.");

        // ── Cập nhật thông tin ────────────────────────────────────────────────
        project.Title     = request.Title.Trim();
        project.Problem   = request.Problem.Trim();
        project.Solution  = request.Solution.Trim();
        project.Domain    = request.Domain;
        project.Status    = request.Status;
        project.UpdatedAt = DateTime.UtcNow;
        SyncTags(project, request.Tags);

        await _projectRepository.UpdateAsync(project, ct);

        return MapToResponse(project);
    }

    public async Task DeleteProjectAsync(Guid id, CancellationToken ct = default)
    {
        var project = await _projectRepository.GetByIdAsync(id, ct)
            ?? throw new NotFoundException("Project", id);

        // ── Kiểm tra quyền sở hữu ────────────────────────────────────────────
        if (project.OwnerId != _currentUser.UserId)
            throw new ForbiddenException("Chỉ chủ dự án mới được xóa ý tưởng này.");

        await _projectRepository.DeleteAsync(project, ct);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Private helpers — Map Entity → DTO (không dùng AutoMapper)
    // ─────────────────────────────────────────────────────────────────────────

    private static ProjectResponse MapToResponse(ProjectEntity p) => new(
        Id:        p.Id,
        OwnerId:   p.OwnerId,
        Title:     p.Title,
        Problem:   p.Problem,
        Solution:  p.Solution,
        Domain:    p.Domain.ToString(),
        Status:    p.Status.ToString(),
        Tags:      p.Tags.Select(t => t.Tag).ToList(),
        CreatedAt: p.CreatedAt,
        UpdatedAt: p.UpdatedAt);

    private static ProjectSummaryResponse MapToSummary(ProjectEntity p) => new(
        Id:        p.Id,
        OwnerId:   p.OwnerId,
        Title:     p.Title,
        Domain:    p.Domain.ToString(),
        Status:    p.Status.ToString(),
        Tags:      p.Tags.Select(t => t.Tag).ToList(),
        CreatedAt: p.CreatedAt);

    /// <summary>
    /// Đồng bộ tag của dự án với danh sách từ request: xóa tag không còn, thêm tag mới, giữ nguyên tag trùng.
    /// (Không gán lại cả collection, tránh EF Core bị trùng khóa (ProjectId, Tag) với tag cũ.)
    /// </summary>
    private static void SyncTags(ProjectEntity project, List<string>? tags)
    {
        var desired = (tags ?? [])
            .Where(t => !string.IsNullOrWhiteSpace(t))
            .Select(t => t.Trim().ToLowerInvariant())
            .ToHashSet();

        foreach (var removed in project.Tags.Where(t => !desired.Contains(t.Tag)).ToList())
            project.Tags.Remove(removed);

        var existing = project.Tags.Select(t => t.Tag).ToHashSet();
        foreach (var tag in desired.Where(t => !existing.Contains(t)))
            project.Tags.Add(new ProjectTag { ProjectId = project.Id, Tag = tag });
    }
}
