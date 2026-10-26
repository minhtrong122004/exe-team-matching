using System.Text.Json;
using Exe.BuildingBlocks.Auth;
using Exe.BuildingBlocks.EventBus;
using Exe.BuildingBlocks.Exceptions;
using Exe.BuildingBlocks.Paging;
using Exe.Contracts.Events;
using FluentValidation;
using User.Repository.Entities;
using User.Repository.Enums;
using User.Repository.Interfaces;
using User.Services.DTOs;
using User.Services.Interfaces;

namespace User.Services.Implementations;

/// <summary>
/// Triển khai nghiệp vụ quản lý hồ sơ người dùng (CLAUDE.md mục 5, 6, 10).
/// </summary>
public class UserProfileService : IUserProfileService
{
    private readonly IUserProfileRepository _profileRepo;
    private readonly IUserUnitOfWork _unitOfWork;
    private readonly ICurrentUser _currentUser;
    private readonly IValidator<UpdateUserProfileRequest> _updateValidator;
    private readonly IValidator<CreateUserProfileInternalRequest> _createValidator;
    private readonly IValidator<BatchUsersRequest> _batchValidator;
    private readonly IEventPublisher? _eventPublisher;

    public UserProfileService(
        IUserProfileRepository profileRepo,
        IUserUnitOfWork unitOfWork,
        ICurrentUser currentUser,
        IValidator<UpdateUserProfileRequest> updateValidator,
        IValidator<CreateUserProfileInternalRequest> createValidator,
        IValidator<BatchUsersRequest> batchValidator,
        IEventPublisher? eventPublisher = null)
    {
        _profileRepo = profileRepo;
        _unitOfWork = unitOfWork;
        _currentUser = currentUser;
        _updateValidator = updateValidator;
        _createValidator = createValidator;
        _batchValidator = batchValidator;
        _eventPublisher = eventPublisher;
    }

    public async Task<CandidateProfileResponse> GetProfileByIdAsync(Guid userId, CancellationToken ct = default)
    {
        var profile = await _profileRepo.GetByIdWithSkillsAsync(userId, ct);
        if (profile == null)
        {
            throw new NotFoundException("Hồ sơ người dùng không tồn tại.", "USER_PROFILE_NOT_FOUND");
        }

        return ToPublicResponse(profile);
    }

    public async Task<UserProfileResponse> GetCurrentUserProfileAsync(CancellationToken ct = default)
    {
        if (!_currentUser.IsAuthenticated || !_currentUser.UserId.HasValue)
        {
            throw new UnauthorizedException("Người dùng chưa được xác thực.");
        }

        var profile = await _profileRepo.GetByIdWithSkillsAsync(_currentUser.UserId.Value, ct);
        if (profile == null)
        {
            throw new NotFoundException("Hồ sơ người dùng không tồn tại.", "USER_PROFILE_NOT_FOUND");
        }

        return ToResponse(profile);
    }

    public async Task<UserProfileResponse> UpdateCurrentUserProfileAsync(UpdateUserProfileRequest request, CancellationToken ct = default)
    {
        if (!_currentUser.IsAuthenticated || !_currentUser.UserId.HasValue)
        {
            throw new UnauthorizedException("Người dùng chưa được xác thực.");
        }

        return await UpdateUserProfileAsync(_currentUser.UserId.Value, request, ct);
    }

    public async Task<UserProfileResponse> UpdateUserProfileAsync(Guid userId, UpdateUserProfileRequest request, CancellationToken ct = default)
    {
        var validationResult = await _updateValidator.ValidateAsync(request, ct);
        if (!validationResult.IsValid)
        {
            throw new FluentValidation.ValidationException(validationResult.Errors);
        }

        var profile = await _profileRepo.GetByIdWithSkillsAsync(userId, ct);
        if (profile == null)
        {
            throw new NotFoundException("Hồ sơ người dùng không tồn tại.", "USER_PROFILE_NOT_FOUND");
        }

        // Kiểm tra tính duy nhất của StudentCode nếu có cung cấp
        if (!string.IsNullOrWhiteSpace(request.StudentCode))
        {
            var trimmedCode = request.StudentCode.Trim();
            var existingWithCode = await _profileRepo.GetByStudentCodeAsync(trimmedCode, ct);
            if (existingWithCode != null && existingWithCode.UserId != userId)
            {
                throw new ConflictException($"Mã số sinh viên '{trimmedCode}' đã được sử dụng bởi một tài khoản khác.", "STUDENT_CODE_ALREADY_EXISTS");
            }
            profile.StudentCode = trimmedCode;
        }
        else
        {
            profile.StudentCode = null;
        }

        // Cập nhật các trường được phép chỉnh sửa
        profile.FullName = request.FullName.Trim();
        profile.Campus = request.Campus?.Trim();
        profile.Major = request.Major;
        profile.Bio = request.Bio?.Trim();
        profile.DesiredRole = request.DesiredRole?.Trim();
        profile.Availability = request.Availability;
        profile.Interests = SerializeInterests(request.Interests);
        profile.UpdatedAt = DateTime.UtcNow;

        _profileRepo.Update(profile);
        await _unitOfWork.SaveChangesAsync(ct);

        if (_eventPublisher != null)
        {
            try
            {
                await _eventPublisher.PublishAsync(
                    new UserProfileUpdated(profile.UserId, profile.FullName, profile.Major?.ToString()),
                    ct);
            }
            catch
            {
                // Non-blocking: thất bại khi publish event không làm gián đoạn cập nhật hồ sơ người dùng
            }
        }

        return ToResponse(profile);
    }

