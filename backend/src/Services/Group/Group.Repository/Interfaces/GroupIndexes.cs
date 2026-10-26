namespace Group.Repository.Interfaces;

/// <summary>
/// Tên các unique index gắn với business rule, để lớp Services nhận ra
/// <see cref="UniqueConstraintViolationException"/> nào ứng với rule nào.
/// </summary>
public static class GroupIndexes
{
    /// <summary>BR-11: một dự án chỉ thuộc một nhóm chưa giải tán.</summary>
    public const string ProjectId = "IX_Groups_ProjectId";

    /// <summary>BR-04: không có hai yêu cầu Pending của cùng sinh viên tới cùng một nhóm.</summary>
    public const string PendingJoinRequest = "IX_JoinRequests_StudentId_GroupId_Pending";

    /// <summary>Không có hai lời mời Pending của cùng một nhóm cho cùng sinh viên.</summary>
    public const string PendingInvitation = "IX_Invitations_StudentId_GroupId_Pending";
}
