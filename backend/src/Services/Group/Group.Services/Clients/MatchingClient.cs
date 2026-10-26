using System.Diagnostics;
using Exe.BuildingBlocks.Web;
using Exe.Contracts.Matching;
using Microsoft.Extensions.Logging;

namespace Group.Services.Clients;

/// <summary>
/// Bọc client sinh từ matching.proto: thêm deadline và log [GRPC] phía Group.
/// X-Correlation-Id được gắn vào metadata bởi <see cref="MatchingMetadataInterceptor"/>.
/// </summary>
public sealed class MatchingClient(MatchingService.MatchingServiceClient client, ILogger<MatchingClient> logger)
    : IMatchingClient
{
    private static readonly TimeSpan Timeout = TimeSpan.FromSeconds(5);

    public async Task<MatchResult> CalculateMatchAsync(StudentProfile student, GroupNeed group, CancellationToken ct = default)
    {
        var sw = Stopwatch.StartNew();
        var result = await client.CalculateMatchAsync(
            new MatchRequest { Student = student, Group = group }, deadline: Deadline(), cancellationToken: ct);

        logger.LogInformation(
            "[GRPC] CalculateMatch userId={UserId} groupId={GroupId} score={Score} duration={Duration}ms correlationId={CorrelationId}",
            result.UserId, result.GroupId, result.Score, sw.ElapsedMilliseconds, CorrelationContext.Current);
        return result;
    }

    public async Task<IReadOnlyList<MatchResult>> RankGroupsAsync(
        StudentProfile student, IEnumerable<GroupNeed> groups, int top, CancellationToken ct = default)
    {
        var request = new RankGroupsRequest { Student = student, Top = top };
        request.Groups.AddRange(groups);

        var sw = Stopwatch.StartNew();
        var response = await client.RankGroupsAsync(request, deadline: Deadline(), cancellationToken: ct);

        logger.LogInformation(
            "[GRPC] RankGroups userId={UserId} groups={Count} returned={Returned} duration={Duration}ms correlationId={CorrelationId}",
            student.UserId, request.Groups.Count, response.Results.Count, sw.ElapsedMilliseconds, CorrelationContext.Current);
        return response.Results;
    }

    public async Task<IReadOnlyList<MatchResult>> RankCandidatesAsync(
        GroupNeed group, IEnumerable<StudentProfile> candidates, int top, CancellationToken ct = default)
    {
        var request = new RankCandidatesRequest { Group = group, Top = top };
        request.Candidates.AddRange(candidates);

        var sw = Stopwatch.StartNew();
        var response = await client.RankCandidatesAsync(request, deadline: Deadline(), cancellationToken: ct);

        logger.LogInformation(
            "[GRPC] RankCandidates groupId={GroupId} candidates={Count} returned={Returned} duration={Duration}ms correlationId={CorrelationId}",
            group.GroupId, request.Candidates.Count, response.Results.Count, sw.ElapsedMilliseconds, CorrelationContext.Current);
        return response.Results;
    }

    private static DateTime Deadline() => DateTime.UtcNow.Add(Timeout);
}
