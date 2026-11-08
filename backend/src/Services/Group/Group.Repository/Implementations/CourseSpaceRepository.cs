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

    public void Add(CourseSpace space) => db.CourseSpaces.Add(space);

    public void AddEnrollment(SpaceEnrollment enrollment) => db.SpaceEnrollments.Add(enrollment);

    public void AddEnrollmentsRange(IEnumerable<SpaceEnrollment> enrollments) => db.SpaceEnrollments.AddRange(enrollments);

    public void AddRoomsRange(IEnumerable<GroupEntity> rooms) => db.Groups.AddRange(rooms);

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
