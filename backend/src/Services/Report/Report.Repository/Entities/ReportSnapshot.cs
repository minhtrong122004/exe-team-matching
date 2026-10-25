namespace Report.Repository.Entities;

/// <summary>
/// Bản chụp thống kê định kỳ do ReportSnapshotWorker tạo (CLAUDE.md mục 6, 8).
/// </summary>
public class ReportSnapshot
{
    public Guid Id { get; set; }
    public DateTime GeneratedAt { get; set; }
    public int TotalStudents { get; set; }
    public int StudentsInGroup { get; set; }
    public int StudentsWithoutGroup { get; set; }
    public int TotalGroups { get; set; }
    public int RecruitingGroups { get; set; }
    public int FullGroups { get; set; }
    public string ByMajorJson { get; set; } = "{}";
}
