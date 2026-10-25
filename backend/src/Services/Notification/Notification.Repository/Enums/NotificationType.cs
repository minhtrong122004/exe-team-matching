namespace Notification.Repository.Enums;

/// <summary>
/// Phân loại thông báo hệ thống (CLAUDE.md mục 6, 7).
/// </summary>
public enum NotificationType
{
    Welcome,
    JoinRequestReceived,
    JoinRequestAccepted,
    JoinRequestRejected,
    InvitationReceived,
    MemberJoined,
    MemberLeft
}
