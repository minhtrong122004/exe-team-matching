using Group.Services.DTOs;

namespace Group.Services.Interfaces;

public interface IElectionService
{
    /// <summary>Khởi động cuộc bầu chọn Leader mới cho nhóm (BR-18, BR-19).</summary>
    Task<LeaderElectionResponse> StartElectionAsync(Guid groupId, StartElectionRequest request, CancellationToken ct = default);

    /// <summary>Thành viên bỏ phiếu bầu Leader (BR-19).</summary>
    Task<LeaderElectionResponse> VoteElectionAsync(Guid groupId, Guid electionId, VoteElectionRequest request, CancellationToken ct = default);

    /// <summary>Lấy cuộc bầu cử đang hoạt động của nhóm (kèm thời gian đếm ngược 24h).</summary>
    Task<LeaderElectionResponse?> GetCurrentElectionAsync(Guid groupId, CancellationToken ct = default);
}

