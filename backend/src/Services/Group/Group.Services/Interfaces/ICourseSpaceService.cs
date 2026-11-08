using Group.Repository.Enums;
using Group.Services.DTOs;

namespace Group.Services.Interfaces;

public interface ICourseSpaceService
{
    Task<CourseSpaceResponse> CreateSpaceAsync(CreateCourseSpaceRequest request, CancellationToken ct = default);
    Task<IReadOnlyList<CourseSpaceResponse>> GetAllSpacesAsync(string? semesterCode, CourseSpaceStatus? status, CancellationToken ct = default);
    Task<CourseSpaceResponse> GetSpaceByIdAsync(Guid spaceId, CancellationToken ct = default);
    Task<CourseSpaceResponse> UpdateSpaceConfigAsync(Guid spaceId, UpdateSpaceConfigRequest request, CancellationToken ct = default);
    Task<int> ImportFapStudentsAsync(Guid spaceId, ImportFapStudentsRequest request, CancellationToken ct = default);
    Task<int> SyncMockFapStudentsAsync(Guid spaceId, CancellationToken ct = default);
    Task<GenerateRoomsResponse> GenerateRoomsAsync(Guid spaceId, CancellationToken ct = default);
    Task<IReadOnlyList<CourseSpaceResponse>> GetMySpacesAsync(Guid studentId, string? email = null, CancellationToken ct = default);
    Task<IReadOnlyList<SpaceEnrollmentResponse>> GetSpaceEnrollmentsAsync(Guid spaceId, CancellationToken ct = default);
    Task<IReadOnlyList<RoomSummaryResponse>> GetSpaceRoomsAsync(Guid spaceId, GroupStatus? status, CancellationToken ct = default);
}
