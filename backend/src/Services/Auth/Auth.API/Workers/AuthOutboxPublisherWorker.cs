using System.Text.Json;
using Auth.Repository.Interfaces;
using Exe.BuildingBlocks.EventBus;
using Exe.Contracts.Events;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Auth.API.Workers;

/// <summary>
/// BackgroundService đảm nhận việc quét các bản ghi pending trong OutboxMessages
/// và xuất bản sang Redis Stream "exe:events:UserRegistered" (Stage D2).
/// Đảm bảo At-Least-Once Delivery: ProcessedAt CHỈ được cập nhật sau khi Redis xác nhận thành công.
/// </summary>
public class AuthOutboxPublisherWorker : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<AuthOutboxPublisherWorker> _logger;
    private readonly AuthOutboxOptions _options;
    private readonly SemaphoreSlim _executionLock = new(1, 1);

    public const string ApprovedStreamName = "exe:events:UserRegistered";

    public AuthOutboxPublisherWorker(
        IServiceProvider serviceProvider,
        IOptions<AuthOutboxOptions> options,
        ILogger<AuthOutboxPublisherWorker> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
        _options = options.Value;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("AuthOutboxPublisherWorker started with batch size {BatchSize}, poll interval {PollInterval}s.",
            _options.BatchSize, _options.PollIntervalSeconds);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                var processedCount = await ProcessPendingMessagesBatchAsync(stoppingToken);

                if (processedCount == 0)
                {
                    await Task.Delay(TimeSpan.FromSeconds(_options.PollIntervalSeconds), stoppingToken);
                }
                else
                {
                    // Delay nhỏ tránh chiếm dụng 100% CPU khi có nhiều bản ghi liên tiếp
                    await Task.Delay(100, stoppingToken);
                }
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error in AuthOutboxPublisherWorker loop. Backing off for {Seconds}s.",
                    _options.ErrorBackoffSeconds);
                try
                {
                    await Task.Delay(TimeSpan.FromSeconds(_options.ErrorBackoffSeconds), stoppingToken);
                }
                catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
                {
                    break;
                }
            }
        }

        _logger.LogInformation("AuthOutboxPublisherWorker stopped gracefully.");
    }

    /// <summary>
    /// Xử lý một batch các bản ghi pending. Phương thức public để phục vụ unit test và integration test có kiểm soát.
    /// Khóa SemaphoreSlim ngăn chặn việc xử lý chồng chéo (overlapping) trong cùng một tiến trình.
    /// </summary>
    public async Task<int> ProcessPendingMessagesBatchAsync(CancellationToken cancellationToken)
    {
        if (!await _executionLock.WaitAsync(0, cancellationToken))
        {
            // Tránh xử lý đè nếu lần lặp trước chưa hoàn tất
            return 0;
        }

        try
        {
            using var scope = _serviceProvider.CreateScope();
            var outboxRepo = scope.ServiceProvider.GetRequiredService<IOutboxRepository>();
            var eventPublisher = scope.ServiceProvider.GetRequiredService<IEventPublisher>();

            // Lấy các bản ghi pending chưa quá MaxRetryCount
            var pendingMessages = (await outboxRepo.GetPendingMessagesAsync(_options.BatchSize, cancellationToken))
                .Where(m => m.ProcessedAt == null && m.RetryCount < _options.MaxRetryCount)
                .ToList();

            if (pendingMessages.Count == 0)
            {
                return 0;
            }

            int successCount = 0;

            foreach (var message in pendingMessages)
            {
                if (cancellationToken.IsCancellationRequested)
                {
                    break;
                }

                try
                {
                    // 1. Phân loại và deserialize payload
                    if (string.Equals(message.EventType, nameof(UserRegisteredEvent), StringComparison.OrdinalIgnoreCase) ||
                        string.Equals(message.EventType, "UserRegistered", StringComparison.OrdinalIgnoreCase))
                    {
                        UserRegisteredEvent? userEvent;
                        try
                        {
                            userEvent = JsonSerializer.Deserialize<UserRegisteredEvent>(message.Payload, new JsonSerializerOptions
                            {
                                PropertyNameCaseInsensitive = true
                            });
                        }
                        catch (Exception jsonEx)
                        {
                            _logger.LogError(jsonEx, "Malformed JSON payload for OutboxMessage {MessageId}. Marking invalid.", message.Id);
                            message.RetryCount++;
                            message.LastError = $"Malformed JSON payload: {jsonEx.Message}";
                            await outboxRepo.UpdateAsync(message, cancellationToken);
                            continue;
                        }

                        if (userEvent == null)
                        {
                            _logger.LogError("Deserialized payload resulted in null for OutboxMessage {MessageId}.", message.Id);
                            message.RetryCount++;
                            message.LastError = "Deserialized payload is null.";
                            await outboxRepo.UpdateAsync(message, cancellationToken);
                            continue;
                        }

                        // 2. Xuất bản tới Redis Stream qua IEventPublisher
                        await eventPublisher.PublishAsync(ApprovedStreamName, userEvent, cancellationToken);

                        // 3. Đánh dấu ProcessedAt CHỈ SAU KHI Redis đã xác nhận thành công
                        message.ProcessedAt = DateTime.UtcNow;
                        message.LastError = null;
                        await outboxRepo.UpdateAsync(message, cancellationToken);
                        successCount++;

                        _logger.LogInformation(
                            "OutboxMessage {MessageId} (EventId: {EventId}) successfully processed and published to {StreamName}",
                            message.Id, userEvent.EventId, ApprovedStreamName);
                    }
                    else
                    {
                        _logger.LogWarning("Unknown EventType {EventType} for OutboxMessage {MessageId}",
                            message.EventType, message.Id);
                        message.RetryCount++;
                        message.LastError = $"Unknown EventType: {message.EventType}";
                        await outboxRepo.UpdateAsync(message, cancellationToken);
                    }
                }
                catch (Exception ex) when (ex is not OperationCanceledException)
                {
                    message.RetryCount++;
                    message.LastError = $"Publish failed: {ex.Message}";

                    _logger.LogWarning(ex,
                        "Failed to publish OutboxMessage {MessageId} to Redis. RetryCount: {RetryCount}/{MaxRetries}",
                        message.Id, message.RetryCount, _options.MaxRetryCount);

                    if (message.RetryCount >= _options.MaxRetryCount)
                    {
                        _logger.LogError(
                            "CRITICAL: OutboxMessage {MessageId} reached maximum retries ({MaxRetries}). Left pending for manual investigation.",
                            message.Id, _options.MaxRetryCount);
                    }

                    try
                    {
                        await outboxRepo.UpdateAsync(message, cancellationToken);
                    }
                    catch (Exception dbEx)
                    {
                        _logger.LogError(dbEx, "Failed to persist error state for OutboxMessage {MessageId}", message.Id);
                    }
                }
            }

            return successCount;
        }
        finally
        {
            _executionLock.Release();
        }
    }
}
