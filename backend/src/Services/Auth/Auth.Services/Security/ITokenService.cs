using Auth.Repository.Entities;

namespace Auth.Services.Security;

/// <summary>
/// Hợp đồng cấp phát và xử lý mật mã cho JWT Access Token và Refresh Token.
/// </summary>
public interface ITokenService
{
    /// <summary>
    /// Tạo JWT Access Token được ký bằng thuật toán HS256 với các claim định danh chuẩn.
    /// </summary>
    string GenerateAccessToken(Account account);

    /// <summary>
    /// Tạo cặp (RawToken, TokenHash) ngẫu nhiên bằng CSPRNG 64-byte.
    /// RawToken gửi cho client, TokenHash lưu vào Database.
    /// </summary>
    (string RawToken, string TokenHash) GenerateRefreshToken();

    /// <summary>
    /// Tính toán chuỗi băm SHA-256 (hex chữ thường) của raw token nhận từ client để đối soát.
    /// </summary>
    string HashToken(string rawToken);
}
