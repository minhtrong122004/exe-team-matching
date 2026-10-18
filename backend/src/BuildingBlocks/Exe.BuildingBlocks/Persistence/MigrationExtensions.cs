using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Exe.BuildingBlocks.Persistence;

public static class MigrationExtensions
{
    /// <summary>
    /// Chạy EF Core migrations khi ASPNETCORE_ENVIRONMENT=Development, thử lại trong lúc SQL Server
    /// đang khởi động, rồi chạy hàm seed (nếu có). Gọi trong Program.cs sau builder.Build():
    /// <code>
    /// await app.MigrateDatabaseAsync&lt;GroupDbContext&gt;();
    /// await app.MigrateDatabaseAsync&lt;AuthDbContext&gt;(sp =&gt; sp.GetRequiredService&lt;IAccountSeeder&gt;().SeedAsync());
    /// </code>
    /// </summary>
    public static async Task MigrateDatabaseAsync<TContext>(this IHost host,
        Func<IServiceProvider, Task>? seed = null, int maxAttempts = 20)
        where TContext : DbContext
    {
        var environment = host.Services.GetRequiredService<IHostEnvironment>();
        if (!environment.IsDevelopment()) return;

        await using var scope = host.Services.CreateAsyncScope();
        var services = scope.ServiceProvider;
        var logger = services.GetRequiredService<ILoggerFactory>().CreateLogger("Migration");
        var context = services.GetRequiredService<TContext>();

        for (var attempt = 1; ; attempt++)
        {
            try
            {
                await context.Database.MigrateAsync();
                logger.LogInformation("Database for {Context} is up to date", typeof(TContext).Name);
                break;
            }
            catch (Exception ex) when (attempt < maxAttempts)
            {
                logger.LogWarning("Migrating {Context} failed (attempt {Attempt}/{Max}): {Message} Retrying in 5s...",
                    typeof(TContext).Name, attempt, maxAttempts, ex.Message);
                await Task.Delay(TimeSpan.FromSeconds(5));
            }
        }

        if (seed is not null) await seed(services);
    }
}
