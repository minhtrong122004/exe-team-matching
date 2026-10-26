using Exe.BuildingBlocks.Paging;
using Group.Repository.Enums;

namespace Group.Services.DTOs;

// ─────────────────────────────────────────────────────────────────────────────
// REQUEST
// ─────────────────────────────────────────────────────────────────────────────

/// <summary>POST /api/groups — sinh viên tạo nhóm cho dự án mình sở hữu (BR-11), có thể kèm vị trí cần tuyển.</summary>
public record CreateGroupRequest(
    string Name,
    string? Description,
    Guid ProjectId,
    int MaxMembers,
    List<SlotRequest>? Slots);

/// <summary>PUT /api/groups/{id} — trưởng nhóm sửa thông tin nhóm.</summary>
public record UpdateGroupRequest(string Name, string? Description, int MaxMembers);

/// <summary>POST/PUT /api/groups/{id}/slots — vị trí cần tuyển.</summary>
/// <param name="RequiredMajor">SE | AI | IA | GD | MKT | IB | Other, bỏ trống nếu không yêu cầu.</param>
public record SlotRequest(string? RequiredMajor, List<string>? RequiredSkills, int Quantity);

/// <summary>PUT /api/groups/{id}/leader — chuyển quyền trưởng nhóm cho một thành viên khác.</summary>
public record TransferLeaderRequest(Guid NewLeaderId);

/// <summary>
/// GET /api/groups?search=&amp;status=&amp;domain=&amp;major=&amp;sortBy=&amp;sortDir=&amp;page=&amp;pageSize=
/// sortBy: name | memberCount | maxMembers | createdAt (mặc định, desc).
/// </summary>
public class GroupQuery : PagedRequest
{
    public GroupQuery()
    {
        SortBy = "createdAt";
        SortDir = "desc";
    }

    /// <summary>Tìm trong tên và mô tả nhóm.</summary>
    public string? Search { get; set; }

    /// <summary>Mặc định ẩn nhóm Disbanded.</summary>
    public GroupStatus? Status { get; set; }

    /// <summary>Lĩnh vực dự án: EdTech | FinTech | ECommerce | FnB | Health | Tourism | Other.</summary>
    public string? Domain { get; set; }

    /// <summary>Chỉ lấy nhóm còn vị trí trống cần chuyên ngành này.</summary>
    public string? Major { get; set; }
}

// ─────────────────────────────────────────────────────────────────────────────
// RESPONSE
// ─────────────────────────────────────────────────────────────────────────────

/// <summary>Một dòng trong danh sách nhóm.</summary>
public record GroupSummaryResponse(
    Guid Id,
    string Name,
    string? Description,
    Guid LeaderId,
    string LeaderName,
    Guid ProjectId,
    string ProjectDomain,
    int MemberCount,
    int MaxMembers,
    string Status,
    IReadOnlyList<string> OpenMajors,
    IReadOnlyList<string> OpenSkills,
    DateTime CreatedAt);

/// <summary>Chi tiết nhóm: thành viên và vị trí tuyển.</summary>
public record GroupDetailResponse(
    Guid Id,
    string Name,
    string? Description,
    Guid LeaderId,
    string LeaderName,
    Guid ProjectId,
    string ProjectDomain,
    int MemberCount,
    int MaxMembers,
    string Status,
    IReadOnlyList<MemberResponse> Members,
    IReadOnlyList<SlotResponse> Slots,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public record MemberResponse(Guid UserId, string FullName, string Role, Guid? SlotId, DateTime JoinedAt);

public record SlotResponse(Guid Id, string? RequiredMajor, IReadOnlyList<string> RequiredSkills, int Quantity, int Filled);
