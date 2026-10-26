namespace Auth.Repository.Enums;

/// <summary>
/// Mục đích của mã xác thực OTP gửi qua email.
/// </summary>
public enum ChallengePurpose
{
    /// <summary>
    /// Xác thực và kích hoạt tài khoản sinh viên mới đăng ký.
    /// </summary>
    EmailVerification = 0,

    /// <summary>
    /// Đặt lại mật khẩu khi người dùng quên mật khẩu.
    /// </summary>
    PasswordReset = 1
}
