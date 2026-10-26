using Exe.BuildingBlocks.Paging;
using Group.Repository.Entities;
using Group.Repository.Enums;

namespace Group.Repository.Interfaces;

/// <summary>
/// Truy vấn và thêm nhóm. Không tự SaveChanges: lớp Services gọi <see cref="IGroupUnitOfWork.SaveChangesAsync"/>
/// để mọi thay đổi của một thao tác (nhóm, thành viên, yêu cầu, lời mời) commit cùng lúc.
/// </summary>
public interface IGroupRepository
{
    /// <summary>
    /// Danh sách nhóm (kèm Members, Slots, không track).
    /// sortBy: name | memberCount | maxMembers | createdAt (mặc định).
    /// </summary>
    Task<PagedResult<GroupEntity>> GetPagedAsync(
        string? search,
        GroupStatus? status,
        string? domain,
        string? major,
        string? sortBy,
        bool descending,
        int page,
        int pageSize,
        CancellationToken ct = default);

    /// <summary>Nhóm kèm Members và Slots, được track để cập nhật.</summary>
    Task<GroupEntity?> GetByIdAsync(Guid id, CancellationToken ct = default);

    /// <summary>Nhóm đang hoạt động (chưa giải tán) mà người dùng là thành viên, kèm Members và Slots.</summary>
    Task<GroupEntity?> GetActiveGroupOfUserAsync(Guid userId, CancellationToken ct = default);

    /// <summary>BR-01: người dùng đã là thành viên của một nhóm chưa giải tán.</summary>
    Task<bool> IsUserInActiveGroupAsync(Guid userId, CancellationToken ct = default);

    /// <summary>Trong các <paramref name="userIds"/>, những người đã ở trong một nhóm chưa giải tán.</summary>
    Task<HashSet<Guid>> GetUsersInActiveGroupsAsync(IEnumerable<Guid> userIds, CancellationToken ct = default);

    /// <summary>BR-11: dự án đã có nhóm chưa giải tán.</summary>
    Task<bool> ExistsActiveForProjectAsync(Guid projectId, CancellationToken ct = default);

    /// <summary>Các nhóm Recruiting (kèm Slots, không track), dùng cho gợi ý nhóm.</summary>
    Task<IReadOnlyList<GroupEntity>> GetRecruitingAsync(int max, CancellationToken ct = default);

    void Add(GroupEntity group);

    /// <summary>
    /// Thêm vị trí tuyển vào nhóm đã tồn tại. Phải gọi qua DbSet: slot có sẵn Id (Guid.NewGuid) nên nếu chỉ thêm
    /// vào group.Slots, EF coi là bản ghi cũ và sinh UPDATE (0 dòng → lỗi concurrency) thay vì INSERT.
    /// </summary>
    void AddSlot(RecruitmentSlot slot);
}
