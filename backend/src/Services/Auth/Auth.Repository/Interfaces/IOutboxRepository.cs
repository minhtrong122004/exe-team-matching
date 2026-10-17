using Auth.Repository.Entities;

namespace Auth.Repository.Interfaces;

/// <summary>
/// Hợp đồng Repository cho bản ghi OutboxMessage.
/// </summary>
public interface IOutboxRepository
{
    Task AddAsync(OutboxMessage message, CancellationToken ct = default);

    Task<IEnumerable<OutboxMessage>> GetPendingMessagesAsync(int batchSize, CancellationToken ct = default);

    Task UpdateAsync(OutboxMessage message, CancellationToken ct = default);
}
