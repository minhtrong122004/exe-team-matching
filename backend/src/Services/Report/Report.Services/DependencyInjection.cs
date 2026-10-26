using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Report.Services.DTOs;
using Report.Services.Implementations;
using Report.Services.Interfaces;

namespace Report.Services;

public static class DependencyInjection
{
    public static IServiceCollection AddReportServices(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        services.Configure<SnapshotOptions>(configuration.GetSection(SnapshotOptions.SectionName));
        services.AddScoped<IReportService, ReportService>();
        services.AddScoped<IReportEventHandler, ReportEventHandler>();
        return services;
    }
}
