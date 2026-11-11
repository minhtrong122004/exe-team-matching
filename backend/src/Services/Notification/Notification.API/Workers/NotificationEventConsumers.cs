using Exe.BuildingBlocks.EventBus;
using Exe.Contracts.Events;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.DependencyInjection;
using Notification.API.Hubs;
using Notification.Services.Interfaces;

namespace Notification.API.Workers;

public sealed class UserRegisteredConsumer(IServiceProvider services) : EventConsumerBase<UserRegistered>(services)
{
    protected override string ConsumerGroup => "notification-service";

    protected override async Task HandleAsync(
        UserRegistered @event,
        EventEnvelope envelope,
        IServiceProvider services,
        CancellationToken cancellationToken)
    {
        await services.GetRequiredService<INotificationEventHandler>()
            .HandleUserRegisteredAsync(@event, envelope.EventId, cancellationToken);

        var hub = services.GetService<IHubContext<AppRealtimeHub>>();
        if (hub != null)
        {
            await hub.Clients.Group("role_moderator").SendAsync("UserRegistered", new
            {
                userId = @event.UserId,
                email = @event.Email,
                fullName = @event.FullName,
                role = @event.Role
            }, cancellationToken);
        }
    }
}

public sealed class JoinRequestCreatedConsumer(IServiceProvider services) : EventConsumerBase<JoinRequestCreated>(services)
{
    protected override string ConsumerGroup => "notification-service";

    protected override async Task HandleAsync(
        JoinRequestCreated @event,
        EventEnvelope envelope,
        IServiceProvider services,
        CancellationToken cancellationToken)
    {
        await services.GetRequiredService<INotificationEventHandler>()
            .HandleJoinRequestCreatedAsync(@event, envelope.EventId, cancellationToken);

        var hub = services.GetService<IHubContext<AppRealtimeHub>>();
        if (hub != null)
        {
            var payload = new
            {
                requestId = @event.RequestId,
                groupId = @event.GroupId,
                groupName = @event.GroupName,
                studentId = @event.StudentId,
                studentName = @event.StudentName
            };
            await hub.Clients.Group($"user_{@event.LeaderId}").SendAsync("JoinRequestCreated", payload, cancellationToken);
            await hub.Clients.Group($"user_{@event.LeaderId}").SendAsync("NewNotification", new
            {
                type = "JoinRequest",
                title = "Yêu cầu gia nhập mới",
                message = $"Sinh viên {@event.StudentName} vừa gửi yêu cầu tham gia nhóm {@event.GroupName}"
            }, cancellationToken);
            await hub.Clients.Group($"group_{@event.GroupId}").SendAsync("JoinRequestCreated", payload, cancellationToken);
        }
    }
}

public sealed class JoinRequestDecidedConsumer(IServiceProvider services) : EventConsumerBase<JoinRequestDecided>(services)
{
    protected override string ConsumerGroup => "notification-service";

    protected override async Task HandleAsync(
        JoinRequestDecided @event,
        EventEnvelope envelope,
        IServiceProvider services,
        CancellationToken cancellationToken)
    {
        await services.GetRequiredService<INotificationEventHandler>()
            .HandleJoinRequestDecidedAsync(@event, envelope.EventId, cancellationToken);

        var hub = services.GetService<IHubContext<AppRealtimeHub>>();
        if (hub != null)
        {
            var payload = new
            {
                requestId = @event.RequestId,
                groupId = @event.GroupId,
                groupName = @event.GroupName,
                studentId = @event.StudentId,
                accepted = @event.Accepted
            };
            await hub.Clients.Group($"user_{@event.StudentId}").SendAsync("JoinRequestDecided", payload, cancellationToken);
            await hub.Clients.Group($"user_{@event.StudentId}").SendAsync("NewNotification", new
            {
                type = @event.Accepted ? "JoinRequestAccepted" : "JoinRequestRejected",
                title = @event.Accepted ? "Đơn tham gia được chấp nhận" : "Đơn tham gia bị từ chối",
                message = @event.Accepted
                    ? $"Chúc mừng! Bạn đã được chấp nhận vào nhóm {@event.GroupName}"
                    : $"Yêu cầu tham gia nhóm {@event.GroupName} của bạn đã bị từ chối"
            }, cancellationToken);
            await hub.Clients.Group($"group_{@event.GroupId}").SendAsync("JoinRequestDecided", payload, cancellationToken);
        }
    }
}

