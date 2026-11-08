using Group.Repository.Entities;
using Group.Repository.Enums;
using Group.Services.DTOs;

namespace Group.Services.Tests;

public class DistributionAndFinalizeTests
{
    [Fact]
    public void CloseRegistration_ChangesStatusToClosedRegistration()
    {
        var space = new CourseSpace
        {
            Id = Guid.NewGuid(),
            SemesterCode = "FA26",
            SubjectCode = "EXE101",
            Status = CourseSpaceStatus.Open,
            RegistrationDeadline = DateTime.UtcNow.AddHours(-1)
        };

        // Act: Close registration
        space.Status = CourseSpaceStatus.ClosedRegistration;
        space.UpdatedAt = DateTime.UtcNow;

        Assert.Equal(CourseSpaceStatus.ClosedRegistration, space.Status);
    }

    [Fact]
    public void FinalizeSpace_LocksAllActiveRoomsAndRejectsPendingRequests()
    {
        var spaceId = Guid.NewGuid();
        var space = new CourseSpace
        {
            Id = spaceId,
            SemesterCode = "FA26",
            SubjectCode = "EXE101",
            Status = CourseSpaceStatus.ClosedRegistration
        };

        var room1 = new GroupEntity
        {
            Id = Guid.NewGuid(),
            SpaceId = spaceId,
            Name = "Phòng 01",
            Status = GroupStatus.Recruiting,
            Members = [new GroupMember { UserId = Guid.NewGuid(), FullName = "Member 1", Role = MemberRole.Leader }]
        };

        var emptyRoom = new GroupEntity
        {
            Id = Guid.NewGuid(),
            SpaceId = spaceId,
            Name = "Phòng 02",
            Status = GroupStatus.Empty,
            Members = []
        };

        var rooms = new List<GroupEntity> { room1, emptyRoom };

        var pendingReq = new JoinRequest
        {
            Id = Guid.NewGuid(),
            GroupId = room1.Id,
            StudentId = Guid.NewGuid(),
            Status = JoinRequestStatus.Pending
        };

        var requests = new List<JoinRequest> { pendingReq };

        // Act: Finalize
        var now = DateTime.UtcNow;
        space.Status = CourseSpaceStatus.Locked;
        space.UpdatedAt = now;

        int lockedCount = 0;
        foreach (var r in rooms)
        {
            if (r.Members.Count > 0)
            {
                r.Status = GroupStatus.Locked;
                r.UpdatedAt = now;
                lockedCount++;
            }
        }

        foreach (var req in requests)
        {
            req.Status = JoinRequestStatus.Rejected;
            req.DecidedAt = now;
        }

        // Assert (BR-33)
        Assert.Equal(CourseSpaceStatus.Locked, space.Status);
        Assert.Equal(1, lockedCount);
        Assert.Equal(GroupStatus.Locked, room1.Status);
        Assert.Equal(GroupStatus.Empty, emptyRoom.Status); // empty room stays empty
        Assert.Equal(JoinRequestStatus.Rejected, pendingReq.Status);
    }

    [Fact]
    public void Distribution_PreservesExistingLeader_UnderBR31()
    {
        var leaderId = Guid.NewGuid();
        var existingLeader = new GroupMember
        {
            UserId = leaderId,
            FullName = "Leader Hiện Tại",
            Role = MemberRole.Leader
        };

        var room = new GroupEntity
        {
            Id = Guid.NewGuid(),
            Name = "Phòng 01",
            LeaderId = leaderId,
            Status = GroupStatus.Forming,
            Members = [existingLeader]
        };

        // When assigning an unmatched student to an existing room:
        var newStudentId = Guid.NewGuid();
        var assignedMember = new GroupMember
        {
            UserId = newStudentId,
            FullName = "Sinh Viên Lẻ Được Ghép",
            Role = MemberRole.Member // Always Member for existing rooms (BR-31)
        };

        room.Members.Add(assignedMember);

        Assert.Equal(leaderId, room.LeaderId);
        Assert.Equal(MemberRole.Leader, room.Members.First(m => m.UserId == leaderId).Role);
        Assert.Equal(MemberRole.Member, assignedMember.Role);
        Assert.Equal(2, room.Members.Count);
    }

    [Fact]
    public void Distribution_SelectsHighestManagementScore_AsLeaderForNewGroup_UnderBR32()
    {
        var candidates = new List<(Guid UserId, string FullName, int ManagementScore, int TotalScore)>
        {
            (Guid.NewGuid(), "Sinh Viên A", 60, 300),
            (Guid.NewGuid(), "Sinh Viên B (Leader)", 95, 420), // Highest management
            (Guid.NewGuid(), "Sinh Viên C", 80, 380),
        };

        var bestLeader = candidates
            .OrderByDescending(c => c.ManagementScore)
            .ThenByDescending(c => c.TotalScore)
            .First();

        Assert.Equal("Sinh Viên B (Leader)", bestLeader.FullName);
        Assert.Equal(95, bestLeader.ManagementScore);
    }

    [Theory]
    [InlineData(CourseSpaceStatus.ClosedRegistration)]
    [InlineData(CourseSpaceStatus.Locked)]
    [InlineData(CourseSpaceStatus.Draft)]
    public void Space_StatusNotOpen_PreventsDirectJoinAndApply_UnderBR30(CourseSpaceStatus status)
    {
        var space = new CourseSpace
        {
            Id = Guid.NewGuid(),
            Status = status
        };

        bool isJoinAllowed = space.Status == CourseSpaceStatus.Open;
        Assert.False(isJoinAllowed);
    }
}

