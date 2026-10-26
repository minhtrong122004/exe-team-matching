using Exe.BuildingBlocks.Auth;
using Exe.BuildingBlocks.Paging;
using Group.Services.DTOs;
using Group.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Group.API.Controllers;

/// <summary>Yêu cầu tham gia nhóm: /api/groups/{id}/join-requests và /api/join-requests/**.</summary>
[ApiController]
[Route("api/join-requests")]
[Authorize]
[Produces("application/json")]
public class JoinRequestsController(IJoinRequestService joinRequestService) : ControllerBase
{
    /// <summary>
    /// Sinh viên gửi yêu cầu tham gia nhóm (BR-01, BR-03, BR-04). Phát JoinRequestCreated (báo trưởng nhóm).
    /// </summary>
    [HttpPost("/api/groups/{groupId:guid}/join-requests")]
    [Authorize(Roles = Roles.Student)]
    [ProducesResponseType<JoinRequestResponse>(StatusCodes.Status201Created)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<JoinRequestResponse>> Create(
        Guid groupId, [FromBody] CreateJoinRequestRequest request, CancellationToken ct)
    {
        var result = await joinRequestService.CreateAsync(groupId, request, ct);
        return CreatedAtAction(nameof(GetMine), null, result);
    }

    /// <summary>Yêu cầu gửi tới nhóm (chỉ trưởng nhóm), lọc theo status, mới nhất trước.</summary>
    [HttpGet("/api/groups/{groupId:guid}/join-requests")]
    [ProducesResponseType<PagedResult<JoinRequestResponse>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PagedResult<JoinRequestResponse>>> GetByGroup(
        Guid groupId, [FromQuery] JoinRequestQuery query, CancellationToken ct) =>
        Ok(await joinRequestService.GetByGroupAsync(groupId, query, ct));

    /// <summary>Yêu cầu của sinh viên hiện tại, lọc theo status, mới nhất trước.</summary>
    [HttpGet("my")]
    [ProducesResponseType<PagedResult<JoinRequestResponse>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<PagedResult<JoinRequestResponse>>> GetMine(
        [FromQuery] JoinRequestQuery query, CancellationToken ct) =>
        Ok(await joinRequestService.GetMineAsync(query, ct));

    /// <summary>
    /// Trưởng nhóm chấp nhận (BR-05, BR-06). Sinh viên vào nhóm, các yêu cầu/lời mời khác bị hủy (BR-07, BR-08).
    /// Phát JoinRequestDecided và MemberJoined. 409 GROUP_FULL nếu nhóm đã đủ.
    /// </summary>
    [HttpPut("{id:guid}/accept")]
    [ProducesResponseType<JoinRequestResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<JoinRequestResponse>> Accept(Guid id, CancellationToken ct) =>
        Ok(await joinRequestService.AcceptAsync(id, ct));

    /// <summary>Trưởng nhóm từ chối. Phát JoinRequestDecided.</summary>
    [HttpPut("{id:guid}/reject")]
    [ProducesResponseType<JoinRequestResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<JoinRequestResponse>> Reject(Guid id, CancellationToken ct) =>
        Ok(await joinRequestService.RejectAsync(id, ct));

    /// <summary>Sinh viên hủy yêu cầu của mình.</summary>
    [HttpPut("{id:guid}/cancel")]
    [ProducesResponseType<JoinRequestResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<JoinRequestResponse>> Cancel(Guid id, CancellationToken ct) =>
        Ok(await joinRequestService.CancelAsync(id, ct));
}
