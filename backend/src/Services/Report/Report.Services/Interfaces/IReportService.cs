using Exe.BuildingBlocks.Paging;
using Report.Services.DTOs;

namespace Report.Services.Interfaces;

public interface IReportService
{
    Task<ReportSummaryResponse> GetSummaryAsync(CancellationToken ct = default);
    Task<PagedResult<ReportSnapshotResponse>> GetSnapshotsAsync(PagedRequest query, CancellationToken ct = default);
    Task<ReportSnapshotResponse> CreateSnapshotAsync(CancellationToken ct = default);
    Task<CsvExportResult> ExportSummaryCsvAsync(CancellationToken ct = default);
    Task<PagedResult<StudentWithoutGroupResponse>> GetStudentsWithoutGroupAsync(StudentsWithoutGroupQuery query, CancellationToken ct = default);
    Task<PagedResult<GroupReportItemResponse>> GetGroupsAsync(GroupReportQuery query, CancellationToken ct = default);
}
