using Microsoft.EntityFrameworkCore.Storage;

namespace Auth.Repository.Interfaces;

/// <summary>
/// Quản lý giao dịch nguyên tử (Atomic Unit of Work) cho các thao tác ghi đồng thời (Account + OutboxMessage).
/// </summary>
public interface IUnitOfWork
{
    Task<IDbContextTransaction> BeginTransactionAsync(CancellationToken ct = default);

    Task<int> SaveChangesAsync(CancellationToken ct = default);

    /// <summary>
    /// Thực thi một hành động bên trong transaction tương thích với SqlServerRetryingExecutionStrategy.
    /// </summary>
    Task ExecuteInTransactionAsync(Func<Task> action, CancellationToken ct = default);

    /// <summary>
    /// Thực thi một hành động bên trong transaction với mức cô lập (IsolationLevel) chỉ định.
    /// </summary>
    Task ExecuteInTransactionAsync(Func<Task> action, System.Data.IsolationLevel isolationLevel, CancellationToken ct = default);
}
