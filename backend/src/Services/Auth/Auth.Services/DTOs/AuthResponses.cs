namespace Auth.Services.DTOs;

/// <summary>
/// DTO phản hồi xác thực chuẩn sau khi đăng nhập hoặc làm mới token.
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
    bool HasAcceptedTerms = false,
    DateTime? AcceptedTermsAt = null,
    string? StudentCode = null
);

/// <summary>
/// DTO phản hồi chi tiết tài khoản cho /api/auth/me và danh sách tài khoản của Moderator.
/// </summary>
public record AccountResponse(
    Guid Id,
    string Email,
    string FullName,
    string Role,
    bool IsActive,
    DateTime CreatedAt,
    DateTime? UpdatedAt = null,
    bool HasAcceptedTerms = false,
    DateTime? AcceptedTermsAt = null,
    string? StudentCode = null
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
