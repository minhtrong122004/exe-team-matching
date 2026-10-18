using Exe.BuildingBlocks.Paging;
using User.Services.DTOs;

namespace User.Services.Interfaces;

/// <summary>
/// Giao diện nghiệp vụ quản lý hồ sơ người dùng (CLAUDE.md mục 6, 10).
/// </summary>
public interface IUserProfileService
{
    Task<CandidateProfileResponse> GetProfileByIdAsync(Guid userId, CancellationToken ct = default);
    Task<UserProfileResponse> GetCurrentUserProfileAsync(CancellationToken ct = default);
    Task<UserProfileResponse> UpdateCurrentUserProfileAsync(UpdateUserProfileRequest request, CancellationToken ct = default);
    Task<UserProfileResponse> UpdateUserProfileAsync(Guid userId, UpdateUserProfileRequest request, CancellationToken ct = default);
    Task<PagedResult<CandidateProfileResponse>> SearchProfilesAsync(UserSearchFilter filter, CancellationToken ct = default);
    Task<IReadOnlyList<CandidateProfileResponse>> GetBatchProfilesAsync(IEnumerable<Guid> userIds, CancellationToken ct = default);
    Task<UserProfileResponse> CreateEmptyProfileAsync(CreateUserProfileInternalRequest request, CancellationToken ct = default);
}
