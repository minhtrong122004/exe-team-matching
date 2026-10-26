using Exe.BuildingBlocks.Paging;
using Exe.BuildingBlocks.Web;
using Exe.Contracts.Events;
using FluentValidation;
using Group.Repository.Entities;
using Group.Repository.Enums;
using Group.Repository.Interfaces;
using Group.Services.DTOs;
using Group.Services.Exceptions;
using Group.Services.Interfaces;
using Group.Services.Options;
using Microsoft.Extensions.Options;

namespace Group.Services.Implementations;

public class JoinRequestService(
    IGroupRepository groups,
    IJoinRequestRepository joinRequests,
    IGroupUnitOfWork uow,
    GroupMembershipManager membership,
    ICurrentUser currentUser,
    GroupEventPublisher events,
    IOptions<GroupOptions> options,
    IValidator<CreateJoinRequestRequest> createValidator) : IJoinRequestService
{
    public async Task<JoinRequestResponse> CreateAsync(Guid groupId, CreateJoinRequestRequest request, CancellationToken ct = default)
    {
        await createValidator.ValidateAndThrowAsync(request, ct);
        var studentId = currentUser.UserId;

        var group = await groups.GetByIdAsync(groupId, ct) ?? throw new NotFoundException("Group", groupId);

        // BR-04: không gửi tới nhóm mình đang ở.
        if (group.Members.Any(m => m.UserId == studentId))
            throw new BusinessRuleException(GroupErrorCodes.AlreadyMember, "You are already a member of this group.");

        group.EnsureRecruiting();

        // BR-01: đã có nhóm thì không xin vào nhóm khác.
        if (await groups.IsUserInActiveGroupAsync(studentId, ct))
            throw new BusinessRuleException(GroupErrorCodes.AlreadyInGroup, "You are already in a group.");

        // BR-04: không có hai yêu cầu Pending tới cùng một nhóm.
        if (await joinRequests.HasPendingAsync(studentId, groupId, ct))
            throw new BusinessRuleException(GroupErrorCodes.DuplicateJoinRequest,
                "You already have a pending request to this group.");

        // BR-03
        var limit = options.Value.MaxPendingJoinRequests;
        if (await joinRequests.CountPendingByStudentAsync(studentId, ct) >= limit)
            throw new BusinessRuleException(GroupErrorCodes.JoinRequestLimit,
                $"You can have at most {limit} pending join requests.");

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
            group.LeaderId, leader?.Email ?? string.Empty, leader?.FullName ?? string.Empty), ct);

        return joinRequest.ToResponse();
    }

    public async Task<PagedResult<JoinRequestResponse>> GetByGroupAsync(Guid groupId, JoinRequestQuery query, CancellationToken ct = default)
    {
        var group = await groups.GetByIdAsync(groupId, ct) ?? throw new NotFoundException("Group", groupId);
        group.EnsureLeader(currentUser.UserId, "view join requests");

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

            // Nhóm vừa đủ người (có thể do một lần duyệt đồng thời) đã hủy yêu cầu này theo BR-08 → báo GROUP_FULL.
            if (r.Status == JoinRequestStatus.Cancelled && r.Group.Status == GroupStatus.Full)
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
