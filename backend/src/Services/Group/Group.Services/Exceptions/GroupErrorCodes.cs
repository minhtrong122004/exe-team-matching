namespace Group.Services.Exceptions;

/// <summary>
/// Mã lỗi 409 riêng của Group Service, trả ở field "code" của ProblemDetails.
/// Dùng với <c>throw new BusinessRuleException(GroupErrorCodes.GroupFull, "Group is full.")</c>.
/// </summary>
public static class GroupErrorCodes
{
    /// <summary>BR-01: đã ở trong một nhóm đang hoạt động.</summary>
    public const string AlreadyInGroup = "ALREADY_IN_GROUP";

    /// <summary>BR-03: đã có 5 yêu cầu Pending.</summary>
    public const string JoinRequestLimit = "JOIN_REQUEST_LIMIT";

    /// <summary>BR-04: đã có yêu cầu Pending tới nhóm này.</summary>
    public const string DuplicateJoinRequest = "DUPLICATE_JOIN_REQUEST";

    /// <summary>BR-04: đã là thành viên của nhóm này.</summary>
    public const string AlreadyMember = "ALREADY_MEMBER";

    /// <summary>BR-06: nhóm đã đủ người.</summary>
    public const string GroupFull = "GROUP_FULL";

    /// <summary>Nhóm không ở trạng thái Recruiting (Locked hoặc Disbanded).</summary>
    public const string GroupNotRecruiting = "GROUP_NOT_RECRUITING";

    /// <summary>Nhóm đã giải tán, không thể thay đổi.</summary>
    public const string GroupDisbanded = "GROUP_DISBANDED";

    /// <summary>BR-09: trưởng nhóm không được rời nhóm.</summary>
    public const string LeaderCannotLeave = "LEADER_CANNOT_LEAVE";

    /// <summary>BR-10: lời mời đã hết hạn.</summary>
    public const string InvitationExpired = "INVITATION_EXPIRED";

    /// <summary>Đã có lời mời Pending cho sinh viên này.</summary>
    public const string DuplicateInvitation = "DUPLICATE_INVITATION";

    /// <summary>BR-11: dự án đã có nhóm.</summary>
    public const string ProjectAlreadyHasGroup = "PROJECT_ALREADY_HAS_GROUP";

    /// <summary>Yêu cầu/lời mời không còn ở trạng thái Pending.</summary>
    public const string InvalidStatus = "INVALID_STATUS";

    /// <summary>BR-02: MaxMembers nhỏ hơn số thành viên hiện tại.</summary>
    public const string MaxMembersBelowMemberCount = "MAX_MEMBERS_BELOW_MEMBER_COUNT";

    /// <summary>Vị trí tuyển đã đủ người.</summary>
    public const string SlotFull = "SLOT_FULL";

    /// <summary>Tổng số lượng của các vị trí tuyển vượt quá MaxMembers - 1.</summary>
    public const string SlotQuantityExceeded = "SLOT_QUANTITY_EXCEEDED";

    /// <summary>Không thể xóa/giảm vị trí đã có người.</summary>
    public const string SlotHasMembers = "SLOT_HAS_MEMBERS";

    /// <summary>Người được chỉ định không phải thành viên nhóm.</summary>
    public const string NotGroupMember = "NOT_GROUP_MEMBER";

    /// <summary>Chỉ sinh viên mới được mời / vào nhóm.</summary>
    public const string NotAStudent = "NOT_A_STUDENT";

    /// <summary>Nhóm vừa bị thao tác khác thay đổi, thử lại.</summary>
    public const string ConcurrentUpdate = "CONCURRENT_UPDATE";
}
