namespace Report.Services.DTOs;

public class SnapshotOptions
{
    public const string SectionName = "ReportSnapshot";

    public int IntervalMinutes { get; set; } = 15;
}
