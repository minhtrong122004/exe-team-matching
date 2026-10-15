using FluentValidation;

using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

using Project.Repository.Data;
using Project.Repository.Implementations;
using Project.Repository.Interfaces;
using Project.Services.Exceptions;
using Project.Services.Implementations;
using Project.Services.Interfaces;
using Project.Services.Validators;
using System.Net;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

var builder = WebApplication.CreateBuilder(args);

// ── 1. Database ────────────────────────────────────────────────────────────
builder.Services.AddDbContext<ProjectDbContext>(options =>
    options.UseSqlServer(
        builder.Configuration.GetConnectionString("Default"),
        sql => sql.EnableRetryOnFailure(maxRetryCount: 5, maxRetryDelay: TimeSpan.FromSeconds(10), errorNumbersToAdd: null)
    ));

// ── 2. DI — Repository ─────────────────────────────────────────────────────
builder.Services.AddScoped<IProjectRepository, ProjectRepository>();

// ── 3. DI — Service ────────────────────────────────────────────────────────
builder.Services.AddScoped<IProjectService, ProjectService>();

// ── 4. FluentValidation ────────────────────────────────────────────────────
builder.Services.AddValidatorsFromAssemblyContaining<CreateProjectRequestValidator>();

// ── 5. JWT Authentication ──────────────────────────────────────────────────
// TODO: Vy sẽ bổ sung AddExeJwtAuthentication() vào BuildingBlocks để dùng chung.
// Tạm thời cấu hình trực tiếp ở đây để chạy được Base Code.
var jwtKey = builder.Configuration["Jwt__Key"]
          ?? builder.Configuration["Jwt:Key"]
          ?? "dev-only-jwt-key-change-me-0123456789abcdef";

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer           = true,
            ValidateAudience         = true,
            ValidateLifetime         = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer              = builder.Configuration["Jwt__Issuer"] ?? builder.Configuration["Jwt:Issuer"] ?? "exe-auth",
            ValidAudience            = builder.Configuration["Jwt__Audience"] ?? builder.Configuration["Jwt:Audience"] ?? "exe-api",
            IssuerSigningKey         = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
        };
    });

builder.Services.AddAuthorization();

// ── 6. Controllers + JSON settings ─────────────────────────────────────────
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        // Enum trả về dạng chuỗi (CLAUDE.md mục 10)
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
        options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
    });

builder.Services.AddEndpointsApiExplorer();

// ── 7. Swagger / OpenAPI ───────────────────────────────────────────────────
builder.Services.AddSwaggerGen();

// ── 8. Health Check ─────────────────────────────────────────────────────────
builder.Services.AddHealthChecks();

// ═══════════════════════════════════════════════════════════════════════════
var app = builder.Build();

// ── 9. Auto-migrate khi Development ─────────────────────────────────────────
if (app.Environment.IsDevelopment())
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<ProjectDbContext>();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();

    var retries = 0;
    while (retries < 5)
    {
        try
        {
            logger.LogInformation("Project Service: Applying EF Core migrations to ExeProjectDb...");
            db.Database.Migrate();
            logger.LogInformation("Project Service: Migrations applied successfully.");
            break;
        }
        catch (Exception ex)
        {
            retries++;
            logger.LogWarning(ex, "Migration failed, retry {Retry}/5 after 5 seconds...", retries);
            await Task.Delay(5000);
        }
    }
}

// ── 10. Middleware xử lý lỗi tập trung (CLAUDE.md mục 11) ──────────────────
// TODO: Thay bằng ExceptionHandlingMiddleware từ Exe.BuildingBlocks khi Vy hoàn thành.
// Tạm thời inline ở đây để hoạt động được.
app.Use(async (context, next) =>
{
    try
    {
        await next(context);
    }
    catch (NotFoundException ex)
    {
        context.Response.StatusCode  = (int)HttpStatusCode.NotFound;
        context.Response.ContentType = "application/problem+json";
        await context.Response.WriteAsync(JsonSerializer.Serialize(new
        {
            status  = 404,
            title   = ex.Message,
            code    = "NOT_FOUND",
            traceId = context.TraceIdentifier
        }));
    }
    catch (ForbiddenException ex)
    {
        context.Response.StatusCode  = (int)HttpStatusCode.Forbidden;
        context.Response.ContentType = "application/problem+json";
        await context.Response.WriteAsync(JsonSerializer.Serialize(new
        {
            status  = 403,
            title   = ex.Message,
            code    = "FORBIDDEN",
            traceId = context.TraceIdentifier
        }));
    }
    catch (Exception ex)
    {
        var log = context.RequestServices.GetRequiredService<ILogger<Program>>();
        log.LogError(ex, "Unhandled exception on {Method} {Path}", context.Request.Method, context.Request.Path);

        context.Response.StatusCode  = (int)HttpStatusCode.InternalServerError;
        context.Response.ContentType = "application/problem+json";
        await context.Response.WriteAsync(JsonSerializer.Serialize(new
        {
            status  = 500,
            title   = "An unexpected error occurred.",
            code    = "INTERNAL_ERROR",
            traceId = context.TraceIdentifier
        }));
    }
});

// ── 11. Pipeline ────────────────────────────────────────────────────────────
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "Project Service v1");
        c.RoutePrefix = "swagger";
    });
}

app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapHealthChecks("/health");
app.MapGet("/", () => "Project Service is running").ExcludeFromDescription();

app.Run();
