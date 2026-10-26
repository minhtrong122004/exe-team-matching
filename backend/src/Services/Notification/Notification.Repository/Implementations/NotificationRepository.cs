using Exe.BuildingBlocks.Paging;
using Exe.BuildingBlocks.Persistence;
using Microsoft.EntityFrameworkCore;
using Notification.Repository.Data;
using Notification.Repository.Entities;
using Notification.Repository.Interfaces;

namespace Notification.Repository.Implementations;

public class NotificationRepository(NotificationDbContext db) : INotificationRepository
{
    public async Task<PagedResult<NotificationEntity>> GetPagedByRecipientAsync(
        Guid recipientId,
        bool? isRead,
        int page,
        int pageSize,
        CancellationToken ct = default)
    {
        var query = db.Notifications
            .AsNoTracking()
            .Where(n => n.RecipientId == recipientId);

        if (isRead.HasValue)
        {
            query = query.Where(n => n.IsRead == isRead.Value);
        }

        query = query.OrderByDescending(n => n.CreatedAt);
        return await query.ToPagedResultAsync(page, pageSize, ct);
    }

    public Task<int> GetUnreadCountAsync(Guid recipientId, CancellationToken ct = default) =>
        db.Notifications
            .AsNoTracking()
            .CountAsync(n => n.RecipientId == recipientId && !n.IsRead, ct);

    public Task<NotificationEntity?> GetByIdAsync(Guid id, CancellationToken ct = default) =>
        db.Notifications.FirstOrDefaultAsync(n => n.Id == id, ct);

    public async Task AddAsync(NotificationEntity notification, CancellationToken ct = default) =>
        await db.Notifications.AddAsync(notification, ct);

    public void Update(NotificationEntity notification) =>
        db.Notifications.Update(notification);

    public async Task<int> MarkAllAsReadAsync(Guid recipientId, CancellationToken ct = default)
    {
        var unread = await db.Notifications
            .Where(n => n.RecipientId == recipientId && !n.IsRead)
            .ToListAsync(ct);

        foreach (var item in unread)
        {
            item.IsRead = true;
        }

        return unread.Count;
    }
}
