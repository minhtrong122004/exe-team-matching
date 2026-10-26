using Exe.BuildingBlocks.Paging;
using Exe.BuildingBlocks.Web;
using Exe.Contracts.Events;
using FluentValidation;
using Group.Repository.Entities;
using Group.Repository.Enums;
using Group.Repository.Interfaces;
using Group.Services.Clients;
using Group.Services.DTOs;
using Group.Services.Exceptions;
using Group.Services.Interfaces;

namespace Group.Services.Implementations;

public class GroupService(
    IGroupRepository groups,
    IGroupUnitOfWork uow,
    GroupMembershipManager membership,
    IProjectClient projectClient,
    ICurrentUser currentUser,
    GroupEventPublisher events,
    IValidator<CreateGroupRequest> createValidator,
    IValidator<UpdateGroupRequest> updateValidator,
    IValidator<SlotRequest> slotValidator,
    IValidator<TransferLeaderRequest> transferValidator) : IGroupService
{
    // ─────────────────────────────────────────────────────────────────────────
    // Query
    // ─────────────────────────────────────────────────────────────────────────

    public async Task<PagedResult<GroupSummaryResponse>> GetGroupsAsync(GroupQuery query, CancellationToken ct = default)
    {
        var page = await groups.GetPagedAsync(
            search:     query.Search,
            status:     query.Status,
            domain:     query.Domain,
            major:      query.Major,
            sortBy:     query.SortBy,
            descending: query.IsDescending,
            page:       query.NormalizedPage,
            pageSize:   query.NormalizedPageSize,
            ct:         ct);

        return page.Map(g => g.ToSummary());
    }

    public async Task<GroupDetailResponse> GetGroupAsync(Guid id, CancellationToken ct = default) =>
        (await LoadAsync(id, ct)).ToDetail();

    public async Task<GroupDetailResponse?> GetMyGroupAsync(CancellationToken ct = default) =>
        (await groups.GetActiveGroupOfUserAsync(currentUser.UserId, ct))?.ToDetail();

    // ─────────────────────────────────────────────────────────────────────────
    // Nhóm
    // ─────────────────────────────────────────────────────────────────────────

    public async Task<GroupDetailResponse> CreateGroupAsync(CreateGroupRequest request, CancellationToken ct = default)
    {
        await createValidator.ValidateAndThrowAsync(request, ct);
        var userId = currentUser.UserId;

        // BR-01
        if (await groups.IsUserInActiveGroupAsync(userId, ct))
            throw new BusinessRuleException(GroupErrorCodes.AlreadyInGroup, "You are already in a group.");

        // BR-11: dự án tồn tại, người tạo là chủ dự án, dự án chưa có nhóm.
        var project = await projectClient.GetProjectAsync(request.ProjectId, ct)
            ?? throw new NotFoundException("Project", request.ProjectId);
        if (project.OwnerId != userId)
            throw new ForbiddenException("Only the project owner can create a group for this project.");
        if (await groups.ExistsActiveForProjectAsync(project.Id, ct))
            throw new BusinessRuleException(GroupErrorCodes.ProjectAlreadyHasGroup, "This project already has a group.");

        var now = DateTime.UtcNow;
        var group = new GroupEntity
        {
            Id            = Guid.NewGuid(),
            Name          = request.Name.Trim(),
            Description   = request.Description?.Trim(),
            LeaderId      = userId,
            ProjectId     = project.Id,
            ProjectDomain = project.Domain,
            MaxMembers    = request.MaxMembers,
            Status        = GroupStatus.Recruiting,
            CreatedAt     = now,
            UpdatedAt     = now
        };
        group.Members.Add(new GroupMember
        {
            GroupId  = group.Id,
            UserId   = userId,
            Role     = MemberRole.Leader,
            FullName = currentUser.FullName ?? string.Empty,
            Email    = currentUser.Email ?? string.Empty,
            JoinedAt = now
        });
        foreach (var slotRequest in request.Slots ?? [])
        {
            var slot = new RecruitmentSlot { Id = Guid.NewGuid(), GroupId = group.Id };
            slot.Apply(slotRequest);
            group.Slots.Add(slot);
        }

        groups.Add(group);
        try
        {
            await uow.SaveChangesAsync(ct);
        }
        catch (UniqueConstraintViolationException ex) when (ex.IndexName == GroupIndexes.ProjectId)
        {
            // Hai request cùng qua bước kiểm tra ở trên; unique index chặn request thứ hai (BR-11).
            throw new BusinessRuleException(GroupErrorCodes.ProjectAlreadyHasGroup, "This project already has a group.");
        }

        await events.PublishAsync(new GroupCreated(group.Id, group.Name, group.LeaderId, group.MaxMembers), ct);
        // Trưởng nhóm cũng là một thành viên: User đặt InTeam, Report tính sinh viên đã có nhóm.
        await events.PublishAsync(new MemberJoined(
            group.Id, group.Name, userId, currentUser.Email ?? string.Empty, currentUser.FullName ?? string.Empty,
            group.Members.Count, group.MaxMembers), ct);

        return group.ToDetail();
    }

    public async Task<GroupDetailResponse> UpdateGroupAsync(Guid id, UpdateGroupRequest request, CancellationToken ct = default)
    {
        await updateValidator.ValidateAndThrowAsync(request, ct);

        var group = await LoadAsync(id, ct);
        group.EnsureLeader(currentUser.UserId, "update the group");
        group.EnsureNotDisbanded();

        if (request.MaxMembers < group.Members.Count)
            throw new BusinessRuleException(GroupErrorCodes.MaxMembersBelowMemberCount,
                $"Group already has {group.Members.Count} members.");
        EnsureSlotCapacity(group, request.MaxMembers);

        var now = DateTime.UtcNow;
        group.Name        = request.Name.Trim();
        group.Description = request.Description?.Trim();
        group.MaxMembers  = request.MaxMembers;
        group.UpdatedAt   = now;

        // Đổi MaxMembers có thể làm nhóm đủ hoặc hết đủ người.
        if (group.Members.Count >= group.MaxMembers && group.Status == GroupStatus.Recruiting)
            await membership.MarkFullAsync(group, now, ct);
        else if (group.Members.Count < group.MaxMembers && group.Status == GroupStatus.Full)
            group.Status = GroupStatus.Recruiting;

        await uow.SaveOrConflictAsync(ct);
        return group.ToDetail();
    }

    public async Task DisbandGroupAsync(Guid id, CancellationToken ct = default)
    {
        var group = await LoadAsync(id, ct);
        group.EnsureLeader(currentUser.UserId, "disband the group");
        group.EnsureNotDisbanded();

        var now = DateTime.UtcNow;
        group.Status = GroupStatus.Disbanded;
        group.UpdatedAt = now;
        await membership.CancelPendingOfGroupAsync(group.Id, now, ct);
        await uow.SaveOrConflictAsync(ct);

        // Giữ bản ghi thành viên làm lịch sử; BR-01 chỉ tính nhóm chưa giải tán.
        foreach (var member in group.Members)
            await events.PublishAsync(new MemberLeft(group.Id, group.Name, member.UserId, 0), ct);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Vị trí tuyển
    // ─────────────────────────────────────────────────────────────────────────

    public async Task<SlotResponse> AddSlotAsync(Guid groupId, SlotRequest request, CancellationToken ct = default)
    {
        await slotValidator.ValidateAndThrowAsync(request, ct);

        var group = await LoadForLeaderAsync(groupId, "manage recruitment slots", ct);
        var slot = new RecruitmentSlot { Id = Guid.NewGuid(), GroupId = group.Id };
        slot.Apply(request);
        groups.AddSlot(slot); // EF tự gắn slot vào group.Slots (navigation fix-up)
        EnsureSlotCapacity(group, group.MaxMembers);
        group.UpdatedAt = DateTime.UtcNow;

        await uow.SaveOrConflictAsync(ct);
        return slot.ToResponse();
    }

    public async Task<SlotResponse> UpdateSlotAsync(Guid groupId, Guid slotId, SlotRequest request, CancellationToken ct = default)
    {
        await slotValidator.ValidateAndThrowAsync(request, ct);

        var group = await LoadForLeaderAsync(groupId, "manage recruitment slots", ct);
        var slot = FindSlot(group, slotId);
        if (request.Quantity < slot.Filled)
            throw new BusinessRuleException(GroupErrorCodes.SlotHasMembers,
                $"Slot already has {slot.Filled} members; quantity cannot be lower.");

        slot.Apply(request);
        EnsureSlotCapacity(group, group.MaxMembers);
        group.UpdatedAt = DateTime.UtcNow;

        await uow.SaveOrConflictAsync(ct);
        return slot.ToResponse();
    }

    public async Task DeleteSlotAsync(Guid groupId, Guid slotId, CancellationToken ct = default)
    {
        var group = await LoadForLeaderAsync(groupId, "manage recruitment slots", ct);
        var slot = FindSlot(group, slotId);
        if (slot.Filled > 0)
            throw new BusinessRuleException(GroupErrorCodes.SlotHasMembers, "Cannot delete a slot that already has members.");

        group.Slots.Remove(slot);
        await membership.DetachSlotFromPendingRequestsAsync(group.Id, slot.Id, ct);
        group.UpdatedAt = DateTime.UtcNow;
        await uow.SaveOrConflictAsync(ct);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Thành viên
    // ─────────────────────────────────────────────────────────────────────────

    public async Task RemoveMemberAsync(Guid groupId, Guid userId, CancellationToken ct = default)
    {
        var group = await LoadForLeaderAsync(groupId, "remove members", ct);
        if (userId == group.LeaderId)
            throw new BusinessRuleException(GroupErrorCodes.LeaderCannotLeave,
                "The leader cannot be removed. Transfer leadership or disband the group.");

        var member = FindMember(group, userId);
        await RemoveAndPublishAsync(group, member, ct);
    }

    public async Task LeaveGroupAsync(Guid groupId, CancellationToken ct = default)
    {
        var group = await LoadAsync(groupId, ct);
        group.EnsureNotDisbanded();

        var userId = currentUser.UserId;
        var member = group.Members.FirstOrDefault(m => m.UserId == userId)
            ?? throw new BusinessRuleException(GroupErrorCodes.NotGroupMember, "You are not a member of this group.");

        // BR-09
        if (userId == group.LeaderId)
            throw new BusinessRuleException(GroupErrorCodes.LeaderCannotLeave,
                "The leader cannot leave. Transfer leadership or disband the group.");

        await RemoveAndPublishAsync(group, member, ct);
    }

    public async Task<GroupDetailResponse> TransferLeaderAsync(Guid groupId, TransferLeaderRequest request, CancellationToken ct = default)
    {
        await transferValidator.ValidateAndThrowAsync(request, ct);

        var group = await LoadForLeaderAsync(groupId, "transfer leadership", ct);
        var newLeader = FindMember(group, request.NewLeaderId);
        if (newLeader.UserId == group.LeaderId) return group.ToDetail();

        var oldLeader = group.Leader();
        if (oldLeader is not null) oldLeader.Role = MemberRole.Member;
        newLeader.Role = MemberRole.Leader;
        group.LeaderId = newLeader.UserId;
        group.UpdatedAt = DateTime.UtcNow;

        await uow.SaveOrConflictAsync(ct);
        return group.ToDetail();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────────

    private async Task<GroupEntity> LoadAsync(Guid id, CancellationToken ct) =>
        await groups.GetByIdAsync(id, ct) ?? throw new NotFoundException("Group", id);

    private async Task<GroupEntity> LoadForLeaderAsync(Guid id, string action, CancellationToken ct)
    {
        var group = await LoadAsync(id, ct);
        group.EnsureLeader(currentUser.UserId, action);
        group.EnsureNotDisbanded();
        return group;
    }

    private static RecruitmentSlot FindSlot(GroupEntity group, Guid slotId) =>
        group.Slots.FirstOrDefault(s => s.Id == slotId) ?? throw new NotFoundException("Slot", slotId);

    /// <summary>
    /// Trưởng nhóm chiếm 1 chỗ, nên tổng vị trí tuyển không vượt quá MaxMembers - 1
    /// (cùng quy tắc với CreateGroupRequestValidator, kiểm tra lại khi thêm/sửa slot hoặc đổi MaxMembers).
    /// </summary>
    private static void EnsureSlotCapacity(GroupEntity group, int maxMembers)
    {
        var total = group.Slots.Sum(s => s.Quantity);
        if (total > maxMembers - 1)
            throw new BusinessRuleException(GroupErrorCodes.SlotQuantityExceeded,
                $"Total slot quantity ({total}) must not exceed maxMembers - 1 ({maxMembers - 1}).");
    }

    private static GroupMember FindMember(GroupEntity group, Guid userId) =>
        group.Members.FirstOrDefault(m => m.UserId == userId)
        ?? throw new BusinessRuleException(GroupErrorCodes.NotGroupMember, $"User '{userId}' is not a member of this group.");

    private async Task RemoveAndPublishAsync(GroupEntity group, GroupMember member, CancellationToken ct)
    {
        membership.RemoveMember(group, member, DateTime.UtcNow);
        await uow.SaveOrConflictAsync(ct);
        await events.PublishAsync(new MemberLeft(group.Id, group.Name, member.UserId, group.Members.Count), ct);
    }
}
