using Exe.BuildingBlocks.Paging;
using Microsoft.AspNetCore.Mvc;
using Notification.API.Controllers;
using Notification.Services.DTOs;
using Notification.Services.Interfaces;

namespace Notification.Services.Tests;

public class NotificationsControllerTests
{
    [Fact]
    public async Task GetMyNotifications_ReturnsOkWithPagedResult()
    {
        var expected = new PagedResult<NotificationResponse>(
        [
            new NotificationResponse(
                Guid.NewGuid(),
                Guid.NewGuid(),
                "Welcome",
                "Welcome",
                "Hello",
                null,
                false,
                DateTime.UtcNow)
        ], 1, 20, 1);

        var controller = new NotificationsController(new StubNotificationService { PagedResult = expected });

        var result = await controller.GetMyNotifications(new NotificationQuery(), CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        Assert.Same(expected, ok.Value);
    }

    [Fact]
    public async Task GetUnreadCount_ReturnsOkWithCount()
    {
        var expected = new UnreadCountResponse(4);
        var controller = new NotificationsController(new StubNotificationService { UnreadCount = expected });

        var result = await controller.GetUnreadCount(CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        Assert.Equal(expected, ok.Value);
    }

    [Fact]
    public async Task MarkAsRead_ReturnsOkWithUpdatedNotification()
    {
        var id = Guid.NewGuid();
        var expected = new NotificationResponse(id, Guid.NewGuid(), "Welcome", "Welcome", "Hello", null, true, DateTime.UtcNow);
        var controller = new NotificationsController(new StubNotificationService { MarkedItem = expected });

        var result = await controller.MarkAsRead(id, CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        Assert.Equal(expected, ok.Value);
    }

    [Fact]
    public async Task MarkAllAsRead_ReturnsOkWithUpdatedCount()
    {
        var expected = new MarkAllReadResponse(5);
        var controller = new NotificationsController(new StubNotificationService { MarkAllResult = expected });

        var result = await controller.MarkAllAsRead(CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        Assert.Equal(expected, ok.Value);
    }

    private sealed class StubNotificationService : INotificationService
    {
        public PagedResult<NotificationResponse> PagedResult { get; set; } = new([], 1, 20, 0);
        public UnreadCountResponse UnreadCount { get; set; } = new(0);
        public NotificationResponse MarkedItem { get; set; } = new(Guid.Empty, Guid.Empty, "Welcome", "", "", null, true, DateTime.UtcNow);
        public MarkAllReadResponse MarkAllResult { get; set; } = new(0);

        public Task<PagedResult<NotificationResponse>> GetMyNotificationsAsync(NotificationQuery query, CancellationToken ct = default) =>
            Task.FromResult(PagedResult);

        public Task<UnreadCountResponse> GetUnreadCountAsync(CancellationToken ct = default) =>
            Task.FromResult(UnreadCount);

        public Task<NotificationResponse> MarkAsReadAsync(Guid id, CancellationToken ct = default) =>
            Task.FromResult(MarkedItem);

        public Task<MarkAllReadResponse> MarkAllAsReadAsync(CancellationToken ct = default) =>
            Task.FromResult(MarkAllResult);
    }
}
