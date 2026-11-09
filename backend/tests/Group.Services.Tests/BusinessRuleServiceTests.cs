using Exe.BuildingBlocks.EventBus;
using Exe.BuildingBlocks.Paging;
using Exe.BuildingBlocks.Web;
using Exe.Contracts.Events;
using Exe.Contracts.Matching;
using FluentValidation;
using Group.Repository.Entities;
using Group.Repository.Enums;
using Group.Repository.Interfaces;
using Group.Services.Clients;
using Group.Services.DTOs;
using Group.Services.Implementations;
using Group.Services.Options;
using Group.Services.Tests.TestDoubles;
using Group.Services.Validators;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging.Abstractions;

namespace Group.Services.Tests;

/// <summary>Kiểm tra business rule trên service thật; chỉ thay repository và client bên ngoài.</summary>
public class BusinessRuleServiceTests
{
    private sealed class FakeCurrentUser(Guid userId, string role = "Student") : ICurrentUser
    {
        public bool IsAuthenticated => true;
        public Guid UserId { get; } = userId;
        public string? Email => "user@gmail.com";
        public string? FullName => "User";
        public string? Role { get; } = role;
        public bool IsInRole(string r) => r == Role;
    }

    private readonly (IGroupRepository Instance, Stub<IGroupRepository> Config) _groups = Stub<IGroupRepository>.Create();
    private readonly (IJoinRequestRepository Instance, Stub<IJoinRequestRepository> Config) _joinRequests = Stub<IJoinRequestRepository>.Create();
    private readonly (ICourseSpaceRepository Instance, Stub<ICourseSpaceRepository> Config) _spaces = Stub<ICourseSpaceRepository>.Create();
    private readonly (IUserClient Instance, Stub<IUserClient> Config) _users = Stub<IUserClient>.Create();
    private readonly (IMatchingClient Instance, Stub<IMatchingClient> Config) _matching = Stub<IMatchingClient>.Create();
    private readonly (IGroupUnitOfWork Instance, Stub<IGroupUnitOfWork> Config) _uow = Stub<IGroupUnitOfWork>.Create();
    private readonly List<string> _callOrder = [];

    public BusinessRuleServiceTests()
    {
        _uow.Config.On(nameof(IGroupUnitOfWork.SaveChangesAsync), _ =>
        {
            _callOrder.Add("save");
            return Task.CompletedTask;
        });
    }

    private GroupMembershipManager Membership => new(_groups.Instance, _joinRequests.Instance);

    private GroupEventPublisher Events
    {
        get
        {
            var (publisher, config) = Stub<IEventPublisher>.Create();
            config.On(nameof(IEventPublisher.PublishAsync), _ =>
            {
                _callOrder.Add("publish");
                return Task.FromResult(Guid.NewGuid());
            });
            return new GroupEventPublisher(publisher, NullLogger<GroupEventPublisher>.Instance);
        }
    }

    private GroupService CreateGroupService(ICurrentUser user) => new(
        _groups.Instance,
        _uow.Instance,
        Membership,
        _users.Instance,
        _spaces.Instance,
        user,
        Events,
        new UpdateGroupRequestValidator(),
        new SlotRequestValidator(),
        new TransferLeaderRequestValidator(),
        new RemoveMemberRequestValidator());

    private CourseSpaceService CreateSpaceService(ICurrentUser? user = null) => new(
        _spaces.Instance,
        _uow.Instance,
        new CreateCourseSpaceRequestValidator(),
        new UpdateSpaceConfigRequestValidator(),
        new ImportFapStudentsRequestValidator(),
        Stub<IHttpClientFactory>.Create().Instance,
        Stub<IHttpContextAccessor>.Create().Instance,
        _matching.Instance,
        _users.Instance,
        Events,
        user ?? new FakeCurrentUser(Guid.NewGuid(), "Moderator"),
        NullLogger<CourseSpaceService>.Instance);

