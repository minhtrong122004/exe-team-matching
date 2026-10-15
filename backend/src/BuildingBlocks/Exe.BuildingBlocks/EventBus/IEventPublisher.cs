namespace Exe.BuildingBlocks.EventBus;

public interface IEventPublisher
{
    /// <summary>
    /// Ghi event vào stream exe:events:{TênRecord} và log [EVENT-PUBLISH]. Gọi SAU KHI SaveChanges thành công.
    /// <code>await publisher.PublishAsync(new MemberJoined(...), ct);</code>
    /// </summary>
    /// <returns>eventId</returns>
    Task<Guid> PublishAsync<TEvent>(TEvent @event, CancellationToken cancellationToken = default) where TEvent : class;
}
