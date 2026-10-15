using System.Globalization;
using System.Text.Json;
using Exe.BuildingBlocks.Web;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using StackExchange.Redis;

namespace Exe.BuildingBlocks.EventBus;

/// <summary>
/// Consumer một loại event bằng Redis Streams consumer group (CLAUDE.md mục 7):
/// <list type="bullet">
/// <item>Đọc bằng XREADGROUP; ưu tiên entry đã nhận nhưng chưa ACK (ví dụ service bị tắt giữa chừng).</item>
/// <item>Gọi <see cref="HandleAsync"/> trong một DI scope mới; chỉ XACK khi HandleAsync chạy xong không lỗi.</item>
/// <item>Lỗi thì thử lại, quá <see cref="EventBusOptions.MaxDeliveryAttempts"/> lần thì log [EVENT-DEAD] và bỏ qua.</item>
/// </list>
/// HandleAsync phải idempotent: kiểm tra eventId trong bảng ProcessedEvent trước khi xử lý.
/// <code>
/// // X.API/Workers/MemberJoinedConsumer.cs
/// public sealed class MemberJoinedConsumer(IServiceProvider sp) : EventConsumerBase&lt;MemberJoined&gt;(sp)
/// {
///     protected override string ConsumerGroup =&gt; "notification-service";
///     protected override Task HandleAsync(MemberJoined e, EventEnvelope env, IServiceProvider scope, CancellationToken ct) =&gt;
///         scope.GetRequiredService&lt;INotificationEventHandler&gt;().HandleAsync(e, env.EventId, ct);
/// }
/// // Program.cs
/// builder.Services.AddHostedService&lt;MemberJoinedConsumer&gt;();
/// </code>
/// </summary>
public abstract class EventConsumerBase<TEvent> : BackgroundService where TEvent : class
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IConnectionMultiplexer _redis;
    private readonly EventBusOptions _options;
    private readonly Dictionary<string, int> _failedAttempts = new();

    protected EventConsumerBase(IServiceProvider services)
    {
        _scopeFactory = services.GetRequiredService<IServiceScopeFactory>();
        _redis = services.GetRequiredService<IConnectionMultiplexer>();
        _options = services.GetRequiredService<IOptions<EventBusOptions>>().Value;
        Logger = services.GetRequiredService<ILoggerFactory>().CreateLogger(GetType());
    }

    /// <summary>Tên consumer group, đặt theo tên service: "user-service", "notification-service", "report-service".</summary>
    protected abstract string ConsumerGroup { get; }

    protected ILogger Logger { get; }

    /// <summary>Xử lý một event. <paramref name="services"/> là DI scope riêng cho event này.</summary>
    protected abstract Task HandleAsync(TEvent @event, EventEnvelope envelope, IServiceProvider services,
        CancellationToken cancellationToken);

    private static string EventType => typeof(TEvent).Name;
    private static string StreamKey => EventStreams.For(EventType);
    private string ConsumerName => _options.ConsumerName ?? ConsumerGroup;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await Task.Yield();
        var db = _redis.GetDatabase();
        var groupReady = false;

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                if (!groupReady)
                {
                    await EnsureConsumerGroupAsync(db);
                    groupReady = true;
                    Logger.LogInformation("[EVENT-CONSUMER] {Group} listening on {Stream} as {Consumer}",
                        ConsumerGroup, StreamKey, ConsumerName);
                }

                // "0" = entry đã giao cho consumer này nhưng chưa ACK; ">" = entry mới.
                var entries = await db.StreamReadGroupAsync(StreamKey, ConsumerGroup, ConsumerName, "0", _options.BatchSize);
                if (entries.Length == 0)
                    entries = await db.StreamReadGroupAsync(StreamKey, ConsumerGroup, ConsumerName, ">", _options.BatchSize);

                if (entries.Length == 0)
                {
                    await Task.Delay(_options.PollIntervalMs, stoppingToken);
                    continue;
                }

                foreach (var entry in entries)
                    await ProcessEntryAsync(db, entry, stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (RedisServerException ex) when (ex.Message.Contains("NOGROUP"))
            {
                groupReady = false; // stream hoặc group bị xóa → tạo lại
            }
            catch (Exception ex)
            {
                Logger.LogWarning("[EVENT-CONSUMER] {Group} {EventType} read failed: {Message} Retrying in 5s...",
                    ConsumerGroup, EventType, ex.Message);
                await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken);
            }
        }
    }

    private async Task EnsureConsumerGroupAsync(IDatabase db)
    {
        try
        {
            // "0": consumer group mới đọc cả các event đã có trong stream từ trước.
            await db.StreamCreateConsumerGroupAsync(StreamKey, ConsumerGroup, "0", createStream: true);
        }
        catch (RedisServerException ex) when (ex.Message.Contains("BUSYGROUP"))
        {
            // Group đã tồn tại.
        }
    }

    private async Task ProcessEntryAsync(IDatabase db, StreamEntry entry, CancellationToken cancellationToken)
    {
        var entryId = entry.Id.ToString();

        if (entry.IsNull || !TryParse(entry, out var envelope, out var @event))
        {
            Logger.LogError("[EVENT-DEAD] {Group} {EventType} entryId={EntryId} is malformed, acknowledging",
                ConsumerGroup, EventType, entryId);
            await db.StreamAcknowledgeAsync(StreamKey, ConsumerGroup, entry.Id);
            return;
        }

        CorrelationContext.Current = envelope.CorrelationId;
        Logger.LogInformation("[EVENT-CONSUME] {Group} {EventType} eventId={EventId} correlationId={CorrelationId}",
            ConsumerGroup, EventType, envelope.EventId, envelope.CorrelationId);

        try
        {
            await using (var scope = _scopeFactory.CreateAsyncScope())
            {
                await HandleAsync(@event, envelope, scope.ServiceProvider, cancellationToken);
            }

            await db.StreamAcknowledgeAsync(StreamKey, ConsumerGroup, entry.Id);
            _failedAttempts.Remove(entryId);
        }
        catch (Exception ex) when (!cancellationToken.IsCancellationRequested)
        {
            var attempts = _failedAttempts.GetValueOrDefault(entryId) + 1;
            _failedAttempts[entryId] = attempts;

            if (attempts >= _options.MaxDeliveryAttempts)
            {
                Logger.LogError(ex, "[EVENT-DEAD] {Group} {EventType} eventId={EventId} failed {Attempts} times, acknowledging",
                    ConsumerGroup, EventType, envelope.EventId, attempts);
                await db.StreamAcknowledgeAsync(StreamKey, ConsumerGroup, entry.Id);
                _failedAttempts.Remove(entryId);
            }
            else
            {
                Logger.LogWarning("[EVENT-RETRY] {Group} {EventType} eventId={EventId} attempt {Attempt}: {Message}",
                    ConsumerGroup, EventType, envelope.EventId, attempts, ex.Message);
                await Task.Delay(TimeSpan.FromSeconds(1), cancellationToken);
            }
        }
    }

    private static bool TryParse(StreamEntry entry, out EventEnvelope envelope, out TEvent @event)
    {
        envelope = null!;
        @event = null!;
        try
        {
            var eventId = Guid.Parse(entry["eventId"].ToString());
            var occurredAt = DateTime.Parse(entry["occurredAt"].ToString(), CultureInfo.InvariantCulture,
                DateTimeStyles.RoundtripKind);
            var correlation = entry["correlationId"];
            envelope = new EventEnvelope(eventId, entry["eventType"].ToString(), occurredAt,
                correlation.IsNullOrEmpty ? null : correlation.ToString(), entry["payload"].ToString());

            var parsed = JsonSerializer.Deserialize<TEvent>(envelope.Payload, EventStreams.JsonOptions);
            if (parsed is null) return false;
            @event = parsed;
            return true;
        }
        catch (Exception)
        {
            return false;
        }
    }
}
