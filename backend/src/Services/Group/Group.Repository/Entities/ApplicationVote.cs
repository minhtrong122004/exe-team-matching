namespace Group.Repository.Entities;

/// <summary>
/// Phiếu vote tham khảo của thành viên nhóm đối với ứng viên nộp đơn Apply (BR-25).
/// Khóa chính kép (JoinRequestId, VoterId).
/// </summary>
public class ApplicationVote
{
    public Guid JoinRequestId { get; set; }
    public Guid VoterId { get; set; }
    public string VoterName { get; set; } = string.Empty;
    public bool IsUpvote { get; set; }
    public string? Comment { get; set; }
    public DateTime VotedAt { get; set; }

    public JoinRequest JoinRequest { get; set; } = null!;
}

