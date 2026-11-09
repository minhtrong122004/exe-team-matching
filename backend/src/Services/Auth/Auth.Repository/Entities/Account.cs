using Auth.Repository.Enums;

namespace Auth.Repository.Entities;

/// <summary>
/// Thực thể tài khoản xác thực trong Auth Service (Database: ExeAuthDb).
/// Sở hữu độc quyền danh tính, email đăng nhập và vai trò hệ thống.
/// </summary>
public class Account
{
    public Guid Id { get; set; }

    /// <summary>
    /// Email đăng nhập duy nhất toàn hệ thống, luôn chuẩn hóa chữ thường.
    /// </summary>
    public string Email { get; set; } = string.Empty;

    /// <summary>
    /// Họ và tên snapshot tại thời điểm tạo tài khoản.
    /// Hồ sơ hiển thị có thể chỉnh sửa thuộc quyền sở hữu của User Service (UserProfile).
    /// </summary>
    public string RegistrationFullName { get; set; } = string.Empty;

    /// <summary>
    /// Vai trò hệ thống: Student, Moderator, Lecturer.
    /// </summary>
    public AccountRole Role { get; set; } = AccountRole.Student;

    /// <summary>
    /// Mã số sinh viên (ví dụ: SE180123) được đồng bộ từ danh sách FAP (BR-01, BR-04).
    /// Null đối với tài khoản Moderator / Lecturer.
    /// </summary>
    public string? StudentCode { get; set; }

    /// <summary>
    /// Thời điểm sinh viên xác nhận đồng ý Điều khoản ghép nhóm và sự điều phối của Moderator/Giảng viên (BR-34).
    /// Null nếu chưa xác nhận lần đầu.
    /// </summary>
    public DateTime? AcceptedTermsAt { get; set; }

    /// <summary>
    /// Trạng thái hoạt động của tài khoản. false = bị khóa bởi Moderator.
    /// </summary>
    public bool IsActive { get; set; } = true;

    /// <summary>
    /// Thời điểm tạo tài khoản (UTC).
    /// </summary>
    public DateTime CreatedAt { get; set; }

    /// <summary>
    /// Thời điểm cập nhật cuối (UTC).
    /// </summary>
    public DateTime UpdatedAt { get; set; }

    // ── Navigation ────────────────────────────────────────────────────────────
    /// <summary>
    /// Danh sách Refresh Token thuộc về tài khoản này.
    /// </summary>
    public ICollection<RefreshToken> RefreshTokens { get; set; } = new List<RefreshToken>();
}
