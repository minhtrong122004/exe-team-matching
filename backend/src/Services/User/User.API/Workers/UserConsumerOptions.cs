namespace User.API.Workers;

/// <summary>
/// Cấu hình cho UserRegisteredConsumerWorker lắng nghe Redis Streams (CLAUDE.md mục 7).
/// </summary>
public class UserConsumerOptions
{
    public const string SectionName = "UserConsumer";

    /// <summary>
    /// Tên stream lắng nghe sự kiện đăng ký người dùng: exe:events:UserRegistered
    /// </summary>
    public string StreamName { get; set; } = "exe:events:UserRegistered";

    /// <summary>
    /// Tên Consumer Group: user-service (theo CLAUDE.md mục 7)
    /// </summary>
    public string ConsumerGroup { get; set; } = "user-service";

    /// <summary>
    /// Tên định danh của consumer instance: user-service-worker-1
    /// </summary>
    public string ConsumerName { get; set; } = "user-service-worker-1";

    /// <summary>
    /// Tên stream Dead-letter lưu trữ các bản tin độc hại (poison messages) không thể xử lý: exe:deadletter:UserRegistered
    /// </summary>
    public string DeadLetterStreamName { get; set; } = "exe:deadletter:UserRegistered";

    /// <summary>
    /// Số lượng bản tin tối đa đọc trong mỗi lần gọi XREADGROUP
    /// </summary>
    public int BatchSize { get; set; } = 10;

    /// <summary>
    /// Thời gian chờ giữa các chu kỳ đọc mới (ms)
    /// </summary>
    public int PollIntervalMs { get; set; } = 1000;

    /// <summary>
    /// Chu kỳ kiểm tra các bản tin tồn đọng chưa ACK (Pending Entries List) (ms)
    /// </summary>
    public int PendingCheckIntervalMs { get; set; } = 15000;

    /// <summary>
    /// Thời gian rảnh tối thiểu (idle time) để coi một pending message là bị bỏ rơi cần phục hồi (ms)
    /// </summary>
    public int PendingMinIdleMs { get; set; } = 10000;

    /// <summary>
    /// Số lần thử lại tối đa trước khi đưa vào Dead-letter stream
    /// </summary>
    public int MaxRetryCount { get; set; } = 5;
}