    private static GroupEntity Room(GroupStatus status, int memberCount, int maxMembers = 5, Guid? spaceId = null, string code = "FA26EXE101-01")
    {
        var room = new GroupEntity
        {
            Id = Guid.NewGuid(),
            SpaceId = spaceId,
            RoomCode = code,
            Name = code,
            MaxMembers = maxMembers,
            Status = status
        };

        for (var i = 0; i < memberCount; i++)
        {
            var member = new GroupMember
            {
                GroupId = room.Id,
                UserId = Guid.NewGuid(),
                FullName = $"Member {i}",
                Email = $"member{i}@gmail.com",
                Role = i == 0 ? MemberRole.Leader : MemberRole.Member,
                JoinedAt = DateTime.UtcNow.AddMinutes(i)
            };
            room.Members.Add(member);
        }

        room.LeaderId = room.Members.FirstOrDefault()?.UserId;
        return room;
    }

    private static CourseSpace Space(CourseSpaceStatus status, int maxMembers = 5) => new()
    {
        Id = Guid.NewGuid(),
        SemesterCode = "FA26",
        SubjectCode = "EXE101",
        Status = status,
        MaxMembersPerGroup = maxMembers,
        GroupThreshold = (maxMembers / 2) + 1,
        BufferRatio = 1.2m,
        MaxConcurrentApplies = 3,
        RegistrationDeadline = DateTime.UtcNow.AddDays(1)
    };

    private static JoinRequest Pending(Guid groupId, Guid? studentId = null) => new()
    {
        Id = Guid.NewGuid(),
        GroupId = groupId,
        StudentId = studentId ?? Guid.NewGuid(),
        Status = JoinRequestStatus.Pending
    };

    // ── BR-28, BR-27, BR-26 ─────────────────────────────────────────────────

    [Fact]
    public async Task AcceptingLastSeat_ClosesGroupAndRejectsOtherPendingRequests_BR28()
    {
        var room = Room(GroupStatus.Recruiting, 4);
        var other = Pending(room.Id);
        _joinRequests.Config.Returns(nameof(IJoinRequestRepository.GetPendingByGroupAsync), new List<JoinRequest> { other });
        _joinRequests.Config.Returns(nameof(IJoinRequestRepository.GetPendingByStudentAsync), new List<JoinRequest>());

        await Membership.AddMemberAsync(room, Guid.NewGuid(), "A", "a@gmail.com", null, DateTime.UtcNow, default);

        Assert.Equal(GroupStatus.Closed, room.Status);
        Assert.Equal(JoinRequestStatus.Rejected, other.Status);
    }

    [Fact]
    public async Task AcceptingWithSeatsLeft_KeepsOtherPendingRequests_BR27()
    {
        var room = Room(GroupStatus.Recruiting, 3);
        var other = Pending(room.Id);
        _joinRequests.Config.Returns(nameof(IJoinRequestRepository.GetPendingByGroupAsync), new List<JoinRequest> { other });
        _joinRequests.Config.Returns(nameof(IJoinRequestRepository.GetPendingByStudentAsync), new List<JoinRequest>());

        await Membership.AddMemberAsync(room, Guid.NewGuid(), "A", "a@gmail.com", null, DateTime.UtcNow, default);

        Assert.Equal(GroupStatus.Recruiting, room.Status);
        Assert.Equal(JoinRequestStatus.Pending, other.Status);
    }

    [Fact]
    public async Task JoiningGroup_CancelsOwnPendingRequestsOfSameSubjectOnly_BR26()
    {
        var spaceId = Guid.NewGuid();
        var studentId = Guid.NewGuid();
        var room = Room(GroupStatus.Forming, 1, spaceId: spaceId);
        var sameSubject = Pending(Guid.NewGuid(), studentId);
        Guid? requestedSpace = null;
        _joinRequests.Config.On(nameof(IJoinRequestRepository.GetPendingByStudentAsync), args =>
        {
            requestedSpace = (Guid?)args[1];
            return Task.FromResult(new List<JoinRequest> { sameSubject });
        });

        await Membership.AddDirectMemberAsync(room, studentId, "A", "a@gmail.com", 3, DateTime.UtcNow, default);

        Assert.Equal(spaceId, requestedSpace);
        Assert.Equal(JoinRequestStatus.Cancelled, sameSubject.Status);
    }

    // ── BR-21 ───────────────────────────────────────────────────────────────

