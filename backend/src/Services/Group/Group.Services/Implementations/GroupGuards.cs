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

    public static void EnsureNotDisbanded(this GroupEntity group)
    {
        if (group.Status == GroupStatus.Disbanded)
            throw new BusinessRuleException(GroupErrorCodes.GroupDisbanded, "Group has been disbanded.");
    }

    /// <summary>Nhóm phải đang tuyển: Full → GROUP_FULL (BR-06), Locked/Disbanded → GROUP_NOT_RECRUITING.</summary>
    public static void EnsureRecruiting(this GroupEntity group)
    {
        if (group.Status == GroupStatus.Recruiting && group.Members.Count < group.MaxMembers) return;

        if (group.Status is GroupStatus.Recruiting or GroupStatus.Full)
            throw new BusinessRuleException(GroupErrorCodes.GroupFull, "Group is full.");

        throw new BusinessRuleException(GroupErrorCodes.GroupNotRecruiting, $"Group is {group.Status} and not recruiting.");
    }
}
