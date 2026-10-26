using Exe.BuildingBlocks.EventBus;
using Exe.BuildingBlocks.Persistence;
using Exe.BuildingBlocks.Web;
using Group.API.Workers;
using Group.Repository;
using Group.Repository.Data;
using Group.Services;

var builder = WebApplication.CreateBuilder(args);

// ── 0. Phần dùng chung (BuildingBlocks) ─────────────────────────────────────
// Controllers + JSON (camelCase, enum dạng chuỗi), ProblemDetails, JWT, ICurrentUser,
// Swagger có nút Authorize, /health, log console.
builder.AddExeServiceDefaults("Group Service");

// ── 1. Repository (DbContext ExeGroupDb) ────────────────────────────────────
builder.Services.AddGroupRepository(builder.Configuration);

// ── 2. Services + client User/Project (REST) và Matching (gRPC) ─────────────
builder.Services.AddGroupServices(builder.Configuration);

// ── 3. Event bus (Redis Streams) — Group chỉ là producer ────────────────────
builder.Services.AddExeEventBus(builder.Configuration);

// ── 4. Background job ───────────────────────────────────────────────────────
builder.Services.AddHostedService<InvitationExpiryJob>();

// ═══════════════════════════════════════════════════════════════════════════
var app = builder.Build();

// ── 5. Pipeline: log request → bắt lỗi (ProblemDetails) → Swagger → JWT → controllers, /health ──
app.UseExeServiceDefaults();
app.MapGet("/", () => "Group Service is running").AllowAnonymous().ExcludeFromDescription();

// ── 6. Auto-migrate khi Development (có retry trong lúc SQL Server khởi động) ──
await app.MigrateDatabaseAsync<GroupDbContext>();

app.Run();
