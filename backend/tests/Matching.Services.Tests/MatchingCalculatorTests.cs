using Matching.Services.Implementations;
using Matching.Services.Models;
using Matching.Services.Options;

namespace Matching.Services.Tests;

public class MatchingCalculatorTests
{
    private readonly MatchingCalculator _calculator = new(new MatchingWeights());

    private static StudentInput Student(
        string major = "SE", string[]? skills = null, string[]? interests = null, string id = "u1") =>
        new(id, major, skills ?? [], interests ?? []);

    private static GroupInput Group(
        string[]? majors = null, string[]? skills = null, string domain = "EdTech", string id = "g1") =>
        new(id, majors ?? [], skills ?? [], domain);

    [Fact]
    public void Calculate_FullMatch_Returns100()
    {
        var result = _calculator.Calculate(
            Student(skills: ["React", ".NET"], interests: ["EdTech"]),
            Group(majors: ["SE"], skills: ["React", ".NET"]));

        Assert.Equal(100, result.Score);
        Assert.Equal(["React", ".NET"], result.MatchedSkills);
        Assert.Empty(result.MissingSkills);
        Assert.Equal("u1", result.UserId);
        Assert.Equal("g1", result.GroupId);
    }

    [Fact]
    public void Calculate_NothingMatches_Returns0()
    {
        var result = _calculator.Calculate(
            Student(major: "GD", skills: ["Figma"], interests: ["FinTech"]),
            Group(majors: ["SE"], skills: ["React"]));

        Assert.Equal(0, result.Score);
        Assert.Empty(result.MatchedSkills);
        Assert.Equal(["React"], result.MissingSkills);
    }

    [Fact]
    public void Calculate_PartialSkills_ScoresProportionally()
    {
        // skill 1/2 → 25, major 30, domain 20
        var result = _calculator.Calculate(
            Student(skills: ["React"], interests: ["EdTech"]),
            Group(majors: ["SE"], skills: ["React", "Java"]));

        Assert.Equal(75, result.Score);
        Assert.Equal(["React"], result.MatchedSkills);
        Assert.Equal(["Java"], result.MissingSkills);
    }

    [Fact]
    public void Calculate_NoRequiredSkills_SkillScoreIsFull()
    {
        var result = _calculator.Calculate(Student(), Group(majors: ["SE"], skills: []));

        // skill 50 + major 30, domain không nằm trong interests
        Assert.Equal(80, result.Score);
        Assert.Empty(result.MatchedSkills);
        Assert.Empty(result.MissingSkills);
    }

    [Fact]
    public void Calculate_NoRequiredMajors_MajorScoreIsFull()
    {
        var result = _calculator.Calculate(
            Student(major: "MKT"), Group(majors: [], skills: ["SEO"]));

        Assert.Equal(30, result.Score);
    }

    [Fact]
    public void Calculate_MajorNotRequired_MajorScoreIsZero()
    {
        var result = _calculator.Calculate(
            Student(major: "IB", skills: ["Sales"], interests: ["EdTech"]),
            Group(majors: ["SE", "AI"], skills: ["Sales"]));

        Assert.Equal(70, result.Score);
    }

    [Fact]
    public void Calculate_IsCaseInsensitiveAndTrims()
    {
        var result = _calculator.Calculate(
            Student(major: "se", skills: [" react ", "FIGMA"], interests: ["edtech"]),
            Group(majors: ["SE"], skills: ["React", "Figma"], domain: "EdTech"));

        Assert.Equal(100, result.Score);
        Assert.Equal(["React", "Figma"], result.MatchedSkills);
    }

    [Fact]
    public void Calculate_DuplicateRequiredSkills_AreCountedOnce()
    {
        var result = _calculator.Calculate(
            Student(skills: ["React"]),
            Group(majors: ["SE"], skills: ["React", "react", "Java"]));

        // skill 1/2 → 25, major 30
        Assert.Equal(55, result.Score);
        Assert.Equal(["React"], result.MatchedSkills);
        Assert.Equal(["Java"], result.MissingSkills);
    }

