namespace Exe.BuildingBlocks.EventBus;

/// <summary>
/// Hợp đồng xuất bản sự kiện dùng chung qua Message Broker (Redis Streams) (CLAUDE.md mục 7).
/// </summary>
public interface IEventPublisher
{
    /// <summary>
    /// Ghi event vào stream exe:events:{TênRecord} và log [EVENT-PUBLISH]. Gọi SAU KHI SaveChanges thành công.
    /// <code>await publisher.PublishAsync(new MemberJoined(...), ct);</code>
    /// </summary>
    /// <returns>eventId</returns>
    Task<Guid> PublishAsync<TEvent>(TEvent @event, CancellationToken cancellationToken = default) where TEvent : class
    {
        return Task.FromResult(Guid.NewGuid());
    }

    /// <summary>
    /// Xuất bản sự kiện với stream name cụ thể (dành cho Outbox Publisher).
    /// </summary>
    Task PublishAsync<T>(string streamName, T @event, CancellationToken cancellationToken = default) where T : class
    {
        return Task.CompletedTask;
    }
}
