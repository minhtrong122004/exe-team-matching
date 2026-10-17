using BCrypt.Net;

namespace Auth.Services.Security;

/// <summary>
/// Triển khai IPasswordHasher bằng thư viện BCrypt.Net-Next với WorkFactor = 11.
/// Đảm bảo tính kháng vét cạn (brute-force resistance) theo tiêu chuẩn bảo mật hiện đại.
/// </summary>
public class BCryptPasswordHasher : IPasswordHasher
{
    private const int WorkFactor = 11;

    public string HashPassword(string password)
    {
        if (string.IsNullOrEmpty(password))
        {
            throw new ArgumentException("Password cannot be null or empty.", nameof(password));
        }

        return BCrypt.Net.BCrypt.EnhancedHashPassword(password, WorkFactor);
    }

    public bool VerifyPassword(string password, string passwordHash)
    {
        if (string.IsNullOrEmpty(password) || string.IsNullOrEmpty(passwordHash))
        {
            return false;
        }

        try
        {
            return BCrypt.Net.BCrypt.EnhancedVerify(password, passwordHash);
        }
        catch
        {
            // Bắt ngoại lệ nếu chuỗi băm bị biến dạng định dạng nhằm tránh lỗi runtime
            return false;
        }
    }
}
