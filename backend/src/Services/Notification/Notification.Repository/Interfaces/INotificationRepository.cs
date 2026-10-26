using Exe.BuildingBlocks.Paging;
using Notification.Repository.Entities;

namespace Notification.Repository.Interfaces;

public interface INotificationRepository
{
    Task<PagedResult<NotificationEntity>> GetPagedByRecipientAsync(
        Guid recipientId,
        bool? isRead,
        int page,
        int pageSize,
        CancellationToken ct = default);

    Task<int> GetUnreadCountAsync(Guid recipientId, CancellationToken ct = default);

    Task<NotificationEntity?> GetByIdAsync(Guid id, CancellationToken ct = default);

    Task AddAsync(NotificationEntity notification, CancellationToken ct = default);

    void Update(NotificationEntity notification);

    Task<int> MarkAllAsReadAsync(Guid recipientId, CancellationToken ct = default);
}