public sealed class MemberJoinedConsumer(IServiceProvider services) : EventConsumerBase<MemberJoined>(services)
{
    protected override string ConsumerGroup => "notification-service";

    protected override async Task HandleAsync(
        MemberJoined @event,
        EventEnvelope envelope,
        IServiceProvider services,
        CancellationToken cancellationToken)
    {
        await services.GetRequiredService<INotificationEventHandler>()
            .HandleMemberJoinedAsync(@event, envelope.EventId, cancellationToken);

        var hub = services.GetService<IHubContext<AppRealtimeHub>>();
        if (hub != null)
        {
            var payload = new
            {
                groupId = @event.GroupId,
                groupName = @event.GroupName,
                userId = @event.UserId,
                userName = @event.UserName,
                memberCount = @event.MemberCount,
                maxMembers = @event.MaxMembers
            };
            await hub.Clients.Group($"group_{@event.GroupId}").SendAsync("MemberJoined", payload, cancellationToken);
            await hub.Clients.All.SendAsync("RoomOccupancyChanged", new
            {
                groupId = @event.GroupId,
                memberCount = @event.MemberCount,
                maxMembers = @event.MaxMembers
            }, cancellationToken);
            await hub.Clients.Group($"user_{@event.UserId}").SendAsync("TeamStateChanged", new
            {
                inTeam = true,
                groupId = @event.GroupId,
                groupName = @event.GroupName
            }, cancellationToken);
        }
    }
}

public sealed class MemberLeftConsumer(IServiceProvider services) : EventConsumerBase<MemberLeft>(services)
{
    protected override string ConsumerGroup => "notification-service";

    protected override async Task HandleAsync(
        MemberLeft @event,
        EventEnvelope envelope,
        IServiceProvider services,
        CancellationToken cancellationToken)
    {
        await services.GetRequiredService<INotificationEventHandler>()
            .HandleMemberLeftAsync(@event, envelope.EventId, cancellationToken);

        var hub = services.GetService<IHubContext<AppRealtimeHub>>();
        if (hub != null)
        {
            var payload = new
            {
                groupId = @event.GroupId,
                groupName = @event.GroupName,
                userId = @event.UserId,
                memberCount = @event.MemberCount
            };
            await hub.Clients.Group($"group_{@event.GroupId}").SendAsync("MemberLeft", payload, cancellationToken);
            await hub.Clients.All.SendAsync("RoomOccupancyChanged", new
            {
                groupId = @event.GroupId,
                memberCount = @event.MemberCount
            }, cancellationToken);
            await hub.Clients.Group($"user_{@event.UserId}").SendAsync("TeamStateChanged", new
            {
                inTeam = false,
                groupId = (Guid?)null
            }, cancellationToken);
        }
    }
}

public sealed class MemberRemovedConsumer(IServiceProvider services) : EventConsumerBase<MemberRemoved>(services)
{
    protected override string ConsumerGroup => "notification-service";

    protected override async Task HandleAsync(
        MemberRemoved @event,
        EventEnvelope envelope,
        IServiceProvider services,
        CancellationToken cancellationToken)
    {
        await services.GetRequiredService<INotificationEventHandler>()
            .HandleMemberRemovedAsync(@event, envelope.EventId, cancellationToken);

        var hub = services.GetService<IHubContext<AppRealtimeHub>>();
        if (hub != null)
        {
            var payload = new
            {
                groupId = @event.GroupId,
                groupName = @event.GroupName,
                userId = @event.UserId,
                userName = @event.UserName,
                reason = @event.Reason,
                category = @event.Category,
                memberCount = @event.MemberCount,
                removedAt = @event.RemovedAt
            };
            await hub.Clients.Group($"group_{@event.GroupId}").SendAsync("MemberRemoved", payload, cancellationToken);
            await hub.Clients.All.SendAsync("RoomOccupancyChanged", new
            {
                groupId = @event.GroupId,
                memberCount = @event.MemberCount
            }, cancellationToken);
            await hub.Clients.Group($"user_{@event.UserId}").SendAsync("MemberRemoved", payload, cancellationToken);
            await hub.Clients.Group($"user_{@event.UserId}").SendAsync("NewNotification", new
            {
                type = "MemberRemoved",
                title = "Thông báo rời nhóm",
                message = $"Bạn đã được mời rời khỏi nhóm {@event.GroupName}. Lý do: {@event.Reason}"
            }, cancellationToken);
            await hub.Clients.Group($"user_{@event.UserId}").SendAsync("TeamStateChanged", new
            {
                inTeam = false,
                groupId = (Guid?)null
            }, cancellationToken);
        }
    }
}

