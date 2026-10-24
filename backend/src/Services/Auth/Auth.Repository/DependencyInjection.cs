using Auth.Repository.Data;
using Auth.Repository.Implementations;
using Auth.Repository.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Auth.Repository;

/// <summary>
/// Đăng ký DbContext và Repositories của Auth Service vào DI container (CLAUDE.md mục 5).
/// </summary>
public static class DependencyInjection
{
    public static IServiceCollection AddAuthRepository(this IServiceCollection services, string? connectionString)
    {
        services.AddDbContext<AuthDbContext>(options =>
        {
            if (!string.IsNullOrEmpty(connectionString))
            {
                options.UseSqlServer(connectionString, sql =>
                {
                    sql.EnableRetryOnFailure(
                        maxRetryCount: 5,
                        maxRetryDelay: TimeSpan.FromSeconds(10),
                        errorNumbersToAdd: null);
                });
            }
        });

        services.AddScoped<IAccountRepository, AccountRepository>();
        services.AddScoped<IRefreshTokenRepository, RefreshTokenRepository>();
        services.AddScoped<IOutboxRepository, OutboxRepository>();
        services.AddScoped<IEmailVerificationChallengeRepository, EmailVerificationChallengeRepository>();
        services.AddScoped<IUnitOfWork, UnitOfWork>();

        return services;
    }
}
