using Exe.BuildingBlocks.Web;
using Group.Repository.Entities;
using Group.Repository.Enums;
using Group.Repository.Interfaces;
using Group.Services.Exceptions;

namespace Group.Services.Implementations;

/// <summary>
/// Thêm/bớt thành viên — dùng chung cho chấp nhận yêu cầu, chấp nhận lời mời, rời nhóm và xóa thành viên.
/// Chỉ thay đổi entity đang track; người gọi SaveChanges (qua <see cref="GroupUnitOfWorkExtensions"/>).
/// </summary>
public sealed class GroupMembershipManager(
    IGroupRepository groups,
    IJoinRequestRepository joinRequests,
    IInvitationRepository invitations)
{
    /// <summary>
    /// Thêm sinh viên vào nhóm, kiểm tra BR-01 và BR-06, rồi áp BR-07 và BR-08.
    /// Người gọi đổi yêu cầu/lời mời của chính nó sang Accepted TRƯỚC khi gọi, để không bị hủy theo BR-07.
    /// </summary>
    public async Task<GroupMember> AddMemberAsync(
        GroupEntity group, Guid userId, string fullName, string email, Guid? slotId, DateTime now, CancellationToken ct)
    {
        group.EnsureNotDisbanded();
        group.EnsureRecruiting(); // BR-06

        if (group.Members.Any(m => m.UserId == userId))
            throw new BusinessRuleException(GroupErrorCodes.AlreadyMember, "Student is already a member of this group.");

        if (await groups.IsUserInActiveGroupAsync(userId, ct)) // BR-01
            throw new BusinessRuleException(GroupErrorCodes.AlreadyInGroup, "Student is already in another group.");

        // Vị trí đã đủ người thì vẫn cho vào nhóm, chỉ không gắn với vị trí đó.
        var slot = slotId is null ? null : group.Slots.FirstOrDefault(s => s.Id == slotId && s.IsOpen);
        if (slot is not null) slot.Filled++;

        var member = new GroupMember
        {
            GroupId  = group.Id,
            UserId   = userId,
            Role     = MemberRole.Member,
            SlotId   = slot?.Id,
            FullName = fullName,
            Email    = email,
            JoinedAt = now
        };
        group.Members.Add(member);

        // Luôn sửa dòng Groups để SQL Server kiểm tra RowVersion: hai người cùng vào nhóm gần đầy
        // thì một bên nhận ConcurrencyConflictException, tải lại và kiểm tra lại BR-06.
        group.UpdatedAt = now;

        // BR-07: mọi yêu cầu và lời mời Pending khác của sinh viên bị hủy.
        foreach (var r in (await joinRequests.GetPendingByStudentAsync(userId, ct)).Where(r => r.Status == JoinRequestStatus.Pending))
        {
            r.Status = JoinRequestStatus.Cancelled;
            r.DecidedAt = now;
        }
        foreach (var i in (await invitations.GetPendingByStudentAsync(userId, ct)).Where(i => i.Status == InvitationStatus.Pending))
        {
            i.Status = InvitationStatus.Cancelled;
            i.RespondedAt = now;
        }

        // BR-08: đủ người thì nhóm thành Full và hủy yêu cầu/lời mời Pending của nhóm.
        if (group.Members.Count >= group.MaxMembers)
            await MarkFullAsync(group, now, ct);

        return member;
    }

    /// <summary>Xóa thành viên khỏi nhóm, trả lại chỗ của vị trí tuyển, Full → Recruiting.</summary>
    public void RemoveMember(GroupEntity group, GroupMember member, DateTime now)
    {
        group.Members.Remove(member);

        var slot = group.Slots.FirstOrDefault(s => s.Id == member.SlotId);
        if (slot is { Filled: > 0 }) slot.Filled--;

        if (group.Status == GroupStatus.Full) group.Status = GroupStatus.Recruiting;
        group.UpdatedAt = now;
    }

    /// <summary>BR-08: trạng thái Full và hủy mọi yêu cầu/lời mời Pending của nhóm.</summary>
    public async Task MarkFullAsync(GroupEntity group, DateTime now, CancellationToken ct)
    {
        group.Status = GroupStatus.Full;
        await CancelPendingOfGroupAsync(group.Id, now, ct);
    }

    /// <summary>
    /// Khi xóa một vị trí tuyển: yêu cầu Pending đang trỏ tới vị trí đó trở thành yêu cầu vào nhóm chung
    /// (SlotId = null), để không còn tham chiếu tới slot đã xóa (JoinRequest.SlotId không có khóa ngoại).
    /// </summary>
    public async Task DetachSlotFromPendingRequestsAsync(Guid groupId, Guid slotId, CancellationToken ct)
    {
        foreach (var r in (await joinRequests.GetPendingByGroupAsync(groupId, ct)).Where(r => r.SlotId == slotId))
            r.SlotId = null;
    }

    /// <summary>Hủy mọi yêu cầu và lời mời Pending của nhóm (khi đủ người hoặc giải tán).</summary>
    public async Task CancelPendingOfGroupAsync(Guid groupId, DateTime now, CancellationToken ct)
    {
        foreach (var r in (await joinRequests.GetPendingByGroupAsync(groupId, ct)).Where(r => r.Status == JoinRequestStatus.Pending))
        {
            r.Status = JoinRequestStatus.Cancelled;
            r.DecidedAt = now;
        }
        foreach (var i in (await invitations.GetPendingByGroupAsync(groupId, ct)).Where(i => i.Status == InvitationStatus.Pending))
        {
            i.Status = InvitationStatus.Cancelled;
            i.RespondedAt = now;
        }
    }
}

internal static class GroupUnitOfWorkExtensions
{
    /// <summary>
    /// Chạy lại toàn bộ thao tác (tải dữ liệu → kiểm tra rule → SaveChanges) khi Group.RowVersion hoặc Status của
    /// yêu cầu/lời mời bị đổi giữa chừng. Lần thử sau đọc dữ liệu mới nên BR-06 trả GROUP_FULL nếu nhóm vừa đủ người
    /// (CLAUDE.md mục 9), hoặc INVALID_STATUS / INVITATION_EXPIRED nếu yêu cầu/lời mời vừa bị xử lý.
    /// </summary>
    public static async Task<T> RetryOnConcurrencyAsync<T>(
        this IGroupUnitOfWork uow, Func<Task<T>> operation, int maxAttempts = 3)
    {
        for (var attempt = 1; ; attempt++)
        {
            try
            {
                return await operation();
            }
            catch (ConcurrencyConflictException) when (attempt < maxAttempts)
            {
                uow.ClearTracking();
            }
            catch (ConcurrencyConflictException)
            {
                throw ConcurrentUpdate();
            }
        }
    }

    /// <summary>SaveChanges; xung đột RowVersion → 409 CONCURRENT_UPDATE.</summary>
    public static async Task SaveOrConflictAsync(this IGroupUnitOfWork uow, CancellationToken ct)
    {
        try
        {
            await uow.SaveChangesAsync(ct);
        }
        catch (ConcurrencyConflictException)
        {
            throw ConcurrentUpdate();
        }
    }

    private static BusinessRuleException ConcurrentUpdate() =>
        new(GroupErrorCodes.ConcurrentUpdate, "The group was changed by another operation. Please reload and try again.");
}
