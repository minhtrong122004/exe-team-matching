using Exe.BuildingBlocks.Paging;
using Exe.BuildingBlocks.Persistence;
using Group.Repository.Data;
using Group.Repository.Entities;
using Group.Repository.Enums;
using Group.Repository.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Group.Repository.Implementations;

public class InvitationRepository(GroupDbContext db) : IInvitationRepository
{
    public Task<Invitation?> GetByIdAsync(Guid id, CancellationToken ct = default) =>
        db.Invitations
            .Include(i => i.Group).ThenInclude(g => g.Members)
            .Include(i => i.Group).ThenInclude(g => g.Slots)
            .AsSplitQuery()
            .FirstOrDefaultAsync(i => i.Id == id, ct);

    public Task<PagedResult<Invitation>> GetPagedByStudentAsync(
        Guid studentId, InvitationStatus? status, int page, int pageSize, CancellationToken ct = default)
    {
        var query = db.Invitations
            .Include(i => i.Group)
            .AsNoTracking()
            .Where(i => i.StudentId == studentId);

        if (status.HasValue) query = query.Where(i => i.Status == status.Value);

        return query.OrderByDescending(i => i.CreatedAt).ToPagedResultAsync(page, pageSize, ct);
    }

    public Task<bool> HasPendingAsync(Guid studentId, Guid groupId, CancellationToken ct = default) =>
        db.Invitations.AnyAsync(i =>
            i.StudentId == studentId && i.GroupId == groupId && i.Status == InvitationStatus.Pending, ct);

    public Task<List<Invitation>> GetPendingByStudentAsync(Guid studentId, CancellationToken ct = default) =>
        db.Invitations
            .Where(i => i.StudentId == studentId && i.Status == InvitationStatus.Pending)
            .ToListAsync(ct);

    public Task<List<Invitation>> GetPendingByGroupAsync(Guid groupId, CancellationToken ct = default) =>
        db.Invitations
            .Where(i => i.GroupId == groupId && i.Status == InvitationStatus.Pending)
            .ToListAsync(ct);

    public Task<int> ExpireOverdueAsync(DateTime now, CancellationToken ct = default) =>
        db.Invitations
            .Where(i => i.Status == InvitationStatus.Pending && i.ExpiresAt <= now)
            .ExecuteUpdateAsync(s => s
                .SetProperty(i => i.Status, InvitationStatus.Expired)
                .SetProperty(i => i.RespondedAt, now), ct);

    public void Add(Invitation invitation) => db.Invitations.Add(invitation);
}
