using Exe.BuildingBlocks.Paging;
using Exe.BuildingBlocks.Persistence;
using Microsoft.EntityFrameworkCore;
using Report.Repository.Data;
using Report.Repository.Entities;
using Report.Repository.Enums;
using Report.Repository.Interfaces;

namespace Report.Repository.Implementations;

public class GroupStatRepository : IGroupStatRepository
{
    private readonly ReportDbContext _db;

    public GroupStatRepository(ReportDbContext db)
    {
        _db = db;
    }

    public Task<GroupStat?> GetByGroupIdAsync(Guid groupId, CancellationToken ct = default) =>
        _db.GroupStats.FirstOrDefaultAsync(x => x.GroupId == groupId, ct);

    public async Task<IReadOnlyList<GroupStat>> GetAllAsync(CancellationToken ct = default) =>
        await _db.GroupStats.AsNoTracking().OrderBy(x => x.Name).ToListAsync(ct);

    public Task<PagedResult<GroupStat>> GetPagedAsync(
        GroupStatStatus? status,
        int page,
        int pageSize,
        CancellationToken ct = default)
    {
        var query = _db.GroupStats.AsNoTracking();

        if (status.HasValue)
        {
            query = query.Where(x => x.Status == status.Value);
        }

        return query
            .OrderByDescending(x => x.UpdatedAt)
            .ToPagedResultAsync(page, pageSize, ct);
    }

    public async Task AddAsync(GroupStat stat, CancellationToken ct = default) =>
        await _db.GroupStats.AddAsync(stat, ct);

    public void Update(GroupStat stat) =>
        _db.GroupStats.Update(stat);
}
