using System.Diagnostics;
using Exe.Contracts.Matching;
using Grpc.Core;
using Matching.Services.Interfaces;
using Matching.Services.Models;

namespace Matching.Grpc.Services;

/// <summary>
/// gRPC endpoint của Matching Service (CLAUDE.md mục 8). Chỉ map proto ↔ model rồi gọi
/// <see cref="IMatchingCalculator"/>; không chứa công thức.
/// </summary>
public sealed class MatchingGrpcService(IMatchingCalculator calculator, ILogger<MatchingGrpcService> logger)
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

    private static StudentInput ToInput(StudentProfile p) =>
        new(p.UserId, p.Major, p.Skills, p.Interests);

    private static GroupInput ToInput(GroupNeed g) =>
        new(g.GroupId, g.RequiredMajors, g.RequiredSkills, g.ProjectDomain);

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
