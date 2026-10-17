using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using User.Repository.Data;
using User.Repository.Implementations;
using User.Repository.Interfaces;

namespace User.Repository;

/// <summary>
/// Đăng ký DbContext và Repositories của User Service vào DI container (CLAUDE.md mục 5).
/// </summary>
public static class DependencyInjection
{
    public static IServiceCollection AddUserRepository(this IServiceCollection services, string? connectionString)
    {
        services.AddDbContext<UserDbContext>(options =>
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

        services.AddScoped<IUserProfileRepository, UserProfileRepository>();
        services.AddScoped<ISkillRepository, SkillRepository>();
        services.AddScoped<IUserSkillRepository, UserSkillRepository>();
        services.AddScoped<IProcessedEventRepository, ProcessedEventRepository>();
        services.AddScoped<IUserUnitOfWork, UserUnitOfWork>();

        return services;
    }
}
