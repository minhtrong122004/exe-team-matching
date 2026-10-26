using Exe.Contracts.Events;
using Microsoft.Extensions.Logging;
using Report.Repository.Entities;
using Report.Repository.Enums;
using Report.Repository.Interfaces;
using Report.Services.Interfaces;

namespace Report.Services.Implementations;

public class ReportEventHandler : IReportEventHandler
{
    private readonly IStudentStatRepository _studentRepo;
    private readonly IGroupStatRepository _groupRepo;
    private readonly IProcessedEventRepository _processedEventRepo;
    private readonly IReportUnitOfWork _unitOfWork;
    private readonly ILogger<ReportEventHandler> _logger;

    public ReportEventHandler(
        IStudentStatRepository studentRepo,
        IGroupStatRepository groupRepo,
        IProcessedEventRepository processedEventRepo,
        IReportUnitOfWork unitOfWork,
        ILogger<ReportEventHandler> logger)
    {
        _studentRepo = studentRepo;
        _groupRepo = groupRepo;
        _processedEventRepo = processedEventRepo;
        _unitOfWork = unitOfWork;
        _logger = logger;
    }

    public async Task<bool> HandleUserRegisteredAsync(UserRegistered @event, Guid eventId, CancellationToken ct = default)
    {
        if (await IsAlreadyProcessedAsync(eventId, nameof(UserRegistered), ct))
            return false;

        if (string.Equals(@event.Role, "Student", StringComparison.OrdinalIgnoreCase))
        {
            var existing = await _studentRepo.GetByUserIdAsync(@event.UserId, ct);
            if (existing is null)
            {
                await _studentRepo.AddAsync(new StudentStat
                {
                    UserId = @event.UserId,
                    Email = @event.Email,
                    FullName = @event.FullName,
                    Major = null,
                    HasGroup = false,
                    GroupId = null,
                    UpdatedAt = DateTime.UtcNow
                }, ct);
            }
            else
            {
                existing.Email = @event.Email;
                existing.FullName = @event.FullName;
                existing.UpdatedAt = DateTime.UtcNow;
                _studentRepo.Update(existing);
            }
        }

        await MarkProcessedAndCommitAsync(eventId, ct);
        return true;
    }

    public async Task<bool> HandleUserProfileUpdatedAsync(UserProfileUpdated @event, Guid eventId, CancellationToken ct = default)
    {
        if (await IsAlreadyProcessedAsync(eventId, nameof(UserProfileUpdated), ct))
            return false;

        var existing = await _studentRepo.GetByUserIdAsync(@event.UserId, ct);
        if (existing is not null)
        {
            existing.FullName = @event.FullName;
            existing.Major = @event.Major;
            existing.UpdatedAt = DateTime.UtcNow;
            _studentRepo.Update(existing);
        }

        await MarkProcessedAndCommitAsync(eventId, ct);
        return true;
    }

    public async Task<bool> HandleGroupCreatedAsync(GroupCreated @event, Guid eventId, CancellationToken ct = default)
    {
        if (await IsAlreadyProcessedAsync(eventId, nameof(GroupCreated), ct))
            return false;

        var status = @event.MaxMembers <= 1 ? GroupStatStatus.Full : GroupStatStatus.Recruiting;
        var existingGroup = await _groupRepo.GetByGroupIdAsync(@event.GroupId, ct);

        if (existingGroup is null)
        {
            await _groupRepo.AddAsync(new GroupStat
            {
                GroupId = @event.GroupId,
                Name = @event.Name,
                LeaderId = @event.LeaderId,
                MemberCount = 1,
                MaxMembers = @event.MaxMembers,
                Status = status,
                UpdatedAt = DateTime.UtcNow
            }, ct);
        }
        else
        {
            existingGroup.Name = @event.Name;
            existingGroup.LeaderId = @event.LeaderId;
            existingGroup.MaxMembers = @event.MaxMembers;
            existingGroup.Status = existingGroup.MemberCount >= @event.MaxMembers
                ? GroupStatStatus.Full
                : GroupStatStatus.Recruiting;
            existingGroup.UpdatedAt = DateTime.UtcNow;
            _groupRepo.Update(existingGroup);
        }

        var leader = await _studentRepo.GetByUserIdAsync(@event.LeaderId, ct);
        if (leader is not null)
        {
            leader.HasGroup = true;
            leader.GroupId = @event.GroupId;
            leader.UpdatedAt = DateTime.UtcNow;
            _studentRepo.Update(leader);
        }

        await MarkProcessedAndCommitAsync(eventId, ct);
        return true;
    }

