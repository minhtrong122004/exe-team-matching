using Exe.BuildingBlocks.Auth;
using Group.Repository.Enums;
using Group.Repository.Interfaces;
using Group.Services.DTOs;
using Group.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Group.API.Controllers;

/// <summary>
/// Quản lý yêu cầu chuyển nhóm sau chốt sổ từ phía Sinh viên và Moderator (BR-35, BR-36, BR-37).
/// Route qua API Gateway: /api/transfer-requests.
/// </summary>
[ApiController]
[Route("api/transfer-requests")]
[Authorize]
[Produces("application/json")]
public class TransferRequestsController(
    ICourseSpaceService spaceService,
    ICourseSpaceRepository spaceRepo) : ControllerBase
{
    /// <summary>Danh sách các yêu cầu chuyển nhóm của sinh viên hiện tại (BR-36).</summary>
    [HttpGet("my")]
    [Authorize(Roles = Roles.Student)]
    [ProducesResponseType<IReadOnlyList<TransferRequestResponse>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<IReadOnlyList<TransferRequestResponse>>> GetMyTransferRequests(
        [FromServices] ICurrentUser currentUser,
        CancellationToken ct)
    {
        if (currentUser.UserId is null)
            return Unauthorized();

        return Ok(await spaceService.GetMyTransferRequestsAsync(currentUser.UserId.Value, ct));
    }

    /// <summary>Sinh viên hủy yêu cầu chuyển nhóm đang chờ duyệt của mình (BR-36).</summary>
    [HttpPut("{id:guid}/cancel")]
    [Authorize(Roles = Roles.Student)]
    [ProducesResponseType<TransferRequestResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<TransferRequestResponse>> Cancel(
        Guid id,
        [FromServices] ICurrentUser currentUser,
        CancellationToken ct)
    {
        if (currentUser.UserId is null)
            return Unauthorized();

        return Ok(await spaceService.CancelTransferRequestAsync(id, currentUser.UserId.Value, ct));
    }

    /// <summary>Moderator duyệt yêu cầu chuyển nhóm (BR-36).</summary>
    [HttpPut("{id:guid}/approve")]
    [Authorize(Roles = Roles.Moderator)]
    [ProducesResponseType<TransferRequestResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<TransferRequestResponse>> Approve(
        Guid id,
        [FromBody] DecideTransferRequest? body,
        [FromServices] ICurrentUser currentUser,
        CancellationToken ct)
    {
        if (currentUser.UserId is null)
            return Unauthorized();

        var existing = await spaceRepo.GetTransferRequestByIdAsync(id, ct);
        if (existing is null)
            return NotFound(new ProblemDetails { Title = "Not Found", Detail = $"Không tìm thấy yêu cầu chuyển nhóm '{id}'." });

        var decision = new DecideTransferRequest(true, body?.DecisionReason ?? "Moderator đã duyệt yêu cầu chuyển nhóm.");
        return Ok(await spaceService.DecideTransferRequestAsync(existing.SpaceId, id, decision, currentUser.UserId.Value, ct));
    }

    /// <summary>Moderator từ chối yêu cầu chuyển nhóm (BR-36).</summary>
    [HttpPut("{id:guid}/reject")]
    [Authorize(Roles = Roles.Moderator)]
    [ProducesResponseType<TransferRequestResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<TransferRequestResponse>> Reject(
        Guid id,
        [FromBody] DecideTransferRequest? body,
        [FromServices] ICurrentUser currentUser,
        CancellationToken ct)
    {
        if (currentUser.UserId is null)
            return Unauthorized();

        var existing = await spaceRepo.GetTransferRequestByIdAsync(id, ct);
        if (existing is null)
            return NotFound(new ProblemDetails { Title = "Not Found", Detail = $"Không tìm thấy yêu cầu chuyển nhóm '{id}'." });

        var decision = new DecideTransferRequest(false, body?.DecisionReason ?? "Moderator từ chối yêu cầu chuyển nhóm.");
        return Ok(await spaceService.DecideTransferRequestAsync(existing.SpaceId, id, decision, currentUser.UserId.Value, ct));
    }
}