    [Fact]
    public async Task StudentInGroupOfOtherSubject_CanStillJoin_ButNotInSameSubject_BR21()
    {
        var exe101 = Guid.NewGuid();
        var exe201 = Guid.NewGuid();
        var studentId = Guid.NewGuid();
        _groups.Config.On(nameof(IGroupRepository.IsUserInActiveGroupAsync), args => Task.FromResult((Guid?)args[1] == exe101));
        _joinRequests.Config.Returns(nameof(IJoinRequestRepository.GetPendingByStudentAsync), new List<JoinRequest>());

        var roomOfOtherSubject = Room(GroupStatus.Empty, 0, spaceId: exe201);
        await Membership.AddDirectMemberAsync(roomOfOtherSubject, studentId, "A", "a@gmail.com", 3, DateTime.UtcNow, default);
        Assert.Single(roomOfOtherSubject.Members);

        var roomOfSameSubject = Room(GroupStatus.Empty, 0, spaceId: exe101);
        var ex = await Assert.ThrowsAsync<BusinessRuleException>(() =>
            Membership.AddDirectMemberAsync(roomOfSameSubject, studentId, "A", "a@gmail.com", 3, DateTime.UtcNow, default));
        Assert.Equal("ALREADY_IN_GROUP", ex.Code);
    }

    // ── Vòng đời Room ───────────────────────────────────────────────────────

    [Theory]
    [InlineData(GroupStatus.Recruiting)]
    [InlineData(GroupStatus.Closed)]
    [InlineData(GroupStatus.Locked)]
    public async Task DirectJoin_OnlyAllowedBelowThreshold_BR16(GroupStatus status)
    {
        var room = Room(status, 3);

        var ex = await Assert.ThrowsAsync<BusinessRuleException>(() =>
            Membership.AddDirectMemberAsync(room, Guid.NewGuid(), "A", "a@gmail.com", 3, DateTime.UtcNow, default));

        Assert.Equal("ROOM_REACHED_THRESHOLD", ex.Code);
    }

    [Fact]
    public void MemberLeavingFullGroup_ReopensRecruiting()
    {
        var room = Room(GroupStatus.Closed, 5);

        Membership.RemoveMember(room, room.Members[4], DateTime.UtcNow, 3);

        Assert.Equal(GroupStatus.Recruiting, room.Status);
    }

    [Fact]
    public void MemberLeavingGroupClosedByLeader_StaysClosed_BR29()
    {
        var room = Room(GroupStatus.Closed, 4);
        room.IsClosedByLeader = true;

        Membership.RemoveMember(room, room.Members[3], DateTime.UtcNow, 3);

        Assert.Equal(GroupStatus.Closed, room.Status);
    }

    [Fact]
    public void FallingBelowThreshold_ReturnsToForming_BR17()
    {
        var room = Room(GroupStatus.Recruiting, 3);

        Membership.RemoveMember(room, room.Members[2], DateTime.UtcNow, 3);

        Assert.Equal(GroupStatus.Forming, room.Status);
    }

    // ── BR-33 ───────────────────────────────────────────────────────────────

    [Fact]
    public async Task LockedGroup_CannotBeChangedByLeaderOrLeft_BR33()
    {
        var room = Room(GroupStatus.Locked, 3);
        _groups.Config.Returns(nameof(IGroupRepository.GetByIdAsync), (GroupEntity?)room);
        var service = CreateGroupService(new FakeCurrentUser(room.LeaderId!.Value));

        foreach (var action in new Func<Task>[]
        {
            () => service.CloseRecruitmentAsync(room.Id),
            () => service.ReopenRecruitmentAsync(room.Id),
            () => service.UpdateGroupAsync(room.Id, new UpdateGroupRequest("Tên mới", null)),
            () => service.LeaveGroupAsync(room.Id),
            () => service.AddSlotAsync(room.Id, new SlotRequest(null, null, 1)),
        })
        {
            var ex = await Assert.ThrowsAsync<BusinessRuleException>(action);
            Assert.Equal("ROOM_LOCKED", ex.Code);
        }

        Assert.Equal(GroupStatus.Locked, room.Status);
        Assert.Equal(3, room.Members.Count);
    }

    // ── BR-13 ───────────────────────────────────────────────────────────────

