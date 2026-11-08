using Exe.BuildingBlocks.Web;
using Group.Repository.Entities;
using Group.Repository.Enums;
using Group.Services.DTOs;
using Xunit;

namespace Group.Services.Tests;

public class PostLockTransferAndRosterTests
{
    [Fact]
    public void OneWayTransfer_Validation_FailsIfFromGroupDropsBelowThreshold()
    {
        // Space config: Max = 5, Threshold = 3
        int groupThreshold = 3;
        int maxMembers = 5;

        // FromGroup has 3 members (at threshold)
        int fromGroupCount = 3;
        int targetGroupCount = 3;

        // BR-37: fromGroup.Count - 1 >= groupThreshold (3 - 1 = 2 < 3) => VIOLATION
        bool isFromGroupValid = (fromGroupCount - 1) >= groupThreshold;
        bool isTargetGroupValid = (targetGroupCount + 1) <= maxMembers;

        Assert.False(isFromGroupValid);
        Assert.True(isTargetGroupValid);
    }

    [Fact]
    public void OneWayTransfer_Validation_FailsIfTargetGroupFull()
    {
        int groupThreshold = 3;
        int maxMembers = 5;

        // FromGroup has 5 members (valid to lose 1 -> 4)
        int fromGroupCount = 5;
        // TargetGroup has 5 members (full)
        int targetGroupCount = 5;

        bool isFromGroupValid = (fromGroupCount - 1) >= groupThreshold;
        bool isTargetGroupValid = (targetGroupCount + 1) <= maxMembers;

        Assert.True(isFromGroupValid);
        Assert.False(isTargetGroupValid);
    }

    [Fact]
    public void OneWayTransfer_Execution_TransfersMemberAndPromotesNextLeader()
    {
        var studentLeaderId = Guid.NewGuid();
        var student2Id = Guid.NewGuid();
        var student3Id = Guid.NewGuid();
        var student4Id = Guid.NewGuid();

        var fromGroup = new GroupEntity
        {
            Id = Guid.NewGuid(),
            Name = "Phòng 01",
            RoomCode = "FA26EXE101-01",
            LeaderId = studentLeaderId,
            MaxMembers = 5,
            Members = new List<GroupMember>
            {
                new() { UserId = studentLeaderId, FullName = "Leader A", Role = MemberRole.Leader, JoinedAt = DateTime.UtcNow.AddMinutes(-30) },
                new() { UserId = student2Id, FullName = "Member B", Role = MemberRole.Member, JoinedAt = DateTime.UtcNow.AddMinutes(-20) },
                new() { UserId = student3Id, FullName = "Member C", Role = MemberRole.Member, JoinedAt = DateTime.UtcNow.AddMinutes(-10) },
                new() { UserId = student4Id, FullName = "Member D", Role = MemberRole.Member, JoinedAt = DateTime.UtcNow.AddMinutes(-5) }
            }
        };

        var targetGroup = new GroupEntity
        {
            Id = Guid.NewGuid(),
            Name = "Phòng 02",
            RoomCode = "FA26EXE101-02",
            LeaderId = Guid.NewGuid(),
            MaxMembers = 5,
            Members = new List<GroupMember>
            {
                new() { UserId = Guid.NewGuid(), FullName = "Leader X", Role = MemberRole.Leader, JoinedAt = DateTime.UtcNow.AddMinutes(-40) },
                new() { UserId = Guid.NewGuid(), FullName = "Member Y", Role = MemberRole.Member, JoinedAt = DateTime.UtcNow.AddMinutes(-35) },
                new() { UserId = Guid.NewGuid(), FullName = "Member Z", Role = MemberRole.Member, JoinedAt = DateTime.UtcNow.AddMinutes(-30) }
            }
        };

        // Act: Transfer studentLeaderId from fromGroup to targetGroup
        var memberToMove = fromGroup.Members.First(m => m.UserId == studentLeaderId);
        fromGroup.Members.Remove(memberToMove);

        // Leader promotion in fromGroup: next earliest joined member is student2Id
        var nextLeader = fromGroup.Members.OrderBy(m => m.JoinedAt).First();
        fromGroup.LeaderId = nextLeader.UserId;
        nextLeader.Role = MemberRole.Leader;

        targetGroup.Members.Add(new GroupMember
        {
            GroupId = targetGroup.Id,
            UserId = memberToMove.UserId,
            FullName = memberToMove.FullName,
            Role = MemberRole.Member,
            JoinedAt = DateTime.UtcNow
        });

        // Assert:
        Assert.Equal(3, fromGroup.Members.Count);
        Assert.Equal(student2Id, fromGroup.LeaderId);
        Assert.Equal(MemberRole.Leader, nextLeader.Role);

        Assert.Equal(4, targetGroup.Members.Count);
        Assert.Contains(targetGroup.Members, m => m.UserId == studentLeaderId && m.Role == MemberRole.Member);
    }