    public async Task<PagedResult<CandidateProfileResponse>> SearchProfilesAsync(UserSearchFilter filter, CancellationToken ct = default)
    {
        var page = filter.Page < 1 ? 1 : filter.Page;
        var pageSize = filter.PageSize < 1 ? 10 : (filter.PageSize > 100 ? 100 : filter.PageSize);

        var (items, totalCount) = await _profileRepo.SearchAsync(
            filter.Search,
            filter.Major,
            filter.Skill,
            filter.Availability,
            filter.SortBy,
            filter.SortDir,
            page,
            pageSize,
            ct);

        var responses = items.Select(ToPublicResponse).ToList();
        return PagedResult<CandidateProfileResponse>.Create(responses, page, pageSize, totalCount);
    }

    public async Task<IReadOnlyList<CandidateProfileResponse>> GetBatchProfilesAsync(IEnumerable<Guid> userIds, CancellationToken ct = default)
    {
        var idList = userIds?.Distinct().ToList() ?? new List<Guid>();
        if (idList.Count == 0)
        {
            return Array.Empty<CandidateProfileResponse>();
        }

        var batchRequest = new BatchUsersRequest(idList);
        var validationResult = await _batchValidator.ValidateAsync(batchRequest, ct);
        if (!validationResult.IsValid)
        {
            throw new FluentValidation.ValidationException(validationResult.Errors);
        }

        var profiles = await _profileRepo.GetByIdsWithSkillsAsync(idList, ct);
        return profiles.Select(ToPublicResponse).ToList();
    }

    public async Task<UserProfileResponse> CreateEmptyProfileAsync(CreateUserProfileInternalRequest request, CancellationToken ct = default)
    {
        var validationResult = await _createValidator.ValidateAsync(request, ct);
        if (!validationResult.IsValid)
        {
            throw new FluentValidation.ValidationException(validationResult.Errors);
        }

        if (await _profileRepo.ExistsAsync(request.UserId, ct))
        {
            throw new ConflictException("Hồ sơ người dùng đã tồn tại trong hệ thống.", "USER_PROFILE_ALREADY_EXISTS");
        }

        var now = DateTime.UtcNow;
        var profile = new UserProfile
        {
            UserId = request.UserId,
            Email = request.Email.Trim().ToLowerInvariant(),
            FullName = request.FullName.Trim(),
            Role = request.Role.Trim(),
            Availability = UserAvailability.LookingForTeam,
            CreatedAt = now,
            UpdatedAt = now
        };

        await _profileRepo.AddAsync(profile, ct);
        await _unitOfWork.SaveChangesAsync(ct);

        return ToResponse(profile);
    }

    // ── Mapping Helpers ────────────────────────────────────────────────────────
    private static CandidateProfileResponse ToPublicResponse(UserProfile profile)
    {
        var interests = DeserializeInterests(profile.Interests);

        var skills = profile.Skills?
            .Select(us => new UserSkillResponse(
                us.SkillId,
                us.Skill?.Name ?? string.Empty,
                us.Skill?.Category ?? default,
                us.Level,
                us.CreatedAt))
            .OrderBy(s => s.SkillName)
            .ToList() ?? new List<UserSkillResponse>();

        return new CandidateProfileResponse(
            profile.UserId,
            profile.FullName,
            profile.Role,
            profile.Campus,
            profile.Major,
            profile.Bio,
            profile.DesiredRole,
            profile.Availability,
            interests,
            skills,
            profile.CreatedAt,
            profile.UpdatedAt
        );
    }

    private static UserProfileResponse ToResponse(UserProfile profile)
    {
        var interests = DeserializeInterests(profile.Interests);

        var skills = profile.Skills?
            .Select(us => new UserSkillResponse(
                us.SkillId,
                us.Skill?.Name ?? string.Empty,
                us.Skill?.Category ?? default,
                us.Level,
                us.CreatedAt))
            .OrderBy(s => s.SkillName)
            .ToList() ?? new List<UserSkillResponse>();

        return new UserProfileResponse(
            profile.UserId,
            profile.Email,
            profile.FullName,
            profile.Role,
            profile.StudentCode,
            profile.Campus,
            profile.Major,
            profile.Bio,
            profile.DesiredRole,
            profile.Availability,
            interests,
            skills,
            profile.CreatedAt,
            profile.UpdatedAt
        );
    }

    private static string? SerializeInterests(List<string>? interests)
    {
        if (interests == null || interests.Count == 0)
        {
            return null;
        }

        var cleaned = interests
            .Where(s => !string.IsNullOrWhiteSpace(s))
            .Select(s => s.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        return cleaned.Count > 0 ? JsonSerializer.Serialize(cleaned) : null;
    }

    private static IReadOnlyList<string> DeserializeInterests(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw))
        {
            return Array.Empty<string>();
        }

        try
        {
            var list = JsonSerializer.Deserialize<List<string>>(raw);
            if (list != null)
            {
                return list;
            }
        }
        catch (JsonException)
        {
            // Fallback nếu dữ liệu lưu dạng comma-separated
            return raw.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        }

        return Array.Empty<string>();
    }
}
