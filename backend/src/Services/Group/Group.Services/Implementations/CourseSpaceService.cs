using System.Text.Json;
using System.Text.RegularExpressions;
using Exe.BuildingBlocks.Web;
using FluentValidation;
using Group.Repository.Entities;
using Group.Repository.Enums;
using Group.Repository.Interfaces;
using Group.Services.DTOs;
using Group.Services.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;

namespace Group.Services.Implementations;

public partial class CourseSpaceService(
    ICourseSpaceRepository spaceRepo,
    IGroupUnitOfWork uow,
    IValidator<CreateCourseSpaceRequest> createValidator,
    IValidator<UpdateSpaceConfigRequest> updateValidator,
    IValidator<ImportFapStudentsRequest> importValidator,
    IHttpClientFactory httpClientFactory,
    IHttpContextAccessor httpContextAccessor,
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
                $"Không gian môn học cho kỳ {normSem} và môn {normSub} đã tồn tại trong hệ thống (BR-01, BR-08).");
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

    public async Task<IReadOnlyList<CourseSpaceResponse>> GetAllSpacesAsync(string? semesterCode, CourseSpaceStatus? status, CancellationToken ct = default)
    {
        var spaces = await spaceRepo.GetAllAsync(semesterCode, status, ct);
        return spaces.Select(s => ToResponse(s, s.Enrollments.Count, s.Rooms.Count)).ToList();
    }

    public async Task<CourseSpaceResponse> GetSpaceByIdAsync(Guid spaceId, CancellationToken ct = default)
    {
        var space = await spaceRepo.GetByIdAsync(spaceId, ct)
            ?? throw new NotFoundException("CourseSpace", spaceId);

        return ToResponse(space, space.Enrollments.Count, space.Rooms.Count);
    }

    public async Task<CourseSpaceResponse> UpdateSpaceConfigAsync(Guid spaceId, UpdateSpaceConfigRequest request, CancellationToken ct = default)
    {
        await updateValidator.ValidateAndThrowAsync(request, ct);

        var space = await spaceRepo.GetByIdAsync(spaceId, ct)
            ?? throw new NotFoundException("CourseSpace", spaceId);

        if (space.Status == CourseSpaceStatus.Locked)
        {
            throw new BusinessRuleException("SPACE_LOCKED", "Không thể chỉnh sửa cấu hình không gian môn học đã chốt sổ (BR-33).");
        }

        space.MaxMembersPerGroup = request.MaxMembersPerGroup;
        space.GroupThreshold = (request.MaxMembersPerGroup / 2) + 1;
        space.BufferRatio = request.BufferRatio;
        space.MaxConcurrentApplies = request.MaxConcurrentApplies;
        space.RegistrationDeadline = request.RegistrationDeadline;
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
            throw new BusinessRuleException("SPACE_LOCKED", "Không thể import sinh viên vào môn học đã chốt sổ (BR-33).");
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
            spaceRepo.AddEnrollmentsRange(toAdd);
            space.UpdatedAt = now;
            await uow.SaveChangesAsync(ct);
            logger.LogInformation("Imported {Count} students into CourseSpace {SpaceId}", toAdd.Count, spaceId);
        }

        // Bắn request sang Auth Service để tạo tài khoản & gửi email mật khẩu khởi tạo nếu chưa có
        var authHeader = httpContextAccessor.HttpContext?.Request.Headers.Authorization.ToString();
        await TryTriggerAuthProvisioningAsync(space.SemesterCode, space.SubjectCode, toAdd, authHeader);

        return toAdd.Count;
    }

    public async Task<int> SyncMockFapStudentsAsync(Guid spaceId, CancellationToken ct = default)
    {
        var space = await spaceRepo.GetByIdAsync(spaceId, ct)
            ?? throw new NotFoundException("CourseSpace", spaceId);

        var mockList = GenerateMockFapStudents(space.SemesterCode, space.SubjectCode);
        return await ImportFapStudentsAsync(spaceId, new ImportFapStudentsRequest(mockList), ct);
    }

    public async Task<GenerateRoomsResponse> GenerateRoomsAsync(Guid spaceId, CancellationToken ct = default)
    {
        var space = await spaceRepo.GetByIdAsync(spaceId, ct)
            ?? throw new NotFoundException("CourseSpace", spaceId);

        var totalStudents = await spaceRepo.GetTotalEnrollmentsCountAsync(spaceId, ct);
        if (totalStudents == 0)
        {
            throw new BusinessRuleException("NO_ENROLLED_STUDENTS",
                "Không thể tạo phòng vì chưa có sinh viên nào được ghi danh trong môn học này (BR-01, BR-09). Vui lòng import danh sách FAP trước.");
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
                $"Không thể tái khởi tạo toàn bộ phòng vì đã có {activeRoomsWithMembers.Count} phòng có thành viên tham gia hoặc đang trong quy trình hoạt động (BR-09).");
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
                Description = $"Phòng ghép nhóm tự do môn {space.SubjectCode} học kỳ {space.SemesterCode} (BR-09, BR-11)",
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
            e.EnrolledAt
        )).ToList();
    }

    public async Task<IReadOnlyList<RoomSummaryResponse>> GetSpaceRoomsAsync(Guid spaceId, GroupStatus? status, CancellationToken ct = default)
    {
        var rooms = await spaceRepo.GetRoomsBySpaceAsync(spaceId, status, ct);
        return rooms.Select(r => new RoomSummaryResponse(
            r.Id,
            r.RoomCode,
            r.Name,
            r.Status.ToString(),
            r.Members.Count,
            r.MaxMembers,
            r.LeaderId,
            r.Members.FirstOrDefault(m => m.UserId == r.LeaderId)?.FullName,
            r.SpaceId,
            r.CreatedAt
        )).ToList();
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
            s.RegistrationDeadline,
            s.Status.ToString(),
            totalStudents,
            totalRooms,
            s.CreatedAt,
            s.UpdatedAt
        );
    }

    private static string ParseCohortFromStudentCode(string studentCode)
    {
        var match = CohortRegex().Match(studentCode);
        return match.Success ? $"K{match.Groups[1].Value}" : "K18";
    }

    [GeneratedRegex(@"(?:[A-Za-z]+)?(\d{2})")]
    private static partial Regex CohortRegex();

    /// <summary>
    /// Tạo danh sách 50 sinh viên mẫu đa ngành chuẩn FAP (SE, AI, IA, GD, MKT, IB).
    /// </summary>
    private static List<FapStudentItem> GenerateMockFapStudents(string semesterCode, string subjectCode)
    {
        var list = new List<FapStudentItem>();

        // Sinh viên 1 đã có sẵn trong seed của Auth Service: Nguyễn Minh Hoàng (SE180101)
        list.Add(new FapStudentItem("SE180101", "Nguyễn Minh Hoàng (SE)", "student1@exe.local", "SE", "K18", "SE1801"));

        // Sinh viên SE (15 bạn)
        string[] seNames =
        [
            "Trần Quang Khải", "Lê Bảo Trâm", "Phạm Đức Minh", "Vũ Hoàng Long", "Ngô Thành Nam",
            "Đỗ Thu Trang", "Hoàng Kim Ngân", "Đặng Tuấn Anh", "Bùi Việt Hùng", "Dương Khánh Linh",
            "Lý Quốc Bảo", "Hồ Minh Châu", "Phan Gia Huy", "Tạ Nhật Minh", "Võ Quỳnh Nga"
        ];
        for (int i = 0; i < seNames.Length; i++)
        {
            var code = $"SE1800{i + 2:D2}";
            list.Add(new FapStudentItem(code, seNames[i], $"{code.ToLowerInvariant()}@fpt.edu.vn", "SE", "K18", "SE1801"));
        }

        // Sinh viên AI (8 bạn)
        string[] aiNames =
        [
            "Nguyễn Hải Đăng", "Trần Mai Anh", "Lê Công Vinh", "Phạm Phương Thảo",
            "Hoàng Thái Sơn", "Đỗ Lan Hương", "Vũ Minh Quân", "Bùi Ngọc Ánh"
        ];
        for (int i = 0; i < aiNames.Length; i++)
        {
            var code = $"AI1800{i + 1:D2}";
            list.Add(new FapStudentItem(code, aiNames[i], $"{code.ToLowerInvariant()}@fpt.edu.vn", "AI", "K18", "AI1802"));
        }

        // Sinh viên IA (6 bạn)
        string[] iaNames =
        [
            "Đặng Quốc Huy", "Ngô Bích Ngọc", "Trịnh Anh Tuấn", "Phan Minh Khang", "Lương Thùy Chi", "Vũ Gia Huy (IA)"
        ];
        for (int i = 0; i < iaNames.Length; i++)
        {
            var code = $"IA1800{i + 1:D2}";
            var email = i == 5 ? "student7@exe.local" : $"{code.ToLowerInvariant()}@fpt.edu.vn";
            list.Add(new FapStudentItem(code, iaNames[i], email, "IA", "K18", "IA1803"));
        }

        // Sinh viên GD - Graphic Design (6 bạn)
        string[] gdNames =
        [
            "Lê Ngọc Bảo Châu", "Trần Đình Trọng", "Nguyễn Thảo Nguyên", "Phạm Hoàng Yến", "Đoàn Mỹ Duyên", "Bùi Ngọc Ánh (GD)"
        ];
        for (int i = 0; i < gdNames.Length; i++)
        {
            var code = $"GD1800{i + 1:D2}";
            var email = i == 5 ? "student8@exe.local" : $"{code.ToLowerInvariant()}@fpt.edu.vn";
            list.Add(new FapStudentItem(code, gdNames[i], email, "GD", "K18", "GD1801"));
        }

        // Sinh viên MKT - Digital Marketing (7 bạn)
        string[] mktNames =
        [
            "Võ Minh Trí", "Nguyễn Thùy Dương", "Trần Khắc Việt", "Lê Hương Giang",
            "Đỗ Quốc Thái", "Phan Thanh Tùng", "Hoàng Ngọc Mai"
        ];
        for (int i = 0; i < mktNames.Length; i++)
        {
            var code = $"MKT1800{i + 1:D2}";
            list.Add(new FapStudentItem(code, mktNames[i], $"{code.ToLowerInvariant()}@fpt.edu.vn", "MKT", "K18", "MKT1802"));
        }

        // Sinh viên IB - International Business (7 bạn)
        string[] ibNames =
        [
            "Nguyễn Duy Mạnh", "Lê Thu Hà", "Trần Đình Khang", "Phạm Yến Nhi",
            "Vũ Hoàng Bách", "Đặng Diệu Linh", "Hoàng Đức Anh (IB)"
        ];
        for (int i = 0; i < ibNames.Length; i++)
        {
            var code = $"IB1800{i + 1:D2}";
            var email = i == 6 ? "student5@exe.local" : $"{code.ToLowerInvariant()}@fpt.edu.vn";
            list.Add(new FapStudentItem(code, ibNames[i], email, "IB", "K18", "IB1801"));
        }

        return list; // Đúng 50 sinh viên đa ngành!
    }

    private async Task TryTriggerAuthProvisioningAsync(
        string semesterCode,
        string subjectCode,
        List<SpaceEnrollment> enrollments,
        string? authHeader)
    {
        if (enrollments.Count == 0) return;

        try
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
            var response = await client.PostAsync("/api/auth/accounts/provision-fap", content);
            if (response.IsSuccessStatusCode)
            {
                logger.LogInformation("Successfully dispatched {Count} FAP accounts to Auth Service", enrollments.Count);
            }
            else
            {
                var errorBody = await response.Content.ReadAsStringAsync();
                logger.LogWarning("Auth Service provision-fap responded with {StatusCode}: {ErrorBody}", response.StatusCode, errorBody);
            }
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Could not notify Auth Service of new FAP enrollments (Auth service might be offline or handled asynchronously)");
        }
    }
}
