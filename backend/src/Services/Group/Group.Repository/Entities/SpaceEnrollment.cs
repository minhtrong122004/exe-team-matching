namespace Group.Repository.Entities;

/// <summary>
/// Sinh viên đủ điều kiện học môn trong Space theo danh sách chính thức từ FAP (BR-01, BR-03).
/// </summary>
public class SpaceEnrollment
{
    public Guid Id { get; set; }
    public Guid SpaceId { get; set; }

    /// <summary>Khóa tài khoản sinh viên trong hệ thống.</summary>
    public Guid StudentId { get; set; }

    public string StudentCode { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string Major { get; set; } = string.Empty;
    public string Cohort { get; set; } = string.Empty;

    /// <summary>Mã lớp gốc trên FAP (vd: SE1801, AI1802) để tham khảo, khác lớp vẫn được chung nhóm (BR-10).</summary>
    public string? ClassCode { get; set; }

    public DateTime EnrolledAt { get; set; }

    public CourseSpace Space { get; set; } = null!;
}

