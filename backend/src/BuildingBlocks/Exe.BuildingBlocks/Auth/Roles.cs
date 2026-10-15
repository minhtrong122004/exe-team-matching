namespace Exe.BuildingBlocks.Auth;

/// <summary>Tên vai trò dùng trong claim "role" và [Authorize(Roles = ...)].</summary>
public static class Roles
{
    public const string Student = "Student";
    public const string Lecturer = "Lecturer";
    public const string Admin = "Admin";

    /// <summary>Dùng cho [Authorize(Roles = Roles.LecturerOrAdmin)].</summary>
    public const string LecturerOrAdmin = Lecturer + "," + Admin;
}

/// <summary>Tên claim trong JWT do Auth Service cấp.</summary>
public static class ExeClaims
{
    public const string Subject = "sub";
    public const string Email = "email";
    public const string Name = "name";
    public const string Role = "role";
}