    [Fact]
    public void Calculate_EmptyProjectDomain_DomainScoreIsZero()
    {
        var result = _calculator.Calculate(
            Student(interests: ["EdTech"]), Group(majors: ["SE"], domain: ""));

        Assert.Equal(80, result.Score);
    }

    [Fact]
    public void Calculate_RoundsToOneDecimal()
    {
        // skill 1/3 → 16.666… + major 30 + domain 20 = 66.666… → 66.7
        var result = _calculator.Calculate(
            Student(skills: ["React"], interests: ["EdTech"]),
            Group(majors: ["SE"], skills: ["React", "Java", "Python"]));

        Assert.Equal(66.7, result.Score);
    }

    [Fact]
    public void Calculate_UsesConfiguredWeights()
    {
        var calculator = new MatchingCalculator(new MatchingWeights { Skill = 100, Major = 0, Domain = 0 });

        var result = calculator.Calculate(
            Student(major: "GD", skills: ["React"]),
            Group(majors: ["SE"], skills: ["React", "Java"]));

        Assert.Equal(50, result.Score);
    }

    [Fact]
    public void RankGroups_OrdersByScoreDescendingAndAppliesTop()
    {
        var student = Student(skills: ["React"], interests: ["EdTech"]);
        var groups = new[]
        {
            Group(id: "low", majors: ["GD"], skills: ["Figma"], domain: "FinTech"),   // 0
            Group(id: "high", majors: ["SE"], skills: ["React"]),                     // 100
            Group(id: "mid", majors: ["SE"], skills: ["React", "Java"]),              // 75
        };

        var results = _calculator.RankGroups(student, groups, top: 2);

        Assert.Equal(["high", "mid"], results.Select(r => r.GroupId));
    }

    [Fact]
    public void RankGroups_TopZero_ReturnsAll()
    {
        var results = _calculator.RankGroups(Student(), [Group(id: "a"), Group(id: "b"), Group(id: "c")], top: 0);

        Assert.Equal(3, results.Count);
    }

    [Fact]
    public void RankCandidates_OrdersByScoreThenByUserId()
    {
        var group = Group(majors: ["SE"], skills: ["React"]);
        var candidates = new[]
        {
            Student(id: "u3", major: "GD"),                                          // 0
            Student(id: "u2", skills: ["React"]),                                    // 80
            Student(id: "u1", skills: ["React"]),                                    // 80
            Student(id: "u4", skills: ["React"], interests: ["EdTech"]),             // 100
        };

        var results = _calculator.RankCandidates(group, candidates, top: 10);

        Assert.Equal(["u4", "u1", "u2", "u3"], results.Select(r => r.UserId));
    }

    [Fact]
    public void RankCandidates_NoCandidates_ReturnsEmpty()
    {
        Assert.Empty(_calculator.RankCandidates(Group(), [], top: 5));
    }

    [Theory]
    [InlineData(50, 30, 20, true)]
    [InlineData(60, 20, 20, true)]
    [InlineData(50, 30, 30, false)]
    [InlineData(-10, 90, 20, false)]
    public void MatchingWeights_IsValid_RequiresNonNegativeSumOf100(double skill, double major, double domain, bool expected)
    {
        var weights = new MatchingWeights { Skill = skill, Major = major, Domain = domain };

        Assert.Equal(expected, weights.IsValid());
    }

    [Fact]
    public void Distribute_WhenNoUnmatched_ReturnsZeroDistributed()
    {
        var request = new DistributeRequestInput("sp1", 5, 3, [], [], []);
        var result = _calculator.DistributeUnmatchedStudents(request);

        Assert.Equal(0, result.TotalUnmatched);
        Assert.Equal(0, result.TotalDistributed);
        Assert.Empty(result.RoomPlans);
    }

