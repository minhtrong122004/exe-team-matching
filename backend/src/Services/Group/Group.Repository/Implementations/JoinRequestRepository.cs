using Exe.BuildingBlocks.Paging;
using Exe.BuildingBlocks.Persistence;
using Group.Repository.Data;
using Group.Repository.Entities;
using Group.Repository.Enums;
using Group.Repository.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Group.Repository.Implementations;

public class JoinRequestRepository(GroupDbContext db) : IJoinRequestRepository
{
    public Task<JoinRequest?> GetByIdAsync(Guid id, CancellationToken ct = default) =>
        db.JoinRequests
            .Include(r => r.Group).ThenInclude(g => g.Members)
            .Include(r => r.Group).ThenInclude(g => g.Slots)
            .AsSplitQuery()
            .FirstOrDefaultAsync(r => r.Id == id, ct);

    public Task<PagedResult<JoinRequest>> GetPagedByGroupAsync(
        Guid groupId, JoinRequestStatus? status, int page, int pageSize, CancellationToken ct = default) =>
        Filter(db.JoinRequests.Where(r => r.GroupId == groupId), status)
            .ToPagedResultAsync(page, pageSize, ct);

    public Task<PagedResult<JoinRequest>> GetPagedByStudentAsync(
        Guid studentId, JoinRequestStatus? status, int page, int pageSize, CancellationToken ct = default) =>
        Filter(db.JoinRequests.Where(r => r.StudentId == studentId), status)
            .ToPagedResultAsync(page, pageSize, ct);

    public Task<int> CountPendingByStudentAsync(Guid studentId, CancellationToken ct = default) =>
        db.JoinRequests.CountAsync(r => r.StudentId == studentId && r.Status == JoinRequestStatus.Pending, ct);

    public Task<bool> HasPendingAsync(Guid studentId, Guid groupId, CancellationToken ct = default) =>
        db.JoinRequests.AnyAsync(r =>
            r.StudentId == studentId && r.GroupId == groupId && r.Status == JoinRequestStatus.Pending, ct);

    public Task<List<JoinRequest>> GetPendingByStudentAsync(Guid studentId, CancellationToken ct = default) =>
        db.JoinRequests
            .Where(r => r.StudentId == studentId && r.Status == JoinRequestStatus.Pending)
            .ToListAsync(ct);

    public Task<List<JoinRequest>> GetPendingByGroupAsync(Guid groupId, CancellationToken ct = default) =>
        db.JoinRequests
            .Where(r => r.GroupId == groupId && r.Status == JoinRequestStatus.Pending)
            .ToListAsync(ct);

    public void Add(JoinRequest request) => db.JoinRequests.Add(request);

    private static IOrderedQueryable<JoinRequest> Filter(IQueryable<JoinRequest> query, JoinRequestStatus? status)
    {
        query = query.Include(r => r.Group).AsNoTracking();
        if (status.HasValue) query = query.Where(r => r.Status == status.Value);
        return query.OrderByDescending(r => r.CreatedAt);
    }
}
