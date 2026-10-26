using Exe.Contracts.Matching;

namespace Group.Services.Clients;

/// <summary>
/// Gọi Matching Service qua gRPC (CLAUDE.md mục 8). Group gom đủ dữ liệu rồi gửi kèm trong request,
/// Matching không gọi ra ngoài.
/// </summary>
public interface IMatchingClient
{
    Task<MatchResult> CalculateMatchAsync(StudentProfile student, GroupNeed group, CancellationToken ct = default);

    Task<IReadOnlyList<MatchResult>> RankGroupsAsync(
        StudentProfile student, IEnumerable<GroupNeed> groups, int top, CancellationToken ct = default);

    Task<IReadOnlyList<MatchResult>> RankCandidatesAsync(
        GroupNeed group, IEnumerable<StudentProfile> candidates, int top, CancellationToken ct = default);
}
