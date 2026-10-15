namespace Exe.BuildingBlocks.Web;

/// <summary>
/// Correlation ID của request/event đang xử lý, dùng để lần theo một thao tác qua nhiều service.
/// Đặt bởi RequestLoggingMiddleware (HTTP) và EventConsumerBase (event); được chuyển tiếp
/// sang lời gọi HTTP khác (ForwardHeadersHandler) và envelope của event.
/// </summary>
public static class CorrelationContext
{
    public const string HeaderName = "X-Correlation-Id";

    private static readonly AsyncLocal<string?> CurrentValue = new();

    public static string? Current
    {
        get => CurrentValue.Value;
        set => CurrentValue.Value = value;
    }
}
