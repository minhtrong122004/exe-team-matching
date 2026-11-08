namespace Group.Repository.Entities;

/// <summary>
/// Nhật ký mời thành viên ra khỏi nhóm (Audit Log Phương án 3, BR-05).
/// Lưu trữ đầy đủ thông tin: ai mời, mời ai, lý do, phân loại và thời gian.
/// </summary>
public class MemberRemovalLog
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid GroupId { get; set; }
    public Guid RemovedUserId { get; set; }
    public string RemovedUserName { get; set; } = string.Empty;
    public string RemovedUserEmail { get; set; } = string.Empty;
    public Guid LeaderId { get; set; }
    public string LeaderName { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Reason { get; set; } = string.Empty;
    public DateTime RemovedAt { get; set; } = DateTime.UtcNow;

    public GroupEntity Group { get; set; } = null!;
}

