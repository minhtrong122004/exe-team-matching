namespace Group.Repository.Enums;

// Enum lưu dạng chuỗi trong DB và trả về dạng chuỗi trong JSON (CLAUDE.md mục 6, 10).

public enum GroupStatus
{
    Recruiting,
    Full,
    Locked,
    Disbanded
}

public enum MemberRole
{
    Leader,
    Member
}

public enum JoinRequestStatus
{
    Pending,
    Accepted,
    Rejected,
    Cancelled
}

public enum InvitationStatus
{
    Pending,
    Accepted,
    Rejected,
    Cancelled,
    Expired
}
