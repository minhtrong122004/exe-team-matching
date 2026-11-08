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
/// Kèm thuật toán phân phối cưỡng chế sinh viên lẻ vào các Room cân bằng 5 kỹ năng + chuyên ngành (BR-31, BR-32).
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

    // ── Thuật toán phân phối cưỡng chế sinh viên lẻ (BR-31, BR-32) ───────────

    public DistributeResponseOutcome DistributeUnmatchedStudents(DistributeRequestInput request)
    {
        ArgumentNullException.ThrowIfNull(request);

        var unmatched = request.UnmatchedStudents.ToList();
        var maxMembers = request.MaxMembers > 0 ? request.MaxMembers : 5;
        var threshold = request.GroupThreshold > 0 ? request.GroupThreshold : (maxMembers / 2) + 1;

        var roomPlans = new List<DistributedRoomPlanOutcome>();
        var totalUnmatched = unmatched.Count;

        if (totalUnmatched == 0)
        {
            return new DistributeResponseOutcome(request.SpaceId, 0, 0, 0, []);
        }

        // Bước 1: Lấp các Room đang có người nhưng chưa đủ MaxMembers (BR-31)
        // Ưu tiên các room có ít người nhất (1-2 người) để nâng lên đủ ngưỡng trước
        var activeRooms = request.ExistingRooms
            .Where(r => r.CurrentMembers.Count > 0 && r.CurrentMembers.Count < maxMembers)
            .OrderBy(r => r.CurrentMembers.Count)
            .ToList();

        foreach (var room in activeRooms)
        {
            if (unmatched.Count == 0) break;

            var currentMembers = room.CurrentMembers.ToList();
            var addedStudents = new List<AssignedStudentOutcome>();

            // Nếu phòng < threshold: ưu tiên lấp tới threshold trước
            int targetCount = currentMembers.Count < threshold
                ? Math.Min(threshold, currentMembers.Count + unmatched.Count)
                : Math.Min(maxMembers, currentMembers.Count + unmatched.Count);

            while (currentMembers.Count < targetCount && unmatched.Count > 0)
            {
                var bestCandidate = PickBestCandidateForRoom(unmatched, currentMembers);
                unmatched.Remove(bestCandidate);

                var assigned = new AssignedStudentOutcome(
                    bestCandidate.UserId,
                    bestCandidate.StudentCode,
                    bestCandidate.FullName,
                    bestCandidate.Major,
                    IsLeader: false, // BR-31: Giữ nguyên Leader hiện tại
                    bestCandidate.ManagementScore);

                addedStudents.Add(assigned);
                currentMembers.Add(new DistributeRoomMemberInput(
                    bestCandidate.UserId,
                    bestCandidate.FullName,
                    bestCandidate.StudentCode,
                    bestCandidate.Major,
                    IsLeader: false,
                    bestCandidate.TechScore,
                    bestCandidate.ManagementScore,
                    bestCandidate.GraphicDesignScore,
                    bestCandidate.MarketingScore,
                    bestCandidate.SaleScore));
            }

            var currentLeader = room.CurrentMembers.FirstOrDefault(m => m.IsLeader)
                ?? room.CurrentMembers.FirstOrDefault();
            var leaderId = room.LeaderId ?? currentLeader?.UserId ?? string.Empty;
            var leaderName = currentLeader?.FullName ?? "Leader";

            var finalMembers = currentMembers.Select(m => new AssignedStudentOutcome(
                m.UserId, m.StudentCode, m.FullName, m.Major, m.UserId == leaderId, m.ManagementScore)).ToList();

            var balanceScore = CalculateBalanceScore(currentMembers);

            roomPlans.Add(new DistributedRoomPlanOutcome(
                room.RoomId,
                room.RoomCode,
                room.Name,
                leaderId,
                leaderName,
                IsNewlyFormed: false,
                MemberCountBefore: room.CurrentMembers.Count,
                MemberCountAfter: currentMembers.Count,
                addedStudents,
                finalMembers,
                balanceScore));
        }

        // Nếu vẫn còn sinh viên lẻ và các room trên còn chỗ chưa đạt maxMembers, tiếp tục lấp lên maxMembers
        if (unmatched.Count > 0)
        {
            var plansWithCapacity = roomPlans
                .Where(p => p.MemberCountAfter < maxMembers)
                .OrderBy(p => p.MemberCountAfter)
                .ToList();

            foreach (var plan in plansWithCapacity)
            {
                if (unmatched.Count == 0) break;

                var existingMembers = plan.FinalMembers.Select(m => new DistributeRoomMemberInput(
                    m.UserId, m.FullName, m.StudentCode, m.Major, m.IsLeader,
                    50, m.ManagementScore, 50, 50, 50)).ToList();

                var added = plan.AddedStudents.ToList();

                while (existingMembers.Count < maxMembers && unmatched.Count > 0)
                {
                    var candidate = PickBestCandidateForRoom(unmatched, existingMembers);
                    unmatched.Remove(candidate);

                    var assigned = new AssignedStudentOutcome(
                        candidate.UserId, candidate.StudentCode, candidate.FullName, candidate.Major, false, candidate.ManagementScore);
                    added.Add(assigned);
                    existingMembers.Add(new DistributeRoomMemberInput(
                        candidate.UserId, candidate.FullName, candidate.StudentCode, candidate.Major, false,
                        candidate.TechScore, candidate.ManagementScore, candidate.GraphicDesignScore, candidate.MarketingScore, candidate.SaleScore));
                }

                var updatedFinal = existingMembers.Select(m => new AssignedStudentOutcome(
                    m.UserId, m.StudentCode, m.FullName, m.Major, m.UserId == plan.LeaderId, m.ManagementScore)).ToList();

                var idx = roomPlans.FindIndex(p => p.RoomId == plan.RoomId);
                if (idx >= 0)
                {
                    roomPlans[idx] = new DistributedRoomPlanOutcome(
                        plan.RoomId,
                        plan.RoomCode,
                        plan.Name,
                        plan.LeaderId,
                        plan.LeaderName,
                        plan.IsNewlyFormed,
                        plan.MemberCountBefore,
                        existingMembers.Count,
                        added,
                        updatedFinal,
                        CalculateBalanceScore(existingMembers));
                }
            }
        }

        // Bước 2: Với các sinh viên lẻ còn lại, phân bổ vào các empty rooms (BR-32)
        var emptyRooms = request.EmptyRooms.ToList();
        while (unmatched.Count > 0 && emptyRooms.Count > 0)
        {
            var room = emptyRooms[0];
            emptyRooms.RemoveAt(0);

            int groupSize;
            if (unmatched.Count <= maxMembers)
            {
                groupSize = unmatched.Count;
            }
            else
            {
                int remainder = unmatched.Count - maxMembers;
                if (remainder < threshold && remainder > 0)
                {
                    groupSize = Math.Max(threshold, unmatched.Count / 2);
                }
                else
                {
                    groupSize = maxMembers;
                }
            }

            var newMembers = new List<DistributeCandidateInput>();
            for (int i = 0; i < groupSize && unmatched.Count > 0; i++)
            {
                if (newMembers.Count == 0)
                {
                    // Chọn ứng viên đầu tiên: ưu tiên điểm ManagementScore cao
                    var bestInitial = unmatched
                        .OrderByDescending(c => c.ManagementScore)
                        .ThenByDescending(c => c.TotalScore)
                        .First();
                    newMembers.Add(bestInitial);
                    unmatched.Remove(bestInitial);
                }
                else
                {
                    var converted = newMembers.Select(m => new DistributeRoomMemberInput(
                        m.UserId, m.FullName, m.StudentCode, m.Major, false,
                        m.TechScore, m.ManagementScore, m.GraphicDesignScore, m.MarketingScore, m.SaleScore)).ToList();
                    var candidate = PickBestCandidateForRoom(unmatched, converted);
                    newMembers.Add(candidate);
                    unmatched.Remove(candidate);
                }
            }

            // BR-32: Tự động chọn sinh viên có ManagementScore cao nhất làm Leader
            var leader = newMembers
                .OrderByDescending(m => m.ManagementScore)
                .ThenByDescending(m => m.TotalScore)
                .ThenBy(m => m.StudentCode, StringComparer.Ordinal)
                .First();

            var added = newMembers.Select(m => new AssignedStudentOutcome(
                m.UserId,
                m.StudentCode,
                m.FullName,
                m.Major,
                IsLeader: m.UserId == leader.UserId,
                m.ManagementScore)).ToList();

            var convertedFinal = newMembers.Select(m => new DistributeRoomMemberInput(
                m.UserId, m.FullName, m.StudentCode, m.Major, m.UserId == leader.UserId,
                m.TechScore, m.ManagementScore, m.GraphicDesignScore, m.MarketingScore, m.SaleScore)).ToList();

            var balanceScore = CalculateBalanceScore(convertedFinal);

            roomPlans.Add(new DistributedRoomPlanOutcome(
                room.RoomId,
                room.RoomCode,
                room.Name,
                leader.UserId,
                leader.FullName,
                IsNewlyFormed: true,
                MemberCountBefore: 0,
                MemberCountAfter: newMembers.Count,
                AddedStudents: added,
                FinalMembers: added,
                BalanceScore: balanceScore));
        }

        var totalDistributed = totalUnmatched - unmatched.Count;
        return new DistributeResponseOutcome(
            request.SpaceId,
            totalUnmatched,
            totalDistributed,
            unmatched.Count,
            roomPlans);
    }

    private static DistributeCandidateInput PickBestCandidateForRoom(
        List<DistributeCandidateInput> candidates,
        List<DistributeRoomMemberInput> currentMembers)
    {
        var existingMajors = currentMembers
            .Select(m => m.Major?.Trim() ?? string.Empty)
            .Where(m => m.Length > 0)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        double avgTech = currentMembers.Count > 0 ? currentMembers.Average(m => m.TechScore) : 50;
        double avgMgmt = currentMembers.Count > 0 ? currentMembers.Average(m => m.ManagementScore) : 50;
        double avgDesign = currentMembers.Count > 0 ? currentMembers.Average(m => m.GraphicDesignScore) : 50;
        double avgMkt = currentMembers.Count > 0 ? currentMembers.Average(m => m.MarketingScore) : 50;
        double avgSale = currentMembers.Count > 0 ? currentMembers.Average(m => m.SaleScore) : 50;

        var skillAverages = new (string Skill, double Avg)[]
        {
            ("Tech", avgTech),
            ("Management", avgMgmt),
            ("Design", avgDesign),
            ("Marketing", avgMkt),
            ("Sale", avgSale)
        };

        var weakestSkill = skillAverages.OrderBy(s => s.Avg).First().Skill;

        var scored = candidates.Select(c =>
        {
            double majorScore = existingMajors.Contains(c.Major?.Trim() ?? string.Empty) ? 0 : 50;
            int skillVal = weakestSkill switch
            {
                "Tech" => c.TechScore,
                "Management" => c.ManagementScore,
                "Design" => c.GraphicDesignScore,
                "Marketing" => c.MarketingScore,
                "Sale" => c.SaleScore,
                _ => c.TotalScore / 5
            };
            double complementarityScore = (skillVal / 100.0) * 30.0;
            double overallScore = (c.TotalScore / 500.0) * 20.0;
            double fitness = majorScore + complementarityScore + overallScore;
            return (Candidate: c, Fitness: fitness);
        });

        return scored
            .OrderByDescending(x => x.Fitness)
            .ThenByDescending(x => x.Candidate.ManagementScore)
            .ThenBy(x => x.Candidate.StudentCode, StringComparer.Ordinal)
            .First().Candidate;
    }

    private static double CalculateBalanceScore(List<DistributeRoomMemberInput> members)
    {
        if (members.Count == 0) return 0;

        var distinctMajors = members
            .Select(m => m.Major?.Trim())
            .Where(m => !string.IsNullOrEmpty(m))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .Count();
        double majorDiversity = Math.Min(1.0, (double)distinctMajors / Math.Min(members.Count, 4)) * 40.0;

        double avgTech = members.Average(m => m.TechScore);
        double avgMgmt = members.Average(m => m.ManagementScore);
        double avgDesign = members.Average(m => m.GraphicDesignScore);
        double avgMkt = members.Average(m => m.MarketingScore);
        double avgSale = members.Average(m => m.SaleScore);

        double skillAvgSum = (avgTech + avgMgmt + avgDesign + avgMkt + avgSale) / 5.0;
        double skillScore = (skillAvgSum / 100.0) * 60.0;

        return Math.Round(Math.Clamp(majorDiversity + skillScore, 10.0, 100.0), 1);
    }
}
