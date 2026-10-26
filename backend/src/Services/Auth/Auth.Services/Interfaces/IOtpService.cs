namespace Auth.Services.Interfaces;

/// <summary>
/// Dịch vụ sinh và băm mã xác thực OTP mật mã học an toàn (Gate E).
/// Đảm bảo tính ngẫu nhiên chuẩn CSPRNG, băm kèm salt và so sánh bằng FixedTimeEquals.
/// </summary>
public interface IOtpService
{
    /// <summary>
    /// Sinh mã OTP 6 chữ số ngẫu nhiên an toàn mật mã học (100000 -> 999999).
    /// </summary>
    string GenerateSixDigitOtp();

    /// <summary>
    /// Băm mã OTP kèm chuỗi salt ngẫu nhiên mới sinh (SHA-256).
    /// </summary>
    /// <param name="otp">Mã OTP 6 chữ số</param>
    /// <returns>Bộ đôi (OtpHash, Salt) lưu vào cơ sở dữ liệu</returns>
    (string OtpHash, string Salt) HashOtp(string otp);

    /// <summary>
    /// Kiểm tra mã OTP do người dùng nhập vào so với hash và salt đã lưu trong DB.
    /// Sử dụng so sánh hằng thời gian (Constant-time FixedTimeEquals) để chống Timing Attack.
    /// </summary>
    bool VerifyOtp(string inputOtp, string storedHash, string storedSalt);
}
