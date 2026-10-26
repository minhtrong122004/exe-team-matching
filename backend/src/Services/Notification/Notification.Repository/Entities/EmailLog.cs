using Notification.Repository.Enums;

namespace Notification.Repository.Entities;

/// <summary>
/// Nhật ký và hàng đợi gửi email qua SMTP MailHog (CLAUDE.md mục 6).
/// </summary>
public class EmailLog
{
    public Guid Id { get; set; }
    public string To { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public EmailStatus Status { get; set; } = EmailStatus.Pending;
    public int Attempts { get; set; }
    public string? LastError { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? SentAt { get; set; }
}
