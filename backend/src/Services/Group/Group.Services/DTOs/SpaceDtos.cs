using Exe.BuildingBlocks.Paging;
using Group.Repository.Enums;

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
    DateTime RegistrationDeadline,
    string? Name = null,
    CourseSpaceStatus? Status = null);

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

/// <summary>GET /api/spaces/{id}/rooms?status=&amp;minAvailableSlots=&amp;search=&amp;page=&amp;pageSize= (BR-13).</summary>
public class RoomQuery : PagedRequest
{
    public GroupStatus? Status { get; set; }

    /// <summary>Chỉ lấy phòng còn ít nhất bao nhiêu chỗ trống.</summary>
    public int? MinAvailableSlots { get; set; }

    /// <summary>Tìm theo mã phòng hoặc tên phòng.</summary>
    public string? Search { get; set; }
}

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

