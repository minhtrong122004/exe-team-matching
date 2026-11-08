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

// ── Admin Bootstrap Options (Stage H2) ───────────────────────────────────────
builder.Services.Configure<Auth.Services.DTOs.AdminBootstrapOptions>(builder.Configuration.GetSection(Auth.Services.DTOs.AdminBootstrapOptions.SectionName));

// ── Brevo Transactional Email Options (Gate F) ───────────────────────────────
builder.Services.Configure<Auth.Services.DTOs.BrevoOptions>(builder.Configuration.GetSection(Auth.Services.DTOs.BrevoOptions.SectionName));

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

// ── Explicit Admin Bootstrap Command (Stage H2) ──────────────────────────────
if (args.Contains("--bootstrap-admin"))
{
    using var scope = app.Services.CreateScope();
    var bootstrapService = scope.ServiceProvider.GetRequiredService<Auth.Services.Interfaces.IAdminBootstrapService>();
    try
    {
        var admin = await bootstrapService.BootstrapAdminAsync();
        Console.WriteLine($"[BOOTSTRAP-SUCCESS] Admin account created successfully for '{admin.Email}' (ID: {admin.Id}).");
        return;
    }
    catch (Exception ex)
    {
        Console.Error.WriteLine($"[BOOTSTRAP-ERROR] {ex.Message}");
        Environment.ExitCode = 1;
        return;
    }
}

// ── Development Demo Accounts Seeding (CLAUDE.md Section 11) ─────────────────
if (app.Environment.IsDevelopment())
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<Auth.Repository.Data.AuthDbContext>();
    var passwordHasher = scope.ServiceProvider.GetRequiredService<Auth.Services.Security.IPasswordHasher>();
    if (db.Database.IsRelational())
    {
        // Dọn dẹp hoàn toàn role Admin cũ trong DB (nếu tồn tại từ các lần chạy trước) sang chuẩn 3 vai trò: Moderator, Lecturer, Student
        await db.Database.ExecuteSqlRawAsync(
            "DELETE FROM [Accounts] WHERE [Email] = N'admin@exe.local'; UPDATE [Accounts] SET [Role] = N'Moderator' WHERE [Role] = N'Admin';");

        var demoSpecs = new (string Email, string Password, string FullName, Auth.Repository.Enums.AccountRole Role, string? StudentCode, bool MustChangePassword, bool HasAcceptedTerms)[]
        {
            ("moderator@exe.local", "Moderator@123", "Điều phối viên Môn EXE (Moderator)", Auth.Repository.Enums.AccountRole.Moderator, null, false, true),
            ("moderator@fpt.edu.vn", "Moderator@123", "ThS. Lê Minh Điều Phối (Moderator)", Auth.Repository.Enums.AccountRole.Moderator, null, false, true),
            ("lecturer@exe.local", "Lecturer@123", "TS. Nguyễn Văn Giảng Viên", Auth.Repository.Enums.AccountRole.Lecturer, null, false, true),
            ("lecturer@fpt.edu.vn", "Lecturer@123", "TS. Nguyễn Văn Giảng Viên (FPT)", Auth.Repository.Enums.AccountRole.Lecturer, null, false, true),
            ("student1@exe.local", "Student@123", "Nguyễn Minh Hoàng (SE)", Auth.Repository.Enums.AccountRole.Student, "SE180001", false, true),
            ("student2@exe.local", "Student@123", "Trần Thảo Vy (AI)", Auth.Repository.Enums.AccountRole.Student, "AI180002", false, true),
            ("student3@exe.local", "Student@123", "Lê Quốc Bảo (GD)", Auth.Repository.Enums.AccountRole.Student, "GD180003", false, true),
            ("student4@exe.local", "Student@123", "Phạm Khánh Linh (MKT)", Auth.Repository.Enums.AccountRole.Student, "MKT180004", false, true),
            ("student5@exe.local", "Student@123", "Hoàng Đức Anh (IB)", Auth.Repository.Enums.AccountRole.Student, "IB180005", false, true),
            ("student6@exe.local", "Student@123", "Đặng Thu Hà (SE)", Auth.Repository.Enums.AccountRole.Student, "SE180006", false, true),
            ("student7@exe.local", "Student@123", "Vũ Gia Huy (IA)", Auth.Repository.Enums.AccountRole.Student, "IA180007", false, true),
            ("student8@exe.local", "Student@123", "Bùi Ngọc Ánh (GD)", Auth.Repository.Enums.AccountRole.Student, "GD180008", false, true),
            ("sinhvien.moi@fpt.edu.vn", "Student@123", "Phan Thanh Tân (Tân sinh viên EXE)", Auth.Repository.Enums.AccountRole.Student, "SE180999", true, false),
        };

        var now = DateTime.UtcNow;
        var addedAny = false;
        foreach (var spec in demoSpecs)
        {
            var existing = await db.Accounts.FirstOrDefaultAsync(a => a.Email == spec.Email);
            if (existing == null)
            {
                var accountId = Guid.NewGuid();
                var account = new Auth.Repository.Entities.Account
                {
                    Id = accountId,
                    Email = spec.Email,
                    PasswordHash = passwordHasher.HashPassword(spec.Password),
                    RegistrationFullName = spec.FullName,
                    Role = spec.Role,
                    StudentCode = spec.StudentCode,
                    MustChangePassword = spec.MustChangePassword,
                    AcceptedTermsAt = spec.HasAcceptedTerms ? now : null,
                    IsActive = true,
                    EmailConfirmed = true,
                    EmailConfirmedAt = now,
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
                    InitialPassword: null,
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
