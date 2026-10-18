using Microsoft.EntityFrameworkCore;
using User.Repository.Data;
using User.Repository.Entities;
using User.Repository.Enums;
using User.Repository.Interfaces;

namespace User.Repository.Implementations;

/// <summary>
/// Triển khai truy xuất và quản lý danh mục Skill bằng EF Core.
/// </summary>
public class SkillRepository : ISkillRepository
{
    private readonly UserDbContext _context;

    public SkillRepository(UserDbContext context)
    {
        _context = context;
    }

    public async Task<Skill?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        return await _context.Skills
            .FirstOrDefaultAsync(s => s.Id == id, ct);
    }

    public async Task<Skill?> GetByNameAsync(string name, CancellationToken ct = default)
    {
        var trimmed = name.Trim();
        return await _context.Skills
            .FirstOrDefaultAsync(s => s.Name.ToLower() == trimmed.ToLower(), ct);
    }

    public async Task<IReadOnlyList<Skill>> GetAllAsync(CancellationToken ct = default)
    {
        return await _context.Skills
            .AsNoTracking()
            .OrderBy(s => s.Name)
            .ToListAsync(ct);
    }

    public async Task<IReadOnlyList<Skill>> GetByCategoryAsync(SkillCategory category, CancellationToken ct = default)
    {
        return await _context.Skills
            .AsNoTracking()
            .Where(s => s.Category == category)
            .OrderBy(s => s.Name)
            .ToListAsync(ct);
    }

    public async Task<IReadOnlyList<Skill>> GetByIdsAsync(IEnumerable<Guid> ids, CancellationToken ct = default)
    {
        var idList = ids.ToList();
        return await _context.Skills
            .Where(s => idList.Contains(s.Id))
            .ToListAsync(ct);
    }

    public async Task AddAsync(Skill skill, CancellationToken ct = default)
    {
        await _context.Skills.AddAsync(skill, ct);
    }
}
