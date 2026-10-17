namespace Auth.API.Workers;

/// <summary>
/// Cấu hình định kỳ quét Transactional Outbox cho Auth Service.
/// </summary>
public class AuthOutboxOptions
{
    public const string SectionName = "Outbox";

    /// <summary>
    /// Số lượng bản ghi pending tối đa xử lý trong mỗi batch.
    /// </summary>
    public int BatchSize { get; set; } = 20;

    /// <summary>
    /// Chu kỳ nghỉ giữa các đợt polling khi không có thông điệp pending (giây).
    /// </summary>
    public int PollIntervalSeconds { get; set; } = 2;

    /// <summary>
    /// Số lần thử lại tối đa trước khi đưa vào diện cần kiểm tra thủ công (Dead-letter threshold).
    /// </summary>
    public int MaxRetryCount { get; set; } = 5;

    /// <summary>
    /// Thời gian chờ khi gặp lỗi bất thường (ví dụ: mất kết nối Redis/DB) (giây).
    /// </summary>
    public int ErrorBackoffSeconds { get; set; } = 5;
}
