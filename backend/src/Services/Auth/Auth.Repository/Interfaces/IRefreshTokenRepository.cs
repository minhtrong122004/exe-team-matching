using Auth.Repository.Entities;

namespace Auth.Repository.Interfaces;

/// <summary>
/// Hợp đồng Repository quản lý RefreshToken bằng TokenHash.
/// </summary>
public interface IRefreshTokenRepository
{
    Task<RefreshToken?> GetByTokenHashAsync(string tokenHash, CancellationToken ct = default);

    Task AddAsync(RefreshToken refreshToken, CancellationToken ct = default);

    Task UpdateAsync(RefreshToken refreshToken, CancellationToken ct = default);

    /// <summary>
    /// Thu hồi toàn bộ Refresh Token của tài khoản khi phát hiện token reuse hoặc khi tài khoản bị khóa.
    /// </summary>
    Task RevokeAllForAccountAsync(Guid accountId, string reason, CancellationToken ct = default);
}
