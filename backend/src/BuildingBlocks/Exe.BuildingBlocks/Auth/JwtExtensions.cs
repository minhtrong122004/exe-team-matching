using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;

namespace Exe.BuildingBlocks.Auth;

/// <summary>
/// Đăng ký xác thực JWT Bearer chuẩn dùng chung cho tất cả microservice (CLAUDE.md mục 11).
/// </summary>
public static class JwtExtensions
{
    public static IServiceCollection AddExeJwtAuthentication(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var jwtSection = configuration.GetSection(JwtOptions.SectionName);
        var key = configuration["Jwt__Key"]
               ?? configuration["Jwt:Key"]
               ?? jwtSection["Key"]
               ?? "dev-only-jwt-key-change-me-0123456789abcdef";

        var issuer = configuration["Jwt__Issuer"]
                  ?? configuration["Jwt:Issuer"]
                  ?? jwtSection["Issuer"]
                  ?? "exe-auth";

        var audience = configuration["Jwt__Audience"]
                    ?? configuration["Jwt:Audience"]
                    ?? jwtSection["Audience"]
                    ?? "exe-api";

        services.Configure<JwtOptions>(options =>
        {
            options.Key = key;
            options.Issuer = issuer;
            options.Audience = audience;
        });

        services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidateAudience = true,
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,
                    ValidIssuer = issuer,
                    ValidAudience = audience,
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key)),
                    ClockSkew = TimeSpan.FromMinutes(1)
                };
            });

        services.AddAuthorization();
        services.AddHttpContextAccessor();
        services.AddScoped<ICurrentUser, CurrentUser>();

        return services;
    }
}