    public async Task<bool> HandleMemberJoinedAsync(MemberJoined @event, Guid eventId, CancellationToken ct = default)
    {
        if (await IsAlreadyProcessedAsync(eventId, nameof(MemberJoined), ct))
            return false;

        var student = await _studentRepo.GetByUserIdAsync(@event.UserId, ct);
        if (student is null)
        {
            await _studentRepo.AddAsync(new StudentStat
            {
                UserId = @event.UserId,
                Email = @event.UserEmail,
                FullName = @event.UserName,
                Major = null,
                HasGroup = true,
                GroupId = @event.GroupId,
                UpdatedAt = DateTime.UtcNow
            }, ct);
        }
        else
        {
            student.HasGroup = true;
            student.GroupId = @event.GroupId;
            if (!string.IsNullOrWhiteSpace(@event.UserEmail))
                student.Email = @event.UserEmail;
            if (!string.IsNullOrWhiteSpace(@event.UserName))
                student.FullName = @event.UserName;
            student.UpdatedAt = DateTime.UtcNow;
            _studentRepo.Update(student);
        }

        var group = await _groupRepo.GetByGroupIdAsync(@event.GroupId, ct);
        var status = @event.MemberCount >= @event.MaxMembers ? GroupStatStatus.Full : GroupStatStatus.Recruiting;
        if (group is null)
        {
            await _groupRepo.AddAsync(new GroupStat
            {
                GroupId = @event.GroupId,
                Name = @event.GroupName,
                LeaderId = @event.UserId,
                MemberCount = @event.MemberCount,
                MaxMembers = @event.MaxMembers,
                Status = status,
                UpdatedAt = DateTime.UtcNow
            }, ct);
        }
        else
        {
            group.Name = @event.GroupName;
            group.MemberCount = @event.MemberCount;
            group.MaxMembers = @event.MaxMembers;
            group.Status = status;
            group.UpdatedAt = DateTime.UtcNow;
            _groupRepo.Update(group);
        }

        await MarkProcessedAndCommitAsync(eventId, ct);
        return true;
    }

    public async Task<bool> HandleMemberLeftAsync(MemberLeft @event, Guid eventId, CancellationToken ct = default)
    {
        if (await IsAlreadyProcessedAsync(eventId, nameof(MemberLeft), ct))
            return false;

        var student = await _studentRepo.GetByUserIdAsync(@event.UserId, ct);
        if (student is not null)
        {
            student.HasGroup = false;
            student.GroupId = null;
            student.UpdatedAt = DateTime.UtcNow;
            _studentRepo.Update(student);
        }

        var group = await _groupRepo.GetByGroupIdAsync(@event.GroupId, ct);
        if (group is not null)
        {
            group.MemberCount = @event.MemberCount;
            group.Status = @event.MemberCount == 0
                ? GroupStatStatus.Archived
                : (@event.MemberCount >= group.MaxMembers ? GroupStatStatus.Full : GroupStatStatus.Recruiting);
            group.UpdatedAt = DateTime.UtcNow;
            _groupRepo.Update(group);
        }

        await MarkProcessedAndCommitAsync(eventId, ct);
        return true;
    }

    private async Task<bool> IsAlreadyProcessedAsync(Guid eventId, string eventType, CancellationToken ct)
    {
        if (await _processedEventRepo.ExistsAsync(eventId, ct))
        {
            _logger.LogInformation("Skipping duplicate event {EventType} ({EventId})", eventType, eventId);
            return true;
        }
        return false;
    }

    private async Task MarkProcessedAndCommitAsync(Guid eventId, CancellationToken ct)
    {
        await _processedEventRepo.AddAsync(new ProcessedEvent
        {
            EventId = eventId,
            ProcessedAt = DateTime.UtcNow
        }, ct);
        await _unitOfWork.SaveChangesAsync(ct);
    }
}
