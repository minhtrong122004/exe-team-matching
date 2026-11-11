using System.Text.Json;
using System.Text.RegularExpressions;
using Exe.BuildingBlocks.Auth;
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
using Group.Services.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using ICurrentUser = Exe.BuildingBlocks.Web.ICurrentUser;

namespace Group.Services.Implementations;

public partial class CourseSpaceService(
    ICourseSpaceRepository spaceRepo,
    IGroupUnitOfWork uow,
    IValidator<CreateCourseSpaceRequest> createValidator,
    IValidator<UpdateSpaceConfigRequest> updateValidator,
    IValidator<ImportFapStudentsRequest> importValidator,
    IHttpClientFactory httpClientFactory,
    IHttpContextAccessor httpContextAccessor,
    IMatchingClient matchingClient,
    IUserClient userClient,
    GroupEventPublisher eventPublisher,
    ICurrentUser currentUser,
    ILogger<CourseSpaceService> logger) : ICourseSpaceService
{
    public async Task<CourseSpaceResponse> CreateSpaceAsync(CreateCourseSpaceRequest request, CancellationToken ct = default)
    {
        await createValidator.ValidateAndThrowAsync(request, ct);

        var normSem = request.SemesterCode.Trim().ToUpperInvariant();
        var normSub = request.SubjectCode.Trim().ToUpperInvariant();

        var existing = await spaceRepo.GetByCodeAsync(normSem, normSub, ct);
        if (existing != null)
        {
            throw new BusinessRuleException("DUPLICATE_COURSE_SPACE",
                $"Không gian môn học cho kỳ {normSem} và môn {normSub} đã tồn tại trong hệ thống.");
        }

        var deadline = request.RegistrationDeadline ?? DateTime.UtcNow.AddDays(14);
        var now = DateTime.UtcNow;

        var threshold = (request.MaxMembersPerGroup / 2) + 1; // BR-16: > 50% max members

        var space = new CourseSpace
        {
            Id = Guid.NewGuid(),
            SemesterCode = normSem,
            SubjectCode = normSub,
            Name = request.Name.Trim(),
            MaxMembersPerGroup = request.MaxMembersPerGroup,
            GroupThreshold = threshold,
            BufferRatio = request.BufferRatio,
            MaxConcurrentApplies = request.MaxConcurrentApplies,
            RegistrationDeadline = deadline,
            Status = CourseSpaceStatus.Draft,
            CreatedAt = now,
            UpdatedAt = now
        };

        spaceRepo.Add(space);
        await uow.SaveChangesAsync(ct);

        logger.LogInformation("Created new CourseSpace: {Id} - {SemesterCode} {SubjectCode}", space.Id, normSem, normSub);

        return ToResponse(space, 0, 0);
    }

    public async Task DeleteSpaceAsync(Guid spaceId, CancellationToken ct = default)
    {
        var space = await spaceRepo.GetByIdAsync(spaceId, ct)
            ?? throw new NotFoundException("CourseSpace", spaceId);

        // Chỉ dùng để sửa thao tác tạo nhầm: Space đã có dữ liệu thì không được xóa.
        if (space.Status != CourseSpaceStatus.Draft)
        {
            throw new BusinessRuleException("SPACE_NOT_DRAFT", "Chỉ xóa được Không gian học phần đang ở trạng thái Draft.");
        }

        if (space.Enrollments.Count > 0 || space.Rooms.Count > 0)
        {
            throw new BusinessRuleException("SPACE_NOT_EMPTY", "Không thể xóa Không gian học phần đã có sinh viên hoặc phòng.");
        }

        spaceRepo.Remove(space);
        await uow.SaveChangesAsync(ct);

        logger.LogInformation("Deleted empty CourseSpace {Id} - {SemesterCode} {SubjectCode}", space.Id, space.SemesterCode, space.SubjectCode);
    }

    private async Task CheckAndUpdateExpiredDeadlinesAsync(IEnumerable<CourseSpace> spaces, CancellationToken ct)
    {
        var now = DateTime.UtcNow;
        bool hasChanges = false;
        foreach (var s in spaces)
        {
            if (s.Status == CourseSpaceStatus.Open && s.RegistrationDeadline <= now)
            {
                s.Status = CourseSpaceStatus.ClosedRegistration;
                s.UpdatedAt = now;
                hasChanges = true;
                logger.LogInformation("CourseSpace {SpaceId} auto-closed registration because deadline {Deadline} passed.", s.Id, s.RegistrationDeadline);
            }
        }
        if (hasChanges)
        {
            await uow.SaveChangesAsync(ct);
        }
    }

    public async Task<IReadOnlyList<CourseSpaceResponse>> GetAllSpacesAsync(string? semesterCode, CourseSpaceStatus? status, CancellationToken ct = default)
    {
        var spaces = await spaceRepo.GetAllAsync(semesterCode, status, ct);
        await CheckAndUpdateExpiredDeadlinesAsync(spaces, ct);
        return spaces.Select(s => ToResponse(s, s.Enrollments.Count, s.Rooms.Count)).ToList();
    }

    public async Task<CourseSpaceResponse> GetSpaceByIdAsync(Guid spaceId, CancellationToken ct = default)
    {
        var space = await spaceRepo.GetByIdAsync(spaceId, ct)
            ?? throw new NotFoundException("CourseSpace", spaceId);

        await CheckAndUpdateExpiredDeadlinesAsync([space], ct);

        return ToResponse(space, space.Enrollments.Count, space.Rooms.Count);
    }

    public async Task<CourseSpaceResponse> UpdateSpaceConfigAsync(Guid spaceId, UpdateSpaceConfigRequest request, CancellationToken ct = default)
    {
        await updateValidator.ValidateAndThrowAsync(request, ct);

        var space = await spaceRepo.GetByIdAsync(spaceId, ct)
            ?? throw new NotFoundException("CourseSpace", spaceId);

        if (space.Status == CourseSpaceStatus.Locked)
        {
            throw new BusinessRuleException("SPACE_LOCKED", "Không thể chỉnh sửa cấu hình không gian môn học đã chốt sổ.");
        }

        var newThreshold = (request.MaxMembersPerGroup / 2) + 1;

        // BR-08: sĩ số mới áp dụng cho cả các Room đã tạo, nên không được thấp hơn số người đang ở trong phòng.
        var trackedRooms = await spaceRepo.GetTrackedRoomsBySpaceAsync(spaceId, ct) ?? [];
        var overfullRoom = trackedRooms.FirstOrDefault(r => r.Members.Count > request.MaxMembersPerGroup);
        if (overfullRoom != null)
        {
            throw new BusinessRuleException("MAX_MEMBERS_BELOW_MEMBER_COUNT",
                $"Phòng {overfullRoom.RoomCode ?? overfullRoom.Name} đang có {overfullRoom.Members.Count} thành viên, không thể giảm sĩ số xuống {request.MaxMembersPerGroup}.");
        }

        foreach (var room in trackedRooms)
        {
            room.MaxMembers = request.MaxMembersPerGroup;
            room.Status = ResolveRoomStatus(room, request.MaxMembersPerGroup, newThreshold);
            room.UpdatedAt = DateTime.UtcNow;
        }

        if (!string.IsNullOrWhiteSpace(request.Name))
        {
            space.Name = request.Name.Trim();
        }
        var previousDeadline = space.RegistrationDeadline;
        var isDeadlineExtendedToFuture =
            request.RegistrationDeadline > DateTime.UtcNow &&
            Math.Abs((request.RegistrationDeadline - previousDeadline).TotalSeconds) > 1;

        space.MaxMembersPerGroup = request.MaxMembersPerGroup;
        space.GroupThreshold = newThreshold;
        space.BufferRatio = request.BufferRatio;
        space.MaxConcurrentApplies = request.MaxConcurrentApplies;
        space.RegistrationDeadline = request.RegistrationDeadline;

        var targetStatus = request.Status;
        if (space.Status == CourseSpaceStatus.ClosedRegistration &&
            isDeadlineExtendedToFuture &&
            (!targetStatus.HasValue || targetStatus.Value == CourseSpaceStatus.ClosedRegistration))
        {
            targetStatus = CourseSpaceStatus.Open;
        }

        if (targetStatus.HasValue && targetStatus.Value != CourseSpaceStatus.Locked)
        {
            if (targetStatus.Value == CourseSpaceStatus.Open || targetStatus.Value == CourseSpaceStatus.ClosedRegistration)
            {
                var totalStudents = space.Enrollments.Count > 0
                    ? space.Enrollments.Count
                    : await spaceRepo.GetTotalEnrollmentsCountAsync(spaceId, ct);

                if (totalStudents == 0)
                {
                    throw new BusinessRuleException("NO_ENROLLED_STUDENTS",
                        "Không thể mở cổng đăng ký vì chưa nạp danh sách sinh viên FAP cho học phần này. Vui lòng nạp danh sách FAP trước.");
                }

                var totalRooms = space.Rooms.Count > 0 ? space.Rooms.Count : trackedRooms.Count;
                if (totalRooms == 0)
                {
                    throw new BusinessRuleException("NO_ROOMS_GENERATED",
                        "Không thể mở cổng đăng ký vì chưa khởi tạo phòng nhóm cho học phần này. Vui lòng bấm 'Khởi tạo Room tự động' trước.");
                }

                if (targetStatus.Value == CourseSpaceStatus.Open && request.RegistrationDeadline <= DateTime.UtcNow)
                {
                    throw new BusinessRuleException("DEADLINE_IN_PAST",
                        "Không thể mở cổng đăng ký vì hạn chót đang ở trong quá khứ. Vui lòng gia hạn thời gian 'Hạn chót đăng ký' lớn hơn thời điểm hiện tại trước khi mở cổng.");
                }
            }

            space.Status = targetStatus.Value;
        }
        space.UpdatedAt = DateTime.UtcNow;

        await uow.SaveChangesAsync(ct);

        logger.LogInformation("Updated config for CourseSpace {Id}", spaceId);

        return ToResponse(space, space.Enrollments.Count, space.Rooms.Count);
    }

    public async Task<int> ImportFapStudentsAsync(Guid spaceId, ImportFapStudentsRequest request, CancellationToken ct = default)
    {
        await importValidator.ValidateAndThrowAsync(request, ct);

        var space = await spaceRepo.GetByIdAsync(spaceId, ct)
            ?? throw new NotFoundException("CourseSpace", spaceId);

        if (space.Status == CourseSpaceStatus.Locked)
        {
            throw new BusinessRuleException("SPACE_LOCKED", "Không thể import sinh viên vào môn học đã chốt sổ.");
        }

        var existingEnrollments = (await spaceRepo.GetEnrollmentsBySpaceAsync(spaceId, ct))
            .ToDictionary(e => e.StudentCode.ToUpperInvariant(), e => e);

        var now = DateTime.UtcNow;
        var toAdd = new List<SpaceEnrollment>();

        foreach (var item in request.Students)
        {
            var code = item.StudentCode.Trim().ToUpperInvariant();
            if (existingEnrollments.ContainsKey(code)) continue;

            var cohort = !string.IsNullOrWhiteSpace(item.Cohort)
                ? item.Cohort.Trim().ToUpperInvariant()
                : ParseCohortFromStudentCode(code);

            var enrollment = new SpaceEnrollment
            {
                Id = Guid.NewGuid(),
                SpaceId = space.Id,
                StudentId = Guid.NewGuid(), // Sẽ khớp nếu tài khoản sinh viên đã tồn tại
                StudentCode = code,
                Email = item.Email.Trim().ToLowerInvariant(),
                FullName = item.FullName.Trim(),
                Major = item.Major.Trim().ToUpperInvariant(),
                Cohort = cohort,
                ClassCode = item.ClassCode?.Trim(),
                EnrolledAt = now
            };

            toAdd.Add(enrollment);
            existingEnrollments[code] = enrollment;
        }

        if (toAdd.Count > 0)
        {
            // Tài khoản là điều kiện đăng nhập: Auth lỗi thì dừng import, không lưu sinh viên chưa có tài khoản.
            var authHeader = httpContextAccessor.HttpContext?.Request.Headers.Authorization.ToString();
            await ProvisionAccountsAsync(space.SemesterCode, space.SubjectCode, toAdd, authHeader, ct);

            spaceRepo.AddEnrollmentsRange(toAdd);
            space.UpdatedAt = now;
            await uow.SaveChangesAsync(ct);
            logger.LogInformation("Imported {Count} students into CourseSpace {SpaceId} with synchronized StudentIds", toAdd.Count, spaceId);
        }

        return toAdd.Count;
    }

    public async Task<GenerateRoomsResponse> GenerateRoomsAsync(Guid spaceId, CancellationToken ct = default)
    {
        var space = await spaceRepo.GetByIdAsync(spaceId, ct)
            ?? throw new NotFoundException("CourseSpace", spaceId);

        var totalStudents = await spaceRepo.GetTotalEnrollmentsCountAsync(spaceId, ct);
        if (totalStudents == 0)
        {
            throw new BusinessRuleException("NO_ENROLLED_STUDENTS",
                "Không thể tạo phòng vì chưa có sinh viên nào được ghi danh trong môn học này. Vui lòng import danh sách FAP trước.");
        }

        // Công thức BR-09: TotalRooms = ceil(TotalStudents / MaxMembersPerGroup * BufferRatio)
        var rawRooms = (double)totalStudents / space.MaxMembersPerGroup * (double)space.BufferRatio;
        var totalRooms = (int)Math.Ceiling(rawRooms);
        if (totalRooms < 1) totalRooms = 1;

        var existingRooms = await spaceRepo.GetRoomsBySpaceAsync(spaceId, null, ct);
        var activeRoomsWithMembers = existingRooms
            .Where(r => r.Members.Count > 0 || r.Status != GroupStatus.Empty)
            .ToList();

        if (activeRoomsWithMembers.Count > 0)
        {
            throw new BusinessRuleException("ROOMS_IN_USE",
                $"Không thể tái khởi tạo toàn bộ phòng vì đã có {activeRoomsWithMembers.Count} phòng có thành viên tham gia hoặc đang trong quy trình hoạt động.");
        }

        if (existingRooms.Count > 0)
        {
            spaceRepo.RemoveRoomsRange(existingRooms);
            logger.LogInformation("Đã xóa {OldCount} phòng chờ trống cũ để tái khởi tạo {NewCount} phòng theo cấu hình mới cho môn học {SpaceId}",
                existingRooms.Count, totalRooms, spaceId);
        }

        var now = DateTime.UtcNow;
        var newRooms = new List<GroupEntity>();

        for (int i = 1; i <= totalRooms; i++)
        {
            var roomCode = $"{space.SemesterCode}{space.SubjectCode}-{i:D2}"; // BR-11 (vd: FA26EXE101-01)
            var room = new GroupEntity
            {
                Id = Guid.NewGuid(),
                SpaceId = space.Id,
                RoomCode = roomCode,
                Name = $"{space.SubjectCode} - Phòng {i:D2}",
                Description = $"Phòng ghép nhóm tự do môn {space.SubjectCode} học kỳ {space.SemesterCode}",
                LeaderId = null,
                ProjectId = null,
                ProjectDomain = "General",
                MaxMembers = space.MaxMembersPerGroup,
                Status = GroupStatus.Empty,
                IsClosedByLeader = false,
                CreatedAt = now,
                UpdatedAt = now
            };
            newRooms.Add(room);
        }

        spaceRepo.AddRoomsRange(newRooms);

        // Mở Space khi đã sinh đủ các Room trống (BR-08, BR-09)
        space.Status = CourseSpaceStatus.Open;
        space.UpdatedAt = now;

        await uow.SaveChangesAsync(ct);

        logger.LogInformation("Generated {TotalRooms} rooms for CourseSpace {SpaceId} ({SemesterCode} - {SubjectCode})",
            totalRooms, spaceId, space.SemesterCode, space.SubjectCode);

        var roomSummaries = newRooms.Select(r => new RoomSummaryResponse(
            r.Id,
            r.RoomCode,
            r.Name,
            r.Status.ToString(),
            0,
            r.MaxMembers,
            null,
            null,
            r.SpaceId,
            r.CreatedAt
        )).ToList();

        return new GenerateRoomsResponse(
            space.Id,
            space.SemesterCode,
            space.SubjectCode,
            totalStudents,
            space.MaxMembersPerGroup,
            space.BufferRatio,
            totalRooms,
            roomSummaries
        );
    }

    public async Task<IReadOnlyList<CourseSpaceResponse>> GetMySpacesAsync(Guid studentId, string? email = null, CancellationToken ct = default)
    {
        var spaces = await spaceRepo.GetSpacesForStudentAsync(studentId, email, ct);
        await CheckAndUpdateExpiredDeadlinesAsync(spaces, ct);
        return spaces.Select(s => ToResponse(s, s.Enrollments.Count, s.Rooms.Count)).ToList();
    }

    public async Task<IReadOnlyList<SpaceEnrollmentResponse>> GetSpaceEnrollmentsAsync(Guid spaceId, CancellationToken ct = default)
    {
        var enrollments = await spaceRepo.GetEnrollmentsBySpaceAsync(spaceId, ct);
        return enrollments.Select(e => new SpaceEnrollmentResponse(
            e.Id,
            e.SpaceId,
            e.StudentId,
            e.StudentCode,
            e.Email,
            e.FullName,
            e.Major,
            e.Cohort,
            e.ClassCode,
            e.EnrolledAt,
            e.IsProfileCompleted
        )).ToList();
    }

    public async Task<PagedResult<RoomSummaryResponse>> GetSpaceRoomsAsync(Guid spaceId, RoomQuery query, CancellationToken ct = default)
    {
        var page = await spaceRepo.GetPagedRoomsBySpaceAsync(
            spaceId, query.Status, query.MinAvailableSlots, query.Search, query.NormalizedPage, query.NormalizedPageSize, ct);

        var isStudent = currentUser.IsInRole(Roles.Student);

        return page.Map(r =>
        {
            // BR-13: phòng đã đủ hoặc đã đóng trong giai đoạn tuyển dụng (Closed) thì ẩn Leader với sinh viên ngoài nhóm.
            // Hậu chốt sổ (Locked), hiển thị Leader để sinh viên dễ dàng nhận diện phòng khi điều chuyển.
            var hideLeader = isStudent
                             && r.Status == GroupStatus.Closed
                             && r.Members.All(m => m.UserId != currentUser.UserId);

            return new RoomSummaryResponse(
                r.Id,
                r.RoomCode,
                r.Name,
                r.Status.ToString(),
                r.Members.Count,
                r.MaxMembers,
                hideLeader ? null : r.LeaderId,
                hideLeader ? null : r.Members.FirstOrDefault(m => m.UserId == r.LeaderId)?.FullName,
                r.SpaceId,
                r.CreatedAt);
        });
    }

    public async Task<CourseSpaceResponse> CloseRegistrationAsync(Guid spaceId, CancellationToken ct = default)
    {
        var space = await spaceRepo.GetByIdAsync(spaceId, ct)
            ?? throw new NotFoundException("CourseSpace", spaceId);

        if (space.Status == CourseSpaceStatus.Locked)
        {
            throw new BusinessRuleException("SPACE_LOCKED", "Không gian môn học đã chốt sổ, không thể thay đổi trạng thái.");
        }

        space.Status = CourseSpaceStatus.ClosedRegistration;
        space.UpdatedAt = DateTime.UtcNow;

        await uow.SaveChangesAsync(ct);
        logger.LogInformation("Moderator closed registration for CourseSpace {SpaceId} (BR-30)", spaceId);

        return ToResponse(space, space.Enrollments.Count, space.Rooms.Count);
    }

    public async Task<UnmatchedSummaryResponse> GetUnmatchedSummaryAsync(Guid spaceId, CancellationToken ct = default)
    {
        var space = await spaceRepo.GetByIdAsync(spaceId, ct)
            ?? throw new NotFoundException("CourseSpace", spaceId);

        var enrollments = await spaceRepo.GetEnrollmentsBySpaceAsync(spaceId, ct);
        var rooms = await spaceRepo.GetRoomsBySpaceAsync(spaceId, null, ct);

        var joinedUserIds = rooms
            .SelectMany(r => r.Members.Select(m => m.UserId))
            .ToHashSet();

        var unmatchedEnrollments = enrollments
            .Where(e => !joinedUserIds.Contains(e.StudentId))
            .ToList();

        var studentIds = unmatchedEnrollments.Select(e => e.StudentId).ToList();
        var profiles = studentIds.Count > 0
            ? (await userClient.GetProfilesAsync(studentIds, ct)).ToDictionary(p => p.UserId)
            : new Dictionary<Guid, UserProfileDto>();

        var unmatchedList = unmatchedEnrollments.Select(e =>
        {
            profiles.TryGetValue(e.StudentId, out var profile);
            return new UnmatchedStudentItem(
                e.StudentId,
                e.StudentCode,
                e.FullName,
                e.Email,
                e.Major,
                e.Cohort,
                profile?.TechScore ?? 50,
                profile?.ManagementScore ?? 50,
                profile?.GraphicDesignScore ?? 50,
                profile?.MarketingScore ?? 50,
                profile?.SaleScore ?? 50
            );
        }).ToList();

        var incompleteRooms = rooms
            .Where(r => r.Members.Count > 0 && r.Members.Count < space.MaxMembersPerGroup && r.Status != GroupStatus.Locked)
            .Select(ToRoomDistributionItem)
            .ToList();

        var emptyRooms = rooms
            .Where(r => r.Members.Count == 0 || r.Status == GroupStatus.Empty)
            .Select(ToRoomDistributionItem)
            .ToList();

        var fullRooms = rooms
            .Where(r => r.Members.Count >= space.MaxMembersPerGroup || r.Status == GroupStatus.Locked)
            .Select(ToRoomDistributionItem)
            .ToList();

        return new UnmatchedSummaryResponse(
            space.Id,
            space.SemesterCode,
            space.SubjectCode,
            space.Status.ToString(),
            enrollments.Count,
            enrollments.Count - unmatchedList.Count,
            unmatchedList.Count,
            unmatchedList,
            incompleteRooms,
            emptyRooms,
            fullRooms
        );
    }

    public async Task<DistributePreviewResponse> PreviewDistributionAsync(Guid spaceId, CancellationToken ct = default)
    {
        var space = await spaceRepo.GetByIdAsync(spaceId, ct)
            ?? throw new NotFoundException("CourseSpace", spaceId);

        var summary = await GetUnmatchedSummaryAsync(spaceId, ct);
        if (summary.TotalUnmatched == 0)
        {
            return new DistributePreviewResponse(spaceId, 0, 0, 0, []);
        }

        var grpcRequest = new DistributeRequest
        {
            SpaceId = spaceId.ToString(),
            MaxMembers = space.MaxMembersPerGroup,
            GroupThreshold = space.GroupThreshold
        };

        foreach (var s in summary.UnmatchedStudents)
        {
            grpcRequest.UnmatchedStudents.Add(new DistributeCandidate
            {
                UserId = s.UserId.ToString(),
                FullName = s.FullName,
                StudentCode = s.StudentCode,
                Major = s.Major,
                TechScore = s.TechScore,
                ManagementScore = s.ManagementScore,
                GraphicDesignScore = s.GraphicDesignScore,
                MarketingScore = s.MarketingScore,
                SaleScore = s.SaleScore
            });
        }

        var rooms = await spaceRepo.GetRoomsBySpaceAsync(spaceId, null, ct);
        var existingRoomsWithMembers = rooms
            .Where(r => r.Members.Count > 0 && r.Members.Count < space.MaxMembersPerGroup && r.Status != GroupStatus.Locked)
            .ToList();

        var emptyRooms = rooms
            .Where(r => r.Members.Count == 0 || r.Status == GroupStatus.Empty)
            .ToList();

        var existingMemberIds = existingRoomsWithMembers.SelectMany(r => r.Members.Select(m => m.UserId)).Distinct().ToList();
        var existingProfiles = existingMemberIds.Count > 0
            ? (await userClient.GetProfilesAsync(existingMemberIds, ct)).ToDictionary(p => p.UserId)
            : new Dictionary<Guid, UserProfileDto>();

        foreach (var r in existingRoomsWithMembers)
        {
            var distRoom = new DistributeRoom
            {
                RoomId = r.Id.ToString(),
                RoomCode = r.RoomCode,
                Name = r.Name,
                LeaderId = r.LeaderId?.ToString() ?? string.Empty,
                IsEmpty = false
            };

            foreach (var m in r.Members)
            {
                existingProfiles.TryGetValue(m.UserId, out var prof);
                distRoom.CurrentMembers.Add(new DistributeRoomMember
                {
                    UserId = m.UserId.ToString(),
                    FullName = m.FullName,
                    StudentCode = string.Empty,
                    Major = prof?.Major ?? string.Empty,
                    IsLeader = m.UserId == r.LeaderId,
                    TechScore = prof?.TechScore ?? 50,
                    ManagementScore = prof?.ManagementScore ?? 50,
                    GraphicDesignScore = prof?.GraphicDesignScore ?? 50,
                    MarketingScore = prof?.MarketingScore ?? 50,
                    SaleScore = prof?.SaleScore ?? 50
                });
            }

            grpcRequest.ExistingRooms.Add(distRoom);
        }

        foreach (var r in emptyRooms)
        {
            grpcRequest.EmptyRooms.Add(new DistributeRoom
            {
                RoomId = r.Id.ToString(),
                RoomCode = r.RoomCode,
                Name = r.Name,
                IsEmpty = true
            });
        }

        var grpcResponse = await matchingClient.DistributeUnmatchedStudentsAsync(grpcRequest, ct);

        var plans = grpcResponse.RoomPlans.Select(p => new DistributedRoomPlanDto(
            Guid.Parse(p.RoomId),
            p.RoomCode,
            p.Name,
            Guid.TryParse(p.LeaderId, out var lid) ? lid : null,
            p.LeaderName,
            p.IsNewlyFormed,
            p.MemberCountBefore,
            p.MemberCountAfter,
            p.AddedStudents.Select(a => new AssignedStudentDto(
                Guid.Parse(a.UserId),
                a.StudentCode,
                a.FullName,
                a.Major,
                a.IsLeader,
                a.ManagementScore)).ToList(),
            p.FinalMembers.Select(f => new AssignedStudentDto(
                Guid.Parse(f.UserId),
                f.StudentCode,
                f.FullName,
                f.Major,
                f.IsLeader,
                f.ManagementScore)).ToList(),
            p.BalanceScore
        )).ToList();

        return new DistributePreviewResponse(
            spaceId,
            grpcResponse.TotalUnmatched,
            grpcResponse.TotalDistributed,
            grpcResponse.TotalRemaining,
            plans,
            // Dư ít người thì nhóm có thể dưới ngưỡng: báo để Moderator tự xử lý trước khi chốt sổ.
            plans.Where(p => p.MemberCountAfter < space.GroupThreshold).Select(p => p.RoomCode).ToList()
        );
    }

    public async Task<DistributeConfirmResponse> ConfirmDistributionAsync(Guid spaceId, CancellationToken ct = default)
    {
        var space = await spaceRepo.GetByIdAsync(spaceId, ct)
            ?? throw new NotFoundException("CourseSpace", spaceId);

        if (space.Status == CourseSpaceStatus.Locked)
        {
            throw new BusinessRuleException("SPACE_LOCKED", "Không thể phân phối sinh viên vào không gian môn học đã chốt sổ.");
        }

        var preview = await PreviewDistributionAsync(spaceId, ct);
        if (preview.TotalDistributed == 0)
        {
            return new DistributeConfirmResponse(spaceId, 0, preview.TotalRemaining, 0, []);
        }

        var trackedRooms = (await spaceRepo.GetTrackedRoomsBySpaceAsync(spaceId, ct))
            .ToDictionary(r => r.Id);

        var enrollments = (await spaceRepo.GetEnrollmentsBySpaceAsync(spaceId, ct))
            .ToDictionary(e => e.StudentId);

        var now = DateTime.UtcNow;
        int updatedRoomsCount = 0;
        var joinedEvents = new List<MemberJoined>();
        var distributedStudentIds = new HashSet<Guid>();

        foreach (var plan in preview.RoomPlans)
        {
            if (plan.AddedStudents.Count == 0) continue;
            if (!trackedRooms.TryGetValue(plan.RoomId, out var room)) continue;

            foreach (var student in plan.AddedStudents)
            {
                if (room.Members.Any(m => m.UserId == student.UserId)) continue;

                var role = student.IsLeader ? MemberRole.Leader : MemberRole.Member;
                enrollments.TryGetValue(student.UserId, out var enrollment);
                var email = enrollment?.Email ?? $"{student.StudentCode.ToLowerInvariant()}@fpt.edu.vn";
                var resolvedUserId = enrollment?.StudentId != null && enrollment.StudentId != Guid.Empty
                    ? enrollment.StudentId
                    : student.UserId;

                room.Members.Add(new GroupMember
                {
                    GroupId = room.Id,
                    UserId = resolvedUserId,
                    FullName = student.FullName,
                    Email = email,
                    Role = role,
                    JoinedAt = now
                });

                if (student.IsLeader)
                {
                    room.LeaderId = resolvedUserId;
                }

                distributedStudentIds.Add(resolvedUserId);
                joinedEvents.Add(new MemberJoined(
                    room.Id,
                    room.Name,
                    resolvedUserId,
                    email,
                    student.FullName,
                    room.Members.Count,
                    room.MaxMembers));
            }

            room.Status = ResolveRoomStatus(room, space.MaxMembersPerGroup, space.GroupThreshold);
            room.UpdatedAt = now;
            updatedRoomsCount++;
        }

        // BR-26: sinh viên đã được xếp nhóm thì mọi đơn đang chờ của họ trong môn này thành Cancelled.
        foreach (var pending in await spaceRepo.GetPendingJoinRequestsBySpaceAsync(spaceId, ct))
        {
            if (distributedStudentIds.Contains(pending.StudentId))
            {
                pending.Status = JoinRequestStatus.Cancelled;
                pending.DecidedAt = now;
            }
        }

        space.UpdatedAt = now;
        await uow.SaveChangesAsync(ct);

        // Chỉ phát event sau khi đã lưu, để không báo cho consumer về thay đổi chưa commit.
        foreach (var joined in joinedEvents)
        {
            await eventPublisher.PublishAsync(joined, ct);
        }

        logger.LogInformation("Confirmed distribution for CourseSpace {SpaceId}: {Distributed} students distributed to {Rooms} rooms (BR-31, BR-32)",
            spaceId, preview.TotalDistributed, updatedRoomsCount);

        return new DistributeConfirmResponse(
            spaceId,
            preview.TotalDistributed,
            preview.TotalRemaining,
            updatedRoomsCount,
            preview.RoomPlans
        );
    }

    public async Task<FinalizeSpaceResponse> FinalizeSpaceAsync(Guid spaceId, CancellationToken ct = default)
    {
        var space = await spaceRepo.GetByIdAsync(spaceId, ct)
            ?? throw new NotFoundException("CourseSpace", spaceId);

        if (space.Status == CourseSpaceStatus.Locked)
        {
            throw new BusinessRuleException("ALREADY_FINALIZED", "Không gian môn học này đã được chốt sổ trước đó.");
        }

        if (space.Status != CourseSpaceStatus.ClosedRegistration)
        {
            throw new BusinessRuleException("REGISTRATION_NOT_CLOSED",
                "Phải đóng đăng ký trước khi chốt sổ.");
        }

        var now = DateTime.UtcNow;

        var trackedRooms = await spaceRepo.GetTrackedRoomsBySpaceAsync(spaceId, ct);
        int lockedRoomsCount = 0;

        var joinedUserIds = trackedRooms.SelectMany(r => r.Members.Select(m => m.UserId)).ToHashSet();
        var unmatchedStudentsCount = (await spaceRepo.GetEnrollmentsBySpaceAsync(spaceId, ct))
            .Count(e => !joinedUserIds.Contains(e.StudentId));

        var availableCapacity = trackedRooms.Sum(r => Math.Max(0, space.MaxMembersPerGroup - r.Members.Count));
        if (unmatchedStudentsCount > 0 && availableCapacity > 0)
        {
            throw new BusinessRuleException("UNMATCHED_STUDENTS_REMAINING",
                $"Không thể chốt sổ học kỳ vì còn {unmatchedStudentsCount} sinh viên lẻ chưa được ghép nhóm. Vui lòng thực hiện 'Điều phối Sinh viên lẻ' trước khi chốt sổ.");
        }

        space.Status = CourseSpaceStatus.Locked;
        space.UpdatedAt = now;

        foreach (var room in trackedRooms)
        {
            if (room.Members.Count > 0)
            {
                room.Status = GroupStatus.Locked;
                room.UpdatedAt = now;
                lockedRoomsCount++;
            }
            else
            {
                // Phòng dự phòng dư không có thành viên: đóng phòng (BR-33)
                room.Status = GroupStatus.Closed;
                room.UpdatedAt = now;
            }
        }

        var pendingRequests = await spaceRepo.GetPendingJoinRequestsBySpaceAsync(spaceId, ct);
        int rejectedRequestsCount = pendingRequests.Count;

        foreach (var req in pendingRequests)
        {
            req.Status = JoinRequestStatus.Rejected;
            req.DecidedAt = now;
        }

        await uow.SaveChangesAsync(ct);

        await eventPublisher.PublishAsync(new SpaceFinalized(
            space.Id,
            space.SemesterCode,
            space.SubjectCode,
            lockedRoomsCount,
            rejectedRequestsCount,
            now), ct);

        logger.LogInformation("CourseSpace {SpaceId} finalized (BR-33): {LockedRooms} rooms locked, {RejectedRequests} requests rejected",
            spaceId, lockedRoomsCount, rejectedRequestsCount);

        return new FinalizeSpaceResponse(
            space.Id,
            space.SemesterCode,
            space.SubjectCode,
            space.Status.ToString(),
            lockedRoomsCount,
            rejectedRequestsCount,
            now,
            unmatchedStudentsCount
        );
    }

    /// <summary>Trạng thái Room theo sĩ số (BR-14, BR-16, BR-17, BR-28). Nhóm Leader đã đóng tuyển vẫn giữ Closed.</summary>
    private static GroupStatus ResolveRoomStatus(GroupEntity room, int maxMembers, int threshold)
    {
        if (room.Status == GroupStatus.Locked) return GroupStatus.Locked;
        if (room.Members.Count == 0) return GroupStatus.Empty;
        if (room.Members.Count < threshold) return GroupStatus.Forming;
        if (room.Members.Count >= maxMembers || room.IsClosedByLeader) return GroupStatus.Closed;
        return GroupStatus.Recruiting;
    }

    /// <summary>
    /// Sau khi chuyển nhóm: nhóm không còn Leader hợp lệ thì người vào sớm nhất làm Leader (BR-20),
    /// và nhóm đã có người trong Space đã chốt sổ thì khóa lại (BR-33).
    /// </summary>
    private static void NormalizeRoomAfterTransfer(GroupEntity room)
    {
        if (room.Members.Count == 0)
        {
            room.LeaderId = null;
        }
        else if (room.Members.All(m => m.UserId != room.LeaderId))
        {
            var nextLeader = room.Members.OrderBy(m => m.JoinedAt).First();
            room.LeaderId = nextLeader.UserId;
            nextLeader.Role = MemberRole.Leader;
        }

        room.Status = room.Members.Count == 0 ? GroupStatus.Closed : GroupStatus.Locked;
    }

    private static RoomDistributionItem ToRoomDistributionItem(GroupEntity r)
    {
        var leader = r.Members.FirstOrDefault(m => m.UserId == r.LeaderId);
        var members = r.Members.Select(m => new RoomMemberSummary(
            m.UserId,
            m.FullName,
            null,
            m.UserId == r.LeaderId,
            m.JoinedAt
        )).ToList();

        return new RoomDistributionItem(
            r.Id,
            r.RoomCode ?? r.Name,
            r.Name,
            r.Members.Count,
            r.MaxMembers,
            r.LeaderId,
            leader?.FullName,
            members
        );
    }

    private static CourseSpaceResponse ToResponse(CourseSpace s, int totalStudents, int totalRooms)
    {
        return new CourseSpaceResponse(
            s.Id,
            s.SemesterCode,
            s.SubjectCode,
            s.Name,
            s.MaxMembersPerGroup,
            s.GroupThreshold,
            s.BufferRatio,
            s.MaxConcurrentApplies,
            DateTime.SpecifyKind(s.RegistrationDeadline, DateTimeKind.Utc),
            s.Status.ToString(),
            totalStudents,
            totalRooms,
            DateTime.SpecifyKind(s.CreatedAt, DateTimeKind.Utc),
            DateTime.SpecifyKind(s.UpdatedAt, DateTimeKind.Utc)
        );
    }

    private static string ParseCohortFromStudentCode(string studentCode)
    {
        var match = CohortRegex().Match(studentCode);
        return match.Success ? $"K{match.Groups[1].Value}" : "K18";
    }

    [GeneratedRegex(@"(?:[A-Za-z]+)?(\d{2})")]
    private static partial Regex CohortRegex();

    private async Task ProvisionAccountsAsync(
        string semesterCode,
        string subjectCode,
        List<SpaceEnrollment> enrollments,
        string? authHeader,
        CancellationToken ct)
    {
        var client = httpClientFactory.CreateClient("Auth");
        if (!string.IsNullOrWhiteSpace(authHeader))
        {
            client.DefaultRequestHeaders.Remove("Authorization");
            client.DefaultRequestHeaders.TryAddWithoutValidation("Authorization", authHeader);
        }

        var payload = new
        {
            semesterCode,
            subjectCode,
            students = enrollments.Select(e => new
            {
                studentCode = e.StudentCode,
                fullName = e.FullName,
                email = e.Email,
                major = e.Major,
                classCode = e.ClassCode
            })
        };

        var content = new StringContent(JsonSerializer.Serialize(payload), System.Text.Encoding.UTF8, "application/json");

        string body;
        try
        {
            using var response = await client.PostAsync("/api/auth/accounts/provision-fap", content, ct);
            body = await response.Content.ReadAsStringAsync(ct);
            if (!response.IsSuccessStatusCode)
            {
                logger.LogError("Auth Service provision-fap responded with {StatusCode}: {ErrorBody}", response.StatusCode, body);
                throw ProvisioningFailed();
            }
        }
        catch (HttpRequestException ex)
        {
            logger.LogError(ex, "Could not reach Auth Service to provision FAP accounts");
            throw ProvisioningFailed();
        }

        var accountIdsByEmail = new Dictionary<string, Guid>(StringComparer.OrdinalIgnoreCase);
        try
        {
            using var doc = JsonDocument.Parse(body);
            if (doc.RootElement.TryGetProperty("results", out var results) && results.ValueKind == JsonValueKind.Array)
            {
                foreach (var item in results.EnumerateArray())
                {
                    if (item.TryGetProperty("accountId", out var idElem) && idElem.TryGetGuid(out var accountId) &&
                        item.TryGetProperty("email", out var emailElem) && !string.IsNullOrWhiteSpace(emailElem.GetString()))
                    {
                        accountIdsByEmail[emailElem.GetString()!.Trim()] = accountId;
                    }
                }
            }
        }
        catch (JsonException ex)
        {
            logger.LogError(ex, "Could not parse the provision-fap response from Auth Service");
            throw ProvisioningFailed();
        }

        foreach (var enrollment in enrollments)
        {
            if (!accountIdsByEmail.TryGetValue(enrollment.Email, out var accountId) || accountId == Guid.Empty)
            {
                logger.LogError("Auth Service did not return an account for student {StudentCode}", enrollment.StudentCode);
                throw ProvisioningFailed();
            }

            enrollment.StudentId = accountId;
        }

        logger.LogInformation("Provisioned {Count} FAP accounts through Auth Service", enrollments.Count);
    }

    private static BusinessRuleException ProvisioningFailed() =>
        new("ACCOUNT_PROVISIONING_FAILED", "Không tạo được tài khoản cho danh sách sinh viên nên chưa import. Vui lòng thử lại sau.");

    // ── Phase 6: Post-Lock Transfer & Lecturer Dashboard (BR-35, BR-36, BR-37, BR-38) ──

    public async Task<TransferRequestResponse> DirectTransferAsync(
        Guid spaceId, DirectTransferRequest request, Guid moderatorId, CancellationToken ct = default)
    {
        var space = await spaceRepo.GetByIdAsync(spaceId, ct)
            ?? throw new NotFoundException($"Không tìm thấy Không gian môn học '{spaceId}'.");

        if (space.Status != CourseSpaceStatus.Locked)
        {
            throw new BusinessRuleException("SPACE_NOT_LOCKED",
                "Điều chuyển sinh viên sau chốt sổ chỉ được thực hiện khi Không gian học phần đã Chốt sổ (Locked).");
        }

        if (string.IsNullOrWhiteSpace(request.Reason))
        {
            throw new BusinessRuleException("REASON_REQUIRED", "Vui lòng nhập lý do điều chuyển sinh viên.");
        }

        var enrollments = await spaceRepo.GetEnrollmentsBySpaceAsync(spaceId, ct);
        var studentEnrollment = enrollments.FirstOrDefault(e => e.StudentId == request.StudentId)
            ?? throw new BusinessRuleException("STUDENT_NOT_ENROLLED", "Sinh viên không thuộc danh sách Không gian học phần này.");

        var effectiveSwapId = request.EffectiveSwapStudentId;
        SpaceEnrollment? swapEnrollment = null;
        if (effectiveSwapId.HasValue)
        {
            swapEnrollment = enrollments.FirstOrDefault(e => e.StudentId == effectiveSwapId.Value)
                ?? throw new BusinessRuleException("SWAP_STUDENT_NOT_ENROLLED", "Sinh viên đổi chéo không thuộc danh sách Không gian học phần này.");
        }

        var rooms = await spaceRepo.GetTrackedRoomsBySpaceAsync(spaceId, ct);
        var fromGroup = rooms.FirstOrDefault(r => r.Members.Any(m => m.UserId == request.StudentId))
            ?? throw new BusinessRuleException("STUDENT_NOT_IN_GROUP", "Sinh viên hiện không ở trong bất kỳ nhóm nào của Không gian học phần này.");

        var targetGroup = rooms.FirstOrDefault(r => r.Id == request.TargetGroupId)
            ?? throw new NotFoundException($"Không tìm thấy nhóm đích '{request.TargetGroupId}'.");

        if (fromGroup.Id == targetGroup.Id)
        {
            throw new BusinessRuleException("SAME_GROUP", "Nhóm đích trùng với nhóm hiện tại của sinh viên.");
        }

        // BR-37 Validation
        if (!effectiveSwapId.HasValue)
        {
            // One-way transfer: Target group must have capacity, source group must stay >= GroupThreshold
            if (targetGroup.Members.Count >= space.MaxMembersPerGroup)
            {
                throw new BusinessRuleException("TARGET_GROUP_FULL",
                    $"Nhóm đích ({targetGroup.RoomCode ?? targetGroup.Name}) đã đạt sĩ số tối đa ({space.MaxMembersPerGroup} SV). Hãy chọn Đổi chéo (Swap) với 1 sinh viên của nhóm đích.");
            }

            if (fromGroup.Members.Count - 1 < space.GroupThreshold)
            {
                throw new BusinessRuleException("FROM_GROUP_BELOW_THRESHOLD",
                    $"Nhóm cũ ({fromGroup.RoomCode ?? fromGroup.Name}) hiện chỉ có {fromGroup.Members.Count} SV. Chuyển đi sẽ giảm còn {fromGroup.Members.Count - 1} SV (dưới ngưỡng tối thiểu {space.GroupThreshold} SV của môn học). Bắt buộc phải chọn Đổi chéo (Swap) với 1 sinh viên của nhóm đích.");
            }
        }
        else
        {
            // Two-way swap: Swap student must belong to target group
            if (!targetGroup.Members.Any(m => m.UserId == effectiveSwapId.Value))
            {
                throw new BusinessRuleException("SWAP_STUDENT_NOT_IN_TARGET_GROUP",
                    $"Sinh viên {swapEnrollment?.FullName ?? "đối ứng"} không thuộc nhóm đích ({targetGroup.RoomCode ?? targetGroup.Name}).");
            }
        }

        // Execute Member Transfer
        var memberToMove = fromGroup.Members.First(m => m.UserId == request.StudentId);
        fromGroup.Members.Remove(memberToMove);

        GroupMember? swapMemberToMove = null;
        if (effectiveSwapId.HasValue)
        {
            swapMemberToMove = targetGroup.Members.First(m => m.UserId == effectiveSwapId.Value);
            targetGroup.Members.Remove(swapMemberToMove);

            fromGroup.Members.Add(new GroupMember
            {
                GroupId = fromGroup.Id,
                UserId = swapMemberToMove.UserId,
                FullName = swapMemberToMove.FullName,
                Email = swapMemberToMove.Email,
                Role = MemberRole.Member,
                JoinedAt = DateTime.UtcNow
            });
        }

        targetGroup.Members.Add(new GroupMember
        {
            GroupId = targetGroup.Id,
            UserId = memberToMove.UserId,
            FullName = memberToMove.FullName,
            Email = memberToMove.Email,
            Role = MemberRole.Member,
            JoinedAt = DateTime.UtcNow
        });

        fromGroup.UpdatedAt = DateTime.UtcNow;
        targetGroup.UpdatedAt = DateTime.UtcNow;

        NormalizeRoomAfterTransfer(fromGroup);
        NormalizeRoomAfterTransfer(targetGroup);

        // Log transfer record (BR-35 audit)
        var transferLog = new GroupTransferRequest
        {
            Id = Guid.NewGuid(),
            SpaceId = spaceId,
            RequesterStudentId = memberToMove.UserId,
            RequesterStudentName = memberToMove.FullName,
            RequesterStudentCode = studentEnrollment.StudentCode,
            FromGroupId = fromGroup.Id,
            FromGroupCode = fromGroup.RoomCode ?? fromGroup.Name,
            TargetGroupId = targetGroup.Id,
            TargetGroupCode = targetGroup.RoomCode ?? targetGroup.Name,
            SwapWithStudentId = effectiveSwapId,
            SwapWithStudentName = swapMemberToMove?.FullName,
            SwapWithStudentCode = swapEnrollment?.StudentCode,
            Reason = request.Reason.Trim(),
            Status = TransferRequestStatus.Approved,
            CreatedAt = DateTime.UtcNow,
            DecidedAt = DateTime.UtcNow,
            DecidedByModeratorId = moderatorId,
            DecisionReason = "Điều chuyển trực tiếp bởi Moderator"
        };

        spaceRepo.AddTransferRequest(transferLog);
        await uow.SaveChangesAsync(ct);

        logger.LogInformation("Direct transfer executed by Moderator {ModId}: Student {StudentCode} moved from Group {FromGroup} to Group {TargetGroup} (Swap: {IsSwap})",
            moderatorId, studentEnrollment.StudentCode, fromGroup.RoomCode, targetGroup.RoomCode, effectiveSwapId.HasValue);

        // Publish Event
        await eventPublisher.PublishAsync(new MemberTransferredPostLock(
            spaceId,
            memberToMove.UserId,
            memberToMove.FullName,
            memberToMove.Email,
            fromGroup.Id,
            fromGroup.RoomCode ?? fromGroup.Name,
            targetGroup.Id,
            targetGroup.RoomCode ?? targetGroup.Name,
            effectiveSwapId,
            swapMemberToMove?.FullName,
            request.Reason.Trim(),
            DateTime.UtcNow), ct);

        return MapTransferRequestResponse(transferLog);
    }

    public async Task<TransferRequestResponse> CreateTransferRequestAsync(
        Guid spaceId, CreateTransferRequest request, Guid studentId, CancellationToken ct = default)
    {
        var space = await spaceRepo.GetByIdAsync(spaceId, ct)
            ?? throw new NotFoundException($"Không tìm thấy Không gian môn học '{spaceId}'.");

        if (space.Status != CourseSpaceStatus.Locked)
        {
            throw new BusinessRuleException("SPACE_NOT_LOCKED",
                "Yêu cầu chuyển nhóm chỉ được gửi sau khi Không gian học phần đã Chốt sổ (Locked).");
        }

        if (string.IsNullOrWhiteSpace(request.Reason))
        {
            throw new BusinessRuleException("REASON_REQUIRED", "Vui lòng nhập lý do xin chuyển nhóm.");
        }

        var hasPending = await spaceRepo.HasPendingTransferRequestAsync(spaceId, studentId, ct);
        if (hasPending)
        {
            throw new BusinessRuleException("PENDING_REQUEST_EXISTS",
                "Bạn đã có một yêu cầu chuyển nhóm đang chờ Moderator duyệt trong môn học này.");
        }

        var enrollments = await spaceRepo.GetEnrollmentsBySpaceAsync(spaceId, ct);
        var studentEnrollment = enrollments.FirstOrDefault(e => e.StudentId == studentId)
            ?? throw new BusinessRuleException("STUDENT_NOT_ENROLLED", "Bạn không thuộc danh sách ghi danh của Không gian học phần này.");

        var effectiveSwapId = request.EffectiveSwapStudentId;
        SpaceEnrollment? swapEnrollment = null;
        if (effectiveSwapId.HasValue)
        {
            swapEnrollment = enrollments.FirstOrDefault(e => e.StudentId == effectiveSwapId.Value)
                ?? throw new BusinessRuleException("SWAP_STUDENT_NOT_ENROLLED", "Sinh viên đổi chéo không thuộc Không gian học phần này.");
        }

        var rooms = await spaceRepo.GetTrackedRoomsBySpaceAsync(spaceId, ct);
        var fromGroup = rooms.FirstOrDefault(r => r.Members.Any(m => m.UserId == studentId))
            ?? throw new BusinessRuleException("STUDENT_NOT_IN_GROUP", "Bạn hiện không ở trong bất kỳ nhóm nào của môn này.");

        var targetGroup = rooms.FirstOrDefault(r => r.Id == request.TargetGroupId)
            ?? throw new NotFoundException($"Không tìm thấy nhóm đích '{request.TargetGroupId}'.");

        if (fromGroup.Id == targetGroup.Id)
        {
            throw new BusinessRuleException("SAME_GROUP", "Nhóm đích trùng với nhóm hiện tại của bạn.");
        }

        // BR-37 Validation check at request time
        if (!effectiveSwapId.HasValue)
        {
            if (targetGroup.Members.Count >= space.MaxMembersPerGroup)
            {
                throw new BusinessRuleException("TARGET_GROUP_FULL",
                    $"Nhóm đích ({targetGroup.RoomCode ?? targetGroup.Name}) đã đạt sĩ số tối đa ({space.MaxMembersPerGroup} SV). Bạn cần chọn Đổi chéo (Swap) với một thành viên của nhóm đích.");
            }

            if (fromGroup.Members.Count - 1 < space.GroupThreshold)
            {
                throw new BusinessRuleException("FROM_GROUP_BELOW_THRESHOLD",
                    $"Nhóm hiện tại của bạn ({fromGroup.RoomCode ?? fromGroup.Name}) chỉ có {fromGroup.Members.Count} SV. Nếu bạn chuyển đi sẽ còn {fromGroup.Members.Count - 1} SV (dưới ngưỡng tối thiểu {space.GroupThreshold} SV). Bạn bắt buộc phải chọn Đổi chéo (Swap) với một thành viên của nhóm đích.");
            }
        }
        else
        {
            if (!targetGroup.Members.Any(m => m.UserId == effectiveSwapId.Value))
            {
                throw new BusinessRuleException("SWAP_STUDENT_NOT_IN_TARGET_GROUP",
                    $"Sinh viên {swapEnrollment?.FullName ?? "đối ứng"} không thuộc nhóm đích ({targetGroup.RoomCode ?? targetGroup.Name}).");
            }
        }

        var entity = new GroupTransferRequest
        {
            Id = Guid.NewGuid(),
            SpaceId = spaceId,
            RequesterStudentId = studentId,
            RequesterStudentName = studentEnrollment.FullName,
            RequesterStudentCode = studentEnrollment.StudentCode,
            FromGroupId = fromGroup.Id,
            FromGroupCode = fromGroup.RoomCode ?? fromGroup.Name,
            TargetGroupId = targetGroup.Id,
            TargetGroupCode = targetGroup.RoomCode ?? targetGroup.Name,
            SwapWithStudentId = effectiveSwapId,
            SwapWithStudentName = swapEnrollment?.FullName,
            SwapWithStudentCode = swapEnrollment?.StudentCode,
            Reason = request.Reason.Trim(),
            Status = TransferRequestStatus.Pending,
            CreatedAt = DateTime.UtcNow
        };

        spaceRepo.AddTransferRequest(entity);
        await uow.SaveChangesAsync(ct);

        await eventPublisher.PublishAsync(new TransferRequestCreated(
            entity.Id,
            spaceId,
            studentId,
            entity.RequesterStudentName,
            entity.RequesterStudentCode,
            entity.FromGroupId,
            entity.FromGroupCode,
            entity.TargetGroupId,
            entity.TargetGroupCode,
            entity.SwapWithStudentId,
            entity.SwapWithStudentName,
            entity.Reason,
            entity.CreatedAt), ct);

        logger.LogInformation("Student {StudentCode} submitted transfer request {ReqId} in space {SpaceId}",
            studentEnrollment.StudentCode, entity.Id, spaceId);

        return MapTransferRequestResponse(entity);
    }

    public async Task<IReadOnlyList<TransferRequestResponse>> GetTransferRequestsAsync(
        Guid spaceId, TransferRequestStatus? status, CancellationToken ct = default)
    {
        var list = await spaceRepo.GetTransferRequestsBySpaceAsync(spaceId, status, ct);
        return list.Select(MapTransferRequestResponse).ToList();
    }

    public async Task<IReadOnlyList<TransferRequestResponse>> GetMyTransferRequestsAsync(
        Guid studentId, CancellationToken ct = default)
    {
        var list = await spaceRepo.GetTransferRequestsByStudentAsync(studentId, ct);
        return list.Select(MapTransferRequestResponse).ToList();
    }

    public async Task<TransferRequestResponse> CancelTransferRequestAsync(
        Guid requestId, Guid studentId, CancellationToken ct = default)
    {
        var transferReq = await spaceRepo.GetTransferRequestByIdAsync(requestId, ct)
            ?? throw new NotFoundException($"Không tìm thấy yêu cầu chuyển nhóm '{requestId}'.");

        if (transferReq.RequesterStudentId != studentId)
        {
            throw new BusinessRuleException("NOT_REQUEST_OWNER", "Bạn không có quyền hủy yêu cầu chuyển nhóm của sinh viên khác.");
        }

        if (transferReq.Status != TransferRequestStatus.Pending)
        {
            throw new BusinessRuleException("REQUEST_NOT_PENDING",
                $"Chỉ có thể hủy yêu cầu đang ở trạng thái Chờ duyệt (Pending). Trạng thái hiện tại: {transferReq.Status}.");
        }

        transferReq.Status = TransferRequestStatus.Cancelled;
        transferReq.DecidedAt = DateTime.UtcNow;
        transferReq.DecisionReason = "Sinh viên đã chủ động hủy yêu cầu chuyển nhóm.";

        await uow.SaveChangesAsync(ct);
        await eventPublisher.PublishAsync(new TransferRequestCancelled(
            transferReq.Id,
            transferReq.SpaceId,
            studentId,
            DateTime.UtcNow), ct);
        logger.LogInformation("Student {StudentId} cancelled transfer request {ReqId}", studentId, requestId);

        return MapTransferRequestResponse(transferReq);
    }

    public async Task<TransferRequestResponse> DecideTransferRequestAsync(
        Guid spaceId, Guid requestId, DecideTransferRequest request, Guid moderatorId, CancellationToken ct = default)
    {
        var transferReq = await spaceRepo.GetTransferRequestByIdAsync(requestId, ct)
            ?? throw new NotFoundException($"Không tìm thấy yêu cầu chuyển nhóm '{requestId}'.");

        if (transferReq.SpaceId != spaceId)
        {
            throw new BusinessRuleException("SPACE_MISMATCH", "Yêu cầu chuyển nhóm không thuộc Không gian học phần này.");
        }

        if (transferReq.Status != TransferRequestStatus.Pending)
        {
            throw new BusinessRuleException("REQUEST_ALREADY_DECIDED",
                $"Yêu cầu chuyển nhóm này đã được xử lý trước đó với trạng thái: {transferReq.Status}.");
        }

        if (!request.IsApproved)
        {
            transferReq.Status = TransferRequestStatus.Rejected;
            transferReq.DecidedAt = DateTime.UtcNow;
            transferReq.DecidedByModeratorId = moderatorId;
            transferReq.DecisionReason = request.DecisionReason?.Trim() ?? "Moderator từ chối yêu cầu chuyển nhóm.";

            await uow.SaveChangesAsync(ct);
            await eventPublisher.PublishAsync(new TransferRequestRejected(
                transferReq.Id,
                transferReq.SpaceId,
                transferReq.RequesterStudentId,
                transferReq.RequesterStudentName,
                transferReq.DecisionReason,
                DateTime.UtcNow), ct);

            logger.LogInformation("Moderator {ModId} REJECTED transfer request {ReqId}: {Reason}",
                moderatorId, requestId, transferReq.DecisionReason);

            return MapTransferRequestResponse(transferReq);
        }

        // Approved: Execute transfer
        var space = await spaceRepo.GetByIdAsync(spaceId, ct)
            ?? throw new NotFoundException($"Không tìm thấy Không gian môn học '{spaceId}'.");

        var rooms = await spaceRepo.GetTrackedRoomsBySpaceAsync(spaceId, ct);
        var fromGroup = rooms.FirstOrDefault(r => r.Id == transferReq.FromGroupId)
            ?? throw new NotFoundException("Nhóm nguồn của sinh viên không còn tồn tại.");

        var targetGroup = rooms.FirstOrDefault(r => r.Id == transferReq.TargetGroupId)
            ?? throw new NotFoundException("Nhóm đích không còn tồn tại.");

        var memberToMove = fromGroup.Members.FirstOrDefault(m => m.UserId == transferReq.RequesterStudentId);
        if (memberToMove == null)
        {
            throw new BusinessRuleException("STUDENT_NOT_IN_FROM_GROUP",
                "Sinh viên hiện không còn ở trong nhóm nguồn ban đầu.");
        }

        // Re-validate BR-37 at approval time
        if (!transferReq.SwapWithStudentId.HasValue)
        {
            if (targetGroup.Members.Count >= space.MaxMembersPerGroup)
            {
                throw new BusinessRuleException("TARGET_GROUP_FULL",
                    $"Nhóm đích ({targetGroup.RoomCode ?? targetGroup.Name}) hiện đã đủ {space.MaxMembersPerGroup} SV. Không thể duyệt chuyển 1 chiều. Hãy yêu cầu SV chọn đổi chéo (Swap).");
            }

            if (fromGroup.Members.Count - 1 < space.GroupThreshold)
            {
                throw new BusinessRuleException("FROM_GROUP_BELOW_THRESHOLD",
                    $"Nhóm cũ ({fromGroup.RoomCode ?? fromGroup.Name}) hiện chỉ còn {fromGroup.Members.Count} SV. Chuyển đi sẽ giảm còn {fromGroup.Members.Count - 1} SV (dưới ngưỡng tối thiểu {space.GroupThreshold} SV). Bắt buộc phải đổi chéo (Swap).");
            }
        }
        else
        {
            if (!targetGroup.Members.Any(m => m.UserId == transferReq.SwapWithStudentId.Value))
            {
                throw new BusinessRuleException("SWAP_STUDENT_NOT_IN_TARGET_GROUP",
                    $"Sinh viên đổi chéo ({transferReq.SwapWithStudentName}) không còn ở trong nhóm đích.");
            }
        }

        // Apply member swaps
        fromGroup.Members.Remove(memberToMove);

        GroupMember? swapMemberToMove = null;
        if (transferReq.SwapWithStudentId.HasValue)
        {
            swapMemberToMove = targetGroup.Members.First(m => m.UserId == transferReq.SwapWithStudentId.Value);
            targetGroup.Members.Remove(swapMemberToMove);

            fromGroup.Members.Add(new GroupMember
            {
                GroupId = fromGroup.Id,
                UserId = swapMemberToMove.UserId,
                FullName = swapMemberToMove.FullName,
                Email = swapMemberToMove.Email,
                Role = MemberRole.Member,
                JoinedAt = DateTime.UtcNow
            });
        }

        targetGroup.Members.Add(new GroupMember
        {
            GroupId = targetGroup.Id,
            UserId = memberToMove.UserId,
            FullName = memberToMove.FullName,
            Email = memberToMove.Email,
            Role = MemberRole.Member,
            JoinedAt = DateTime.UtcNow
        });

        fromGroup.UpdatedAt = DateTime.UtcNow;
        targetGroup.UpdatedAt = DateTime.UtcNow;

        NormalizeRoomAfterTransfer(fromGroup);
        NormalizeRoomAfterTransfer(targetGroup);

        transferReq.Status = TransferRequestStatus.Approved;
        transferReq.DecidedAt = DateTime.UtcNow;
        transferReq.DecidedByModeratorId = moderatorId;
        transferReq.DecisionReason = request.DecisionReason?.Trim() ?? "Moderator đã duyệt yêu cầu chuyển nhóm.";

        await uow.SaveChangesAsync(ct);
        logger.LogInformation("Moderator {ModId} APPROVED transfer request {ReqId}: Student {StudentCode} moved to Group {TargetGroup}",
            moderatorId, requestId, transferReq.RequesterStudentCode, targetGroup.RoomCode);

        // Publish Event
        await eventPublisher.PublishAsync(new MemberTransferredPostLock(
            spaceId,
            memberToMove.UserId,
            memberToMove.FullName,
            memberToMove.Email,
            fromGroup.Id,
            fromGroup.RoomCode ?? fromGroup.Name,
            targetGroup.Id,
            targetGroup.RoomCode ?? targetGroup.Name,
            transferReq.SwapWithStudentId,
            swapMemberToMove?.FullName,
            transferReq.Reason,
            DateTime.UtcNow), ct);

        return MapTransferRequestResponse(transferReq);
    }

    public async Task<SpaceRosterResponse> GetSpaceRosterAsync(Guid spaceId, CancellationToken ct = default)
    {
        var space = await spaceRepo.GetByIdAsync(spaceId, ct)
            ?? throw new NotFoundException($"Không tìm thấy Không gian môn học '{spaceId}'.");

        var enrollments = await spaceRepo.GetEnrollmentsBySpaceAsync(spaceId, ct);
        var enrollmentByStudentId = enrollments.ToDictionary(e => e.StudentId, e => e);

        var rooms = await spaceRepo.GetTrackedRoomsBySpaceAsync(spaceId, ct);

        var allMemberUserIds = rooms.SelectMany(r => r.Members.Select(m => m.UserId)).Distinct().ToList();
        var profileMap = new Dictionary<Guid, UserProfileDto>();
        if (allMemberUserIds.Count > 0)
        {
            try
            {
                var profiles = await userClient.GetProfilesAsync(allMemberUserIds, ct);
                profileMap = profiles.ToDictionary(p => p.UserId, p => p);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Could not fetch user profiles for space roster");
            }
        }

        var groupItems = new List<SpaceRosterGroupItem>();
        foreach (var r in rooms)
        {
            var members = new List<SpaceRosterMemberItem>();
            foreach (var m in r.Members.OrderBy(x => x.Role == MemberRole.Leader ? 0 : 1).ThenBy(x => x.JoinedAt))
            {
                enrollmentByStudentId.TryGetValue(m.UserId, out var enr);
                profileMap.TryGetValue(m.UserId, out var prof);

                members.Add(new SpaceRosterMemberItem(
                    m.UserId,
                    enr?.StudentCode ?? "",
                    m.FullName,
                    m.Email,
                    enr?.Major ?? prof?.Major ?? "",
                    enr?.Cohort ?? "",
                    m.Role == MemberRole.Leader ? "Leader" : "Member",
                    prof?.TechScore ?? 0,
                    prof?.ManagementScore ?? 0,
                    prof?.GraphicDesignScore ?? 0,
                    prof?.MarketingScore ?? 0,
                    prof?.SaleScore ?? 0,
                    m.JoinedAt));
            }

            var leaderMember = members.FirstOrDefault(m => m.Role == "Leader");

            groupItems.Add(new SpaceRosterGroupItem(
                r.Id,
                r.RoomCode ?? r.Name,
                r.Name,
                r.Status,
                r.Members.Count,
                r.MaxMembers,
                r.LeaderId,
                leaderMember?.FullName,
                r.ProjectDomain,
                members));
        }

        var lockedGroups = groupItems.Count(g => g.Status == GroupStatus.Locked);

        return new SpaceRosterResponse(
            space.Id,
            space.SemesterCode,
            space.SubjectCode,
            space.Name,
            space.Status,
            enrollments.Count,
            groupItems.Count,
            lockedGroups,
            groupItems);
    }

    public async Task<CsvExportResult> ExportSpaceRosterCsvAsync(Guid spaceId, CancellationToken ct = default)
    {
        var roster = await GetSpaceRosterAsync(spaceId, ct);

        var sb = new System.Text.StringBuilder();
        sb.AppendLine("STT,Mã phòng,Tên phòng/nhóm,Trạng thái phòng,MSSV,Họ và tên,Email trường,Chuyên ngành,Khóa,Vai trò,Tech (0-100),Management (0-100),Design (0-100),Marketing (0-100),Sale (0-100),Ngày vào nhóm,Đề tài");

        int stt = 1;
        foreach (var g in roster.Groups)
        {
            if (g.Members.Count == 0)
            {
                sb.AppendLine($"{stt++},{EscapeCsv(g.RoomCode)},{EscapeCsv(g.GroupName)},{g.Status},,,(Phòng trống),,,,0,0,0,0,0,,");
                continue;
            }

            foreach (var m in g.Members)
            {
                sb.AppendLine($"{stt++},{EscapeCsv(g.RoomCode)},{EscapeCsv(g.GroupName)},{g.Status},{EscapeCsv(m.StudentCode)},{EscapeCsv(m.FullName)},{EscapeCsv(m.Email)},{EscapeCsv(m.Major)},{EscapeCsv(m.Cohort)},{m.Role},{m.TechScore},{m.ManagementScore},{m.GraphicDesignScore},{m.MarketingScore},{m.SaleScore},{m.JoinedAt:yyyy-MM-dd HH:mm},{EscapeCsv(g.ProjectTitle ?? "")}");
            }
        }

        var utf8WithBom = new System.Text.UTF8Encoding(encoderShouldEmitUTF8Identifier: true);
        var bodyBytes = utf8WithBom.GetBytes(sb.ToString());
        var preamble = utf8WithBom.GetPreamble();
        var content = new byte[preamble.Length + bodyBytes.Length];
        Buffer.BlockCopy(preamble, 0, content, 0, preamble.Length);
        Buffer.BlockCopy(bodyBytes, 0, content, preamble.Length, bodyBytes.Length);

        var fileName = $"roster-{roster.SemesterCode}-{roster.SubjectCode}-{DateTime.UtcNow:yyyyMMdd-HHmmss}.csv";
        return new CsvExportResult(content, "text/csv; charset=utf-8", fileName);
    }

    private static string EscapeCsv(string? value)
    {
        if (string.IsNullOrEmpty(value)) return "";
        if (value.Contains(',') || value.Contains('"') || value.Contains('\n') || value.Contains('\r'))
        {
            return $"\"{value.Replace("\"", "\"\"")}\"";
        }
        return value;
    }

    private static TransferRequestResponse MapTransferRequestResponse(GroupTransferRequest t) =>
        new(
            t.Id,
            t.SpaceId,
            t.RequesterStudentId,
            t.RequesterStudentName,
            t.RequesterStudentCode,
            t.FromGroupId,
            t.FromGroupCode,
            t.TargetGroupId,
            t.TargetGroupCode,
            t.SwapWithStudentId,
            t.SwapWithStudentName,
            t.SwapWithStudentCode,
            t.Reason,
            t.Status,
            t.CreatedAt,
            t.DecidedAt,
            t.DecidedByModeratorId,
            t.DecisionReason);
}

