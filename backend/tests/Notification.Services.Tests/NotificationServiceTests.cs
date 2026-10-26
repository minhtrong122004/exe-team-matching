using Exe.BuildingBlocks.Web;
using Notification.Repository.Entities;
using Notification.Repository.Enums;
using Notification.Services.DTOs;
using Notification.Services.Implementations;
using Notification.Services.Tests.TestDoubles;

namespace Notification.Services.Tests;

public class NotificationServiceTests
{
    private readonly FakeNotificationRepository _notificationRepo = new();
    private readonly FakeNotificationUnitOfWork _unitOfWork = new();
    private readonly FakeCurrentUser _currentUser = new();
    private readonly NotificationService _sut;

    public NotificationServiceTests()
    {
        _sut = new NotificationService(_notificationRepo, _unitOfWork, _currentUser);
    }

    [Fact]
    public async Task GetMyNotificationsAsync_FiltersByCurrentUserAndIsRead()
    {
        var userId = _currentUser.UserId;
        var otherUserId = Guid.NewGuid();

        _notificationRepo.Items.AddRange(
        [
            new NotificationEntity
            {
                Id = Guid.NewGuid(),
                RecipientId = userId,
                Type = NotificationType.Welcome,
                Title = "Unread 1",
                Message = "Msg 1",
                IsRead = false,
                CreatedAt = DateTime.UtcNow.AddMinutes(-5)
            },
            new NotificationEntity
            {
                Id = Guid.NewGuid(),
                RecipientId = userId,
                Type = NotificationType.MemberJoined,
                Title = "Read 1",
                Message = "Msg 2",
                IsRead = true,
                CreatedAt = DateTime.UtcNow.AddMinutes(-2)
            },
            new NotificationEntity
            {
                Id = Guid.NewGuid(),
                RecipientId = otherUserId,
                Type = NotificationType.Welcome,
                Title = "Other User",
                Message = "Msg 3",
                IsRead = false,
                CreatedAt = DateTime.UtcNow
            }
        ]);

        var result = await _sut.GetMyNotificationsAsync(new NotificationQuery { IsRead = false, Page = 1, PageSize = 10 });

        Assert.Single(result.Items);
        Assert.Equal("Unread 1", result.Items[0].Title);
        Assert.False(result.Items[0].IsRead);
    }

    [Fact]
    public async Task GetUnreadCountAsync_ReturnsOnlyCurrentUserUnreadCount()
    {
        var userId = _currentUser.UserId;
        _notificationRepo.Items.AddRange(
        [
            new NotificationEntity { Id = Guid.NewGuid(), RecipientId = userId, IsRead = false },
            new NotificationEntity { Id = Guid.NewGuid(), RecipientId = userId, IsRead = false },
            new NotificationEntity { Id = Guid.NewGuid(), RecipientId = userId, IsRead = true },
            new NotificationEntity { Id = Guid.NewGuid(), RecipientId = Guid.NewGuid(), IsRead = false }
        ]);

        var response = await _sut.GetUnreadCountAsync();

        Assert.Equal(2, response.UnreadCount);
    }

    [Fact]
    public async Task MarkAsReadAsync_WhenOwnedByCurrentUser_MarksReadAndSaves()
    {
        var id = Guid.NewGuid();
        _notificationRepo.Items.Add(new NotificationEntity
        {
            Id = id,
            RecipientId = _currentUser.UserId,
            Type = NotificationType.InvitationReceived,
            Title = "Invite",
            Message = "Invited",
            IsRead = false,
            CreatedAt = DateTime.UtcNow
        });

        var result = await _sut.MarkAsReadAsync(id);

        Assert.True(result.IsRead);
        Assert.Equal(1, _unitOfWork.SaveChangesCount);
    }

    [Fact]
    public async Task MarkAsReadAsync_WhenOwnedByAnotherUser_ThrowsForbiddenException()
    {
        var id = Guid.NewGuid();
        _notificationRepo.Items.Add(new NotificationEntity
        {
            Id = id,
            RecipientId = Guid.NewGuid(),
            IsRead = false
        });

        await Assert.ThrowsAsync<ForbiddenException>(() => _sut.MarkAsReadAsync(id));
    }

    [Fact]
    public async Task MarkAsReadAsync_WhenNotFound_ThrowsNotFoundException()
    {
        await Assert.ThrowsAsync<NotFoundException>(() => _sut.MarkAsReadAsync(Guid.NewGuid()));
    }

    [Fact]
    public async Task MarkAllAsReadAsync_MarksAllUnreadForCurrentUser()
    {
        var userId = _currentUser.UserId;
        _notificationRepo.Items.AddRange(
        [
            new NotificationEntity { Id = Guid.NewGuid(), RecipientId = userId, IsRead = false },
            new NotificationEntity { Id = Guid.NewGuid(), RecipientId = userId, IsRead = false },
            new NotificationEntity { Id = Guid.NewGuid(), RecipientId = Guid.NewGuid(), IsRead = false }
        ]);

        var result = await _sut.MarkAllAsReadAsync();

        Assert.Equal(2, result.UpdatedCount);
        Assert.Equal(0, await _notificationRepo.GetUnreadCountAsync(userId));
        Assert.Equal(1, _unitOfWork.SaveChangesCount);
    }
}
