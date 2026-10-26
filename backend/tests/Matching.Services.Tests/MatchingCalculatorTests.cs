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
}
