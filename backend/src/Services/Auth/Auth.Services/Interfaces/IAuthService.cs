using Auth.Services.DTOs;

namespace Auth.Services.Interfaces;

/// <summary>
/// Hợp đồng nghiệp vụ xác thực chính của Auth Service:
/// Đăng ký (kèm Transactional Outbox), Đăng nhập, Làm mới Refresh Token, Đăng xuất và Lấy thông tin tài khoản hiện tại.
/// </summary>
public interface IAuthService
{
    Task<AuthResponse> RegisterAsync(RegisterRequest request, CancellationToken ct = default);

    Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken ct = default);

    Task<AuthResponse> RefreshTokenAsync(RefreshTokenRequest request, CancellationToken ct = default);

    Task LogoutAsync(LogoutRequest request, CancellationToken ct = default);

    Task<AccountResponse> GetCurrentAccountAsync(Guid accountId, CancellationToken ct = default);
}
