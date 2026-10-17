using Exe.Contracts.Events;
using Microsoft.Extensions.Logging.Abstractions;
using User.Repository.Entities;
using User.Repository.Enums;
using User.Services.Implementations;
using User.Services.Interfaces;
using User.Services.Tests.TestDoubles;
using Xunit;

namespace User.Services.Tests;

public class UserRegisteredConsumerServiceTests
{
    private readonly FakeUserProfileRepository _profileRepo = new();
    private readonly FakeProcessedEventRepository _processedEventRepo = new();
    private readonly FakeUserUnitOfWork _unitOfWork = new();
    private readonly UserRegisteredConsumerService _service;

    public UserRegisteredConsumerServiceTests()
    {
        _service = new UserRegisteredConsumerService(
            _profileRepo,
            _processedEventRepo,
            _unitOfWork,
            NullLogger<UserRegisteredConsumerService>.Instance);
    }

    [Fact]
    public async Task ConsumeAsync_ValidEvent_CreatesProfileAndProcessedEvent_AndCommits()
    {
        // Arrange
        var eventId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        var @event = new UserRegisteredEvent(
            eventId,
            userId,
            "student@fpt.edu.vn",
            "Nguyen Van Test",
            "Student",
            DateTime.UtcNow,
            SchemaVersion: 1);

        // Act
        var result = await _service.ConsumeAsync(@event);

        // Assert
        Assert.Equal(ConsumerExecutionStatus.Success, result.Status);

        // Verify UserProfile
        var profile = Assert.Single(_profileRepo.Profiles);
        Assert.Equal(userId, profile.UserId);
        Assert.Equal("student@fpt.edu.vn", profile.Email);
        Assert.Equal("Nguyen Van Test", profile.FullName);
        Assert.Equal("Student", profile.Role);
        Assert.Equal(UserAvailability.LookingForTeam, profile.Availability);

        // Verify ProcessedEvent
        var proc = Assert.Single(_processedEventRepo.Events);
        Assert.Equal(eventId, proc.EventId);
        Assert.Equal("UserRegistered", proc.EventType);

        // Verify Transaction Commit
        Assert.True(_unitOfWork.CurrentTransaction?.IsCommitted);
        Assert.False(_unitOfWork.CurrentTransaction?.IsRolledBack);
        Assert.Equal(1, _unitOfWork.SaveChangesCount);
    }

    [Fact]
    public async Task ConsumeAsync_DuplicateEventId_ReturnsDuplicateEvent_AndDoesNotCreateProfile()
    {
        // Arrange
        var eventId = Guid.NewGuid();
        var userId = Guid.NewGuid();

        // Seed ProcessedEvent as already processed
        await _processedEventRepo.AddAsync(new ProcessedEvent
        {
            EventId = eventId,
            EventType = "UserRegistered",
            ProcessedAt = DateTime.UtcNow.AddMinutes(-5)
        });

        var @event = new UserRegisteredEvent(
            eventId,
            userId,
            "student@fpt.edu.vn",
            "Nguyen Van Test",
            "Student",
            DateTime.UtcNow,
            SchemaVersion: 1);

        // Act
        var result = await _service.ConsumeAsync(@event);

        // Assert
        Assert.Equal(ConsumerExecutionStatus.DuplicateEvent, result.Status);
        Assert.Empty(_profileRepo.Profiles);
        Assert.Single(_processedEventRepo.Events); // Still only 1
        Assert.Equal(0, _unitOfWork.SaveChangesCount);
    }

