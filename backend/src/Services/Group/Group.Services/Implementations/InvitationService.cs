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
using Group.Services.Options;
using Microsoft.Extensions.Options;
using ICurrentUser = Exe.BuildingBlocks.Web.ICurrentUser;

namespace Group.Services.Implementations;

public class InvitationService(
    IGroupRepository groups,
    IInvitationRepository invitations,
    IGroupUnitOfWork uow,
    GroupMembershipManager membership,
    IUserClient userClient,
    ICurrentUser currentUser,
    GroupEventPublisher events,
    IOptions<GroupOptions> options,
    IValidator<CreateInvitationRequest> createValidator) : IInvitationService
{
    public async Task<InvitationResponse> CreateAsync(Guid groupId, CreateInvitationRequest request, CancellationToken ct = default)
    {
        await createValidator.ValidateAndThrowAsync(request, ct);

        var created = await uow.RetryOnConcurrencyAsync(async () =>
        {
            var group = await groups.GetByIdAsync(groupId, ct) ?? throw new NotFoundException("Group", groupId);
            group.EnsureLeader(currentUser.UserId, "send invitations"); // BR-05
            group.EnsureRecruiting();

            if (group.Members.Any(m => m.UserId == request.StudentId))
                throw new BusinessRuleException(GroupErrorCodes.AlreadyMember, "Student is already a member of this group.");

            var student = await userClient.GetProfileAsync(request.StudentId, ct)
                ?? throw new NotFoundException("User", request.StudentId);
            if (!string.Equals(student.Role, Roles.Student, StringComparison.OrdinalIgnoreCase))
                throw new BusinessRuleException(GroupErrorCodes.NotAStudent, "Only students can be invited.");

            if (await groups.IsUserInActiveGroupAsync(request.StudentId, ct)) // BR-01
                throw new BusinessRuleException(GroupErrorCodes.AlreadyInGroup, "Student is already in a group.");

            if (await invitations.HasPendingAsync(request.StudentId, groupId, ct))
                throw new BusinessRuleException(GroupErrorCodes.DuplicateInvitation,
                    "This student already has a pending invitation from this group.");

            var now = DateTime.UtcNow;
            var invitation = new Invitation
            {
                Id          = Guid.NewGuid(),
                GroupId     = group.Id,
                StudentId   = student.UserId,
                StudentName = student.FullName,
                InvitedBy   = currentUser.UserId,
                Status      = InvitationStatus.Pending,
                CreatedAt   = now,
                ExpiresAt   = now.AddDays(options.Value.InvitationExpiryDays),
                Group       = group
            };
            invitations.Add(invitation);

            // Sửa dòng Groups để SQL Server kiểm tra RowVersion: nhóm vừa đủ người / giải tán (BR-08 đã hủy các
            // lời mời Pending nó thấy) thì lần lưu này xung đột, thử lại và EnsureRecruiting báo lỗi đúng trạng thái.
            group.UpdatedAt = now;
            try
            {
                await uow.SaveChangesAsync(ct);
            }
            catch (UniqueConstraintViolationException ex) when (ex.IndexName == GroupIndexes.PendingInvitation)
            {
                throw new BusinessRuleException(GroupErrorCodes.DuplicateInvitation,
                    "This student already has a pending invitation from this group.");
            }
            return invitation;
        });

        // TODO(Trọng/Vy): User Service không trả email trong hồ sơ công khai, nên StudentEmail đang để trống
        // (Notification chỉ tạo thông báo trong app, không gửi email). Cần endpoint nội bộ trả email để bổ sung.
        await events.PublishAsync(new InvitationCreated(
            created.Id, created.Group.Id, created.Group.Name, created.StudentId, StudentEmail: string.Empty,
            created.StudentName, created.ExpiresAt), ct);

        return created.ToResponse();
    }

    public async Task<PagedResult<InvitationResponse>> GetMineAsync(InvitationQuery query, CancellationToken ct = default)
    {
        var page = await invitations.GetPagedByStudentAsync(
            currentUser.UserId, query.Status, query.NormalizedPage, query.NormalizedPageSize, ct);
        return page.Map(i => i.ToResponse());
    }

    public async Task<InvitationResponse> AcceptAsync(Guid id, CancellationToken ct = default)
    {
        var (invitation, member) = await uow.RetryOnConcurrencyAsync(async () =>
        {
            var inv = await LoadPendingForStudentAsync(id, ct);
            var now = DateTime.UtcNow;

            // BR-10: quá hạn mà job chưa kịp chạy → đánh dấu Expired rồi từ chối.
            if (inv.ExpiresAt <= now)
            {
                inv.Status = InvitationStatus.Expired;
                inv.RespondedAt = now;
                await uow.SaveChangesAsync(ct);
                throw new BusinessRuleException(GroupErrorCodes.InvitationExpired, "This invitation has expired.");
            }

            inv.Status = InvitationStatus.Accepted;
            inv.RespondedAt = now;

            var m = await membership.AddMemberAsync(
                inv.Group, inv.StudentId,
                currentUser.FullName ?? inv.StudentName, currentUser.Email ?? string.Empty,
                slotId: null, now, ct);
            await uow.SaveChangesAsync(ct);
            return (inv, m);
        });

        var group = invitation.Group;
        await events.PublishAsync(new MemberJoined(
            group.Id, group.Name, member.UserId, member.Email, member.FullName, group.Members.Count, group.MaxMembers), ct);

        return invitation.ToResponse();
    }

    public async Task<InvitationResponse> RejectAsync(Guid id, CancellationToken ct = default)
    {
        var invitation = await uow.RetryOnConcurrencyAsync(async () =>
        {
            var inv = await LoadPendingForStudentAsync(id, ct);
            inv.Status = InvitationStatus.Rejected;
            inv.RespondedAt = DateTime.UtcNow;
            await uow.SaveChangesAsync(ct);
            return inv;
        });
        return invitation.ToResponse();
    }

    public Task<int> ExpireOverdueAsync(CancellationToken ct = default) =>
        invitations.ExpireOverdueAsync(DateTime.UtcNow, ct);

    private async Task<Invitation> LoadPendingForStudentAsync(Guid id, CancellationToken ct)
    {
        var invitation = await invitations.GetByIdAsync(id, ct) ?? throw new NotFoundException("Invitation", id);
        if (invitation.StudentId != currentUser.UserId)
            throw new ForbiddenException("This invitation was sent to another student.");

        // BR-10: Expired không thể chấp nhận.
        if (invitation.Status == InvitationStatus.Expired)
            throw new BusinessRuleException(GroupErrorCodes.InvitationExpired, "This invitation has expired.");
        // BR-08 đã hủy lời mời vì nhóm đủ người.
        if (invitation.Status == InvitationStatus.Cancelled && invitation.Group.Status == GroupStatus.Full)
            throw new BusinessRuleException(GroupErrorCodes.GroupFull, "Group is full.");
        if (invitation.Status != InvitationStatus.Pending)
            throw new BusinessRuleException(GroupErrorCodes.InvalidStatus, $"Invitation is already {invitation.Status}.");
        return invitation;
    }
}
