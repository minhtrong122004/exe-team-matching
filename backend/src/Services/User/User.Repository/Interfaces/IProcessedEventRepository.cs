using User.Repository.Entities;

namespace User.Repository.Interfaces;

/// <summary>
/// Interface kiểm tra và lưu vết sự kiện đã xử lý cho cơ chế Idempotent Consumer (CLAUDE.md mục 6, 7).
/// </summary>
public interface IProcessedEventRepository
{
    Task<bool> HasBeenProcessedAsync(Guid eventId, CancellationToken ct = default);
    Task AddAsync(ProcessedEvent processedEvent, CancellationToken ct = default);
}
