using Project.Repository.Enums;

namespace Project.Services.DTOs;

// ─────────────────────────────────────────────────────────────────────────────
// REQUEST DTOs — dữ liệu từ client gửi lên
// ─────────────────────────────────────────────────────────────────────────────

/// <summary>Body request khi sinh viên tạo ý tưởng dự án mới.</summary>
public record CreateProjectRequest(
    string Title,
    string Problem,
    string Solution,
    ProjectDomain Domain,
    List<string>? Tags
);

/// <summary>Body request khi chủ dự án chỉnh sửa thông tin ý tưởng.</summary>
public record UpdateProjectRequest(
    string Title,
    string Problem,
    string Solution,
    ProjectDomain Domain,
    ProjectStatus Status,
    List<string>? Tags
);

// ─────────────────────────────────────────────────────────────────────────────
// QUERY PARAMS — tham số lọc / phân trang khi lấy danh sách
// ─────────────────────────────────────────────────────────────────────────────

/// <summary>Tham số lọc & phân trang khi gọi GET /api/projects.</summary>
public record GetProjectsQuery(
    string? Search = null,
    ProjectDomain? Domain = null,
    ProjectStatus? Status = null,
    Guid? OwnerId = null,
    string SortBy = "createdAt",
    string SortDir = "desc",
    int Page = 1,
    int PageSize = 10
);

// ─────────────────────────────────────────────────────────────────────────────
// RESPONSE DTOs — dữ liệu trả về cho client
// ─────────────────────────────────────────────────────────────────────────────

/// <summary>Thông tin đầy đủ của một ý tưởng dự án — dùng trong GET /projects/{id}.</summary>
public record ProjectResponse(
    Guid Id,
    Guid OwnerId,
    string Title,
    string Problem,
    string Solution,
    string Domain,
    string Status,
    List<string> Tags,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

/// <summary>Thông tin tóm gọn của dự án — dùng trong danh sách GET /projects.</summary>
public record ProjectSummaryResponse(
    Guid Id,
    Guid OwnerId,
    string Title,
    string Domain,
    string Status,
    List<string> Tags,
    DateTime CreatedAt
);

/// <summary>Response phân trang chuẩn dùng trong toàn hệ thống (CLAUDE.md mục 10).</summary>
public record PagedProjectResponse(
    IEnumerable<ProjectSummaryResponse> Items,
    int Page,
    int PageSize,
    int TotalCount,
    int TotalPages
);
