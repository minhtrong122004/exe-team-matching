using Auth.Services.DTOs;

namespace Auth.Services.Interfaces;

/// <summary>
/// Hợp đồng dịch vụ khởi tạo an toàn tài khoản Quản trị viên (Admin Bootstrap).
/// Chỉ được phép thực thi trong môi trường Development và khi cơ sở dữ liệu chưa có bất kỳ Admin nào.
/// </summary>
public interface IAdminBootstrapService
{
    Task<AccountResponse> BootstrapAdminAsync(CancellationToken ct = default);
}
