using Microsoft.EntityFrameworkCore;
using Report.Repository.Data;
using Report.Repository.Entities;
using Report.Repository.Interfaces;

namespace Report.Repository.Implementations;

public class ProcessedEventRepository : IProcessedEventRepository
{
    private readonly ReportDbContext _db;

    public ProcessedEventRepository(ReportDbContext db)
    {
        _db = db;
    }

    public Task<bool> ExistsAsync(Guid eventId, CancellationToken ct = default) =>
        _db.ProcessedEvents.AnyAsync(x => x.EventId == eventId, ct);

    public async Task AddAsync(ProcessedEvent processedEvent, CancellationToken ct = default) =>
        await _db.ProcessedEvents.AddAsync(processedEvent, ct);
}
