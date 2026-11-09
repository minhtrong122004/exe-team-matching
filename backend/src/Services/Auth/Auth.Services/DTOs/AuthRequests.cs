using Auth.Repository.Enums;

namespace Auth.Services.DTOs;

/// <summary>
/// DTO yêu cầu khởi tạo tài khoản Giảng viên (Lecturer) hoặc Điều phối viên (Moderator) do Moderator thực hiện.
/// </summary>
public record CreateLecturerRequest(
    string Email,
    string FullName,
    string? Role = "Lecturer"
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
/// DTO yêu cầu đăng nhập bằng Google ID token nhận từ Google Identity Services.
/// </summary>
public record GoogleLoginRequest(
    string IdToken
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
/// Tham số truy vấn danh sách tài khoản dành cho Moderator.
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
