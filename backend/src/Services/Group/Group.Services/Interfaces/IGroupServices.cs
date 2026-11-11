using Exe.BuildingBlocks.Paging;
using Group.Services.DTOs;

namespace Group.Services.Interfaces;

/// <summary>Nhóm, vị trí tuyển và thành viên (CLAUDE.md mục 10).</summary>
public interface IGroupService
{
    Task<PagedResult<GroupSummaryResponse>> GetGroupsAsync(GroupQuery query, CancellationToken ct = default);
    Task<GroupDetailResponse> GetGroupAsync(Guid id, CancellationToken ct = default);

    /// <summary>Nhóm của người dùng hiện tại trong một môn (hoặc nhóm mới nhất nếu không chỉ định); null nếu chưa có nhóm.</summary>
    Task<GroupDetailResponse?> GetMyGroupAsync(Guid? spaceId = null, CancellationToken ct = default);

    Task<GroupDetailResponse> UpdateGroupAsync(Guid id, UpdateGroupRequest request, CancellationToken ct = default);

    Task<SlotResponse> AddSlotAsync(Guid groupId, SlotRequest request, CancellationToken ct = default);
    Task<SlotResponse> UpdateSlotAsync(Guid groupId, Guid slotId, SlotRequest request, CancellationToken ct = default);
    Task DeleteSlotAsync(Guid groupId, Guid slotId, CancellationToken ct = default);

    Task RemoveMemberAsync(Guid groupId, Guid userId, CancellationToken ct = default);
    Task RemoveMemberAsync(Guid groupId, Guid userId, RemoveMemberRequest request, CancellationToken ct = default);
    Task LeaveGroupAsync(Guid groupId, CancellationToken ct = default);
    Task<GroupDetailResponse> TransferLeaderAsync(Guid groupId, TransferLeaderRequest request, CancellationToken ct = default);

    /// <summary>Vào thẳng phòng dưới ngưỡng (BR-14, BR-15, BR-21, BR-26).</summary>
    Task<DirectJoinRoomResponse> DirectJoinRoomAsync(Guid roomId, CancellationToken ct = default);

    /// <summary>Leader chủ động đóng tuyển sớm (BR-28).</summary>
    Task<GroupDetailResponse> CloseRecruitmentAsync(Guid groupId, CancellationToken ct = default);

    /// <summary>Leader mở lại tuyển dụng khi nhóm chưa đủ MaxMembers.</summary>
    Task<GroupDetailResponse> ReopenRecruitmentAsync(Guid groupId, CancellationToken ct = default);
}

/// <summary>Yêu cầu tham gia nhóm.</summary>
public interface IJoinRequestService
{
    Task<JoinRequestResponse> CreateAsync(Guid groupId, CreateJoinRequestRequest request, CancellationToken ct = default);
    Task<PagedResult<JoinRequestResponse>> GetByGroupAsync(Guid groupId, JoinRequestQuery query, CancellationToken ct = default);
    Task<PagedResult<JoinRequestResponse>> GetMineAsync(JoinRequestQuery query, CancellationToken ct = default);
    Task<JoinRequestResponse> AcceptAsync(Guid id, CancellationToken ct = default);
    Task<JoinRequestResponse> RejectAsync(Guid id, CancellationToken ct = default);
    Task<JoinRequestResponse> CancelAsync(Guid id, CancellationToken ct = default);

    /// <summary>Thành viên vote tham khảo cho ứng viên (BR-25).</summary>
    Task<JoinRequestResponse> VoteApplicationAsync(Guid requestId, VoteApplicationRequest request, CancellationToken ct = default);
}

/// <summary>Điểm phù hợp và gợi ý — gom dữ liệu từ User/Project rồi gọi Matching qua gRPC (CLAUDE.md mục 8).</summary>
public interface IGroupMatchingService
{
    Task<MatchScoreResponse> GetMatchScoreAsync(Guid groupId, CancellationToken ct = default);
    Task<IReadOnlyList<GroupSuggestionResponse>> GetSuggestionsAsync(int top, CancellationToken ct = default);
    Task<IReadOnlyList<CandidateResponse>> GetCandidatesAsync(Guid groupId, int top, CancellationToken ct = default);

    /// <summary>Phân tích nhóm chuyên sâu bằng AI Mentor (Gemini API / Fallback Heuristic).</summary>
    Task<AiMentorResponse> GetAiMentorInsightsAsync(Guid groupId, CancellationToken ct = default);
}
