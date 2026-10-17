using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using User.Repository.Data;
using User.Repository.Interfaces;

namespace User.Repository.Implementations;

/// <summary>
/// Triển khai IUserUnitOfWork dùng chung transaction với UserDbContext,
/// tương thích với SqlServerRetryingExecutionStrategy.
/// </summary>
public class UserUnitOfWork : IUserUnitOfWork
{
    private readonly UserDbContext _db;

    public UserUnitOfWork(UserDbContext db)
    {
        _db = db;
    }

    public async Task<IDbContextTransaction> BeginTransactionAsync(CancellationToken ct = default)
    {
        return await _db.Database.BeginTransactionAsync(ct);
    }

    public async Task<int> SaveChangesAsync(CancellationToken ct = default)
    {
        return await _db.SaveChangesAsync(ct);
    }

    public async Task ExecuteInTransactionAsync(Func<Task> action, CancellationToken ct = default)
    {
        var strategy = _db.Database.CreateExecutionStrategy();
        await strategy.ExecuteAsync(async () =>
        {
            await using var transaction = await _db.Database.BeginTransactionAsync(ct);
            await action();
            await transaction.CommitAsync(ct);
        });
    }

    public async Task<TResult> ExecuteInTransactionAsync<TResult>(Func<Task<TResult>> action, CancellationToken ct = default)
    {
        var strategy = _db.Database.CreateExecutionStrategy();
        return await strategy.ExecuteAsync(async () =>
        {
            await using var transaction = await _db.Database.BeginTransactionAsync(ct);
            var result = await action();
            await transaction.CommitAsync(ct);
            return result;
        });
    }
}
