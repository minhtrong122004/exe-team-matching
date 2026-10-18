using Exe.BuildingBlocks.Paging;
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

/// <summary>
/// GET /api/projects?search=&amp;domain=&amp;status=&amp;ownerId=&amp;sortBy=&amp;sortDir=&amp;page=&amp;pageSize=
/// Page, PageSize, SortBy, SortDir kế thừa từ PagedRequest (BuildingBlocks).
/// </summary>
public class ProjectQuery : PagedRequest
{
    public ProjectQuery()
    {
        SortBy = "createdAt"; // mặc định: mới nhất trước
        SortDir = "desc";
    }

    /// <summary>Tìm trong Title và Problem.</summary>
    public string? Search { get; set; }

    public ProjectDomain? Domain { get; set; }
    public ProjectStatus? Status { get; set; }
    public Guid? OwnerId { get; set; }
}

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

/// <summary>Thông tin tóm gọn của dự án — dùng trong danh sách GET /projects (bọc trong PagedResult).</summary>
public record ProjectSummaryResponse(
    Guid Id,
    Guid OwnerId,
    string Title,
    string Domain,
    string Status,
    List<string> Tags,
    DateTime CreatedAt
);
