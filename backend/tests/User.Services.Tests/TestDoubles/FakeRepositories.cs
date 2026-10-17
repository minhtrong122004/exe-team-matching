using Microsoft.EntityFrameworkCore.Storage;
using User.Repository.Entities;
using User.Repository.Enums;
using User.Repository.Interfaces;

namespace User.Services.Tests.TestDoubles;

public class FakeUserProfileRepository : IUserProfileRepository
{
    public List<UserProfile> Profiles { get; } = new();

    public Task<UserProfile?> GetByIdAsync(Guid userId, CancellationToken ct = default)
    {
        return Task.FromResult(Profiles.FirstOrDefault(p => p.UserId == userId));
    }

    public Task<UserProfile?> GetByIdWithSkillsAsync(Guid userId, CancellationToken ct = default)
    {
        return Task.FromResult(Profiles.FirstOrDefault(p => p.UserId == userId));
    }

    public Task<UserProfile?> GetByEmailAsync(string email, CancellationToken ct = default)
    {
        return Task.FromResult(Profiles.FirstOrDefault(p => p.Email.Equals(email, StringComparison.OrdinalIgnoreCase)));
    }

    public Task<UserProfile?> GetByStudentCodeAsync(string studentCode, CancellationToken ct = default)
    {
        return Task.FromResult(Profiles.FirstOrDefault(p => string.Equals(p.StudentCode, studentCode, StringComparison.OrdinalIgnoreCase)));
    }

    public Task<IReadOnlyList<UserProfile>> GetByIdsWithSkillsAsync(IEnumerable<Guid> userIds, CancellationToken ct = default)
    {
        var idSet = userIds.ToHashSet();
        IReadOnlyList<UserProfile> result = Profiles.Where(p => idSet.Contains(p.UserId)).ToList();
        return Task.FromResult(result);
    }

    public Task<(IReadOnlyList<UserProfile> Items, int TotalCount)> SearchAsync(
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
        var query = Profiles.AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            query = query.Where(p =>
                p.FullName.Contains(search, StringComparison.OrdinalIgnoreCase) ||
                p.Email.Contains(search, StringComparison.OrdinalIgnoreCase) ||
                (p.StudentCode != null && p.StudentCode.Contains(search, StringComparison.OrdinalIgnoreCase)));
        }

        if (major.HasValue)
        {
            query = query.Where(p => p.Major == major.Value);
        }

        if (availability.HasValue)
        {
            query = query.Where(p => p.Availability == availability.Value);
        }

        if (!string.IsNullOrWhiteSpace(skillName))
        {
            query = query.Where(p => p.Skills.Any(s => s.Skill != null && s.Skill.Name.Contains(skillName, StringComparison.OrdinalIgnoreCase)));
        }

        var total = query.Count();
        IReadOnlyList<UserProfile> items = query.Skip((page - 1) * pageSize).Take(pageSize).ToList();
        return Task.FromResult((items, total));
    }

    public Task<bool> ExistsAsync(Guid userId, CancellationToken ct = default)
    {
        return Task.FromResult(Profiles.Any(p => p.UserId == userId));
    }

    public Task AddAsync(UserProfile profile, CancellationToken ct = default)
    {
        Profiles.Add(profile);
        return Task.CompletedTask;
    }

    public void Update(UserProfile profile)
    {
        var idx = Profiles.FindIndex(p => p.UserId == profile.UserId);
        if (idx >= 0)
        {
            Profiles[idx] = profile;
        }
    }

    public void Remove(UserProfile profile)
    {
        Profiles.RemoveAll(p => p.UserId == profile.UserId);
    }
}

public class FakeSkillRepository : ISkillRepository
{
    public List<Skill> Skills { get; } = new();

    public Task<Skill?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        return Task.FromResult(Skills.FirstOrDefault(s => s.Id == id));
    }

    public Task<Skill?> GetByNameAsync(string name, CancellationToken ct = default)
    {
        return Task.FromResult(Skills.FirstOrDefault(s => s.Name.Equals(name, StringComparison.OrdinalIgnoreCase)));
    }

    public Task<IReadOnlyList<Skill>> GetAllAsync(CancellationToken ct = default)
    {
        IReadOnlyList<Skill> result = Skills.OrderBy(s => s.Name).ToList();
        return Task.FromResult(result);
    }

    public Task<IReadOnlyList<Skill>> GetByCategoryAsync(SkillCategory category, CancellationToken ct = default)
    {
        IReadOnlyList<Skill> result = Skills.Where(s => s.Category == category).OrderBy(s => s.Name).ToList();
        return Task.FromResult(result);
    }

    public Task<IReadOnlyList<Skill>> GetByIdsAsync(IEnumerable<Guid> ids, CancellationToken ct = default)
    {
        var idSet = ids.ToHashSet();
        IReadOnlyList<Skill> result = Skills.Where(s => idSet.Contains(s.Id)).ToList();
        return Task.FromResult(result);
    }

    public Task AddAsync(Skill skill, CancellationToken ct = default)
    {
        Skills.Add(skill);
        return Task.CompletedTask;
    }
}

