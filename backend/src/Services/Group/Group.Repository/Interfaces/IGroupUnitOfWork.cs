namespace Group.Repository.Interfaces;

/// <summary>
/// Commit mọi thay đổi đang được track trong một lần SaveChanges (một transaction của SQL Server).
/// </summary>
public interface IGroupUnitOfWork
{
    /// <summary>
    /// Lưu thay đổi. Ném <see cref="ConcurrencyConflictException"/> khi Group.RowVersion đã bị thao tác khác đổi.
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
