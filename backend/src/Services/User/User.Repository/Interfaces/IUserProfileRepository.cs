using User.Repository.Entities;
using User.Repository.Enums;

namespace User.Repository.Interfaces;

/// <summary>
/// Interface truy xuất và quản lý dữ liệu UserProfile trong ExeUserDb.
/// </summary>
public interface IUserProfileRepository
{
    Task<UserProfile?> GetByIdAsync(Guid userId, CancellationToken ct = default);
    Task<UserProfile?> GetByIdWithSkillsAsync(Guid userId, CancellationToken ct = default);
    Task<UserProfile?> GetByEmailAsync(string email, CancellationToken ct = default);
    Task<UserProfile?> GetByStudentCodeAsync(string studentCode, CancellationToken ct = default);
    Task<IReadOnlyList<UserProfile>> GetByIdsWithSkillsAsync(IEnumerable<Guid> userIds, CancellationToken ct = default);
    Task<(IReadOnlyList<UserProfile> Items, int TotalCount)> SearchAsync(
        string? search,
        Major? major,
        string? skillName,
        UserAvailability? availability,
        string? sortBy,
        string sortDir,
        int page,
        int pageSize,
        CancellationToken ct = default);
    Task<bool> ExistsAsync(Guid userId, CancellationToken ct = default);
    Task AddAsync(UserProfile profile, CancellationToken ct = default);
    void Update(UserProfile profile);
    void Remove(UserProfile profile);
}
