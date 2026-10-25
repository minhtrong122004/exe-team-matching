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

    public Task<PagedResult<ReportSnapshot>> GetPagedAsync(int page, int pageSize, CancellationToken ct = default) =>
        _db.ReportSnapshots
            .AsNoTracking()
            .OrderByDescending(x => x.GeneratedAt)
            .ToPagedResultAsync(page, pageSize, ct);

    public async Task AddAsync(ReportSnapshot snapshot, CancellationToken ct = default) =>
        await _db.ReportSnapshots.AddAsync(snapshot, ct);
}
