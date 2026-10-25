using Exe.BuildingBlocks.Paging;
using Report.Repository.Entities;
using Report.Repository.Enums;
using Report.Repository.Interfaces;

namespace Report.Services.Tests.TestDoubles;

public sealed class FakeStudentStatRepository : IStudentStatRepository
{
    public List<StudentStat> Items { get; } = [];

    public Task<StudentStat?> GetByUserIdAsync(Guid userId, CancellationToken ct = default) =>
        Task.FromResult(Items.FirstOrDefault(x => x.UserId == userId));

    public Task<IReadOnlyList<StudentStat>> GetAllAsync(CancellationToken ct = default) =>
        Task.FromResult<IReadOnlyList<StudentStat>>(Items.OrderBy(x => x.FullName).ToList());

    public Task<PagedResult<StudentStat>> GetWithoutGroupPagedAsync(
        string? major,
        int page,
        int pageSize,
        CancellationToken ct = default)
    {
        var query = Items.Where(x => !x.HasGroup);
        if (!string.IsNullOrWhiteSpace(major))
        {
            var m = major.Trim();
            if (string.Equals(m, "Unassigned", StringComparison.OrdinalIgnoreCase))
            {
                query = query.Where(x => string.IsNullOrWhiteSpace(x.Major));
            }
            else
            {
                query = query.Where(x => string.Equals(x.Major, m, StringComparison.OrdinalIgnoreCase));
            }
        }

        var ordered = query.OrderBy(x => x.FullName).ToList();
        var paged = ordered.Skip((page - 1) * pageSize).Take(pageSize).ToList();
        return Task.FromResult(new PagedResult<StudentStat>(paged, page, pageSize, ordered.Count));
    }

    public Task AddAsync(StudentStat stat, CancellationToken ct = default)
    {
        Items.Add(stat);
        return Task.CompletedTask;
    }

    public void Update(StudentStat stat)
    {
    }
}

public sealed class FakeGroupStatRepository : IGroupStatRepository
{
    public List<GroupStat> Items { get; } = [];

    public Task<GroupStat?> GetByGroupIdAsync(Guid groupId, CancellationToken ct = default) =>
        Task.FromResult(Items.FirstOrDefault(x => x.GroupId == groupId));

    public Task<IReadOnlyList<GroupStat>> GetAllAsync(CancellationToken ct = default) =>
        Task.FromResult<IReadOnlyList<GroupStat>>(Items.OrderBy(x => x.Name).ToList());

    public Task<PagedResult<GroupStat>> GetPagedAsync(
        GroupStatStatus? status,
        int page,
        int pageSize,
        CancellationToken ct = default)
    {
        var query = Items.AsEnumerable();
        if (status.HasValue)
        {
            query = query.Where(x => x.Status == status.Value);
        }

        var ordered = query.OrderByDescending(x => x.UpdatedAt).ToList();
        var paged = ordered.Skip((page - 1) * pageSize).Take(pageSize).ToList();
        return Task.FromResult(new PagedResult<GroupStat>(paged, page, pageSize, ordered.Count));
    }

    public Task AddAsync(GroupStat stat, CancellationToken ct = default)
    {
        Items.Add(stat);
        return Task.CompletedTask;
    }

    public void Update(GroupStat stat)
    {
    }
}

public sealed class FakeReportSnapshotRepository : IReportSnapshotRepository
{
    public List<ReportSnapshot> Items { get; } = [];

    public Task<PagedResult<ReportSnapshot>> GetPagedAsync(
        DateTime? from,
        DateTime? to,
        int page,
        int pageSize,
        CancellationToken ct = default)
    {
        var query = Items.AsEnumerable();
        if (from.HasValue)
        {
            query = query.Where(x => x.GeneratedAt >= from.Value);
        }

        if (to.HasValue)
        {
            query = query.Where(x => x.GeneratedAt <= to.Value);
        }

        var ordered = query.OrderByDescending(x => x.GeneratedAt).ToList();
        var paged = ordered.Skip((page - 1) * pageSize).Take(pageSize).ToList();
        return Task.FromResult(new PagedResult<ReportSnapshot>(paged, page, pageSize, ordered.Count));
    }

    public Task<ReportSnapshot?> GetByIdAsync(Guid id, CancellationToken ct = default) =>
        Task.FromResult(Items.FirstOrDefault(x => x.Id == id));

    public Task AddAsync(ReportSnapshot snapshot, CancellationToken ct = default)
    {
        Items.Add(snapshot);
        return Task.CompletedTask;
    }
}

public sealed class FakeProcessedEventRepository : IProcessedEventRepository
{
    public HashSet<Guid> ProcessedIds { get; } = [];

    public Task<bool> ExistsAsync(Guid eventId, CancellationToken ct = default) =>
        Task.FromResult(ProcessedIds.Contains(eventId));

    public Task AddAsync(ProcessedEvent processedEvent, CancellationToken ct = default)
    {
        ProcessedIds.Add(processedEvent.EventId);
        return Task.CompletedTask;
    }
}

public sealed class FakeReportUnitOfWork : IReportUnitOfWork
{
    public int SaveChangesCount { get; private set; }

    public Task<int> SaveChangesAsync(CancellationToken ct = default)
    {
        SaveChangesCount++;
        return Task.FromResult(1);
    }
}
