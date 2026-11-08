namespace Exe.BuildingBlocks.Auth;

/// <summary>Tên vai trò dùng trong claim "role" và [Authorize(Roles = ...)].</summary>
public static class Roles
{
    public const string Student = "Student";
    public const string Moderator = "Moderator";
    public const string Lecturer = "Lecturer";

    /// <summary>Dành riêng cho các thao tác cấu hình kỳ học, Space, phân phối cưỡng chế và chốt sổ.</summary>
    public const string ModeratorOnly = Moderator;

    /// <summary>Dùng cho [Authorize(Roles = Roles.LecturerOrModerator)] — Quyền quan sát báo cáo/thống kê dành cho Giảng viên và Điều phối viên.</summary>
    public const string LecturerOrModerator = Lecturer + "," + Moderator;
}

/// <summary>Tên claim trong JWT do Auth Service cấp.</summary>
public static class ExeClaims
{
    public const string Subject = "sub";
    public const string Email = "email";
    public const string Name = "name";
    public const string Role = "role";
}
