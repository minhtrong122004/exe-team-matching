namespace Auth.Repository.Enums;

/// <summary>
/// Vai trò của tài khoản người dùng trong hệ thống (CLAUDE.md mục 2, 6).
/// Lưu trữ dưới dạng chuỗi trong database.
/// </summary>
public enum AccountRole
{
    Student,
    Lecturer,
    Admin
}
