namespace Report.Repository.Entities;

/// <summary>
/// Lưu các EventId đã xử lý để đảm bảo tính idempotent cho consumer.
/// </summary>
public class ProcessedEvent
{
    public Guid EventId { get; set; }
    public DateTime ProcessedAt { get; set; }
}
