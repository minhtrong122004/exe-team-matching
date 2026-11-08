namespace Matching.Services.Models;

/// <summary>
/// Hồ sơ sinh viên đầu vào cho công thức Matching (độc lập với kiểu sinh từ proto).
/// </summary>
public sealed record StudentInput(
    string UserId,
    string Major,
    IReadOnlyCollection<string> Skills,
    IReadOnlyCollection<string> Interests);

/// <summary>
/// Nhu cầu của nhóm đầu vào cho công thức Matching.
/// </summary>
public sealed record GroupInput(
    string GroupId,
    IReadOnlyCollection<string> RequiredMajors,
    IReadOnlyCollection<string> RequiredSkills,
    string ProjectDomain);

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
