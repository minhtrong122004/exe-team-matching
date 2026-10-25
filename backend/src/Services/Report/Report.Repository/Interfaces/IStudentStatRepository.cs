using Exe.BuildingBlocks.Paging;
using Report.Repository.Entities;

namespace Report.Repository.Interfaces;

public interface IStudentStatRepository
{
    Task<StudentStat?> GetByUserIdAsync(Guid userId, CancellationToken ct = default);
    Task<IReadOnlyList<StudentStat>> GetAllAsync(CancellationToken ct = default);
    Task<PagedResult<StudentStat>> GetWithoutGroupPagedAsync(string? major, int page, int pageSize, CancellationToken ct = default);
    Task AddAsync(StudentStat stat, CancellationToken ct = default);
    void Update(StudentStat stat);
}
