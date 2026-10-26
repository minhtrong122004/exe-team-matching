using Exe.BuildingBlocks.Paging;
using Group.Repository.Entities;
using Group.Repository.Enums;

namespace Group.Repository.Interfaces;

public interface IInvitationRepository
{
    /// <summary>Lời mời kèm Group (Members, Slots), được track để cập nhật.</summary>
    Task<Invitation?> GetByIdAsync(Guid id, CancellationToken ct = default);

    /// <summary>Lời mời của một sinh viên (kèm Group, không track), mới nhất trước.</summary>
    Task<PagedResult<Invitation>> GetPagedByStudentAsync(
        Guid studentId, InvitationStatus? status, int page, int pageSize, CancellationToken ct = default);

    Task<bool> HasPendingAsync(Guid studentId, Guid groupId, CancellationToken ct = default);

    /// <summary>Lời mời Pending của sinh viên (track), dùng cho BR-07.</summary>
    Task<List<Invitation>> GetPendingByStudentAsync(Guid studentId, CancellationToken ct = default);

    /// <summary>Lời mời Pending của nhóm (track), dùng cho BR-08 và khi giải tán nhóm.</summary>
    Task<List<Invitation>> GetPendingByGroupAsync(Guid groupId, CancellationToken ct = default);

    /// <summary>BR-10: chuyển mọi lời mời Pending đã quá hạn sang Expired (một câu UPDATE). Trả số dòng đổi.</summary>
    Task<int> ExpireOverdueAsync(DateTime now, CancellationToken ct = default);

    void Add(Invitation invitation);
}
