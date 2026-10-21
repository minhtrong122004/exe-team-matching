using Exe.BuildingBlocks.EventBus;
using Microsoft.Extensions.Logging;

namespace Group.Services.Implementations;

/// <summary>
/// Publish event sau khi đã SaveChanges. Redis lỗi thì chỉ log, không làm thất bại thao tác đã commit
/// (CLAUDE.md mục 3, quy tắc 5). Log [EVENT-PUBLISH] do RedisStreamsEventPublisher ghi.
/// </summary>
public sealed class GroupEventPublisher(IEventPublisher publisher, ILogger<GroupEventPublisher> logger)
{
    public async Task PublishAsync<TEvent>(TEvent @event, CancellationToken ct = default) where TEvent : class
    {
        try
        {
            await publisher.PublishAsync(@event, ct);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "[EVENT-PUBLISH] {EventType} failed: {Payload}", typeof(TEvent).Name, @event);
        }
    }
}
