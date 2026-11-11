using Exe.BuildingBlocks.EventBus;
using Exe.BuildingBlocks.Persistence;
using Exe.BuildingBlocks.Web;
using Notification.API.Hubs;
using Notification.API.Workers;
using Notification.Repository;
using Notification.Repository.Data;
using Notification.Services;

var builder = WebApplication.CreateBuilder(args);

builder.AddExeServiceDefaults("Notification Service");
builder.Services.AddExeEventBus(builder.Configuration);
builder.Services.AddNotificationRepository(builder.Configuration.GetConnectionString("Default"));
builder.Services.AddNotificationServices(builder.Configuration);

// Đăng ký SignalR Realtime Hub
builder.Services.AddSignalR();

builder.Services.AddHostedService<UserRegisteredConsumer>();
builder.Services.AddHostedService<JoinRequestCreatedConsumer>();
builder.Services.AddHostedService<JoinRequestDecidedConsumer>();
builder.Services.AddHostedService<MemberJoinedConsumer>();
builder.Services.AddHostedService<MemberLeftConsumer>();
builder.Services.AddHostedService<MemberRemovedConsumer>();
builder.Services.AddHostedService<MemberTransferredPostLockConsumer>();
builder.Services.AddHostedService<SpaceFinalizedConsumer>();
builder.Services.AddHostedService<TransferRequestCreatedConsumer>();
builder.Services.AddHostedService<TransferRequestCancelledConsumer>();
builder.Services.AddHostedService<TransferRequestRejectedConsumer>();
builder.Services.AddHostedService<EmailSenderWorker>();

var app = builder.Build();

app.UseExeServiceDefaults();
app.MapGet("/", () => "Notification Service is running").AllowAnonymous().ExcludeFromDescription();

// Đăng ký endpoint SignalR Hubs
app.MapHub<AppRealtimeHub>("/hubs/realtime");
app.MapHub<AppRealtimeHub>("/hubs/notifications");

await app.MigrateDatabaseAsync<NotificationDbContext>();

app.Run();
