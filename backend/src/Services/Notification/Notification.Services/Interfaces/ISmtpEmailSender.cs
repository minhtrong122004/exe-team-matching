namespace Notification.Services.Interfaces;

public interface ISmtpEmailSender
{
    Task SendEmailAsync(string toEmail, string subject, string htmlBody, CancellationToken ct = default);
}
