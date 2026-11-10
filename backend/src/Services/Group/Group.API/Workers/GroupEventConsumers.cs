using Exe.BuildingBlocks.EventBus;
using Exe.Contracts.Events;
using Group.Repository.Interfaces;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace Group.API.Workers;

/// <summary>
/// Lắng nghe sự kiện UserProfileUpdated từ User Service để đồng bộ cờ IsProfileCompleted vào SpaceEnrollment (BR-07 Event-driven).
/// </summary>
public sealed class UserProfileUpdatedConsumer(IServiceProvider services) : EventConsumerBase<UserProfileUpdated>(services)
{
    protected override string ConsumerGroup => "group-service";

    protected override async Task HandleAsync(
        UserProfileUpdated @event,
        EventEnvelope envelope,
        IServiceProvider services,
        CancellationToken cancellationToken)
    {
        if (@event.UserId == Guid.Empty) return;

        var logger = services.GetRequiredService<ILogger<UserProfileUpdatedConsumer>>();
        var spaceRepo = services.GetRequiredService<ICourseSpaceRepository>();

        await spaceRepo.UpdateProfileCompletionAsync(@event.UserId, @event.IsProfileCompleted, cancellationToken);

        logger.LogInformation(
            "Processed UserProfileUpdated event {EventId}: StudentId {UserId} -> IsProfileCompleted={IsCompleted}",
            envelope.EventId, @event.UserId, @event.IsProfileCompleted);
    }
}

