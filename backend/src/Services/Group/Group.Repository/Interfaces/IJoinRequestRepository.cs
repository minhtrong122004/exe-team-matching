using Exe.BuildingBlocks.Paging;
using Group.Repository.Entities;
using Group.Repository.Enums;

namespace Group.Repository.Interfaces;

public interface IJoinRequestRepository
{
    /// <summary>Yêu cầu kèm Group (Members, Slots), được track để cập nhật.</summary>
    Task<JoinRequest?> GetByIdAsync(Guid id, CancellationToken ct = default);

    /// <summary>Yêu cầu gửi tới một nhóm (kèm Group, không track), mới nhất trước.</summary>
    Task<PagedResult<JoinRequest>> GetPagedByGroupAsync(
        Guid groupId, JoinRequestStatus? status, int page, int pageSize, CancellationToken ct = default);

    /// <summary>Yêu cầu của một sinh viên (kèm Group, không track), mới nhất trước.</summary>
    Task<PagedResult<JoinRequest>> GetPagedByStudentAsync(
        Guid studentId, JoinRequestStatus? status, int page, int pageSize, CancellationToken ct = default);

    /// <summary>BR-22: số đơn đang chờ của sinh viên trong một môn (Space).</summary>
    Task<int> CountPendingByStudentAsync(Guid studentId, Guid? spaceId, CancellationToken ct = default);

    Task<bool> HasPendingAsync(Guid studentId, Guid groupId, CancellationToken ct = default);

    /// <summary>BR-26: yêu cầu Pending của sinh viên trong cùng môn (track).</summary>
    Task<List<JoinRequest>> GetPendingByStudentAsync(Guid studentId, Guid? spaceId, CancellationToken ct = default);

    /// <summary>Yêu cầu Pending tới nhóm (track), dùng cho BR-28.</summary>
    Task<List<JoinRequest>> GetPendingByGroupAsync(Guid groupId, CancellationToken ct = default);

    void Add(JoinRequest request);

    Task<ApplicationVote?> GetVoteAsync(Guid joinRequestId, Guid voterId, CancellationToken ct = default);

    void AddVote(ApplicationVote vote);
}
