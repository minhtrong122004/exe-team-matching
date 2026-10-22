using System.Text;
using Exe.BuildingBlocks.Web;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;

namespace Exe.BuildingBlocks.Auth;

public static class JwtAuthenticationExtensions
{
    /// <summary>
    /// Kiểm tra JWT do Auth Service cấp (HS256, key dùng chung).
    /// Mặc định MỌI endpoint đều yêu cầu đăng nhập; endpoint công khai phải gắn [AllowAnonymous].
    /// Lỗi 401/403 trả về ProblemDetails giống các lỗi khác.
    /// </summary>
    public static IServiceCollection AddExeJwtAuthentication(this IServiceCollection services, IConfiguration configuration)
    {
        var section = configuration.GetSection(JwtOptions.SectionName);
        services.Configure<JwtOptions>(section);
        var jwt = section.Get<JwtOptions>() ?? new JwtOptions();

        if (Encoding.UTF8.GetByteCount(jwt.Key) < 32)
            throw new InvalidOperationException(
                "Jwt:Key must be at least 32 bytes. Set it in appsettings.Development.json or the Jwt__Key environment variable.");

        services.AddProblemDetails();

        services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                // Giữ nguyên tên claim "sub", "email", "name", "role" (không đổi sang tên dài của Microsoft).
                options.MapInboundClaims = false;
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidIssuer = jwt.Issuer,
                    ValidateAudience = true,
                    ValidAudience = jwt.Audience,
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.Key)),
                    ValidateLifetime = true,
                    ClockSkew = TimeSpan.FromSeconds(30),
                    NameClaimType = ExeClaims.Name,
                    RoleClaimType = ExeClaims.Role
                };
                options.Events = new JwtBearerEvents
                {
                    OnChallenge = async context =>
                    {
                        context.HandleResponse(); // thay body rỗng mặc định bằng ProblemDetails
                        await ProblemDetailsWriter.WriteAsync(context.HttpContext, 401, ErrorCodes.Unauthorized,
                            "Access token is missing, invalid or expired.");
                    },
                    OnForbidden = context => ProblemDetailsWriter.WriteAsync(context.HttpContext, 403,
                        ErrorCodes.Forbidden, "You do not have permission to access this resource.")
                };
            });

        services.AddAuthorizationBuilder()
            .SetFallbackPolicy(new AuthorizationPolicyBuilder().RequireAuthenticatedUser().Build());

        services.AddHttpContextAccessor();
        services.AddScoped<ICurrentUser, CurrentUser>();

        return services;
    }
}
