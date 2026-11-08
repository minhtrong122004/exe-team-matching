namespace Group.Repository.Enums;

// Enum lưu dạng chuỗi trong DB và trả về dạng chuỗi trong JSON (CLAUDE.md mục 6, 10).

public enum GroupStatus
{
    Empty,        // Room trống (0 thành viên)
    Forming,      // Room đang lập (1 đến < GroupThreshold thành viên, vào thẳng)
    Recruiting,   // Group đang tuyển (>= GroupThreshold và < MaxMembers, qua Apply)
    Closed,       // Đóng tuyển (đủ MaxMembers hoặc Leader chủ động đóng tuyển sớm)
    Locked,       // Đã chốt sổ
    Full,         // Tương đương Closed (giữ tương thích dữ liệu cũ)
    Disbanded
}

public enum CourseSpaceStatus
{
    Draft,
    Open,
    ClosedRegistration,
    Locked
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

public enum ElectionStatus
{
    Active,
    Passed,
    Failed,
    TimedOut
}

public enum TransferRequestStatus
{
    Pending,
    Approved,
    Rejected,
    Cancelled
}

