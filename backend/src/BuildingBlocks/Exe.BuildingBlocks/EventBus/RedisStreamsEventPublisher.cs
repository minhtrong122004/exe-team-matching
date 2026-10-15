using System.Text.Json;
using Exe.BuildingBlocks.Web;
using Microsoft.Extensions.Logging;
using StackExchange.Redis;

namespace Exe.BuildingBlocks.EventBus;

public sealed class RedisStreamsEventPublisher(IConnectionMultiplexer redis, ILogger<RedisStreamsEventPublisher> logger)
    : IEventPublisher
{
    public async Task<Guid> PublishAsync<TEvent>(TEvent @event, CancellationToken cancellationToken = default)
        where TEvent : class
    {
        var eventType = typeof(TEvent).Name;
        var eventId = Guid.NewGuid();
        var correlationId = CorrelationContext.Current ?? Guid.NewGuid().ToString("N");
        var payload = JsonSerializer.Serialize(@event, EventStreams.JsonOptions);

        NameValueEntry[] fields =
        [
            new("eventId", eventId.ToString()),
            new("eventType", eventType),
            new("occurredAt", DateTime.UtcNow.ToString("O")),
            new("correlationId", correlationId),
            new("payload", payload)
        ];

        var entryId = await redis.GetDatabase().StreamAddAsync(EventStreams.For(eventType), fields);

        logger.LogInformation(
            "[EVENT-PUBLISH] {EventType} eventId={EventId} entryId={EntryId} correlationId={CorrelationId} payload={Payload}",
            eventType, eventId, entryId, correlationId, payload);

        return eventId;
    }
}
