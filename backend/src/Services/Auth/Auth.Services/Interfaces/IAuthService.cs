using Auth.Services.DTOs;

namespace Auth.Services.Interfaces;

/// <summary>
/// Hợp đồng quản lý phiên đăng nhập của Auth Service:
/// đăng nhập Google, làm mới Refresh Token, đăng xuất, điều khoản BR-34 và lấy thông tin tài khoản hiện tại.
/// </summary>
public interface IAuthService
{
    /// <summary>
    /// Đăng nhập bằng Google. Chỉ email đã có tài khoản (tạo khi import danh sách FAP hoặc do Moderator cấp) mới vào được.
    /// </summary>
    Task<AuthResponse> LoginWithGoogleAsync(GoogleLoginRequest request, CancellationToken ct = default);

    Task<AuthResponse> RefreshTokenAsync(RefreshTokenRequest request, CancellationToken ct = default);

    Task LogoutAsync(LogoutRequest request, CancellationToken ct = default);

    Task<AcceptTermsResponse> AcceptTermsAsync(Guid accountId, CancellationToken ct = default);

    Task<AccountResponse> GetCurrentAccountAsync(Guid accountId, CancellationToken ct = default);
}
