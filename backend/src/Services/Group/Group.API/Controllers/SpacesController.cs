using Exe.BuildingBlocks.Auth;
using Group.Repository.Enums;
using Group.Services.DTOs;
using Group.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Group.API.Controllers;

/// <summary>
/// Quản lý Không gian học phần (Course Space), danh sách sinh viên hợp lệ FAP và tạo Room tự động.
/// Route qua API Gateway: /api/spaces.
/// </summary>
[ApiController]
[Route("api/spaces")]
[Authorize]
[Produces("application/json")]
public class SpacesController(ICourseSpaceService spaceService) : ControllerBase
{
    /// <summary>Tạo Không gian học phần mới (Moderator only, BR-08).</summary>
    [HttpPost]
    [Authorize(Roles = Roles.Moderator)]
    [ProducesResponseType<CourseSpaceResponse>(StatusCodes.Status201Created)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<CourseSpaceResponse>> CreateSpace(
        [FromBody] CreateCourseSpaceRequest request, CancellationToken ct)
    {
        var space = await spaceService.CreateSpaceAsync(request, ct);
        return CreatedAtAction(nameof(GetSpaceById), new { id = space.Id }, space);
    }

    /// <summary>Danh sách tất cả Không gian học phần (Lecturer hoặc Moderator).</summary>
    [HttpGet]
    [Authorize(Roles = Roles.LecturerOrModerator)]
    [ProducesResponseType<IReadOnlyList<CourseSpaceResponse>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<IReadOnlyList<CourseSpaceResponse>>> GetAllSpaces(
        [FromQuery] string? semesterCode,
        [FromQuery] CourseSpaceStatus? status,
        CancellationToken ct) =>
        Ok(await spaceService.GetAllSpacesAsync(semesterCode, status, ct));

    /// <summary>Danh sách Không gian học phần của sinh viên hiện tại (BR-01, BR-03).</summary>
    [HttpGet("my")]
    [Authorize(Roles = Roles.Student)]
    [ProducesResponseType<IReadOnlyList<CourseSpaceResponse>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<IReadOnlyList<CourseSpaceResponse>>> GetMySpaces(
        [FromServices] ICurrentUser currentUser,
        CancellationToken ct)
    {
        if (currentUser.UserId is null)
            return Unauthorized();

        return Ok(await spaceService.GetMySpacesAsync(currentUser.UserId.Value, currentUser.Email, ct));
    }

    /// <summary>Chi tiết một Không gian học phần theo ID.</summary>
    [HttpGet("{id:guid}")]
    [ProducesResponseType<CourseSpaceResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<CourseSpaceResponse>> GetSpaceById(Guid id, CancellationToken ct) =>
        Ok(await spaceService.GetSpaceByIdAsync(id, ct));

    /// <summary>Cập nhật cấu hình Space (sĩ số, buffer ratio, deadline, trạng thái) (Moderator only, BR-08).</summary>
    [HttpPut("{id:guid}/config")]
    [Authorize(Roles = Roles.Moderator)]
    [ProducesResponseType<CourseSpaceResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<CourseSpaceResponse>> UpdateSpaceConfig(
        Guid id, [FromBody] UpdateSpaceConfigRequest request, CancellationToken ct) =>
        Ok(await spaceService.UpdateSpaceConfigAsync(id, request, ct));

    /// <summary>Import danh sách sinh viên hợp lệ từ FAP (Moderator only, BR-08).</summary>
    [HttpPost("{id:guid}/import-fap")]
    [Authorize(Roles = Roles.Moderator)]
    [ProducesResponseType<int>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<int>> ImportFapStudents(
        Guid id, [FromBody] ImportFapStudentsRequest request, CancellationToken ct) =>
        Ok(await spaceService.ImportFapStudentsAsync(id, request, ct));

    /// <summary>Đồng bộ dữ liệu Mock FAP 50 sinh viên mẫu đa ngành (Moderator only, BR-08).</summary>
    [HttpPost("{id:guid}/sync-mock-fap")]
    [Authorize(Roles = Roles.Moderator)]
    [ProducesResponseType<int>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<int>> SyncMockFapStudents(Guid id, CancellationToken ct) =>
        Ok(await spaceService.SyncMockFapStudentsAsync(id, ct));

    /// <summary>
    /// Sinh Room tự động theo công thức CEIL(N / MaxMembers * BufferRatio) (Moderator only, BR-09, BR-11).
    /// </summary>
    [HttpPost("{id:guid}/generate-rooms")]
    [Authorize(Roles = Roles.Moderator)]
    [ProducesResponseType<GenerateRoomsResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<GenerateRoomsResponse>> GenerateRooms(Guid id, CancellationToken ct) =>
        Ok(await spaceService.GenerateRoomsAsync(id, ct));

    /// <summary>Danh sách sinh viên đã được ghi danh (enrollment) trong Space (Lecturer hoặc Moderator).</summary>
    [HttpGet("{id:guid}/enrollments")]
    [Authorize(Roles = Roles.LecturerOrModerator)]
    [ProducesResponseType<IReadOnlyList<SpaceEnrollmentResponse>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<IReadOnlyList<SpaceEnrollmentResponse>>> GetSpaceEnrollments(
        Guid id, CancellationToken ct) =>
        Ok(await spaceService.GetSpaceEnrollmentsAsync(id, ct));

    /// <summary>Danh sách các Room thuộc Space kèm trạng thái sĩ số và mã phòng (BR-09, BR-10).</summary>
    [HttpGet("{id:guid}/rooms")]
    [ProducesResponseType<IReadOnlyList<RoomSummaryResponse>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<IReadOnlyList<RoomSummaryResponse>>> GetSpaceRooms(
        Guid id, [FromQuery] GroupStatus? status, CancellationToken ct) =>
        Ok(await spaceService.GetSpaceRoomsAsync(id, status, ct));

    /// <summary>Đóng cổng đăng ký của Space khi hết hạn (Moderator only, BR-30).</summary>
    [HttpPut("{id:guid}/close-registration")]
    [Authorize(Roles = Roles.Moderator)]
    [ProducesResponseType<CourseSpaceResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<CourseSpaceResponse>> CloseRegistration(Guid id, CancellationToken ct) =>
        Ok(await spaceService.CloseRegistrationAsync(id, ct));

    /// <summary>Thống kê sinh viên lẻ chưa có nhóm và các phòng còn trống (Lecturer hoặc Moderator, BR-30).</summary>
    [HttpGet("{id:guid}/unmatched-summary")]
    [Authorize(Roles = Roles.LecturerOrModerator)]
    [ProducesResponseType<UnmatchedSummaryResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<UnmatchedSummaryResponse>> GetUnmatchedSummary(Guid id, CancellationToken ct) =>
        Ok(await spaceService.GetUnmatchedSummaryAsync(id, ct));

    /// <summary>Xem trước phương án phân phối sinh viên lẻ từ Matching Service gRPC (Moderator only, BR-31, BR-32).</summary>
    [HttpPost("{id:guid}/distribute-preview")]
    [Authorize(Roles = Roles.Moderator)]
    [ProducesResponseType<DistributePreviewResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<DistributePreviewResponse>> PreviewDistribution(Guid id, CancellationToken ct) =>
        Ok(await spaceService.PreviewDistributionAsync(id, ct));

    /// <summary>Xác nhận thực thi phân phối cưỡng chế sinh viên lẻ vào các Room (Moderator only, BR-31, BR-32).</summary>
    [HttpPost("{id:guid}/distribute-confirm")]
    [Authorize(Roles = Roles.Moderator)]
    [ProducesResponseType<DistributeConfirmResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<DistributeConfirmResponse>> ConfirmDistribution(Guid id, CancellationToken ct) =>
        Ok(await spaceService.ConfirmDistributionAsync(id, ct));

    /// <summary>Chốt sổ không gian môn học: Khóa Space, khóa toàn bộ Room, từ chối toàn bộ đơn chờ (Moderator only, BR-33).</summary>
    [HttpPost("{id:guid}/finalize")]
    [Authorize(Roles = Roles.Moderator)]
    [ProducesResponseType<FinalizeSpaceResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<FinalizeSpaceResponse>> FinalizeSpace(Guid id, CancellationToken ct) =>
        Ok(await spaceService.FinalizeSpaceAsync(id, ct));

    // ── GIAI ĐOẠN 6: Điều chuyển sinh viên sau Chốt sổ & Dashboard Giảng viên (BR-35, BR-36, BR-37, BR-38) ──

    /// <summary>Moderator điều chuyển trực tiếp 1 sinh viên hoặc đổi chéo 2 sinh viên sau chốt sổ (Moderator only, BR-35, BR-37).</summary>
    [HttpPost("{id:guid}/direct-transfer")]
    [Authorize(Roles = Roles.Moderator)]
    [ProducesResponseType<TransferRequestResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<TransferRequestResponse>> DirectTransfer(
        Guid id,
        [FromBody] DirectTransferRequest request,
        [FromServices] ICurrentUser currentUser,
        CancellationToken ct)
    {
        if (currentUser.UserId is null)
            return Unauthorized();

        return Ok(await spaceService.DirectTransferAsync(id, request, currentUser.UserId.Value, ct));
    }

    /// <summary>Sinh viên nộp đơn xin chuyển nhóm sau chốt sổ (Student only, BR-36).</summary>
    [HttpPost("{id:guid}/transfer-requests")]
    [Authorize(Roles = Roles.Student)]
    [ProducesResponseType<TransferRequestResponse>(StatusCodes.Status201Created)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<TransferRequestResponse>> CreateTransferRequest(
        Guid id,
        [FromBody] CreateTransferRequest request,
        [FromServices] ICurrentUser currentUser,
        CancellationToken ct)
    {
        if (currentUser.UserId is null)
            return Unauthorized();

        var result = await spaceService.CreateTransferRequestAsync(id, request, currentUser.UserId.Value, ct);
        return StatusCode(StatusCodes.Status201Created, result);
    }

    /// <summary>Danh sách yêu cầu chuyển nhóm trong Không gian học phần (Moderator only, BR-36).</summary>
    [HttpGet("{id:guid}/transfer-requests")]
    [Authorize(Roles = Roles.Moderator)]
    [ProducesResponseType<IReadOnlyList<TransferRequestResponse>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<IReadOnlyList<TransferRequestResponse>>> GetTransferRequests(
        Guid id,
        [FromQuery] TransferRequestStatus? status,
        CancellationToken ct) =>
        Ok(await spaceService.GetTransferRequestsAsync(id, status, ct));

    /// <summary>Moderator duyệt hoặc từ chối yêu cầu chuyển nhóm (Moderator only, BR-36, BR-37).</summary>
    [HttpPut("{id:guid}/transfer-requests/{requestId:guid}/decide")]
    [Authorize(Roles = Roles.Moderator)]
    [ProducesResponseType<TransferRequestResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<TransferRequestResponse>> DecideTransferRequest(
        Guid id,
        Guid requestId,
        [FromBody] DecideTransferRequest request,
        [FromServices] ICurrentUser currentUser,
        CancellationToken ct)
    {
        if (currentUser.UserId is null)
            return Unauthorized();

        return Ok(await spaceService.DecideTransferRequestAsync(id, requestId, request, currentUser.UserId.Value, ct));
    }

    /// <summary>Bảng tổng hợp Roster toàn diện môn học dành cho Lecturer và Moderator (BR-37, BR-38).</summary>
    [HttpGet("{id:guid}/roster")]

    [Authorize(Roles = Roles.LecturerOrModerator)]
    [ProducesResponseType<SpaceRosterResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<SpaceRosterResponse>> GetSpaceRoster(Guid id, CancellationToken ct) =>
        Ok(await spaceService.GetSpaceRosterAsync(id, ct));

    /// <summary>Xuất danh sách sinh viên theo nhóm ra file CSV (UTF-8 BOM cho Excel tiếng Việt) (BR-38).</summary>
    [HttpGet("{id:guid}/roster/export-csv")]
    [Authorize(Roles = Roles.LecturerOrModerator)]
    [Produces("text/csv")]
    [ProducesResponseType(typeof(FileContentResult), StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ExportSpaceRosterCsv(Guid id, CancellationToken ct)
    {
        var csv = await spaceService.ExportSpaceRosterCsvAsync(id, ct);
        return File(csv.Content, csv.ContentType, csv.FileName);
    }
}

