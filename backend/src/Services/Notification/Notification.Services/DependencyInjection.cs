using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Notification.Services.DTOs;
using Notification.Services.Implementations;
using Notification.Services.Interfaces;

namespace Notification.Services;

public static class DependencyInjection
{
    public static IServiceCollection AddNotificationServices(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        services.Configure<SmtpOptions>(configuration.GetSection(SmtpOptions.SectionName));
        services.AddScoped<INotificationService, NotificationService>();
        services.AddScoped<INotificationEventHandler, NotificationEventHandler>();
        services.AddScoped<ISmtpEmailSender, MailKitSmtpEmailSender>();
        services.AddScoped<IEmailQueueProcessor, EmailQueueProcessor>();

        return services;
    }
}
