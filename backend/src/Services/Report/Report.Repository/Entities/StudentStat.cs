namespace Report.Repository.Entities;

/// <summary>
/// Bản chiếu thống kê sinh viên nhận từ sự kiện UserRegistered / UserProfileUpdated / MemberJoined / MemberLeft.
/// </summary>
public class StudentStat
{
    public Guid UserId { get; set; }
    public string Email { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string? Major { get; set; }
    public bool HasGroup { get; set; }
    public Guid? GroupId { get; set; }
    public DateTime UpdatedAt { get; set; }
}
