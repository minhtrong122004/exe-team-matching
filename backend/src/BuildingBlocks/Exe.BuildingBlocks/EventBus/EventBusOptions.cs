namespace Exe.BuildingBlocks.EventBus;

/// <summary>Cấu hình section "EventBus" (không bắt buộc, đã có giá trị mặc định).</summary>
public sealed class EventBusOptions
{
    public const string SectionName = "EventBus";

    /// <summary>
    /// Tên consumer trong consumer group. Mặc định bằng tên consumer group, để sau khi container
    /// khởi động lại vẫn đọc tiếp được các entry đã nhận mà chưa ACK.
    /// </summary>
    public string? ConsumerName { get; set; }

    public int BatchSize { get; set; } = 10;
    public int PollIntervalMs { get; set; } = 1000;

    /// <summary>Số lần xử lý lỗi tối đa trước khi bỏ qua entry (ghi log [EVENT-DEAD] rồi ACK).</summary>
    public int MaxDeliveryAttempts { get; set; } = 5;
}
