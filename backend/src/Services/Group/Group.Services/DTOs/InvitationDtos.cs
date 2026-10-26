using Exe.BuildingBlocks.Paging;
using Group.Repository.Enums;

namespace Group.Services.DTOs;

/// <summary>POST /api/groups/{id}/invitations — trưởng nhóm mời một sinh viên.</summary>
public record CreateInvitationRequest(Guid StudentId);

/// <summary>GET /api/invitations/my — lọc theo trạng thái, mới nhất trước.</summary>
public class InvitationQuery : PagedRequest
{
    public InvitationStatus? Status { get; set; }
}

public record InvitationResponse(
    Guid Id,
    Guid GroupId,
    string GroupName,
    Guid StudentId,
    string StudentName,
    Guid InvitedBy,
    string Status,
    DateTime CreatedAt,
    DateTime ExpiresAt,
    DateTime? RespondedAt);
