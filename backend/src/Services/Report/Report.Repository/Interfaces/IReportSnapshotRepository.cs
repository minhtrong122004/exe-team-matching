using Exe.BuildingBlocks.Paging;
using Report.Repository.Entities;

namespace Report.Repository.Interfaces;

public interface IReportSnapshotRepository
{
    Task<PagedResult<ReportSnapshot>> GetPagedAsync(DateTime? from, DateTime? to, int page, int pageSize, CancellationToken ct = default);
    Task<ReportSnapshot?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task AddAsync(ReportSnapshot snapshot, CancellationToken ct = default);
}