public class FakeUserSkillRepository : IUserSkillRepository
{
    public List<UserSkill> UserSkills { get; } = new();

    public Task<IReadOnlyList<UserSkill>> GetByUserIdAsync(Guid userId, CancellationToken ct = default)
    {
        IReadOnlyList<UserSkill> result = UserSkills.Where(us => us.UserId == userId).ToList();
        return Task.FromResult(result);
    }

    public Task<UserSkill?> GetAsync(Guid userId, Guid skillId, CancellationToken ct = default)
    {
        return Task.FromResult(UserSkills.FirstOrDefault(us => us.UserId == userId && us.SkillId == skillId));
    }

    public Task AddAsync(UserSkill userSkill, CancellationToken ct = default)
    {
        UserSkills.Add(userSkill);
        return Task.CompletedTask;
    }

    public Task AddRangeAsync(IEnumerable<UserSkill> userSkills, CancellationToken ct = default)
    {
        UserSkills.AddRange(userSkills);
        return Task.CompletedTask;
    }

    public void Remove(UserSkill userSkill)
    {
        UserSkills.RemoveAll(us => us.UserId == userSkill.UserId && us.SkillId == userSkill.SkillId);
    }

    public void RemoveRange(IEnumerable<UserSkill> userSkills)
    {
        var keys = userSkills.Select(us => (us.UserId, us.SkillId)).ToHashSet();
        UserSkills.RemoveAll(us => keys.Contains((us.UserId, us.SkillId)));
    }
}

public class FakeProcessedEventRepository : IProcessedEventRepository
{
    public List<ProcessedEvent> Events { get; } = new();

    public Task<bool> HasBeenProcessedAsync(Guid eventId, CancellationToken ct = default)
    {
        return Task.FromResult(Events.Any(e => e.EventId == eventId));
    }

    public Task AddAsync(ProcessedEvent processedEvent, CancellationToken ct = default)
    {
        Events.Add(processedEvent);
        return Task.CompletedTask;
    }
}

public class FakeUserUnitOfWork : IUserUnitOfWork
{
    public int SaveChangesCount { get; private set; }
    public FakeTransaction? CurrentTransaction { get; private set; }
    public bool ShouldFailOnSave { get; set; }

    public Task<int> SaveChangesAsync(CancellationToken ct = default)
    {
        if (ShouldFailOnSave)
        {
            throw new InvalidOperationException("Simulated SQL SaveChanges failure.");
        }
        SaveChangesCount++;
        return Task.FromResult(1);
    }

    public Task<IDbContextTransaction> BeginTransactionAsync(CancellationToken ct = default)
    {
        CurrentTransaction = new FakeTransaction();
        return Task.FromResult<IDbContextTransaction>(CurrentTransaction);
    }

    public async Task ExecuteInTransactionAsync(Func<Task> action, CancellationToken ct = default)
    {
        CurrentTransaction = new FakeTransaction();
        try
        {
            await action();
            CurrentTransaction.Commit();
            SaveChangesCount++;
        }
        catch
        {
            CurrentTransaction.Rollback();
            throw;
        }
    }

    public async Task<TResult> ExecuteInTransactionAsync<TResult>(Func<Task<TResult>> action, CancellationToken ct = default)
    {
        CurrentTransaction = new FakeTransaction();
        try
        {
            var result = await action();
            CurrentTransaction.Commit();
            return result;
        }
        catch
        {
            CurrentTransaction.Rollback();
            throw;
        }
    }

    public class FakeTransaction : IDbContextTransaction
    {
        public Guid TransactionId { get; } = Guid.NewGuid();
        public bool IsCommitted { get; private set; }
        public bool IsRolledBack { get; private set; }

        public void Commit() => IsCommitted = true;
        public Task CommitAsync(CancellationToken cancellationToken = default)
        {
            IsCommitted = true;
            return Task.CompletedTask;
        }

        public void Rollback() => IsRolledBack = true;
        public Task RollbackAsync(CancellationToken cancellationToken = default)
        {
            IsRolledBack = true;
            return Task.CompletedTask;
        }

        public void Dispose() { }
        public ValueTask DisposeAsync() => ValueTask.CompletedTask;
    }
}
