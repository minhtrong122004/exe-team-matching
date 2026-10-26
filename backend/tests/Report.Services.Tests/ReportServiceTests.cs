using System.Text;
using Exe.BuildingBlocks.Web;
using Report.Repository.Entities;
using Report.Repository.Enums;
using Report.Services.DTOs;
using Report.Services.Implementations;
using Report.Services.Tests.TestDoubles;

namespace Report.Services.Tests;

public class ReportServiceTests
{
    private readonly FakeStudentStatRepository _studentRepo = new();
    private readonly FakeGroupStatRepository _groupRepo = new();
    private readonly FakeReportSnapshotRepository _snapshotRepo = new();
    private readonly FakeReportUnitOfWork _unitOfWork = new();
    private readonly ReportService _sut;

    public ReportServiceTests()
    {
        _sut = new ReportService(_studentRepo, _groupRepo, _snapshotRepo, _unitOfWork);
        SeedSampleData();
    }

    private void SeedSampleData()
    {
        var group1 = Guid.NewGuid();
        _studentRepo.Items.AddRange(
        [
            new StudentStat { UserId = Guid.NewGuid(), Email = "se1@fpt.edu.vn", FullName = "SE Student 1", Major = "SE", HasGroup = true, GroupId = group1, UpdatedAt = DateTime.UtcNow },
            new StudentStat { UserId = Guid.NewGuid(), Email = "se2@fpt.edu.vn", FullName = "SE Student 2", Major = "SE", HasGroup = false, GroupId = null, UpdatedAt = DateTime.UtcNow },
            new StudentStat { UserId = Guid.NewGuid(), Email = "ai1@fpt.edu.vn", FullName = "AI Student 1", Major = "AI", HasGroup = false, GroupId = null, UpdatedAt = DateTime.UtcNow }
        ]);

        _groupRepo.Items.AddRange(
        [
            new GroupStat { GroupId = group1, Name = "Team Alpha", LeaderId = Guid.NewGuid(), MemberCount = 3, MaxMembers = 5, Status = GroupStatStatus.Recruiting, UpdatedAt = DateTime.UtcNow },
            new GroupStat { GroupId = Guid.NewGuid(), Name = "Team Beta", LeaderId = Guid.NewGuid(), MemberCount = 5, MaxMembers = 5, Status = GroupStatStatus.Full, UpdatedAt = DateTime.UtcNow }
        ]);
    }

    [Fact]
    public async Task GetSummaryAsync_CalculatesTotalsAndByMajorBreakdown()
    {
        var summary = await _sut.GetSummaryAsync();

        Assert.Equal(3, summary.TotalStudents);
        Assert.Equal(1, summary.StudentsInGroup);
        Assert.Equal(2, summary.StudentsWithoutGroup);
        Assert.Equal(2, summary.TotalGroups);
        Assert.Equal(1, summary.RecruitingGroups);
        Assert.Equal(1, summary.FullGroups);

        var se = Assert.Single(summary.ByMajor, x => x.Major == "SE");
        Assert.Equal(2, se.TotalStudents);
        Assert.Equal(1, se.StudentsInGroup);
        Assert.Equal(1, se.StudentsWithoutGroup);
    }

    [Fact]
    public async Task CreateSnapshotAsync_PersistsSnapshotAndReturnsDto()
    {
        var snapshot = await _sut.CreateSnapshotAsync();

        Assert.Single(_snapshotRepo.Items);
        Assert.Equal(3, snapshot.TotalStudents);
        Assert.Equal(2, snapshot.TotalGroups);
        Assert.Equal(1, _unitOfWork.SaveChangesCount);
    }

    [Fact]
    public async Task GetSnapshotByIdAsync_WhenFound_ReturnsSnapshotDto()
    {
        var created = await _sut.CreateSnapshotAsync();

        var fetched = await _sut.GetSnapshotByIdAsync(created.Id);

        Assert.Equal(created.Id, fetched.Id);
        Assert.Equal(3, fetched.TotalStudents);
    }

    [Fact]
    public async Task GetSnapshotByIdAsync_WhenMissing_ThrowsNotFoundException()
    {
        await Assert.ThrowsAsync<NotFoundException>(() => _sut.GetSnapshotByIdAsync(Guid.NewGuid()));
    }

    [Fact]
    public async Task ExportSnapshotCsvAsync_IncludesUtf8BomAndSnapshotId()
    {
        var created = await _sut.CreateSnapshotAsync();

        var csv = await _sut.ExportSnapshotCsvAsync(created.Id);

        Assert.Equal("text/csv; charset=utf-8", csv.ContentType);
        Assert.StartsWith("exe-report-snapshot-", csv.FileName);
        Assert.Equal(0xEF, csv.Content[0]);
        Assert.Equal(0xBB, csv.Content[1]);
        Assert.Equal(0xBF, csv.Content[2]);

        var text = Encoding.UTF8.GetString(csv.Content[3..]);
        Assert.Contains(created.Id.ToString(), text);
        Assert.Contains("TotalStudents,3", text);
    }

    [Fact]
    public async Task ExportSummaryCsvAsync_IncludesUtf8BomAndSummaryRows()
    {
        var csv = await _sut.ExportSummaryCsvAsync();

        Assert.Equal("text/csv; charset=utf-8", csv.ContentType);
        Assert.StartsWith("exe-report-", csv.FileName);
        Assert.True(csv.Content.Length > 3);
        Assert.Equal(0xEF, csv.Content[0]);
        Assert.Equal(0xBB, csv.Content[1]);
        Assert.Equal(0xBF, csv.Content[2]);

        var text = Encoding.UTF8.GetString(csv.Content[3..]);
        Assert.Contains("TotalStudents,3", text);
        Assert.Contains("Team Alpha", text);
        Assert.Contains("SE Student 2", text);
    }

    [Fact]
    public async Task GetStudentsWithoutGroupAsync_FiltersByMajor()
    {
        var result = await _sut.GetStudentsWithoutGroupAsync(new StudentsWithoutGroupQuery { Major = "SE", Page = 1, PageSize = 10 });

        Assert.Single(result.Items);
        Assert.Equal("SE Student 2", result.Items[0].FullName);
    }

    [Fact]
    public async Task GetGroupsAsync_FiltersByStatus()
    {
        var result = await _sut.GetGroupsAsync(new GroupReportQuery { Status = GroupStatStatus.Full, Page = 1, PageSize = 10 });

        Assert.Single(result.Items);
        Assert.Equal("Team Beta", result.Items[0].Name);
        Assert.Equal("Full", result.Items[0].Status);
    }
}
