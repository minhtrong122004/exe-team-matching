namespace Auth.Repository.Entities;

/// <summary>
/// Thực thể lưu trữ thách thức xác thực email bằng mã OTP (CLAUDE.md mục 3, 6; Gate E).
/// Tuyệt đối không lưu mã OTP dạng plaintext, chỉ lưu chuỗi băm kèm salt.
/// </summary>
public class EmailVerificationChallenge
{
    public Guid Id { get; set; }

    /// <summary>
    /// Khóa ngoại liên kết tới Account.
    /// </summary>
    public Guid AccountId { get; set; }

    /// <summary>
    /// Email nhận mã OTP (chuẩn hóa chữ thường).
    /// </summary>
    public string Email { get; set; } = string.Empty;

    /// <summary>
    /// Mục đích của mã xác thực (EmailVerification, PasswordReset).
    /// </summary>
    public Auth.Repository.Enums.ChallengePurpose Purpose { get; set; } = Auth.Repository.Enums.ChallengePurpose.EmailVerification;

    /// <summary>
    /// Chuỗi băm mật mã của OTP kèm salt (SHA-256). Tuyệt đối không lưu plaintext.
    /// </summary>
    public string OtpHash { get; set; } = string.Empty;

    /// <summary>
    /// Chuỗi salt ngẫu nhiên bảo mật (Hex string 32-64 ký tự).
    /// </summary>
    public string Salt { get; set; } = string.Empty;

    /// <summary>
    /// Thời điểm hết hạn của mã OTP (UTC). Mặc định 5 phút kể từ lúc tạo.
    /// </summary>
    public DateTime ExpiresAt { get; set; }

    /// <summary>
    /// Số lần nhập sai mã OTP. Tối đa 5 lần trước khi khóa thách thức này.
    /// </summary>
    public int FailedAttempts { get; set; } = 0;

    /// <summary>
    /// Thời điểm cho phép gửi lại mã OTP (UTC). Cooldown 60 giây.
    /// </summary>
    public DateTime? ResendAvailableAt { get; set; }

    /// <summary>
    /// Đánh dấu mã OTP đã được sử dụng thành công hay chưa.
    /// </summary>
    public bool IsUsed { get; set; } = false;

    /// <summary>
    /// Thời điểm tạo thách thức (UTC).
    /// </summary>
    public DateTime CreatedAt { get; set; }

    /// <summary>
    /// Thời điểm xác thực thành công (UTC).
    /// </summary>
    public DateTime? UsedAt { get; set; }

    // ── Navigation ────────────────────────────────────────────────────────────
    public Account? Account { get; set; }
}