    [Fact]
    public async Task ConsumeAsync_DuplicateUserId_DifferentEventId_ReturnsConflict_AndDoesNotOverwrite()
    {
        // Arrange
        var originalEventId = Guid.NewGuid();
        var newEventId = Guid.NewGuid();
        var userId = Guid.NewGuid();

        // Seed existing profile for this UserId with specific fields
        var existingProfile = new UserProfile
        {
            UserId = userId,
            Email = "original@fpt.edu.vn",
            FullName = "Original Name",
            Role = "Student",
            Bio = "Original Bio",
            Major = Major.SE,
            Availability = UserAvailability.InTeam,
            CreatedAt = DateTime.UtcNow.AddDays(-1),
            UpdatedAt = DateTime.UtcNow.AddDays(-1)
        };
        await _profileRepo.AddAsync(existingProfile);

        var @event = new UserRegisteredEvent(
            newEventId,
            userId,
            "intruder@fpt.edu.vn",
            "Intruder Name",
            "Student",
            DateTime.UtcNow,
            SchemaVersion: 1);

        // Act
        var result = await _service.ConsumeAsync(@event);

        // Assert
        Assert.Equal(ConsumerExecutionStatus.Conflict, result.Status);

        // Verify existing profile was NOT overwritten
        var profile = Assert.Single(_profileRepo.Profiles);
        Assert.Equal("original@fpt.edu.vn", profile.Email);
        Assert.Equal("Original Name", profile.FullName);
        Assert.Equal(UserAvailability.InTeam, profile.Availability);
        Assert.Equal("Original Bio", profile.Bio);

        // ProcessedEvent should NOT be recorded for this conflicting event
        Assert.Empty(_processedEventRepo.Events);
        Assert.Equal(0, _unitOfWork.SaveChangesCount);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(2)]
    [InlineData(-1)]
    public async Task ConsumeAsync_UnsupportedSchemaVersion_ReturnsInvalid(int unsupportedVersion)
    {
        // Arrange
        var @event = new UserRegisteredEvent(
            Guid.NewGuid(),
            Guid.NewGuid(),
            "student@fpt.edu.vn",
            "Nguyen Van Test",
            "Student",
            DateTime.UtcNow,
            SchemaVersion: unsupportedVersion);

        // Act
        var result = await _service.ConsumeAsync(@event);

        // Assert
        Assert.Equal(ConsumerExecutionStatus.Invalid, result.Status);
        Assert.Contains("Unsupported SchemaVersion", result.Message);
        Assert.Empty(_profileRepo.Profiles);
        Assert.Empty(_processedEventRepo.Events);
    }

    [Fact]
    public async Task ConsumeAsync_EmptyEventId_ReturnsInvalid()
    {
        // Arrange
        var @event = new UserRegisteredEvent(
            Guid.Empty,
            Guid.NewGuid(),
            "student@fpt.edu.vn",
            "Nguyen Van Test",
            "Student",
            DateTime.UtcNow,
            SchemaVersion: 1);

        // Act
        var result = await _service.ConsumeAsync(@event);

        // Assert
        Assert.Equal(ConsumerExecutionStatus.Invalid, result.Status);
        Assert.Empty(_profileRepo.Profiles);
    }

