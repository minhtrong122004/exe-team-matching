using Exe.BuildingBlocks.Paging;
using Report.Repository.Enums;

namespace Report.Services.DTOs;

public class SnapshotQuery : PagedRequest
{
    public DateTime? From { get; set; }
    public DateTime? To { get; set; }
}

public class StudentsWithoutGroupQuery : PagedRequest
{
    public string? Major { get; set; }
}

public class GroupReportQuery : PagedRequest
{
    public GroupStatStatus? Status { get; set; }
}

public sealed record MajorBreakdownItem(
    string Major,
    int TotalStudents,
    int StudentsInGroup,
    int StudentsWithoutGroup);

public sealed record ReportSummaryResponse(
    DateTime GeneratedAt,
    int TotalStudents,
    int StudentsInGroup,
    int StudentsWithoutGroup,
    int TotalGroups,
    int RecruitingGroups,
    int FullGroups,
    IReadOnlyList<MajorBreakdownItem> ByMajor);

public sealed record ReportSnapshotResponse(
    Guid Id,
    DateTime GeneratedAt,
    int TotalStudents,
    int StudentsInGroup,
    int StudentsWithoutGroup,
    int TotalGroups,
    int RecruitingGroups,
    int FullGroups,
    IReadOnlyList<MajorBreakdownItem> ByMajor);

public sealed record StudentWithoutGroupResponse(
    Guid UserId,
    string Email,
    string FullName,
    string? Major,
    DateTime UpdatedAt);

public sealed record GroupReportItemResponse(
    Guid GroupId,
    string Name,
    Guid LeaderId,
    int MemberCount,
    int MaxMembers,
    string Status,
    DateTime UpdatedAt);

public sealed record CsvExportResult(
    byte[] Content,
    string ContentType,
    string FileName);
