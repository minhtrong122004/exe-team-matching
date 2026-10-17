using Exe.BuildingBlocks.Exceptions;
using FluentValidation;
using User.Repository.Entities;
using User.Repository.Enums;
using User.Services.DTOs;
using User.Services.Implementations;
using User.Services.Tests.TestDoubles;
using User.Services.Validators;

namespace User.Services.Tests;

public class SkillServiceTests
{
    private readonly FakeSkillRepository _skillRepo;
    private readonly FakeUserSkillRepository _userSkillRepo;
    private readonly FakeUserProfileRepository _profileRepo;
    private readonly FakeUserUnitOfWork _unitOfWork;
    private readonly SkillService _service;

    public SkillServiceTests()
    {
        _skillRepo = new FakeSkillRepository();
        _userSkillRepo = new FakeUserSkillRepository();
        _profileRepo = new FakeUserProfileRepository();
        _unitOfWork = new FakeUserUnitOfWork();

        var createValidator = new CreateSkillRequestValidator();
        var addValidator = new AddUserSkillRequestValidator();
        var updateValidator = new UpdateUserSkillProficiencyRequestValidator();
        var batchValidator = new BatchSetUserSkillsRequestValidator();

        _service = new SkillService(
            _skillRepo,
            _userSkillRepo,
            _profileRepo,
            _unitOfWork,
            createValidator,
            addValidator,
            updateValidator,
            batchValidator);
    }

    [Fact]
    public async Task GetAllSkills_ShouldReturnOrderedSkillList()
    {
        // Arrange
        await _skillRepo.AddAsync(new Skill { Id = Guid.NewGuid(), Name = "React", Category = SkillCategory.Technical });
        await _skillRepo.AddAsync(new Skill { Id = Guid.NewGuid(), Name = "C#", Category = SkillCategory.Technical });
        await _skillRepo.AddAsync(new Skill { Id = Guid.NewGuid(), Name = "Figma", Category = SkillCategory.Design });

        // Act
        var result = await _service.GetAllSkillsAsync();

        // Assert
        Assert.Equal(3, result.Count);
        Assert.Equal("C#", result[0].Name);
        Assert.Equal("Figma", result[1].Name);
        Assert.Equal("React", result[2].Name);
    }

    [Fact]
    public async Task GetSkillById_WhenNotFound_ShouldThrowNotFoundException()
    {
        // Act & Assert
        var ex = await Assert.ThrowsAsync<NotFoundException>(() => _service.GetSkillByIdAsync(Guid.NewGuid()));
        Assert.Equal("SKILL_NOT_FOUND", ex.ErrorCode);
    }

    [Fact]
    public async Task CreateSkill_WhenValid_ShouldPersistSkill()
    {
        // Arrange
        var request = new CreateSkillRequest("Docker", SkillCategory.Technical, "Containerization platform");

        // Act
        var result = await _service.CreateSkillAsync(request);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("Docker", result.Name);
        Assert.Equal(SkillCategory.Technical, result.Category);
        Assert.Equal("Containerization platform", result.Description);
        Assert.True(_unitOfWork.SaveChangesCount > 0);
    }

    [Fact]
    public async Task CreateSkill_WhenDuplicateNameCaseInsensitive_ShouldThrowConflictException()
    {
        // Arrange
        await _skillRepo.AddAsync(new Skill { Id = Guid.NewGuid(), Name = "React", Category = SkillCategory.Technical });
        var duplicateRequest = new CreateSkillRequest("react", SkillCategory.Technical);

        // Act & Assert
        var ex = await Assert.ThrowsAsync<ConflictException>(() => _service.CreateSkillAsync(duplicateRequest));
        Assert.Equal("SKILL_ALREADY_EXISTS", ex.ErrorCode);
    }

    [Fact]
    public async Task AddSkillToUser_WhenValid_ShouldCreateUserSkill()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var skillId = Guid.NewGuid();

        await _profileRepo.AddAsync(new UserProfile { UserId = userId, Email = "test@fpt.edu.vn", FullName = "Test" });
        await _skillRepo.AddAsync(new Skill { Id = skillId, Name = "SQL Server", Category = SkillCategory.Technical });

        var request = new AddUserSkillRequest(skillId, 4);

