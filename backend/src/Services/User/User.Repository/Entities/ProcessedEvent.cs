namespace User.Repository.Entities;

/// <summary>
/// Bảng ghi nhận sự kiện đã xử lý của User Service để đảm bảo tính Idempotent (CLAUDE.md mục 6, 7).
/// Giúp consumer bỏ qua các sự kiện trùng lặp khi Redis Streams gửi lại bản tin.
/// </summary>
public class ProcessedEvent
{
    /// <summary>
    /// Mã định danh duy nhất của sự kiện (EventId nhận từ event message). Khóa chính, không tự tăng.
    /// </summary>
    public Guid EventId { get; set; }

    /// <summary>
    /// Loại sự kiện (ví dụ: UserRegistered, MemberJoined, MemberLeft).
    /// </summary>
    public string EventType { get; set; } = string.Empty;

    /// <summary>
    /// Thời điểm sự kiện được xử lý và lưu vào cơ sở dữ liệu thành công (UTC).
    /// </summary>
    public DateTime ProcessedAt { get; set; }
}
