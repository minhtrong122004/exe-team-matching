using FluentValidation;
using Microsoft.Extensions.DependencyInjection;
using User.Services.Implementations;
using User.Services.Interfaces;
using User.Services.Validators;

namespace User.Services;

/// <summary>
/// Đăng ký DI cho tầng nghiệp vụ User.Services (CLAUDE.md mục 5).
/// </summary>
public static class DependencyInjection
{
    public static IServiceCollection AddUserServices(this IServiceCollection services)
    {
        // ── Business Services ────────────────────────────────────────────────
        services.AddScoped<IUserProfileService, UserProfileService>();
        services.AddScoped<ISkillService, SkillService>();
        services.AddScoped<IUserRegisteredConsumerService, UserRegisteredConsumerService>();

        // ── FluentValidation ─────────────────────────────────────────────────
        services.AddValidatorsFromAssemblyContaining<UpdateUserProfileRequestValidator>();

        return services;
    }
}
