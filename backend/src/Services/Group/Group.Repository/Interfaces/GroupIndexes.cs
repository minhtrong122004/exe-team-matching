namespace Group.Repository.Interfaces;

/// <summary>
/// Tên các unique index gắn với business rule, để lớp Services nhận ra
/// <see cref="UniqueConstraintViolationException"/> nào ứng với rule nào.
/// </summary>
public static class GroupIndexes
{
    /// <summary>BR-11: một dự án chỉ thuộc một nhóm chưa giải tán (khi đã gán dự án).</summary>
    public const string ProjectId = "IX_Groups_ProjectId";

    /// <summary>Mã phòng RoomCode là duy nhất trong một Space (BR-11).</summary>
    public const string RoomCode = "IX_Groups_SpaceId_RoomCode";

    /// <summary>Mỗi cặp (SemesterCode, SubjectCode) là duy nhất cho 1 CourseSpace (BR-01, BR-08).</summary>
    public const string CourseSpaceCode = "IX_CourseSpaces_SemesterCode_SubjectCode";

    /// <summary>Một sinh viên chỉ có một bản ghi ghi danh trong một Space (BR-01).</summary>
    public const string SpaceEnrollmentStudent = "IX_SpaceEnrollments_SpaceId_StudentId";

    /// <summary>Mỗi MSSV chỉ có một bản ghi trong một Space.</summary>
    public const string SpaceEnrollmentStudentCode = "IX_SpaceEnrollments_SpaceId_StudentCode";

    /// <summary>BR-04: không có hai yêu cầu Pending của cùng sinh viên tới cùng một nhóm.</summary>
    public const string PendingJoinRequest = "IX_JoinRequests_StudentId_GroupId_Pending";

    /// <summary>Không có hai lời mời Pending của cùng một nhóm cho cùng sinh viên.</summary>
    public const string PendingInvitation = "IX_Invitations_StudentId_GroupId_Pending";

    /// <summary>BR-19: mỗi Room chỉ có tối đa một cuộc bầu Leader Active tại một thời điểm.</summary>
    public const string ActiveElection = "IX_LeaderElections_GroupId_Active";
}
