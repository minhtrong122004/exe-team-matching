using Auth.Services.Implementations;
using Auth.Services.Interfaces;
using Auth.Services.Security;
using FluentValidation;
using Microsoft.Extensions.DependencyInjection;

namespace Auth.Services;

/// <summary>
/// Đăng ký DI cho tầng nghiệp vụ Auth.Services.
/// </summary>
public static class DependencyInjection
{
    public static IServiceCollection AddAuthServices(this IServiceCollection services)
    {
        // ── Security & Cryptography ──────────────────────────────────────────
        services.AddScoped<IPasswordHasher, BCryptPasswordHasher>();
        services.AddScoped<ITokenService, TokenService>();
        services.AddScoped<IOtpService, OtpService>();

        // ── Email Integration (Gate F) ───────────────────────────────────────
        services.AddHttpClient(BrevoEmailSender.HttpClientName);
        services.AddScoped<IEmailSender, BrevoEmailSender>();

        // ── Business Services ────────────────────────────────────────────────
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IAdminAccountService, AdminAccountService>();
        services.AddScoped<IAdminBootstrapService, AdminBootstrapService>();

        // ── FluentValidation ─────────────────────────────────────────────────
        services.AddValidatorsFromAssemblyContaining<Validators.RegisterRequestValidator>();

        return services;
    }
}
