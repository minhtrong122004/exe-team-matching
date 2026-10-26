using System.Text;
using System.Text.Json;
using Exe.BuildingBlocks.Paging;
using Exe.BuildingBlocks.Web;
using Report.Repository.Entities;
using Report.Repository.Enums;
using Report.Repository.Interfaces;
using Report.Services.DTOs;
using Report.Services.Interfaces;

namespace Report.Services.Implementations;

public class ReportService : IReportService
{
    private readonly IStudentStatRepository _studentRepo;
    private readonly IGroupStatRepository _groupRepo;
    private readonly IReportSnapshotRepository _snapshotRepo;
    private readonly IReportUnitOfWork _unitOfWork;

    public ReportService(
        IStudentStatRepository studentRepo,
        IGroupStatRepository groupRepo,
        IReportSnapshotRepository snapshotRepo,
        IReportUnitOfWork unitOfWork)
    {
        _studentRepo = studentRepo;
        _groupRepo = groupRepo;
        _snapshotRepo = snapshotRepo;
        _unitOfWork = unitOfWork;
    }

    public async Task<ReportSummaryResponse> GetSummaryAsync(CancellationToken ct = default)
    {
        var students = await _studentRepo.GetAllAsync(ct);
        var groups = await _groupRepo.GetAllAsync(ct);

        var totalStudents = students.Count;
        var studentsInGroup = students.Count(x => x.HasGroup);
        var studentsWithoutGroup = totalStudents - studentsInGroup;

        var activeGroups = groups.Where(x => x.Status != GroupStatStatus.Archived).ToList();
        var totalGroups = activeGroups.Count;
        var recruitingGroups = activeGroups.Count(x => x.Status == GroupStatStatus.Recruiting);
        var fullGroups = activeGroups.Count(x => x.Status is GroupStatStatus.Full or GroupStatStatus.Locked);

        var byMajor = students
            .GroupBy(x => string.IsNullOrWhiteSpace(x.Major) ? "Unassigned" : x.Major.Trim().ToUpperInvariant())
            .OrderBy(g => g.Key)
            .Select(g =>
            {
                var total = g.Count();
                var inGroup = g.Count(x => x.HasGroup);
                return new MajorBreakdownItem(g.Key, total, inGroup, total - inGroup);
            })
            .ToList();

        return new ReportSummaryResponse(
            DateTime.UtcNow,
            totalStudents,
            studentsInGroup,
            studentsWithoutGroup,
            totalGroups,
            recruitingGroups,
            fullGroups,
            byMajor);
    }

    public async Task<PagedResult<ReportSnapshotResponse>> GetSnapshotsAsync(SnapshotQuery query, CancellationToken ct = default)
    {
        var paged = await _snapshotRepo.GetPagedAsync(query.From, query.To, query.NormalizedPage, query.NormalizedPageSize, ct);
        var items = paged.Items.Select(MapSnapshot).ToList();
        return new PagedResult<ReportSnapshotResponse>(items, paged.Page, paged.PageSize, paged.TotalCount);
    }

    public async Task<ReportSnapshotResponse> GetSnapshotByIdAsync(Guid id, CancellationToken ct = default)
    {
        var snapshot = await _snapshotRepo.GetByIdAsync(id, ct)
            ?? throw new NotFoundException($"Report snapshot '{id}' was not found.");

        return MapSnapshot(snapshot);
    }

    public async Task<ReportSnapshotResponse> CreateSnapshotAsync(CancellationToken ct = default)
    {
        var summary = await GetSummaryAsync(ct);
        var snapshot = new ReportSnapshot
        {
            Id = Guid.NewGuid(),
            GeneratedAt = summary.GeneratedAt,
            TotalStudents = summary.TotalStudents,
            StudentsInGroup = summary.StudentsInGroup,
            StudentsWithoutGroup = summary.StudentsWithoutGroup,
            TotalGroups = summary.TotalGroups,
            RecruitingGroups = summary.RecruitingGroups,
            FullGroups = summary.FullGroups,
            ByMajorJson = JsonSerializer.Serialize(summary.ByMajor)
        };

        await _snapshotRepo.AddAsync(snapshot, ct);
        await _unitOfWork.SaveChangesAsync(ct);

        return MapSnapshot(snapshot);
    }

    public async Task<CsvExportResult> ExportSummaryCsvAsync(CancellationToken ct = default)
    {
        var summary = await GetSummaryAsync(ct);
        var groups = await _groupRepo.GetAllAsync(ct);
        var students = await _studentRepo.GetAllAsync(ct);

        var sb = new StringBuilder();
        sb.AppendLine("Section,Key,Value1,Value2,Value3,Value4");
        sb.AppendLine($"Summary,TotalStudents,{summary.TotalStudents},,,");
        sb.AppendLine($"Summary,StudentsInGroup,{summary.StudentsInGroup},,,");
        sb.AppendLine($"Summary,StudentsWithoutGroup,{summary.StudentsWithoutGroup},,,");
        sb.AppendLine($"Summary,TotalGroups,{summary.TotalGroups},,,");
        sb.AppendLine($"Summary,RecruitingGroups,{summary.RecruitingGroups},,,");
        sb.AppendLine($"Summary,FullGroups,{summary.FullGroups},,,");

        foreach (var major in summary.ByMajor)
        {
            sb.AppendLine($"MajorBreakdown,{EscapeCsv(major.Major)},Total:{major.TotalStudents},InGroup:{major.StudentsInGroup},WithoutGroup:{major.StudentsWithoutGroup},");
        }

        foreach (var group in groups)
        {
            sb.AppendLine($"Group,{group.GroupId},{EscapeCsv(group.Name)},{group.MemberCount}/{group.MaxMembers},{group.Status},{group.UpdatedAt:O}");
        }

        foreach (var student in students.Where(x => !x.HasGroup))
        {
            sb.AppendLine($"StudentWithoutGroup,{student.UserId},{EscapeCsv(student.FullName)},{EscapeCsv(student.Email)},{EscapeCsv(student.Major ?? "Unassigned")},{student.UpdatedAt:O}");
        }

        var content = EncodeCsvWithUtf8Bom(sb.ToString());
        var fileName = $"exe-report-{summary.GeneratedAt:yyyyMMdd-HHmmss}.csv";
        return new CsvExportResult(content, "text/csv; charset=utf-8", fileName);
    }

