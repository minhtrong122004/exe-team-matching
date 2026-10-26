using Exe.BuildingBlocks.Paging;
using Group.Repository.Enums;

namespace Group.Services.DTOs;

/// <summary>POST /api/groups/{id}/join-requests — sinh viên xin vào nhóm, có thể chọn vị trí.</summary>
public record CreateJoinRequestRequest(Guid? SlotId, string? Message);

/// <summary>GET /api/groups/{id}/join-requests và /api/join-requests/my — lọc theo trạng thái, mới nhất trước.</summary>
public class JoinRequestQuery : PagedRequest
{
    public JoinRequestStatus? Status { get; set; }
}

public record JoinRequestResponse(
    Guid Id,
    Guid GroupId,
    string GroupName,
    Guid? SlotId,
    Guid StudentId,
    string StudentName,
    string? Message,
    string Status,
    DateTime CreatedAt,
    DateTime? DecidedAt);