public sealed class MemberTransferredPostLockConsumer(IServiceProvider services) : EventConsumerBase<MemberTransferredPostLock>(services)
{
    protected override string ConsumerGroup => "notification-service";

    protected override async Task HandleAsync(
        MemberTransferredPostLock @event,
        EventEnvelope envelope,
        IServiceProvider services,
        CancellationToken cancellationToken)
    {
        await services.GetRequiredService<INotificationEventHandler>()
            .HandleMemberTransferredPostLockAsync(@event, envelope.EventId, cancellationToken);

        var hub = services.GetService<IHubContext<AppRealtimeHub>>();
        if (hub != null)
        {
            var payload = new
            {
                spaceId = @event.SpaceId,
                studentId = @event.StudentId,
                studentName = @event.StudentName,
                fromGroupId = @event.FromGroupId,
                fromGroupName = @event.FromGroupName,
                targetGroupId = @event.TargetGroupId,
                targetGroupName = @event.TargetGroupName,
                swapWithStudentId = @event.SwapWithStudentId,
                swapWithStudentName = @event.SwapWithStudentName,
                reason = @event.Reason,
                transferredAt = @event.TransferredAt
            };
            await hub.Clients.Group($"space_{@event.SpaceId}").SendAsync("MemberTransferred", payload, cancellationToken);
            await hub.Clients.Group($"group_{@event.FromGroupId}").SendAsync("MemberTransferred", payload, cancellationToken);
            await hub.Clients.Group($"group_{@event.TargetGroupId}").SendAsync("MemberTransferred", payload, cancellationToken);
            await hub.Clients.Group($"user_{@event.StudentId}").SendAsync("MemberTransferred", payload, cancellationToken);
            await hub.Clients.Group("role_moderator").SendAsync("TransferRequestApproved", payload, cancellationToken);
            await hub.Clients.Group("role_lecturer").SendAsync("MemberTransferred", payload, cancellationToken);
        }
    }
}

public sealed class SpaceFinalizedConsumer(IServiceProvider services) : EventConsumerBase<SpaceFinalized>(services)
{
    protected override string ConsumerGroup => "notification-service";

    protected override async Task HandleAsync(
        SpaceFinalized @event,
        EventEnvelope envelope,
        IServiceProvider services,
        CancellationToken cancellationToken)
    {
        var hub = services.GetService<IHubContext<AppRealtimeHub>>();
        if (hub != null)
        {
            var payload = new
            {
                spaceId = @event.SpaceId,
                semesterCode = @event.SemesterCode,
                subjectCode = @event.SubjectCode,
                lockedRoomsCount = @event.LockedRoomsCount,
                rejectedRequestsCount = @event.RejectedRequestsCount,
                finalizedAt = @event.FinalizedAt,
                status = "LOCKED"
            };
            await hub.Clients.Group($"space_{@event.SpaceId}").SendAsync("SpaceFinalized", payload, cancellationToken);
            await hub.Clients.Group("role_moderator").SendAsync("SpaceFinalized", payload, cancellationToken);
            await hub.Clients.Group("role_lecturer").SendAsync("SpaceFinalized", payload, cancellationToken);
            await hub.Clients.All.SendAsync("SpaceStatusChanged", payload, cancellationToken);
        }
    }
}

