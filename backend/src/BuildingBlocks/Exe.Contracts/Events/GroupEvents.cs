namespace Exe.Contracts.Events;

// Tất cả do Group Service phát. Payload chứa sẵn email và tên người nhận,
// để Notification không phải gọi sang User Service (CLAUDE.md mục 7).

/// <summary>Nhóm mới được tạo. Nhận: Report.</summary>
public record GroupCreated(Guid GroupId, string Name, Guid LeaderId, int MaxMembers);

/// <summary>Sinh viên gửi yêu cầu tham gia nhóm. Nhận: Notification (báo cho trưởng nhóm).</summary>
public record JoinRequestCreated(
    Guid RequestId,
    Guid GroupId,
    string GroupName,
    Guid StudentId,
    string StudentName,
    Guid LeaderId,
    string LeaderEmail,
    string LeaderName);

/// <summary>Trưởng nhóm duyệt hoặc từ chối yêu cầu. Nhận: Notification (báo cho sinh viên).</summary>
public record JoinRequestDecided(
    Guid RequestId,
    Guid GroupId,
    string GroupName,
    Guid StudentId,
    string StudentEmail,
    string StudentName,
    bool Accepted);

/// <summary>Trưởng nhóm mời sinh viên. Nhận: Notification (báo cho sinh viên).</summary>
public record InvitationCreated(
    Guid InvitationId,
    Guid GroupId,
    string GroupName,
    Guid StudentId,
    string StudentEmail,
    string StudentName,
    DateTime ExpiresAt);

/// <summary>
/// Sinh viên vào nhóm (qua yêu cầu hoặc lời mời).
/// Nhận: User (đặt InTeam), Notification, Report.
/// </summary>
public record MemberJoined(
    Guid GroupId,
    string GroupName,
    Guid UserId,
    string UserEmail,
    string UserName,
    int MemberCount,
    int MaxMembers);

/// <summary>
/// Sinh viên rời nhóm hoặc bị xóa khỏi nhóm.
/// Nhận: User (đặt LookingForTeam), Notification, Report.
/// </summary>
public record MemberLeft(Guid GroupId, string GroupName, Guid UserId, int MemberCount);
