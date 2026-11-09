using Exe.BuildingBlocks.Paging;
using Exe.BuildingBlocks.Persistence;
using Group.Repository.Data;
using Group.Repository.Entities;
using Group.Repository.Enums;
using Group.Repository.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Group.Repository.Implementations;

public class GroupRepository(GroupDbContext db) : IGroupRepository
{
    public Task<PagedResult<GroupEntity>> GetPagedAsync(
        string? search,
        GroupStatus? status,
        string? domain,
        string? major,
        string? sortBy,
        bool descending,
        int page,
        int pageSize,
        CancellationToken ct = default)
    {
        IQueryable<GroupEntity> query = db.Groups
            .Include(g => g.Members)
            .Include(g => g.Slots)
            .AsNoTracking()
            .AsSplitQuery();

        // ── Lọc ──────────────────────────────────────────────────────────────
        if (!string.IsNullOrWhiteSpace(search))
        {
            var keyword = search.Trim().ToLower();
            query = query.Where(g =>
                g.Name.ToLower().Contains(keyword) ||
                (g.Description != null && g.Description.ToLower().Contains(keyword)));
        }

        query = status.HasValue
            ? query.Where(g => g.Status == status.Value)
            : query.Where(g => g.Status != GroupStatus.Disbanded); // mặc định ẩn nhóm đã giải tán

        if (!string.IsNullOrWhiteSpace(domain))
        {
            var d = domain.Trim();
            query = query.Where(g => g.ProjectDomain == d);
        }

        // Nhóm còn vị trí trống cần chuyên ngành này
        if (!string.IsNullOrWhiteSpace(major))
        {
            var m = major.Trim();
            query = query.Where(g => g.Slots.Any(s => s.RequiredMajor == m && s.Filled < s.Quantity));
        }

        // ── Sắp xếp ──────────────────────────────────────────────────────────
        query = sortBy?.ToLowerInvariant() switch
        {
            "name"        => query.OrderBy(g => g.Name, descending),
            "membercount" => query.OrderBy(g => g.Members.Count, descending),
            "maxmembers"  => query.OrderBy(g => g.MaxMembers, descending),
            _             => query.OrderBy(g => g.CreatedAt, descending)
        };

        return query.ToPagedResultAsync(page, pageSize, ct);
    }

    public Task<GroupEntity?> GetByIdAsync(Guid id, CancellationToken ct = default) =>
        db.Groups
            .Include(g => g.Members)
            .Include(g => g.Slots)
            .AsSplitQuery()
            .FirstOrDefaultAsync(g => g.Id == id, ct);

    public Task<GroupEntity?> GetActiveGroupOfUserAsync(Guid userId, Guid? spaceId = null, CancellationToken ct = default) =>
        db.Groups
            .Include(g => g.Members)
            .Include(g => g.Slots)
            .AsSplitQuery()
            .Where(g => g.Status != GroupStatus.Disbanded && g.Members.Any(m => m.UserId == userId))
            .Where(g => spaceId == null || g.SpaceId == spaceId)
            .OrderByDescending(g => g.CreatedAt)
            .FirstOrDefaultAsync(ct);

    public Task<bool> IsUserInActiveGroupAsync(Guid userId, Guid? spaceId, CancellationToken ct = default) =>
        db.GroupMembers.AnyAsync(m =>
            m.UserId == userId && m.Group.Status != GroupStatus.Disbanded && m.Group.SpaceId == spaceId, ct);

    public async Task<HashSet<Guid>> GetUsersInActiveGroupsAsync(IEnumerable<Guid> userIds, Guid? spaceId, CancellationToken ct = default)
    {
        var ids = userIds.Distinct().ToList();
        if (ids.Count == 0) return [];

        var found = await db.GroupMembers
            .Where(m => ids.Contains(m.UserId) && m.Group.Status != GroupStatus.Disbanded && m.Group.SpaceId == spaceId)
            .Select(m => m.UserId)
            .ToListAsync(ct);
        return found.ToHashSet();
    }

    public async Task<IReadOnlyList<GroupEntity>> GetRecruitingAsync(int max, CancellationToken ct = default) =>
        await db.Groups
            .Include(g => g.Members)
            .Include(g => g.Slots)
            .AsNoTracking()
            .AsSplitQuery()
            .Where(g => g.Status == GroupStatus.Recruiting)
            .OrderByDescending(g => g.CreatedAt)
            .Take(max)
            .ToListAsync(ct);

    public void AddSlot(RecruitmentSlot slot) => db.RecruitmentSlots.Add(slot);

    public Task<LeaderElection?> GetActiveElectionAsync(Guid groupId, CancellationToken ct = default) =>
        db.LeaderElections
            .Include(e => e.Votes)
            .Include(e => e.Group)
                .ThenInclude(g => g.Members)
            .FirstOrDefaultAsync(e => e.GroupId == groupId && e.Status == ElectionStatus.Active, ct);

    public Task<LeaderElection?> GetElectionByIdAsync(Guid electionId, CancellationToken ct = default) =>
        db.LeaderElections
            .Include(e => e.Votes)
            .Include(e => e.Group)
                .ThenInclude(g => g.Members)
            .FirstOrDefaultAsync(e => e.Id == electionId, ct);

    public void AddElection(LeaderElection election) => db.LeaderElections.Add(election);

    public void AddElectionVote(ElectionVote vote) => db.ElectionVotes.Add(vote);

    public void AddMemberRemovalLog(MemberRemovalLog log) => db.MemberRemovalLogs.Add(log);
}
