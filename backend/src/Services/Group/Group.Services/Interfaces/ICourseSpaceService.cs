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

    // ── Phase 5: gRPC Distribution & Finalize (BR-30, BR-31, BR-32, BR-33) ──
    Task<CourseSpaceResponse> CloseRegistrationAsync(Guid spaceId, CancellationToken ct = default);
    Task<UnmatchedSummaryResponse> GetUnmatchedSummaryAsync(Guid spaceId, CancellationToken ct = default);
    Task<DistributePreviewResponse> PreviewDistributionAsync(Guid spaceId, CancellationToken ct = default);
    Task<DistributeConfirmResponse> ConfirmDistributionAsync(Guid spaceId, CancellationToken ct = default);
    Task<FinalizeSpaceResponse> FinalizeSpaceAsync(Guid spaceId, CancellationToken ct = default);

    // ── Phase 6: Post-Lock Transfer & Lecturer Dashboard (BR-35, BR-36, BR-37, BR-38) ──
    Task<TransferRequestResponse> DirectTransferAsync(Guid spaceId, DirectTransferRequest request, Guid moderatorId, CancellationToken ct = default);
    Task<TransferRequestResponse> CreateTransferRequestAsync(Guid spaceId, CreateTransferRequest request, Guid studentId, CancellationToken ct = default);
    Task<IReadOnlyList<TransferRequestResponse>> GetTransferRequestsAsync(Guid spaceId, TransferRequestStatus? status, CancellationToken ct = default);
    Task<IReadOnlyList<TransferRequestResponse>> GetMyTransferRequestsAsync(Guid studentId, CancellationToken ct = default);
    Task<TransferRequestResponse> CancelTransferRequestAsync(Guid requestId, Guid studentId, CancellationToken ct = default);
    Task<TransferRequestResponse> DecideTransferRequestAsync(Guid spaceId, Guid requestId, DecideTransferRequest request, Guid moderatorId, CancellationToken ct = default);
    Task<SpaceRosterResponse> GetSpaceRosterAsync(Guid spaceId, CancellationToken ct = default);
    Task<CsvExportResult> ExportSpaceRosterCsvAsync(Guid spaceId, CancellationToken ct = default);
}

