using User.Repository.Enums;
using User.Services.DTOs;

namespace User.Services.Interfaces;

/// <summary>
/// Giao diện nghiệp vụ quản lý danh mục kỹ năng và kỹ năng của người dùng (CLAUDE.md mục 6, 10).
/// </summary>
public interface ISkillService
{
    Task<IReadOnlyList<SkillResponse>> GetAllSkillsAsync(CancellationToken ct = default);
    Task<IReadOnlyList<SkillResponse>> GetSkillsByCategoryAsync(SkillCategory category, CancellationToken ct = default);
    Task<SkillResponse> GetSkillByIdAsync(Guid id, CancellationToken ct = default);
    Task<SkillResponse> CreateSkillAsync(CreateSkillRequest request, CancellationToken ct = default);

    Task<IReadOnlyList<UserSkillResponse>> GetUserSkillsAsync(Guid userId, CancellationToken ct = default);
    Task<UserSkillResponse> AddSkillToUserAsync(Guid userId, AddUserSkillRequest request, CancellationToken ct = default);
    Task<UserSkillResponse> UpdateUserSkillProficiencyAsync(Guid userId, Guid skillId, UpdateUserSkillProficiencyRequest request, CancellationToken ct = default);
    Task RemoveSkillFromUserAsync(Guid userId, Guid skillId, CancellationToken ct = default);
    Task<IReadOnlyList<UserSkillResponse>> SetUserSkillsAsync(Guid userId, BatchSetUserSkillsRequest request, CancellationToken ct = default);
}
