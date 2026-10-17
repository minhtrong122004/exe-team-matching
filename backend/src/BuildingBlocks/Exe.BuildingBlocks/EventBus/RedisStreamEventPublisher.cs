using System.Diagnostics;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using StackExchange.Redis;

namespace Exe.BuildingBlocks.EventBus;

/// <summary>
/// Triển khai IEventPublisher xuất bản sự kiện sang Redis Streams bằng lệnh XADD (CLAUDE.md mục 7).
/// Mỗi entry bao gồm 5 field chuẩn: eventId, eventType, occurredAt, correlationId, payload.
/// </summary>
public class RedisStreamEventPublisher : IEventPublisher
{
    private readonly IConnectionMultiplexer _redis;
    private readonly ILogger<RedisStreamEventPublisher> _logger;
    private readonly IHttpContextAccessor? _httpContextAccessor;

    public RedisStreamEventPublisher(
        IConnectionMultiplexer redis,
        ILogger<RedisStreamEventPublisher> logger,
        IHttpContextAccessor? httpContextAccessor = null)
    {
        _redis = redis;
        _logger = logger;
        _httpContextAccessor = httpContextAccessor;
    }

    public async Task PublishAsync<T>(string streamName, T @event, CancellationToken cancellationToken = default) where T : class
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(streamName);
        ArgumentNullException.ThrowIfNull(@event);

        var db = _redis.GetDatabase();

        // 1. Trích xuất hoặc khởi tạo EventId (ổn định qua các lần thử)
        var eventId = typeof(T).GetProperty("EventId")?.GetValue(@event)?.ToString();
        if (string.IsNullOrWhiteSpace(eventId))
        {
            eventId = Guid.NewGuid().ToString();
        }

        // 2. Xác định EventType từ tên stream (ví dụ: exe:events:UserRegistered -> UserRegistered)
        var eventType = streamName.Contains(':')
            ? streamName[(streamName.LastIndexOf(':') + 1)..]
            : typeof(T).Name.Replace("Event", "");

        // 3. Trích xuất OccurredAt (UTC ISO 8601)
        string occurredAt;
        var occurredAtProp = typeof(T).GetProperty("OccurredAt")?.GetValue(@event);
        if (occurredAtProp is DateTime dt)
        {
            occurredAt = dt.ToUniversalTime().ToString("O");
        }
        else
        {
            occurredAt = DateTime.UtcNow.ToString("O");
        }

        // 4. Trích xuất CorrelationId từ HttpContext/Activity hoặc dùng EventId làm fallback an toàn
        var httpContext = _httpContextAccessor?.HttpContext;
        var correlationId = httpContext?.Request.Headers["X-Correlation-Id"].FirstOrDefault()
                         ?? httpContext?.TraceIdentifier
                         ?? Activity.Current?.Id
                         ?? eventId;

        // 5. Serialize payload JSON
        string payloadJson;
        if (@event is string strPayload)
        {
            payloadJson = strPayload;
        }
        else
        {
            payloadJson = JsonSerializer.Serialize(@event, new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
                WriteIndented = false
            });
        }

        // 6. Tạo NameValueEntry mảng 5 trường bắt buộc theo CLAUDE.md mục 7
        var entries = new NameValueEntry[]
        {
            new("eventId", eventId),
            new("eventType", eventType),
            new("occurredAt", occurredAt),
            new("correlationId", correlationId),
            new("payload", payloadJson)
        };

        // 7. Gọi XADD vào Redis Stream
        var redisMessageId = await db.StreamAddAsync(streamName, entries);

        _logger.LogInformation(
            "Event {EventType} with ID {EventId} successfully published to Redis Stream {StreamName} (RedisEntryId: {RedisEntryId})",
            eventType, eventId, streamName, redisMessageId);
    }
}