    [Fact]
    public async Task ClosedGroup_HidesMembersFromOutsideStudentOnly_BR13()
    {
        var room = Room(GroupStatus.Closed, 5);
        _groups.Config.Returns(nameof(IGroupRepository.GetByIdAsync), (GroupEntity?)room);

        var outsider = await CreateGroupService(new FakeCurrentUser(Guid.NewGuid())).GetGroupAsync(room.Id);
        Assert.Empty(outsider.Members);
        Assert.Null(outsider.LeaderId);
        Assert.Equal(5, outsider.MemberCount);

        var member = await CreateGroupService(new FakeCurrentUser(room.Members[1].UserId)).GetGroupAsync(room.Id);
        Assert.Equal(5, member.Members.Count);

        var moderator = await CreateGroupService(new FakeCurrentUser(Guid.NewGuid(), "Moderator")).GetGroupAsync(room.Id);
        Assert.Equal(5, moderator.Members.Count);
    }

    [Fact]
    public async Task RecruitingGroup_ShowsMembersToOutsideStudent_BR13()
    {
        var room = Room(GroupStatus.Recruiting, 3);
        _groups.Config.Returns(nameof(IGroupRepository.GetByIdAsync), (GroupEntity?)room);

        var outsider = await CreateGroupService(new FakeCurrentUser(Guid.NewGuid())).GetGroupAsync(room.Id);

        Assert.Equal(3, outsider.Members.Count);
    }

    [Fact]
    public async Task RoomList_PassesFiltersAndHidesLeaderOfClosedRoom_BR13()
    {
        var spaceId = Guid.NewGuid();
        var closed = Room(GroupStatus.Closed, 5, spaceId: spaceId);
        object?[]? received = null;
        _spaces.Config.On(nameof(ICourseSpaceRepository.GetPagedRoomsBySpaceAsync), args =>
        {
            received = args;
            return Task.FromResult(PagedResult<GroupEntity>.Create([closed], 1, 10, 1));
        });

        var result = await CreateSpaceService(new FakeCurrentUser(Guid.NewGuid()))
            .GetSpaceRoomsAsync(spaceId, new RoomQuery { Status = GroupStatus.Closed, MinAvailableSlots = 2, Search = "EXE" });

        Assert.Equal(GroupStatus.Closed, received![1]);
        Assert.Equal(2, received[2]);
        Assert.Equal("EXE", received[3]);
        Assert.Null(Assert.Single(result.Items).LeaderId);
    }

    // ── BR-19 ───────────────────────────────────────────────────────────────

    [Fact]
    public async Task CandidateLeaving_FailsActiveElection_BR19()
    {
        var room = Room(GroupStatus.Recruiting, 4);
        var candidate = room.Members[1];
        var election = new LeaderElection { Id = Guid.NewGuid(), GroupId = room.Id, CandidateId = candidate.UserId, Status = ElectionStatus.Active };
        _groups.Config.Returns(nameof(IGroupRepository.GetByIdAsync), (GroupEntity?)room);
        _groups.Config.Returns(nameof(IGroupRepository.GetActiveElectionAsync), (LeaderElection?)election);

        await CreateGroupService(new FakeCurrentUser(candidate.UserId)).LeaveGroupAsync(room.Id);

        Assert.Equal(ElectionStatus.Failed, election.Status);
    }

    [Fact]
    public async Task VotingForCandidateWhoLeft_DoesNotMakeThemLeader_BR19()
    {
        var room = Room(GroupStatus.Recruiting, 4);
        var leaderId = room.LeaderId;
        var election = new LeaderElection
        {
            Id = Guid.NewGuid(),
            GroupId = room.Id,
            CandidateId = Guid.NewGuid(),
            CandidateName = "Đã rời nhóm",
            Status = ElectionStatus.Active,
            ExpiresAt = DateTime.UtcNow.AddHours(1)
        };
        _groups.Config.Returns(nameof(IGroupRepository.GetByIdAsync), (GroupEntity?)room);
        _groups.Config.Returns(nameof(IGroupRepository.GetElectionByIdAsync), (LeaderElection?)election);
        var service = new ElectionService(_groups.Instance, _uow.Instance, new FakeCurrentUser(room.Members[1].UserId), NullLogger<ElectionService>.Instance);

        var ex = await Assert.ThrowsAsync<BusinessRuleException>(() =>
            service.VoteElectionAsync(room.Id, election.Id, new VoteElectionRequest(true)));

        Assert.Equal("ELECTION_CANDIDATE_LEFT", ex.Code);
        Assert.Equal(ElectionStatus.Failed, election.Status);
        Assert.Equal(leaderId, room.LeaderId);
    }

    // ── Xóa Không gian học phần ─────────────────────────────────────────────

