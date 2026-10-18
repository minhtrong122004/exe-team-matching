using Microsoft.EntityFrameworkCore;
using User.Repository.Data;
using User.Repository.Entities;
using User.Repository.Enums;
using User.Repository.Interfaces;

namespace User.Repository.Implementations;

/// <summary>
/// Triển khai truy xuất và quản lý UserProfile bằng EF Core.
/// </summary>
public class UserProfileRepository : IUserProfileRepository
{
    private readonly UserDbContext _context;

    public UserProfileRepository(UserDbContext context)
    {
        _context = context;
    }

    public async Task<UserProfile?> GetByIdAsync(Guid userId, CancellationToken ct = default)
    {
        return await _context.UserProfiles
            .FirstOrDefaultAsync(u => u.UserId == userId, ct);
    }

    public async Task<UserProfile?> GetByIdWithSkillsAsync(Guid userId, CancellationToken ct = default)
    {
        return await _context.UserProfiles
            .Include(u => u.Skills)
                .ThenInclude(us => us.Skill)
            .FirstOrDefaultAsync(u => u.UserId == userId, ct);
    }

    public async Task<UserProfile?> GetByEmailAsync(string email, CancellationToken ct = default)
    {
        return await _context.UserProfiles
            .FirstOrDefaultAsync(u => u.Email == email, ct);
    }

    public async Task<UserProfile?> GetByStudentCodeAsync(string studentCode, CancellationToken ct = default)
    {
        return await _context.UserProfiles
            .FirstOrDefaultAsync(u => u.StudentCode == studentCode, ct);
    }

    public async Task<IReadOnlyList<UserProfile>> GetByIdsWithSkillsAsync(IEnumerable<Guid> userIds, CancellationToken ct = default)
    {
        var idList = userIds.ToList();
        return await _context.UserProfiles
            .Include(u => u.Skills)
                .ThenInclude(us => us.Skill)
            .Where(u => idList.Contains(u.UserId))
            .ToListAsync(ct);
    }

    public async Task<(IReadOnlyList<UserProfile> Items, int TotalCount)> SearchAsync(
        string? search,
        Major? major,
        string? skillName,
        UserAvailability? availability,
        string? sortBy,
        string sortDir,
        int page,
        int pageSize,
        CancellationToken ct = default)
    {
        var query = _context.UserProfiles
            .Include(u => u.Skills)
                .ThenInclude(us => us.Skill)
            .AsNoTracking()
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var trimmedSearch = search.Trim();
            query = query.Where(u =>
                u.FullName.Contains(trimmedSearch) ||
                u.Email.Contains(trimmedSearch) ||
                (u.StudentCode != null && u.StudentCode.Contains(trimmedSearch)) ||
                (u.DesiredRole != null && u.DesiredRole.Contains(trimmedSearch)));
        }

        if (major.HasValue)
        {
            query = query.Where(u => u.Major == major.Value);
        }

        if (availability.HasValue)
        {
            query = query.Where(u => u.Availability == availability.Value);
        }

        if (!string.IsNullOrWhiteSpace(skillName))
        {
            var trimmedSkill = skillName.Trim();
            query = query.Where(u => u.Skills.Any(s => s.Skill.Name.Contains(trimmedSkill)));
        }

        var totalCount = await query.CountAsync(ct);

        var isDesc = string.Equals(sortDir, "desc", StringComparison.OrdinalIgnoreCase);
        query = sortBy?.ToLowerInvariant() switch
        {
            "fullname" => isDesc ? query.OrderByDescending(u => u.FullName) : query.OrderBy(u => u.FullName),
            "email" => isDesc ? query.OrderByDescending(u => u.Email) : query.OrderBy(u => u.Email),
            "studentcode" => isDesc ? query.OrderByDescending(u => u.StudentCode) : query.OrderBy(u => u.StudentCode),
            "createdat" => isDesc ? query.OrderByDescending(u => u.CreatedAt) : query.OrderBy(u => u.CreatedAt),
            _ => isDesc ? query.OrderByDescending(u => u.UpdatedAt) : query.OrderBy(u => u.UpdatedAt)
        };

        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        return (items, totalCount);
    }

    public async Task<bool> ExistsAsync(Guid userId, CancellationToken ct = default)
    {
        return await _context.UserProfiles
            .AnyAsync(u => u.UserId == userId, ct);
    }

    public async Task AddAsync(UserProfile profile, CancellationToken ct = default)
    {
        await _context.UserProfiles.AddAsync(profile, ct);
    }

    public void Update(UserProfile profile)
    {
        _context.UserProfiles.Update(profile);
    }

    public void Remove(UserProfile profile)
    {
        _context.UserProfiles.Remove(profile);
    }
}
