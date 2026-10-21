using Group.Repository.Enums;

namespace Group.Repository.Entities;

/// <summary>Yêu cầu tham gia nhóm do sinh viên gửi.</summary>
public class JoinRequest
{
    public Guid Id { get; set; }
    public Guid GroupId { get; set; }
    public Guid? SlotId { get; set; }
    public Guid StudentId { get; set; }

    // Lấy từ JWT của sinh viên lúc gửi yêu cầu.
    public string StudentName { get; set; } = string.Empty;
    public string StudentEmail { get; set; } = string.Empty;

    public string? Message { get; set; }
    public JoinRequestStatus Status { get; set; } = JoinRequestStatus.Pending;
    public DateTime CreatedAt { get; set; }
    public DateTime? DecidedAt { get; set; }

    public GroupEntity Group { get; set; } = null!;
}