    [Fact]
    public async Task DeleteSpace_RemovesEmptyDraftSpace()
    {
        var space = Space(CourseSpaceStatus.Draft);
        CourseSpace? removed = null;
        _spaces.Config.Returns(nameof(ICourseSpaceRepository.GetByIdAsync), (CourseSpace?)space);
        _spaces.Config.On(nameof(ICourseSpaceRepository.Remove), args =>
        {
            removed = (CourseSpace?)args[0];
            return null;
        });

        await CreateSpaceService().DeleteSpaceAsync(space.Id);

        Assert.Same(space, removed);
        Assert.Contains("save", _callOrder);
    }

    [Fact]
    public async Task DeleteSpace_RejectedWhenNotDraft()
    {
        var space = Space(CourseSpaceStatus.Open);
        _spaces.Config.Returns(nameof(ICourseSpaceRepository.GetByIdAsync), (CourseSpace?)space);

        var ex = await Assert.ThrowsAsync<BusinessRuleException>(() => CreateSpaceService().DeleteSpaceAsync(space.Id));

        Assert.Equal("SPACE_NOT_DRAFT", ex.Code);
        Assert.DoesNotContain("save", _callOrder);
    }

    [Fact]
    public async Task DeleteSpace_RejectedWhenHasStudents()
    {
        var space = Space(CourseSpaceStatus.Draft);
        space.Enrollments.Add(new SpaceEnrollment { Id = Guid.NewGuid(), SpaceId = space.Id });
        _spaces.Config.Returns(nameof(ICourseSpaceRepository.GetByIdAsync), (CourseSpace?)space);

        var ex = await Assert.ThrowsAsync<BusinessRuleException>(() => CreateSpaceService().DeleteSpaceAsync(space.Id));

        Assert.Equal("SPACE_NOT_EMPTY", ex.Code);
        Assert.DoesNotContain("save", _callOrder);
    }

    [Fact]
    public async Task DeleteSpace_RejectedWhenHasRooms()
    {
        var space = Space(CourseSpaceStatus.Draft);
        space.Rooms.Add(Room(GroupStatus.Empty, 0, spaceId: space.Id));
        _spaces.Config.Returns(nameof(ICourseSpaceRepository.GetByIdAsync), (CourseSpace?)space);

        var ex = await Assert.ThrowsAsync<BusinessRuleException>(() => CreateSpaceService().DeleteSpaceAsync(space.Id));

        Assert.Equal("SPACE_NOT_EMPTY", ex.Code);
        Assert.DoesNotContain("save", _callOrder);
    }

    // ── BR-01 ───────────────────────────────────────────────────────────────

    [Fact]
    public async Task Apply_RejectedWhenStudentNotOnSubjectList_BR01()
    {
        var space = Space(CourseSpaceStatus.Open);
        var room = Room(GroupStatus.Recruiting, 3, spaceId: space.Id);
        _groups.Config.Returns(nameof(IGroupRepository.GetByIdAsync), (GroupEntity?)room);
        _spaces.Config.Returns(nameof(ICourseSpaceRepository.GetByIdAsync), (CourseSpace?)space);
        _spaces.Config.Returns(nameof(ICourseSpaceRepository.IsStudentEnrolledAsync), false);
        _users.Config.Returns(nameof(IUserClient.GetProfileAsync),
            (UserProfileDto?)new UserProfileDto(Guid.NewGuid(), "A", "Student", "SE", null, "LookingForTeam", [], [], IsProfileCompleted: true));

        var service = new JoinRequestService(
            _groups.Instance,
            _joinRequests.Instance,
            _spaces.Instance,
            _uow.Instance,
            Membership,
            _users.Instance,
            new FakeCurrentUser(Guid.NewGuid()),
            Events,
            Microsoft.Extensions.Options.Options.Create(new GroupOptions()),
            new CreateJoinRequestRequestValidator());

        var ex = await Assert.ThrowsAsync<BusinessRuleException>(() =>
            service.CreateAsync(room.Id, new CreateJoinRequestRequest(null, null)));

        Assert.Equal("NOT_ENROLLED_IN_SPACE", ex.Code);
    }

    // ── BR-08 ───────────────────────────────────────────────────────────────

