namespace Group.Services.Clients;

/// <summary>
/// Gọi User Service qua REST (CLAUDE.md mục 3, 11). Header Authorization của người gọi được chuyển tiếp tự động.
/// </summary>
public interface IUserClient
{
    /// <summary>GET /api/users/{id}; null nếu không tồn tại.</summary>
    Task<UserProfileDto?> GetProfileAsync(Guid userId, CancellationToken ct = default);

    /// <summary>POST /api/users/batch (tự chia lô 100 id).</summary>
    Task<IReadOnlyList<UserProfileDto>> GetProfilesAsync(IEnumerable<Guid> userIds, CancellationToken ct = default);

    /// <summary>GET /api/users?availability=LookingForTeam, đọc nhiều trang tới khi đủ <paramref name="max"/>.</summary>
    Task<IReadOnlyList<UserProfileDto>> GetLookingForTeamAsync(int max, CancellationToken ct = default);
}

/// <summary>Phần hồ sơ công khai Group cần (khớp CandidateProfileResponse của User Service, không có email).</summary>
public sealed record UserProfileDto(
    Guid UserId,
    string FullName,
    string Role,
    string? Major,
    string? DesiredRole,
    string Availability,
    List<string> Interests,
    List<UserSkillDto> Skills);

public sealed record UserSkillDto(string SkillName, int Level);
