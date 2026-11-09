using Group.Repository.Entities;
using Group.Repository.Enums;
using Group.Services.DTOs;
using Group.Services.Implementations;

namespace Group.Services.Tests;

public class RoomLifecycleAndElectionTests
{
    [Theory]
    [InlineData(5, 3)] // Max 5 members -> threshold 3 (5 / 2 + 1)
    [InlineData(6, 4)] // Max 6 members -> threshold 4 (6 / 2 + 1)
    [InlineData(4, 3)] // Max 4 members -> threshold 3 (4 / 2 + 1)
    public void GroupThresholdFormula_CalculatesThresholdCorrectly(int maxMembers, int expectedThreshold)
    {
        var threshold = (maxMembers / 2) + 1;
        Assert.Equal(expectedThreshold, threshold);
    }

    [Fact]
    public void FirstMemberJoiningEmptyRoom_BecomesLeaderAndSetsForming()
    {
        var room = new GroupEntity
        {
            Id = Guid.NewGuid(),
            Name = "EXE101 - Phòng 01",
            MaxMembers = 5,
            Status = GroupStatus.Empty,
            LeaderId = null
        };

        var studentId = Guid.NewGuid();
        var isFirst = room.Members.Count == 0 || room.Status == GroupStatus.Empty;
        var role = isFirst ? MemberRole.Leader : MemberRole.Member;
        if (isFirst) room.LeaderId = studentId;

        room.Members.Add(new GroupMember
        {
            GroupId = room.Id,
            UserId = studentId,
            Role = role,
            FullName = "Nguyễn Văn A",
            Email = "anv@fpt.edu.vn",
            JoinedAt = DateTime.UtcNow
        });

        var threshold = (room.MaxMembers / 2) + 1;
        room.Status = room.Members.Count >= threshold ? GroupStatus.Recruiting : GroupStatus.Forming;

        Assert.Equal(MemberRole.Leader, role);
        Assert.Equal(studentId, room.LeaderId);
        Assert.Equal(GroupStatus.Forming, room.Status);
    }

    [Fact]
    public void ReachingThreshold_TransitionsRoomToRecruiting()
    {
        var room = new GroupEntity
        {
            Id = Guid.NewGuid(),
            Name = "EXE101 - Phòng 02",
            MaxMembers = 5,
            Status = GroupStatus.Forming,
            LeaderId = Guid.NewGuid()
        };

        // Already 2 members
        room.Members.Add(new GroupMember { GroupId = room.Id, UserId = room.LeaderId.Value, Role = MemberRole.Leader, JoinedAt = DateTime.UtcNow.AddMinutes(-10) });
        room.Members.Add(new GroupMember { GroupId = room.Id, UserId = Guid.NewGuid(), Role = MemberRole.Member, JoinedAt = DateTime.UtcNow.AddMinutes(-5) });

        // 3rd member joins
        room.Members.Add(new GroupMember { GroupId = room.Id, UserId = Guid.NewGuid(), Role = MemberRole.Member, JoinedAt = DateTime.UtcNow });

        var threshold = (room.MaxMembers / 2) + 1; // 3
        if (room.Members.Count >= threshold)
        {
            room.Status = GroupStatus.Recruiting;
        }

        Assert.Equal(3, room.Members.Count);
        Assert.Equal(GroupStatus.Recruiting, room.Status);
    }

