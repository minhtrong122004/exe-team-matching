namespace Group.Repository.Entities;

/// <summary>
/// Phiếu bầu của từng thành viên trong cuộc bầu Leader (BR-19).
/// Khóa chính kép (ElectionId, VoterId).
/// </summary>
public class ElectionVote
{
    public Guid ElectionId { get; set; }
    public Guid VoterId { get; set; }
    public string VoterName { get; set; } = string.Empty;
    public bool IsAgree { get; set; }
    public DateTime VotedAt { get; set; }

    public LeaderElection Election { get; set; } = null!;
}

