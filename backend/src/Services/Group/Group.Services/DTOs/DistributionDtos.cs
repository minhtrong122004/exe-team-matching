namespace Group.Services.DTOs;

public record UnmatchedStudentItem(
    Guid UserId,
    string StudentCode,
    string FullName,
    string Email,
    string Major,
    string Cohort,
    int TechScore,
    int ManagementScore,
    int GraphicDesignScore,
    int MarketingScore,
    int SaleScore);

public record RoomMemberSummary(
    Guid UserId,
    string FullName,
    string? Major,
    bool IsLeader,
    DateTime JoinedAt);

public record RoomDistributionItem(
    Guid RoomId,
    string RoomCode,
    string Name,
    int MemberCount,
    int MaxMembers,
    Guid? LeaderId,
    string? LeaderName,
    IReadOnlyList<RoomMemberSummary> Members);

public record UnmatchedSummaryResponse(
    Guid SpaceId,
    string SemesterCode,
    string SubjectCode,
    string Status,
    int TotalEnrolled,
    int TotalMatched,
    int TotalUnmatched,
    IReadOnlyList<UnmatchedStudentItem> UnmatchedStudents,
    IReadOnlyList<RoomDistributionItem> IncompleteRooms,
    IReadOnlyList<RoomDistributionItem> EmptyRooms,
    IReadOnlyList<RoomDistributionItem> FullRooms);

public record AssignedStudentDto(
    Guid UserId,
    string StudentCode,
    string FullName,
    string Major,
    bool IsLeader,
    int ManagementScore);

public record DistributedRoomPlanDto(
    Guid RoomId,
    string RoomCode,
    string Name,
    Guid? LeaderId,
    string LeaderName,
    bool IsNewlyFormed,
    int MemberCountBefore,
    int MemberCountAfter,
    IReadOnlyList<AssignedStudentDto> AddedStudents,
    IReadOnlyList<AssignedStudentDto> FinalMembers,
    double BalanceScore);

public record DistributePreviewResponse(
    Guid SpaceId,
    int TotalUnmatched,
    int TotalDistributed,
    int TotalRemaining,
    IReadOnlyList<DistributedRoomPlanDto> RoomPlans);

public record DistributeConfirmResponse(
    Guid SpaceId,
    int TotalDistributed,
    int TotalRemaining,
    int UpdatedRoomsCount,
    IReadOnlyList<DistributedRoomPlanDto> ConfirmedRoomPlans);

public record FinalizeSpaceResponse(
    Guid SpaceId,
    string SemesterCode,
    string SubjectCode,
    string Status,
    int LockedRoomsCount,
    int RejectedRequestsCount,
    DateTime FinalizedAt);

