using System.Diagnostics;
using Exe.Contracts.Matching;
using Grpc.Core;
using Matching.Services.Interfaces;
using Matching.Services.Models;

namespace Matching.Grpc.Services;

/// <summary>
/// gRPC endpoint của Matching Service (CLAUDE.md mục 8). Chỉ map proto ↔ model rồi gọi
/// <see cref="IMatchingCalculator"/> và <see cref="IAiMentorService"/>; không chứa công thức.
/// </summary>
public sealed class MatchingGrpcService(
    IMatchingCalculator calculator,
    IAiMentorService aiMentorService,
    ILogger<MatchingGrpcService> logger)
    : MatchingService.MatchingServiceBase
{
    public override Task<MatchResult> CalculateMatch(MatchRequest request, ServerCallContext context)
    {
        var student = ToInput(request.Student ?? throw InvalidArgument("student is required."));
        var group = ToInput(request.Group ?? throw InvalidArgument("group is required."));

        var sw = Stopwatch.StartNew();
        var outcome = calculator.Calculate(student, group);

        logger.LogInformation(
            "[GRPC] CalculateMatch userId={UserId} groupId={GroupId} score={Score} duration={Duration}ms correlationId={CorrelationId}",
            outcome.UserId, outcome.GroupId, outcome.Score, sw.ElapsedMilliseconds, CorrelationId(context));

        return Task.FromResult(ToResult(outcome));
    }

    public override Task<RankGroupsResponse> RankGroups(RankGroupsRequest request, ServerCallContext context)
    {
        var student = ToInput(request.Student ?? throw InvalidArgument("student is required."));

        var sw = Stopwatch.StartNew();
        var outcomes = calculator.RankGroups(student, request.Groups.Select(ToInput), request.Top);

        logger.LogInformation(
            "[GRPC] RankGroups userId={UserId} groups={Count} top={Top} returned={Returned} duration={Duration}ms correlationId={CorrelationId}",
            student.UserId, request.Groups.Count, request.Top, outcomes.Count, sw.ElapsedMilliseconds, CorrelationId(context));

        var response = new RankGroupsResponse();
        response.Results.AddRange(outcomes.Select(ToResult));
        return Task.FromResult(response);
    }

    public override Task<RankCandidatesResponse> RankCandidates(RankCandidatesRequest request, ServerCallContext context)
    {
        var group = ToInput(request.Group ?? throw InvalidArgument("group is required."));

        var sw = Stopwatch.StartNew();
        var outcomes = calculator.RankCandidates(group, request.Candidates.Select(ToInput), request.Top);

        logger.LogInformation(
            "[GRPC] RankCandidates groupId={GroupId} candidates={Count} top={Top} returned={Returned} duration={Duration}ms correlationId={CorrelationId}",
            group.GroupId, request.Candidates.Count, request.Top, outcomes.Count, sw.ElapsedMilliseconds, CorrelationId(context));

        var response = new RankCandidatesResponse();
        response.Results.AddRange(outcomes.Select(ToResult));
        return Task.FromResult(response);
    }

    public override Task<DistributeResponse> DistributeUnmatchedStudents(DistributeRequest request, ServerCallContext context)
    {
        ArgumentNullException.ThrowIfNull(request);

        var sw = Stopwatch.StartNew();

        var candidates = request.UnmatchedStudents.Select(c => new DistributeCandidateInput(
            c.UserId,
            c.FullName,
            c.StudentCode,
            c.Major,
            c.TechScore,
            c.ManagementScore,
            c.GraphicDesignScore,
            c.MarketingScore,
            c.SaleScore)).ToList();

        var existingRooms = request.ExistingRooms.Select(ToRoomInput).ToList();
        var emptyRooms = request.EmptyRooms.Select(ToRoomInput).ToList();

        var input = new DistributeRequestInput(
            request.SpaceId,
            request.MaxMembers,
            request.GroupThreshold,
            candidates,
            existingRooms,
            emptyRooms);

        var outcome = calculator.DistributeUnmatchedStudents(input);

        logger.LogInformation(
            "[GRPC] DistributeUnmatchedStudents spaceId={SpaceId} unmatched={Unmatched} distributed={Distributed} remaining={Remaining} duration={Duration}ms correlationId={CorrelationId}",
            outcome.SpaceId, outcome.TotalUnmatched, outcome.TotalDistributed, outcome.TotalRemaining, sw.ElapsedMilliseconds, CorrelationId(context));

        var response = new DistributeResponse
        {
            SpaceId = outcome.SpaceId,
            TotalUnmatched = outcome.TotalUnmatched,
            TotalDistributed = outcome.TotalDistributed,
            TotalRemaining = outcome.TotalRemaining
        };

        foreach (var plan in outcome.RoomPlans)
        {
            var planProto = new DistributedRoomPlan
            {
                RoomId = plan.RoomId,
                RoomCode = plan.RoomCode,
                Name = plan.Name,
                LeaderId = plan.LeaderId,
                LeaderName = plan.LeaderName,
                IsNewlyFormed = plan.IsNewlyFormed,
                MemberCountBefore = plan.MemberCountBefore,
                MemberCountAfter = plan.MemberCountAfter,
                BalanceScore = plan.BalanceScore
            };

            planProto.AddedStudents.AddRange(plan.AddedStudents.Select(ToAssignedProto));
            planProto.FinalMembers.AddRange(plan.FinalMembers.Select(ToAssignedProto));

            response.RoomPlans.Add(planProto);
        }

        return Task.FromResult(response);
    }

    public override async Task<AnalyzeGroupResponse> AnalyzeGroupWithAI(AnalyzeGroupRequest request, ServerCallContext context)
    {
        ArgumentNullException.ThrowIfNull(request);

        var sw = Stopwatch.StartNew();

        var members = request.Members.Select(m => new AnalyzeGroupMemberInput(
            m.UserId,
            m.FullName,
            m.StudentCode,
            m.Major,
            m.IsLeader,
            m.TechScore,
            m.ManagementScore,
            m.GraphicDesignScore,
            m.MarketingScore,
            m.SaleScore)).ToList();

        var input = new AnalyzeGroupInput(
            request.GroupId,
            request.GroupCode,
            request.GroupName,
            request.ProjectDomain,
            request.ProjectTopic,
            members);

        var outcome = await aiMentorService.AnalyzeGroupAsync(input, context.CancellationToken);

        logger.LogInformation(
            "[GRPC] AnalyzeGroupWithAI groupId={GroupId} isAi={IsAi} model={Model} duration={Duration}ms correlationId={CorrelationId}",
            outcome.GroupId, outcome.IsAiGenerated, outcome.ModelName, sw.ElapsedMilliseconds, CorrelationId(context));

        var response = new AnalyzeGroupResponse
        {
            GroupId = outcome.GroupId,
            OverallAssessment = outcome.OverallAssessment,
            SynergyScore = outcome.SynergyScore,
            IsAiGenerated = outcome.IsAiGenerated,
            ModelName = outcome.ModelName
        };

        response.Strengths.AddRange(outcome.Strengths);
        response.BlindSpots.AddRange(outcome.BlindSpots);
        response.FirstMonthRoadmap.AddRange(outcome.FirstMonthRoadmap);
        response.RecommendedTopics.AddRange(outcome.RecommendedTopics.Select(t => new AiRecommendedTopic
        {
            Title = t.Title,
            Description = t.Description,
            TargetMarket = t.TargetMarket,
            BusinessModel = t.BusinessModel
        }));

        return response;
    }

    private static DistributeRoomInput ToRoomInput(DistributeRoom r) =>
        new(
            r.RoomId,
            r.RoomCode,
            r.Name,
            r.LeaderId,
            r.CurrentMembers.Select(m => new DistributeRoomMemberInput(
                m.UserId,
                m.FullName,
                m.StudentCode,
                m.Major,
                m.IsLeader,
                m.TechScore,
                m.ManagementScore,
                m.GraphicDesignScore,
                m.MarketingScore,
                m.SaleScore)).ToList(),
            r.IsEmpty);

    private static AssignedStudent ToAssignedProto(AssignedStudentOutcome a) =>
        new()
        {
            UserId = a.UserId,
            StudentCode = a.StudentCode,
            FullName = a.FullName,
            Major = a.Major,
            IsLeader = a.IsLeader,
            ManagementScore = a.ManagementScore
        };

    private static StudentInput ToInput(StudentProfile p) =>
        new(p.UserId, p.Major, p.Skills, p.Interests,
            p.TechScore, p.ManagementScore, p.GraphicDesignScore, p.MarketingScore, p.SaleScore);

    private static GroupInput ToInput(GroupNeed g) =>
        new(g.GroupId, g.RequiredMajors, g.RequiredSkills, g.ProjectDomain,
            g.AvgTechScore, g.AvgManagementScore, g.AvgGraphicDesignScore, g.AvgMarketingScore, g.AvgSaleScore);

    private static MatchResult ToResult(MatchOutcome o)
    {
        var result = new MatchResult { UserId = o.UserId, GroupId = o.GroupId, Score = o.Score };
        result.MatchedSkills.AddRange(o.MatchedSkills);
        result.MissingSkills.AddRange(o.MissingSkills);
        return result;
    }

    /// <summary>X-Correlation-Id do Group gửi kèm trong metadata (key gRPC luôn viết thường).</summary>
    private static string? CorrelationId(ServerCallContext context) =>
        context.RequestHeaders.GetValue("x-correlation-id");

    private static RpcException InvalidArgument(string detail) =>
        new(new Status(StatusCode.InvalidArgument, detail));
}
