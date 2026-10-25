using Exe.Contracts.Events;
using Microsoft.Extensions.Logging;
using Notification.Repository.Entities;
using Notification.Repository.Enums;
using Notification.Repository.Interfaces;
using Notification.Services.Interfaces;

namespace Notification.Services.Implementations;

public class NotificationEventHandler : INotificationEventHandler
{
    private readonly INotificationRepository _notificationRepo;
    private readonly IEmailLogRepository _emailLogRepo;
    private readonly IProcessedEventRepository _processedEventRepo;
    private readonly INotificationUnitOfWork _unitOfWork;
    private readonly ILogger<NotificationEventHandler> _logger;

    public NotificationEventHandler(
        INotificationRepository notificationRepo,
        IEmailLogRepository emailLogRepo,
        IProcessedEventRepository processedEventRepo,
        INotificationUnitOfWork unitOfWork,
        ILogger<NotificationEventHandler> logger)
    {
        _notificationRepo = notificationRepo;
        _emailLogRepo = emailLogRepo;
        _processedEventRepo = processedEventRepo;
        _unitOfWork = unitOfWork;
        _logger = logger;
    }

    public async Task<bool> HandleUserRegisteredAsync(UserRegistered @event, Guid eventId, CancellationToken ct = default)
    {
        if (await IsAlreadyProcessedAsync(eventId, nameof(UserRegistered), ct))
            return false;

        var title = "Chào mừng đến với EXE Team Matching";
        var message = $"Xin chào {@event.FullName}, tài khoản ({@event.Role}) của bạn đã sẵn sàng để tìm kiếm và ghép nhóm đồ án EXE.";

        await _notificationRepo.AddAsync(new NotificationEntity
        {
            Id = Guid.NewGuid(),
            RecipientId = @event.UserId,
            Type = NotificationType.Welcome,
            Title = title,
            Message = message,
            RelatedEntityId = @event.UserId,
            IsRead = false,
            CreatedAt = DateTime.UtcNow
        }, ct);

        if (!string.IsNullOrWhiteSpace(@event.Email))
        {
            await _emailLogRepo.AddAsync(new EmailLog
            {
                Id = Guid.NewGuid(),
                To = @event.Email,
                Subject = $"[EXE Team Matching] {title}",
                Body = $"<p>Xin chào <strong>{@event.FullName}</strong>,</p><p>{message}</p>",
                Status = EmailStatus.Pending,
                Attempts = 0,
                CreatedAt = DateTime.UtcNow
            }, ct);
        }

        await MarkProcessedAndCommitAsync(eventId, ct);
        return true;
    }

    public async Task<bool> HandleJoinRequestCreatedAsync(JoinRequestCreated @event, Guid eventId, CancellationToken ct = default)
    {
        if (await IsAlreadyProcessedAsync(eventId, nameof(JoinRequestCreated), ct))
            return false;

        var title = $"Yêu cầu tham gia nhóm {@event.GroupName}";
        var message = $"Sinh viên {@event.StudentName} vừa gửi yêu cầu xin gia nhập nhóm \"{@event.GroupName}\".";

        await _notificationRepo.AddAsync(new NotificationEntity
        {
            Id = Guid.NewGuid(),
            RecipientId = @event.LeaderId,
            Type = NotificationType.JoinRequestReceived,
            Title = title,
            Message = message,
            RelatedEntityId = @event.GroupId,
            IsRead = false,
            CreatedAt = DateTime.UtcNow
        }, ct);

        if (!string.IsNullOrWhiteSpace(@event.LeaderEmail))
        {
            await _emailLogRepo.AddAsync(new EmailLog
            {
                Id = Guid.NewGuid(),
                To = @event.LeaderEmail,
                Subject = $"[EXE Team Matching] {title}",
                Body = $"<p>Xin chào <strong>{@event.LeaderName}</strong>,</p><p>{message}</p>",
                Status = EmailStatus.Pending,
                Attempts = 0,
                CreatedAt = DateTime.UtcNow
            }, ct);
        }

        await MarkProcessedAndCommitAsync(eventId, ct);
        return true;
    }

    public async Task<bool> HandleJoinRequestDecidedAsync(JoinRequestDecided @event, Guid eventId, CancellationToken ct = default)
    {
        if (await IsAlreadyProcessedAsync(eventId, nameof(JoinRequestDecided), ct))
            return false;

        var type = @event.Accepted ? NotificationType.JoinRequestAccepted : NotificationType.JoinRequestRejected;
        var statusText = @event.Accepted ? "được chấp nhận" : "bị từ chối";
        var title = $"Kết quả yêu cầu tham gia nhóm {@event.GroupName}";
        var message = $"Yêu cầu tham gia nhóm \"{@event.GroupName}\" của bạn đã {statusText}.";

        await _notificationRepo.AddAsync(new NotificationEntity
        {
            Id = Guid.NewGuid(),
            RecipientId = @event.StudentId,
            Type = type,
            Title = title,
            Message = message,
            RelatedEntityId = @event.GroupId,
            IsRead = false,
            CreatedAt = DateTime.UtcNow
        }, ct);

        if (!string.IsNullOrWhiteSpace(@event.StudentEmail))
        {
            await _emailLogRepo.AddAsync(new EmailLog
            {
                Id = Guid.NewGuid(),
                To = @event.StudentEmail,
                Subject = $"[EXE Team Matching] {title}",
                Body = $"<p>Xin chào <strong>{@event.StudentName}</strong>,</p><p>{message}</p>",
                Status = EmailStatus.Pending,
                Attempts = 0,
                CreatedAt = DateTime.UtcNow
            }, ct);
        }

        await MarkProcessedAndCommitAsync(eventId, ct);
        return true;
    }

