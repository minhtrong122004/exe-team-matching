using Microsoft.EntityFrameworkCore;
using User.Repository.Data;
using User.Repository.Entities;
using User.Repository.Interfaces;

namespace User.Repository.Implementations;

/// <summary>
/// Triển khai kiểm tra và lưu vết ProcessedEvent bằng EF Core cho Idempotent Consumer.
/// </summary>
public class ProcessedEventRepository : IProcessedEventRepository
{
    private readonly UserDbContext _context;

    public ProcessedEventRepository(UserDbContext context)
    {
        _context = context;
    }

    public async Task<bool> HasBeenProcessedAsync(Guid eventId, CancellationToken ct = default)
    {
        return await _context.ProcessedEvents
            .AnyAsync(e => e.EventId == eventId, ct);
    }

    public async Task AddAsync(ProcessedEvent processedEvent, CancellationToken ct = default)
    {
        await _context.ProcessedEvents.AddAsync(processedEvent, ct);
    }
}
