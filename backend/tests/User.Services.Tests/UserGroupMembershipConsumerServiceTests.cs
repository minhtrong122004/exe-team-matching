using Exe.Contracts.Events;
using Microsoft.Extensions.Logging.Abstractions;
using User.Repository.Entities;
using User.Repository.Enums;
using User.Services.Implementations;
using User.Services.Tests.TestDoubles;
using Xunit;

namespace User.Services.Tests;

public class UserGroupMembershipConsumerServiceTests
{
    private readonly FakeUserProfileRepository _profileRepo = new();
    private readonly FakeProcessedEventRepository _processedEventRepo = new();
    private readonly FakeUserUnitOfWork _unitOfWork = new();
    private readonly UserGroupMembershipConsumerService _service;

    public UserGroupMembershipConsumerServiceTests()
    {
        _service = new UserGroupMembershipConsumerService(
            _profileRepo,
            _processedEventRepo,
            _unitOfWork,
            NullLogger<UserGroupMembershipConsumerService>.Instance);
    }

    [Fact]
    public async Task HandleMemberJoinedAsync_ValidEvent_UpdatesAvailabilityToInTeam_AndRecordsProcessedEvent()
    {
        var userId = Guid.NewGuid();
        var groupId = Guid.NewGuid();
        var eventId = Guid.NewGuid();

        await _profileRepo.AddAsync(new UserProfile
        {
            UserId = userId,
            Email = "sv@fpt.edu.vn",
            FullName = "Nguyen Van SV",
            Role = "Student",
            Availability = UserAvailability.LookingForTeam,
            CreatedAt = DateTime.UtcNow.AddDays(-1),
            UpdatedAt = DateTime.UtcNow.AddDays(-1)
        });

        var evt = new MemberJoined(groupId, "Team Alpha", userId, "Nguyen Van SV", "Member", 2, 5);
        await _service.HandleMemberJoinedAsync(eventId, evt);

        var profile = await _profileRepo.GetByIdAsync(userId);
        Assert.NotNull(profile);
        Assert.Equal(UserAvailability.InTeam, profile!.Availability);
        Assert.True(await _processedEventRepo.HasBeenProcessedAsync(eventId));
    }

    [Fact]
    public async Task HandleMemberJoinedAsync_DuplicateEvent_IsIdempotent()
    {
        var userId = Guid.NewGuid();
        var groupId = Guid.NewGuid();
        var eventId = Guid.NewGuid();

        await _processedEventRepo.AddAsync(new ProcessedEvent
        {
            EventId = eventId,
            EventType = nameof(MemberJoined),
            ProcessedAt = DateTime.UtcNow
        });

        var evt = new MemberJoined(groupId, "Team Alpha", userId, "Nguyen Van SV", "Member", 2, 5);
        await _service.HandleMemberJoinedAsync(eventId, evt);

        Assert.Equal(0, _unitOfWork.SaveChangesCount);
    }

    [Fact]
    public async Task HandleMemberLeftAsync_ValidEvent_UpdatesAvailabilityToLookingForTeam_AndRecordsProcessedEvent()
    {
        var userId = Guid.NewGuid();
        var groupId = Guid.NewGuid();
        var eventId = Guid.NewGuid();

        await _profileRepo.AddAsync(new UserProfile
        {
            UserId = userId,
            Email = "sv@fpt.edu.vn",
            FullName = "Nguyen Van SV",
            Role = "Student",
            Availability = UserAvailability.InTeam,
            CreatedAt = DateTime.UtcNow.AddDays(-1),
            UpdatedAt = DateTime.UtcNow.AddDays(-1)
        });

        var evt = new MemberLeft(groupId, "Team Alpha", userId, 1);
        await _service.HandleMemberLeftAsync(eventId, evt);

        var profile = await _profileRepo.GetByIdAsync(userId);
        Assert.NotNull(profile);
        Assert.Equal(UserAvailability.LookingForTeam, profile!.Availability);
        Assert.True(await _processedEventRepo.HasBeenProcessedAsync(eventId));
    }

    [Fact]
    public async Task HandleMemberLeftAsync_DuplicateEvent_IsIdempotent()
    {
        var userId = Guid.NewGuid();
        var groupId = Guid.NewGuid();
        var eventId = Guid.NewGuid();

        await _processedEventRepo.AddAsync(new ProcessedEvent
        {
            EventId = eventId,
            EventType = nameof(MemberLeft),
            ProcessedAt = DateTime.UtcNow
        });

        var evt = new MemberLeft(groupId, "Team Alpha", userId, 1);
        await _service.HandleMemberLeftAsync(eventId, evt);

        Assert.Equal(0, _unitOfWork.SaveChangesCount);
    }
}
