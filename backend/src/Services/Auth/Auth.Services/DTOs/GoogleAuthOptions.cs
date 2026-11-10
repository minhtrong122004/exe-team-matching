namespace Auth.Services.DTOs;

/// <summary>
/// Cấu hình đăng nhập Google (section "GoogleAuth"). ClientId là mã công khai, không phải bí mật.
/// </summary>
public class GoogleAuthOptions
{
    public const string SectionName = "GoogleAuth";

    public string ClientId { get; set; } = string.Empty;
}
