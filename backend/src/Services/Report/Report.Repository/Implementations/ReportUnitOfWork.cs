using Report.Repository.Data;
using Report.Repository.Interfaces;

namespace Report.Repository.Implementations;

public class ReportUnitOfWork : IReportUnitOfWork
{
    private readonly ReportDbContext _db;

    public ReportUnitOfWork(ReportDbContext db)
    {
        _db = db;
    }

    public Task<int> SaveChangesAsync(CancellationToken ct = default) =>
        _db.SaveChangesAsync(ct);
}
