using Project.Repository.Entities;
using Project.Repository.Interfaces;
using Project.Services.DTOs;
using Project.Services.Exceptions;
using Project.Services.Interfaces;

namespace Project.Services.Implementations;

/// <summary>
/// Triển khai nghiệp vụ Project Service.
/// Chỉ phụ thuộc vào IProjectRepository (không biết DbContext, không biết HTTP).
/// </summary>
public class ProjectService : IProjectService
{
    private readonly IProjectRepository _projectRepository;

    public ProjectService(IProjectRepository projectRepository)
    {
        _projectRepository = projectRepository;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Query
    // ─────────────────────────────────────────────────────────────────────────

    public async Task<PagedProjectResponse> GetProjectsAsync(
        GetProjectsQuery query,
        CancellationToken ct = default)
    {
        var ascending = query.SortDir.Equals("asc", StringComparison.OrdinalIgnoreCase);
        var pageSize  = Math.Min(query.PageSize, 50); // tối đa 50 theo CLAUDE.md mục 10

        var (items, totalCount) = await _projectRepository.GetPagedAsync(
            search:    query.Search,
            domain:    query.Domain,
            status:    query.Status,
            ownerId:   query.OwnerId,
            sortBy:    query.SortBy,
            ascending: ascending,
            page:      query.Page,
            pageSize:  pageSize,
            ct:        ct);

        var summaries = items.Select(MapToSummary);

        return new PagedProjectResponse(
            Items:      summaries,
            Page:       query.Page,
            PageSize:   pageSize,
            TotalCount: totalCount,
            TotalPages: (int)Math.Ceiling(totalCount / (double)pageSize));
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
        Guid currentUserId,
        CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;

        var project = new ProjectEntity
        {
            Id        = Guid.NewGuid(),
            OwnerId   = currentUserId,
            Title     = request.Title.Trim(),
            Problem   = request.Problem.Trim(),
            Solution  = request.Solution.Trim(),
            Domain    = request.Domain,
            Status    = Repository.Enums.ProjectStatus.Draft, // mặc định Draft khi tạo mới
            CreatedAt = now,
            UpdatedAt = now,
            Tags      = BuildTags(request.Tags)
        };

        await _projectRepository.AddAsync(project, ct);

        return MapToResponse(project);
    }

    public async Task<ProjectResponse> UpdateProjectAsync(
        Guid id,
        UpdateProjectRequest request,
        Guid currentUserId,
        CancellationToken ct = default)
    {
        var project = await _projectRepository.GetByIdAsync(id, ct)
            ?? throw new NotFoundException("Project", id);

        // ── Kiểm tra quyền sở hữu ────────────────────────────────────────────
        if (project.OwnerId != currentUserId)
            throw new ForbiddenException("Chỉ chủ dự án mới được chỉnh sửa ý tưởng này.");

        // ── Cập nhật thông tin ────────────────────────────────────────────────
        project.Title     = request.Title.Trim();
        project.Problem   = request.Problem.Trim();
        project.Solution  = request.Solution.Trim();
        project.Domain    = request.Domain;
        project.Status    = request.Status;
        project.UpdatedAt = DateTime.UtcNow;

        // Thay thế toàn bộ danh sách tag (xóa cũ, thêm mới)
        project.Tags = BuildTags(request.Tags);

        await _projectRepository.UpdateAsync(project, ct);

        return MapToResponse(project);
    }

    public async Task DeleteProjectAsync(Guid id, Guid currentUserId, CancellationToken ct = default)
    {
        var project = await _projectRepository.GetByIdAsync(id, ct)
            ?? throw new NotFoundException("Project", id);

        // ── Kiểm tra quyền sở hữu ────────────────────────────────────────────
        if (project.OwnerId != currentUserId)
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

    /// <summary>Chuyển danh sách chuỗi tag từ request thành entity ProjectTag.</summary>
    private static ICollection<ProjectTag> BuildTags(List<string>? tags)
    {
        if (tags == null || tags.Count == 0)
            return new List<ProjectTag>();

        return tags
            .Where(t => !string.IsNullOrWhiteSpace(t))
            .Select(t => new ProjectTag { Tag = t.Trim().ToLowerInvariant() })
            .DistinctBy(t => t.Tag) // loại trùng
            .ToList();
    }
}