    [Fact]
    public void Distribute_Step1_ExistingRooms_FilledAndLeaderRetained()
    {
        // Room 1 có 1 thành viên SE (Leader)
        var room1 = new DistributeRoomInput(
            "r1", "FA26EXE101-01", "Phòng 01", "leader1",
            [new DistributeRoomMemberInput("leader1", "Trần Leader", "SE180001", "SE", true, 80, 85, 60, 50, 40)],
            false);

        // 3 sinh viên lẻ đa ngành: AI, GD, MKT
        var candidates = new List<DistributeCandidateInput>
        {
            new("c1", "Nguyễn AI", "AI180001", "AI", 90, 60, 40, 50, 70),
            new("c2", "Lê GD", "GD180001", "GD", 40, 50, 95, 60, 40),
            new("c3", "Phạm MKT", "MKT180001", "MKT", 50, 70, 50, 90, 60),
        };

        var request = new DistributeRequestInput("sp1", 5, 3, candidates, [room1], []);
        var result = _calculator.DistributeUnmatchedStudents(request);

        Assert.Equal(3, result.TotalUnmatched);
        Assert.Equal(3, result.TotalDistributed);
        Assert.Equal(0, result.TotalRemaining);
        Assert.Single(result.RoomPlans);

        var plan = result.RoomPlans[0];
        Assert.Equal("r1", plan.RoomId);
        Assert.Equal("leader1", plan.LeaderId); // BR-31: giữ nguyên leader
        Assert.False(plan.IsNewlyFormed);
        Assert.Equal(1, plan.MemberCountBefore);
        Assert.Equal(4, plan.MemberCountAfter);
        Assert.Equal(3, plan.AddedStudents.Count);
        Assert.True(plan.BalanceScore > 0);
    }

    [Fact]
    public void Distribute_Step2_EmptyRooms_HighestManagementBecomesLeader()
    {
        var emptyRoom = new DistributeRoomInput("r_empty", "FA26EXE101-02", "Phòng 02", null, [], true);

        // 4 sinh viên lẻ, trong đó c3 có ManagementScore cao nhất (95)
        var candidates = new List<DistributeCandidateInput>
        {
            new("c1", "Sinh viên 1", "SE180001", "SE", 80, 60, 70, 60, 50),
            new("c2", "Sinh viên 2", "AI180001", "AI", 85, 75, 60, 60, 50),
            new("c3", "Sinh viên Leader", "IB180001", "IB", 60, 95, 70, 80, 75), // Max Management
            new("c4", "Sinh viên 4", "GD180001", "GD", 50, 50, 90, 60, 60)
        };

        var request = new DistributeRequestInput("sp1", 5, 3, candidates, [], [emptyRoom]);
        var result = _calculator.DistributeUnmatchedStudents(request);

        Assert.Equal(4, result.TotalDistributed);
        Assert.Single(result.RoomPlans);

        var plan = result.RoomPlans[0];
        Assert.Equal("r_empty", plan.RoomId);
        Assert.True(plan.IsNewlyFormed);
        Assert.Equal(0, plan.MemberCountBefore);
        Assert.Equal(4, plan.MemberCountAfter);
        Assert.Equal("c3", plan.LeaderId); // BR-32: chọn người có ManagementScore cao nhất
        Assert.Equal("Sinh viên Leader", plan.LeaderName);

        var leaderAssigned = plan.AddedStudents.First(s => s.UserId == "c3");
        Assert.True(leaderAssigned.IsLeader);
    }

