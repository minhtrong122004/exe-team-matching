using System.Text.Json;
using Exe.Contracts.Events;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using StackExchange.Redis;
using User.Services.Interfaces;

namespace User.API.Workers;

/// <summary>
/// BackgroundService tiêu thụ sự kiện UserRegistered từ Redis Streams (CLAUDE.md mục 5, 7).
/// Triển khai Consumer Group, xử lý idempotent, phục hồi pending entries và cô lập poison messages.
/// </summary>
public class UserRegisteredConsumerWorker : BackgroundService
{
    private readonly IConnectionMultiplexer _redis;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly UserConsumerOptions _options;
    private readonly ILogger<UserRegisteredConsumerWorker> _logger;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public UserRegisteredConsumerWorker(
        IConnectionMultiplexer redis,
        IServiceScopeFactory scopeFactory,
        IOptions<UserConsumerOptions> options,
        ILogger<UserRegisteredConsumerWorker> logger)
    {
        _redis = redis;
        _scopeFactory = scopeFactory;
        _options = options.Value;
        _logger = logger;
    }

    public override async Task StartAsync(CancellationToken cancellationToken)
    {
        _logger.LogInformation("Starting UserRegisteredConsumerWorker on stream '{Stream}', group '{Group}'...",
            _options.StreamName, _options.ConsumerGroup);

        await EnsureConsumerGroupCreatedAsync(cancellationToken);
        await base.StartAsync(cancellationToken);
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("UserRegisteredConsumerWorker started successfully. Consumer: '{Consumer}'", _options.ConsumerName);

        var lastPendingCheck = DateTime.MinValue;

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                var db = _redis.GetDatabase();

                // 1. Định kỳ kiểm tra và phục hồi pending entries (PEL)
                if ((DateTime.UtcNow - lastPendingCheck).TotalMilliseconds >= _options.PendingCheckIntervalMs)
                {
                    lastPendingCheck = DateTime.UtcNow;
                    await RecoverPendingMessagesAsync(db, stoppingToken);
                }

                // 2. Đọc các bản tin mới chưa từng được phân phối (StreamPosition.New tức '>')
                var entries = await db.StreamReadGroupAsync(
                    _options.StreamName,
                    _options.ConsumerGroup,
                    _options.ConsumerName,
                    StreamPosition.NewMessages,
                    _options.BatchSize);

                if (entries == null || entries.Length == 0)
                {
                    await Task.Delay(_options.PollIntervalMs, stoppingToken);
                    continue;
                }

                foreach (var entry in entries)
                {
                    if (stoppingToken.IsCancellationRequested) break;
                    await ProcessStreamEntryAsync(db, entry, stoppingToken);
                }
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (RedisConnectionException ex)
            {
                _logger.LogWarning(ex, "Redis connection interrupted. Retrying in 3 seconds...");
                await Task.Delay(3000, stoppingToken);
            }
            catch (RedisTimeoutException ex)
            {
                _logger.LogWarning(ex, "Redis timeout occurred. Retrying in 2 seconds...");
                await Task.Delay(2000, stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error in UserRegisteredConsumerWorker loop. Backing off for 2 seconds...");
                await Task.Delay(2000, stoppingToken);
            }
        }

        _logger.LogInformation("UserRegisteredConsumerWorker stopped.");
    }

    private async Task EnsureConsumerGroupCreatedAsync(CancellationToken ct)
    {
        try
        {
            var db = _redis.GetDatabase();
            // Khởi tạo Consumer Group tại position 0-0 (Beginning) để replay và tiêu thụ backlog theo phê duyệt Gate B Option 1
            await db.StreamCreateConsumerGroupAsync(
                _options.StreamName,
                _options.ConsumerGroup,
                StreamPosition.Beginning,
                createStream: true);

            _logger.LogInformation("Created consumer group '{Group}' on stream '{Stream}' at offset 0-0.",
                _options.ConsumerGroup, _options.StreamName);
        }
        catch (RedisServerException ex) when (ex.Message.Contains("BUSYGROUP"))
        {
            _logger.LogInformation("Consumer group '{Group}' already exists on stream '{Stream}'.",
                _options.ConsumerGroup, _options.StreamName);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to create consumer group '{Group}' during startup. Will re-attempt during loop.", _options.ConsumerGroup);
        }
    }

