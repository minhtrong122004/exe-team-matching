namespace Auth.Services.Security;

/// <summary>
/// Hợp đồng băm và kiểm tra mật khẩu an toàn chuẩn BCrypt.
/// Tuyệt đối không lưu mật khẩu dạng thô (plaintext) hay ghi ra nhật ký.
/// </summary>
public interface IPasswordHasher
{
    /// <summary>
    /// Băm mật khẩu người dùng với hệ số chi phí (work factor) được cấu hình an toàn.
    /// </summary>
    string HashPassword(string password);

    /// <summary>
    /// Xác thực mật khẩu plaintext nhập vào với chuỗi băm BCrypt đã lưu.
    /// </summary>
    bool VerifyPassword(string password, string passwordHash);
}