        // Act
        var result = await _service.AddSkillToUserAsync(userId, request);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(skillId, result.SkillId);
        Assert.Equal("SQL Server", result.SkillName);
        Assert.Equal(4, result.Level);
        Assert.True(_unitOfWork.SaveChangesCount > 0);
    }

    [Fact]
    public async Task AddSkillToUser_WhenDuplicateAssociation_ShouldThrowConflictException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var skillId = Guid.NewGuid();

        await _profileRepo.AddAsync(new UserProfile { UserId = userId, Email = "test@fpt.edu.vn", FullName = "Test" });
        await _skillRepo.AddAsync(new Skill { Id = skillId, Name = "SQL Server", Category = SkillCategory.Technical });
        await _userSkillRepo.AddAsync(new UserSkill { UserId = userId, SkillId = skillId, Level = 3 });

        var request = new AddUserSkillRequest(skillId, 4);

        // Act & Assert
        var ex = await Assert.ThrowsAsync<ConflictException>(() => _service.AddSkillToUserAsync(userId, request));
        Assert.Equal("USER_SKILL_ALREADY_EXISTS", ex.ErrorCode);
    }

    [Fact]
    public async Task AddSkillToUser_WhenSkillNotFound_ShouldThrowNotFoundException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        await _profileRepo.AddAsync(new UserProfile { UserId = userId, Email = "test@fpt.edu.vn", FullName = "Test" });

        var request = new AddUserSkillRequest(Guid.NewGuid(), 3);

        // Act & Assert
        var ex = await Assert.ThrowsAsync<NotFoundException>(() => _service.AddSkillToUserAsync(userId, request));
        Assert.Equal("SKILL_NOT_FOUND", ex.ErrorCode);
    }

    [Fact]
    public async Task AddSkillToUser_WhenUserNotFound_ShouldThrowNotFoundException()
    {
        // Arrange
        var skillId = Guid.NewGuid();
        await _skillRepo.AddAsync(new Skill { Id = skillId, Name = "Go", Category = SkillCategory.Technical });

        var request = new AddUserSkillRequest(skillId, 3);

        // Act & Assert
        var ex = await Assert.ThrowsAsync<NotFoundException>(() => _service.AddSkillToUserAsync(Guid.NewGuid(), request));
        Assert.Equal("USER_PROFILE_NOT_FOUND", ex.ErrorCode);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(6)]
    [InlineData(-1)]
    [InlineData(10)]
    public async Task AddSkillToUser_WhenLevelOutside1To5_ShouldThrowValidationException(int invalidLevel)
    {
        // Arrange
        var request = new AddUserSkillRequest(Guid.NewGuid(), invalidLevel);

        // Act & Assert
        await Assert.ThrowsAsync<FluentValidation.ValidationException>(() =>
            _service.AddSkillToUserAsync(Guid.NewGuid(), request));
    }

    [Fact]
    public async Task UpdateProficiency_WhenValid_ShouldUpdateLevel()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var skillId = Guid.NewGuid();

        await _profileRepo.AddAsync(new UserProfile { UserId = userId, Email = "test@fpt.edu.vn", FullName = "Test" });
        await _skillRepo.AddAsync(new Skill { Id = skillId, Name = "C#", Category = SkillCategory.Technical });
        await _userSkillRepo.AddAsync(new UserSkill { UserId = userId, SkillId = skillId, Level = 2 });

        var request = new UpdateUserSkillProficiencyRequest(5);

        // Act
        var result = await _service.UpdateUserSkillProficiencyAsync(userId, skillId, request);

        // Assert
        Assert.Equal(5, result.Level);
        Assert.True(_unitOfWork.SaveChangesCount > 0);
    }

    [Fact]
    public async Task UpdateProficiency_WhenUserSkillNotFound_ShouldThrowNotFoundException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        await _profileRepo.AddAsync(new UserProfile { UserId = userId, Email = "test@fpt.edu.vn", FullName = "Test" });

        var request = new UpdateUserSkillProficiencyRequest(3);

        // Act & Assert
        var ex = await Assert.ThrowsAsync<NotFoundException>(() =>
            _service.UpdateUserSkillProficiencyAsync(userId, Guid.NewGuid(), request));
        Assert.Equal("USER_SKILL_NOT_FOUND", ex.ErrorCode);
    }

    [Fact]
    public async Task RemoveSkillFromUser_WhenValid_ShouldRemove()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var skillId = Guid.NewGuid();

        await _profileRepo.AddAsync(new UserProfile { UserId = userId, Email = "test@fpt.edu.vn", FullName = "Test" });
        await _userSkillRepo.AddAsync(new UserSkill { UserId = userId, SkillId = skillId, Level = 3 });

        // Act
        await _service.RemoveSkillFromUserAsync(userId, skillId);

        // Assert
        Assert.Empty(_userSkillRepo.UserSkills);
        Assert.True(_unitOfWork.SaveChangesCount > 0);
    }

    [Fact]
    public async Task RemoveSkillFromUser_WhenNotFound_ShouldThrowNotFoundException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        await _profileRepo.AddAsync(new UserProfile { UserId = userId, Email = "test@fpt.edu.vn", FullName = "Test" });

        // Act & Assert
        var ex = await Assert.ThrowsAsync<NotFoundException>(() =>
            _service.RemoveSkillFromUserAsync(userId, Guid.NewGuid()));
        Assert.Equal("USER_SKILL_NOT_FOUND", ex.ErrorCode);
    }

    [Fact]
    public async Task SetUserSkills_WhenValid_ShouldReplaceAllSkills()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var skill1Id = Guid.NewGuid();
        var skill2Id = Guid.NewGuid();
        var skill3Id = Guid.NewGuid();

        await _profileRepo.AddAsync(new UserProfile { UserId = userId, Email = "test@fpt.edu.vn", FullName = "Test" });
        await _skillRepo.AddAsync(new Skill { Id = skill1Id, Name = "Skill 1", Category = SkillCategory.Technical });
        await _skillRepo.AddAsync(new Skill { Id = skill2Id, Name = "Skill 2", Category = SkillCategory.Design });
        await _skillRepo.AddAsync(new Skill { Id = skill3Id, Name = "Skill 3", Category = SkillCategory.Business });

        // Initially user has skill 1
        await _userSkillRepo.AddAsync(new UserSkill { UserId = userId, SkillId = skill1Id, Level = 1 });

        // Batch set to skill 2 and skill 3
        var request = new BatchSetUserSkillsRequest(new List<UserSkillItemRequest>
        {
            new(skill2Id, 4),
            new(skill3Id, 5)
        });

        // Act
        var result = await _service.SetUserSkillsAsync(userId, request);

        // Assert
        Assert.Equal(2, result.Count);
        Assert.DoesNotContain(result, s => s.SkillId == skill1Id);
        Assert.Contains(result, s => s.SkillId == skill2Id && s.Level == 4);
        Assert.Contains(result, s => s.SkillId == skill3Id && s.Level == 5);
    }

    [Fact]
    public async Task SetUserSkills_WhenDuplicateSkillIdsInRequest_ShouldThrowValidationException()
    {
        // Arrange: Request contains same SkillId twice
        var duplicateSkillId = Guid.NewGuid();
        var request = new BatchSetUserSkillsRequest(new List<UserSkillItemRequest>
        {
            new(duplicateSkillId, 3),
            new(duplicateSkillId, 4)
        });

        // Act & Assert
        await Assert.ThrowsAsync<FluentValidation.ValidationException>(() =>
            _service.SetUserSkillsAsync(Guid.NewGuid(), request));
    }

    [Fact]
    public async Task SetUserSkills_WhenSkillNotFoundInCatalog_ShouldThrowNotFoundException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        await _profileRepo.AddAsync(new UserProfile { UserId = userId, Email = "test@fpt.edu.vn", FullName = "Test" });

        var nonExistentSkillId = Guid.NewGuid();
        var request = new BatchSetUserSkillsRequest(new List<UserSkillItemRequest>
        {
            new(nonExistentSkillId, 3)
        });

        // Act & Assert
        var ex = await Assert.ThrowsAsync<NotFoundException>(() => _service.SetUserSkillsAsync(userId, request));
        Assert.Equal("SKILLS_NOT_FOUND", ex.ErrorCode);
    }
}
