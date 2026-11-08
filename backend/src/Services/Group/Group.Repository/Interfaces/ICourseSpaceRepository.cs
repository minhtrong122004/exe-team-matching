using Group.Repository.Entities;
using Group.Repository.Enums;

namespace Group.Repository.Interfaces;

public interface ICourseSpaceRepository
{
    Task<CourseSpace?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<CourseSpace?> GetByCodeAsync(string semesterCode, string subjectCode, CancellationToken ct = default);
    Task<IReadOnlyList<CourseSpace>> GetAllAsync(string? semesterCode, CourseSpaceStatus? status, CancellationToken ct = default);
    Task<IReadOnlyList<CourseSpace>> GetSpacesForStudentAsync(Guid studentId, string? email = null, CancellationToken ct = default);
    Task<IReadOnlyList<SpaceEnrollment>> GetEnrollmentsBySpaceAsync(Guid spaceId, CancellationToken ct = default);
    Task<SpaceEnrollment?> GetEnrollmentAsync(Guid spaceId, Guid studentId, CancellationToken ct = default);
    Task<bool> IsStudentEnrolledAsync(Guid spaceId, Guid studentId, CancellationToken ct = default);
    Task<int> GetTotalEnrollmentsCountAsync(Guid spaceId, CancellationToken ct = default);
    Task<IReadOnlyList<GroupEntity>> GetRoomsBySpaceAsync(Guid spaceId, GroupStatus? status, CancellationToken ct = default);
    void Add(CourseSpace space);
    void AddEnrollment(SpaceEnrollment enrollment);
    void AddEnrollmentsRange(IEnumerable<SpaceEnrollment> enrollments);
    void AddRoomsRange(IEnumerable<GroupEntity> rooms);
    void RemoveRoomsRange(IEnumerable<GroupEntity> rooms);
}
