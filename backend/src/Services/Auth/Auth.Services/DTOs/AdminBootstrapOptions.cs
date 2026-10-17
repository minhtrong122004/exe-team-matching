namespace Auth.Services.DTOs;

/// <summary>
/// Cấu hình thông tin khởi tạo tài khoản Quản trị viên (Admin Bootstrap).
/// Chỉ được phép nạp từ nguồn bí mật cục bộ (user-secrets / biến môi trường), tuyệt đối không lưu trong Git.
/// </summary>
public class AdminBootstrapOptions
{
    public const string SectionName = "Bootstrap";

    public string? AdminEmail { get; set; }

    public string? AdminPassword { get; set; }

    public string? AdminFullName { get; set; } = "System Administrator";
}
