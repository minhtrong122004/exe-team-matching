using Auth.Repository.Data;
using Auth.Repository.Entities;
using Auth.Repository.Enums;
using Auth.Repository.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Auth.Repository.Implementations;

/// <summary>
/// Triển khai IAccountRepository làm việc trực tiếp với AuthDbContext.
/// </summary>
public class AccountRepository : IAccountRepository
{
    private readonly AuthDbContext _db;

    public AccountRepository(AuthDbContext db)
    {
        _db = db;
    }

    public async Task<Account?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        return await _db.Accounts
            .FirstOrDefaultAsync(a => a.Id == id, ct);
    }

    public async Task<Account?> GetByEmailAsync(string email, CancellationToken ct = default)
    {
        var normalizedEmail = email.Trim().ToLowerInvariant();
        return await _db.Accounts
            .FirstOrDefaultAsync(a => a.Email.ToLower() == normalizedEmail, ct);
    }

    public async Task<bool> ExistsByEmailAsync(string email, CancellationToken ct = default)
    {
        var normalizedEmail = email.Trim().ToLowerInvariant();
        return await _db.Accounts
            .AnyAsync(a => a.Email.ToLower() == normalizedEmail, ct);
    }

    public async Task AddAsync(Account account, CancellationToken ct = default)
    {
        account.Email = account.Email.Trim().ToLowerInvariant();
        await _db.Accounts.AddAsync(account, ct);
        await _db.SaveChangesAsync(ct);
    }

    public async Task UpdateAsync(Account account, CancellationToken ct = default)
    {
        _db.Accounts.Update(account);
        await _db.SaveChangesAsync(ct);
    }

    public async Task<(IEnumerable<Account> Items, int TotalCount)> GetPagedAsync(
        string? search,
        AccountRole? role,
        bool? isActive,
        string sortBy,
        bool ascending,
        int page,
        int pageSize,
        CancellationToken ct = default)
    {
        var query = _db.Accounts
            .AsNoTracking()
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var keyword = search.Trim().ToLower();
            query = query.Where(a =>
                a.Email.ToLower().Contains(keyword) ||
                a.RegistrationFullName.ToLower().Contains(keyword));
        }

        if (role.HasValue)
        {
            query = query.Where(a => a.Role == role.Value);
        }

        if (isActive.HasValue)
        {
            query = query.Where(a => a.IsActive == isActive.Value);
        }

        var totalCount = await query.CountAsync(ct);

        query = sortBy.ToLowerInvariant() switch
        {
            "email"     => ascending ? query.OrderBy(a => a.Email)     : query.OrderByDescending(a => a.Email),
            "fullname"  => ascending ? query.OrderBy(a => a.RegistrationFullName) : query.OrderByDescending(a => a.RegistrationFullName),
            "role"      => ascending ? query.OrderBy(a => a.Role)      : query.OrderByDescending(a => a.Role),
            "updatedat" => ascending ? query.OrderBy(a => a.UpdatedAt) : query.OrderByDescending(a => a.UpdatedAt),
            _           => ascending ? query.OrderBy(a => a.CreatedAt) : query.OrderByDescending(a => a.CreatedAt)
        };

        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        return (items, totalCount);
    }
}
