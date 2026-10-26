using System.Text.RegularExpressions;
using Group.Repository.Data;
using Group.Repository.Interfaces;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace Group.Repository.Implementations;

public partial class GroupUnitOfWork(GroupDbContext db) : IGroupUnitOfWork
{
    public async Task SaveChangesAsync(CancellationToken ct = default)
    {
        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateConcurrencyException ex)
        {
            throw new ConcurrencyConflictException(ex);
        }
        catch (DbUpdateException ex) when (ex.InnerException is SqlException { Number: 2601 or 2627 } sql)
        {
            throw new UniqueConstraintViolationException(IndexNameRegex().Match(sql.Message).Groups[1].Value, ex);
        }
    }

    public void ClearTracking() => db.ChangeTracker.Clear();

    // "... with unique index 'IX_Groups_ProjectId'." (2601) hoặc "Violation of UNIQUE KEY constraint 'UQ_...'" (2627)
    [GeneratedRegex("(?:index|constraint) '([^']+)'")]
    private static partial Regex IndexNameRegex();
}