    private async Task RecoverPendingMessagesAsync(IDatabase db, CancellationToken ct)
    {
        try
        {
            // Truy vấn toàn bộ pending entries trong consumer group (kể cả của consumer đã chết hoặc consumer hiện tại)
            var pendingMessages = await db.StreamPendingMessagesAsync(
                _options.StreamName,
                _options.ConsumerGroup,
                count: _options.BatchSize,
                consumerName: RedisValue.Null);

            if (pendingMessages == null || pendingMessages.Length == 0)
            {
                return;
            }

            foreach (var pending in pendingMessages)
            {
                if (ct.IsCancellationRequested) break;

                // Chỉ phục hồi các message đã ở trạng thái pending quá thời gian tối thiểu
                if (pending.IdleTimeInMilliseconds < _options.PendingMinIdleMs)
                {
                    continue;
                }

                _logger.LogInformation(
                    "Reclaiming pending message {Id} (Previous consumer: '{Consumer}', Idle: {Idle}ms, DeliveryCount: {Count})",
                    pending.MessageId, pending.ConsumerName, pending.IdleTimeInMilliseconds, pending.DeliveryCount);

                // Dùng XCLAIM (StreamClaimAsync) để chính thức chuyển quyền sở hữu về consumer hiện tại,
                // cập nhật DeliveryCount trong Redis PEL và lấy lại nội dung bản tin.
                var claimedEntries = await db.StreamClaimAsync(
                    _options.StreamName,
                    _options.ConsumerGroup,
                    _options.ConsumerName,
                    (long)_options.PendingMinIdleMs,
                    new RedisValue[] { pending.MessageId });

                if (claimedEntries == null || claimedEntries.Length == 0)
                {
                    // Bản tin không thể claim (đã được ACK hoặc được consumer khác claim)
                    continue;
                }

                var claimedEntry = claimedEntries[0];

                // Kiểm tra số lần thử lại tối đa (Poison message)
                if (pending.DeliveryCount > _options.MaxRetryCount)
                {
                    _logger.LogWarning("Pending message {Id} exceeded max retry limit ({Count} > {Max}). Moving to dead-letter stream.",
                        pending.MessageId, pending.DeliveryCount, _options.MaxRetryCount);

                    var sent = await SendToDeadLetterAsync(db, claimedEntry, $"Exceeded max retry count ({pending.DeliveryCount})", null, ct);
                    if (sent)
                    {
                        await db.StreamAcknowledgeAsync(_options.StreamName, _options.ConsumerGroup, pending.MessageId);
                    }
                    continue;
                }

                await ProcessStreamEntryAsync(db, claimedEntry, ct);
            }
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            _logger.LogError(ex, "Error while recovering pending stream messages.");
        }
    }

