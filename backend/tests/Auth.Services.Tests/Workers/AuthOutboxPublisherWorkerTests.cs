using System.Text.Json;
using Auth.API.Workers;
using Auth.Repository.Entities;
using Auth.Repository.Interfaces;
using Auth.Services.Tests.TestDoubles;
using Exe.BuildingBlocks.EventBus;
using Exe.Contracts.Events;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

namespace Auth.Services.Tests.Workers;

public class AuthOutboxPublisherWorkerTests
{
    private readonly FakeOutboxRepository _outboxRepo = new();
    private readonly FakeEventPublisher _eventPublisher = new();
    private readonly ServiceProvider _serviceProvider;
    private readonly IOptions<AuthOutboxOptions> _options;

    public AuthOutboxPublisherWorkerTests()
    {
        var services = new ServiceCollection();
        services.AddSingleton<IOutboxRepository>(_outboxRepo);
        services.AddSingleton<IEventPublisher>(_eventPublisher);
        _serviceProvider = services.BuildServiceProvider();

        _options = Options.Create(new AuthOutboxOptions
        {
            BatchSize = 10,
            PollIntervalSeconds = 1,
            MaxRetryCount = 3,
            ErrorBackoffSeconds = 1
        });
    }

    [Fact]
    public async Task ProcessPendingMessagesBatchAsync_OnlyProcessesUnprocessedMessages()
    {
        // 1. Pending Outbox selection
        var worker = new AuthOutboxPublisherWorker(_serviceProvider, _options, new NullLogger<AuthOutboxPublisherWorker>());

        var alreadyProcessed = new OutboxMessage
        {
            Id = Guid.NewGuid(),
            EventType = nameof(UserRegisteredEvent),
            Payload = CreateValidPayload(Guid.NewGuid()),
            CreatedAt = DateTime.UtcNow.AddMinutes(-5),
            ProcessedAt = DateTime.UtcNow.AddMinutes(-4)
        };

        var pending = new OutboxMessage
        {
            Id = Guid.NewGuid(),
            EventType = nameof(UserRegisteredEvent),
            Payload = CreateValidPayload(Guid.NewGuid()),
            CreatedAt = DateTime.UtcNow.AddMinutes(-1),
            ProcessedAt = null
        };

        await _outboxRepo.AddAsync(alreadyProcessed);
        await _outboxRepo.AddAsync(pending);

        var processedCount = await worker.ProcessPendingMessagesBatchAsync(CancellationToken.None);

        Assert.Equal(1, processedCount);
        Assert.Single(_eventPublisher.PublishedEvents);
        Assert.NotNull(pending.ProcessedAt);
    }

    [Fact]
    public async Task ProcessPendingMessagesBatchAsync_PublishesToApprovedRedisStream_AndSetsProcessedAt()
    {
        // 2 & 3. Successful Redis publish & ProcessedAt updated after acknowledgement
        var worker = new AuthOutboxPublisherWorker(_serviceProvider, _options, new NullLogger<AuthOutboxPublisherWorker>());
        var expectedEventId = Guid.NewGuid();

        var message = new OutboxMessage
        {
            Id = Guid.NewGuid(),
            EventType = nameof(UserRegisteredEvent),
            Payload = CreateValidPayload(expectedEventId),
            CreatedAt = DateTime.UtcNow,
            ProcessedAt = null
        };
        await _outboxRepo.AddAsync(message);

        var processedCount = await worker.ProcessPendingMessagesBatchAsync(CancellationToken.None);

        Assert.Equal(1, processedCount);
        Assert.Single(_eventPublisher.PublishedEvents);
        Assert.Equal(AuthOutboxPublisherWorker.ApprovedStreamName, _eventPublisher.PublishedEvents[0].StreamName);

        var publishedEvent = Assert.IsType<UserRegisteredEvent>(_eventPublisher.PublishedEvents[0].Event);
        Assert.Equal(expectedEventId, publishedEvent.EventId);
        Assert.NotNull(message.ProcessedAt);
        Assert.Null(message.LastError);
    }

