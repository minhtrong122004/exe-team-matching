using Exe.BuildingBlocks.Auth;
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
using ICurrentUser = Exe.BuildingBlocks.Web.ICurrentUser;

namespace Group.Services.Implementations;

public class GroupService(
    IGroupRepository groups,
    IGroupUnitOfWork uow,
    GroupMembershipManager membership,
    IUserClient userClient,
    ICourseSpaceRepository spaceRepo,
    ICurrentUser currentUser,
    GroupEventPublisher events,
    IValidator<UpdateGroupRequest> updateValidator,
    IValidator<SlotRequest> slotValidator,
    IValidator<TransferLeaderRequest> transferValidator,
    IValidator<RemoveMemberRequest> removeValidator) : IGroupService
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

    public async Task<GroupDetailResponse> GetGroupAsync(Guid id, CancellationToken ct = default)
    {
        var group = await LoadAsync(id, ct);

        // BR-13: nhóm đã đủ hoặc đã đóng thì ẩn thông tin thành viên với sinh viên ngoài nhóm.
        var hideMembers = group.Status is GroupStatus.Closed or GroupStatus.Locked
                          && currentUser.IsInRole(Roles.Student)
                          && group.Members.All(m => m.UserId != currentUser.UserId);

        return group.ToDetail(hideMembers);
    }

    public async Task<GroupDetailResponse?> GetMyGroupAsync(Guid? spaceId = null, CancellationToken ct = default) =>
        (await groups.GetActiveGroupOfUserAsync(currentUser.UserId, spaceId, ct))?.ToDetail();

    // ─────────────────────────────────────────────────────────────────────────
    // Nhóm
    // ─────────────────────────────────────────────────────────────────────────

    public async Task<GroupDetailResponse> UpdateGroupAsync(Guid id, UpdateGroupRequest request, CancellationToken ct = default)
    {
        await updateValidator.ValidateAndThrowAsync(request, ct);

        var group = await LoadAsync(id, ct);
        group.EnsureLeader(currentUser.UserId, "update the group");
        group.EnsureNotDisbanded();
        group.EnsureNotLocked();

        group.Name        = request.Name.Trim();
        group.Description = request.Description?.Trim();
        group.UpdatedAt   = DateTime.UtcNow;

        await uow.SaveOrConflictAsync(ct);
        return group.ToDetail();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Vị trí tuyển
    // ─────────────────────────────────────────────────────────────────────────

    public async Task<SlotResponse> AddSlotAsync(Guid groupId, SlotRequest request, CancellationToken ct = default)
    {
        await slotValidator.ValidateAndThrowAsync(request, ct);

        var group = await LoadForLeaderAsync(groupId, "manage recruitment slots", ct);
        group.EnsureNotLocked();
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
        group.EnsureNotLocked();
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
        group.EnsureNotLocked();
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

    public Task RemoveMemberAsync(Guid groupId, Guid userId, CancellationToken ct = default) =>
        RemoveMemberAsync(groupId, userId, new RemoveMemberRequest("Trưởng nhóm mời ra khỏi nhóm", "Khác"), ct);

    public async Task RemoveMemberAsync(Guid groupId, Guid userId, RemoveMemberRequest request, CancellationToken ct = default)
    {
        await removeValidator.ValidateAndThrowAsync(request, ct);

        var group = await LoadForLeaderAsync(groupId, "remove members", ct);
        group.EnsureNotLocked();

        if (userId == group.LeaderId)
            throw new BusinessRuleException(GroupErrorCodes.LeaderCannotLeave,
                "The leader cannot be removed. Transfer leadership or disband the group.");

        var member = FindMember(group, userId);

        var leaderMember = group.Members.FirstOrDefault(m => m.UserId == group.LeaderId);
        var leaderName = leaderMember?.FullName ?? currentUser.FullName ?? "Trưởng nhóm";

        // Ghi Audit Log vào ExeGroupDb (Phương án 3, BR-05)
        var category = string.IsNullOrWhiteSpace(request.Category) ? "Khác" : request.Category.Trim();
        var reason = request.Reason.Trim();
        var removalLog = new MemberRemovalLog
        {
            Id = Guid.NewGuid(),
            GroupId = group.Id,
            RemovedUserId = member.UserId,
            RemovedUserName = member.FullName,
            RemovedUserEmail = member.Email,
            LeaderId = currentUser.UserId,
            LeaderName = leaderName,
            Category = category,
            Reason = reason,
            RemovedAt = DateTime.UtcNow
        };
        groups.AddMemberRemovalLog(removalLog);

        // Xóa thành viên và cập nhật trạng thái phòng (BR-17)
        var threshold = (group.MaxMembers / 2) + 1;
        if (group.SpaceId.HasValue)
        {
            var space = await spaceRepo.GetByIdAsync(group.SpaceId.Value, ct);
            if (space != null) threshold = space.GroupThreshold;
        }

        membership.RemoveMember(group, member, DateTime.UtcNow, threshold);
        await FailElectionOfRemovedCandidateAsync(group.Id, member.UserId, ct);
        await uow.SaveOrConflictAsync(ct);

        // Phát MemberLeft (cho User Service chuyển trạng thái LookingForTeam và Report Service cập nhật thống kê)
        await events.PublishAsync(new MemberLeft(group.Id, group.Name, member.UserId, group.Members.Count), ct);

        // Phát MemberRemoved (cho Notification Service gửi email + in-app notification)
        await events.PublishAsync(new MemberRemoved(
            group.Id,
            group.Name,
            member.UserId,
            member.Email,
            member.FullName,
            currentUser.UserId,
            leaderName,
            reason,
            category,
            group.Members.Count,
            DateTime.UtcNow), ct);
    }

    public async Task LeaveGroupAsync(Guid groupId, CancellationToken ct = default)
    {
        var group = await LoadAsync(groupId, ct);
        group.EnsureNotDisbanded();
        group.EnsureNotLocked();

        var userId = currentUser.UserId;
        var member = group.Members.FirstOrDefault(m => m.UserId == userId)
            ?? throw new BusinessRuleException(GroupErrorCodes.NotGroupMember, "Bạn không phải là thành viên của nhóm này.");

        // Theo BR-20: Leader rời Room thì quyền Leader tự chuyển cho người vào sớm nhất; người cuối cùng rời thì Room trở về trống.
        await RemoveAndPublishAsync(group, member, ct);
    }

    public async Task<DirectJoinRoomResponse> DirectJoinRoomAsync(Guid roomId, CancellationToken ct = default)
    {
        var group = await LoadAsync(roomId, ct);
        group.EnsureNotDisbanded();

        if (group.Status == GroupStatus.Locked)
        {
            throw new BusinessRuleException("ROOM_LOCKED", "Phòng này đã bị khóa sau khi chốt sổ (BR-33).");
        }

        var userId = currentUser.UserId;

        // BR-07: Bắt buộc hoàn tất hồ sơ 5 kỹ năng và cam kết trách nhiệm trước khi vào Room hoặc Apply
        var profile = await userClient.GetProfileAsync(userId, ct);
        if (profile == null || !profile.IsProfileCompleted)
        {
            throw new BusinessRuleException("PROFILE_INCOMPLETE",
                "Bạn bắt buộc phải hoàn tất khai báo 5 kỹ năng cốt lõi và xác nhận cam kết trách nhiệm tại trang Hồ sơ cá nhân trước khi tham gia Room (BR-07).");
        }

        // Kiểm tra sinh viên trong Space (BR-01)
        int threshold = (group.MaxMembers / 2) + 1;
        if (group.SpaceId.HasValue)
        {
            var space = await spaceRepo.GetByIdAsync(group.SpaceId.Value, ct);
            if (space != null)
            {
                if (space.Status != CourseSpaceStatus.Open)
                {
                    throw new BusinessRuleException("REGISTRATION_CLOSED",
                        "Không gian học phần đã đóng cổng đăng ký tự do (BR-30) hoặc đã chốt sổ. Sinh viên không thể tự do chọn phòng vào lúc này.");
                }

                var isEnrolled = await spaceRepo.IsStudentEnrolledAsync(space.Id, userId, ct);
                if (!isEnrolled)
                {
                    var enrolledSpaces = await spaceRepo.GetSpacesForStudentAsync(userId, currentUser.Email, ct);
                    if (!enrolledSpaces.Any(s => s.Id == space.Id))
                    {
                        throw new BusinessRuleException("NOT_ENROLLED_IN_SPACE",
                            $"Bạn không có tên trong danh sách sinh viên hợp lệ của môn {space.SubjectCode} học kỳ {space.SemesterCode} (BR-01).");
                    }
                }

                threshold = space.GroupThreshold;
            }
        }

        var member = await membership.AddDirectMemberAsync(
            group,
            userId,
            currentUser.FullName ?? string.Empty,
            currentUser.Email ?? string.Empty,
            threshold,
            DateTime.UtcNow,
            ct);

        await uow.SaveOrConflictAsync(ct);

        await events.PublishAsync(new MemberJoined(
            group.Id,
            group.Name,
            member.UserId,
            member.Email,
            member.FullName,
            group.Members.Count,
            group.MaxMembers), ct);

        var message = member.Role == MemberRole.Leader
            ? "Bạn là thành viên đầu tiên vào phòng và trở thành Trưởng nhóm (Leader) tạm thời (BR-15)."
            : (group.Status == GroupStatus.Recruiting
                ? $"Phòng đã đạt ngưỡng {threshold} thành viên và chính thức trở thành Group (BR-16)."
                : $"Gia nhập phòng thành công ({group.Members.Count}/{group.MaxMembers}).");

        return new DirectJoinRoomResponse(
            GroupId: group.Id,
            RoomCode: group.RoomCode,
            Name: group.Name,
            Status: group.Status.ToString(),
            Role: member.Role.ToString(),
            MemberCount: group.Members.Count,
            MaxMembers: group.MaxMembers,
            JoinedAt: member.JoinedAt,
            Message: message
        );
    }

    public async Task<GroupDetailResponse> CloseRecruitmentAsync(Guid groupId, CancellationToken ct = default)
    {
        var group = await LoadForLeaderAsync(groupId, "đóng tuyển sớm", ct);
        group.EnsureNotLocked();

        int threshold = (group.MaxMembers / 2) + 1;
        if (group.SpaceId.HasValue)
        {
            var space = await spaceRepo.GetByIdAsync(group.SpaceId.Value, ct);
            if (space != null) threshold = space.GroupThreshold;
        }

        if (group.Members.Count < threshold)
        {
            throw new BusinessRuleException("BELOW_THRESHOLD",
                $"Nhóm cần đạt tối thiểu ngưỡng {threshold} thành viên mới có thể chốt tuyển sớm (BR-16, BR-28).");
        }

        var now = DateTime.UtcNow;
        group.IsClosedByLeader = true;
        group.Status = GroupStatus.Closed;
        group.UpdatedAt = now;

        // BR-28: Nhóm đủ người hoặc Leader đóng tuyển thì mọi đơn đang chờ chuyển thành Reject
        await membership.RejectPendingOfGroupAsync(groupId, now, ct);

        await uow.SaveOrConflictAsync(ct);
        return group.ToDetail();
    }

    public async Task<GroupDetailResponse> ReopenRecruitmentAsync(Guid groupId, CancellationToken ct = default)
    {
        var group = await LoadForLeaderAsync(groupId, "mở lại tuyển dụng", ct);
        group.EnsureNotLocked();

        if (group.Members.Count >= group.MaxMembers)
        {
            throw new BusinessRuleException("GROUP_FULL", "Nhóm đã đủ sĩ số tối đa, không thể mở lại tuyển dụng.");
        }

        var now = DateTime.UtcNow;
        group.IsClosedByLeader = false;

        int threshold = (group.MaxMembers / 2) + 1;
        if (group.SpaceId.HasValue)
        {
            var space = await spaceRepo.GetByIdAsync(group.SpaceId.Value, ct);
            if (space != null) threshold = space.GroupThreshold;
        }

        group.Status = group.Members.Count >= threshold ? GroupStatus.Recruiting : GroupStatus.Forming;
        group.UpdatedAt = now;

        await uow.SaveOrConflictAsync(ct);
        return group.ToDetail();
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

    /// <summary>BR-19: ứng viên rời nhóm thì cuộc bầu đang diễn ra kết thúc, tránh bầu cho người đã rời.</summary>
    private async Task FailElectionOfRemovedCandidateAsync(Guid groupId, Guid removedUserId, CancellationToken ct)
    {
        var election = await groups.GetActiveElectionAsync(groupId, ct);
        if (election is not null && election.CandidateId == removedUserId)
        {
            election.Status = ElectionStatus.Failed;
            election.CompletedAt = DateTime.UtcNow;
        }
    }

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
        var threshold = (group.MaxMembers / 2) + 1;
        if (group.SpaceId.HasValue)
        {
            var space = await spaceRepo.GetByIdAsync(group.SpaceId.Value, ct);
            if (space != null) threshold = space.GroupThreshold;
        }

        membership.RemoveMember(group, member, DateTime.UtcNow, threshold);
        await FailElectionOfRemovedCandidateAsync(group.Id, member.UserId, ct);
        await uow.SaveOrConflictAsync(ct);
        await events.PublishAsync(new MemberLeft(group.Id, group.Name, member.UserId, group.Members.Count), ct);
    }
}
