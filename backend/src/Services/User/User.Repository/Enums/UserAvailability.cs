namespace User.Repository.Enums;

/// <summary>
/// Trạng thái tìm kiếm nhóm của sinh viên (CLAUDE.md mục 6).
/// Mặc định là LookingForTeam khi mới tạo hồ sơ.
/// Khi sinh viên tham gia nhóm thì chuyển thành InTeam (BR-01, MemberJoined event).
/// </summary>
public enum UserAvailability
{
    LookingForTeam,
    InTeam,
    NotLooking
}