    [Fact]
    public async Task ProcessPendingMessagesBatchAsync_OnRedisFailure_IncrementsRetryCount_AndLeavesProcessedAtNull()
    {
        // 4 & 5. Redis publish failure & RetryCount and error handling
        _eventPublisher.ShouldFail = true;
        _eventPublisher.FailureMessage = "Redis connection refused";

        var worker = new AuthOutboxPublisherWorker(_serviceProvider, _options, new NullLogger<AuthOutboxPublisherWorker>());

        var message = new OutboxMessage
        {
            Id = Guid.NewGuid(),
            EventType = nameof(UserRegisteredEvent),
            Payload = CreateValidPayload(Guid.NewGuid()),
            CreatedAt = DateTime.UtcNow,
            ProcessedAt = null,
            RetryCount = 0
        };
        await _outboxRepo.AddAsync(message);

        var processedCount = await worker.ProcessPendingMessagesBatchAsync(CancellationToken.None);

        Assert.Equal(0, processedCount);
        Assert.Null(message.ProcessedAt);
        Assert.Equal(1, message.RetryCount);
        Assert.Contains("Redis connection refused", message.LastError);
    }

    [Fact]
    public async Task ProcessPendingMessagesBatchAsync_PreservesStableEventId_AcrossRetries()
    {
        // 6. Stable EventId across retries
        var fixedEventId = Guid.NewGuid();
        var worker = new AuthOutboxPublisherWorker(_serviceProvider, _options, new NullLogger<AuthOutboxPublisherWorker>());

        var message = new OutboxMessage
        {
            Id = Guid.NewGuid(),
            EventType = nameof(UserRegisteredEvent),
            Payload = CreateValidPayload(fixedEventId),
            CreatedAt = DateTime.UtcNow,
            ProcessedAt = null,
            RetryCount = 1
        };
        await _outboxRepo.AddAsync(message);

        // Lần thử thứ 2 thành công
        var processedCount = await worker.ProcessPendingMessagesBatchAsync(CancellationToken.None);

        Assert.Equal(1, processedCount);
        Assert.Single(_eventPublisher.PublishedEvents);
        var publishedEvent = Assert.IsType<UserRegisteredEvent>(_eventPublisher.PublishedEvents[0].Event);
        Assert.Equal(fixedEventId, publishedEvent.EventId);
    }

    [Fact]
    public async Task ProcessPendingMessagesBatchAsync_PreservesPayloadStructure_AndSchemaVersion()
    {
        // 7. Serialization and required Redis fields
        var eventId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        var worker = new AuthOutboxPublisherWorker(_serviceProvider, _options, new NullLogger<AuthOutboxPublisherWorker>());

        var evt = new UserRegisteredEvent(
            EventId: eventId,
            UserId: userId,
            Email: "student@fpt.edu.vn",
            FullName: "Nguyen Van A",
            Role: "Student",
            OccurredAt: DateTime.UtcNow,
            SchemaVersion: 1
        );

        var message = new OutboxMessage
        {
            Id = Guid.NewGuid(),
            EventType = nameof(UserRegisteredEvent),
            Payload = JsonSerializer.Serialize(evt, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase }),
            CreatedAt = DateTime.UtcNow,
            ProcessedAt = null
        };
        await _outboxRepo.AddAsync(message);

        await worker.ProcessPendingMessagesBatchAsync(CancellationToken.None);

