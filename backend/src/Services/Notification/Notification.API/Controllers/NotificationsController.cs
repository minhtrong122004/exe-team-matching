using Exe.BuildingBlocks.Paging;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Notification.Services.DTOs;
using Notification.Services.Interfaces;

namespace Notification.API.Controllers;

/// <summary>
/// Quản lý thông báo của người dùng hiện tại (CLAUDE.md mục 6).
/// </summary>
[ApiController]
[Route("api/notifications")]
[Authorize]
public class NotificationsController : ControllerBase
{
    private readonly INotificationService _notificationService;

    public NotificationsController(INotificationService notificationService)
    {
        _notificationService = notificationService;
    }

    /// <summary>Danh sách thông báo của người dùng hiện tại (lọc isRead, phân trang).</summary>
    [HttpGet]
    [ProducesResponseType(typeof(PagedResult<NotificationResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResult<NotificationResponse>>> GetMyNotifications(
        [FromQuery] NotificationQuery query,
        CancellationToken ct)
    {
        var result = await _notificationService.GetMyNotificationsAsync(query, ct);
        return Ok(result);
    }

    /// <summary>Số lượng thông báo chưa đọc của người dùng hiện tại.</summary>
    [HttpGet("unread-count")]
    [ProducesResponseType(typeof(UnreadCountResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<UnreadCountResponse>> GetUnreadCount(CancellationToken ct)
    {
        var result = await _notificationService.GetUnreadCountAsync(ct);
        return Ok(result);
    }

    /// <summary>Đánh dấu một thông báo là đã đọc.</summary>
    [HttpPut("{id:guid}/read")]
    [ProducesResponseType(typeof(NotificationResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<NotificationResponse>> MarkAsRead(Guid id, CancellationToken ct)
    {
        var result = await _notificationService.MarkAsReadAsync(id, ct);
        return Ok(result);
    }

    /// <summary>Đánh dấu tất cả thông báo của người dùng hiện tại là đã đọc.</summary>
    [HttpPut("read-all")]
    [ProducesResponseType(typeof(MarkAllReadResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<MarkAllReadResponse>> MarkAllAsRead(CancellationToken ct)
    {
        var result = await _notificationService.MarkAllAsReadAsync(ct);
        return Ok(result);
    }
}
