using System.Text.Json.Serialization;
using Group.Repository.Enums;

namespace Group.Services.DTOs;

/// <summary>Sinh viên gửi yêu cầu chuyển nhóm sau khi Chốt sổ (BR-36).</summary>
public sealed record CreateTransferRequest(
    Guid TargetGroupId,
    Guid? SwapWithStudentId,
    string Reason,
    Guid? SwapStudentId = null)
{
    [JsonIgnore]
    public Guid? EffectiveSwapStudentId => SwapWithStudentId ?? SwapStudentId;
}

/// <summary>Moderator chuyển trực tiếp 1 sinh viên hoặc đổi chéo 2 sinh viên (BR-35, BR-37).</summary>
public sealed record DirectTransferRequest(
    Guid StudentId,
    Guid TargetGroupId,
    Guid? SwapWithStudentId,
    string Reason,
    Guid? SwapStudentId = null)
{
    [JsonIgnore]
    public Guid? EffectiveSwapStudentId => SwapWithStudentId ?? SwapStudentId;
}

/// <summary>Moderator duyệt hoặc từ chối yêu cầu chuyển nhóm (BR-36).</summary>
public sealed record DecideTransferRequest(
    bool Approved,
    string? DecisionReason,
    string? Status = null)
{
    [JsonIgnore]
    public bool IsApproved => Approved || string.Equals(Status, "Approved", StringComparison.OrdinalIgnoreCase);
}

/// <summary>Thông tin chi tiết một yêu cầu điều chuyển sinh viên.</summary>
public sealed record TransferRequestResponse(
    Guid Id,
    Guid SpaceId,
    Guid RequesterStudentId,
    string RequesterStudentName,
    string RequesterStudentCode,
    Guid FromGroupId,
    string FromGroupCode,
    Guid TargetGroupId,
    string TargetGroupCode,
    Guid? SwapWithStudentId,
    string? SwapWithStudentName,
    string? SwapWithStudentCode,
    string Reason,
    TransferRequestStatus Status,
    DateTime CreatedAt,
    DateTime? DecidedAt,
    Guid? DecidedByModeratorId,
    string? DecisionReason)
{
    // Frontend aliases for perfect cross-layer compatibility
    public Guid StudentId => RequesterStudentId;
    public string StudentName => RequesterStudentName;
    public string StudentCode => RequesterStudentCode;
    public Guid? SwapStudentId => SwapWithStudentId;
    public string? SwapStudentName => SwapWithStudentName;
    public string? SwapStudentCode => SwapWithStudentCode;
    public DateTime RequestedAt => CreatedAt;
    public Guid? ModeratorId => DecidedByModeratorId;
}

/// <summary>Thành viên trong bảng tổng hợp Roster của Giảng viên.</summary>
public sealed record SpaceRosterMemberItem(
    Guid StudentId,
    string StudentCode,
    string FullName,
    string Email,
    string Major,
    string Cohort,
    string Role,
    int TechScore,
    int ManagementScore,
    int GraphicDesignScore,
    int MarketingScore,
    int SaleScore,
    DateTime JoinedAt);

/// <summary>Nhóm trong bảng tổng hợp Roster của Giảng viên.</summary>
public sealed record SpaceRosterGroupItem(
    Guid GroupId,
    string RoomCode,
    string GroupName,
    GroupStatus Status,
    int MemberCount,
    int MaxMembers,
    Guid? LeaderId,
    string? LeaderName,
    string? ProjectTitle,
    IReadOnlyList<SpaceRosterMemberItem> Members);

/// <summary>Báo cáo toàn diện Không gian học phần dành cho Lecturer và Moderator.</summary>
public sealed record SpaceRosterResponse(
    Guid SpaceId,
    string SemesterCode,
    string SubjectCode,
    string Name,
    CourseSpaceStatus Status,
    int TotalStudents,
    int TotalGroups,
    int LockedGroups,
    IReadOnlyList<SpaceRosterGroupItem> Groups);

/// <summary>Kết quả xuất file CSV có UTF-8 BOM phục vụ mở tiếng Việt trong Excel.</summary>
public sealed record CsvExportResult(
    byte[] Content,
    string ContentType,
    string FileName);
