using Exe.BuildingBlocks.Paging;
using Exe.BuildingBlocks.Web;
using Notification.Repository.Entities;
using Notification.Repository.Interfaces;
using Notification.Services.DTOs;
using Notification.Services.Interfaces;

namespace Notification.Services.Implementations;

public class NotificationService : INotificationService
{
    private readonly INotificationRepository _notificationRepo;
    private readonly INotificationUnitOfWork _unitOfWork;
    private readonly ICurrentUser _currentUser;

    public NotificationService(
        INotificationRepository notificationRepo,
        INotificationUnitOfWork unitOfWork,
        ICurrentUser currentUser)
    {
        _notificationRepo = notificationRepo;
        _unitOfWork = unitOfWork;
        _currentUser = currentUser;
    }

    public async Task<PagedResult<NotificationResponse>> GetMyNotificationsAsync(NotificationQuery query, CancellationToken ct = default)
    {
        var paged = await _notificationRepo.GetPagedByRecipientAsync(
            _currentUser.UserId,
            query.IsRead,
            query.NormalizedPage,
            query.NormalizedPageSize,
            ct);
        var items = paged.Items.Select(MapToResponse).ToList();
        return new PagedResult<NotificationResponse>(items, paged.Page, paged.PageSize, paged.TotalCount);
    }

    public async Task<UnreadCountResponse> GetUnreadCountAsync(CancellationToken ct = default)
    {
        var count = await _notificationRepo.GetUnreadCountAsync(_currentUser.UserId, ct);
        return new UnreadCountResponse(count);
    }

    public async Task<NotificationResponse> MarkAsReadAsync(Guid id, CancellationToken ct = default)
    {
        var notification = await _notificationRepo.GetByIdAsync(id, ct)
            ?? throw new NotFoundException($"Notification '{id}' was not found.");

        if (notification.RecipientId != _currentUser.UserId)
        {
            throw new ForbiddenException("You do not have permission to modify this notification.");
        }

        if (!notification.IsRead)
        {
            notification.IsRead = true;
            _notificationRepo.Update(notification);
            await _unitOfWork.SaveChangesAsync(ct);
        }

        return MapToResponse(notification);
    }

    public async Task<MarkAllReadResponse> MarkAllAsReadAsync(CancellationToken ct = default)
    {
        var updatedCount = await _notificationRepo.MarkAllAsReadAsync(_currentUser.UserId, ct);
        await _unitOfWork.SaveChangesAsync(ct);
        return new MarkAllReadResponse(updatedCount);
    }

    private static NotificationResponse MapToResponse(NotificationEntity entity) =>
        new(
            entity.Id,
            entity.RecipientId,
            entity.Type.ToString(),
            entity.Title,
            entity.Message,
            entity.RelatedEntityId,
            entity.IsRead,
            entity.CreatedAt);
}
