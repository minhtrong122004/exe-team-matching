using Exe.BuildingBlocks.Auth;
using Exe.BuildingBlocks.Paging;
using Group.Services.DTOs;
using Group.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Group.API.Controllers;

/// <summary>
/// Nhóm, vị trí tuyển, thành viên và gợi ý ghép nhóm.
/// Route qua API Gateway: http://localhost:5000/api/groups. Lỗi trả ProblemDetails (GlobalExceptionHandler).
/// </summary>
[ApiController]
[Route("api/groups")]
[Authorize]
[Produces("application/json")]
public class GroupsController(
    IGroupService groupService,
    IGroupMatchingService matchingService,
    IElectionService electionService) : ControllerBase
{
    // ─────────────────────────────────────────────────────────────────────────
    // Nhóm
    // ─────────────────────────────────────────────────────────────────────────

    /// <summary>
    /// Danh sách nhóm có tìm kiếm, lọc, sắp xếp, phân trang.
    /// sortBy: name | memberCount | maxMembers | createdAt (mặc định, desc). Mặc định ẩn nhóm Disbanded.
    /// </summary>
    [HttpGet]
    [ProducesResponseType<PagedResult<GroupSummaryResponse>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<PagedResult<GroupSummaryResponse>>> GetGroups(
        [FromQuery] GroupQuery query, CancellationToken ct) =>
        Ok(await groupService.GetGroupsAsync(query, ct));

    /// <summary>Nhóm của người dùng hiện tại trong môn <paramref name="spaceId"/> (không truyền: nhóm mới nhất); 204 nếu chưa có.</summary>
    [HttpGet("my")]
    [ProducesResponseType<GroupDetailResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<GroupDetailResponse>> GetMyGroup([FromQuery] Guid? spaceId, CancellationToken ct)
    {
        var group = await groupService.GetMyGroupAsync(spaceId, ct);
        return group is null ? NoContent() : Ok(group);
    }

    /// <summary>Nhóm gợi ý cho sinh viên hiện tại, xếp theo điểm phù hợp (gọi Matching qua gRPC).</summary>
    /// <param name="top">Số nhóm trả về (1–50, mặc định 10).</param>
    [HttpGet("suggestions")]
    [Authorize(Roles = Roles.Student)]
    [ProducesResponseType<IReadOnlyList<GroupSuggestionResponse>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<IReadOnlyList<GroupSuggestionResponse>>> GetSuggestions(
        [FromQuery] int top = 10, CancellationToken ct = default) =>
        Ok(await matchingService.GetSuggestionsAsync(top, ct));

    /// <summary>Chi tiết nhóm: thành viên và vị trí tuyển.</summary>
    [HttpGet("{id:guid}")]
    [ProducesResponseType<GroupDetailResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<GroupDetailResponse>> GetGroup(Guid id, CancellationToken ct) =>
        Ok(await groupService.GetGroupAsync(id, ct));

    /// <summary>Sửa tên và mô tả nhóm (chỉ trưởng nhóm). Sĩ số do Moderator cấu hình theo Space (BR-08).</summary>
    [HttpPut("{id:guid}")]
    [ProducesResponseType<GroupDetailResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<GroupDetailResponse>> UpdateGroup(
        Guid id, [FromBody] UpdateGroupRequest request, CancellationToken ct) =>
        Ok(await groupService.UpdateGroupAsync(id, request, ct));

    // ─────────────────────────────────────────────────────────────────────────
    // Vị trí tuyển
    // ─────────────────────────────────────────────────────────────────────────

    /// <summary>Thêm vị trí cần tuyển (chỉ trưởng nhóm).</summary>
    [HttpPost("{id:guid}/slots")]
    [ProducesResponseType<SlotResponse>(StatusCodes.Status201Created)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<SlotResponse>> AddSlot(Guid id, [FromBody] SlotRequest request, CancellationToken ct)
    {
        var slot = await groupService.AddSlotAsync(id, request, ct);
        return CreatedAtAction(nameof(GetGroup), new { id }, slot);
    }

    /// <summary>Sửa vị trí tuyển (chỉ trưởng nhóm). Quantity không nhỏ hơn số người đã vào.</summary>
    [HttpPut("{id:guid}/slots/{slotId:guid}")]
    [ProducesResponseType<SlotResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<SlotResponse>> UpdateSlot(
        Guid id, Guid slotId, [FromBody] SlotRequest request, CancellationToken ct) =>
        Ok(await groupService.UpdateSlotAsync(id, slotId, request, ct));

    /// <summary>Xóa vị trí tuyển chưa có ai (chỉ trưởng nhóm).</summary>
    [HttpDelete("{id:guid}/slots/{slotId:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> DeleteSlot(Guid id, Guid slotId, CancellationToken ct)
    {
        await groupService.DeleteSlotAsync(id, slotId, ct);
        return NoContent();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Matching (gRPC)
    // ─────────────────────────────────────────────────────────────────────────

    /// <summary>
    /// Điểm phù hợp của người dùng hiện tại với nhóm: gọi User + Project (REST) rồi Matching (gRPC CalculateMatch).
    /// </summary>
    [HttpGet("{id:guid}/match-score")]
    [ProducesResponseType<MatchScoreResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<MatchScoreResponse>> GetMatchScore(Guid id, CancellationToken ct) =>
        Ok(await matchingService.GetMatchScoreAsync(id, ct));

    /// <summary>Ứng viên LookingForTeam phù hợp nhất với nhóm (chỉ trưởng nhóm, gRPC RankCandidates).</summary>
    /// <param name="id">Id nhóm.</param>
    /// <param name="top">Số ứng viên trả về (1–50, mặc định 10).</param>
    [HttpGet("{id:guid}/candidates")]
    [ProducesResponseType<IReadOnlyList<CandidateResponse>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<IReadOnlyList<CandidateResponse>>> GetCandidates(
        Guid id, [FromQuery] int top = 10, CancellationToken ct = default) =>
        Ok(await matchingService.GetCandidatesAsync(id, top, ct));

    // ─────────────────────────────────────────────────────────────────────────
    // Thành viên
    // ─────────────────────────────────────────────────────────────────────────

    /// <summary>Mời thành viên ra khỏi nhóm kèm lý do bắt buộc (chỉ trưởng nhóm, Phương án 3, BR-05). Phát MemberLeft và MemberRemoved.</summary>
    [HttpDelete("{id:guid}/members/{userId:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> RemoveMember(
        Guid id, Guid userId, [FromBody] RemoveMemberRequest? request, CancellationToken ct)
    {
        var req = request ?? new RemoveMemberRequest("Trưởng nhóm mời ra khỏi nhóm", "Khác");
        await groupService.RemoveMemberAsync(id, userId, req, ct);
        return NoContent();
    }

    /// <summary>Mời thành viên ra khỏi nhóm qua POST (chỉ trưởng nhóm, Phương án 3, BR-05).</summary>
    [HttpPost("{id:guid}/members/{userId:guid}/remove")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> RemoveMemberPost(
        Guid id, Guid userId, [FromBody] RemoveMemberRequest request, CancellationToken ct)
    {
        await groupService.RemoveMemberAsync(id, userId, request, ct);
        return NoContent();
    }

    /// <summary>Rời nhóm. Leader rời thì quyền tự chuyển cho người vào sớm nhất (BR-20). Phát MemberLeft.</summary>
    [HttpPost("{id:guid}/leave")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> LeaveGroup(Guid id, CancellationToken ct)
    {
        await groupService.LeaveGroupAsync(id, ct);
        return NoContent();
    }

    /// <summary>Chuyển quyền trưởng nhóm cho một thành viên khác (chỉ trưởng nhóm).</summary>
    [HttpPut("{id:guid}/leader")]
    [ProducesResponseType<GroupDetailResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<GroupDetailResponse>> TransferLeader(
        Guid id, [FromBody] TransferLeaderRequest request, CancellationToken ct) =>
        Ok(await groupService.TransferLeaderAsync(id, request, ct));

    // ─────────────────────────────────────────────────────────────────────────
    // Phase 4: Vòng đời Room, Vào phòng trực tiếp, Đóng tuyển & Bầu Leader 24h
    // ─────────────────────────────────────────────────────────────────────────

    /// <summary>
    /// Sinh viên vào thẳng phòng trống (trở thành Leader) hoặc phòng dưới ngưỡng (BR-14, BR-15, BR-16, BR-21).
    /// </summary>
    [HttpPost("{id:guid}/direct-join")]
    [Authorize(Roles = Roles.Student)]
    [ProducesResponseType<DirectJoinRoomResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<DirectJoinRoomResponse>> DirectJoinRoom(Guid id, CancellationToken ct) =>
        Ok(await groupService.DirectJoinRoomAsync(id, ct));

    /// <summary>
    /// Leader chủ động đóng tuyển sớm khi nhóm đã đạt ngưỡng (BR-28). Toàn bộ đơn Apply còn chờ tự chuyển thành Reject.
    /// </summary>
    [HttpPut("{id:guid}/close-recruitment")]
    [Authorize(Roles = Roles.Student)]
    [ProducesResponseType<GroupDetailResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<GroupDetailResponse>> CloseRecruitment(Guid id, CancellationToken ct) =>
        Ok(await groupService.CloseRecruitmentAsync(id, ct));

    /// <summary>
    /// Leader mở lại tuyển dụng khi nhóm chưa đủ sĩ số tối đa MaxMembers.
    /// </summary>
    [HttpPut("{id:guid}/reopen-recruitment")]
    [Authorize(Roles = Roles.Student)]
    [ProducesResponseType<GroupDetailResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<GroupDetailResponse>> ReopenRecruitment(Guid id, CancellationToken ct) =>
        Ok(await groupService.ReopenRecruitmentAsync(id, ct));

    /// <summary>
    /// Thành viên mở cuộc bầu chọn Leader mới với thời hạn 24 giờ (BR-18, BR-19).
    /// </summary>
    [HttpPost("{id:guid}/elections")]
    [Authorize(Roles = Roles.Student)]
    [ProducesResponseType<LeaderElectionResponse>(StatusCodes.Status201Created)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<LeaderElectionResponse>> StartElection(
        Guid id, [FromBody] StartElectionRequest request, CancellationToken ct)
    {
        var result = await electionService.StartElectionAsync(id, request, ct);
        return StatusCode(StatusCodes.Status201Created, result);
    }

    /// <summary>
    /// Thành viên bỏ phiếu cho cuộc bầu chọn Leader (BR-19).
    /// Khi đạt > 50% số phiếu đồng ý, ứng viên chính thức trở thành Leader mới.
    /// </summary>
    [HttpPost("{id:guid}/elections/{electionId:guid}/vote")]
    [Authorize(Roles = Roles.Student)]
    [ProducesResponseType<LeaderElectionResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<LeaderElectionResponse>> VoteElection(
        Guid id, Guid electionId, [FromBody] VoteElectionRequest request, CancellationToken ct) =>
        Ok(await electionService.VoteElectionAsync(id, electionId, request, ct));

    /// <summary>
    /// Lấy thông tin cuộc bầu chọn Leader đang diễn ra kèm thời gian đếm ngược (BR-19).
    /// </summary>
    [HttpGet("{id:guid}/elections/current")]
    [ProducesResponseType<LeaderElectionResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<LeaderElectionResponse>> GetCurrentElection(Guid id, CancellationToken ct)
    {
        var result = await electionService.GetCurrentElectionAsync(id, ct);
        return result is null ? NoContent() : Ok(result);
    }
}
