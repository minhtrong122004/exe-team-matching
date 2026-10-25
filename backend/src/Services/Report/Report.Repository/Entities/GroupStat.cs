using Report.Repository.Enums;

namespace Report.Repository.Entities;

/// <summary>
/// Bản chiếu thống kê nhóm nhận từ sự kiện GroupCreated / MemberJoined / MemberLeft.
/// </summary>
public class GroupStat
{
    public Guid GroupId { get; set; }
    public string Name { get; set; } = string.Empty;
    public Guid LeaderId { get; set; }
    public int MemberCount { get; set; }
    public int MaxMembers { get; set; }
    public GroupStatStatus Status { get; set; }
    public DateTime UpdatedAt { get; set; }
}
