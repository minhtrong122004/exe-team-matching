using Exe.BuildingBlocks.EventBus;
using Exe.BuildingBlocks.Exceptions;
using Exe.Contracts.Events;
using FluentValidation;
using User.Repository.Entities;
using User.Repository.Enums;
using User.Services.DTOs;
using User.Services.Implementations;
using User.Services.Tests.TestDoubles;
using User.Services.Validators;

namespace User.Services.Tests;

public class UserProfileServiceTests
{
    private readonly FakeUserProfileRepository _profileRepo;
    private readonly FakeUserUnitOfWork _unitOfWork;
    private readonly FakeCurrentUser _currentUser;
    private readonly UserProfileService _service;

    public UserProfileServiceTests()
    {
        _profileRepo = new FakeUserProfileRepository();
        _unitOfWork = new FakeUserUnitOfWork();
        _currentUser = new FakeCurrentUser();

        var updateValidator = new UpdateUserProfileRequestValidator();
        var createValidator = new CreateUserProfileInternalRequestValidator();
        var batchValidator = new BatchUsersRequestValidator();

        _service = new UserProfileService(
            _profileRepo,
            _unitOfWork,
            _currentUser,
            updateValidator,
            createValidator,
            batchValidator);
    }

    [Fact]
    public async Task GetProfileById_WhenProfileExists_ShouldReturnProfileResponse()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var profile = new UserProfile
        {
            UserId = userId,
            Email = "student@fpt.edu.vn",
            FullName = "Nguyen Van A",
            Role = "Student",
            StudentCode = "SE170001",
            Campus = "TP. Hồ Chí Minh",
            Major = Major.SE,
            Bio = "Interested in AI & Web",
            DesiredRole = "Backend Developer",
            Availability = UserAvailability.LookingForTeam,
            Interests = "[\"EdTech\",\"FinTech\"]",
            CreatedAt = DateTime.UtcNow.AddDays(-10),
            UpdatedAt = DateTime.UtcNow.AddDays(-1)
        };
        await _profileRepo.AddAsync(profile);