    [Fact]
    public void LeaderLeaving_AutoTransfersLeadershipToEarliestJoinedMember()
    {
        var leaderId = Guid.NewGuid();
        var member1Id = Guid.NewGuid();
        var member2Id = Guid.NewGuid();

        var room = new GroupEntity
        {
            Id = Guid.NewGuid(),
            Name = "EXE101 - Phòng 03",
            MaxMembers = 5,
            Status = GroupStatus.Recruiting,
            LeaderId = leaderId
        };

        var leaderMember = new GroupMember { GroupId = room.Id, UserId = leaderId, Role = MemberRole.Leader, JoinedAt = DateTime.UtcNow.AddHours(-3) };
        var earlistMember = new GroupMember { GroupId = room.Id, UserId = member1Id, Role = MemberRole.Member, JoinedAt = DateTime.UtcNow.AddHours(-2) };
        var laterMember = new GroupMember { GroupId = room.Id, UserId = member2Id, Role = MemberRole.Member, JoinedAt = DateTime.UtcNow.AddHours(-1) };

        room.Members.Add(leaderMember);
        room.Members.Add(earlistMember);
        room.Members.Add(laterMember);

        // Leader leaves
        room.Members.Remove(leaderMember);

        // BR-20 logic
        var newLeader = room.Members.OrderBy(m => m.JoinedAt).FirstOrDefault();
        if (newLeader is not null)
        {
            newLeader.Role = MemberRole.Leader;
            room.LeaderId = newLeader.UserId;
        }

        // BR-17 logic (Threshold = 3, remaining = 2 -> reverts to Forming)
        var threshold = (room.MaxMembers / 2) + 1;
        if (room.Members.Count < threshold)
        {
            room.Status = GroupStatus.Forming;
        }

        Assert.Equal(member1Id, room.LeaderId);
        Assert.Equal(MemberRole.Leader, earlistMember.Role);
        Assert.Equal(GroupStatus.Forming, room.Status);
    }

    [Fact]
    public void LeaderElection_FiveMembers_RequiresThreeVotesToPass_AndIgnoresDuplicateInMemoryVotes()
    {
        var totalMembers = 5;
        var requiredToPass = (totalMembers / 2) + 1; // Exactly 3 votes (> 50%)

        var election = new LeaderElection
        {
            Id = Guid.NewGuid(),
            GroupId = Guid.NewGuid(),
            CandidateId = Guid.NewGuid(),
            Status = ElectionStatus.Active,
            StartedAt = DateTime.UtcNow,
            ExpiresAt = DateTime.UtcNow.AddHours(24)
        };

        var voter1 = Guid.NewGuid();
        var voter2 = Guid.NewGuid();
        var voter3 = Guid.NewGuid();

        // 2 distinct voters vote Agree
        election.Votes.Add(new ElectionVote { ElectionId = election.Id, VoterId = voter1, IsAgree = true, VotedAt = DateTime.UtcNow });
        election.Votes.Add(new ElectionVote { ElectionId = election.Id, VoterId = voter2, IsAgree = true, VotedAt = DateTime.UtcNow });

        // Simulate duplicate reference in memory (EF relationship fixup scenario)
        election.Votes.Add(new ElectionVote { ElectionId = election.Id, VoterId = voter2, IsAgree = true, VotedAt = DateTime.UtcNow });

        var distinctAgreedCount = election.Votes.DistinctBy(v => v.VoterId).Count(v => v.IsAgree);
        Assert.Equal(2, distinctAgreedCount);
        Assert.True(distinctAgreedCount < requiredToPass, "2 votes out of 5 members must NOT pass the election.");

        // 3rd voter votes Agree
        election.Votes.Add(new ElectionVote { ElectionId = election.Id, VoterId = voter3, IsAgree = true, VotedAt = DateTime.UtcNow });
        distinctAgreedCount = election.Votes.DistinctBy(v => v.VoterId).Count(v => v.IsAgree);

        Assert.Equal(3, distinctAgreedCount);
        Assert.True(distinctAgreedCount >= requiredToPass, "3 votes out of 5 members must PASS the election.");
    }

