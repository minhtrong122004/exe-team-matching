namespace Exe.BuildingBlocks.Auth;

/// <summary>
/// Cung cấp thông tin danh tính của người dùng hiện tại từ Claims.
/// Lớp Services chỉ dùng interface này, không phụ thuộc trực tiếp vào HttpContext (CLAUDE.md mục 5).
/// </summary>
public interface ICurrentUser
{
    Guid? UserId { get; }
    string? Email { get; }
    string? FullName { get; }
    string? Role { get; }
    bool IsAuthenticated { get; }
    bool IsInRole(string role);
}
