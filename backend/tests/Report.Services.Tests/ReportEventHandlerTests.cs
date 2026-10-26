using Exe.Contracts.Events;
using Microsoft.Extensions.Logging.Abstractions;
using Report.Repository.Entities;
using Report.Repository.Enums;
using Report.Services.Implementations;
using Report.Services.Tests.TestDoubles;

namespace Report.Services.Tests;

public class ReportEventHandlerTests
{
    private readonly FakeStudentStatRepository _studentRepo = new();
    private readonly FakeGroupStatRepository _groupRepo = new();
    private readonly FakeProcessedEventRepository _processedRepo = new();
    private readonly FakeReportUnitOfWork _unitOfWork = new();
    private readonly ReportEventHandler _sut;

    public ReportEventHandlerTests()
    {
        _sut = new ReportEventHandler(
            _studentRepo,
            _groupRepo,
            _processedRepo,
            _unitOfWork,
            NullLogger<ReportEventHandler>.Instance);
    }

    [Fact]
    public async Task HandleUserRegisteredAsync_WhenRoleIsStudent_CreatesStudentStatAndProcessedEvent()
    {
        var eventId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        var ev = new UserRegistered(userId, "student@fpt.edu.vn", "Nguyen Van A", "Student");

        var processed = await _sut.HandleUserRegisteredAsync(ev, eventId);

        Assert.True(processed);
        Assert.Single(_studentRepo.Items);
        Assert.Equal(userId, _studentRepo.Items[0].UserId);
        Assert.False(_studentRepo.Items[0].HasGroup);
        Assert.Contains(eventId, _processedRepo.ProcessedIds);
        Assert.Equal(1, _unitOfWork.SaveChangesCount);
    }

    [Fact]
    public async Task HandleUserRegisteredAsync_WhenRoleIsLecturer_SkipsStudentStatButRecordsProcessedEvent()
    {
        var eventId = Guid.NewGuid();
        var ev = new UserRegistered(Guid.NewGuid(), "lecturer@fpt.edu.vn", "Lecturer A", "Lecturer");

        var processed = await _sut.HandleUserRegisteredAsync(ev, eventId);

        Assert.True(processed);
        Assert.Empty(_studentRepo.Items);
        Assert.Contains(eventId, _processedRepo.ProcessedIds);
    }

    [Fact]
    public async Task HandleUserRegisteredAsync_WhenDuplicateEvent_IsIdempotent()
    {
        var eventId = Guid.NewGuid();
        _processedRepo.ProcessedIds.Add(eventId);
        var ev = new UserRegistered(Guid.NewGuid(), "student@fpt.edu.vn", "Nguyen Van A", "Student");

        var processed = await _sut.HandleUserRegisteredAsync(ev, eventId);

        Assert.False(processed);
        Assert.Empty(_studentRepo.Items);
    }

    [Fact]
    public async Task HandleUserProfileUpdatedAsync_UpdatesFullNameAndMajor()
    {
        var userId = Guid.NewGuid();
        _studentRepo.Items.Add(new StudentStat
        {
            UserId = userId,
            Email = "student@fpt.edu.vn",
            FullName = "Old Name",
            Major = null
        });

        var ev = new UserProfileUpdated(userId, "New Name", "SE");
        var processed = await _sut.HandleUserProfileUpdatedAsync(ev, Guid.NewGuid());

        Assert.True(processed);
        Assert.Equal("New Name", _studentRepo.Items[0].FullName);
        Assert.Equal("SE", _studentRepo.Items[0].Major);
    }

    [Fact]
    public async Task HandleGroupCreatedAsync_CreatesGroupStatAndMarksLeaderInGroup()
    {
        var leaderId = Guid.NewGuid();
        var groupId = Guid.NewGuid();
        _studentRepo.Items.Add(new StudentStat
        {
            UserId = leaderId,
            Email = "leader@fpt.edu.vn",
            FullName = "Leader Name",
            Major = "SE",
            HasGroup = false
        });

        var ev = new GroupCreated(groupId, "EduTech Innovators", leaderId, 5);
        var processed = await _sut.HandleGroupCreatedAsync(ev, Guid.NewGuid());

        Assert.True(processed);
        Assert.Single(_groupRepo.Items);
        Assert.Equal(groupId, _groupRepo.Items[0].GroupId);
        Assert.Equal(1, _groupRepo.Items[0].MemberCount);
        Assert.Equal(GroupStatStatus.Recruiting, _groupRepo.Items[0].Status);
        Assert.True(_studentRepo.Items[0].HasGroup);
        Assert.Equal(groupId, _studentRepo.Items[0].GroupId);
    }

    [Fact]
    public async Task HandleMemberJoinedAsync_UpdatesStudentHasGroupAndMarksGroupFullWhenAtMaxMembers()
    {
        var groupId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        _groupRepo.Items.Add(new GroupStat
        {
            GroupId = groupId,
            Name = "EduTech Innovators",
            LeaderId = Guid.NewGuid(),
            MemberCount = 4,
            MaxMembers = 5,
            Status = GroupStatStatus.Recruiting
        });
        _studentRepo.Items.Add(new StudentStat
        {
            UserId = userId,
            Email = "student@fpt.edu.vn",
            FullName = "Member 5",
            HasGroup = false
        });

        var ev = new MemberJoined(groupId, "EduTech Innovators", userId, "student@fpt.edu.vn", "Member 5", 5, 5);
        var processed = await _sut.HandleMemberJoinedAsync(ev, Guid.NewGuid());

        Assert.True(processed);
        Assert.True(_studentRepo.Items[0].HasGroup);
        Assert.Equal(groupId, _studentRepo.Items[0].GroupId);
        Assert.Equal(5, _groupRepo.Items[0].MemberCount);
        Assert.Equal(GroupStatStatus.Full, _groupRepo.Items[0].Status);
    }

    [Fact]
    public async Task HandleMemberLeftAsync_ClearsStudentGroupAndReopensGroupStatus()
    {
        var groupId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        _groupRepo.Items.Add(new GroupStat
        {
            GroupId = groupId,
            Name = "EduTech Innovators",
            LeaderId = Guid.NewGuid(),
            MemberCount = 5,
            MaxMembers = 5,
            Status = GroupStatStatus.Full
        });
        _studentRepo.Items.Add(new StudentStat
        {
            UserId = userId,
            Email = "student@fpt.edu.vn",
            FullName = "Member 5",
            HasGroup = true,
            GroupId = groupId
        });

        var ev = new MemberLeft(groupId, "EduTech Innovators", userId, 4);
        var processed = await _sut.HandleMemberLeftAsync(ev, Guid.NewGuid());

        Assert.True(processed);
        Assert.False(_studentRepo.Items[0].HasGroup);
        Assert.Null(_studentRepo.Items[0].GroupId);
        Assert.Equal(4, _groupRepo.Items[0].MemberCount);
        Assert.Equal(GroupStatStatus.Recruiting, _groupRepo.Items[0].Status);
    }
}
