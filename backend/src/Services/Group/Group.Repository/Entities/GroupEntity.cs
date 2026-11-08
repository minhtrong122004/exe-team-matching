using Group.Repository.Enums;

namespace Group.Repository.Entities;

/// <summary>
/// Thực thể phòng ghép nhóm (Room) và nhóm chính thức (Group) của môn học EXE.
/// Vòng đời: Empty -> Forming -> Recruiting -> Closed -> Locked.
/// </summary>
public class GroupEntity
{
    public Guid Id { get; set; }

    /// <summary>Không gian môn học chứa phòng này (BR-01, BR-08).</summary>
    public Guid? SpaceId { get; set; }

    /// <summary>Mã phòng hiển thị chính quy theo chuẩn: &lt;Kỳ&gt;&lt;Môn&gt;-&lt;STT&gt; (vd: FA26EXE101-01) (BR-11).</summary>
    public string? RoomCode { get; set; }

    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }

    /// <summary>Trưởng nhóm. Null khi phòng đang ở trạng thái Empty (0 thành viên) (BR-09, BR-15).</summary>
    public Guid? LeaderId { get; set; }

    /// <summary>Đề tài dự án của nhóm (tùy chọn, cập nhật sau khi lập nhóm theo BR-12).</summary>
    public Guid? ProjectId { get; set; }

    /// <summary>Lĩnh vực dự án (EdTech, FinTech, General...).</summary>
    public string? ProjectDomain { get; set; } = "General";

    /// <summary>Sĩ số tối đa (BR-08, mặc định 5 hoặc 6).</summary>
    public int MaxMembers { get; set; }

    public GroupStatus Status { get; set; } = GroupStatus.Empty;

    /// <summary>Leader chủ động đóng tuyển sớm khi nhóm đã đạt ngưỡng (BR-28).</summary>
    public bool IsClosedByLeader { get; set; } = false;

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    /// <summary>Concurrency token: hai thao tác cùng thêm thành viên thì một bên nhận DbUpdateConcurrencyException.</summary>
    public byte[] RowVersion { get; set; } = [];

    public CourseSpace? Space { get; set; }
    public List<GroupMember> Members { get; set; } = [];
    public List<RecruitmentSlot> Slots { get; set; } = [];
    public List<LeaderElection> Elections { get; set; } = [];

    /// <summary>Nhóm còn hoạt động (chưa giải tán).</summary>
    public bool IsActive => Status != GroupStatus.Disbanded;
}
