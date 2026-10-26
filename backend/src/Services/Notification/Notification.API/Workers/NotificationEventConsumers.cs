using Exe.BuildingBlocks.EventBus;
using Exe.Contracts.Events;
using Notification.Services.Interfaces;

namespace Notification.API.Workers;

public sealed class UserRegisteredConsumer(IServiceProvider services) : EventConsumerBase<UserRegistered>(services)
{
    protected override string ConsumerGroup => "notification-service";

    protected override Task HandleAsync(
        UserRegistered @event,
        EventEnvelope envelope,
        IServiceProvider services,
        CancellationToken cancellationToken) =>
        services.GetRequiredService<INotificationEventHandler>()
            .HandleUserRegisteredAsync(@event, envelope.EventId, cancellationToken);
}

public sealed class JoinRequestCreatedConsumer(IServiceProvider services) : EventConsumerBase<JoinRequestCreated>(services)
{
    protected override string ConsumerGroup => "notification-service";

    protected override Task HandleAsync(
        JoinRequestCreated @event,
        EventEnvelope envelope,
        IServiceProvider services,
        CancellationToken cancellationToken) =>
        services.GetRequiredService<INotificationEventHandler>()
            .HandleJoinRequestCreatedAsync(@event, envelope.EventId, cancellationToken);
}

public sealed class JoinRequestDecidedConsumer(IServiceProvider services) : EventConsumerBase<JoinRequestDecided>(services)
{
    protected override string ConsumerGroup => "notification-service";

    protected override Task HandleAsync(
        JoinRequestDecided @event,
        EventEnvelope envelope,
        IServiceProvider services,
        CancellationToken cancellationToken) =>
        services.GetRequiredService<INotificationEventHandler>()
            .HandleJoinRequestDecidedAsync(@event, envelope.EventId, cancellationToken);
}

public sealed class InvitationCreatedConsumer(IServiceProvider services) : EventConsumerBase<InvitationCreated>(services)
{
    protected override string ConsumerGroup => "notification-service";

    protected override Task HandleAsync(
        InvitationCreated @event,
        EventEnvelope envelope,
        IServiceProvider services,
        CancellationToken cancellationToken) =>
        services.GetRequiredService<INotificationEventHandler>()
            .HandleInvitationCreatedAsync(@event, envelope.EventId, cancellationToken);
}

public sealed class MemberJoinedConsumer(IServiceProvider services) : EventConsumerBase<MemberJoined>(services)
{
    protected override string ConsumerGroup => "notification-service";

    protected override Task HandleAsync(
        MemberJoined @event,
        EventEnvelope envelope,
        IServiceProvider services,
        CancellationToken cancellationToken) =>
        services.GetRequiredService<INotificationEventHandler>()
            .HandleMemberJoinedAsync(@event, envelope.EventId, cancellationToken);
}

public sealed class MemberLeftConsumer(IServiceProvider services) : EventConsumerBase<MemberLeft>(services)
{
    protected override string ConsumerGroup => "notification-service";

    protected override Task HandleAsync(
        MemberLeft @event,
        EventEnvelope envelope,
        IServiceProvider services,
        CancellationToken cancellationToken) =>
        services.GetRequiredService<INotificationEventHandler>()
            .HandleMemberLeftAsync(@event, envelope.EventId, cancellationToken);
}
