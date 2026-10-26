using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Notification.Repository.Data;
using Notification.Repository.Implementations;
using Notification.Repository.Interfaces;

namespace Notification.Repository;

public static class DependencyInjection
{
    public static IServiceCollection AddNotificationRepository(
        this IServiceCollection services,
        string? connectionString)
    {
        var connStr = string.IsNullOrWhiteSpace(connectionString)
            ? "Server=localhost,1433;Database=ExeNotificationDb;User Id=sa;Password=Exe@Passw0rd2025;TrustServerCertificate=True"
            : connectionString;

        services.AddDbContext<NotificationDbContext>(options =>
            options.UseSqlServer(
                connStr,
                sql => sql.EnableRetryOnFailure(maxRetryCount: 5, maxRetryDelay: TimeSpan.FromSeconds(10), errorNumbersToAdd: null)));

        services.AddScoped<INotificationRepository, NotificationRepository>();
        services.AddScoped<IEmailLogRepository, EmailLogRepository>();
        services.AddScoped<IProcessedEventRepository, ProcessedEventRepository>();
        services.AddScoped<INotificationUnitOfWork, NotificationUnitOfWork>();

        return services;
    }
}
