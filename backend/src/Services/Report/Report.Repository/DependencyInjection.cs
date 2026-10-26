using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Report.Repository.Data;
using Report.Repository.Implementations;
using Report.Repository.Interfaces;

namespace Report.Repository;

public static class DependencyInjection
{
    public static IServiceCollection AddReportRepository(
        this IServiceCollection services,
        string? connectionString)
    {
        var connStr = string.IsNullOrWhiteSpace(connectionString)
            ? "Server=localhost,1433;Database=ExeReportDb;User Id=sa;Password=Exe@Passw0rd2025;TrustServerCertificate=True"
            : connectionString;

        services.AddDbContext<ReportDbContext>(options =>
            options.UseSqlServer(
                connStr,
                sql => sql.EnableRetryOnFailure(maxRetryCount: 5, maxRetryDelay: TimeSpan.FromSeconds(10), errorNumbersToAdd: null)));

        services.AddScoped<IStudentStatRepository, StudentStatRepository>();
        services.AddScoped<IGroupStatRepository, GroupStatRepository>();
        services.AddScoped<IReportSnapshotRepository, ReportSnapshotRepository>();
        services.AddScoped<IProcessedEventRepository, ProcessedEventRepository>();
        services.AddScoped<IReportUnitOfWork, ReportUnitOfWork>();

        return services;
    }
}
