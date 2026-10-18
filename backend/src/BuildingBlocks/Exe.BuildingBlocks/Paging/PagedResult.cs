namespace Exe.BuildingBlocks.Paging;

/// <summary>
/// Response phân trang chung:
/// <c>{ "items": [...], "page": 1, "pageSize": 10, "totalCount": 42, "totalPages": 5, "hasPrevious": false, "hasNext": true }</c>
/// </summary>
public sealed record PagedResult<T>(IReadOnlyList<T> Items, int Page, int PageSize, int TotalCount)
{
    public int TotalPages => PageSize <= 0 ? 0 : (int)Math.Ceiling(TotalCount / (double)PageSize);
    public bool HasPrevious => Page > 1;
    public bool HasNext => Page < TotalPages;

    /// <summary>Đổi kiểu phần tử, ví dụ entity → DTO: <c>page.Map(p =&gt; p.ToResponse())</c>.</summary>
    public PagedResult<TOut> Map<TOut>(Func<T, TOut> selector) =>
        new(Items.Select(selector).ToList(), Page, PageSize, TotalCount);

    public static PagedResult<T> Empty(int page, int pageSize) => new([], page, pageSize, 0);

    /// <summary>Factory method khởi tạo PagedResult tương thích với Auth và User Service.</summary>
    public static PagedResult<T> Create(IReadOnlyList<T> items, int page, int pageSize, int totalCount) =>
        new(items, page, pageSize, totalCount);
}
