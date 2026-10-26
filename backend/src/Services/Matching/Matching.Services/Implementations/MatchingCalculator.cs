using Matching.Services.Interfaces;
using Matching.Services.Models;
using Matching.Services.Options;

namespace Matching.Services.Implementations;

/// <summary>
/// score = wSkill * skillScore + wMajor * majorScore + wDomain * domainScore (CLAUDE.md mục 8).
/// <list type="bullet">
/// <item>skillScore = |kỹ năng SV ∩ kỹ năng yêu cầu| / |kỹ năng yêu cầu| (= 1 nếu không yêu cầu)</item>
/// <item>majorScore = 1 nếu chuyên ngành SV ∈ chuyên ngành yêu cầu (= 1 nếu không yêu cầu)</item>
/// <item>domainScore = 1 nếu lĩnh vực dự án ∈ lĩnh vực SV quan tâm</item>
/// </list>
/// So sánh chuỗi không phân biệt hoa thường, bỏ khoảng trắng hai đầu.
/// </summary>
public sealed class MatchingCalculator(MatchingWeights weights) : IMatchingCalculator
{
    private static readonly StringComparer Comparer = StringComparer.OrdinalIgnoreCase;

    public MatchOutcome Calculate(StudentInput student, GroupInput group)
    {
        ArgumentNullException.ThrowIfNull(student);
        ArgumentNullException.ThrowIfNull(group);

        var studentSkills = Normalize(student.Skills).ToHashSet(Comparer);
        var requiredSkills = Normalize(group.RequiredSkills).Distinct(Comparer).ToList();

        var matched = requiredSkills.Where(studentSkills.Contains).ToList();
        var missing = requiredSkills.Where(s => !studentSkills.Contains(s)).ToList();

        var skillScore = requiredSkills.Count == 0 ? 1.0 : (double)matched.Count / requiredSkills.Count;

        var requiredMajors = Normalize(group.RequiredMajors).ToHashSet(Comparer);
        var majorScore = requiredMajors.Count == 0 || requiredMajors.Contains(student.Major?.Trim() ?? string.Empty)
            ? 1.0
            : 0.0;

        var domain = group.ProjectDomain?.Trim() ?? string.Empty;
        var domainScore = domain.Length > 0 && Normalize(student.Interests).Contains(domain, Comparer) ? 1.0 : 0.0;

        var score = weights.Skill * skillScore + weights.Major * majorScore + weights.Domain * domainScore;

        return new MatchOutcome(
            student.UserId,
            group.GroupId,
            Math.Round(score, 1, MidpointRounding.AwayFromZero),
            matched,
            missing);
    }

    public IReadOnlyList<MatchOutcome> RankGroups(StudentInput student, IEnumerable<GroupInput> groups, int top) =>
        Rank(groups.Select(g => Calculate(student, g)), r => r.GroupId, top);

    public IReadOnlyList<MatchOutcome> RankCandidates(GroupInput group, IEnumerable<StudentInput> candidates, int top) =>
        Rank(candidates.Select(c => Calculate(c, group)), r => r.UserId, top);

    // Điểm giảm dần; cùng điểm thì sắp theo id để kết quả ổn định giữa các lần gọi.
    private static IReadOnlyList<MatchOutcome> Rank(
        IEnumerable<MatchOutcome> results, Func<MatchOutcome, string> tieBreaker, int top)
    {
        var ordered = results
            .OrderByDescending(r => r.Score)
            .ThenBy(tieBreaker, StringComparer.Ordinal);

        return (top > 0 ? ordered.Take(top) : ordered).ToList();
    }

    private static IEnumerable<string> Normalize(IEnumerable<string>? values) =>
        (values ?? []).Where(v => !string.IsNullOrWhiteSpace(v)).Select(v => v.Trim());
}
