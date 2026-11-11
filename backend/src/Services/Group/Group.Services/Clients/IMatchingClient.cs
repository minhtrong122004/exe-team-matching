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

    /// <summary>
    /// Phân phối cưỡng chế sinh viên lẻ vào các Room/Group cân bằng 5 kỹ năng + chuyên ngành (BR-31, BR-32).
    /// </summary>
    Task<DistributeResponse> DistributeUnmatchedStudentsAsync(DistributeRequest request, CancellationToken ct = default);

    /// <summary>
    /// Phân tích nhóm đa chiều với AI Mentor (Google Gemini / Heuristic Fallback).
    /// </summary>
    Task<AnalyzeGroupResponse> AnalyzeGroupWithAIAsync(AnalyzeGroupRequest request, CancellationToken ct = default);
}
