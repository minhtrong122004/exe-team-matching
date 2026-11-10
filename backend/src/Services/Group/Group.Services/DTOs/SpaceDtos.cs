namespace Group.Services.DTOs;

public record CreateCourseSpaceRequest(
    string SemesterCode,
    string SubjectCode,
    string Name,
    int MaxMembersPerGroup = 5,
    decimal BufferRatio = 1.2m,
    int MaxConcurrentApplies = 3,
    DateTime? RegistrationDeadline = null);

public record UpdateSpaceConfigRequest(
    int MaxMembersPerGroup,
    decimal BufferRatio,
    int MaxConcurrentApplies,
    DateTime RegistrationDeadline);

public record FapStudentItem(
    string StudentCode,
    string FullName,
    string Email,
    string Major,
    string Cohort,
    string? ClassCode = null);

public record ImportFapStudentsRequest(List<FapStudentItem> Students);

public record CourseSpaceResponse(
    Guid Id,
    string SemesterCode,
    string SubjectCode,
    string Name,
    int MaxMembersPerGroup,
    int GroupThreshold,
    decimal BufferRatio,
    int MaxConcurrentApplies,
    DateTime RegistrationDeadline,
    string Status,
    int TotalStudents,
    int TotalRooms,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public record SpaceEnrollmentResponse(
    Guid Id,
    Guid SpaceId,
    Guid StudentId,
    string StudentCode,
    string Email,
    string FullName,
    string Major,
    string Cohort,
    string? ClassCode,
    DateTime EnrolledAt,
    bool IsProfileCompleted = false);

public record GenerateRoomsResponse(
    Guid SpaceId,
    string SemesterCode,
    string SubjectCode,
    int TotalStudents,
    int MaxMembersPerGroup,
    decimal BufferRatio,
    int TotalRoomsGenerated,
    IReadOnlyList<RoomSummaryResponse> Rooms);

public record RoomSummaryResponse(
    Guid Id,
    string? RoomCode,
    string Name,
    string Status,
    int MemberCount,
    int MaxMembers,
    Guid? LeaderId,
    string? LeaderName,
    Guid? SpaceId,
    DateTime CreatedAt);

