using Notification.Repository.Enums;

namespace Notification.Repository.Entities;

/// <summary>
/// Thông báo trong ứng dụng gửi tới người dùng (CLAUDE.md mục 6).
/// </summary>
public class NotificationEntity
{
    public Guid Id { get; set; }
    public Guid RecipientId { get; set; }
    public NotificationType Type { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public Guid? RelatedEntityId { get; set; }
    public bool IsRead { get; set; }
    public DateTime CreatedAt { get; set; }
}
