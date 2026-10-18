using Auth.Repository.Data;
using Auth.Repository.Entities;
using Auth.Repository.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Auth.Repository.Implementations;

/// <summary>
/// Triển khai IRefreshTokenRepository làm việc với bảng RefreshTokens theo TokenHash.
/// </summary>
public class RefreshTokenRepository : IRefreshTokenRepository
{
    private readonly AuthDbContext _db;

    public RefreshTokenRepository(AuthDbContext db)
    {
        _db = db;
    }

    public async Task<RefreshToken?> GetByTokenHashAsync(string tokenHash, CancellationToken ct = default)
    {
        return await _db.RefreshTokens
            .Include(r => r.Account)
            .FirstOrDefaultAsync(r => r.TokenHash == tokenHash, ct);
    }

    public async Task AddAsync(RefreshToken refreshToken, CancellationToken ct = default)
    {
        await _db.RefreshTokens.AddAsync(refreshToken, ct);
        await _db.SaveChangesAsync(ct);
    }

    public async Task UpdateAsync(RefreshToken refreshToken, CancellationToken ct = default)
    {
        _db.RefreshTokens.Update(refreshToken);
        await _db.SaveChangesAsync(ct);
    }

    public async Task RevokeAllForAccountAsync(Guid accountId, string reason, CancellationToken ct = default)
    {
        var activeTokens = await _db.RefreshTokens
            .Where(r => r.AccountId == accountId && r.RevokedAt == null)
            .ToListAsync(ct);

        var now = DateTime.UtcNow;
        foreach (var token in activeTokens)
        {
            token.RevokedAt = now;
            token.RevokeReason = reason;
        }

        if (activeTokens.Count > 0)
        {
            await _db.SaveChangesAsync(ct);
        }
    }
}