    [Fact]
    public async Task ChangingMaxMembers_UpdatesExistingRooms_BR08()
    {
        var space = Space(CourseSpaceStatus.Open);
        var room = Room(GroupStatus.Recruiting, 3, spaceId: space.Id);
        _spaces.Config.Returns(nameof(ICourseSpaceRepository.GetByIdAsync), (CourseSpace?)space);
        _spaces.Config.Returns(nameof(ICourseSpaceRepository.GetTrackedRoomsBySpaceAsync), (IReadOnlyList<GroupEntity>)[room]);

        await CreateSpaceService().UpdateSpaceConfigAsync(space.Id, new UpdateSpaceConfigRequest(6, 1.2m, 3, DateTime.UtcNow.AddDays(1)));

        Assert.Equal(6, room.MaxMembers);
        Assert.Equal(4, space.GroupThreshold);
        Assert.Equal(GroupStatus.Forming, room.Status); // ngưỡng mới là 4, phòng 3 người quay lại Forming
    }

    [Fact]
    public async Task LoweringMaxMembersBelowRoomSize_IsRejected_BR08()
    {
        var space = Space(CourseSpaceStatus.Open, 6);
        var room = Room(GroupStatus.Recruiting, 6, 6, space.Id);
        _spaces.Config.Returns(nameof(ICourseSpaceRepository.GetByIdAsync), (CourseSpace?)space);
        _spaces.Config.Returns(nameof(ICourseSpaceRepository.GetTrackedRoomsBySpaceAsync), (IReadOnlyList<GroupEntity>)[room]);

        var ex = await Assert.ThrowsAsync<BusinessRuleException>(() =>
            CreateSpaceService().UpdateSpaceConfigAsync(space.Id, new UpdateSpaceConfigRequest(5, 1.2m, 3, DateTime.UtcNow.AddDays(1))));

        Assert.Equal("MAX_MEMBERS_BELOW_MEMBER_COUNT", ex.Code);
        Assert.Equal(6, room.MaxMembers);
    }

    // ── Finalize ────────────────────────────────────────────────────────────

    [Theory]
    [InlineData(CourseSpaceStatus.Draft)]
    [InlineData(CourseSpaceStatus.Open)]
    public async Task Finalize_RequiresRegistrationToBeClosed(CourseSpaceStatus status)
    {
        var space = Space(status);
        _spaces.Config.Returns(nameof(ICourseSpaceRepository.GetByIdAsync), (CourseSpace?)space);

        var ex = await Assert.ThrowsAsync<BusinessRuleException>(() => CreateSpaceService().FinalizeSpaceAsync(space.Id));

        Assert.Equal("REGISTRATION_NOT_CLOSED", ex.Code);
        Assert.Equal(status, space.Status);
    }

    [Fact]
    public async Task Finalize_LocksGroups_RejectsPending_AndReportsUnmatchedStudents_BR33()
    {
        var space = Space(CourseSpaceStatus.ClosedRegistration);
        var room = Room(GroupStatus.Recruiting, 3, spaceId: space.Id);
        var pending = Pending(room.Id);
        _spaces.Config.Returns(nameof(ICourseSpaceRepository.GetByIdAsync), (CourseSpace?)space);
        _spaces.Config.Returns(nameof(ICourseSpaceRepository.GetTrackedRoomsBySpaceAsync), (IReadOnlyList<GroupEntity>)[room]);
        _spaces.Config.Returns(nameof(ICourseSpaceRepository.GetPendingJoinRequestsBySpaceAsync), (IReadOnlyList<JoinRequest>)[pending]);
        _spaces.Config.Returns(nameof(ICourseSpaceRepository.GetEnrollmentsBySpaceAsync), (IReadOnlyList<SpaceEnrollment>)
        [
            new SpaceEnrollment { StudentId = room.Members[0].UserId },
            new SpaceEnrollment { StudentId = Guid.NewGuid() },
        ]);

        var result = await CreateSpaceService().FinalizeSpaceAsync(space.Id);

        Assert.Equal(CourseSpaceStatus.Locked, space.Status);
        Assert.Equal(GroupStatus.Locked, room.Status);
        Assert.Equal(JoinRequestStatus.Rejected, pending.Status);
        Assert.Equal(1, result.UnmatchedStudentsCount);
    }

    // ── BR-31, BR-26 ────────────────────────────────────────────────────────

