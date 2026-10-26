using Exe.BuildingBlocks.Paging;
using Exe.BuildingBlocks.Web;
using Notification.Repository.Entities;
using Notification.Repository.Enums;
using Notification.Repository.Interfaces;
using Notification.Services.Interfaces;

namespace Notification.Services.Tests.TestDoubles;

public sealed class FakeCurrentUser : ICurrentUser
{
    public bool IsAuthenticated { get; set; } = true;
    public Guid UserId { get; set; } = Guid.NewGuid();
    public string? Email { get; set; } = "student@fpt.edu.vn";
    public string? FullName { get; set; } = "Nguyen Van A";
    public string? Role { get; set; } = "Student";

    public bool IsInRole(string role) =>
        string.Equals(Role, role, StringComparison.OrdinalIgnoreCase);
}

public sealed class FakeNotificationRepository : INotificationRepository
{
    public List<NotificationEntity> Items { get; } = [];

    public Task<PagedResult<NotificationEntity>> GetPagedByRecipientAsync(
        Guid recipientId,
        bool? isRead,
        int page,
        int pageSize,
        CancellationToken ct = default)
    {
        var query = Items.Where(n => n.RecipientId == recipientId);
        if (isRead.HasValue)
        {
            query = query.Where(n => n.IsRead == isRead.Value);
        }

        var ordered = query.OrderByDescending(n => n.CreatedAt).ToList();
        var paged = ordered.Skip((page - 1) * pageSize).Take(pageSize).ToList();
        return Task.FromResult(PagedResult<NotificationEntity>.Create(paged, page, pageSize, ordered.Count));
    }

    public Task<int> GetUnreadCountAsync(Guid recipientId, CancellationToken ct = default) =>
        Task.FromResult(Items.Count(n => n.RecipientId == recipientId && !n.IsRead));

    public Task<NotificationEntity?> GetByIdAsync(Guid id, CancellationToken ct = default) =>
        Task.FromResult(Items.FirstOrDefault(n => n.Id == id));

    public Task AddAsync(NotificationEntity notification, CancellationToken ct = default)
    {
        Items.Add(notification);
        return Task.CompletedTask;
    }

    public void Update(NotificationEntity notification)
    {
        var idx = Items.FindIndex(n => n.Id == notification.Id);
        if (idx >= 0) Items[idx] = notification;
    }

    public Task<int> MarkAllAsReadAsync(Guid recipientId, CancellationToken ct = default)
    {
        var unread = Items.Where(n => n.RecipientId == recipientId && !n.IsRead).ToList();
        foreach (var item in unread)
        {
            item.IsRead = true;
        }
        return Task.FromResult(unread.Count);
    }
}

public sealed class FakeEmailLogRepository : IEmailLogRepository
{
    public List<EmailLog> Items { get; } = [];

    public Task AddAsync(EmailLog emailLog, CancellationToken ct = default)
    {
        Items.Add(emailLog);
        return Task.CompletedTask;
    }

    public Task<IReadOnlyList<EmailLog>> GetPendingOrRetryableAsync(
        int maxAttempts,
        int batchSize,
        CancellationToken ct = default)
    {
        IReadOnlyList<EmailLog> result = Items
            .Where(e => e.Status == EmailStatus.Pending || (e.Status == EmailStatus.Failed && e.Attempts < maxAttempts))
            .OrderBy(e => e.CreatedAt)
            .Take(batchSize)
            .ToList();
        return Task.FromResult(result);
    }

    public void Update(EmailLog emailLog)
    {
        var idx = Items.FindIndex(e => e.Id == emailLog.Id);
        if (idx >= 0) Items[idx] = emailLog;
    }
}

public sealed class FakeProcessedEventRepository : IProcessedEventRepository
{
    public HashSet<Guid> ProcessedIds { get; } = [];

    public Task<bool> ExistsAsync(Guid eventId, CancellationToken ct = default) =>
        Task.FromResult(ProcessedIds.Contains(eventId));

    public Task AddAsync(ProcessedEvent processedEvent, CancellationToken ct = default)
    {
        ProcessedIds.Add(processedEvent.EventId);
        return Task.CompletedTask;
    }
}

public sealed class FakeNotificationUnitOfWork : INotificationUnitOfWork
{
    public int SaveChangesCount { get; private set; }

    public Task<int> SaveChangesAsync(CancellationToken ct = default)
    {
        SaveChangesCount++;
        return Task.FromResult(1);
    }
}

public sealed class FakeSmtpEmailSender : ISmtpEmailSender
{
    public List<(string To, string Subject, string Body)> SentEmails { get; } = [];
    public Exception? ExceptionToThrow { get; set; }

    public Task SendEmailAsync(string toEmail, string subject, string htmlBody, CancellationToken ct = default)
    {
        if (ExceptionToThrow is not null)
        {
            throw ExceptionToThrow;
        }

        SentEmails.Add((toEmail, subject, htmlBody));
        return Task.CompletedTask;
    }
}
