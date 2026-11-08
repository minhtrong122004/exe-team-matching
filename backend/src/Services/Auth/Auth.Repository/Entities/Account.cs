using Auth.Repository.Enums;

namespace Auth.Repository.Entities;

/// <summary>
/// Thực thể tài khoản xác thực trong Auth Service (Database: ExeAuthDb).
/// Sở hữu độc quyền danh tính, email đăng nhập, chuỗi băm mật khẩu và vai trò hệ thống.
/// </summary>
public class Account
{
    public Guid Id { get; set; }

    /// <summary>
    /// Email đăng nhập duy nhất toàn hệ thống, luôn chuẩn hóa chữ thường.
    /// </summary>
    public string Email { get; set; } = string.Empty;

    /// <summary>
    /// Mật khẩu đã băm bằng thuật toán BCrypt. Tuyệt đối không lưu plaintext.
    /// </summary>
    public string PasswordHash { get; set; } = string.Empty;

    /// <summary>
    /// Họ và tên snapshot tại thời điểm đăng ký tài khoản.
    /// Hồ sơ hiển thị có thể chỉnh sửa thuộc quyền sở hữu của User Service (UserProfile).
    /// </summary>
    public string RegistrationFullName { get; set; } = string.Empty;

    /// <summary>
    /// Vai trò hệ thống: Student, Moderator, Lecturer, Admin.
    /// </summary>
    public AccountRole Role { get; set; } = AccountRole.Student;

    /// <summary>
    /// Mã số sinh viên (ví dụ: SE180123) được đồng bộ từ danh sách FAP (BR-01, BR-04).
    /// Null đối với tài khoản Moderator / Lecturer / Admin.
    /// </summary>
    public string? StudentCode { get; set; }

    /// <summary>
    /// Cờ đánh dấu tài khoản vừa được hệ thống cấp mật khẩu khởi tạo và khuyến nghị/yêu cầu đổi mật khẩu lần đầu.
    /// </summary>
    public bool MustChangePassword { get; set; } = false;

    /// <summary>
    /// Thời điểm sinh viên xác nhận đồng ý Điều khoản ghép nhóm và sự điều phối của Moderator/Giảng viên (BR-34).
    /// Null nếu chưa xác nhận lần đầu.
    /// </summary>
    public DateTime? AcceptedTermsAt { get; set; }

    /// <summary>
    /// Trạng thái hoạt động của tài khoản. false = bị khóa bởi Quản trị viên / Moderator.
    /// </summary>
    public bool IsActive { get; set; } = true;

    /// <summary>
    /// Trạng thái đã xác thực email thành công hay chưa. false = đang chờ xác thực OTP.
    /// </summary>
    public bool EmailConfirmed { get; set; } = false;

    /// <summary>
    /// Thời điểm xác thực email thành công (UTC).
    /// </summary>
    public DateTime? EmailConfirmedAt { get; set; }

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

    /// <summary>
    /// Danh sách các yêu cầu xác thực email OTP thuộc về tài khoản này.
    /// </summary>
    public ICollection<EmailVerificationChallenge> VerificationChallenges { get; set; } = new List<EmailVerificationChallenge>();
}
