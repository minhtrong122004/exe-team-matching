namespace Auth.Repository.Entities;

/// <summary>
/// Thực thể Transactional Outbox đảm bảo tính tin cậy tuyệt đối (At-Least-Once Delivery)
/// khi xuất bản sự kiện đăng ký (UserRegisteredEvent) sang Redis Streams mà không bị Dual-write hazard.
/// </summary>
public class OutboxMessage
{
    public Guid Id { get; set; }

    /// <summary>
    /// Tên loại sự kiện (ví dụ: "UserRegistered").
    /// </summary>
    public string EventType { get; set; } = string.Empty;

    /// <summary>
    /// Nội dung JSON của sự kiện (UserRegisteredEvent).
    /// </summary>
    public string Payload { get; set; } = string.Empty;

    /// <summary>
    /// Thời điểm thông điệp được tạo và lưu trong transaction cùng với Account (UTC).
    /// </summary>
    public DateTime CreatedAt { get; set; }

    /// <summary>
    /// Thời điểm thông điệp đã được xuất bản thành công lên Redis Streams (UTC).
    /// Null = Chưa được xuất bản (đang chờ worker xử lý).
    /// </summary>
    public DateTime? ProcessedAt { get; set; }

    /// <summary>
    /// Số lần thử xuất bản lại khi gặp lỗi mạng/Redis.
    /// </summary>
    public int RetryCount { get; set; } = 0;

    /// <summary>
    /// Chi tiết lỗi cuối cùng nếu xuất bản thất bại.
    /// </summary>
    public string? LastError { get; set; }
}