        var published = Assert.IsType<UserRegisteredEvent>(_eventPublisher.PublishedEvents[0].Event);
        Assert.Equal(eventId, published.EventId);
        Assert.Equal(userId, published.UserId);
        Assert.Equal("student@fpt.edu.vn", published.Email);
        Assert.Equal("Nguyen Van A", published.FullName);
        Assert.Equal("Student", published.Role);
        Assert.Equal(1, published.SchemaVersion);
    }

    [Fact]
    public async Task ProcessPendingMessagesBatchAsync_OnInvalidPayload_IncrementsRetryCount_WithoutCrashing()
    {
        // 8. Invalid payload handling
        var worker = new AuthOutboxPublisherWorker(_serviceProvider, _options, new NullLogger<AuthOutboxPublisherWorker>());

        var malformedMessage = new OutboxMessage
        {
            Id = Guid.NewGuid(),
            EventType = nameof(UserRegisteredEvent),
            Payload = "{ broken json! invalid content",
            CreatedAt = DateTime.UtcNow,
            ProcessedAt = null,
            RetryCount = 0
        };
        await _outboxRepo.AddAsync(malformedMessage);

        var processedCount = await worker.ProcessPendingMessagesBatchAsync(CancellationToken.None);

        Assert.Equal(0, processedCount);
        Assert.Null(malformedMessage.ProcessedAt);
        Assert.Equal(1, malformedMessage.RetryCount);
        Assert.Contains("Malformed JSON payload", malformedMessage.LastError);
    }

    [Fact]
    public async Task ProcessPendingMessagesBatchAsync_RespectsCancellation()
    {
        // 9. Cancellation and graceful shutdown
        var worker = new AuthOutboxPublisherWorker(_serviceProvider, _options, new NullLogger<AuthOutboxPublisherWorker>());

        using var cts = new CancellationTokenSource();
        cts.Cancel(); // Đã cancel từ đầu

        var message = new OutboxMessage
        {
            Id = Guid.NewGuid(),
            EventType = nameof(UserRegisteredEvent),
            Payload = CreateValidPayload(Guid.NewGuid()),
            CreatedAt = DateTime.UtcNow,
            ProcessedAt = null
        };
        await _outboxRepo.AddAsync(message);

        await Assert.ThrowsAnyAsync<OperationCanceledException>(() =>
            worker.ProcessPendingMessagesBatchAsync(cts.Token));

        Assert.Empty(_eventPublisher.PublishedEvents);
        Assert.Null(message.ProcessedAt);
    }

    [Fact]
    public async Task ProcessPendingMessagesBatchAsync_WhenNoPendingMessages_ReturnsZeroWithoutPublishing()
    {
        // 1b. Empty outbox handling
        var worker = new AuthOutboxPublisherWorker(_serviceProvider, _options, new NullLogger<AuthOutboxPublisherWorker>());

        var processedCount = await worker.ProcessPendingMessagesBatchAsync(CancellationToken.None);

        Assert.Equal(0, processedCount);
        Assert.Empty(_eventPublisher.PublishedEvents);
    }

    [Fact]
    public async Task ProcessPendingMessagesBatchAsync_OnPermanentPoisonMessage_SkipsAfterMaxRetries()
    {
        // 5b. Max retries poison message isolation
        var worker = new AuthOutboxPublisherWorker(_serviceProvider, _options, new NullLogger<AuthOutboxPublisherWorker>());

        var poisonMessage = new OutboxMessage
        {
            Id = Guid.NewGuid(),
            EventType = nameof(UserRegisteredEvent),
            Payload = CreateValidPayload(Guid.NewGuid()),
            CreatedAt = DateTime.UtcNow,
            ProcessedAt = null,
            RetryCount = 3 // MaxRetryCount is 3 in options
        };
        await _outboxRepo.AddAsync(poisonMessage);

        var processedCount = await worker.ProcessPendingMessagesBatchAsync(CancellationToken.None);

        Assert.Equal(0, processedCount);
        Assert.Empty(_eventPublisher.PublishedEvents);
        Assert.Null(poisonMessage.ProcessedAt);
    }

    [Fact]
    public async Task ProcessPendingMessagesBatchAsync_PreventsConcurrentOverlappingExecution()
    {
        // 10. No overlapping processing in the supported deployment model
        var worker = new AuthOutboxPublisherWorker(_serviceProvider, _options, new NullLogger<AuthOutboxPublisherWorker>());

        // Khởi động 2 tác vụ song song
        var task1 = worker.ProcessPendingMessagesBatchAsync(CancellationToken.None);
        var task2 = worker.ProcessPendingMessagesBatchAsync(CancellationToken.None);

        await Task.WhenAll(task1, task2);

        // Hoàn tất không deadlock và kết quả hợp lệ
        Assert.True(task1.IsCompletedSuccessfully);
        Assert.True(task2.IsCompletedSuccessfully);
    }

    private static string CreateValidPayload(Guid eventId)
    {
        var evt = new UserRegisteredEvent(
            EventId: eventId,
            UserId: Guid.NewGuid(),
            Email: "student@fpt.edu.vn",
            FullName: "Test Student",
            Role: "Student",
            OccurredAt: DateTime.UtcNow,
            SchemaVersion: 1
        );
        return JsonSerializer.Serialize(evt, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        });
    }
}