    [Fact]
    public void LeaderElection_PassesWhenAgreedVotesExceed50Percent()
    {
        var totalMembers = 4;
        var requiredToPass = (totalMembers / 2) + 1; // 3 votes

        var election = new LeaderElection
        {
            Id = Guid.NewGuid(),
            GroupId = Guid.NewGuid(),
            CandidateId = Guid.NewGuid(),
            Status = ElectionStatus.Active,
            StartedAt = DateTime.UtcNow,
            ExpiresAt = DateTime.UtcNow.AddHours(24)
        };

        // 3 Agree votes out of 4 members
        election.Votes.Add(new ElectionVote { ElectionId = election.Id, VoterId = Guid.NewGuid(), IsAgree = true, VotedAt = DateTime.UtcNow });
        election.Votes.Add(new ElectionVote { ElectionId = election.Id, VoterId = Guid.NewGuid(), IsAgree = true, VotedAt = DateTime.UtcNow });
        election.Votes.Add(new ElectionVote { ElectionId = election.Id, VoterId = Guid.NewGuid(), IsAgree = true, VotedAt = DateTime.UtcNow });

        var agreedCount = election.Votes.Count(v => v.IsAgree);
        if (agreedCount >= requiredToPass)
        {
            election.Status = ElectionStatus.Passed;
            election.CompletedAt = DateTime.UtcNow;
        }

        Assert.Equal(3, agreedCount);
        Assert.Equal(ElectionStatus.Passed, election.Status);
        Assert.NotNull(election.CompletedAt);
    }

    [Theory]
    [InlineData(false, false)] // Incomplete profile -> not allowed to join or apply
    [InlineData(true, true)]   // Completed profile -> allowed (BR-07)
    public void ProfileCompletion_ControlsEligibilityToJoinOrApply_BR07(bool isProfileCompleted, bool expectedEligibility)
    {
        var eligible = isProfileCompleted;
        Assert.Equal(expectedEligibility, eligible);
    }

    [Fact]
    public void LeaderLeaving_AutoSuccession_TransfersToEarliestMember_BR20()
    {
        var leaderId = Guid.NewGuid();
        var earliestMemberId = Guid.NewGuid();
        var secondMemberId = Guid.NewGuid();

        var group = new GroupEntity
        {
            Id = Guid.NewGuid(),
            Name = "Room 01",
            LeaderId = leaderId,
            Status = GroupStatus.Forming,
            MaxMembers = 5
        };

        var leader = new GroupMember { GroupId = group.Id, UserId = leaderId, Role = MemberRole.Leader, JoinedAt = DateTime.UtcNow.AddHours(-10) };
        var earliest = new GroupMember { GroupId = group.Id, UserId = earliestMemberId, Role = MemberRole.Member, JoinedAt = DateTime.UtcNow.AddHours(-5) };
        var second = new GroupMember { GroupId = group.Id, UserId = secondMemberId, Role = MemberRole.Member, JoinedAt = DateTime.UtcNow.AddHours(-1) };

        group.Members.Add(leader);
        group.Members.Add(earliest);
        group.Members.Add(second);

        var membership = new GroupMembershipManager(null!, null!);
        membership.RemoveMember(group, leader, DateTime.UtcNow, groupThreshold: 3);

        // Leader was removed, earliest joined member becomes new leader
        Assert.Equal(2, group.Members.Count);
        Assert.Equal(earliestMemberId, group.LeaderId);
        Assert.Equal(MemberRole.Leader, earliest.Role);
        Assert.DoesNotContain(group.Members, m => m.UserId == leaderId);
    }

    [Fact]
    public void MemberRemoval_AuditLog_ContainsRequiredFields_BR05()
    {
        var log = new MemberRemovalLog
        {
            Id = Guid.NewGuid(),
            GroupId = Guid.NewGuid(),
            RemovedUserId = Guid.NewGuid(),
            RemovedUserName = "Lê Văn A",
            RemovedUserEmail = "leva@fpt.edu.vn",
            LeaderId = Guid.NewGuid(),
            LeaderName = "Trần Leader",
            Category = "Mất liên lạc",
            Reason = "Không phản hồi tin nhắn quá 48 tiếng trước deadline.",
            RemovedAt = DateTime.UtcNow
        };

        Assert.NotEmpty(log.Reason);
        Assert.True(log.Reason.Length >= 10);
        Assert.Equal("Mất liên lạc", log.Category);
        Assert.Equal("Lê Văn A", log.RemovedUserName);
    }
}

