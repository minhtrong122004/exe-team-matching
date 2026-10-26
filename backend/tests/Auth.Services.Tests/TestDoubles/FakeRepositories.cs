using Auth.Repository.Entities;
using Auth.Repository.Enums;
using Auth.Repository.Interfaces;
using Microsoft.EntityFrameworkCore.Storage;

namespace Auth.Services.Tests.TestDoubles;

public class FakeAccountRepository : IAccountRepository
{
    public readonly List<Account> Accounts = new();

    public Task<Account?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        return Task.FromResult(Accounts.FirstOrDefault(a => a.Id == id));
    }

    public Task<Account?> GetByEmailAsync(string email, CancellationToken ct = default)
    {
        return Task.FromResult(Accounts.FirstOrDefault(a => a.Email.Equals(email, StringComparison.OrdinalIgnoreCase)));
    }

    public Task<bool> ExistsByEmailAsync(string email, CancellationToken ct = default)
    {
        return Task.FromResult(Accounts.Any(a => a.Email.Equals(email, StringComparison.OrdinalIgnoreCase)));
    }

    public Task AddAsync(Account account, CancellationToken ct = default)
    {
        Accounts.Add(account);
        return Task.CompletedTask;
    }

    public Task UpdateAsync(Account account, CancellationToken ct = default)
    {
        var idx = Accounts.FindIndex(a => a.Id == account.Id);
        if (idx >= 0)
        {
            Accounts[idx] = account;
        }
        return Task.CompletedTask;
    }

    public Task<(IEnumerable<Account> Items, int TotalCount)> GetPagedAsync(
        string? search,
        AccountRole? role,
        bool? isActive,
        string sortBy,
        bool ascending,
        int page,
        int pageSize,
        CancellationToken ct = default)
    {
        var query = Accounts.AsEnumerable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim();
            query = query.Where(a => a.Email.Contains(s, StringComparison.OrdinalIgnoreCase) ||
                                     a.RegistrationFullName.Contains(s, StringComparison.OrdinalIgnoreCase));
        }

        if (role.HasValue)
        {
            query = query.Where(a => a.Role == role.Value);
        }

        if (isActive.HasValue)
        {
            query = query.Where(a => a.IsActive == isActive.Value);
        }

        var total = query.Count();
        var items = query.Skip((page - 1) * pageSize).Take(pageSize).ToList();
        return Task.FromResult(((IEnumerable<Account>)items, total));
    }
}

public class FakeRefreshTokenRepository : IRefreshTokenRepository
{
    public readonly List<RefreshToken> RefreshTokens = new();

    public Task<RefreshToken?> GetByTokenHashAsync(string tokenHash, CancellationToken ct = default)
    {
        return Task.FromResult(RefreshTokens.FirstOrDefault(t => t.TokenHash == tokenHash));
    }

    public Task AddAsync(RefreshToken refreshToken, CancellationToken ct = default)
    {
        RefreshTokens.Add(refreshToken);
        return Task.CompletedTask;
    }

    public Task UpdateAsync(RefreshToken refreshToken, CancellationToken ct = default)
    {
        var idx = RefreshTokens.FindIndex(t => t.Id == refreshToken.Id);
        if (idx >= 0)
        {
            RefreshTokens[idx] = refreshToken;
        }
        return Task.CompletedTask;
    }

    public Task RevokeAllForAccountAsync(Guid accountId, string reason, CancellationToken ct = default)
    {
        foreach (var t in RefreshTokens.Where(t => t.AccountId == accountId && t.RevokedAt == null))
        {
            t.RevokedAt = DateTime.UtcNow;
            t.RevokeReason = reason;
        }
        return Task.CompletedTask;
    }
}

public class FakeOutboxRepository : IOutboxRepository
{
    public readonly List<OutboxMessage> Messages = new();

    public Task AddAsync(OutboxMessage message, CancellationToken ct = default)
    {
        Messages.Add(message);
        return Task.CompletedTask;
    }

    public Task<IEnumerable<OutboxMessage>> GetPendingMessagesAsync(int batchSize, CancellationToken ct = default)
    {
        return Task.FromResult(Messages.Where(m => m.ProcessedAt == null).Take(batchSize));
    }

