using Exe.BuildingBlocks.EventBus;
using Exe.BuildingBlocks.Persistence;
using Exe.BuildingBlocks.Web;
using Report.API.Workers;
using Report.Repository;
using Report.Repository.Data;
using Report.Services;

var builder = WebApplication.CreateBuilder(args);

builder.AddExeServiceDefaults("Report Service");
builder.Services.AddExeEventBus(builder.Configuration);
builder.Services.AddReportRepository(builder.Configuration.GetConnectionString("Default"));
builder.Services.AddReportServices(builder.Configuration);

builder.Services.AddHostedService<UserRegisteredConsumer>();
builder.Services.AddHostedService<UserProfileUpdatedConsumer>();
builder.Services.AddHostedService<GroupCreatedConsumer>();
builder.Services.AddHostedService<MemberJoinedConsumer>();
builder.Services.AddHostedService<MemberLeftConsumer>();
builder.Services.AddHostedService<ReportSnapshotWorker>();

var app = builder.Build();

app.UseExeServiceDefaults();
app.MapGet("/", () => "Report Service is running").AllowAnonymous().ExcludeFromDescription();

await app.MigrateDatabaseAsync<ReportDbContext>();

app.Run();
