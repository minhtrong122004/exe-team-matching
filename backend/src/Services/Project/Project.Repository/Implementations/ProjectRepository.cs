using Exe.BuildingBlocks.Paging;
using Exe.BuildingBlocks.Persistence;
using Microsoft.EntityFrameworkCore;
using Project.Repository.Data;
using Project.Repository.Entities;
using Project.Repository.Enums;
using Project.Repository.Interfaces;

namespace Project.Repository.Implementations;

/// <summary>
/// Triển khai cụ thể của IProjectRepository, làm việc trực tiếp với ProjectDbContext.
/// Chỉ nên chứa các câu lệnh LINQ / SQL thuần tuý, không có business rule.
/// </summary>
public class ProjectRepository : IProjectRepository
{
    private readonly ProjectDbContext _db;

    public ProjectRepository(ProjectDbContext db)
    {
        _db = db;
    }

    public Task<PagedResult<ProjectEntity>> GetPagedAsync(
        string? search,
        ProjectDomain? domain,
        ProjectStatus? status,
        Guid? ownerId,
        string? sortBy,
        bool descending,
        int page,
        int pageSize,
        CancellationToken ct = default)
    {
        // Bắt đầu với query bao gồm Tags (eager loading)
        var query = _db.Projects
            .Include(p => p.Tags)
            .AsNoTracking()
            .AsQueryable();

        // ── Lọc (Filter) ────────────────────────────────────────────────────
        if (!string.IsNullOrWhiteSpace(search))
        {
            var keyword = search.Trim().ToLower();
            query = query.Where(p =>
                p.Title.ToLower().Contains(keyword) ||
                p.Problem.ToLower().Contains(keyword));
        }

        if (domain.HasValue)
            query = query.Where(p => p.Domain == domain.Value);

        if (status.HasValue)
            query = query.Where(p => p.Status == status.Value);

        if (ownerId.HasValue)
            query = query.Where(p => p.OwnerId == ownerId.Value);

        // ── Sắp xếp (Sort) ──────────────────────────────────────────────────
        query = sortBy?.ToLowerInvariant() switch
        {
            "title"     => query.OrderBy(p => p.Title, descending),
            "domain"    => query.OrderBy(p => p.Domain, descending),
            "status"    => query.OrderBy(p => p.Status, descending),
            "updatedat" => query.OrderBy(p => p.UpdatedAt, descending),
            _           => query.OrderBy(p => p.CreatedAt, descending)
        };

        // ── Đếm tổng + phân trang (BuildingBlocks) ──────────────────────────
        return query.ToPagedResultAsync(page, pageSize, ct);
    }

    public async Task<ProjectEntity?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        return await _db.Projects
            .Include(p => p.Tags)
            .FirstOrDefaultAsync(p => p.Id == id, ct);
    }

    public async Task AddAsync(ProjectEntity project, CancellationToken ct = default)
    {
        await _db.Projects.AddAsync(project, ct);
        await _db.SaveChangesAsync(ct);
    }

    public async Task UpdateAsync(ProjectEntity project, CancellationToken ct = default)
    {
        // Entity đã được track từ GetByIdAsync → EF tự phát hiện thay đổi (kể cả tag thêm/xóa).
        // Không gọi _db.Projects.Update(): nó đánh dấu tag mới là Modified (UPDATE) thay vì Added (INSERT).
        await _db.SaveChangesAsync(ct);
    }

    public async Task DeleteAsync(ProjectEntity project, CancellationToken ct = default)
    {
        _db.Projects.Remove(project);
        await _db.SaveChangesAsync(ct);
    }
}
