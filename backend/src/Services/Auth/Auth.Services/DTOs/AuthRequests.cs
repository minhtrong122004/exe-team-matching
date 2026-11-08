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
/// DTO yêu cầu khởi tạo tài khoản Giảng viên (Lecturer) hoặc Điều phối viên (Moderator) do Moderator/Admin thực hiện.
/// </summary>
public record CreateLecturerRequest(
    string Email,
    string Password,
    string FullName,
    string? Role = "Lecturer"
);

/// <summary>
/// DTO yêu cầu người dùng tự đổi mật khẩu khi đang đăng nhập (bao gồm lần đầu đăng nhập sau khi nhận mật khẩu từ FAP).
/// </summary>
public record ChangePasswordRequest(
    string CurrentPassword,
    string NewPassword,
    string ConfirmNewPassword
);

/// <summary>
/// DTO yêu cầu xác nhận đồng ý điều khoản ghép nhóm & sự điều phối của Moderator/Giảng viên lần đầu đăng nhập (BR-34).
/// </summary>
public record AcceptTermsRequest(
    bool Accepted = true
);

/// <summary>
/// Thông tin 1 sinh viên trong danh sách đồng bộ từ FAP (BR-01, BR-04).
/// </summary>
public record FapStudentImportItem(
    string StudentCode,
    string FullName,
    string Email,
    string? Major = null
);

/// <summary>
/// DTO yêu cầu cấp phát tài khoản hàng loạt cho danh sách sinh viên đủ điều kiện học EXE từ FAP (BR-01).
/// </summary>
public record ProvisionFapStudentsRequest(
    List<FapStudentImportItem> Students,
    string SemesterCode = "FA26",
    string SubjectCode = "EXE101"
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
