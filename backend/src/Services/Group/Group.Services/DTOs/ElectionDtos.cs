namespace Group.Services.DTOs;

/// <summary>Yêu cầu khởi tạo cuộc bầu Leader (BR-18, BR-19).</summary>
public record StartElectionRequest(Guid CandidateId);

/// <summary>Yêu cầu bỏ phiếu bầu Leader (BR-19).</summary>
public record VoteElectionRequest(bool IsAgree);

/// <summary>Chi tiết một phiếu bầu Leader.</summary>
public record ElectionVoteResponse(
    Guid VoterId,
    string VoterName,
    bool IsAgree,
    DateTime VotedAt
);

/// <summary>Thông tin cuộc bầu Leader chính thức.</summary>
public record LeaderElectionResponse(
    Guid Id,
    Guid GroupId,
    Guid CandidateId,
    string CandidateName,
    Guid InitiatedById,
    string InitiatedByName,
    string Status,
    DateTime StartedAt,
    DateTime ExpiresAt,
    DateTime? CompletedAt,
    int TotalAgreed,
    int TotalDisagreed,
    int TotalVotes,
    int RequiredVotesToPass,
    int TotalMembers,
    double SecondsRemaining,
    IReadOnlyList<ElectionVoteResponse> Votes
);

/// <summary>Yêu cầu vote tham khảo cho ứng viên nộp đơn Apply (BR-25).</summary>
public record VoteApplicationRequest(
    bool IsUpvote,
    string? Comment = null
);

/// <summary>Chi tiết một phiếu vote ứng viên Apply của thành viên nhóm.</summary>
public record ApplicationVoteResponse(
    Guid VoterId,
    string VoterName,
    bool IsUpvote,
    string? Comment,
    DateTime VotedAt
);

/// <summary>Kết quả vào thẳng Room dưới ngưỡng (BR-14, BR-15).</summary>
public record DirectJoinRoomResponse(
    Guid GroupId,
    string? RoomCode,
    string Name,
    string Status,
    string Role,
    int MemberCount,
    int MaxMembers,
    DateTime JoinedAt,
    string Message
);