    private async Task ProcessStreamEntryAsync(IDatabase db, StreamEntry entry, CancellationToken ct)
    {
        var values = entry.Values.ToDictionary(x => x.Name.ToString(), x => x.Value.ToString());

        if (!values.TryGetValue("payload", out var payloadJson) || string.IsNullOrWhiteSpace(payloadJson))
        {
            _logger.LogWarning("Stream entry {Id} missing 'payload' field. Moving to dead-letter.", entry.Id);
            var sent = await SendToDeadLetterAsync(db, entry, "Missing 'payload' field in stream entry", null, ct);
            if (sent)
            {
                await db.StreamAcknowledgeAsync(_options.StreamName, _options.ConsumerGroup, entry.Id);
            }
            return;
        }

        UserRegisteredEvent? @event;
        try
        {
            @event = JsonSerializer.Deserialize<UserRegisteredEvent>(payloadJson, JsonOptions);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Stream entry {Id} has invalid JSON payload. Moving to dead-letter.", entry.Id);
            var sent = await SendToDeadLetterAsync(db, entry, $"JSON deserialization error: {ex.Message}", null, ct);
            if (sent)
            {
                await db.StreamAcknowledgeAsync(_options.StreamName, _options.ConsumerGroup, entry.Id);
            }
            return;
        }

        if (@event == null)
        {
            _logger.LogWarning("Stream entry {Id} deserialized to null. Moving to dead-letter.", entry.Id);
            var sent = await SendToDeadLetterAsync(db, entry, "Deserialized payload is null", null, ct);
            if (sent)
            {
                await db.StreamAcknowledgeAsync(_options.StreamName, _options.ConsumerGroup, entry.Id);
            }
            return;
        }

        try
        {
            using var scope = _scopeFactory.CreateScope();
            var consumerService = scope.ServiceProvider.GetRequiredService<IUserRegisteredConsumerService>();

            var result = await consumerService.ConsumeAsync(@event, ct);

            switch (result.Status)
            {
                case ConsumerExecutionStatus.Success:
                case ConsumerExecutionStatus.DuplicateEvent:
                    // Thành công hoặc trùng lặp an toàn: ACK để hoàn tất
                    await db.StreamAcknowledgeAsync(_options.StreamName, _options.ConsumerGroup, entry.Id);
                    _logger.LogDebug("Acknowledged stream entry {Id} (Result: {Status})", entry.Id, result.Status);
                    break;

                case ConsumerExecutionStatus.Conflict:
                    // Xung đột danh tính (UserId trùng nhưng EventId khác): Dead-letter thành công rồi mới ACK
                    var sentConflict = await SendToDeadLetterAsync(db, entry, result.Message ?? "Conflicting profile identity detected", @event.EventId, ct);
                    if (sentConflict)
                    {
                        await db.StreamAcknowledgeAsync(_options.StreamName, _options.ConsumerGroup, entry.Id);
                    }
                    break;

                case ConsumerExecutionStatus.Invalid:
                    // Dữ liệu hoặc schema không hợp lệ (Poison message): Dead-letter thành công rồi mới ACK
                    var sentInvalid = await SendToDeadLetterAsync(db, entry, result.Message ?? "Invalid schema version or envelope data", @event.EventId, ct);
                    if (sentInvalid)
                    {
                        await db.StreamAcknowledgeAsync(_options.StreamName, _options.ConsumerGroup, entry.Id);
                    }
                    break;
            }
        }
        catch (Exception ex)
        {
            // Ngoại lệ chưa xử lý (ví dụ: mất kết nối SQL Server): KHÔNG ACK để Redis giữ trong PEL và cho phép thử lại
            _logger.LogError(ex, "Failed to process stream entry {Id} for EventId {EventId}. Message preserved in pending for retry.",
                entry.Id, @event.EventId);
        }
    }

    private async Task<bool> SendToDeadLetterAsync(IDatabase db, StreamEntry entry, string reason, Guid? eventId, CancellationToken ct)
    {
        try
        {
            var deadLetterFields = new List<NameValueEntry>
            {
                new("originalEntryId", entry.Id.ToString()),
                new("reason", reason),
                new("deadLetterAt", DateTime.UtcNow.ToString("O"))
            };

            if (eventId.HasValue && eventId.Value != Guid.Empty)
            {
                deadLetterFields.Add(new("eventId", eventId.Value.ToString()));
            }

            foreach (var nv in entry.Values)
            {
                deadLetterFields.Add(new($"original_{nv.Name}", nv.Value));
            }

            await db.StreamAddAsync(_options.DeadLetterStreamName, deadLetterFields.ToArray());
            _logger.LogWarning("Entry {Id} moved to Dead-Letter stream '{DLQ}'. Reason: {Reason}",
                entry.Id, _options.DeadLetterStreamName, reason);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send entry {Id} to Dead-Letter stream '{DLQ}'. Will NOT acknowledge.", entry.Id, _options.DeadLetterStreamName);
            return false;
        }
    }
}
