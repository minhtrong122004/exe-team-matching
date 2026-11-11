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

        // 1. Chuẩn hóa Skill Score theo mô hình Bù trừ Khuyết thiếu (Skill Deficit Compensation)
        double skillScore;
        bool hasNumericSkills = student.TechScore > 0 || student.ManagementScore > 0 ||
                               student.GraphicDesignScore > 0 || student.MarketingScore > 0 || student.SaleScore > 0;
        bool hasGroupAverages = group.AvgTechScore > 0 || group.AvgManagementScore > 0 ||
                                group.AvgGraphicDesignScore > 0 || group.AvgMarketingScore > 0 || group.AvgSaleScore > 0;

        if (hasNumericSkills && hasGroupAverages)
        {
            // Vector khuyết thiếu của nhóm so với chuẩn khởi nghiệp T = 70
            const double Target = 70.0;
            double dTech = Math.Max(0.0, Target - group.AvgTechScore);
            double dMgmt = Math.Max(0.0, Target - group.AvgManagementScore);
            double dDesign = Math.Max(0.0, Target - group.AvgGraphicDesignScore);
            double dMkt = Math.Max(0.0, Target - group.AvgMarketingScore);
            double dSale = Math.Max(0.0, Target - group.AvgSaleScore);

            double totalDeficit = dTech + dMgmt + dDesign + dMkt + dSale;
            double deficitScore;
            if (totalDeficit > 0)
            {
                deficitScore = (dTech * student.TechScore +
                                dMgmt * student.ManagementScore +
                                dDesign * student.GraphicDesignScore +
                                dMkt * student.MarketingScore +
                                dSale * student.SaleScore) / (totalDeficit * 100.0);
            }
            else
            {
                // Nhóm đã mạnh toàn diện, tính theo điểm trung bình của sinh viên
                deficitScore = (student.TechScore + student.ManagementScore + student.GraphicDesignScore +
                                student.MarketingScore + student.SaleScore) / 500.0;
            }

            if (requiredSkills.Count > 0)
            {
                double stringSkillScore = (double)matched.Count / requiredSkills.Count;
                skillScore = 0.7 * deficitScore + 0.3 * stringSkillScore;
            }
            else
            {
                skillScore = deficitScore;
            }

            // Ghi nhận các kỹ năng thế mạnh bù trừ vào danh sách matched
            if (dTech > 15 && student.TechScore >= 70 && !matched.Contains("Tech")) matched.Add($"Tech ({student.TechScore}%)");
            if (dMgmt > 15 && student.ManagementScore >= 70 && !matched.Contains("Management")) matched.Add($"Management ({student.ManagementScore}%)");
            if (dDesign > 15 && student.GraphicDesignScore >= 70 && !matched.Contains("Design")) matched.Add($"Design ({student.GraphicDesignScore}%)");
            if (dMkt > 15 && student.MarketingScore >= 70 && !matched.Contains("Marketing")) matched.Add($"Marketing ({student.MarketingScore}%)");
            if (dSale > 15 && student.SaleScore >= 70 && !matched.Contains("Sale")) matched.Add($"Sale ({student.SaleScore}%)");
        }
        else if (hasNumericSkills && requiredSkills.Count == 0)
        {
            // Có 5 kỹ năng nhưng nhóm chưa có thành viên hoặc chưa set yêu cầu: lấy trung bình
            skillScore = (student.TechScore + student.ManagementScore + student.GraphicDesignScore +
                          student.MarketingScore + student.SaleScore) / 500.0;
            if (student.TechScore >= 70) matched.Add($"Tech ({student.TechScore}%)");
            if (student.ManagementScore >= 70) matched.Add($"Management ({student.ManagementScore}%)");
            if (student.GraphicDesignScore >= 70) matched.Add($"Design ({student.GraphicDesignScore}%)");
            if (student.MarketingScore >= 70) matched.Add($"Marketing ({student.MarketingScore}%)");
            if (student.SaleScore >= 70) matched.Add($"Sale ({student.SaleScore}%)");
        }
        else
        {
            // Fallback theo chuỗi kỹ năng
            skillScore = requiredSkills.Count == 0 ? 1.0 : (double)matched.Count / requiredSkills.Count;
        }

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
            Math.Round(Math.Clamp(score, 0.0, 100.0), 1, MidpointRounding.AwayFromZero),
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
        // Áp dụng quy tắc cân đối sĩ số (Balancing Partition) đảm bảo mọi nhóm mới đều >= threshold (BR-16)
        var emptyRooms = request.EmptyRooms.ToList();
        var plannedGroupSizes = CalculateBalancedGroupSizes(unmatched.Count, threshold, maxMembers, emptyRooms.Count);

        foreach (var groupSize in plannedGroupSizes)
        {
            if (emptyRooms.Count == 0 || unmatched.Count < groupSize) break;

            var room = emptyRooms[0];
            emptyRooms.RemoveAt(0);

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

        const double Target = 75.0;
        double dTech = Math.Max(0.0, Target - avgTech);
        double dMgmt = Math.Max(0.0, Target - avgMgmt);
        double dDesign = Math.Max(0.0, Target - avgDesign);
        double dMkt = Math.Max(0.0, Target - avgMkt);
        double dSale = Math.Max(0.0, Target - avgSale);
        double totalDeficit = dTech + dMgmt + dDesign + dMkt + dSale;

        var scored = candidates.Select(c =>
        {
            // 1. Điểm bù đắp chuyên ngành BR-14 (ưu tiên đa dạng ngành học)
            double majorBonus = existingMajors.Contains(c.Major?.Trim() ?? string.Empty) ? 0.0 : 40.0;

            // 2. Điểm bù đắp đa kỹ năng (Multi-Skill Deficit Score)
            double deficitScore = totalDeficit > 0
                ? (dTech * c.TechScore + dMgmt * c.ManagementScore + dDesign * c.GraphicDesignScore +
                   dMkt * c.MarketingScore + dSale * c.SaleScore) / (totalDeficit * 100.0) * 45.0
                : (c.TotalScore / 500.0) * 45.0;

            // 3. Điểm tổng thể
            double overallScore = (c.TotalScore / 500.0) * 15.0;
            double fitness = majorBonus + deficitScore + overallScore;
            return (Candidate: c, Fitness: fitness);
        });

        return scored
            .OrderByDescending(x => x.Fitness)
            .ThenByDescending(x => x.Candidate.ManagementScore)
            .ThenBy(x => x.Candidate.StudentCode, StringComparer.Ordinal)
            .First().Candidate;
    }

    public static double CalculateBalanceScore(IEnumerable<DistributeRoomMemberInput> memberSeq)
    {
        var members = memberSeq.ToList();
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
        double rawSkillScore = (skillAvgSum / 100.0) * 60.0;

        // Tính độ lệch chuẩn sigma giữa 5 kỹ năng để phạt đội hình mất cân đối cực đoan
        double[] skills = [avgTech, avgMgmt, avgDesign, avgMkt, avgSale];
        double mean = skillAvgSum;
        double variance = skills.Sum(s => Math.Pow(s - mean, 2)) / 5.0;
        double stdDev = Math.Sqrt(variance);
        double penalty = Math.Min(15.0, stdDev * 0.25);

        double penalizedSkillScore = Math.Max(5.0, rawSkillScore - penalty);

        return Math.Round(Math.Clamp(majorDiversity + penalizedSkillScore, 10.0, 100.0), 1);
    }

    /// <summary>
    /// Thuật toán phân rã cân đối sĩ số (Balancing Partition) cho số sinh viên lẻ còn lại (BR-31, BR-32).
    /// Đảm bảo mọi nhóm mới đều có sĩ số >= threshold (BR-16, mặc định >= 3 người) và <= maxMembers (mặc định 5).
    /// Nếu số sinh viên không đủ ngưỡng (nhỏ hơn threshold): Trả về danh sách rỗng để không tạo nhóm vi phạm.
    /// </summary>
    public static List<int> CalculateBalancedGroupSizes(int totalStudents, int threshold, int maxMembers, int maxRooms)
    {
        if (totalStudents < threshold || maxRooms <= 0 || threshold <= 0 || maxMembers < threshold)
        {
            return [];
        }

        int maxPossibleGroups = Math.Min(totalStudents / threshold, maxRooms);
        if (maxPossibleGroups <= 0)
        {
            return [];
        }

        int bestG = -1;
        int bestDistributedCount = -1;

        // Ưu tiên chọn g nhóm sao cho phân phối được nhiều sinh viên nhất và cân bằng nhất
        for (int g = maxPossibleGroups; g >= 1; g--)
        {
            int minCap = g * threshold;
            int maxCap = g * maxMembers;

            if (totalStudents >= minCap)
            {
                int distributedForG = Math.Min(totalStudents, maxCap);
                if (distributedForG > bestDistributedCount)
                {
                    bestDistributedCount = distributedForG;
                    bestG = g;
                    if (bestDistributedCount == totalStudents)
                    {
                        break;
                    }
                }
            }
        }

        if (bestG <= 0 || bestDistributedCount < threshold)
        {
            return [];
        }

        int baseSize = bestDistributedCount / bestG;
        int remainder = bestDistributedCount % bestG;

        var result = new List<int>(bestG);
        for (int i = 0; i < bestG; i++)
        {
            result.Add(i < remainder ? baseSize + 1 : baseSize);
        }

        return result;
    }
}
