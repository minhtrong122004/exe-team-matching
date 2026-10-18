using System.Text.Json.Serialization;
using Exe.BuildingBlocks.Auth;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Exe.BuildingBlocks.Web;

public static class ServiceDefaultsExtensions
{
    /// <summary>
    /// Cấu hình chung của mọi REST service, gọi một lần trong Program.cs:
    /// controllers + JSON (camelCase, enum dạng chuỗi), ProblemDetails, JWT, ICurrentUser, Swagger, health check, log console.
    /// </summary>
    public static WebApplicationBuilder AddExeServiceDefaults(this WebApplicationBuilder builder, string serviceTitle)
    {
        builder.Logging.AddExeConsoleLogging();

        var services = builder.Services;
        services.AddControllers()
            .AddJsonOptions(o => o.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));

        services.AddExeProblemDetails();
        services.AddHttpContextAccessor();
        services.AddScoped<ICurrentUser, CurrentUser>();
        services.AddExeJwtAuthentication(builder.Configuration);
        services.AddExeSwagger(serviceTitle);
        services.AddHealthChecks();

        return builder;
    }

    /// <summary>Pipeline chung: log request → bắt lỗi → Swagger (Development) → JWT → controllers, /health.</summary>
    public static WebApplication UseExeServiceDefaults(this WebApplication app)
    {
        app.UseMiddleware<RequestLoggingMiddleware>();
        app.UseExceptionHandler();
        app.UseStatusCodePages(); // 404/405 không có body → ProblemDetails

        if (app.Environment.IsDevelopment())
        {
            app.UseSwagger();
            app.UseSwaggerUI();
        }

        app.UseAuthentication();
        app.UseAuthorization();

        app.MapControllers();
        app.MapHealthChecks("/health").AllowAnonymous();
        return app;
    }

    /// <summary>Log console một dòng, dễ đọc bằng docker compose logs.</summary>
    public static ILoggingBuilder AddExeConsoleLogging(this ILoggingBuilder logging)
    {
        logging.ClearProviders();
        logging.AddSimpleConsole(options =>
        {
            options.SingleLine = true;
            options.TimestampFormat = "HH:mm:ss ";
        });
        return logging;
    }
}
