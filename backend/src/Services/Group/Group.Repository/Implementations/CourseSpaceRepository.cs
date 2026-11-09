using Exe.BuildingBlocks.Paging;
using Exe.BuildingBlocks.Persistence;
using Group.Repository.Data;
using Group.Repository.Entities;
using Group.Repository.Enums;
using Group.Repository.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Group.Repository.Implementations;

public class CourseSpaceRepository(GroupDbContext db) : ICourseSpaceRepository
{
    public async Task<CourseSpace?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        return await db.CourseSpaces
            .Include(s => s.Enrollments)
            .Include(s => s.Rooms)
            .FirstOrDefaultAsync(s => s.Id == id, ct);
    }

    public async Task<CourseSpace?> GetByCodeAsync(string semesterCode, string subjectCode, CancellationToken ct = default)
    {
        var normSem = semesterCode.Trim().ToUpperInvariant();
        var normSub = subjectCode.Trim().ToUpperInvariant();
        return await db.CourseSpaces
            .Include(s => s.Enrollments)
            .Include(s => s.Rooms)
            .FirstOrDefaultAsync(s => s.SemesterCode == normSem && s.SubjectCode == normSub, ct);
    }

    public async Task<IReadOnlyList<CourseSpace>> GetAllAsync(string? semesterCode, CourseSpaceStatus? status, CancellationToken ct = default)
    {
        var query = db.CourseSpaces
            .Include(s => s.Enrollments)
            .Include(s => s.Rooms)
            .AsNoTracking();

        if (!string.IsNullOrWhiteSpace(semesterCode))
        {
            var norm = semesterCode.Trim().ToUpperInvariant();
            query = query.Where(s => s.SemesterCode == norm);
        }

        if (status.HasValue)
        {
            query = query.Where(s => s.Status == status.Value);
        }

        return await query.OrderByDescending(s => s.CreatedAt).ToListAsync(ct);
    }

    public async Task<IReadOnlyList<CourseSpace>> GetSpacesForStudentAsync(Guid studentId, string? email = null, CancellationToken ct = default)
    {
        var normalizedEmail = email?.Trim().ToLowerInvariant();
        return await db.CourseSpaces
            .AsNoTracking()
            .Where(s => s.Enrollments.Any(e => e.StudentId == studentId || (!string.IsNullOrEmpty(normalizedEmail) && e.Email == normalizedEmail)))
            .Include(s => s.Enrollments)
            .Include(s => s.Rooms)
            .OrderByDescending(s => s.CreatedAt)
            .ToListAsync(ct);
    }

    public async Task<IReadOnlyList<SpaceEnrollment>> GetEnrollmentsBySpaceAsync(Guid spaceId, CancellationToken ct = default)
    {
        return await db.SpaceEnrollments
            .AsNoTracking()
            .Where(e => e.SpaceId == spaceId)
            .OrderBy(e => e.StudentCode)
            .ToListAsync(ct);
    }

    public async Task<SpaceEnrollment?> GetEnrollmentAsync(Guid spaceId, Guid studentId, CancellationToken ct = default)
    {
        return await db.SpaceEnrollments
            .FirstOrDefaultAsync(e => e.SpaceId == spaceId && e.StudentId == studentId, ct);
    }

    public async Task<bool> IsStudentEnrolledAsync(Guid spaceId, Guid studentId, CancellationToken ct = default)
    {
        return await db.SpaceEnrollments
            .AnyAsync(e => e.SpaceId == spaceId && e.StudentId == studentId, ct);
    }

    public async Task<int> GetTotalEnrollmentsCountAsync(Guid spaceId, CancellationToken ct = default)
    {
        return await db.SpaceEnrollments
            .CountAsync(e => e.SpaceId == spaceId, ct);
    }

    public async Task<IReadOnlyList<GroupEntity>> GetRoomsBySpaceAsync(Guid spaceId, GroupStatus? status, CancellationToken ct = default)
    {
        var query = db.Groups
            .Include(g => g.Members)
            .Include(g => g.Slots)
            .AsNoTracking()
            .Where(g => g.SpaceId == spaceId && g.Status != GroupStatus.Disbanded);

        if (status.HasValue)
        {
            query = query.Where(g => g.Status == status.Value);
        }

        return await query.OrderBy(g => g.RoomCode ?? g.Name).ToListAsync(ct);
    }

    public Task<PagedResult<GroupEntity>> GetPagedRoomsBySpaceAsync(
        Guid spaceId, GroupStatus? status, int? minAvailableSlots, string? search, int page, int pageSize, CancellationToken ct = default)
    {
        var query = db.Groups
            .Include(g => g.Members)
            .Include(g => g.Slots)
            .AsNoTracking()
            .AsSplitQuery()
            .Where(g => g.SpaceId == spaceId && g.Status != GroupStatus.Disbanded);

        if (status.HasValue)
        {
            query = query.Where(g => g.Status == status.Value);
        }

        if (minAvailableSlots.HasValue)
        {
            var slots = minAvailableSlots.Value;
            query = query.Where(g => g.MaxMembers - g.Members.Count >= slots);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var keyword = search.Trim().ToLower();
            query = query.Where(g =>
                g.Name.ToLower().Contains(keyword) || (g.RoomCode != null && g.RoomCode.ToLower().Contains(keyword)));
        }

        return query.OrderBy(g => g.RoomCode ?? g.Name).ToPagedResultAsync(page, pageSize, ct);
    }

    public async Task<IReadOnlyList<GroupEntity>> GetTrackedRoomsBySpaceAsync(Guid spaceId, CancellationToken ct = default)
    {
        return await db.Groups
            .Include(g => g.Members)
            .Include(g => g.Slots)
            .Where(g => g.SpaceId == spaceId && g.Status != GroupStatus.Disbanded)
            .OrderBy(g => g.RoomCode ?? g.Name)
            .ToListAsync(ct);
    }

    public async Task<IReadOnlyList<JoinRequest>> GetPendingJoinRequestsBySpaceAsync(Guid spaceId, CancellationToken ct = default)
    {
        return await db.JoinRequests
            .Include(r => r.Group)
            .Where(r => r.Group.SpaceId == spaceId && r.Status == JoinRequestStatus.Pending)
            .ToListAsync(ct);
    }

    public async Task<GroupTransferRequest?> GetTransferRequestByIdAsync(Guid id, CancellationToken ct = default)
    {
        return await db.GroupTransferRequests
            .Include(t => t.Space)
            .Include(t => t.FromGroup)
            .Include(t => t.TargetGroup)
            .FirstOrDefaultAsync(t => t.Id == id, ct);
    }

    public async Task<IReadOnlyList<GroupTransferRequest>> GetTransferRequestsBySpaceAsync(Guid spaceId, TransferRequestStatus? status, CancellationToken ct = default)
    {
        var query = db.GroupTransferRequests
            .Where(t => t.SpaceId == spaceId);

        if (status.HasValue)
        {
            query = query.Where(t => t.Status == status.Value);
        }

        return await query.OrderByDescending(t => t.CreatedAt).ToListAsync(ct);
    }

    public async Task<IReadOnlyList<GroupTransferRequest>> GetTransferRequestsByStudentAsync(Guid studentId, CancellationToken ct = default)
    {
        return await db.GroupTransferRequests
            .Where(t => t.RequesterStudentId == studentId || t.SwapWithStudentId == studentId)
            .OrderByDescending(t => t.CreatedAt)
            .ToListAsync(ct);
    }

    public async Task<bool> HasPendingTransferRequestAsync(Guid spaceId, Guid studentId, CancellationToken ct = default)
    {
        return await db.GroupTransferRequests
            .AnyAsync(t => t.SpaceId == spaceId &&
                           t.Status == TransferRequestStatus.Pending &&
                           (t.RequesterStudentId == studentId || t.SwapWithStudentId == studentId), ct);
    }

    public void Add(CourseSpace space) => db.CourseSpaces.Add(space);

    public void Remove(CourseSpace space) => db.CourseSpaces.Remove(space);

    public void AddEnrollment(SpaceEnrollment enrollment) => db.SpaceEnrollments.Add(enrollment);

    public void AddEnrollmentsRange(IEnumerable<SpaceEnrollment> enrollments) => db.SpaceEnrollments.AddRange(enrollments);

    public void AddRoomsRange(IEnumerable<GroupEntity> rooms) => db.Groups.AddRange(rooms);

    public void AddTransferRequest(GroupTransferRequest request) => db.GroupTransferRequests.Add(request);

    public void RemoveRoomsRange(IEnumerable<GroupEntity> rooms)

    {
        var roomIds = rooms.Select(r => r.Id).ToList();
        var tracked = db.Groups
            .Include(g => g.Members)
            .Include(g => g.Slots)
            .Where(g => roomIds.Contains(g.Id))
            .ToList();
        db.Groups.RemoveRange(tracked);
    }
}
