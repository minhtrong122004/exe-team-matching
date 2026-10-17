namespace Exe.BuildingBlocks.Paging;

/// <summary>
/// Cấu trúc phản hồi phân trang chuẩn dùng chung trong toàn hệ thống (CLAUDE.md mục 10).
/// { "items": [...], "page": 1, "pageSize": 10, "totalCount": 42, "totalPages": 5 }
/// </summary>
public record PagedResult<T>(
    IReadOnlyList<T> Items,
    int Page,
    int PageSize,
    int TotalCount,
    int TotalPages
)
{
    public static PagedResult<T> Create(IReadOnlyList<T> items, int page, int pageSize, int totalCount)
    {
        var totalPages = pageSize > 0 ? (int)Math.Ceiling(totalCount / (double)pageSize) : 0;
        return new PagedResult<T>(items, page, pageSize, totalCount, totalPages);
    }
}
