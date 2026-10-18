using User.Repository.Entities;
using User.Repository.Enums;

namespace User.Repository.Interfaces;

/// <summary>
/// Interface truy xuất và quản lý danh mục kỹ năng trong ExeUserDb.
/// </summary>
public interface ISkillRepository
{
    Task<Skill?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<Skill?> GetByNameAsync(string name, CancellationToken ct = default);
    Task<IReadOnlyList<Skill>> GetAllAsync(CancellationToken ct = default);
    Task<IReadOnlyList<Skill>> GetByCategoryAsync(SkillCategory category, CancellationToken ct = default);
    Task<IReadOnlyList<Skill>> GetByIdsAsync(IEnumerable<Guid> ids, CancellationToken ct = default);
    Task AddAsync(Skill skill, CancellationToken ct = default);
}
