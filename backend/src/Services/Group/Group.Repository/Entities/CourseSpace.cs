using Group.Repository.Enums;

namespace Group.Repository.Entities;

/// <summary>
/// Không gian môn học theo học kỳ (CourseSpace, vd: FA26 - EXE101) quản lý danh sách sinh viên đủ điều kiện và sinh Room.
/// </summary>
public class CourseSpace
{
    public Guid Id { get; set; }

    /// <summary>Mã học kỳ (vd: FA26, SP26).</summary>
    public string SemesterCode { get; set; } = string.Empty;

    /// <summary>Mã môn học (vd: EXE101, EXE201).</summary>
    public string SubjectCode { get; set; } = string.Empty;

    /// <summary>Tên hiển thị không gian môn học (vd: "Fall 2026 - EXE101").</summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>Sĩ số tối đa một nhóm (BR-08, mặc định 5).</summary>
    public int MaxMembersPerGroup { get; set; } = 5;

    /// <summary>Ngưỡng chuyển từ Room sang Group (BR-16: (MaxMembers / 2) + 1, vd: 5 -> 3).</summary>
    public int GroupThreshold { get; set; } = 3;

    /// <summary>Hệ số dự phòng số phòng khi sinh tự động (BR-09, mặc định 1.2).</summary>
    public decimal BufferRatio { get; set; } = 1.2m;

    /// <summary>Giới hạn số đơn Apply đang chờ cùng lúc của 1 sinh viên (BR-22, BR-23, mặc định 3).</summary>
    public int MaxConcurrentApplies { get; set; } = 3;

    /// <summary>Hạn chót sinh viên tự do ghép nhóm vào Room (BR-08).</summary>
    public DateTime RegistrationDeadline { get; set; }

    /// <summary>Trạng thái vòng đời của Space: Draft -> Open -> ClosedRegistration -> Locked.</summary>
    public CourseSpaceStatus Status { get; set; } = CourseSpaceStatus.Draft;

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public List<SpaceEnrollment> Enrollments { get; set; } = [];
    public List<GroupEntity> Rooms { get; set; } = [];
}