    public async Task<CsvExportResult> ExportSnapshotCsvAsync(Guid id, CancellationToken ct = default)
    {
        var snapshot = await GetSnapshotByIdAsync(id, ct);

        var sb = new StringBuilder();
        sb.AppendLine("Section,Key,Value1,Value2,Value3,Value4");
        sb.AppendLine($"Snapshot,Id,{snapshot.Id},,,");
        sb.AppendLine($"Snapshot,GeneratedAt,{snapshot.GeneratedAt:O},,,");
        sb.AppendLine($"Summary,TotalStudents,{snapshot.TotalStudents},,,");
        sb.AppendLine($"Summary,StudentsInGroup,{snapshot.StudentsInGroup},,,");
        sb.AppendLine($"Summary,StudentsWithoutGroup,{snapshot.StudentsWithoutGroup},,,");
        sb.AppendLine($"Summary,TotalGroups,{snapshot.TotalGroups},,,");
        sb.AppendLine($"Summary,RecruitingGroups,{snapshot.RecruitingGroups},,,");
        sb.AppendLine($"Summary,FullGroups,{snapshot.FullGroups},,,");

        foreach (var major in snapshot.ByMajor)
        {
            sb.AppendLine($"MajorBreakdown,{EscapeCsv(major.Major)},Total:{major.TotalStudents},InGroup:{major.StudentsInGroup},WithoutGroup:{major.StudentsWithoutGroup},");
        }

        var content = EncodeCsvWithUtf8Bom(sb.ToString());
        var fileName = $"exe-report-snapshot-{snapshot.GeneratedAt:yyyyMMdd-HHmmss}.csv";
        return new CsvExportResult(content, "text/csv; charset=utf-8", fileName);
    }

    public async Task<PagedResult<StudentWithoutGroupResponse>> GetStudentsWithoutGroupAsync(
        StudentsWithoutGroupQuery query,
        CancellationToken ct = default)
    {
        var paged = await _studentRepo.GetWithoutGroupPagedAsync(
            query.Major,
            query.NormalizedPage,
            query.NormalizedPageSize,
            ct);

        var items = paged.Items
            .Select(x => new StudentWithoutGroupResponse(x.UserId, x.Email, x.FullName, x.Major, x.UpdatedAt))
            .ToList();

        return new PagedResult<StudentWithoutGroupResponse>(items, paged.Page, paged.PageSize, paged.TotalCount);
    }

    public async Task<PagedResult<GroupReportItemResponse>> GetGroupsAsync(
        GroupReportQuery query,
        CancellationToken ct = default)
    {
        var paged = await _groupRepo.GetPagedAsync(
            query.Status,
            query.NormalizedPage,
            query.NormalizedPageSize,
            ct);

        var items = paged.Items
            .Select(x => new GroupReportItemResponse(
                x.GroupId,
                x.Name,
                x.LeaderId,
                x.MemberCount,
                x.MaxMembers,
                x.Status.ToString(),
                x.UpdatedAt))
            .ToList();

        return new PagedResult<GroupReportItemResponse>(items, paged.Page, paged.PageSize, paged.TotalCount);
    }

    private static byte[] EncodeCsvWithUtf8Bom(string csvText)
    {
        var utf8WithBom = new UTF8Encoding(encoderShouldEmitUTF8Identifier: true);
        var bodyBytes = utf8WithBom.GetBytes(csvText);
        var preamble = utf8WithBom.GetPreamble();
        var content = new byte[preamble.Length + bodyBytes.Length];
        Buffer.BlockCopy(preamble, 0, content, 0, preamble.Length);
        Buffer.BlockCopy(bodyBytes, 0, content, preamble.Length, bodyBytes.Length);
        return content;
    }

    private static ReportSnapshotResponse MapSnapshot(ReportSnapshot snapshot)
    {
        IReadOnlyList<MajorBreakdownItem> byMajor;
        try
        {
            byMajor = JsonSerializer.Deserialize<List<MajorBreakdownItem>>(snapshot.ByMajorJson) ?? [];
        }
        catch
        {
            byMajor = [];
        }

        return new ReportSnapshotResponse(
            snapshot.Id,
            snapshot.GeneratedAt,
            snapshot.TotalStudents,
            snapshot.StudentsInGroup,
            snapshot.StudentsWithoutGroup,
            snapshot.TotalGroups,
            snapshot.RecruitingGroups,
            snapshot.FullGroups,
            byMajor);
    }

    private static string EscapeCsv(string value)
    {
        if (value.Contains(',') || value.Contains('"') || value.Contains('\n') || value.Contains('\r'))
        {
            return $"\"{value.Replace("\"", "\"\"")}\"";
        }
        return value;
    }
}
