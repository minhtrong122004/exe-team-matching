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
public class GroupsController(IGroupService groupService, IGroupMatchingService matchingService) : ControllerBase
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

    /// <summary>Nhóm đang hoạt động của người dùng hiện tại; 204 nếu chưa có nhóm.</summary>
    [HttpGet("my")]
    [ProducesResponseType<GroupDetailResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<GroupDetailResponse>> GetMyGroup(CancellationToken ct)
    {
        var group = await groupService.GetMyGroupAsync(ct);
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

    /// <summary>
    /// Tạo nhóm cho dự án của mình (BR-11), người tạo thành trưởng nhóm. MaxMembers 4–6 (BR-02).
    /// Phát GroupCreated và MemberJoined (trưởng nhóm).
    /// </summary>
    [HttpPost]
    [Authorize(Roles = Roles.Student)]
    [ProducesResponseType<GroupDetailResponse>(StatusCodes.Status201Created)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<GroupDetailResponse>> CreateGroup(
        [FromBody] CreateGroupRequest request, CancellationToken ct)
    {
        var group = await groupService.CreateGroupAsync(request, ct);
        return CreatedAtAction(nameof(GetGroup), new { id = group.Id }, group);
    }

    /// <summary>Sửa tên, mô tả, số thành viên tối đa (chỉ trưởng nhóm).</summary>
    [HttpPut("{id:guid}")]
    [ProducesResponseType<GroupDetailResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<GroupDetailResponse>> UpdateGroup(
        Guid id, [FromBody] UpdateGroupRequest request, CancellationToken ct) =>
        Ok(await groupService.UpdateGroupAsync(id, request, ct));

    /// <summary>Giải tán nhóm (chỉ trưởng nhóm). Hủy yêu cầu/lời mời đang chờ, phát MemberLeft cho từng thành viên.</summary>
    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> DisbandGroup(Guid id, CancellationToken ct)
    {
        await groupService.DisbandGroupAsync(id, ct);
        return NoContent();
    }

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

    /// <summary>Xóa thành viên khỏi nhóm (chỉ trưởng nhóm, BR-05). Phát MemberLeft.</summary>
    [HttpDelete("{id:guid}/members/{userId:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> RemoveMember(Guid id, Guid userId, CancellationToken ct)
    {
        await groupService.RemoveMemberAsync(id, userId, ct);
        return NoContent();
    }

    /// <summary>Rời nhóm. Trưởng nhóm không được rời (BR-09). Phát MemberLeft.</summary>
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
}
