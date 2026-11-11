namespace Matching.Services.Models;

/// <summary>
/// Hồ sơ sinh viên đầu vào cho công thức Matching (độc lập với kiểu sinh từ proto).
/// </summary>
public sealed record StudentInput(
    string UserId,
    string Major,
    IReadOnlyCollection<string> Skills,
    IReadOnlyCollection<string> Interests,
    int TechScore = 0,
    int ManagementScore = 0,
    int GraphicDesignScore = 0,
    int MarketingScore = 0,
    int SaleScore = 0);

/// <summary>
/// Nhu cầu của nhóm đầu vào cho công thức Matching.
/// </summary>
public sealed record GroupInput(
    string GroupId,
    IReadOnlyCollection<string> RequiredMajors,
    IReadOnlyCollection<string> RequiredSkills,
    string ProjectDomain,
    int AvgTechScore = 0,
    int AvgManagementScore = 0,
    int AvgGraphicDesignScore = 0,
    int AvgMarketingScore = 0,
    int AvgSaleScore = 0);

/// <summary>
/// Kết quả so khớp một sinh viên với một nhóm. Score trong khoảng 0–100, làm tròn 1 chữ số.
/// </summary>
public sealed record MatchOutcome(
    string UserId,
    string GroupId,
    double Score,
    IReadOnlyList<string> MatchedSkills,
    IReadOnlyList<string> MissingSkills);

// ── Models cho thuật toán Phân phối cưỡng chế Sinh viên lẻ (BR-31, BR-32) ──

public sealed record DistributeCandidateInput(
    string UserId,
    string FullName,
    string StudentCode,
    string Major,
    int TechScore,
    int ManagementScore,
    int GraphicDesignScore,
    int MarketingScore,
    int SaleScore)
{
    public int TotalScore => TechScore + ManagementScore + GraphicDesignScore + MarketingScore + SaleScore;
}

public sealed record DistributeRoomMemberInput(
    string UserId,
    string FullName,
    string StudentCode,
    string Major,
    bool IsLeader,
    int TechScore,
    int ManagementScore,
    int GraphicDesignScore,
    int MarketingScore,
    int SaleScore)
{
    public int TotalScore => TechScore + ManagementScore + GraphicDesignScore + MarketingScore + SaleScore;
}

public sealed record DistributeRoomInput(
    string RoomId,
    string RoomCode,
    string Name,
    string? LeaderId,
    IReadOnlyList<DistributeRoomMemberInput> CurrentMembers,
    bool IsEmpty);

public sealed record DistributeRequestInput(
    string SpaceId,
    int MaxMembers,
    int GroupThreshold,
    IReadOnlyList<DistributeCandidateInput> UnmatchedStudents,
    IReadOnlyList<DistributeRoomInput> ExistingRooms,
    IReadOnlyList<DistributeRoomInput> EmptyRooms);

public sealed record AssignedStudentOutcome(
    string UserId,
    string StudentCode,
    string FullName,
    string Major,
    bool IsLeader,
    int ManagementScore);

public sealed record DistributedRoomPlanOutcome(
    string RoomId,
    string RoomCode,
    string Name,
    string LeaderId,
    string LeaderName,
    bool IsNewlyFormed,
    int MemberCountBefore,
    int MemberCountAfter,
    IReadOnlyList<AssignedStudentOutcome> AddedStudents,
    IReadOnlyList<AssignedStudentOutcome> FinalMembers,
    double BalanceScore);

public sealed record DistributeResponseOutcome(
    string SpaceId,
    int TotalUnmatched,
    int TotalDistributed,
    int TotalRemaining,
    IReadOnlyList<DistributedRoomPlanOutcome> RoomPlans);

// ── Models cho AI Mentor (Google Gemini) ─────────────────────────────────

public sealed record AnalyzeGroupMemberInput(
    string UserId,
    string FullName,
    string StudentCode,
    string Major,
    bool IsLeader,
    int TechScore,
    int ManagementScore,
    int GraphicDesignScore,
    int MarketingScore,
    int SaleScore);

public sealed record AnalyzeGroupInput(
    string GroupId,
    string GroupCode,
    string GroupName,
    string ProjectDomain,
    string ProjectTopic,
    IReadOnlyList<AnalyzeGroupMemberInput> Members);

public sealed record AiRecommendedTopicOutcome(
    string Title,
    string Description,
    string TargetMarket,
    string BusinessModel);

public sealed record AnalyzeGroupOutcome(
    string GroupId,
    string OverallAssessment,
    IReadOnlyList<string> Strengths,
    IReadOnlyList<string> BlindSpots,
    IReadOnlyList<AiRecommendedTopicOutcome> RecommendedTopics,
    IReadOnlyList<string> FirstMonthRoadmap,
    double SynergyScore,
    bool IsAiGenerated,
    string ModelName);
