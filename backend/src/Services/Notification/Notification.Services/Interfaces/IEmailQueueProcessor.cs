using Notification.Services.DTOs;

namespace Notification.Services.Interfaces;

public interface IEmailQueueProcessor
{
    Task<EmailQueueProcessResult> ProcessPendingEmailsAsync(CancellationToken ct = default);
}
