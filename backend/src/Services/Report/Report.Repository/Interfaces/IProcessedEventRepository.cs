using Report.Repository.Entities;

namespace Report.Repository.Interfaces;

public interface IProcessedEventRepository
{
    Task<bool> ExistsAsync(Guid eventId, CancellationToken ct = default);
    Task AddAsync(ProcessedEvent processedEvent, CancellationToken ct = default);
}
