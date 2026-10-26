using System.Reflection;
using Exe.BuildingBlocks.Auth;
using Exe.BuildingBlocks.Paging;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Report.API.Controllers;
using Report.Services.DTOs;
using Report.Services.Interfaces;

namespace Report.Services.Tests;

public class ReportsControllerTests
{
    [Fact]
    public void Controller_HasAuthorizeAttributeForLecturerOrAdmin()
    {
        var attr = typeof(ReportsController).GetCustomAttribute<AuthorizeAttribute>();
        Assert.NotNull(attr);
        Assert.Equal(Roles.LecturerOrAdmin, attr.Roles);
    }

    [Fact]
    public void GenerateSnapshot_HasAuthorizeAttributeForAdmin()
    {
        var method = typeof(ReportsController).GetMethod(nameof(ReportsController.GenerateSnapshot));
        Assert.NotNull(method);
        var attr = method!.GetCustomAttribute<AuthorizeAttribute>();
        Assert.NotNull(attr);
        Assert.Equal(Roles.Admin, attr.Roles);
    }

    [Fact]
    public async Task GetSummary_ReturnsOkWithSummary()
    {
        var expected = new ReportSummaryResponse(DateTime.UtcNow, 10, 6, 4, 2, 1, 1, []);
        var controller = new ReportsController(new StubReportService { Summary = expected });

        var result = await controller.GetSummary(CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        Assert.Same(expected, ok.Value);
    }

    [Fact]
    public async Task ExportSummaryCsv_ReturnsFileContentResult()
    {
        var csv = new CsvExportResult([0xEF, 0xBB, 0xBF, (byte)'a'], "text/csv; charset=utf-8", "exe-report.csv");
        var controller = new ReportsController(new StubReportService { Csv = csv });

        var result = await controller.ExportSummaryCsv(CancellationToken.None);

        var file = Assert.IsType<FileContentResult>(result);
        Assert.Equal("text/csv; charset=utf-8", file.ContentType);
        Assert.Equal("exe-report.csv", file.FileDownloadName);
    }

    [Fact]
    public async Task GetSnapshots_ReturnsOkWithPagedResult()
    {
        var expected = new PagedResult<ReportSnapshotResponse>([], 1, 20, 0);
        var controller = new ReportsController(new StubReportService { Snapshots = expected });

        var result = await controller.GetSnapshots(new SnapshotQuery(), CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        Assert.Same(expected, ok.Value);
    }

    [Fact]
    public async Task GetSnapshotById_ReturnsOkWithSnapshot()
    {
        var expected = new ReportSnapshotResponse(Guid.NewGuid(), DateTime.UtcNow, 5, 3, 2, 1, 1, 0, []);
        var controller = new ReportsController(new StubReportService { CreatedSnapshot = expected });

        var result = await controller.GetSnapshotById(expected.Id, CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        Assert.Same(expected, ok.Value);
    }

    [Fact]
    public async Task ExportSnapshotCsv_ReturnsFileContentResult()
    {
        var csv = new CsvExportResult([0xEF, 0xBB, 0xBF, (byte)'s'], "text/csv; charset=utf-8", "exe-report-snapshot.csv");
        var controller = new ReportsController(new StubReportService { Csv = csv });

        var result = await controller.ExportSnapshotCsv(Guid.NewGuid(), CancellationToken.None);

        var file = Assert.IsType<FileContentResult>(result);
        Assert.Equal("text/csv; charset=utf-8", file.ContentType);
        Assert.Equal("exe-report-snapshot.csv", file.FileDownloadName);
    }

    [Fact]
    public async Task GenerateSnapshot_ReturnsCreatedAtActionResult()
    {
        var expected = new ReportSnapshotResponse(Guid.NewGuid(), DateTime.UtcNow, 5, 3, 2, 1, 1, 0, []);
        var controller = new ReportsController(new StubReportService { CreatedSnapshot = expected });

        var result = await controller.GenerateSnapshot(CancellationToken.None);

        var created = Assert.IsType<CreatedAtActionResult>(result.Result);
        Assert.Equal(nameof(ReportsController.GetSnapshotById), created.ActionName);
        Assert.Same(expected, created.Value);
    }

    [Fact]
    public async Task GetStudentsWithoutGroup_ReturnsOkWithPagedResult()
    {
        var expected = new PagedResult<StudentWithoutGroupResponse>([], 1, 20, 0);
        var controller = new ReportsController(new StubReportService { StudentsWithoutGroup = expected });

        var result = await controller.GetStudentsWithoutGroup(new StudentsWithoutGroupQuery(), CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        Assert.Same(expected, ok.Value);
    }

    [Fact]
    public async Task GetGroups_ReturnsOkWithPagedResult()
    {
        var expected = new PagedResult<GroupReportItemResponse>([], 1, 20, 0);
        var controller = new ReportsController(new StubReportService { Groups = expected });

        var result = await controller.GetGroups(new GroupReportQuery(), CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        Assert.Same(expected, ok.Value);
    }

    private sealed class StubReportService : IReportService
    {
        public ReportSummaryResponse Summary { get; set; } = new(DateTime.UtcNow, 0, 0, 0, 0, 0, 0, []);
        public PagedResult<ReportSnapshotResponse> Snapshots { get; set; } = new([], 1, 20, 0);
        public ReportSnapshotResponse CreatedSnapshot { get; set; } = new(Guid.Empty, DateTime.UtcNow, 0, 0, 0, 0, 0, 0, []);
        public CsvExportResult Csv { get; set; } = new([], "text/csv; charset=utf-8", "test.csv");
        public PagedResult<StudentWithoutGroupResponse> StudentsWithoutGroup { get; set; } = new([], 1, 20, 0);
        public PagedResult<GroupReportItemResponse> Groups { get; set; } = new([], 1, 20, 0);

        public Task<ReportSummaryResponse> GetSummaryAsync(CancellationToken ct = default) => Task.FromResult(Summary);
        public Task<PagedResult<ReportSnapshotResponse>> GetSnapshotsAsync(SnapshotQuery query, CancellationToken ct = default) => Task.FromResult(Snapshots);
        public Task<ReportSnapshotResponse> GetSnapshotByIdAsync(Guid id, CancellationToken ct = default) => Task.FromResult(CreatedSnapshot);
        public Task<ReportSnapshotResponse> CreateSnapshotAsync(CancellationToken ct = default) => Task.FromResult(CreatedSnapshot);
        public Task<CsvExportResult> ExportSummaryCsvAsync(CancellationToken ct = default) => Task.FromResult(Csv);
        public Task<CsvExportResult> ExportSnapshotCsvAsync(Guid id, CancellationToken ct = default) => Task.FromResult(Csv);
        public Task<PagedResult<StudentWithoutGroupResponse>> GetStudentsWithoutGroupAsync(StudentsWithoutGroupQuery query, CancellationToken ct = default) => Task.FromResult(StudentsWithoutGroup);
        public Task<PagedResult<GroupReportItemResponse>> GetGroupsAsync(GroupReportQuery query, CancellationToken ct = default) => Task.FromResult(Groups);
    }
}
