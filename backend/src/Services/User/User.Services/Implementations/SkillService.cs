using Exe.BuildingBlocks.Exceptions;
using FluentValidation;
using User.Repository.Entities;
using User.Repository.Enums;
using User.Repository.Interfaces;
using User.Services.DTOs;
using User.Services.Interfaces;

namespace User.Services.Implementations;

/// <summary>
/// Triển khai nghiệp vụ quản lý danh mục kỹ năng và kỹ năng người dùng (CLAUDE.md mục 5, 6, 10).
/// </summary>
public class SkillService : ISkillService
{
    private readonly ISkillRepository _skillRepo;
    private readonly IUserSkillRepository _userSkillRepo;
    private readonly IUserProfileRepository _profileRepo;
    private readonly IUserUnitOfWork _unitOfWork;
    private readonly IValidator<CreateSkillRequest> _createSkillValidator;
    private readonly IValidator<AddUserSkillRequest> _addSkillValidator;
    private readonly IValidator<UpdateUserSkillProficiencyRequest> _updateProficiencyValidator;
    private readonly IValidator<BatchSetUserSkillsRequest> _batchSetValidator;

    public SkillService(
        ISkillRepository skillRepo,
        IUserSkillRepository userSkillRepo,
        IUserProfileRepository profileRepo,
        IUserUnitOfWork unitOfWork,
        IValidator<CreateSkillRequest> createSkillValidator,
        IValidator<AddUserSkillRequest> addSkillValidator,
        IValidator<UpdateUserSkillProficiencyRequest> updateProficiencyValidator,
        IValidator<BatchSetUserSkillsRequest> batchSetValidator)
    {
        _skillRepo = skillRepo;
        _userSkillRepo = userSkillRepo;
        _profileRepo = profileRepo;
        _unitOfWork = unitOfWork;
        _createSkillValidator = createSkillValidator;
        _addSkillValidator = addSkillValidator;
        _updateProficiencyValidator = updateProficiencyValidator;
        _batchSetValidator = batchSetValidator;
    }

    public async Task<IReadOnlyList<SkillResponse>> GetAllSkillsAsync(CancellationToken ct = default)
    {
        var skills = await _skillRepo.GetAllAsync(ct);
        return skills.Select(ToResponse).ToList();
    }

    public async Task<IReadOnlyList<SkillResponse>> GetSkillsByCategoryAsync(SkillCategory category, CancellationToken ct = default)
    {
        var skills = await _skillRepo.GetByCategoryAsync(category, ct);
        return skills.Select(ToResponse).ToList();
    }

    public async Task<SkillResponse> GetSkillByIdAsync(Guid id, CancellationToken ct = default)
    {
        var skill = await _skillRepo.GetByIdAsync(id, ct);
        if (skill == null)
        {
            throw new NotFoundException("Kỹ năng không tồn tại trong danh mục.", "SKILL_NOT_FOUND");
        }

        return ToResponse(skill);
    }

    public async Task<SkillResponse> CreateSkillAsync(CreateSkillRequest request, CancellationToken ct = default)
    {
        var validationResult = await _createSkillValidator.ValidateAsync(request, ct);
        if (!validationResult.IsValid)
        {
            throw new FluentValidation.ValidationException(validationResult.Errors);
        }

        var trimmedName = request.Name.Trim();
        var existing = await _skillRepo.GetByNameAsync(trimmedName, ct);
        if (existing != null)
        {
            throw new ConflictException($"Kỹ năng với tên '{trimmedName}' đã tồn tại trong danh mục.", "SKILL_ALREADY_EXISTS");
        }

        var skill = new Skill
        {
            Id = Guid.NewGuid(),
            Name = trimmedName,
            Category = request.Category,
            Description = request.Description?.Trim(),
            CreatedAt = DateTime.UtcNow
        };

        await _skillRepo.AddAsync(skill, ct);
        await _unitOfWork.SaveChangesAsync(ct);

        return ToResponse(skill);
    }

    public async Task<IReadOnlyList<UserSkillResponse>> GetUserSkillsAsync(Guid userId, CancellationToken ct = default)
    {
        if (!await _profileRepo.ExistsAsync(userId, ct))
        {
            throw new NotFoundException("Hồ sơ người dùng không tồn tại.", "USER_PROFILE_NOT_FOUND");
        }

        var userSkills = await _userSkillRepo.GetByUserIdAsync(userId, ct);
        return userSkills.Select(ToResponse).OrderBy(s => s.SkillName).ToList();
    }

