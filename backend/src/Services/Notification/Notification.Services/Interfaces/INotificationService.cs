using Exe.BuildingBlocks.Paging;
using Notification.Services.DTOs;

namespace Notification.Services.Interfaces;

public interface INotificationService
{
    Task<PagedResult<NotificationResponse>> GetMyNotificationsAsync(
        NotificationQuery query,
        CancellationToken ct = default);

    Task<UnreadCountResponse> GetUnreadCountAsync(CancellationToken ct = default);

    Task<NotificationResponse> MarkAsReadAsync(Guid id, CancellationToken ct = default);

    Task<MarkAllReadResponse> MarkAllAsReadAsync(CancellationToken ct = default);
}
