using Exe.BuildingBlocks.Persistence;
using Exe.BuildingBlocks.Web;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using Project.Repository.Data;
using Project.Repository.Implementations;
using Project.Repository.Interfaces;
using Project.Services.Implementations;
using Project.Services.Interfaces;
using Project.Services.Validators;

var builder = WebApplication.CreateBuilder(args);

// ── 0. Phần dùng chung (BuildingBlocks) ─────────────────────────────────────
// Controllers + JSON (camelCase, enum dạng chuỗi), ProblemDetails, JWT, ICurrentUser,
// Swagger có nút Authorize, /health, log console.
builder.AddExeServiceDefaults("Project Service");

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

// ═══════════════════════════════════════════════════════════════════════════
var app = builder.Build();

// ── 5. Pipeline: log request → bắt lỗi (ProblemDetails) → Swagger → JWT → controllers, /health ──
app.UseExeServiceDefaults();
app.MapGet("/", () => "Project Service is running").AllowAnonymous().ExcludeFromDescription();

// ── 6. Auto-migrate khi Development (có retry trong lúc SQL Server khởi động) ──
await app.MigrateDatabaseAsync<ProjectDbContext>();

app.Run();
