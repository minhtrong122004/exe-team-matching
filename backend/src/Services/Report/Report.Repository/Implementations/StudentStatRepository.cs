using Exe.BuildingBlocks.Paging;
using Exe.BuildingBlocks.Persistence;
using Microsoft.EntityFrameworkCore;
using Report.Repository.Data;
using Report.Repository.Entities;
using Report.Repository.Interfaces;

namespace Report.Repository.Implementations;

public class StudentStatRepository : IStudentStatRepository
{
    private readonly ReportDbContext _db;

    public StudentStatRepository(ReportDbContext db)
    {
        _db = db;
    }

    public Task<StudentStat?> GetByUserIdAsync(Guid userId, CancellationToken ct = default) =>
        _db.StudentStats.FirstOrDefaultAsync(x => x.UserId == userId, ct);

    public async Task<IReadOnlyList<StudentStat>> GetAllAsync(CancellationToken ct = default) =>
        await _db.StudentStats.AsNoTracking().OrderBy(x => x.FullName).ToListAsync(ct);

    public Task<PagedResult<StudentStat>> GetWithoutGroupPagedAsync(
        string? major,
        int page,
        int pageSize,
        CancellationToken ct = default)
    {
        var query = _db.StudentStats.AsNoTracking().Where(x => !x.HasGroup);

        if (!string.IsNullOrWhiteSpace(major))
        {
            var normalizedMajor = major.Trim();
            if (string.Equals(normalizedMajor, "Unassigned", StringComparison.OrdinalIgnoreCase))
            {
                query = query.Where(x => x.Major == null || x.Major == "");
            }
            else
            {
                query = query.Where(x => x.Major != null && x.Major == normalizedMajor);
            }
        }

        return query
            .OrderBy(x => x.FullName)
            .ToPagedResultAsync(page, pageSize, ct);
    }

    public async Task AddAsync(StudentStat stat, CancellationToken ct = default) =>
        await _db.StudentStats.AddAsync(stat, ct);

    public void Update(StudentStat stat) =>
        _db.StudentStats.Update(stat);
}
