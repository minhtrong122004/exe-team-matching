using Exe.BuildingBlocks.EventBus;
using Exe.Contracts.Events;
using Report.Services.Interfaces;

namespace Report.API.Workers;

public sealed class UserRegisteredConsumer(IServiceProvider services) : EventConsumerBase<UserRegistered>(services)
{
    protected override string ConsumerGroup => "report-service";

    protected override Task HandleAsync(
        UserRegistered @event,
        EventEnvelope envelope,
        IServiceProvider services,
        CancellationToken cancellationToken) =>
        services.GetRequiredService<IReportEventHandler>()
            .HandleUserRegisteredAsync(@event, envelope.EventId, cancellationToken);
}

public sealed class UserProfileUpdatedConsumer(IServiceProvider services) : EventConsumerBase<UserProfileUpdated>(services)
{
    protected override string ConsumerGroup => "report-service";

    protected override Task HandleAsync(
        UserProfileUpdated @event,
        EventEnvelope envelope,
        IServiceProvider services,
        CancellationToken cancellationToken) =>
        services.GetRequiredService<IReportEventHandler>()
            .HandleUserProfileUpdatedAsync(@event, envelope.EventId, cancellationToken);
}

public sealed class GroupCreatedConsumer(IServiceProvider services) : EventConsumerBase<GroupCreated>(services)
{
    protected override string ConsumerGroup => "report-service";

    protected override Task HandleAsync(
        GroupCreated @event,
        EventEnvelope envelope,
        IServiceProvider services,
        CancellationToken cancellationToken) =>
        services.GetRequiredService<IReportEventHandler>()
            .HandleGroupCreatedAsync(@event, envelope.EventId, cancellationToken);
}

public sealed class MemberJoinedConsumer(IServiceProvider services) : EventConsumerBase<MemberJoined>(services)
{
    protected override string ConsumerGroup => "report-service";

    protected override Task HandleAsync(
        MemberJoined @event,
        EventEnvelope envelope,
        IServiceProvider services,
        CancellationToken cancellationToken) =>
        services.GetRequiredService<IReportEventHandler>()
            .HandleMemberJoinedAsync(@event, envelope.EventId, cancellationToken);
}

public sealed class MemberLeftConsumer(IServiceProvider services) : EventConsumerBase<MemberLeft>(services)
{
    protected override string ConsumerGroup => "report-service";

    protected override Task HandleAsync(
        MemberLeft @event,
        EventEnvelope envelope,
        IServiceProvider services,
        CancellationToken cancellationToken) =>
        services.GetRequiredService<IReportEventHandler>()
            .HandleMemberLeftAsync(@event, envelope.EventId, cancellationToken);
}