    [Fact]
    public async Task Distribution_FillsLeaderClosedGroup_CancelsPending_PublishesAfterSave_BR31()
    {
        var space = Space(CourseSpaceStatus.ClosedRegistration);
        var closedByLeader = Room(GroupStatus.Closed, 3, spaceId: space.Id);
        closedByLeader.IsClosedByLeader = true;
        var studentId = Guid.NewGuid();
        var pending = Pending(Guid.NewGuid(), studentId);
        var enrollment = new SpaceEnrollment
        {
            SpaceId = space.Id,
            StudentId = studentId,
            StudentCode = "SE190001",
            Email = "sv@gmail.com",
            FullName = "Sinh Viên",
            Major = "SE",
            Cohort = "K19"
        };

        _spaces.Config.Returns(nameof(ICourseSpaceRepository.GetByIdAsync), (CourseSpace?)space);
        _spaces.Config.Returns(nameof(ICourseSpaceRepository.GetEnrollmentsBySpaceAsync), (IReadOnlyList<SpaceEnrollment>)[enrollment]);
        _spaces.Config.On(nameof(ICourseSpaceRepository.GetRoomsBySpaceAsync), _ => Task.FromResult<IReadOnlyList<GroupEntity>>([closedByLeader]));
        _spaces.Config.Returns(nameof(ICourseSpaceRepository.GetTrackedRoomsBySpaceAsync), (IReadOnlyList<GroupEntity>)[closedByLeader]);
        _spaces.Config.Returns(nameof(ICourseSpaceRepository.GetPendingJoinRequestsBySpaceAsync), (IReadOnlyList<JoinRequest>)[pending]);
        _users.Config.Returns(nameof(IUserClient.GetProfilesAsync), (IReadOnlyList<UserProfileDto>)[]);

        DistributeRequest? sent = null;
        _matching.Config.On(nameof(IMatchingClient.DistributeUnmatchedStudentsAsync), args =>
        {
            sent = (DistributeRequest)args[0]!;
            var plan = new DistributedRoomPlan
            {
                RoomId = closedByLeader.Id.ToString(),
                RoomCode = closedByLeader.RoomCode,
                Name = closedByLeader.Name,
                LeaderId = closedByLeader.LeaderId.ToString(),
                LeaderName = "Leader",
                MemberCountBefore = 3,
                MemberCountAfter = 4
            };
            plan.AddedStudents.Add(new AssignedStudent { UserId = studentId.ToString(), StudentCode = "SE190001", FullName = "Sinh Viên", Major = "SE" });
            var response = new DistributeResponse { SpaceId = space.Id.ToString(), TotalUnmatched = 1, TotalDistributed = 1 };
            response.RoomPlans.Add(plan);
            return Task.FromResult(response);
        });

        var result = await CreateSpaceService().ConfirmDistributionAsync(space.Id);

        Assert.Equal(closedByLeader.Id.ToString(), Assert.Single(sent!.ExistingRooms).RoomId);
        Assert.Equal(1, result.TotalDistributed);
        Assert.Contains(closedByLeader.Members, m => m.UserId == studentId);
        Assert.Equal(GroupStatus.Closed, closedByLeader.Status);
        Assert.Equal(JoinRequestStatus.Cancelled, pending.Status);
        Assert.True(_callOrder.IndexOf("save") < _callOrder.IndexOf("publish"), "Event phải phát sau khi đã lưu.");
    }

