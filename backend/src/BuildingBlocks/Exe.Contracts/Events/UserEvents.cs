namespace Exe.Contracts.Events;

// Tên event = tên record → stream exe:events:{TênRecord} (CLAUDE.md mục 7).
// Đổi tên record hoặc xóa/đổi kiểu field sẽ làm hỏng consumer của service khác:
// chỉ được THÊM field mới (nullable hoặc có giá trị mặc định) và ghi rõ trong PR.

/// <summary>
/// Auth phát khi có tài khoản mới (đăng ký, cấp phát từ danh sách FAP hoặc seed).
/// Nhận: User (tạo hồ sơ trống + gắn StudentCode/Major), Notification (email chào mừng / mật khẩu khởi tạo), Report (thống kê).
/// </summary>
/// <param name="Role">Student | Moderator | Lecturer | Admin</param>
public record UserRegistered(
    Guid UserId,
    string Email,
    string FullName,
    string Role,
    string? StudentCode = null,
    string? InitialPassword = null,
    string? SemesterCode = null,
    string? SubjectCode = null,
    string? Major = null
);

/// <summary>
/// User phát khi hồ sơ thay đổi (điểm kỹ năng, chuyên ngành, trạng thái hoàn thành).
/// Nhận: Matching (cập nhật điểm hồ sơ phục vụ tính độ tương thích), Report (thống kê kỹ năng).
/// </summary>
/// <param name="Major">SE | AI | IA | GD | MKT | IB | Other, null nếu chưa chọn.</param>
public record UserProfileUpdated(
    Guid UserId,
    string FullName,
    string? Major,
    int TechScore = 0,
    int ManagementScore = 0,
    int GraphicDesignScore = 0,
    int MarketingScore = 0,
    int SaleScore = 0,
    bool IsProfileCompleted = false,
    string? Cohort = null
);
