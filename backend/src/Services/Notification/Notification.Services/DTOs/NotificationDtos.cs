using Exe.BuildingBlocks.Paging;

namespace Notification.Services.DTOs;

public class NotificationQuery : PagedRequest
{
    public bool? IsRead { get; set; }
}

public sealed record NotificationResponse(
    Guid Id,
    Guid RecipientId,
    string Type,
    string Title,
    string Message,
    Guid? RelatedEntityId,
    bool IsRead,
    DateTime CreatedAt);

public sealed record UnreadCountResponse(int UnreadCount);

public sealed record MarkAllReadResponse(int UpdatedCount);

public sealed record EmailQueueProcessResult(int Processed, int Sent, int Failed);
