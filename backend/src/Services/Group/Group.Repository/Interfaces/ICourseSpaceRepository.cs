using Exe.BuildingBlocks.Paging;
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
    /// <summary>BR-13: danh sách Room có lọc theo trạng thái, chỗ trống, từ khóa và phân trang (không track).</summary>
    Task<PagedResult<GroupEntity>> GetPagedRoomsBySpaceAsync(
        Guid spaceId, GroupStatus? status, int? minAvailableSlots, string? search, int page, int pageSize, CancellationToken ct = default);
    Task<IReadOnlyList<GroupEntity>> GetTrackedRoomsBySpaceAsync(Guid spaceId, CancellationToken ct = default);
    Task<IReadOnlyList<JoinRequest>> GetPendingJoinRequestsBySpaceAsync(Guid spaceId, CancellationToken ct = default);
    Task<GroupTransferRequest?> GetTransferRequestByIdAsync(Guid id, CancellationToken ct = default);
    Task<IReadOnlyList<GroupTransferRequest>> GetTransferRequestsBySpaceAsync(Guid spaceId, TransferRequestStatus? status, CancellationToken ct = default);
    Task<IReadOnlyList<GroupTransferRequest>> GetTransferRequestsByStudentAsync(Guid studentId, CancellationToken ct = default);
    Task<bool> HasPendingTransferRequestAsync(Guid spaceId, Guid studentId, CancellationToken ct = default);
    Task UpdateProfileCompletionAsync(Guid studentId, bool isCompleted, CancellationToken ct = default);
    void Add(CourseSpace space);
    void Remove(CourseSpace space);
    void AddEnrollment(SpaceEnrollment enrollment);
    void AddEnrollmentsRange(IEnumerable<SpaceEnrollment> enrollments);
    void AddRoomsRange(IEnumerable<GroupEntity> rooms);
    void RemoveRoomsRange(IEnumerable<GroupEntity> rooms);
    void AddTransferRequest(GroupTransferRequest request);
}

