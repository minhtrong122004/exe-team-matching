namespace Auth.Services.DTOs;

/// <summary>
/// Cấu hình tích hợp dịch vụ gửi email giao dịch qua Brevo Transactional Email REST API (Gate F).
/// </summary>
public class BrevoOptions
{
    public const string SectionName = "Brevo";

    /// <summary>
    /// Brevo Transactional API Key (truyền trong HTTP header 'api-key').
    /// Tuyệt đối không commit giá trị thực vào Git. Lấy từ environment variable hoặc User Secrets.
    /// </summary>
    public string ApiKey { get; set; } = string.Empty;

    /// <summary>
    /// Địa chỉ email người gửi đã được xác minh trên tài khoản Brevo (Sender Email).
    /// </summary>
    public string SenderEmail { get; set; } = "no-reply@exeteammatching.com";

    /// <summary>
    /// Tên người gửi hiển thị trong hộp thư đến.
    /// </summary>
    public string SenderName { get; set; } = "EXE Team Matching";

    /// <summary>
    /// Cờ bật/tắt gửi email thực tế. Nếu false, hệ thống dùng mock provider (không gọi Brevo API).
    /// </summary>
    public bool EnableRealEmail { get; set; } = false;

    /// <summary>
    /// Thời gian chờ tối đa (timeout) cho HTTP request gửi mail (giây).
    /// </summary>
    public int TimeoutSeconds { get; set; } = 10;
}
