using Auth.Repository.Data;
using Auth.Repository.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

namespace Auth.Repository.Implementations;

/// <summary>
/// Triển khai IUnitOfWork dùng chung transaction với AuthDbContext.
/// </summary>
public class UnitOfWork : IUnitOfWork
{
    private readonly AuthDbContext _db;

    public UnitOfWork(AuthDbContext db)
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
        await ExecuteInTransactionAsync(action, System.Data.IsolationLevel.ReadCommitted, ct);
    }

    public async Task ExecuteInTransactionAsync(Func<Task> action, System.Data.IsolationLevel isolationLevel, CancellationToken ct = default)
    {
        var strategy = _db.Database.CreateExecutionStrategy();
        await strategy.ExecuteAsync(async () =>
        {
            await using var transaction = await _db.Database.BeginTransactionAsync(isolationLevel, ct);
            await action();
            await transaction.CommitAsync(ct);
        });
    }
}