    public async Task<bool> HandleInvitationCreatedAsync(InvitationCreated @event, Guid eventId, CancellationToken ct = default)
    {
        if (await IsAlreadyProcessedAsync(eventId, nameof(InvitationCreated), ct))
            return false;

        var title = $"Lời mời tham gia nhóm {@event.GroupName}";
        var message = $"Bạn nhận được lời mời tham gia nhóm \"{@event.GroupName}\" (hết hạn lúc {@event.ExpiresAt:dd/MM/yyyy HH:mm} UTC).";

        await _notificationRepo.AddAsync(new NotificationEntity
        {
            Id = Guid.NewGuid(),
            RecipientId = @event.StudentId,
            Type = NotificationType.InvitationReceived,
            Title = title,
            Message = message,
            RelatedEntityId = @event.GroupId,
            IsRead = false,
            CreatedAt = DateTime.UtcNow
        }, ct);

        if (!string.IsNullOrWhiteSpace(@event.StudentEmail))
        {
            await _emailLogRepo.AddAsync(new EmailLog
            {
                Id = Guid.NewGuid(),
                To = @event.StudentEmail,
                Subject = $"[EXE Team Matching] {title}",
                Body = $"<p>Xin chào <strong>{@event.StudentName}</strong>,</p><p>{message}</p>",
                Status = EmailStatus.Pending,
                Attempts = 0,
                CreatedAt = DateTime.UtcNow
            }, ct);
        }

        await MarkProcessedAndCommitAsync(eventId, ct);
        return true;
    }

    public async Task<bool> HandleMemberJoinedAsync(MemberJoined @event, Guid eventId, CancellationToken ct = default)
    {
        if (await IsAlreadyProcessedAsync(eventId, nameof(MemberJoined), ct))
            return false;

        var title = $"Đã gia nhập nhóm {@event.GroupName}";
        var message = $"Chúc mừng {@event.UserName}! Bạn đã chính thức trở thành thành viên của nhóm \"{@event.GroupName}\" ({@event.MemberCount}/{@event.MaxMembers} thành viên).";

        await _notificationRepo.AddAsync(new NotificationEntity
        {
            Id = Guid.NewGuid(),
            RecipientId = @event.UserId,
            Type = NotificationType.MemberJoined,
            Title = title,
            Message = message,
            RelatedEntityId = @event.GroupId,
            IsRead = false,
            CreatedAt = DateTime.UtcNow
        }, ct);

        if (!string.IsNullOrWhiteSpace(@event.UserEmail))
        {
            await _emailLogRepo.AddAsync(new EmailLog
            {
                Id = Guid.NewGuid(),
                To = @event.UserEmail,
                Subject = $"[EXE Team Matching] {title}",
                Body = $"<p>Xin chào <strong>{@event.UserName}</strong>,</p><p>{message}</p>",
                Status = EmailStatus.Pending,
                Attempts = 0,
                CreatedAt = DateTime.UtcNow
            }, ct);
        }

        await MarkProcessedAndCommitAsync(eventId, ct);
        return true;
    }

    public async Task<bool> HandleMemberLeftAsync(MemberLeft @event, Guid eventId, CancellationToken ct = default)
    {
        if (await IsAlreadyProcessedAsync(eventId, nameof(MemberLeft), ct))
            return false;

        var title = $"Đã rời nhóm {@event.GroupName}";
        var message = $"Bạn đã rời khỏi nhóm \"{@event.GroupName}\" (số thành viên còn lại: {@event.MemberCount}).";

        await _notificationRepo.AddAsync(new NotificationEntity
        {
            Id = Guid.NewGuid(),
            RecipientId = @event.UserId,
            Type = NotificationType.MemberLeft,
            Title = title,
            Message = message,
            RelatedEntityId = @event.GroupId,
            IsRead = false,
            CreatedAt = DateTime.UtcNow
        }, ct);

        await MarkProcessedAndCommitAsync(eventId, ct);
        return true;
    }

    private async Task<bool> IsAlreadyProcessedAsync(Guid eventId, string eventType, CancellationToken ct)
    {
        if (await _processedEventRepo.ExistsAsync(eventId, ct))
        {
            _logger.LogInformation("Skipping duplicate event {EventType} ({EventId})", eventType, eventId);
            return true;
        }
        return false;
    }

    private async Task MarkProcessedAndCommitAsync(Guid eventId, CancellationToken ct)
    {
        await _processedEventRepo.AddAsync(new ProcessedEvent
        {
            EventId = eventId,
            ProcessedAt = DateTime.UtcNow
        }, ct);
        await _unitOfWork.SaveChangesAsync(ct);
    }
}
