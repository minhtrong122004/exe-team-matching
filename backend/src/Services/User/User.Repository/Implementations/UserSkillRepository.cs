using Microsoft.EntityFrameworkCore;
using User.Repository.Data;
using User.Repository.Entities;
using User.Repository.Interfaces;

namespace User.Repository.Implementations;

/// <summary>
/// Triển khai truy xuất và quản lý quan hệ UserSkill bằng EF Core.
/// </summary>
public class UserSkillRepository : IUserSkillRepository
{
    private readonly UserDbContext _context;

    public UserSkillRepository(UserDbContext context)
    {
        _context = context;
    }

    public async Task<IReadOnlyList<UserSkill>> GetByUserIdAsync(Guid userId, CancellationToken ct = default)
    {
        return await _context.UserSkills
            .Include(us => us.Skill)
            .Where(us => us.UserId == userId)
            .ToListAsync(ct);
    }

    public async Task<UserSkill?> GetAsync(Guid userId, Guid skillId, CancellationToken ct = default)
    {
        return await _context.UserSkills
            .Include(us => us.Skill)
            .FirstOrDefaultAsync(us => us.UserId == userId && us.SkillId == skillId, ct);
    }

    public async Task AddAsync(UserSkill userSkill, CancellationToken ct = default)
    {
        await _context.UserSkills.AddAsync(userSkill, ct);
    }

    public async Task AddRangeAsync(IEnumerable<UserSkill> userSkills, CancellationToken ct = default)
    {
        await _context.UserSkills.AddRangeAsync(userSkills, ct);
    }

    public void Remove(UserSkill userSkill)
    {
        _context.UserSkills.Remove(userSkill);
    }

    public void RemoveRange(IEnumerable<UserSkill> userSkills)
    {
        _context.UserSkills.RemoveRange(userSkills);
    }
}
