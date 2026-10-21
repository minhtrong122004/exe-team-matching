using Exe.BuildingBlocks.Paging;
using Group.Services.DTOs;

namespace Group.Services.Interfaces;

/// <summary>Nhóm, vị trí tuyển và thành viên (CLAUDE.md mục 10).</summary>
public interface IGroupService
{
    Task<PagedResult<GroupSummaryResponse>> GetGroupsAsync(GroupQuery query, CancellationToken ct = default);
    Task<GroupDetailResponse> GetGroupAsync(Guid id, CancellationToken ct = default);

    /// <summary>Nhóm đang hoạt động của người dùng hiện tại; null nếu chưa có nhóm.</summary>
    Task<GroupDetailResponse?> GetMyGroupAsync(CancellationToken ct = default);

    Task<GroupDetailResponse> CreateGroupAsync(CreateGroupRequest request, CancellationToken ct = default);
    Task<GroupDetailResponse> UpdateGroupAsync(Guid id, UpdateGroupRequest request, CancellationToken ct = default);

    /// <summary>Giải tán nhóm: trạng thái Disbanded, hủy yêu cầu/lời mời đang chờ, phát MemberLeft cho từng thành viên.</summary>
    Task DisbandGroupAsync(Guid id, CancellationToken ct = default);

    Task<SlotResponse> AddSlotAsync(Guid groupId, SlotRequest request, CancellationToken ct = default);
    Task<SlotResponse> UpdateSlotAsync(Guid groupId, Guid slotId, SlotRequest request, CancellationToken ct = default);
    Task DeleteSlotAsync(Guid groupId, Guid slotId, CancellationToken ct = default);

    Task RemoveMemberAsync(Guid groupId, Guid userId, CancellationToken ct = default);
    Task LeaveGroupAsync(Guid groupId, CancellationToken ct = default);
    Task<GroupDetailResponse> TransferLeaderAsync(Guid groupId, TransferLeaderRequest request, CancellationToken ct = default);
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
}

/// <summary>Lời mời vào nhóm.</summary>
public interface IInvitationService
{
    Task<InvitationResponse> CreateAsync(Guid groupId, CreateInvitationRequest request, CancellationToken ct = default);
    Task<PagedResult<InvitationResponse>> GetMineAsync(InvitationQuery query, CancellationToken ct = default);
    Task<InvitationResponse> AcceptAsync(Guid id, CancellationToken ct = default);
    Task<InvitationResponse> RejectAsync(Guid id, CancellationToken ct = default);

    /// <summary>BR-10: chuyển lời mời Pending quá hạn sang Expired. Gọi từ InvitationExpiryJob. Trả số lời mời đã hết hạn.</summary>
    Task<int> ExpireOverdueAsync(CancellationToken ct = default);
}

/// <summary>Điểm phù hợp và gợi ý — gom dữ liệu từ User/Project rồi gọi Matching qua gRPC (CLAUDE.md mục 8).</summary>
public interface IGroupMatchingService
{
    Task<MatchScoreResponse> GetMatchScoreAsync(Guid groupId, CancellationToken ct = default);
    Task<IReadOnlyList<GroupSuggestionResponse>> GetSuggestionsAsync(int top, CancellationToken ct = default);
    Task<IReadOnlyList<CandidateResponse>> GetCandidatesAsync(Guid groupId, int top, CancellationToken ct = default);
}
