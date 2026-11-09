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
using Group.Services.Options;
using Microsoft.Extensions.Options;

namespace Group.Services.Implementations;

public class JoinRequestService(
    IGroupRepository groups,
    IJoinRequestRepository joinRequests,
    ICourseSpaceRepository spaceRepo,
    IGroupUnitOfWork uow,
    GroupMembershipManager membership,
    IUserClient userClient,
    ICurrentUser currentUser,
    GroupEventPublisher events,
    IOptions<GroupOptions> options,
    IValidator<CreateJoinRequestRequest> createValidator) : IJoinRequestService
{
    public async Task<JoinRequestResponse> CreateAsync(Guid groupId, CreateJoinRequestRequest request, CancellationToken ct = default)
    {
        await createValidator.ValidateAndThrowAsync(request, ct);
        var studentId = currentUser.UserId;

        // BR-07: Bắt buộc hoàn tất hồ sơ 5 kỹ năng và cam kết trách nhiệm trước khi vào Room hoặc Apply
        var profile = await userClient.GetProfileAsync(studentId, ct);
        if (profile == null || !profile.IsProfileCompleted)
        {
            throw new BusinessRuleException("PROFILE_INCOMPLETE",
                "Bạn bắt buộc phải hoàn tất khai báo 5 kỹ năng cốt lõi và xác nhận cam kết trách nhiệm tại trang Hồ sơ cá nhân trước khi nộp đơn Apply (BR-07).");
        }

        var group = await groups.GetByIdAsync(groupId, ct) ?? throw new NotFoundException("Group", groupId);

        // BR-30: Kiểm tra trạng thái Space trước tiên
        var limit = options.Value.MaxPendingJoinRequests;
        if (group.SpaceId.HasValue)
        {
            var space = await spaceRepo.GetByIdAsync(group.SpaceId.Value, ct);
            if (space != null)
            {
                if (space.Status != CourseSpaceStatus.Open)
                {
                    throw new BusinessRuleException("REGISTRATION_CLOSED",
                        "Không gian học phần đã đóng cổng đăng ký tự do (BR-30) hoặc đã chốt sổ. Bạn không thể nộp thêm đơn ứng tuyển vào lúc này.");
                }

                // BR-01: chỉ sinh viên có trong danh sách của môn mới được nộp đơn.
                if (!await spaceRepo.IsStudentEnrolledAsync(space.Id, studentId, ct))
                {
                    throw new BusinessRuleException("NOT_ENROLLED_IN_SPACE",
                        $"Bạn không có tên trong danh sách sinh viên hợp lệ của môn {space.SubjectCode} học kỳ {space.SemesterCode} (BR-01).");
                }

                limit = space.MaxConcurrentApplies;
            }
        }

        // BR-04: không gửi tới nhóm mình đang ở.
        if (group.Members.Any(m => m.UserId == studentId))
            throw new BusinessRuleException(GroupErrorCodes.AlreadyMember, "You are already a member of this group.");

        group.EnsureRecruiting();

        // BR-24: đã có nhóm trong môn này thì không xin vào nhóm khác.
        if (await groups.IsUserInActiveGroupAsync(studentId, group.SpaceId, ct))
            throw new BusinessRuleException(GroupErrorCodes.AlreadyInGroup, "You are already in a group.");

        // BR-04: không có hai yêu cầu Pending tới cùng một nhóm.
        if (await joinRequests.HasPendingAsync(studentId, groupId, ct))
            throw new BusinessRuleException(GroupErrorCodes.DuplicateJoinRequest,
                "You already have a pending request to this group.");

        if (await joinRequests.CountPendingByStudentAsync(studentId, group.SpaceId, ct) >= limit)
            throw new BusinessRuleException(GroupErrorCodes.JoinRequestLimit,
                $"Bạn chỉ được nộp tối đa {limit} đơn ứng tuyển cùng lúc (BR-22). Vui lòng rút bớt đơn cũ trước khi nộp thêm.");

        if (request.SlotId is { } slotId)
        {
            var slot = group.Slots.FirstOrDefault(s => s.Id == slotId) ?? throw new NotFoundException("Slot", slotId);
            if (!slot.IsOpen)
                throw new BusinessRuleException(GroupErrorCodes.SlotFull, "This slot is already filled.");
        }

        var joinRequest = new JoinRequest
        {
            Id           = Guid.NewGuid(),
            GroupId      = group.Id,
            SlotId       = request.SlotId,
            StudentId    = studentId,
            StudentName  = currentUser.FullName ?? string.Empty,
            StudentEmail = currentUser.Email ?? string.Empty,
            Message      = request.Message?.Trim(),
            Status       = JoinRequestStatus.Pending,
            CreatedAt    = DateTime.UtcNow,
            Group        = group
        };
        joinRequests.Add(joinRequest);
        try
        {
            await uow.SaveChangesAsync(ct);
        }
        catch (UniqueConstraintViolationException ex) when (ex.IndexName == GroupIndexes.PendingJoinRequest)
        {
            // Hai request cùng lúc đều qua HasPendingAsync; unique index chặn request thứ hai (BR-04).
            throw new BusinessRuleException(GroupErrorCodes.DuplicateJoinRequest,
                "You already have a pending request to this group.");
        }

        var leader = group.Leader();
        await events.PublishAsync(new JoinRequestCreated(
            joinRequest.Id, group.Id, group.Name, studentId, joinRequest.StudentName,
            group.LeaderId ?? Guid.Empty, leader?.Email ?? string.Empty, leader?.FullName ?? string.Empty), ct);

        return joinRequest.ToResponse();
    }

    public async Task<PagedResult<JoinRequestResponse>> GetByGroupAsync(Guid groupId, JoinRequestQuery query, CancellationToken ct = default)
    {
        var group = await groups.GetByIdAsync(groupId, ct) ?? throw new NotFoundException("Group", groupId);
        group.EnsureMemberOrLeader(currentUser.UserId, "view join requests");

        var page = await joinRequests.GetPagedByGroupAsync(
            groupId, query.Status, query.NormalizedPage, query.NormalizedPageSize, ct);
        return page.Map(r => r.ToResponse());
    }

    public async Task<PagedResult<JoinRequestResponse>> GetMineAsync(JoinRequestQuery query, CancellationToken ct = default)
    {
        var page = await joinRequests.GetPagedByStudentAsync(
            currentUser.UserId, query.Status, query.NormalizedPage, query.NormalizedPageSize, ct);
        return page.Map(r => r.ToResponse());
    }

    public async Task<JoinRequestResponse> AcceptAsync(Guid id, CancellationToken ct = default)
    {
        var (joinRequest, member) = await uow.RetryOnConcurrencyAsync(async () =>
        {
            var r = await joinRequests.GetByIdAsync(id, ct) ?? throw new NotFoundException("JoinRequest", id);
            r.Group.EnsureLeader(currentUser.UserId, "accept join requests");

            if (r.Group.SpaceId.HasValue)
            {
                var space = await spaceRepo.GetByIdAsync(r.Group.SpaceId.Value, ct);
                if (space != null && space.Status != CourseSpaceStatus.Open)
                {
                    throw new BusinessRuleException("REGISTRATION_CLOSED",
                        "Không gian học phần đã đóng cổng đăng ký tự do (BR-30) hoặc đã chốt sổ. Không thể duyệt đơn ứng tuyển vào lúc này.");
                }
            }

            // Nhóm vừa đủ người (có thể do một lần duyệt đồng thời) đã từ chối yêu cầu này theo BR-28 → báo GROUP_FULL.
            if (r.Status == JoinRequestStatus.Rejected && r.Group.Members.Count >= r.Group.MaxMembers)
                throw new BusinessRuleException(GroupErrorCodes.GroupFull, "Group is full.");
            EnsurePending(r);

            var now = DateTime.UtcNow;
            r.Status = JoinRequestStatus.Accepted;
            r.DecidedAt = now;

            var m = await membership.AddMemberAsync(r.Group, r.StudentId, r.StudentName, r.StudentEmail, r.SlotId, now, ct);
            await uow.SaveChangesAsync(ct);
            return (r, m);
        });

        var group = joinRequest.Group;
        await events.PublishAsync(new JoinRequestDecided(
            joinRequest.Id, group.Id, group.Name, joinRequest.StudentId, joinRequest.StudentEmail, joinRequest.StudentName,
            Accepted: true), ct);
        await events.PublishAsync(new MemberJoined(
            group.Id, group.Name, member.UserId, member.Email, member.FullName, group.Members.Count, group.MaxMembers), ct);

        return joinRequest.ToResponse();
    }

    public async Task<JoinRequestResponse> RejectAsync(Guid id, CancellationToken ct = default)
    {
        var joinRequest = await uow.RetryOnConcurrencyAsync(async () =>
        {
            var r = await LoadPendingAsync(id, ct);
            r.Group.EnsureLeader(currentUser.UserId, "reject join requests");

            r.Status = JoinRequestStatus.Rejected;
            r.DecidedAt = DateTime.UtcNow;
            await uow.SaveChangesAsync(ct);
            return r;
        });

        var group = joinRequest.Group;
        await events.PublishAsync(new JoinRequestDecided(
            joinRequest.Id, group.Id, group.Name, joinRequest.StudentId, joinRequest.StudentEmail, joinRequest.StudentName,
            Accepted: false), ct);

        return joinRequest.ToResponse();
    }

    public async Task<JoinRequestResponse> CancelAsync(Guid id, CancellationToken ct = default)
    {
        var joinRequest = await uow.RetryOnConcurrencyAsync(async () =>
        {
            var r = await LoadPendingAsync(id, ct);
            if (r.StudentId != currentUser.UserId)
                throw new ForbiddenException("Only the student who sent the request can cancel it.");

            r.Status = JoinRequestStatus.Cancelled;
            r.DecidedAt = DateTime.UtcNow;
            await uow.SaveChangesAsync(ct);
            return r;
        });

        return joinRequest.ToResponse();
    }

    public async Task<JoinRequestResponse> VoteApplicationAsync(Guid requestId, VoteApplicationRequest request, CancellationToken ct = default)
    {
        var r = await joinRequests.GetByIdAsync(requestId, ct) ?? throw new NotFoundException("JoinRequest", requestId);
        var currentUserId = currentUser.UserId;

        // Thành viên trong nhóm mới được bỏ phiếu tham khảo (BR-25)
        var member = r.Group.Members.FirstOrDefault(m => m.UserId == currentUserId)
            ?? throw new BusinessRuleException("NOT_MEMBER", "Chỉ thành viên của nhóm mới được bỏ phiếu tham khảo cho ứng viên này (BR-25).");

        if (r.Status != JoinRequestStatus.Pending)
        {
            throw new BusinessRuleException("REQUEST_NOT_PENDING", "Chỉ có thể bỏ phiếu khi đơn ứng tuyển đang ở trạng thái chờ duyệt (Pending).");
        }

        var vote = await joinRequests.GetVoteAsync(requestId, currentUserId, ct);
        if (vote is null)
        {
            vote = new ApplicationVote
            {
                JoinRequestId = requestId,
                VoterId = currentUserId,
                VoterName = member.FullName,
                IsUpvote = request.IsUpvote,
                Comment = request.Comment?.Trim(),
                VotedAt = DateTime.UtcNow
            };
            joinRequests.AddVote(vote);
            if (!r.Votes.Any(v => v.VoterId == currentUserId))
            {
                r.Votes.Add(vote);
            }
        }
        else
        {
            vote.IsUpvote = request.IsUpvote;
            vote.Comment = request.Comment?.Trim();
            vote.VotedAt = DateTime.UtcNow;
        }

        await uow.SaveChangesAsync(ct);
        return r.ToResponse();
    }

    private async Task<JoinRequest> LoadPendingAsync(Guid id, CancellationToken ct)
    {
        var joinRequest = await joinRequests.GetByIdAsync(id, ct) ?? throw new NotFoundException("JoinRequest", id);
        EnsurePending(joinRequest);
        return joinRequest;
    }

    private static void EnsurePending(JoinRequest joinRequest)
    {
        if (joinRequest.Status != JoinRequestStatus.Pending)
            throw new BusinessRuleException(GroupErrorCodes.InvalidStatus, $"Join request is already {joinRequest.Status}.");
    }
}
