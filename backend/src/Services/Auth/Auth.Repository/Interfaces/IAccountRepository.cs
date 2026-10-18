using Auth.Repository.Entities;
using Auth.Repository.Enums;

namespace Auth.Repository.Interfaces;

/// <summary>
/// Hợp đồng Repository cho thực thể Account.
/// Lớp Services dùng interface này, không bao giờ dùng DbContext trực tiếp (CLAUDE.md mục 5).
/// </summary>
public interface IAccountRepository
{
    Task<Account?> GetByIdAsync(Guid id, CancellationToken ct = default);

    Task<Account?> GetByEmailAsync(string email, CancellationToken ct = default);

    Task<bool> ExistsByEmailAsync(string email, CancellationToken ct = default);

    Task AddAsync(Account account, CancellationToken ct = default);

    Task UpdateAsync(Account account, CancellationToken ct = default);

    Task<(IEnumerable<Account> Items, int TotalCount)> GetPagedAsync(
        string? search,
        AccountRole? role,
        bool? isActive,
        string sortBy,
        bool ascending,
        int page,
        int pageSize,
        CancellationToken ct = default);
}