        // Act
        var result = await _service.GetProfileByIdAsync(userId);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(userId, result.UserId);
        Assert.Equal("Nguyen Van A", result.FullName);
        Assert.Equal(Major.SE, result.Major);
        Assert.Equal(2, result.Interests.Count);
        Assert.Contains("EdTech", result.Interests);
        Assert.Contains("FinTech", result.Interests);
    }

    [Fact]
    public async Task GetProfileById_WhenProfileNotFound_ShouldThrowNotFoundException()
    {
        // Arrange
        var nonExistentId = Guid.NewGuid();

        // Act & Assert
        var ex = await Assert.ThrowsAsync<NotFoundException>(() => _service.GetProfileByIdAsync(nonExistentId));
        Assert.Equal("USER_PROFILE_NOT_FOUND", ex.ErrorCode);
    }

    [Fact]
    public async Task GetCurrentUserProfile_WhenNotAuthenticated_ShouldThrowUnauthorizedException()
    {
        // Arrange: _currentUser has no UserId
        _currentUser.UserId = null;

        // Act & Assert
        await Assert.ThrowsAsync<UnauthorizedException>(() => _service.GetCurrentUserProfileAsync());
    }

    [Fact]
    public async Task UpdateCurrentUserProfile_WhenValid_ShouldUpdateAndPreserveServerOwnedFields()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var originalCreatedAt = DateTime.UtcNow.AddMonths(-1);
        var existingProfile = new UserProfile
        {
            UserId = userId,
            Email = "original.email@fpt.edu.vn",
            FullName = "Old Name",
            Role = "Student",
            StudentCode = "SE123456",
            CreatedAt = originalCreatedAt,
            UpdatedAt = originalCreatedAt
        };
        await _profileRepo.AddAsync(existingProfile);

        _currentUser.UserId = userId;
        _currentUser.Email = "original.email@fpt.edu.vn";

        var updateRequest = new UpdateUserProfileRequest(
            FullName: "New Updated Name",
            StudentCode: "SE123456",
            Campus: "Đà Nẵng",
            Major: Major.AI,
            Bio: "Updated Bio",
            DesiredRole: "AI Engineer",
            Availability: UserAvailability.InTeam,
            Interests: new List<string> { "Health", "Tourism" }
        );

        // Act
        var result = await _service.UpdateCurrentUserProfileAsync(updateRequest);

        // Assert
        Assert.Equal("New Updated Name", result.FullName);
        Assert.Equal("Đà Nẵng", result.Campus);
        Assert.Equal(Major.AI, result.Major);
        Assert.Equal("Updated Bio", result.Bio);
        Assert.Equal(UserAvailability.InTeam, result.Availability);
        Assert.Equal(2, result.Interests.Count);

        // Verify server-owned fields remain unchanged
        Assert.Equal(userId, result.UserId);
        Assert.Equal("original.email@fpt.edu.vn", result.Email);
        Assert.Equal("Student", result.Role);
        Assert.Equal(originalCreatedAt, result.CreatedAt);

        // Unit of work verified
        Assert.True(_unitOfWork.SaveChangesCount > 0);
    }

    [Fact]
    public async Task UpdateProfile_WhenStudentCodeAlreadyUsedByAnotherUser_ShouldThrowConflictException()
    {
        // Arrange
        var user1Id = Guid.NewGuid();
        var user2Id = Guid.NewGuid();

        await _profileRepo.AddAsync(new UserProfile
        {
            UserId = user1Id,
            Email = "user1@fpt.edu.vn",
            FullName = "User One",
            StudentCode = "SE179999"
        });

        await _profileRepo.AddAsync(new UserProfile
        {
            UserId = user2Id,
            Email = "user2@fpt.edu.vn",
            FullName = "User Two",
            StudentCode = "SE178888"
        });

        var request = new UpdateUserProfileRequest(
            FullName: "User Two",
            StudentCode: "SE179999" // Same as user1
        );

        // Act & Assert
        var ex = await Assert.ThrowsAsync<ConflictException>(() => _service.UpdateUserProfileAsync(user2Id, request));
        Assert.Equal("STUDENT_CODE_ALREADY_EXISTS", ex.ErrorCode);
    }

    [Fact]
    public async Task UpdateProfile_WhenStudentCodeAlreadyLockedFromFap_ShouldThrowBadRequestException()
    {
        // Arrange (BR-04: Sinh viên đã có StudentCode từ FAP không được đổi sang mã khác)
        var userId = Guid.NewGuid();
        await _profileRepo.AddAsync(new UserProfile
        {
            UserId = userId,
            Email = "student.fap@fpt.edu.vn",
            FullName = "Student FAP",
            StudentCode = "SE180001"
        });

        var request = new UpdateUserProfileRequest(
            FullName: "Student FAP",
            StudentCode: "SE189999"
        );

        // Act & Assert
        var ex = await Assert.ThrowsAsync<BadRequestException>(() => _service.UpdateUserProfileAsync(userId, request));
        Assert.Equal("STUDENT_CODE_LOCKED", ex.ErrorCode);
    }

    [Fact]
    public async Task UpdateProfile_WhenInvalidFields_ShouldThrowValidationException()
    {
        // Arrange: Empty FullName and invalid StudentCode with special characters
        var request = new UpdateUserProfileRequest(
            FullName: "", // invalid empty
            StudentCode: "SE-123#@!" // invalid characters
        );

        // Act & Assert
        await Assert.ThrowsAsync<FluentValidation.ValidationException>(() =>
            _service.UpdateUserProfileAsync(Guid.NewGuid(), request));
    }

    [Fact]
    public async Task CreateEmptyProfile_WhenNewUser_ShouldCreateProfileSuccessfully()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var request = new CreateUserProfileInternalRequest(
            UserId: userId,
            Email: "new.student@fpt.edu.vn",
            FullName: "Tran Thi B",
            Role: "Student"
        );

        // Act
        var result = await _service.CreateEmptyProfileAsync(request);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(userId, result.UserId);
        Assert.Equal("new.student@fpt.edu.vn", result.Email);
        Assert.Equal("Tran Thi B", result.FullName);
        Assert.Equal(UserAvailability.LookingForTeam, result.Availability);
        Assert.Null(result.StudentCode);
        Assert.Null(result.Major);
        Assert.Empty(result.Interests);
        Assert.True(_unitOfWork.SaveChangesCount > 0);
    }

    [Fact]
    public async Task CreateEmptyProfile_WhenProfileAlreadyExists_ShouldThrowConflictException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        await _profileRepo.AddAsync(new UserProfile
        {
            UserId = userId,
            Email = "existing@fpt.edu.vn",
            FullName = "Existing User"
        });

        var request = new CreateUserProfileInternalRequest(
            UserId: userId,
            Email: "existing@fpt.edu.vn",
            FullName: "Existing User",
            Role: "Student"
        );

        // Act & Assert
        var ex = await Assert.ThrowsAsync<ConflictException>(() => _service.CreateEmptyProfileAsync(request));
        Assert.Equal("USER_PROFILE_ALREADY_EXISTS", ex.ErrorCode);
    }

    [Fact]
    public async Task GetBatchProfiles_WhenValidList_ShouldReturnMatchingProfiles()
    {
        // Arrange
        var id1 = Guid.NewGuid();
        var id2 = Guid.NewGuid();
        await _profileRepo.AddAsync(new UserProfile { UserId = id1, Email = "u1@fpt.edu.vn", FullName = "U1" });
        await _profileRepo.AddAsync(new UserProfile { UserId = id2, Email = "u2@fpt.edu.vn", FullName = "U2" });

        // Act
        var result = await _service.GetBatchProfilesAsync(new[] { id1, id2 });

        // Assert
        Assert.Equal(2, result.Count);
    }

    [Fact]
    public async Task PublicProfiles_ShouldNeverExposeEmailOrStudentCodeInSerializedJson()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var profile = new UserProfile
        {
            UserId = userId,
            Email = "secret.student@fpt.edu.vn",
            FullName = "Secret Student",
            StudentCode = "SE123999",
            Role = "Student",
            Campus = "Hà Nội",
            Major = Major.SE,
            Availability = UserAvailability.LookingForTeam
        };
        await _profileRepo.AddAsync(profile);

        // Act 1: GetProfileById
        var publicProfile = await _service.GetProfileByIdAsync(userId);
        var publicJson = System.Text.Json.JsonSerializer.Serialize(publicProfile);

        // Assert 1: Email and StudentCode are completely absent from public JSON
        Assert.DoesNotContain("secret.student@fpt.edu.vn", publicJson);
        Assert.DoesNotContain("SE123999", publicJson);
        Assert.DoesNotContain("\"email\"", publicJson, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("\"studentCode\"", publicJson, StringComparison.OrdinalIgnoreCase);

        // Act 2: SearchProfiles
        var searchResult = await _service.SearchProfilesAsync(new UserSearchFilter());
        var searchJson = System.Text.Json.JsonSerializer.Serialize(searchResult);
        Assert.DoesNotContain("secret.student@fpt.edu.vn", searchJson);
        Assert.DoesNotContain("SE123999", searchJson);
        Assert.DoesNotContain("\"studentCode\"", searchJson, StringComparison.OrdinalIgnoreCase);

        // Act 3: BatchProfiles
        var batchResult = await _service.GetBatchProfilesAsync(new[] { userId });
        var batchJson = System.Text.Json.JsonSerializer.Serialize(batchResult);
        Assert.DoesNotContain("secret.student@fpt.edu.vn", batchJson);
        Assert.DoesNotContain("SE123999", batchJson);
        Assert.DoesNotContain("\"studentCode\"", batchJson, StringComparison.OrdinalIgnoreCase);

        // Act 4: GetCurrentUserProfile (Private owner endpoint)
        _currentUser.UserId = userId;
        _currentUser.Email = "secret.student@fpt.edu.vn";
        var privateProfile = await _service.GetCurrentUserProfileAsync();
        var privateJson = System.Text.Json.JsonSerializer.Serialize(privateProfile);

        // Assert 4: Private profile retains Email and StudentCode
        Assert.Contains("secret.student@fpt.edu.vn", privateJson);
        Assert.Contains("SE123999", privateJson);
        Assert.Equal("secret.student@fpt.edu.vn", privateProfile.Email);
        Assert.Equal("SE123999", privateProfile.StudentCode);
    }

    [Fact]
    public async Task UpdateUserProfile_WhenEventPublisherProvided_ShouldPublishUserProfileUpdatedEvent()
    {
        // Arrange
        var userId = Guid.NewGuid();
        await _profileRepo.AddAsync(new UserProfile
        {
            UserId = userId,
            Email = "update.event@fpt.edu.vn",
            FullName = "Old Name"
        });

        var fakePublisher = new FakeEventPublisher();
        var serviceWithPublisher = new UserProfileService(
            _profileRepo,
            _unitOfWork,
            _currentUser,
            new UpdateUserProfileRequestValidator(),
            new CreateUserProfileInternalRequestValidator(),
            new BatchUsersRequestValidator(),
            fakePublisher);

        var request = new UpdateUserProfileRequest(
            FullName: "New Name",
            StudentCode: null,
            Campus: "TP. Hồ Chí Minh",
            Major: Major.SE,
            Bio: "Bio",
            DesiredRole: "Frontend",
            Availability: UserAvailability.LookingForTeam,
            Interests: new List<string> { "React" });

        // Act
        await serviceWithPublisher.UpdateUserProfileAsync(userId, request);

        // Assert
        Assert.Single(fakePublisher.PublishedEvents);
        var published = Assert.IsType<UserProfileUpdated>(fakePublisher.PublishedEvents[0]);
        Assert.Equal(userId, published.UserId);
        Assert.Equal("New Name", published.FullName);
        Assert.Equal("SE", published.Major);
    }

    [Fact]
    public async Task UpdateProfileSkills_WhenValidAndCommitted_ShouldSet5ScoresAndMarkCompleted()
    {
        // Arrange
        var userId = Guid.NewGuid();
        await _profileRepo.AddAsync(new UserProfile
        {
            UserId = userId,
            Email = "skills.student@fpt.edu.vn",
            FullName = "Skills Student",
            StudentCode = "SE180999",
            Cohort = "K18",
            Major = Major.SE
        });

        var request = new UpdateProfileSkillsRequest(
            TechScore: 85,
            ManagementScore: 70,
            GraphicDesignScore: 60,
            MarketingScore: 50,
            SaleScore: 40,
            IsCommitted: true,
            DesiredRole: "Fullstack Lead",
            Bio: "Experienced in .NET and React",
            Interests: new List<string> { "EdTech", "FinTech" }
        );

        // Act
        var result = await _service.UpdateProfileSkillsAsync(userId, request);

        // Assert
        Assert.Equal(85, result.TechScore);
        Assert.Equal(70, result.ManagementScore);
        Assert.Equal(60, result.GraphicDesignScore);
        Assert.Equal(50, result.MarketingScore);
        Assert.Equal(40, result.SaleScore);
        Assert.True(result.IsCommitted);
        Assert.NotNull(result.CommittedAt);
        Assert.True(result.IsProfileCompleted);
        Assert.Equal("Fullstack Lead", result.DesiredRole);
        Assert.Equal("Experienced in .NET and React", result.Bio);
        Assert.Equal("K18", result.Cohort);
    }

    [Fact]
    public async Task UpdateProfileSkills_WhenNotCommitted_ShouldThrowValidationException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        await _profileRepo.AddAsync(new UserProfile
        {
            UserId = userId,
            Email = "uncommitted@fpt.edu.vn",
            FullName = "Uncommitted Student"
        });

        var request = new UpdateProfileSkillsRequest(
            TechScore: 85,
            ManagementScore: 70,
            GraphicDesignScore: 60,
            MarketingScore: 50,
            SaleScore: 40,
            IsCommitted: false // Violates BR-06
        );

        // Act & Assert
        var ex = await Assert.ThrowsAsync<FluentValidation.ValidationException>(() => _service.UpdateProfileSkillsAsync(userId, request));
        Assert.Contains(ex.Errors, e => e.PropertyName == "IsCommitted");
    }

    [Theory]
    [InlineData(-1, 50, 50, 50, 50)]
    [InlineData(101, 50, 50, 50, 50)]
    [InlineData(50, 105, 50, 50, 50)]
    [InlineData(50, 50, -5, 50, 50)]
    public async Task UpdateProfileSkills_WhenScoresOutOfRange_ShouldThrowValidationException(
        int tech, int mgmt, int gd, int mkt, int sale)
    {
        // Arrange
        var userId = Guid.NewGuid();
        var request = new UpdateProfileSkillsRequest(
            TechScore: tech,
            ManagementScore: mgmt,
            GraphicDesignScore: gd,
            MarketingScore: mkt,
            SaleScore: sale,
            IsCommitted: true
        );

        // Act & Assert
        await Assert.ThrowsAsync<FluentValidation.ValidationException>(() => _service.UpdateProfileSkillsAsync(userId, request));
    }

    [Fact]
    public async Task UpdateProfileSkills_ShouldPublishEventWith5ScoresAndCohort()
    {
        // Arrange
        var userId = Guid.NewGuid();
        await _profileRepo.AddAsync(new UserProfile
        {
            UserId = userId,
            Email = "event.skills@fpt.edu.vn",
            FullName = "Event Skills Student",
            StudentCode = "SE180777",
            Cohort = "K18",
            Major = Major.SE
        });

        var fakePublisher = new FakeEventPublisher();
        var serviceWithPublisher = new UserProfileService(
            _profileRepo,
            _unitOfWork,
            _currentUser,
            new UpdateUserProfileRequestValidator(),
            new CreateUserProfileInternalRequestValidator(),
            new BatchUsersRequestValidator(),
            fakePublisher);

        var request = new UpdateProfileSkillsRequest(
            TechScore: 90,
            ManagementScore: 80,
            GraphicDesignScore: 70,
            MarketingScore: 60,
            SaleScore: 50,
            IsCommitted: true
        );

        // Act
        await serviceWithPublisher.UpdateProfileSkillsAsync(userId, request);

        // Assert
        Assert.Single(fakePublisher.PublishedEvents);
        var published = Assert.IsType<UserProfileUpdated>(fakePublisher.PublishedEvents[0]);
        Assert.Equal(userId, published.UserId);
        Assert.Equal(90, published.TechScore);
        Assert.Equal(80, published.ManagementScore);
        Assert.Equal(70, published.GraphicDesignScore);
        Assert.Equal(60, published.MarketingScore);
        Assert.Equal(50, published.SaleScore);
        Assert.True(published.IsProfileCompleted);
        Assert.Equal("K18", published.Cohort);
    }

    private class FakeEventPublisher : IEventPublisher
    {
        public List<object> PublishedEvents { get; } = new();

        public Task<Guid> PublishAsync<TEvent>(TEvent @event, CancellationToken cancellationToken = default) where TEvent : class
        {
            PublishedEvents.Add(@event);
            return Task.FromResult(Guid.NewGuid());
        }
    }
}
