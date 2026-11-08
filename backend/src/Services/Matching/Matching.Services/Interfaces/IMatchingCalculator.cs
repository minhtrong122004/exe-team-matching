using Matching.Services.Models;

namespace Matching.Services.Interfaces;

/// <summary>
/// Tính điểm phù hợp sinh viên ↔ nhóm, xếp hạng và thuật toán phân phối cưỡng chế sinh viên lẻ (BR-31, BR-32). Stateless, không I/O.
/// </summary>
public interface IMatchingCalculator
{
    MatchOutcome Calculate(StudentInput student, GroupInput group);

    /// <summary>Xếp hạng các nhóm cho một sinh viên, điểm giảm dần. <paramref name="top"/> ≤ 0 nghĩa là lấy tất cả.</summary>
    IReadOnlyList<MatchOutcome> RankGroups(StudentInput student, IEnumerable<GroupInput> groups, int top);

    /// <summary>Xếp hạng các ứng viên cho một nhóm, điểm giảm dần. <paramref name="top"/> ≤ 0 nghĩa là lấy tất cả.</summary>
    IReadOnlyList<MatchOutcome> RankCandidates(GroupInput group, IEnumerable<StudentInput> candidates, int top);

    /// <summary>
    /// Phân phối cưỡng chế sinh viên lẻ vào các Room/Group cân bằng 5 kỹ năng + chuyên ngành (BR-31, BR-32).
    /// </summary>
    DistributeResponseOutcome DistributeUnmatchedStudents(DistributeRequestInput request);
}
