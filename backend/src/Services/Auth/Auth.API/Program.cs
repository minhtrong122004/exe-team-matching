using System.Text.Json;
using System.Text.Json.Serialization;
using Auth.Repository;
using Auth.Services;
using Exe.BuildingBlocks.Auth;
using Exe.BuildingBlocks.EventBus;
using Exe.BuildingBlocks.Web;
using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi;

var builder = WebApplication.CreateBuilder(args);

// ── Controllers & JSON Serialization ──────────────────────────────────────────
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    });

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "EXE Team Matching - Auth Service API",
        Version = "v1",
        Description = "Microservice xác thực, phân quyền RBAC và quản lý phiên đăng nhập (PRN232 Final Assignment)."
    });

    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Nhập JWT Access Token (chỉ cần dán chuỗi token, Swagger UI sẽ tự động thêm Bearer prefix)."
    });

    options.AddSecurityRequirement(doc =>
    {
        var req = new OpenApiSecurityRequirement();
        var schemeRef = new OpenApiSecuritySchemeReference("Bearer", doc);
        req.Add(schemeRef, new List<string>());
        return req;
    });
});
builder.Services.AddHealthChecks();

// ── Database & Persistence (Stage D1.1) ──────────────────────────────────────
builder.Services.AddAuthRepository(builder.Configuration.GetConnectionString("Default"));

// ── Business Services & Security (Stage D1.2) ────────────────────────────────
builder.Services.AddAuthServices();

// ── Shared JWT Authentication & Authorization (Stage D0) ─────────────────────
builder.Services.AddExeJwtAuthentication(builder.Configuration);

// ── Redis Event Publisher & Transactional Outbox Worker (Stage D2) ───────────
builder.Services.AddExeRedisEventPublisher(builder.Configuration);
builder.Services.Configure<Auth.API.Workers.AuthOutboxOptions>(builder.Configuration.GetSection(Auth.API.Workers.AuthOutboxOptions.SectionName));
builder.Services.AddHostedService<Auth.API.Workers.AuthOutboxPublisherWorker>();

// ── Google Sign-In ───────────────────────────────────────────────────────────
builder.Services.Configure<Auth.Services.DTOs.GoogleAuthOptions>(builder.Configuration.GetSection(Auth.Services.DTOs.GoogleAuthOptions.SectionName));

var app = builder.Build();

// ── Database Migration (Gate D, E) ────────────────────────────────────────────
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<Auth.Repository.Data.AuthDbContext>();
    if (db.Database.IsRelational())
    {
        await db.Database.MigrateAsync();
    }
}

// ── Development Demo Accounts Seeding (CLAUDE.md Section 11) ─────────────────
if (app.Environment.IsDevelopment())
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<Auth.Repository.Data.AuthDbContext>();
    if (db.Database.IsRelational())
    {
        // Dọn dẹp hoàn toàn role Admin cũ trong DB (nếu tồn tại từ các lần chạy trước) sang chuẩn 3 vai trò: Moderator, Lecturer, Student
        await db.Database.ExecuteSqlRawAsync(
            "DELETE FROM [Accounts] WHERE [Email] = N'admin@exe.local'; UPDATE [Accounts] SET [Role] = N'Moderator' WHERE [Role] = N'Admin';");

        // Moderator và Lecturer đăng nhập bằng Google nên phải là email thật, lấy từ cấu hình (phân tách bằng dấu phẩy).
        static IEnumerable<string> ParseEmails(string? raw) =>
            (raw ?? string.Empty)
                .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Select(email => email.ToLowerInvariant())
                .Distinct();

        var staffSpecs = ParseEmails(app.Configuration["Seed:ModeratorEmails"])
            .Select(email => (Email: email, FullName: "Điều phối viên EXE", Role: Auth.Repository.Enums.AccountRole.Moderator, StudentCode: (string?)null, HasAcceptedTerms: true))
            .Concat(ParseEmails(app.Configuration["Seed:LecturerEmails"])
                .Select(email => (Email: email, FullName: "Giảng viên EXE", Role: Auth.Repository.Enums.AccountRole.Lecturer, StudentCode: (string?)null, HasAcceptedTerms: true)));

        var now = DateTime.UtcNow;
        var addedAny = false;
        foreach (var spec in staffSpecs)
        {
            var existing = await db.Accounts.FirstOrDefaultAsync(a => a.Email == spec.Email);
            if (existing == null)
            {
                var accountId = Guid.NewGuid();
                var account = new Auth.Repository.Entities.Account
                {
                    Id = accountId,
                    Email = spec.Email,
                    RegistrationFullName = spec.FullName,
                    Role = spec.Role,
                    StudentCode = spec.StudentCode,
                    AcceptedTermsAt = spec.HasAcceptedTerms ? now : null,
                    IsActive = true,
                    CreatedAt = now,
                    UpdatedAt = now
                };
                await db.Accounts.AddAsync(account);

                var evt = new Exe.Contracts.Events.UserRegisteredEvent(
                    EventId: Guid.NewGuid(),
                    UserId: accountId,
                    Email: spec.Email,
                    FullName: spec.FullName,
                    Role: spec.Role.ToString(),
                    OccurredAt: now,
                    SchemaVersion: 1,
                    StudentCode: spec.StudentCode,
                    SemesterCode: "FA26",
                    SubjectCode: "EXE101"
                );
                await db.OutboxMessages.AddAsync(new Auth.Repository.Entities.OutboxMessage
                {
                    Id = Guid.NewGuid(),
                    EventType = nameof(Exe.Contracts.Events.UserRegisteredEvent),
                    Payload = JsonSerializer.Serialize(evt, new JsonSerializerOptions
                    {
                        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
                    }),
                    CreatedAt = now
                });
                addedAny = true;
            }
            else
            {
                var updated = false;
                if (existing.Role != spec.Role)
                {
                    existing.Role = spec.Role;
                    updated = true;
                }
                if (string.IsNullOrWhiteSpace(existing.StudentCode) && !string.IsNullOrWhiteSpace(spec.StudentCode))
                {
                    existing.StudentCode = spec.StudentCode;
                    updated = true;
                }
                if (spec.HasAcceptedTerms && !existing.AcceptedTermsAt.HasValue)
                {
                    existing.AcceptedTermsAt = now;
                    updated = true;
                }
                if (updated)
                {
                    existing.UpdatedAt = now;
                    addedAny = true;
                }
            }
        }

        if (addedAny)
        {
            await db.SaveChangesAsync();
        }
    }
}

// ── Middleware Pipeline (Exception Handler là ngoài cùng) ────────────────────
app.UseExeExceptionHandler();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHealthChecks("/health").AllowAnonymous();
app.MapGet("/", () => "Auth Service is running").AllowAnonymous().ExcludeFromDescription();

app.Run();

public partial class Program { }