    [Fact]
    public async Task ConsumeAsync_EmptyUserId_ReturnsInvalid()
    {
        // Arrange
        var @event = new UserRegisteredEvent(
            Guid.NewGuid(),
            Guid.Empty,
            "student@fpt.edu.vn",
            "Nguyen Van Test",
            "Student",
            DateTime.UtcNow,
            SchemaVersion: 1);

        // Act
        var result = await _service.ConsumeAsync(@event);

        // Assert
        Assert.Equal(ConsumerExecutionStatus.Invalid, result.Status);
        Assert.Empty(_profileRepo.Profiles);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public async Task ConsumeAsync_EmptyEmail_ReturnsInvalid(string emptyEmail)
    {
        // Arrange
        var @event = new UserRegisteredEvent(
            Guid.NewGuid(),
            Guid.NewGuid(),
            emptyEmail,
            "Nguyen Van Test",
            "Student",
            DateTime.UtcNow,
            SchemaVersion: 1);

        // Act
        var result = await _service.ConsumeAsync(@event);

        // Assert
        Assert.Equal(ConsumerExecutionStatus.Invalid, result.Status);
        Assert.Empty(_profileRepo.Profiles);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public async Task ConsumeAsync_EmptyFullName_ReturnsInvalid(string emptyName)
    {
        // Arrange
        var @event = new UserRegisteredEvent(
            Guid.NewGuid(),
            Guid.NewGuid(),
            "student@fpt.edu.vn",
            emptyName,
            "Student",
            DateTime.UtcNow,
            SchemaVersion: 1);

        // Act
        var result = await _service.ConsumeAsync(@event);

        // Assert
        Assert.Equal(ConsumerExecutionStatus.Invalid, result.Status);
        Assert.Empty(_profileRepo.Profiles);
    }

    [Fact]
    public async Task ConsumeAsync_SqlFailure_RollsBackTransaction_AndThrows()
    {
        // Arrange
        _unitOfWork.ShouldFailOnSave = true;

        var @event = new UserRegisteredEvent(
            Guid.NewGuid(),
            Guid.NewGuid(),
            "student@fpt.edu.vn",
            "Nguyen Van Test",
            "Student",
            DateTime.UtcNow,
            SchemaVersion: 1);

        // Act & Assert
        await Assert.ThrowsAsync<InvalidOperationException>(() => _service.ConsumeAsync(@event));

        // Transaction must be rolled back
        Assert.True(_unitOfWork.CurrentTransaction?.IsRolledBack);
        Assert.False(_unitOfWork.CurrentTransaction?.IsCommitted);
    }

    [Fact]
    public async Task ConsumeAsync_DefaultRoleIsStudent_WhenRoleIsEmpty()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var @event = new UserRegisteredEvent(
            Guid.NewGuid(),
            userId,
            "student@fpt.edu.vn",
            "Nguyen Van Test",
            "",
            DateTime.UtcNow,
            SchemaVersion: 1);

        // Act
        var result = await _service.ConsumeAsync(@event);

        // Assert
        Assert.Equal(ConsumerExecutionStatus.Success, result.Status);
        var profile = Assert.Single(_profileRepo.Profiles);
        Assert.Equal("Student", profile.Role);
    }

    [Fact]
    public async Task ConsumeAsync_DuplicateEmail_DifferentUserId_ReturnsConflict_AndDoesNotOverwrite()
    {
        // Arrange
        var existingUserId = Guid.NewGuid();
        var newUserId = Guid.NewGuid();
        var email = "same_email@fpt.edu.vn";

        // Seed existing profile with that email
        await _profileRepo.AddAsync(new UserProfile
        {
            UserId = existingUserId,
            Email = email,
            FullName = "Original Owner",
            Role = "Student"
        });

        var @event = new UserRegisteredEvent(
            Guid.NewGuid(),
            newUserId,
            email,
            "Intruder with Same Email",
            "Student",
            DateTime.UtcNow,
            SchemaVersion: 1);

        // Act
        var result = await _service.ConsumeAsync(@event);

        // Assert
        Assert.Equal(ConsumerExecutionStatus.Conflict, result.Status);
        Assert.Contains("Email", result.Message);
        var profile = Assert.Single(_profileRepo.Profiles);
        Assert.Equal(existingUserId, profile.UserId);
        Assert.Equal("Original Owner", profile.FullName);
    }

    [Fact]
    public async Task ConsumeAsync_CancellationToken_PropagatedProperly()
    {
        // Arrange
        using var cts = new CancellationTokenSource();
        cts.Cancel();

        var @event = new UserRegisteredEvent(
            Guid.NewGuid(),
            Guid.NewGuid(),
            "student@fpt.edu.vn",
            "Nguyen Van Test",
            "Student",
            DateTime.UtcNow,
            SchemaVersion: 1);

        // Act & Assert
        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => _service.ConsumeAsync(@event, cts.Token));
    }

    [Fact]
    public async Task ConsumeAsync_ValidEvent_SetsDefaultLookingForTeam_AndEmptyInterestsAndSkills()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var @event = new UserRegisteredEvent(
            Guid.NewGuid(),
            userId,
            "student_new@fpt.edu.vn",
            "Nguyen Van Test",
            "Student",
            DateTime.UtcNow,
            SchemaVersion: 1);

        // Act
        var result = await _service.ConsumeAsync(@event);

        // Assert
        Assert.Equal(ConsumerExecutionStatus.Success, result.Status);
        var profile = Assert.Single(_profileRepo.Profiles);
        Assert.Equal(UserAvailability.LookingForTeam, profile.Availability);
        Assert.Null(profile.Interests);
        Assert.Empty(profile.Skills);
        Assert.Null(profile.StudentCode);
        Assert.Null(profile.Campus);
        Assert.Null(profile.Major);
        Assert.Null(profile.Bio);
    }

    [Fact]
    public async Task ConsumeAsync_LecturerRoleEvent_CreatesUserProfileWithLecturerRole()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var @event = new UserRegisteredEvent(
            Guid.NewGuid(),
            userId,
            "lecturer_new@fpt.edu.vn",
            "Giảng Viên Tran",
            "Lecturer",
            DateTime.UtcNow,
            SchemaVersion: 1);

        // Act
        var result = await _service.ConsumeAsync(@event);

        // Assert
        Assert.Equal(ConsumerExecutionStatus.Success, result.Status);
        var profile = Assert.Single(_profileRepo.Profiles);
        Assert.Equal("Lecturer", profile.Role);
        Assert.Equal("lecturer_new@fpt.edu.vn", profile.Email);
        Assert.Equal("Giảng Viên Tran", profile.FullName);
    }
}