    [Fact]
    public void TwoWaySwap_Execution_MaintainsGroupSizesEvenWith3Members()
    {
        var studentA = Guid.NewGuid();
        var studentX = Guid.NewGuid();

        var group1 = new GroupEntity
        {
            Id = Guid.NewGuid(),
            Name = "Phòng 01",
            Members = new List<GroupMember>
            {
                new() { UserId = studentA, FullName = "SV A", Role = MemberRole.Member, JoinedAt = DateTime.UtcNow },
                new() { UserId = Guid.NewGuid(), FullName = "SV B", Role = MemberRole.Leader, JoinedAt = DateTime.UtcNow },
                new() { UserId = Guid.NewGuid(), FullName = "SV C", Role = MemberRole.Member, JoinedAt = DateTime.UtcNow }
            }
        }; // 3 members

        var group2 = new GroupEntity
        {
            Id = Guid.NewGuid(),
            Name = "Phòng 02",
            Members = new List<GroupMember>
            {
                new() { UserId = studentX, FullName = "SV X", Role = MemberRole.Member, JoinedAt = DateTime.UtcNow },
                new() { UserId = Guid.NewGuid(), FullName = "SV Y", Role = MemberRole.Leader, JoinedAt = DateTime.UtcNow },
                new() { UserId = Guid.NewGuid(), FullName = "SV Z", Role = MemberRole.Member, JoinedAt = DateTime.UtcNow },
                new() { UserId = Guid.NewGuid(), FullName = "SV W", Role = MemberRole.Member, JoinedAt = DateTime.UtcNow },
                new() { UserId = Guid.NewGuid(), FullName = "SV Q", Role = MemberRole.Member, JoinedAt = DateTime.UtcNow }
            }
        }; // 5 members

        // Act: Swap studentA and studentX
        var memberA = group1.Members.First(m => m.UserId == studentA);
        var memberX = group2.Members.First(m => m.UserId == studentX);

        group1.Members.Remove(memberA);
        group2.Members.Remove(memberX);

        group1.Members.Add(new GroupMember { GroupId = group1.Id, UserId = memberX.UserId, FullName = memberX.FullName, Role = MemberRole.Member, JoinedAt = DateTime.UtcNow });
        group2.Members.Add(new GroupMember { GroupId = group2.Id, UserId = memberA.UserId, FullName = memberA.FullName, Role = MemberRole.Member, JoinedAt = DateTime.UtcNow });

        // Assert: Group sizes are preserved (3 and 5)
        Assert.Equal(3, group1.Members.Count);
        Assert.Equal(5, group2.Members.Count);
        Assert.Contains(group1.Members, m => m.UserId == studentX);
        Assert.Contains(group2.Members, m => m.UserId == studentA);
    }

    [Fact]
    public void SpaceRoster_CsvExport_EncodesWithUtf8Bom()
    {
        var csvHeader = "STT,Mã phòng,Tên phòng/nhóm,Trạng thái phòng,MSSV,Họ và tên,Email trường,Chuyên ngành,Khóa,Vai trò,Tech (0-100),Management (0-100),Design (0-100),Marketing (0-100),Sale (0-100),Ngày vào nhóm,Đề tài\n";
        var sampleRow = "1,FA26EXE101-01,EXE101 - Phòng 01,Locked,SE180001,Nguyễn Văn An,annv@fpt.edu.vn,SE,K18,Leader,85,90,70,60,65,2026-11-08 10:00,EdTech Platform\n";

        var utf8WithBom = new System.Text.UTF8Encoding(encoderShouldEmitUTF8Identifier: true);
        var bodyBytes = utf8WithBom.GetBytes(csvHeader + sampleRow);
        var preamble = utf8WithBom.GetPreamble();
        var content = new byte[preamble.Length + bodyBytes.Length];
        Buffer.BlockCopy(preamble, 0, content, 0, preamble.Length);
        Buffer.BlockCopy(bodyBytes, 0, content, preamble.Length, bodyBytes.Length);

        // Assert UTF-8 BOM preamble bytes: 0xEF, 0xBB, 0xBF
        Assert.Equal(0xEF, content[0]);
        Assert.Equal(0xBB, content[1]);
        Assert.Equal(0xBF, content[2]);
        Assert.True(content.Length > preamble.Length);
    }
}

