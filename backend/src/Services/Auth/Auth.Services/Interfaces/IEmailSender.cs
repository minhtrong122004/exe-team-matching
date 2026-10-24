namespace Auth.Services.Interfaces;

/// <summary>
/// Giao diện trừu tượng hóa dịch vụ gửi email giao dịch (Gate F).
/// </summary>
public interface IEmailSender
{
    /// <summary>
    /// Gửi mã xác thực OTP 6 số tới địa chỉ email người dùng để kích hoạt tài khoản.
    /// </summary>
    Task SendVerificationOtpAsync(string recipientEmail, string recipientName, string otp, CancellationToken ct = default);

    /// <summary>
    /// Gửi mã OTP 6 số phục vụ yêu cầu đặt lại mật khẩu tài khoản.
    /// </summary>
    Task SendPasswordResetOtpAsync(string recipientEmail, string recipientName, string otp, CancellationToken ct = default);
}
