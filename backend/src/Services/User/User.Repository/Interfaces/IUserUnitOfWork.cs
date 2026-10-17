using Microsoft.EntityFrameworkCore.Storage;

namespace User.Repository.Interfaces;

/// <summary>
/// Interface quản lý giao dịch nguyên tử (Atomic Unit of Work) cho User Service.
/// </summary>
public interface IUserUnitOfWork
{
    Task<IDbContextTransaction> BeginTransactionAsync(CancellationToken ct = default);
    Task<int> SaveChangesAsync(CancellationToken ct = default);
    Task ExecuteInTransactionAsync(Func<Task> action, CancellationToken ct = default);
    Task<TResult> ExecuteInTransactionAsync<TResult>(Func<Task<TResult>> action, CancellationToken ct = default);
}
