namespace Auth.Services.DTOs;

/// <summary>
/// DTO phản hồi xác thực chuẩn sau khi đăng ký, đăng nhập hoặc làm mới token.
/// Tương thích 100% với Frontend React/Vite (client.ts & AuthContext.tsx).
/// </summary>
public record AuthResponse(
    string AccessToken,
    string RefreshToken,
    AuthUserDto User
);

/// <summary>
/// Thông tin tài khoản định danh trong phiên làm việc.
/// </summary>
public record AuthUserDto(
    Guid Id,
    string Email,
    string FullName,
    string Role,
    bool MustChangePassword = false,
    bool HasAcceptedTerms = false,
    DateTime? AcceptedTermsAt = null,
    string? StudentCode = null
);

/// <summary>
/// DTO phản hồi chi tiết tài khoản cho /api/auth/me và danh sách tài khoản Moderator/Admin.
/// </summary>
public record AccountResponse(
    Guid Id,
    string Email,
    string FullName,
    string Role,
    bool IsActive,
    DateTime CreatedAt,
    DateTime? UpdatedAt = null,
    bool MustChangePassword = false,
    bool HasAcceptedTerms = false,
    DateTime? AcceptedTermsAt = null,
    string? StudentCode = null
);

/// <summary>
/// DTO phản hồi sau khi gửi yêu cầu đăng ký tài khoản (Gate H).
/// Tuyệt đối không trả về AccessToken hay RefreshToken trước khi xác thực email.
/// </summary>
public record RegisterResponse(
    string Message,
    string Email,
    DateTime ExpiresAt
);

/// <summary>
/// DTO phản hồi sau khi xác thực OTP thành công (Gate H).
/// </summary>
public record VerifyEmailResponse(
    string Message,
    string Email
);

/// <summary>
/// DTO phản hồi sau khi yêu cầu gửi lại mã xác thực OTP (Gate H).
/// </summary>
public record ResendVerificationResponse(
    string Message,
    string Email,
    int ResendCooldownSeconds,
    DateTime ExpiresAt
);

/// <summary>
/// DTO phản hồi sau khi gửi yêu cầu quên mật khẩu.
/// </summary>
public record ForgotPasswordResponse(
    string Message,
    string Email,
    int ResendCooldownSeconds,
    DateTime ExpiresAt
);

/// <summary>
/// DTO phản hồi sau khi đặt lại mật khẩu thành công.
/// </summary>
public record ResetPasswordResponse(
    string Message,
    string Email
);

/// <summary>
/// DTO phản hồi sau khi người dùng tự đổi mật khẩu thành công.
/// </summary>
public record ChangePasswordResponse(
    string Message,
    bool MustChangePassword
);

/// <summary>
/// DTO phản hồi sau khi sinh viên xác nhận đồng ý điều khoản ghép nhóm lần đầu (BR-34).
/// </summary>
public record AcceptTermsResponse(
    string Message,
    bool HasAcceptedTerms,
    DateTime AcceptedTermsAt
);

/// <summary>
/// Kết quả cấp phát tài khoản cho từng sinh viên trong danh sách FAP.
/// </summary>
public record ProvisionStudentResultItem(
    Guid AccountId,
    string StudentCode,
    string FullName,
    string Email,
    bool IsNewlyCreated,
    string StatusMessage
);

/// <summary>
/// Tổng hợp kết quả đồng bộ & cấp phát tài khoản sinh viên từ danh sách FAP (BR-01).
/// </summary>
public record ProvisionFapStudentsResponse(
    string SemesterCode,
    string SubjectCode,
    int TotalProcessed,
    int NewlyCreatedCount,
    int ExistingCount,
    IReadOnlyList<ProvisionStudentResultItem> Results
);
