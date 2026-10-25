using Exe.BuildingBlocks.Paging;
using Exe.BuildingBlocks.Persistence;
using Microsoft.EntityFrameworkCore;
using Report.Repository.Data;
using Report.Repository.Entities;
using Report.Repository.Interfaces;

namespace Report.Repository.Implementations;

public class ReportSnapshotRepository : IReportSnapshotRepository
{
    private readonly ReportDbContext _db;

    public ReportSnapshotRepository(ReportDbContext db)
    {
        _db = db;
    }

    public Task<PagedResult<ReportSnapshot>> GetPagedAsync(
        DateTime? from,
        DateTime? to,
        int page,
        int pageSize,
        CancellationToken ct = default)
    {
        var query = _db.ReportSnapshots.AsNoTracking();

        if (from.HasValue)
        {
            query = query.Where(x => x.GeneratedAt >= from.Value);
        }

        if (to.HasValue)
        {
            query = query.Where(x => x.GeneratedAt <= to.Value);
        }

        return query
            .OrderByDescending(x => x.GeneratedAt)
            .ToPagedResultAsync(page, pageSize, ct);
    }

    public Task<ReportSnapshot?> GetByIdAsync(Guid id, CancellationToken ct = default) =>
        _db.ReportSnapshots.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct);

    public async Task AddAsync(ReportSnapshot snapshot, CancellationToken ct = default) =>
        await _db.ReportSnapshots.AddAsync(snapshot, ct);
}
