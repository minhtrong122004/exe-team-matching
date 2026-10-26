using Exe.BuildingBlocks.Paging;
using Report.Repository.Entities;
using Report.Repository.Enums;

namespace Report.Repository.Interfaces;

public interface IGroupStatRepository
{
    Task<GroupStat?> GetByGroupIdAsync(Guid groupId, CancellationToken ct = default);
    Task<IReadOnlyList<GroupStat>> GetAllAsync(CancellationToken ct = default);
    Task<PagedResult<GroupStat>> GetPagedAsync(GroupStatStatus? status, int page, int pageSize, CancellationToken ct = default);
    Task AddAsync(GroupStat stat, CancellationToken ct = default);
    void Update(GroupStat stat);
}
