using Exe.BuildingBlocks.Auth;
using Exe.BuildingBlocks.Paging;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Report.Services.DTOs;
using Report.Services.Interfaces;

namespace Report.API.Controllers;

/// <summary>
/// Báo cáo và thống kê tổng hợp dành cho Giảng viên và Quản trị viên (CLAUDE.md mục 6, 10).
/// </summary>
[ApiController]
[Route("api/reports")]
[Authorize(Roles = Roles.LecturerOrAdmin)]
public class ReportsController : ControllerBase
{
    private readonly IReportService _reportService;

    public ReportsController(IReportService reportService)
    {
        _reportService = reportService;
    }

    /// <summary>Tổng quan hiện tại: tổng SV, SV có nhóm / chưa có nhóm, tổng nhóm, theo ngành.</summary>
    [HttpGet("summary")]
    [ProducesResponseType(typeof(ReportSummaryResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<ReportSummaryResponse>> GetSummary(CancellationToken ct)
    {
        var result = await _reportService.GetSummaryAsync(ct);
        return Ok(result);
    }

    /// <summary>Danh sách các bản chụp thống kê định kỳ (lọc từ ngày đến ngày, phân trang).</summary>
    [HttpGet("snapshots")]
    [ProducesResponseType(typeof(PagedResult<ReportSnapshotResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResult<ReportSnapshotResponse>>> GetSnapshots(
        [FromQuery] SnapshotQuery query,
        CancellationToken ct)
    {
        var result = await _reportService.GetSnapshotsAsync(query, ct);
        return Ok(result);
    }

    /// <summary>Chi tiết một bản chụp thống kê theo ID.</summary>
    [HttpGet("snapshots/{id:guid}")]
    [ProducesResponseType(typeof(ReportSnapshotResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ReportSnapshotResponse>> GetSnapshotById(Guid id, CancellationToken ct)
    {
        var result = await _reportService.GetSnapshotByIdAsync(id, ct);
        return Ok(result);
    }

    /// <summary>Xuất một bản chụp thống kê theo ID ra file CSV (UTF-8 BOM).</summary>
    [HttpGet("snapshots/{id:guid}/export")]
    [Produces("text/csv")]
    [ProducesResponseType(typeof(FileContentResult), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ExportSnapshotCsv(Guid id, CancellationToken ct)
    {
        var csv = await _reportService.ExportSnapshotCsvAsync(id, ct);
        return File(csv.Content, csv.ContentType, csv.FileName);
    }

    /// <summary>Chạy job tạo bản chụp báo cáo ngay lập tức (chỉ Admin, dùng khi demo thay vì chờ lịch).</summary>
    [HttpPost("snapshots/generate")]
    [Authorize(Roles = Roles.Admin)]
    [ProducesResponseType(typeof(ReportSnapshotResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<ReportSnapshotResponse>> GenerateSnapshot(CancellationToken ct)
    {
        var result = await _reportService.CreateSnapshotAsync(ct);
        return CreatedAtAction(nameof(GetSnapshotById), new { id = result.Id }, result);
    }

    /// <summary>Xuất báo cáo tổng hợp hiện tại ra file CSV (UTF-8 BOM, mở đúng tiếng Việt trong Excel).</summary>
    [HttpGet("summary/export")]
    [Produces("text/csv")]
    [ProducesResponseType(typeof(FileContentResult), StatusCodes.Status200OK)]
    public async Task<IActionResult> ExportSummaryCsv(CancellationToken ct)
    {
        var csv = await _reportService.ExportSummaryCsvAsync(ct);
        return File(csv.Content, csv.ContentType, csv.FileName);
    }

    /// <summary>Danh sách sinh viên chưa có nhóm (lọc theo ngành, phân trang).</summary>
    [HttpGet("students-without-group")]
    [ProducesResponseType(typeof(PagedResult<StudentWithoutGroupResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResult<StudentWithoutGroupResponse>>> GetStudentsWithoutGroup(
        [FromQuery] StudentsWithoutGroupQuery query,
        CancellationToken ct)
    {
        var result = await _reportService.GetStudentsWithoutGroupAsync(query, ct);
        return Ok(result);
    }

    /// <summary>Danh sách nhóm và sĩ số (lọc theo trạng thái, phân trang).</summary>
    [HttpGet("groups")]
    [ProducesResponseType(typeof(PagedResult<GroupReportItemResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResult<GroupReportItemResponse>>> GetGroups(
        [FromQuery] GroupReportQuery query,
        CancellationToken ct)
    {
        var result = await _reportService.GetGroupsAsync(query, ct);
        return Ok(result);
    }
}
