namespace Group.Services.DTOs;

/// <summary>GET /api/groups/{id}/match-score — điểm phù hợp của người dùng hiện tại với nhóm.</summary>
public record MatchScoreResponse(
    Guid UserId,
    Guid GroupId,
    double Score,
    IReadOnlyList<string> MatchedSkills,
    IReadOnlyList<string> MissingSkills);

/// <summary>GET /api/groups/suggestions — nhóm gợi ý cho sinh viên, điểm giảm dần (BR-12: chỉ gợi ý).</summary>
public record GroupSuggestionResponse(
    GroupSummaryResponse Group,
    double Score,
    IReadOnlyList<string> MatchedSkills,
    IReadOnlyList<string> MissingSkills);

/// <summary>GET /api/groups/{id}/candidates — ứng viên gợi ý cho nhóm, điểm giảm dần.</summary>
public record CandidateResponse(
    Guid UserId,
    string FullName,
    string? Major,
    string? DesiredRole,
    IReadOnlyList<string> Skills,
    double Score,
    IReadOnlyList<string> MatchedSkills,
    IReadOnlyList<string> MissingSkills);
