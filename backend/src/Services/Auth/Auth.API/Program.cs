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
app.MapHealthChecks("/health");
app.MapGet("/", () => "Auth Service is running").ExcludeFromDescription();

app.Run();

public partial class Program { }