    [Theory]
    [InlineData(1, 3, 5, 2, new int[] { })]
    [InlineData(2, 3, 5, 2, new int[] { })]
    [InlineData(3, 3, 5, 2, new int[] { 3 })]
    [InlineData(4, 3, 5, 2, new int[] { 4 })]
    [InlineData(5, 3, 5, 2, new int[] { 5 })]
    [InlineData(6, 3, 5, 2, new int[] { 3, 3 })]
    [InlineData(7, 3, 5, 2, new int[] { 4, 3 })]
    [InlineData(8, 3, 5, 2, new int[] { 4, 4 })]
    [InlineData(11, 3, 5, 3, new int[] { 4, 4, 3 })]
    public void CalculateBalancedGroupSizes_ReturnsBalancedThresholdCompliantSizes(
        int totalStudents, int threshold, int maxMembers, int maxRooms, int[] expected)
    {
        var actual = MatchingCalculator.CalculateBalancedGroupSizes(totalStudents, threshold, maxMembers, maxRooms);
        Assert.Equal(expected, actual);
        foreach (var size in actual)
        {
            Assert.InRange(size, threshold, maxMembers);
        }
    }

    [Fact]
    public void Distribute_Step2_WhenFewerThanThreshold_DoesNotCreateInvalidSubgroups()
    {
        var emptyRoom = new DistributeRoomInput("r_empty", "FA26EXE101-02", "Phòng 02", null, [], true);

        // Chỉ có 2 sinh viên lẻ (dưới ngưỡng 3 người của BR-16)
        var candidates = new List<DistributeCandidateInput>
        {
            new("c1", "Sinh viên 1", "SE180001", "SE", 80, 60, 70, 60, 50),
            new("c2", "Sinh viên 2", "AI180001", "AI", 85, 75, 60, 60, 50)
        };

        var request = new DistributeRequestInput("sp1", 5, 3, candidates, [], [emptyRoom]);
        var result = _calculator.DistributeUnmatchedStudents(request);

        // Phải từ chối tạo nhóm 2 người, giữ lại ở TotalRemaining
        Assert.Equal(2, result.TotalUnmatched);
        Assert.Equal(0, result.TotalDistributed);
        Assert.Equal(2, result.TotalRemaining);
        Assert.Empty(result.RoomPlans);
    }

    [Fact]
    public void Distribute_Step2_SixStudents_SplitIntoTwoThreeMemberGroups()
    {
        var roomA = new DistributeRoomInput("ra", "FA26EXE101-02", "Phòng 02", null, [], true);
        var roomB = new DistributeRoomInput("rb", "FA26EXE101-03", "Phòng 03", null, [], true);

        var candidates = new List<DistributeCandidateInput>
        {
            new("c1", "Sinh viên 1", "SE180001", "SE", 80, 95, 70, 60, 50),
            new("c2", "Sinh viên 2", "AI180001", "AI", 85, 90, 60, 60, 50),
            new("c3", "Sinh viên 3", "GD180001", "GD", 60, 70, 95, 60, 50),
            new("c4", "Sinh viên 4", "MKT180001", "MKT", 50, 60, 50, 95, 60),
            new("c5", "Sinh viên 5", "IB180001", "IB", 50, 60, 50, 50, 95),
            new("c6", "Sinh viên 6", "SE180002", "SE", 90, 50, 50, 50, 50)
        };

        var request = new DistributeRequestInput("sp1", 5, 3, candidates, [], [roomA, roomB]);
        var result = _calculator.DistributeUnmatchedStudents(request);

        Assert.Equal(6, result.TotalDistributed);
        Assert.Equal(0, result.TotalRemaining);
        Assert.Equal(2, result.RoomPlans.Count);
        Assert.All(result.RoomPlans, p => Assert.Equal(3, p.MemberCountAfter));
        Assert.All(result.RoomPlans, p => Assert.True(p.IsNewlyFormed));
    }

