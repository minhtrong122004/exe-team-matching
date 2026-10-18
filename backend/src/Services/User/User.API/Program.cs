using System.Text.Json;
using System.Text.Json.Serialization;
using Exe.BuildingBlocks.Auth;
using Exe.BuildingBlocks.EventBus;
using Exe.BuildingBlocks.Web;
using Microsoft.OpenApi;
using User.Repository;
using User.Services;

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
        Title = "EXE Team Matching - User Service API",
        Version = "v1",
        Description = "Microservice quản lý hồ sơ người dùng và danh mục kỹ năng (PRN232 Final Assignment)."
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

// ── Database & Persistence (Stage E1.1) ──────────────────────────────────────
builder.Services.AddUserRepository(builder.Configuration.GetConnectionString("Default"));

// ── Shared JWT Authentication & CurrentUser (Stage D0) ───────────────────────
builder.Services.AddExeJwtAuthentication(builder.Configuration);

// ── Business Services & Validation (Stage E1.2) ─────────────────────────────
builder.Services.AddUserServices();

// ── Redis Stream Consumer & EventBus (Stage E2) ──────────────────────────────
builder.Services.AddExeRedisEventPublisher(builder.Configuration);
builder.Services.Configure<User.API.Workers.UserConsumerOptions>(builder.Configuration.GetSection(User.API.Workers.UserConsumerOptions.SectionName));
builder.Services.AddHostedService<User.API.Workers.UserRegisteredConsumerWorker>();

var app = builder.Build();

// ── Middleware Pipeline (Exception Handler là ngoài cùng) ────────────────────
app.UseExeExceptionHandler();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "User Service API v1");
    });
}

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHealthChecks("/health");
app.MapGet("/", () => "User Service is running").ExcludeFromDescription();

app.Run();

public partial class Program { }
