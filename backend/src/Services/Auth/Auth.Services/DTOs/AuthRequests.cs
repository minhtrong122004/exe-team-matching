using Auth.Repository.Enums;

namespace Auth.Services.DTOs;

/// <summary>
/// DTO yêu cầu đăng ký tài khoản mới.
/// Công khai chỉ cho phép vai trò "Student".
/// </summary>
public record RegisterRequest(
    string Email,
    string Password,
    string FullName,
    string? Role = "Student"
);

/// <summary>
/// DTO yêu cầu khởi tạo tài khoản Giảng viên (Lecturer) do Quản trị viên (Admin) thực hiện.
/// </summary>
public record CreateLecturerRequest(
    string Email,
    string Password,
    string FullName
);

/// <summary>
/// DTO yêu cầu đăng nhập.
/// </summary>
public record LoginRequest(
    string Email,
    string Password
);

/// <summary>
/// DTO yêu cầu làm mới Access Token bằng Refresh Token.
/// </summary>
public record RefreshTokenRequest(
    string RefreshToken
);

/// <summary>
/// DTO yêu cầu đăng xuất và thu hồi Refresh Token.
/// </summary>
public record LogoutRequest(
    string RefreshToken
);

/// <summary>
/// DTO yêu cầu xác thực email bằng mã OTP (Gate H).
/// </summary>
public record VerifyEmailRequest(
    string Email,
    string Otp
);

/// <summary>
/// DTO yêu cầu gửi lại mã xác thực email (Gate H).
/// </summary>
public record ResendVerificationRequest(
    string Email
);

/// <summary>
/// DTO yêu cầu gửi mã OTP để đặt lại mật khẩu.
/// </summary>
public record ForgotPasswordRequest(
    string Email
);

/// <summary>
/// DTO yêu cầu đặt lại mật khẩu bằng mã OTP và thiết lập mật khẩu mới.
/// </summary>
public record ResetPasswordRequest(
    string Email,
    string Otp,
    string NewPassword,
    string ConfirmNewPassword
);

/// <summary>
/// Tham số truy vấn danh sách tài khoản dành cho Quản trị viên (Admin).
/// </summary>
public record GetAccountsQuery(
    string? Search = null,
    AccountRole? Role = null,
    bool? IsActive = null,
    string SortBy = "createdAt",
    string SortDir = "desc",
    int Page = 1,
    int PageSize = 10
);
