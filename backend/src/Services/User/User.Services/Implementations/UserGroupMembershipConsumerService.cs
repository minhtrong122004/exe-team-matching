using Exe.Contracts.Events;
using Microsoft.Extensions.Logging;
using User.Repository.Entities;
using User.Repository.Enums;
using User.Repository.Interfaces;
using User.Services.Interfaces;

namespace User.Services.Implementations;

/// <summary>
/// Triển khai dịch vụ nghiệp vụ xử lý idempotent sự kiện MemberJoined và MemberLeft (CLAUDE.md mục 7, BR-01).
/// Khi sinh viên gia nhập nhóm -> Availability = InTeam.
/// Khi sinh viên rời nhóm -> Availability = LookingForTeam.
/// </summary>
public class UserGroupMembershipConsumerService : IUserGroupMembershipConsumerService
{
    private readonly IUserProfileRepository _profileRepository;
    private readonly IProcessedEventRepository _processedEventRepository;
    private readonly IUserUnitOfWork _unitOfWork;
    private readonly ILogger<UserGroupMembershipConsumerService> _logger;

    public UserGroupMembershipConsumerService(
        IUserProfileRepository profileRepository,
        IProcessedEventRepository processedEventRepository,
        IUserUnitOfWork unitOfWork,
        ILogger<UserGroupMembershipConsumerService> logger)
    {
        _profileRepository = profileRepository;
        _processedEventRepository = processedEventRepository;
        _unitOfWork = unitOfWork;
        _logger = logger;
    }

    public async Task HandleMemberJoinedAsync(Guid eventId, MemberJoined payload, CancellationToken ct = default)
    {
        if (eventId == Guid.Empty || payload.UserId == Guid.Empty)
        {
            _logger.LogWarning("Skipping invalid MemberJoined event (eventId={EventId}, userId={UserId}).", eventId, payload.UserId);
            return;
        }

        if (await _processedEventRepository.HasBeenProcessedAsync(eventId, ct))
        {
            _logger.LogInformation("Duplicate MemberJoined event {EventId} skipped (idempotent).", eventId);
            return;
        }

        await _unitOfWork.ExecuteInTransactionAsync(async () =>
        {
            if (await _processedEventRepository.HasBeenProcessedAsync(eventId, ct))
            {
                return;
            }

            var profile = await _profileRepository.GetByIdAsync(payload.UserId, ct);
            if (profile != null)
            {
                profile.Availability = UserAvailability.InTeam;
                profile.UpdatedAt = DateTime.UtcNow;
                _profileRepository.Update(profile);
            }
            else
            {
                _logger.LogWarning("UserProfile not found for UserId {UserId} when processing MemberJoined (GroupId={GroupId}). Recording ProcessedEvent anyway.",
                    payload.UserId, payload.GroupId);
            }

            await _processedEventRepository.AddAsync(new ProcessedEvent
            {
                EventId = eventId,
                EventType = nameof(MemberJoined),
                ProcessedAt = DateTime.UtcNow
            }, ct);

            await _unitOfWork.SaveChangesAsync(ct);
        }, ct);

        _logger.LogInformation("Processed MemberJoined event {EventId}: UserId {UserId} -> Availability=InTeam (GroupId={GroupId}).",
            eventId, payload.UserId, payload.GroupId);
    }

    public async Task HandleMemberLeftAsync(Guid eventId, MemberLeft payload, CancellationToken ct = default)
    {
        if (eventId == Guid.Empty || payload.UserId == Guid.Empty)
        {
            _logger.LogWarning("Skipping invalid MemberLeft event (eventId={EventId}, userId={UserId}).", eventId, payload.UserId);
            return;
        }

        if (await _processedEventRepository.HasBeenProcessedAsync(eventId, ct))
        {
            _logger.LogInformation("Duplicate MemberLeft event {EventId} skipped (idempotent).", eventId);
            return;
        }

        await _unitOfWork.ExecuteInTransactionAsync(async () =>
        {
            if (await _processedEventRepository.HasBeenProcessedAsync(eventId, ct))
            {
                return;
            }

            var profile = await _profileRepository.GetByIdAsync(payload.UserId, ct);
            if (profile != null)
            {
                profile.Availability = UserAvailability.LookingForTeam;
                profile.UpdatedAt = DateTime.UtcNow;
                _profileRepository.Update(profile);
            }
            else
            {
                _logger.LogWarning("UserProfile not found for UserId {UserId} when processing MemberLeft (GroupId={GroupId}). Recording ProcessedEvent anyway.",
                    payload.UserId, payload.GroupId);
            }

            await _processedEventRepository.AddAsync(new ProcessedEvent
            {
                EventId = eventId,
                EventType = nameof(MemberLeft),
                ProcessedAt = DateTime.UtcNow
            }, ct);

            await _unitOfWork.SaveChangesAsync(ct);
        }, ct);

        _logger.LogInformation("Processed MemberLeft event {EventId}: UserId {UserId} -> Availability=LookingForTeam (GroupId={GroupId}).",
            eventId, payload.UserId, payload.GroupId);
    }
}