    [Fact]
    public async Task DistributionPreview_WarnsAboutNewGroupBelowThreshold()
    {
        var space = Space(CourseSpaceStatus.ClosedRegistration);
        var empty = Room(GroupStatus.Empty, 0, spaceId: space.Id);
        var studentId = Guid.NewGuid();

        _spaces.Config.Returns(nameof(ICourseSpaceRepository.GetByIdAsync), (CourseSpace?)space);
        _spaces.Config.Returns(nameof(ICourseSpaceRepository.GetEnrollmentsBySpaceAsync), (IReadOnlyList<SpaceEnrollment>)
        [
            new SpaceEnrollment { StudentId = studentId, StudentCode = "SE190001", FullName = "A", Major = "SE", Cohort = "K19" },
        ]);
        _spaces.Config.On(nameof(ICourseSpaceRepository.GetRoomsBySpaceAsync), _ => Task.FromResult<IReadOnlyList<GroupEntity>>([empty]));
        _users.Config.Returns(nameof(IUserClient.GetProfilesAsync), (IReadOnlyList<UserProfileDto>)[]);
        _matching.Config.On(nameof(IMatchingClient.DistributeUnmatchedStudentsAsync), _ =>
        {
            var response = new DistributeResponse { SpaceId = space.Id.ToString(), TotalUnmatched = 1, TotalDistributed = 1 };
            response.RoomPlans.Add(new DistributedRoomPlan
            {
                RoomId = empty.Id.ToString(),
                RoomCode = empty.RoomCode,
                Name = empty.Name,
                LeaderId = studentId.ToString(),
                LeaderName = "A",
                IsNewlyFormed = true,
                MemberCountAfter = 1
            });
            return Task.FromResult(response);
        });

        var preview = await CreateSpaceService().PreviewDistributionAsync(space.Id);

        Assert.Equal(empty.RoomCode, Assert.Single(preview.UndersizedRoomCodes!));
    }

    // ── Chuyển nhóm ─────────────────────────────────────────────────────────

    [Fact]
    public async Task TransferIntoEmptyRoom_MakesStudentLeaderAndLocksRoom()
    {
        var space = Space(CourseSpaceStatus.Locked);
        var from = Room(GroupStatus.Locked, 4, spaceId: space.Id);
        var target = Room(GroupStatus.Closed, 0, spaceId: space.Id, code: "FA26EXE101-02");
        var student = from.Members[3];

        _spaces.Config.Returns(nameof(ICourseSpaceRepository.GetByIdAsync), (CourseSpace?)space);
        _spaces.Config.Returns(nameof(ICourseSpaceRepository.GetEnrollmentsBySpaceAsync), (IReadOnlyList<SpaceEnrollment>)
        [
            new SpaceEnrollment { StudentId = student.UserId, StudentCode = "SE190001" },
        ]);
        _spaces.Config.Returns(nameof(ICourseSpaceRepository.GetTrackedRoomsBySpaceAsync), (IReadOnlyList<GroupEntity>)[from, target]);

        await CreateSpaceService().DirectTransferAsync(
            space.Id, new DirectTransferRequest(student.UserId, target.Id, null, "Chuyển sang phòng trống"), Guid.NewGuid());

        var moved = Assert.Single(target.Members);
        Assert.Equal(student.UserId, moved.UserId);
        Assert.Equal(moved.UserId, target.LeaderId);
        Assert.Equal(MemberRole.Leader, moved.Role);
        Assert.Equal(GroupStatus.Locked, target.Status);
    }

    [Fact]
    public async Task TransferringLeaderAway_PromotesEarliestMember_BR20()
    {
        var space = Space(CourseSpaceStatus.Locked);
        var from = Room(GroupStatus.Locked, 4, spaceId: space.Id);
        var target = Room(GroupStatus.Locked, 3, spaceId: space.Id, code: "FA26EXE101-02");
        var leader = from.Members[0];
        var next = from.Members[1];

        _spaces.Config.Returns(nameof(ICourseSpaceRepository.GetByIdAsync), (CourseSpace?)space);
        _spaces.Config.Returns(nameof(ICourseSpaceRepository.GetEnrollmentsBySpaceAsync), (IReadOnlyList<SpaceEnrollment>)
        [
            new SpaceEnrollment { StudentId = leader.UserId, StudentCode = "SE190001" },
        ]);
        _spaces.Config.Returns(nameof(ICourseSpaceRepository.GetTrackedRoomsBySpaceAsync), (IReadOnlyList<GroupEntity>)[from, target]);

        await CreateSpaceService().DirectTransferAsync(
            space.Id, new DirectTransferRequest(leader.UserId, target.Id, null, "Chuyển Leader"), Guid.NewGuid());

        Assert.Equal(next.UserId, from.LeaderId);
        Assert.Equal(MemberRole.Leader, next.Role);
        Assert.NotEqual(leader.UserId, target.LeaderId);
    }

    [Fact]
    public void UpdateGroupValidator_NoLongerHandlesMaxMembers_BR08()
    {
        Assert.Null(typeof(UpdateGroupRequest).GetProperty("MaxMembers"));
        Assert.True(new UpdateGroupRequestValidator().Validate(new UpdateGroupRequest("Tên", null)).IsValid);
    }
}