public sealed class TransferRequestCreatedConsumer(IServiceProvider services) : EventConsumerBase<TransferRequestCreated>(services)
{
    protected override string ConsumerGroup => "notification-service";

    protected override async Task HandleAsync(
        TransferRequestCreated @event,
        EventEnvelope envelope,
        IServiceProvider services,
        CancellationToken cancellationToken)
    {
        var hub = services.GetService<IHubContext<AppRealtimeHub>>();
        if (hub != null)
        {
            var payload = new
            {
                requestId = @event.RequestId,
                spaceId = @event.SpaceId,
                studentId = @event.StudentId,
                studentName = @event.StudentName,
                studentCode = @event.StudentCode,
                fromGroupId = @event.FromGroupId,
                fromGroupCode = @event.FromGroupCode,
                targetGroupId = @event.TargetGroupId,
                targetGroupCode = @event.TargetGroupCode,
                swapWithStudentId = @event.SwapWithStudentId,
                swapWithStudentName = @event.SwapWithStudentName,
                reason = @event.Reason,
                createdAt = @event.CreatedAt
            };
            await hub.Clients.Group("role_moderator").SendAsync("TransferRequestCreated", payload, cancellationToken);
            await hub.Clients.Group($"space_{@event.SpaceId}").SendAsync("TransferRequestCreated", payload, cancellationToken);
            await hub.Clients.Group("role_moderator").SendAsync("NewNotification", new
            {
                type = "TransferRequest",
                title = "Yêu cầu chuyển nhóm mới",
                message = $"Sinh viên {@event.StudentName} ({@event.StudentCode}) vừa gửi yêu cầu chuyển sang nhóm {@event.TargetGroupCode}."
            }, cancellationToken);
        }
    }
}

public sealed class TransferRequestCancelledConsumer(IServiceProvider services) : EventConsumerBase<TransferRequestCancelled>(services)
{
    protected override string ConsumerGroup => "notification-service";

    protected override async Task HandleAsync(
        TransferRequestCancelled @event,
        EventEnvelope envelope,
        IServiceProvider services,
        CancellationToken cancellationToken)
    {
        var hub = services.GetService<IHubContext<AppRealtimeHub>>();
        if (hub != null)
        {
            var payload = new
            {
                requestId = @event.RequestId,
                spaceId = @event.SpaceId,
                studentId = @event.StudentId,
                cancelledAt = @event.CancelledAt
            };
            await hub.Clients.Group("role_moderator").SendAsync("TransferRequestCancelled", payload, cancellationToken);
            await hub.Clients.Group($"space_{@event.SpaceId}").SendAsync("TransferRequestCancelled", payload, cancellationToken);
        }
    }
}

public sealed class TransferRequestRejectedConsumer(IServiceProvider services) : EventConsumerBase<TransferRequestRejected>(services)
{
    protected override string ConsumerGroup => "notification-service";

    protected override async Task HandleAsync(
        TransferRequestRejected @event,
        EventEnvelope envelope,
        IServiceProvider services,
        CancellationToken cancellationToken)
    {
        var hub = services.GetService<IHubContext<AppRealtimeHub>>();
        if (hub != null)
        {
            var payload = new
            {
                requestId = @event.RequestId,
                spaceId = @event.SpaceId,
                studentId = @event.StudentId,
                studentName = @event.StudentName,
                reason = @event.Reason,
                decidedAt = @event.DecidedAt
            };
            await hub.Clients.Group($"user_{@event.StudentId}").SendAsync("TransferRequestRejected", payload, cancellationToken);
            await hub.Clients.Group($"user_{@event.StudentId}").SendAsync("NewNotification", new
            {
                type = "TransferRequestRejected",
                title = "Đơn chuyển nhóm bị từ chối",
                message = $"Yêu cầu chuyển nhóm của bạn đã bị Moderator từ chối. Lý do: {@event.Reason}"
            }, cancellationToken);
            await hub.Clients.Group("role_moderator").SendAsync("TransferRequestRejected", payload, cancellationToken);
            await hub.Clients.Group($"space_{@event.SpaceId}").SendAsync("TransferRequestRejected", payload, cancellationToken);
        }
    }
}
