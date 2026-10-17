namespace Exe.BuildingBlocks.Paging;

/// <summary>
/// Tham số phân trang, tìm kiếm và sắp xếp chuẩn (CLAUDE.md mục 10).
/// GET /api/users?search=&major=&skill=&availability=&sortBy=&sortDir=&page=&pageSize=
/// </summary>
public record PagedRequest(
    string? Search = null,
    string? SortBy = null,
    string SortDir = "asc",
    int Page = 1,
    int PageSize = 10
);
