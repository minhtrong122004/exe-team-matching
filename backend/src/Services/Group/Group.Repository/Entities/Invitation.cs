using Group.Repository.Enums;

namespace Group.Repository.Entities;

/// <summary>Lời mời trưởng nhóm gửi cho sinh viên. Quá ExpiresAt thì job chuyển sang Expired (BR-10).</summary>
public class Invitation
{
    public Guid Id { get; set; }
    public Guid GroupId { get; set; }
    public Guid StudentId { get; set; }
    public string StudentName { get; set; } = string.Empty;
    public Guid InvitedBy { get; set; }
    public InvitationStatus Status { get; set; } = InvitationStatus.Pending;
    public DateTime CreatedAt { get; set; }
    public DateTime ExpiresAt { get; set; }
    public DateTime? RespondedAt { get; set; }

    public GroupEntity Group { get; set; } = null!;
}
