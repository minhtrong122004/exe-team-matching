using Exe.BuildingBlocks.EventBus;
using Exe.BuildingBlocks.Persistence;
using Exe.BuildingBlocks.Web;
using Notification.API.Workers;
using Notification.Repository;
using Notification.Repository.Data;
using Notification.Services;

var builder = WebApplication.CreateBuilder(args);

builder.AddExeServiceDefaults("Notification Service");
builder.Services.AddExeEventBus(builder.Configuration);
builder.Services.AddNotificationRepository(builder.Configuration.GetConnectionString("Default"));
builder.Services.AddNotificationServices(builder.Configuration);

builder.Services.AddHostedService<UserRegisteredConsumer>();
builder.Services.AddHostedService<JoinRequestCreatedConsumer>();
builder.Services.AddHostedService<JoinRequestDecidedConsumer>();
builder.Services.AddHostedService<InvitationCreatedConsumer>();
builder.Services.AddHostedService<MemberJoinedConsumer>();
builder.Services.AddHostedService<MemberLeftConsumer>();
builder.Services.AddHostedService<EmailSenderWorker>();

var app = builder.Build();

app.UseExeServiceDefaults();
app.MapGet("/", () => "Notification Service is running").AllowAnonymous().ExcludeFromDescription();

await app.MigrateDatabaseAsync<NotificationDbContext>();

app.Run();
