using Auth.Repository.Data;
using Auth.Repository.Entities;
using Auth.Repository.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Auth.Repository.Implementations;

/// <summary>
/// Triển khai IOutboxRepository thao tác với bảng OutboxMessages.
/// </summary>
public class OutboxRepository : IOutboxRepository
{
    private readonly AuthDbContext _db;

    public OutboxRepository(AuthDbContext db)
    {
        _db = db;
    }

    public async Task AddAsync(OutboxMessage message, CancellationToken ct = default)
    {
        await _db.OutboxMessages.AddAsync(message, ct);
        await _db.SaveChangesAsync(ct);
    }

    public async Task<IEnumerable<OutboxMessage>> GetPendingMessagesAsync(int batchSize, CancellationToken ct = default)
    {
        return await _db.OutboxMessages
            .Where(m => m.ProcessedAt == null)
            .OrderBy(m => m.CreatedAt)
            .Take(batchSize)
            .ToListAsync(ct);
    }

    public async Task UpdateAsync(OutboxMessage message, CancellationToken ct = default)
    {
        _db.OutboxMessages.Update(message);
        await _db.SaveChangesAsync(ct);
    }
}
