using System.Linq.Expressions;
using Exe.BuildingBlocks.Paging;
using Microsoft.EntityFrameworkCore;

namespace Exe.BuildingBlocks.Persistence;

/// <summary>
/// Dùng trong lớp Repository:
/// <code>
/// query = sortBy switch
/// {
///     "title" => query.OrderBy(p =&gt; p.Title, desc),
///     _       => query.OrderBy(p =&gt; p.CreatedAt, desc)
/// };
/// return await query.ToPagedResultAsync(page, pageSize, ct);
/// </code>
/// </summary>
public static class QueryableExtensions
{
    /// <summary>Sắp xếp tăng hoặc giảm theo tham số <paramref name="descending"/>.</summary>
    public static IOrderedQueryable<T> OrderBy<T, TKey>(this IQueryable<T> query,
        Expression<Func<T, TKey>> keySelector, bool descending) =>
        descending ? query.OrderByDescending(keySelector) : query.OrderBy(keySelector);

    /// <summary>Đếm tổng số dòng rồi lấy đúng một trang (query phải được sắp xếp trước).</summary>
    public static async Task<PagedResult<T>> ToPagedResultAsync<T>(this IQueryable<T> query,
        int page, int pageSize, CancellationToken cancellationToken = default)
    {
        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(cancellationToken);
        return new PagedResult<T>(items, page, pageSize, totalCount);
    }

    public static Task<PagedResult<T>> ToPagedResultAsync<T>(this IQueryable<T> query,
        PagedRequest request, CancellationToken cancellationToken = default) =>
        query.ToPagedResultAsync(request.NormalizedPage, request.NormalizedPageSize, cancellationToken);
}
