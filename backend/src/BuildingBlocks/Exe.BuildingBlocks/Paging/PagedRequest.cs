namespace Exe.BuildingBlocks.Paging;

/// <summary>
/// Tham số phân trang và sắp xếp chung, bind từ query string:
/// <c>GET /api/projects?page=2&amp;pageSize=20&amp;sortBy=title&amp;sortDir=desc</c>.
/// API danh sách kế thừa class này và thêm tham số lọc riêng:
/// <code>
/// public class ProjectQuery : PagedRequest
/// {
///     public string? Search { get; set; }
///     public ProjectDomain? Domain { get; set; }
/// }
/// // Controller: public Task&lt;...&gt; Search([FromQuery] ProjectQuery query)
/// </code>
/// </summary>
public class PagedRequest
{
    public const int DefaultPageSize = 10;
    public const int MaxPageSize = 50;

    /// <summary>Trang hiện tại, bắt đầu từ 1.</summary>
    public int Page { get; set; } = 1;

    /// <summary>Số phần tử mỗi trang (1–50, mặc định 10).</summary>
    public int PageSize { get; set; } = DefaultPageSize;

    /// <summary>Tên field để sắp xếp; mỗi API tự quy định các giá trị hợp lệ.</summary>
    public string? SortBy { get; set; }

    /// <summary>asc | desc (mặc định asc).</summary>
    public string? SortDir { get; set; }

    /// <summary>Page đã chuẩn hóa (tối thiểu 1).</summary>
    public int NormalizedPage => Math.Max(1, Page);

    /// <summary>PageSize đã chuẩn hóa (1–50).</summary>
    public int NormalizedPageSize => Math.Clamp(PageSize, 1, MaxPageSize);

    public bool IsDescending => string.Equals(SortDir, "desc", StringComparison.OrdinalIgnoreCase);
}
