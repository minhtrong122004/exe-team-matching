using Auth.Repository.Data;
using Auth.Repository.Entities;
using Auth.Repository.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Auth.Repository.Implementations;

/// <summary>
/// Triển khai IEmailVerificationChallengeRepository làm việc trực tiếp với AuthDbContext.
/// </summary>
public class EmailVerificationChallengeRepository : IEmailVerificationChallengeRepository
{
    private readonly AuthDbContext _db;

    public EmailVerificationChallengeRepository(AuthDbContext db)
    {
        _db = db;
    }

    public async Task AddAsync(EmailVerificationChallenge challenge, CancellationToken ct = default)
    {
        challenge.Email = challenge.Email.Trim().ToLowerInvariant();
        await _db.EmailVerificationChallenges.AddAsync(challenge, ct);
    }

    public async Task<EmailVerificationChallenge?> GetActiveChallengeByAccountIdAsync(Guid accountId, Auth.Repository.Enums.ChallengePurpose purpose = Auth.Repository.Enums.ChallengePurpose.EmailVerification, CancellationToken ct = default)
    {
        return await _db.EmailVerificationChallenges
            .Where(c => c.AccountId == accountId && c.Purpose == purpose && !c.IsUsed)
            .OrderByDescending(c => c.CreatedAt)
            .FirstOrDefaultAsync(ct);
    }

    public async Task<EmailVerificationChallenge?> GetActiveChallengeByEmailAsync(string email, Auth.Repository.Enums.ChallengePurpose purpose = Auth.Repository.Enums.ChallengePurpose.EmailVerification, CancellationToken ct = default)
    {
        var normalizedEmail = email.Trim().ToLowerInvariant();
        return await _db.EmailVerificationChallenges
            .Where(c => c.Email == normalizedEmail && c.Purpose == purpose && !c.IsUsed)
            .OrderByDescending(c => c.CreatedAt)
            .FirstOrDefaultAsync(ct);
    }

    public async Task InvalidatePreviousChallengesAsync(Guid accountId, Auth.Repository.Enums.ChallengePurpose purpose = Auth.Repository.Enums.ChallengePurpose.EmailVerification, CancellationToken ct = default)
    {
        var activeChallenges = await _db.EmailVerificationChallenges
            .Where(c => c.AccountId == accountId && c.Purpose == purpose && !c.IsUsed)
            .ToListAsync(ct);

        foreach (var c in activeChallenges)
        {
            c.IsUsed = true;
        }
    }

    public async Task<int> CountResendsInLastHourAsync(Guid accountId, Auth.Repository.Enums.ChallengePurpose purpose = Auth.Repository.Enums.ChallengePurpose.EmailVerification, CancellationToken ct = default)
    {
        var oneHourAgo = DateTime.UtcNow.AddHours(-1);
        return await _db.EmailVerificationChallenges
            .CountAsync(c => c.AccountId == accountId && c.Purpose == purpose && c.CreatedAt >= oneHourAgo, ct);
    }

    public async Task UpdateAsync(EmailVerificationChallenge challenge, CancellationToken ct = default)
    {
        _db.EmailVerificationChallenges.Update(challenge);
        await Task.CompletedTask;
    }
}
