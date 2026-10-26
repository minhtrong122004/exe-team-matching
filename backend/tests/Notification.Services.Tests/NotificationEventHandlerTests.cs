using Exe.Contracts.Events;
using Microsoft.Extensions.Logging.Abstractions;
using Notification.Repository.Enums;
using Notification.Services.Implementations;
using Notification.Services.Tests.TestDoubles;

namespace Notification.Services.Tests;

public class NotificationEventHandlerTests
{
    private readonly FakeNotificationRepository _notificationRepo = new();
    private readonly FakeEmailLogRepository _emailLogRepo = new();
    private readonly FakeProcessedEventRepository _processedEventRepo = new();
    private readonly FakeNotificationUnitOfWork _unitOfWork = new();
    private readonly NotificationEventHandler _sut;

    public NotificationEventHandlerTests()
    {
        _sut = new NotificationEventHandler(
            _notificationRepo,
            _emailLogRepo,
            _processedEventRepo,
            _unitOfWork,
            NullLogger<NotificationEventHandler>.Instance);
    }

    [Fact]
    public async Task HandleUserRegisteredAsync_WhenNewEvent_CreatesNotificationEmailLogAndProcessedEvent()
    {
        var eventId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        var ev = new UserRegistered(userId, "student@fpt.edu.vn", "Nguyen Van A", "Student");

        var processed = await _sut.HandleUserRegisteredAsync(ev, eventId);

        Assert.True(processed);
        Assert.Single(_notificationRepo.Items);
        Assert.Equal(userId, _notificationRepo.Items[0].RecipientId);
        Assert.Equal(NotificationType.Welcome, _notificationRepo.Items[0].Type);

        Assert.Single(_emailLogRepo.Items);
        Assert.Equal("student@fpt.edu.vn", _emailLogRepo.Items[0].To);
        Assert.Equal(EmailStatus.Pending, _emailLogRepo.Items[0].Status);

        Assert.Contains(eventId, _processedEventRepo.ProcessedIds);
        Assert.Equal(1, _unitOfWork.SaveChangesCount);
    }

    [Fact]
    public async Task HandleUserRegisteredAsync_WhenDuplicateEvent_IsIdempotentAndSkipsSideEffects()
    {
        var eventId = Guid.NewGuid();
        _processedEventRepo.ProcessedIds.Add(eventId);
        var ev = new UserRegistered(Guid.NewGuid(), "student@fpt.edu.vn", "Nguyen Van A", "Student");

        var processed = await _sut.HandleUserRegisteredAsync(ev, eventId);

        Assert.False(processed);
        Assert.Empty(_notificationRepo.Items);
        Assert.Empty(_emailLogRepo.Items);
        Assert.Equal(0, _unitOfWork.SaveChangesCount);
    }

    [Fact]
    public async Task HandleJoinRequestCreatedAsync_CreatesLeaderNotificationAndPendingEmail()
    {
        var eventId = Guid.NewGuid();
        var leaderId = Guid.NewGuid();
        var ev = new JoinRequestCreated(
            Guid.NewGuid(),
            Guid.NewGuid(),
            "EduTech Innovators",
            Guid.NewGuid(),
            "Tran Thi B",
            leaderId,
            "leader@fpt.edu.vn",
            "Le Van Leader");

        var processed = await _sut.HandleJoinRequestCreatedAsync(ev, eventId);

        Assert.True(processed);
        Assert.Single(_notificationRepo.Items);
        Assert.Equal(leaderId, _notificationRepo.Items[0].RecipientId);
        Assert.Equal(NotificationType.JoinRequestReceived, _notificationRepo.Items[0].Type);
        Assert.Single(_emailLogRepo.Items);
        Assert.Equal("leader@fpt.edu.vn", _emailLogRepo.Items[0].To);
    }

    [Theory]
    [InlineData(true, NotificationType.JoinRequestAccepted)]
    [InlineData(false, NotificationType.JoinRequestRejected)]
    public async Task HandleJoinRequestDecidedAsync_CreatesStudentNotificationAndPendingEmail(
        bool accepted,
        NotificationType expectedType)
    {
        var eventId = Guid.NewGuid();
        var studentId = Guid.NewGuid();
        var ev = new JoinRequestDecided(
            Guid.NewGuid(),
            Guid.NewGuid(),
            "EduTech Innovators",
            studentId,
            "student@fpt.edu.vn",
            "Tran Thi B",
            accepted);

        var processed = await _sut.HandleJoinRequestDecidedAsync(ev, eventId);

        Assert.True(processed);
        Assert.Single(_notificationRepo.Items);
        Assert.Equal(studentId, _notificationRepo.Items[0].RecipientId);
        Assert.Equal(expectedType, _notificationRepo.Items[0].Type);
        Assert.Single(_emailLogRepo.Items);
        Assert.Equal("student@fpt.edu.vn", _emailLogRepo.Items[0].To);
    }

    [Fact]
    public async Task HandleInvitationCreatedAsync_CreatesStudentNotificationAndPendingEmail()
    {
        var eventId = Guid.NewGuid();
        var studentId = Guid.NewGuid();
        var ev = new InvitationCreated(
            Guid.NewGuid(),
            Guid.NewGuid(),
            "EcoRecycle FPT",
            studentId,
            "invited@fpt.edu.vn",
            "Pham Van C",
            DateTime.UtcNow.AddDays(2));

        var processed = await _sut.HandleInvitationCreatedAsync(ev, eventId);

        Assert.True(processed);
        Assert.Single(_notificationRepo.Items);
        Assert.Equal(studentId, _notificationRepo.Items[0].RecipientId);
        Assert.Equal(NotificationType.InvitationReceived, _notificationRepo.Items[0].Type);
        Assert.Single(_emailLogRepo.Items);
        Assert.Equal("invited@fpt.edu.vn", _emailLogRepo.Items[0].To);
    }

    [Fact]
    public async Task HandleMemberJoinedAsync_CreatesNotificationAndPendingEmail()
    {
        var eventId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        var ev = new MemberJoined(
            Guid.NewGuid(),
            "EcoRecycle FPT",
            userId,
            "member@fpt.edu.vn",
            "Pham Van C",
            3,
            5);

        var processed = await _sut.HandleMemberJoinedAsync(ev, eventId);

        Assert.True(processed);
        Assert.Single(_notificationRepo.Items);
        Assert.Equal(userId, _notificationRepo.Items[0].RecipientId);
        Assert.Equal(NotificationType.MemberJoined, _notificationRepo.Items[0].Type);
        Assert.Single(_emailLogRepo.Items);
        Assert.Equal("member@fpt.edu.vn", _emailLogRepo.Items[0].To);
    }

    [Fact]
    public async Task HandleMemberLeftAsync_CreatesInAppNotificationOnly()
    {
        var eventId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        var ev = new MemberLeft(Guid.NewGuid(), "EcoRecycle FPT", userId, 2);

        var processed = await _sut.HandleMemberLeftAsync(ev, eventId);

        Assert.True(processed);
        Assert.Single(_notificationRepo.Items);
        Assert.Equal(userId, _notificationRepo.Items[0].RecipientId);
        Assert.Equal(NotificationType.MemberLeft, _notificationRepo.Items[0].Type);
        Assert.Empty(_emailLogRepo.Items);
    }
}
