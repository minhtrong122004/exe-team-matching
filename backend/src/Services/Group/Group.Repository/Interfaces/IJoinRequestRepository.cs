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

    Task<int> CountPendingByStudentAsync(Guid studentId, CancellationToken ct = default);

    Task<bool> HasPendingAsync(Guid studentId, Guid groupId, CancellationToken ct = default);

    /// <summary>Yêu cầu Pending của sinh viên (track), dùng cho BR-07.</summary>
    Task<List<JoinRequest>> GetPendingByStudentAsync(Guid studentId, CancellationToken ct = default);

    /// <summary>Yêu cầu Pending tới nhóm (track), dùng cho BR-08 và khi giải tán nhóm.</summary>
    Task<List<JoinRequest>> GetPendingByGroupAsync(Guid groupId, CancellationToken ct = default);

    void Add(JoinRequest request);
}
