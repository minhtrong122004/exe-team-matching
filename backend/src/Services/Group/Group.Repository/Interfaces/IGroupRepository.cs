using Exe.BuildingBlocks.Paging;
using Group.Repository.Entities;
using Group.Repository.Enums;

namespace Group.Repository.Interfaces;

/// <summary>
/// Truy vấn và thêm nhóm. Không tự SaveChanges: lớp Services gọi <see cref="IGroupUnitOfWork.SaveChangesAsync"/>
/// để mọi thay đổi của một thao tác (nhóm, thành viên, yêu cầu) commit cùng lúc.
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

    /// <summary>
    /// Nhóm chưa giải tán mà người dùng là thành viên, kèm Members và Slots.
    /// Không truyền <paramref name="spaceId"/> thì lấy nhóm mới nhất của người đó ở mọi môn.
    /// </summary>
    Task<GroupEntity?> GetActiveGroupOfUserAsync(Guid userId, Guid? spaceId = null, CancellationToken ct = default);

    /// <summary>BR-21: người dùng đã là thành viên của một nhóm chưa giải tán trong cùng môn (Space).</summary>
    Task<bool> IsUserInActiveGroupAsync(Guid userId, Guid? spaceId, CancellationToken ct = default);

    /// <summary>Trong các <paramref name="userIds"/>, những người đã ở trong một nhóm chưa giải tán của cùng môn.</summary>
    Task<HashSet<Guid>> GetUsersInActiveGroupsAsync(IEnumerable<Guid> userIds, Guid? spaceId, CancellationToken ct = default);

    /// <summary>Các nhóm Recruiting (kèm Slots, không track), dùng cho gợi ý nhóm.</summary>
    Task<IReadOnlyList<GroupEntity>> GetRecruitingAsync(int max, CancellationToken ct = default);

    /// <summary>
    /// Thêm vị trí tuyển vào nhóm đã tồn tại. Phải gọi qua DbSet: slot có sẵn Id (Guid.NewGuid) nên nếu chỉ thêm
    /// vào group.Slots, EF coi là bản ghi cũ và sinh UPDATE (0 dòng → lỗi concurrency) thay vì INSERT.
    /// </summary>
    void AddSlot(RecruitmentSlot slot);

    /// <summary>Lấy cuộc bầu Leader đang Active của nhóm (kèm Votes).</summary>
    Task<LeaderElection?> GetActiveElectionAsync(Guid groupId, CancellationToken ct = default);

    /// <summary>Lấy chi tiết cuộc bầu Leader theo Id (kèm Votes và Group).</summary>
    Task<LeaderElection?> GetElectionByIdAsync(Guid electionId, CancellationToken ct = default);

    void AddElection(LeaderElection election);

    void AddElectionVote(ElectionVote vote);

    void AddMemberRemovalLog(MemberRemovalLog log);
}
