namespace Auth.Repository.Entities;

/// <summary>
/// Thực thể quản lý phiên đăng nhập và xoay vòng Refresh Token.
/// Chỉ lưu trữ TokenHash (SHA-256), tuyệt đối không lưu raw token.
/// </summary>
public class RefreshToken
{
    public Guid Id { get; set; }

    /// <summary>
    /// ID tài khoản sở hữu Refresh Token này.
    /// </summary>
    public Guid AccountId { get; set; }

    /// <summary>
    /// Chuỗi băm SHA-256 (dạng thập lục phân 64 ký tự) của raw token.
    /// Có Unique Index để tra cứu token nhanh và an toàn.
    /// </summary>
    public string TokenHash { get; set; } = string.Empty;

    /// <summary>
    /// Thời điểm hết hạn của Refresh Token (UTC, 7 ngày).
    /// </summary>
    public DateTime ExpiresAt { get; set; }

    /// <summary>
    /// Thời điểm cấp phát Refresh Token (UTC).
    /// </summary>
    public DateTime CreatedAt { get; set; }

    /// <summary>
    /// Thời điểm token bị thu hồi (UTC). Null nếu token đang hoạt động.
    /// </summary>
    public DateTime? RevokedAt { get; set; }

    /// <summary>
    /// ID của Refresh Token mới thay thế token này trong chuỗi xoay vòng (Token Rotation).
    /// Dùng để phát hiện tấn công tái sử dụng token (Token Reuse Detection) mà không lưu raw token.
    /// </summary>
    public Guid? ReplacedByTokenId { get; set; }

    /// <summary>
    /// Lý do thu hồi: "ReplacedByNewToken", "UserLogout", "RevokedDueToReuseAttempt", "AdminLocked".
    /// </summary>
    public string? RevokeReason { get; set; }

    // ── Navigation ────────────────────────────────────────────────────────────
    public Account Account { get; set; } = null!;

    public RefreshToken? ReplacedByToken { get; set; }
}
