namespace Auth.Services.Interfaces;

/// <summary>
/// Giao diện trừu tượng hóa dịch vụ gửi email giao dịch (Gate F).
/// </summary>
public interface IEmailSender
{
    /// <summary>
    /// Gửi mã xác thực OTP 6 số tới địa chỉ email người dùng.
    /// </summary>
    /// <param name="recipientEmail">Email người nhận</param>
    /// <param name="recipientName">Họ và tên người nhận</param>
    /// <param name="otp">Mã xác thực 6 chữ số</param>
    /// <param name="ct">CancellationToken</param>
    Task SendVerificationOtpAsync(string recipientEmail, string recipientName, string otp, CancellationToken ct = default);
}
