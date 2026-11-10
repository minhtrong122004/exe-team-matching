using Exe.BuildingBlocks.Web;
using Group.Repository.Entities;
using Group.Repository.Enums;
using Group.Repository.Interfaces;
using Group.Services.Exceptions;

namespace Group.Services.Implementations;

/// <summary>
/// Thêm/bớt thành viên — dùng chung cho vào thẳng, chấp nhận yêu cầu, rời nhóm và xóa thành viên.
/// Chỉ thay đổi entity đang track; người gọi SaveChanges (qua <see cref="GroupUnitOfWorkExtensions"/>).
/// </summary>
public sealed class GroupMembershipManager(
    IGroupRepository groups,
    IJoinRequestRepository joinRequests)
{
    /// <summary>
    /// Thêm sinh viên vào nhóm qua Accept, kiểm tra BR-21, rồi áp BR-26 và BR-28.
    /// Người gọi đổi yêu cầu của chính nó sang Accepted TRƯỚC khi gọi, để không bị hủy theo BR-26.
    /// </summary>
    public async Task<GroupMember> AddMemberAsync(
        GroupEntity group, Guid userId, string fullName, string email, Guid? slotId, DateTime now, CancellationToken ct)
    {
        group.EnsureNotDisbanded();
        group.EnsureRecruiting();

        if (group.Members.Any(m => m.UserId == userId))
            throw new BusinessRuleException(GroupErrorCodes.AlreadyMember, "Student is already a member of this group.");

        if (await groups.IsUserInActiveGroupAsync(userId, group.SpaceId, ct)) // BR-21
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
        // thì một bên nhận ConcurrencyConflictException, tải lại và kiểm tra lại sĩ số.
        group.UpdatedAt = now;

        await CancelOtherPendingOfStudentAsync(userId, group.SpaceId, now, ct);

        // BR-28: đủ người thì nhóm thành Closed và các đơn đang chờ vào nhóm thành Rejected.
        if (group.Members.Count >= group.MaxMembers)
        {
            group.Status = GroupStatus.Closed;
            await RejectPendingOfGroupAsync(group.Id, now, ct);
        }

        return member;
    }

    /// <summary>
    /// Vào thẳng phòng trống hoặc phòng dưới ngưỡng (BR-14, BR-15, BR-16).
    /// Người đầu tiên vào phòng làm Leader tạm thời (BR-15).
    /// Khi đạt ngưỡng GroupThreshold: phòng chuyển thành Group và khóa vào thẳng (BR-16).
    /// </summary>
    public async Task<GroupMember> AddDirectMemberAsync(
        GroupEntity group, Guid userId, string fullName, string email, int groupThreshold, DateTime now, CancellationToken ct)
    {
        group.EnsureNotDisbanded();

        if (group.Members.Any(m => m.UserId == userId))
            throw new BusinessRuleException(GroupErrorCodes.AlreadyMember, "Bạn đã là thành viên của phòng này rồi.");

        if (await groups.IsUserInActiveGroupAsync(userId, group.SpaceId, ct))
            throw new BusinessRuleException(GroupErrorCodes.AlreadyInGroup, "Bạn hiện đang ở một nhóm/phòng khác. Mỗi sinh viên chỉ ở 1 phòng trong 1 môn (BR-21).");

        if (group.Members.Count >= group.MaxMembers)
            throw new BusinessRuleException("GROUP_FULL", "Phòng đã đủ sĩ số tối đa.");

        if (group.Status != GroupStatus.Empty && group.Status != GroupStatus.Forming)
        {
            throw new BusinessRuleException("ROOM_REACHED_THRESHOLD",
                $"Phòng đã đạt ngưỡng {groupThreshold} thành viên và chuyển thành Group chính thức (BR-16). Vui lòng nộp đơn Apply để tham gia.");
        }

        var isFirst = group.Members.Count == 0 || group.Status == GroupStatus.Empty;
        var role = isFirst ? MemberRole.Leader : MemberRole.Member;
        if (isFirst)
        {
            group.LeaderId = userId;
        }

        var member = new GroupMember
        {
            GroupId = group.Id,
            UserId = userId,
            Role = role,
            SlotId = null,
            FullName = fullName,
            Email = email,
            JoinedAt = now
        };
        group.Members.Add(member);

        // BR-16: Đủ ngưỡng thì chuyển thành Group (Recruiting)
        if (group.Members.Count >= groupThreshold)
        {
            group.Status = GroupStatus.Recruiting;
        }
        else
        {
            group.Status = GroupStatus.Forming;
        }

        group.UpdatedAt = now;

        await CancelOtherPendingOfStudentAsync(userId, group.SpaceId, now, ct);

        return member;
    }

    /// <summary>
    /// Xóa thành viên khỏi nhóm:
    /// - Nếu Leader rời: Quyền Leader tự chuyển cho người vào sớm nhất tiếp theo (BR-20).
    /// - Nếu nhóm rớt dưới ngưỡng: Group quay lại thành Room (Forming), mở lại cho vào thẳng (BR-17).
    /// </summary>
    public void RemoveMember(GroupEntity group, GroupMember member, DateTime now, int groupThreshold = 3)
    {
        group.Members.Remove(member);

        var slot = group.Slots.FirstOrDefault(s => s.Id == member.SlotId);
        if (slot is { Filled: > 0 }) slot.Filled--;

        // BR-20: Leader rời Room thì quyền Leader tự chuyển cho người vào sớm nhất
        if (member.UserId == group.LeaderId)
        {
            var earliest = group.Members.OrderBy(m => m.JoinedAt).FirstOrDefault();
            if (earliest is not null)
            {
                earliest.Role = MemberRole.Leader;
                group.LeaderId = earliest.UserId;
            }
            else
            {
                group.LeaderId = null;
                group.Status = GroupStatus.Empty;
                group.IsClosedByLeader = false;
            }
        }

        // BR-17: Group có người rời và rớt dưới ngưỡng thì quay lại thành Room, mở lại cho vào thẳng
        if (group.Members.Count > 0)
        {
            if (group.Members.Count < groupThreshold)
            {
                group.Status = GroupStatus.Forming;
                group.IsClosedByLeader = false;
            }
            else if (group.Status == GroupStatus.Closed && !group.IsClosedByLeader)
            {
                group.Status = GroupStatus.Recruiting;
            }
        }
        else
        {
            group.Status = GroupStatus.Empty;
            group.IsClosedByLeader = false;
            group.LeaderId = null;
        }

        group.UpdatedAt = now;
    }

    /// <summary>BR-28: Nhóm đủ người hoặc Leader đóng tuyển thì mọi đơn đang chờ chuyển thành Reject.</summary>
    public async Task RejectPendingOfGroupAsync(Guid groupId, DateTime now, CancellationToken ct)
    {
        foreach (var r in (await joinRequests.GetPendingByGroupAsync(groupId, ct)).Where(r => r.Status == JoinRequestStatus.Pending))
        {
            r.Status = JoinRequestStatus.Rejected;
            r.DecidedAt = now;
        }
    }

    /// <summary>BR-26: sinh viên vào được một nhóm thì mọi đơn đang chờ khác của họ trong cùng môn thành Cancelled.</summary>
    private async Task CancelOtherPendingOfStudentAsync(Guid userId, Guid? spaceId, DateTime now, CancellationToken ct)
    {
        foreach (var r in (await joinRequests.GetPendingByStudentAsync(userId, spaceId, ct)).Where(r => r.Status == JoinRequestStatus.Pending))
        {
            r.Status = JoinRequestStatus.Cancelled;
            r.DecidedAt = now;
        }
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

}

internal static class GroupUnitOfWorkExtensions
{
    /// <summary>
    /// Chạy lại toàn bộ thao tác (tải dữ liệu → kiểm tra rule → SaveChanges) khi Group.RowVersion hoặc Status của
    /// yêu cầu bị đổi giữa chừng. Lần thử sau đọc dữ liệu mới nên trả GROUP_FULL nếu nhóm vừa đủ người,
    /// hoặc INVALID_STATUS nếu yêu cầu vừa bị xử lý.
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
