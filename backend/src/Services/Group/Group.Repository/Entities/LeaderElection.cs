using Group.Repository.Enums;

namespace Group.Repository.Entities;

/// <summary>
/// Cuộc bầu chọn Leader chính thức cho nhóm theo BR-18, BR-19.
/// Có thời hạn 24 giờ kể từ khi mở cuộc bầu.
/// </summary>
public class LeaderElection
{
    public Guid Id { get; set; }
    public Guid GroupId { get; set; }

    /// <summary>Thành viên được đề cử / ứng cử làm Leader.</summary>
    public Guid CandidateId { get; set; }
    public string CandidateName { get; set; } = string.Empty;

    /// <summary>Thành viên khởi xướng cuộc bầu chọn.</summary>
    public Guid InitiatedById { get; set; }
    public string InitiatedByName { get; set; } = string.Empty;

    public ElectionStatus Status { get; set; } = ElectionStatus.Active;
    public DateTime StartedAt { get; set; }
    public DateTime ExpiresAt { get; set; }
    public DateTime? CompletedAt { get; set; }

    public GroupEntity Group { get; set; } = null!;
    public List<ElectionVote> Votes { get; set; } = [];
}

