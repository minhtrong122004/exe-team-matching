namespace Exe.Contracts.Events;

// Tên event = tên record → stream exe:events:{TênRecord} (CLAUDE.md mục 7).
// Đổi tên record hoặc xóa/đổi kiểu field sẽ làm hỏng consumer của service khác:
// chỉ được THÊM field mới (nullable hoặc có giá trị mặc định) và ghi rõ trong PR.

/// <summary>
/// Auth phát khi có tài khoản mới (đăng ký hoặc seed).
/// Nhận: User (tạo hồ sơ trống), Notification (email chào mừng), Report (thống kê).
/// </summary>
/// <param name="Role">Student | Lecturer | Admin</param>
public record UserRegistered(Guid UserId, string Email, string FullName, string Role);

/// <summary>
/// User phát khi hồ sơ thay đổi.
/// Nhận: Report.
/// </summary>
/// <param name="Major">SE | AI | IA | GD | MKT | IB | Other, null nếu chưa chọn.</param>
public record UserProfileUpdated(Guid UserId, string FullName, string? Major);
