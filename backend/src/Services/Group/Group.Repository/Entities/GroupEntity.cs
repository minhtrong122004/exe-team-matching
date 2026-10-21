using Group.Repository.Enums;

namespace Group.Repository.Entities;

/// <summary>
/// Nhóm EXE gắn với đúng một dự án (CLAUDE.md mục 6). Đặt tên GroupEntity để không trùng namespace Group.*.
/// </summary>
public class GroupEntity
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public Guid LeaderId { get; set; }

    /// <summary>Unique trong các nhóm chưa giải tán (BR-11).</summary>
    public Guid ProjectId { get; set; }

    /// <summary>Bản sao lĩnh vực dự án lúc tạo nhóm, dùng để lọc và gợi ý mà không phải gọi Project cho từng nhóm.</summary>
    public string ProjectDomain { get; set; } = string.Empty;

    /// <summary>4–6 (BR-02).</summary>
    public int MaxMembers { get; set; }

    public GroupStatus Status { get; set; } = GroupStatus.Recruiting;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    /// <summary>Concurrency token: hai thao tác cùng thêm thành viên thì một bên nhận DbUpdateConcurrencyException.</summary>
    public byte[] RowVersion { get; set; } = [];

    public List<GroupMember> Members { get; set; } = [];
    public List<RecruitmentSlot> Slots { get; set; } = [];

    /// <summary>Nhóm còn hoạt động (BR-01 chỉ tính các nhóm này).</summary>
    public bool IsActive => Status != GroupStatus.Disbanded;
}
