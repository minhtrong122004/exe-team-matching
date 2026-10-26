using Exe.BuildingBlocks.Paging;
using Group.Services.DTOs;
using Group.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Group.API.Controllers;

/// <summary>Lời mời vào nhóm: /api/groups/{id}/invitations và /api/invitations/**.</summary>
[ApiController]
[Route("api/invitations")]
[Authorize]
[Produces("application/json")]
public class InvitationsController(IInvitationService invitationService) : ControllerBase
{
    /// <summary>Trưởng nhóm mời một sinh viên (BR-05). Phát InvitationCreated.</summary>
    [HttpPost("/api/groups/{groupId:guid}/invitations")]
    [ProducesResponseType<InvitationResponse>(StatusCodes.Status201Created)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<InvitationResponse>> Create(
        Guid groupId, [FromBody] CreateInvitationRequest request, CancellationToken ct)
    {
        var result = await invitationService.CreateAsync(groupId, request, ct);
        return CreatedAtAction(nameof(GetMine), null, result);
    }

    /// <summary>Lời mời của sinh viên hiện tại, lọc theo status, mới nhất trước.</summary>
    [HttpGet("my")]
    [ProducesResponseType<PagedResult<InvitationResponse>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<PagedResult<InvitationResponse>>> GetMine(
        [FromQuery] InvitationQuery query, CancellationToken ct) =>
        Ok(await invitationService.GetMineAsync(query, ct));

    /// <summary>
    /// Sinh viên chấp nhận lời mời. Lời mời Expired không chấp nhận được (409 INVITATION_EXPIRED, BR-10).
    /// Phát MemberJoined.
    /// </summary>
    [HttpPut("{id:guid}/accept")]
    [ProducesResponseType<InvitationResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<InvitationResponse>> Accept(Guid id, CancellationToken ct) =>
        Ok(await invitationService.AcceptAsync(id, ct));

    /// <summary>Sinh viên từ chối lời mời.</summary>
    [HttpPut("{id:guid}/reject")]
    [ProducesResponseType<InvitationResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<InvitationResponse>> Reject(Guid id, CancellationToken ct) =>
        Ok(await invitationService.RejectAsync(id, ct));
}