    [Fact]
    public void Calculate_With5SkillsDeficit_CandidateCompensatingWeaknessScoresHigherThanRedundantCandidate()
    {
        // Nhóm đã rất mạnh Tech (90) nhưng yếu Marketing (20) và Sale (20)
        var group = new GroupInput(
            "g1",
            ["SE", "MKT"],
            [],
            "EdTech",
            AvgTechScore: 90,
            AvgManagementScore: 70,
            AvgGraphicDesignScore: 65,
            AvgMarketingScore: 20,
            AvgSaleScore: 20);

        // Ứng viên 1: Trùng lặp Tech (95), Marketing = 10, Sale = 10
        var redundantStudent = new StudentInput(
            "s1", "SE", [], ["EdTech"],
            TechScore: 95, ManagementScore: 50, GraphicDesignScore: 50, MarketingScore: 10, SaleScore: 10);

        // Ứng viên 2: Bù đắp Marketing (90), Sale (85), Tech = 40
        var complementaryStudent = new StudentInput(
            "s2", "MKT", [], ["EdTech"],
            TechScore: 40, ManagementScore: 60, GraphicDesignScore: 60, MarketingScore: 90, SaleScore: 85);

        var scoreRedundant = _calculator.Calculate(redundantStudent, group);
        var scoreComp = _calculator.Calculate(complementaryStudent, group);

        // Ứng viên bù đắp khoảng trống phải có điểm cao hơn đáng kể ứng viên thừa kỹ năng
        Assert.True(scoreComp.Score > scoreRedundant.Score,
            $"Expected complementary student score ({scoreComp.Score}) > redundant student score ({scoreRedundant.Score})");
        Assert.Contains(scoreComp.MatchedSkills, s => s.StartsWith("Marketing", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public void Distribute_Step2_LeaderChosenWithHighestManagementScore_PerBR32()
    {
        var room = new DistributeRoomInput("r1", "FA26EXE101-01", "Phòng 01", null, [], true);

        var candidates = new List<DistributeCandidateInput>
        {
            new("c1", "Nguyễn Văn Tech", "SE180001", "SE", 95, 45, 50, 50, 50),
            new("c2", "Trần Quản Lý", "IB180001", "IB", 50, 95, 60, 60, 60), // Highest Management: 95
            new("c3", "Lê Thiết Kế", "GD180001", "GD", 60, 60, 95, 50, 50)
        };

        var request = new DistributeRequestInput("sp1", 5, 3, candidates, [], [room]);
        var result = _calculator.DistributeUnmatchedStudents(request);

        Assert.Single(result.RoomPlans);
        var plan = result.RoomPlans[0];
        Assert.Equal("c2", plan.LeaderId);
        Assert.Equal("Trần Quản Lý", plan.LeaderName);
    }

    [Fact]
    public void CalculateBalanceScore_PenalizesExtremeSkillImbalance()
    {
        // Nhóm A: Các kỹ năng rất cân đối (Tech: 70, Mgt: 70, GD: 70, Mkt: 70, Sale: 70)
        var balancedMembers = new List<DistributeRoomMemberInput>
        {
            new("m1", "M1", "SE1", "SE", true, 70, 70, 70, 70, 70),
            new("m2", "M2", "IB1", "IB", false, 70, 70, 70, 70, 70),
            new("m3", "M3", "MKT1", "MKT", false, 70, 70, 70, 70, 70)
        };

        // Nhóm B: Kỹ năng bị lệch cực đoan (Tech: 100, còn lại: 10)
        var skewedMembers = new List<DistributeRoomMemberInput>
        {
            new("s1", "S1", "SE1", "SE", true, 100, 10, 10, 10, 10),
            new("s2", "S2", "SE2", "SE", false, 100, 10, 10, 10, 10),
            new("s3", "S3", "SE3", "SE", false, 100, 10, 10, 10, 10)
        };

        var scoreBalanced = MatchingCalculator.CalculateBalanceScore(balancedMembers);
        var scoreSkewed = MatchingCalculator.CalculateBalanceScore(skewedMembers);

        // Nhóm cân đối phải có BalanceScore cao hơn nhóm lệch cực đoan
        Assert.True(scoreBalanced > scoreSkewed,
            $"Expected balanced score ({scoreBalanced}) > skewed score ({scoreSkewed})");
    }
}