    public async Task<UserSkillResponse> AddSkillToUserAsync(Guid userId, AddUserSkillRequest request, CancellationToken ct = default)
    {
        var validationResult = await _addSkillValidator.ValidateAsync(request, ct);
        if (!validationResult.IsValid)
        {
            throw new FluentValidation.ValidationException(validationResult.Errors);
        }

        if (!await _profileRepo.ExistsAsync(userId, ct))
        {
            throw new NotFoundException("Hồ sơ người dùng không tồn tại.", "USER_PROFILE_NOT_FOUND");
        }

        var skill = await _skillRepo.GetByIdAsync(request.SkillId, ct);
        if (skill == null)
        {
            throw new NotFoundException("Kỹ năng không tồn tại trong danh mục.", "SKILL_NOT_FOUND");
        }

        var existingUserSkill = await _userSkillRepo.GetAsync(userId, request.SkillId, ct);
        if (existingUserSkill != null)
        {
            throw new ConflictException("Kỹ năng này đã tồn tại trong hồ sơ của người dùng.", "USER_SKILL_ALREADY_EXISTS");
        }

        var userSkill = new UserSkill
        {
            UserId = userId,
            SkillId = request.SkillId,
            Level = request.Level,
            CreatedAt = DateTime.UtcNow,
            Skill = skill
        };

        await _userSkillRepo.AddAsync(userSkill, ct);
        await _unitOfWork.SaveChangesAsync(ct);

        return ToResponse(userSkill);
    }

    public async Task<UserSkillResponse> UpdateUserSkillProficiencyAsync(Guid userId, Guid skillId, UpdateUserSkillProficiencyRequest request, CancellationToken ct = default)
    {
        var validationResult = await _updateProficiencyValidator.ValidateAsync(request, ct);
        if (!validationResult.IsValid)
        {
            throw new FluentValidation.ValidationException(validationResult.Errors);
        }

        if (!await _profileRepo.ExistsAsync(userId, ct))
        {
            throw new NotFoundException("Hồ sơ người dùng không tồn tại.", "USER_PROFILE_NOT_FOUND");
        }

        var userSkill = await _userSkillRepo.GetAsync(userId, skillId, ct);
        if (userSkill == null)
        {
            throw new NotFoundException("Kỹ năng này chưa được gán cho người dùng.", "USER_SKILL_NOT_FOUND");
        }

        userSkill.Level = request.Level;
        await _unitOfWork.SaveChangesAsync(ct);

        if (userSkill.Skill == null)
        {
            var skill = await _skillRepo.GetByIdAsync(skillId, ct);
            userSkill.Skill = skill!;
        }

        return ToResponse(userSkill);
    }

    public async Task RemoveSkillFromUserAsync(Guid userId, Guid skillId, CancellationToken ct = default)
    {
        if (!await _profileRepo.ExistsAsync(userId, ct))
        {
            throw new NotFoundException("Hồ sơ người dùng không tồn tại.", "USER_PROFILE_NOT_FOUND");
        }

        var userSkill = await _userSkillRepo.GetAsync(userId, skillId, ct);
        if (userSkill == null)
        {
            throw new NotFoundException("Kỹ năng này chưa được gán cho người dùng.", "USER_SKILL_NOT_FOUND");
        }

        _userSkillRepo.Remove(userSkill);
        await _unitOfWork.SaveChangesAsync(ct);
    }

    public async Task<IReadOnlyList<UserSkillResponse>> SetUserSkillsAsync(Guid userId, BatchSetUserSkillsRequest request, CancellationToken ct = default)
    {
        var validationResult = await _batchSetValidator.ValidateAsync(request, ct);
        if (!validationResult.IsValid)
        {
            throw new FluentValidation.ValidationException(validationResult.Errors);
        }

        if (!await _profileRepo.ExistsAsync(userId, ct))
        {
            throw new NotFoundException("Hồ sơ người dùng không tồn tại.", "USER_PROFILE_NOT_FOUND");
        }

        var requestedSkillIds = request.Skills.Select(s => s.SkillId).Distinct().ToList();
        var existingSkills = await _skillRepo.GetByIdsAsync(requestedSkillIds, ct);

        if (existingSkills.Count != requestedSkillIds.Count)
        {
            var foundIds = existingSkills.Select(s => s.Id).ToHashSet();
            var missingIds = requestedSkillIds.Where(id => !foundIds.Contains(id)).ToList();
            throw new NotFoundException($"Các kỹ năng sau không tồn tại trong danh mục: {string.Join(", ", missingIds)}", "SKILLS_NOT_FOUND");
        }

        var skillMap = existingSkills.ToDictionary(s => s.Id);
        var currentSkills = await _userSkillRepo.GetByUserIdAsync(userId, ct);

        _userSkillRepo.RemoveRange(currentSkills);

        var now = DateTime.UtcNow;
        var newSkills = request.Skills.Select(s => new UserSkill
        {
            UserId = userId,
            SkillId = s.SkillId,
            Level = s.Level,
            CreatedAt = now,
            Skill = skillMap[s.SkillId]
        }).ToList();

        await _userSkillRepo.AddRangeAsync(newSkills, ct);
        await _unitOfWork.SaveChangesAsync(ct);

        return newSkills.Select(ToResponse).OrderBy(s => s.SkillName).ToList();
    }

    // ── Mapping Helpers ────────────────────────────────────────────────────────
    private static SkillResponse ToResponse(Skill skill)
    {
        return new SkillResponse(
            skill.Id,
            skill.Name,
            skill.Category,
            skill.Description,
            skill.CreatedAt
        );
    }

    private static UserSkillResponse ToResponse(UserSkill userSkill)
    {
        return new UserSkillResponse(
            userSkill.SkillId,
            userSkill.Skill?.Name ?? string.Empty,
            userSkill.Skill?.Category ?? default,
            userSkill.Level,
            userSkill.CreatedAt
        );
    }
}
