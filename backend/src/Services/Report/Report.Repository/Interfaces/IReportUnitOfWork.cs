namespace Report.Repository.Interfaces;

public interface IReportUnitOfWork
{
    Task<int> SaveChangesAsync(CancellationToken ct = default);
}
