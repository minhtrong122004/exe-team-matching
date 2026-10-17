namespace Exe.BuildingBlocks.EventBus;

/// <summary>
/// Hợp đồng xuất bản sự kiện dùng chung qua Message Broker (Redis Streams).
/// Chi tiết cài đặt Redis và Transactional Outbox sẽ được triển khai tại Stage D2.
/// (CLAUDE.md mục 7)
/// </summary>
public interface IEventPublisher
{
    Task PublishAsync<T>(string streamName, T @event, CancellationToken cancellationToken = default) where T : class;
}
