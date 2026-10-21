using Group.Repository.Enums;

namespace Group.Repository.Entities;

/// <summary>Thành viên nhóm. Khóa chính (GroupId, UserId).</summary>
public class GroupMember
{
    public Guid GroupId { get; set; }
    public Guid UserId { get; set; }
    public MemberRole Role { get; set; }

    /// <summary>Vị trí tuyển mà thành viên chiếm (để giảm Filled khi rời nhóm); null nếu vào không theo vị trí.</summary>
    public Guid? SlotId { get; set; }

    // Bản sao tên/email lúc vào nhóm, để payload event có sẵn người nhận (CLAUDE.md mục 7).
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;

    public DateTime JoinedAt { get; set; }

    public GroupEntity Group { get; set; } = null!;
}
