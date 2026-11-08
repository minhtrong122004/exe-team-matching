using System.Text.Json;
using System.Text.Json.Serialization;
using Exe.BuildingBlocks.Auth;
using Exe.BuildingBlocks.EventBus;
using Exe.BuildingBlocks.Web;
using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi;
using User.Repository;
using User.Repository.Data;
using User.Repository.Entities;
using User.Repository.Enums;
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
builder.Services.AddHostedService<User.API.Workers.MemberJoinedConsumer>();
builder.Services.AddHostedService<User.API.Workers.MemberLeftConsumer>();
builder.Services.AddHostedService<User.API.Workers.DemoStudentSkillsEnricherWorker>();

var app = builder.Build();

// ── Database Migration & Default Skills Seed ─────────────────────────────────
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<UserDbContext>();
    if (db.Database.IsRelational())
    {
        await db.Database.MigrateAsync();
        await db.Database.ExecuteSqlRawAsync(
            "DELETE FROM [UserProfiles] WHERE [Email] = N'admin@exe.local'; UPDATE [UserProfiles] SET [Role] = N'Moderator' WHERE [Role] = N'Admin';");

        var now = DateTime.UtcNow;
        var defaultSkills = new List<Skill>
        {
            new() { Id = Guid.NewGuid(), Name = ".NET Core Microservices", Category = SkillCategory.Technical, Description = "Backend development with ASP.NET Core & EF Core", CreatedAt = now },
            new() { Id = Guid.NewGuid(), Name = "React & TypeScript", Category = SkillCategory.Technical, Description = "Modern frontend web development", CreatedAt = now },
            new() { Id = Guid.NewGuid(), Name = "Python & Machine Learning", Category = SkillCategory.Technical, Description = "AI, Data Science & ML model engineering", CreatedAt = now },
            new() { Id = Guid.NewGuid(), Name = "Docker & Containerization", Category = SkillCategory.Technical, Description = "Containerization, CI/CD & cloud deployment", CreatedAt = now },
            new() { Id = Guid.NewGuid(), Name = "SQL & Database Design", Category = SkillCategory.Technical, Description = "Relational database architecture & optimization", CreatedAt = now },
            new() { Id = Guid.NewGuid(), Name = "UI/UX & Figma Design", Category = SkillCategory.Design, Description = "User interface & product experience design", CreatedAt = now },
            new() { Id = Guid.NewGuid(), Name = "Graphic Design & Branding", Category = SkillCategory.Design, Description = "Graphic design, visual branding & digital assets", CreatedAt = now },
            new() { Id = Guid.NewGuid(), Name = "Business Model & Lean Startup", Category = SkillCategory.Business, Description = "Startup business model canvas & lean validation", CreatedAt = now },
            new() { Id = Guid.NewGuid(), Name = "Financial Planning & Pitching", Category = SkillCategory.Business, Description = "Financial modeling & investor pitch deck", CreatedAt = now },
            new() { Id = Guid.NewGuid(), Name = "Digital Marketing & Growth", Category = SkillCategory.Marketing, Description = "Growth hacking, social media & performance marketing", CreatedAt = now },
            new() { Id = Guid.NewGuid(), Name = "Content Strategy & SEO", Category = SkillCategory.Marketing, Description = "Storytelling, SEO & content creation for startups", CreatedAt = now }
        };
        var existingSkillNames = await db.Skills.Select(s => s.Name).ToListAsync();
        var missingSkills = defaultSkills
            .Where(s => !existingSkillNames.Contains(s.Name, StringComparer.OrdinalIgnoreCase))
            .ToList();
        if (missingSkills.Count > 0)
        {
            await db.Skills.AddRangeAsync(missingSkills);
            await db.SaveChangesAsync();
        }
    }
}

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
app.MapHealthChecks("/health").AllowAnonymous();
app.MapGet("/", () => "User Service is running").AllowAnonymous().ExcludeFromDescription();

app.Run();

public partial class Program { }
