namespace Notification.Repository.Entities;

/// <summary>
/// Lưu vết sự kiện đã xử lý để đảm bảo tính Idempotent của consumer (CLAUDE.md mục 6, 7).
/// </summary>
public class ProcessedEvent
{
    public Guid EventId { get; set; }
    public DateTime ProcessedAt { get; set; }
}
