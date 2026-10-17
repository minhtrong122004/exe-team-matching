using User.Repository.Enums;

namespace User.Services.DTOs;

/// <summary>
/// DTO phản hồi chi tiết hồ sơ người dùng (CLAUDE.md mục 6, 10).
/// Dành riêng cho chính chủ (GET /api/users/me) với đầy đủ thông tin cá nhân.
/// </summary>
public record UserProfileResponse(
    Guid UserId,
    string Email,
    string FullName,
    string Role,
    string? StudentCode,
    string? Campus,
    Major? Major,
    string? Bio,
    string? DesiredRole,
    UserAvailability Availability,
    IReadOnlyList<string> Interests,
    IReadOnlyList<UserSkillResponse> Skills,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

/// <summary>
/// DTO phản hồi hồ sơ ứng viên công khai (GET /api/users, GET /api/users/{id}, POST /api/users/batch).
/// Tuyệt đối loại bỏ Email và StudentCode để bảo vệ PII của sinh viên trong tìm kiếm và ghép nhóm.
/// </summary>
public record CandidateProfileResponse(
    Guid UserId,
    string FullName,
    string Role,
    string? Campus,
    Major? Major,
    string? Bio,
    string? DesiredRole,
    UserAvailability Availability,
    IReadOnlyList<string> Interests,
    IReadOnlyList<UserSkillResponse> Skills,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

/// <summary>
/// DTO yêu cầu cập nhật hồ sơ người dùng (PUT /api/users/me).
/// Không chứa UserId, Email hay Role để ngăn chặn client giả mạo các trường do hệ thống sở hữu.
/// </summary>
public record UpdateUserProfileRequest(
    string FullName,
    string? StudentCode = null,
    string? Campus = null,
    Major? Major = null,
    string? Bio = null,
    string? DesiredRole = null,
    UserAvailability Availability = UserAvailability.LookingForTeam,
    List<string>? Interests = null
);

/// <summary>
/// Bộ lọc tham số tìm kiếm và phân trang danh sách người dùng (GET /api/users).
/// </summary>
public record UserSearchFilter(
    string? Search = null,
    Major? Major = null,
    string? Skill = null,
    UserAvailability? Availability = null,
    string? SortBy = null,
    string SortDir = "asc",
    int Page = 1,
    int PageSize = 10
);

/// <summary>
/// Yêu cầu lấy thông tin hàng loạt hồ sơ theo danh sách UserId (POST /api/users/batch - Group Service dùng).
/// </summary>
public record BatchUsersRequest(
    List<Guid> UserIds
);

/// <summary>
/// Yêu cầu nội bộ khởi tạo hồ sơ người dùng trống (khi nhận event UserRegistered từ Auth Service).
/// </summary>
public record CreateUserProfileInternalRequest(
    Guid UserId,
    string Email,
    string FullName,
    string Role
);
