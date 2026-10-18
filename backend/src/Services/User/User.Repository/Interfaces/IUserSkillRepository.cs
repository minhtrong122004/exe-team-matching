using User.Repository.Entities;

namespace User.Repository.Interfaces;

/// <summary>
/// Interface truy xuất và quản lý quan hệ kỹ năng của người dùng trong ExeUserDb.
/// </summary>
public interface IUserSkillRepository
{
    Task<IReadOnlyList<UserSkill>> GetByUserIdAsync(Guid userId, CancellationToken ct = default);
    Task<UserSkill?> GetAsync(Guid userId, Guid skillId, CancellationToken ct = default);
    Task AddAsync(UserSkill userSkill, CancellationToken ct = default);
    Task AddRangeAsync(IEnumerable<UserSkill> userSkills, CancellationToken ct = default);
    void Remove(UserSkill userSkill);
    void RemoveRange(IEnumerable<UserSkill> userSkills);
}
