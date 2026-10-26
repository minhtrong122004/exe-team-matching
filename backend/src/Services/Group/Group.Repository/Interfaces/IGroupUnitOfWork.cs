namespace Group.Repository.Interfaces;

/// <summary>
/// Commit mọi thay đổi đang được track trong một lần SaveChanges (một transaction của SQL Server).
/// </summary>
public interface IGroupUnitOfWork
{
    /// <summary>
    /// Lưu thay đổi. Ném <see cref="ConcurrencyConflictException"/> khi Group.RowVersion, JoinRequest.Status
    /// hoặc Invitation.Status đã bị thao tác khác đổi,
    /// và <see cref="UniqueConstraintViolationException"/> khi vi phạm một unique index.
    /// </summary>
    Task SaveChangesAsync(CancellationToken ct = default);

    /// <summary>Bỏ mọi entity đang track, dùng trước khi tải lại dữ liệu để thử lại sau xung đột.</summary>
    void ClearTracking();
}

/// <summary>
/// Bọc DbUpdateConcurrencyException để lớp Services không phụ thuộc EF Core.
/// </summary>
public sealed class ConcurrencyConflictException(Exception inner)
    : Exception("The data was modified by another operation.", inner);

/// <summary>
/// Bọc lỗi trùng unique index của SQL Server (2601/2627). <see cref="IndexName"/> cho lớp Services biết
/// business rule nào bị vi phạm (so với hằng số trong <c>GroupIndexes</c>).
/// </summary>
public sealed class UniqueConstraintViolationException(string? indexName, Exception inner)
    : Exception($"Unique index '{indexName}' was violated.", inner)
{
    public string? IndexName { get; } = indexName;
}
