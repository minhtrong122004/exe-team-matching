using Microsoft.EntityFrameworkCore;
using Notification.Repository.Data;
using Notification.Repository.Entities;
using Notification.Repository.Interfaces;

namespace Notification.Repository.Implementations;

public class ProcessedEventRepository(NotificationDbContext db) : IProcessedEventRepository
{
    public Task<bool> ExistsAsync(Guid eventId, CancellationToken ct = default) =>
        db.ProcessedEvents.AnyAsync(e => e.EventId == eventId, ct);

    public async Task AddAsync(ProcessedEvent processedEvent, CancellationToken ct = default) =>
        await db.ProcessedEvents.AddAsync(processedEvent, ct);
}