    public Task UpdateAsync(OutboxMessage message, CancellationToken ct = default)
    {
        var idx = Messages.FindIndex(m => m.Id == message.Id);
        if (idx >= 0)
        {
            Messages[idx] = message;
        }
        return Task.CompletedTask;
    }
}

public class FakeUnitOfWork : IUnitOfWork
{
    public int SaveChangesCalls { get; private set; }

    public Task<IDbContextTransaction> BeginTransactionAsync(CancellationToken ct = default)
    {
        throw new NotImplementedException();
    }

    public Task<int> SaveChangesAsync(CancellationToken ct = default)
    {
        SaveChangesCalls++;
        return Task.FromResult(1);
    }

    public async Task ExecuteInTransactionAsync(Func<Task> action, CancellationToken ct = default)
    {
        await action();
    }

    public async Task ExecuteInTransactionAsync(Func<Task> action, System.Data.IsolationLevel isolationLevel, CancellationToken ct = default)
    {
        await action();
    }
}

public class FakeEmailVerificationChallengeRepository : IEmailVerificationChallengeRepository
{
    public readonly List<EmailVerificationChallenge> Challenges = new();

    public Task AddAsync(EmailVerificationChallenge challenge, CancellationToken ct = default)
    {
        Challenges.Add(challenge);
        return Task.CompletedTask;
    }

    public Task<EmailVerificationChallenge?> GetActiveChallengeByAccountIdAsync(Guid accountId, Auth.Repository.Enums.ChallengePurpose purpose = Auth.Repository.Enums.ChallengePurpose.EmailVerification, CancellationToken ct = default)
    {
        return Task.FromResult(Challenges
            .Where(c => c.AccountId == accountId && c.Purpose == purpose && !c.IsUsed)
            .OrderByDescending(c => c.CreatedAt)
            .FirstOrDefault());
    }

    public Task<EmailVerificationChallenge?> GetActiveChallengeByEmailAsync(string email, Auth.Repository.Enums.ChallengePurpose purpose = Auth.Repository.Enums.ChallengePurpose.EmailVerification, CancellationToken ct = default)
    {
        return Task.FromResult(Challenges
            .Where(c => c.Email.Equals(email, StringComparison.OrdinalIgnoreCase) && c.Purpose == purpose && !c.IsUsed)
            .OrderByDescending(c => c.CreatedAt)
            .FirstOrDefault());
    }

    public Task InvalidatePreviousChallengesAsync(Guid accountId, Auth.Repository.Enums.ChallengePurpose purpose = Auth.Repository.Enums.ChallengePurpose.EmailVerification, CancellationToken ct = default)
    {
        foreach (var c in Challenges.Where(c => c.AccountId == accountId && c.Purpose == purpose && !c.IsUsed))
        {
            c.IsUsed = true;
        }
        return Task.CompletedTask;
    }

    public Task<int> CountResendsInLastHourAsync(Guid accountId, Auth.Repository.Enums.ChallengePurpose purpose = Auth.Repository.Enums.ChallengePurpose.EmailVerification, CancellationToken ct = default)
    {
        var oneHourAgo = DateTime.UtcNow.AddHours(-1);
        var count = Challenges.Count(c => c.AccountId == accountId && c.Purpose == purpose && c.CreatedAt >= oneHourAgo);
        return Task.FromResult(count);
    }

    public Task UpdateAsync(EmailVerificationChallenge challenge, CancellationToken ct = default)
    {
        var idx = Challenges.FindIndex(c => c.Id == challenge.Id);
        if (idx >= 0)
        {
            Challenges[idx] = challenge;
        }
        return Task.CompletedTask;
    }
}

public class FakeEmailSender : Auth.Services.Interfaces.IEmailSender
{
    public readonly List<(string Email, string Name, string Otp)> SentEmails = new();
    public readonly List<(string Email, string Name, string Otp)> SentPasswordResetEmails = new();

    public Task SendVerificationOtpAsync(string recipientEmail, string recipientName, string otp, CancellationToken ct = default)
    {
        SentEmails.Add((recipientEmail, recipientName, otp));
        return Task.CompletedTask;
    }

    public Task SendPasswordResetOtpAsync(string recipientEmail, string recipientName, string otp, CancellationToken ct = default)
    {
        SentPasswordResetEmails.Add((recipientEmail, recipientName, otp));
        return Task.CompletedTask;
    }
}
