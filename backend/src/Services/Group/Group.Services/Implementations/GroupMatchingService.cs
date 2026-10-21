using Exe.BuildingBlocks.Auth;
using Exe.BuildingBlocks.Web;
using Exe.Contracts.Matching;
using Group.Repository.Entities;
using Group.Repository.Interfaces;
using Group.Services.Clients;
using Group.Services.DTOs;
using Group.Services.Interfaces;
using ICurrentUser = Exe.BuildingBlocks.Web.ICurrentUser;

namespace Group.Services.Implementations;

/// <summary>
/// Gom dữ liệu đầu vào cho Matching: hồ sơ sinh viên (User, REST), lĩnh vực dự án (Project, REST),
/// nhu cầu nhóm (vị trí tuyển còn trống) — rồi gọi Matching qua gRPC (CLAUDE.md mục 8).
/// BR-12: chỉ trả gợi ý, không bao giờ tự thêm sinh viên vào nhóm.
/// </summary>
public class GroupMatchingService(
    IGroupRepository groups,
    IUserClient userClient,
    IProjectClient projectClient,
    IMatchingClient matchingClient,
    ICurrentUser currentUser) : IGroupMatchingService
{
    private const int MaxTop = 50;
    private const int MaxGroupsToRank = 200;
    private const int MaxCandidatesToRank = 300;

    public async Task<MatchScoreResponse> GetMatchScoreAsync(Guid groupId, CancellationToken ct = default)
    {
        var group = await groups.GetByIdAsync(groupId, ct) ?? throw new NotFoundException("Group", groupId);
        var profile = await GetCurrentProfileAsync(ct);

        // Lấy lĩnh vực mới nhất từ Project; Project lỗi/không còn thì dùng bản sao lưu lúc tạo nhóm.
        var project = await projectClient.GetProjectAsync(group.ProjectId, ct);
        var need = ToNeed(group, project?.Domain ?? group.ProjectDomain);

        var result = await matchingClient.CalculateMatchAsync(ToStudent(profile), need, ct);
        return new MatchScoreResponse(profile.UserId, group.Id, result.Score, result.MatchedSkills, result.MissingSkills);
    }

    public async Task<IReadOnlyList<GroupSuggestionResponse>> GetSuggestionsAsync(int top, CancellationToken ct = default)
    {
        var profile = await GetCurrentProfileAsync(ct);

        var candidates = (await groups.GetRecruitingAsync(MaxGroupsToRank, ct))
            .Where(g => g.Members.All(m => m.UserId != profile.UserId))
            .ToDictionary(g => g.Id.ToString());
        if (candidates.Count == 0) return [];

        var results = await matchingClient.RankGroupsAsync(
            ToStudent(profile), candidates.Values.Select(g => ToNeed(g, g.ProjectDomain)), ClampTop(top), ct);

        return results
            .Where(r => candidates.ContainsKey(r.GroupId))
            .Select(r => new GroupSuggestionResponse(
                candidates[r.GroupId].ToSummary(), r.Score, r.MatchedSkills, r.MissingSkills))
            .ToList();
    }

    public async Task<IReadOnlyList<CandidateResponse>> GetCandidatesAsync(Guid groupId, int top, CancellationToken ct = default)
    {
        var group = await groups.GetByIdAsync(groupId, ct) ?? throw new NotFoundException("Group", groupId);
        group.EnsureLeader(currentUser.UserId, "view candidates");
        group.EnsureNotDisbanded();

        var profiles = (await userClient.GetLookingForTeamAsync(MaxCandidatesToRank, ct))
            .Where(p => string.Equals(p.Role, Roles.Student, StringComparison.OrdinalIgnoreCase))
            .ToList();

        // Hồ sơ User có thể chưa kịp cập nhật InTeam (event bất đồng bộ) → loại theo dữ liệu của chính Group.
        var inGroups = await groups.GetUsersInActiveGroupsAsync(profiles.Select(p => p.UserId), ct);
        var byId = profiles.Where(p => !inGroups.Contains(p.UserId)).ToDictionary(p => p.UserId.ToString());
        if (byId.Count == 0) return [];

        var results = await matchingClient.RankCandidatesAsync(
            ToNeed(group, group.ProjectDomain), byId.Values.Select(ToStudent), ClampTop(top), ct);

        return results
            .Where(r => byId.ContainsKey(r.UserId))
            .Select(r =>
            {
                var p = byId[r.UserId];
                return new CandidateResponse(
                    p.UserId, p.FullName, p.Major, p.DesiredRole, p.Skills.Select(s => s.SkillName).ToList(),
                    r.Score, r.MatchedSkills, r.MissingSkills);
            })
            .ToList();
    }

    private async Task<UserProfileDto> GetCurrentProfileAsync(CancellationToken ct) =>
        await userClient.GetProfileAsync(currentUser.UserId, ct)
        ?? throw new NotFoundException("User profile", currentUser.UserId);

    private static int ClampTop(int top) => top <= 0 ? 10 : Math.Min(top, MaxTop);

    private static StudentProfile ToStudent(UserProfileDto p)
    {
        var student = new StudentProfile
        {
            UserId       = p.UserId.ToString(),
            Major        = p.Major ?? string.Empty,
            Availability = p.Availability ?? string.Empty
        };
        student.Skills.AddRange(p.Skills.Select(s => s.SkillName));
        student.Interests.AddRange(p.Interests);
        return student;
    }

    /// <summary>Nhu cầu nhóm = chuyên ngành và kỹ năng của các vị trí còn trống.</summary>
    private static GroupNeed ToNeed(GroupEntity g, string projectDomain)
    {
        var openSlots = g.Slots.Where(s => s.IsOpen).ToList();
        var need = new GroupNeed { GroupId = g.Id.ToString(), ProjectDomain = projectDomain };
        need.RequiredMajors.AddRange(openSlots.Where(s => s.RequiredMajor != null).Select(s => s.RequiredMajor!).Distinct());
        need.RequiredSkills.AddRange(openSlots.SelectMany(s => s.RequiredSkills).Distinct(StringComparer.OrdinalIgnoreCase));
        return need;
    }
}
