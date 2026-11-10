using Exe.BuildingBlocks.Web;
using Group.Repository.Entities;
using Group.Repository.Enums;
using Group.Services.Exceptions;

namespace Group.Services.Implementations;

/// <summary>Các kiểm tra business rule dùng chung giữa nhóm, yêu cầu và lời mời.</summary>
internal static class GroupGuards
{
    /// <summary>BR-05: chỉ trưởng nhóm.</summary>
    public static void EnsureLeader(this GroupEntity group, Guid userId, string action)
    {
        if (group.LeaderId != userId)
            throw new ForbiddenException($"Only the group leader can {action}.");
    }

    /// <summary>BR-25: Thành viên hoặc trưởng nhóm.</summary>
    public static void EnsureMemberOrLeader(this GroupEntity group, Guid userId, string action)
    {
        if (group.LeaderId == userId || group.Members.Any(m => m.UserId == userId))
            return;

        throw new ForbiddenException($"Only group members can {action}.");
    }

    public static void EnsureNotDisbanded(this GroupEntity group)
    {
        if (group.Status == GroupStatus.Disbanded)
            throw new BusinessRuleException(GroupErrorCodes.GroupDisbanded, "Group has been disbanded.");
    }

    /// <summary>BR-33: nhóm đã chốt sổ thì khóa cứng, Leader cũng không đổi được trạng thái hay thông tin nhóm.</summary>
    public static void EnsureNotLocked(this GroupEntity group)
    {
        if (group.Status == GroupStatus.Locked)
            throw new BusinessRuleException("ROOM_LOCKED", "Nhóm đã chốt sổ nên không thể thay đổi (BR-33).");
    }

    /// <summary>Nhóm phải đang tuyển: đã đủ người → GROUP_FULL, còn lại → GROUP_NOT_RECRUITING.</summary>
    public static void EnsureRecruiting(this GroupEntity group)
    {
        if (group.Status == GroupStatus.Recruiting && group.Members.Count < group.MaxMembers) return;

        if (group.Members.Count >= group.MaxMembers)
            throw new BusinessRuleException(GroupErrorCodes.GroupFull, "Group is full.");

        throw new BusinessRuleException(GroupErrorCodes.GroupNotRecruiting, $"Group is {group.Status} and not recruiting.");
    }
}
