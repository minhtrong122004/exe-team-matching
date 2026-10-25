using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Notification.Repository.Enums;
using Notification.Repository.Interfaces;
using Notification.Services.DTOs;
using Notification.Services.Interfaces;

namespace Notification.Services.Implementations;

public class EmailQueueProcessor : IEmailQueueProcessor
{
    private readonly IEmailLogRepository _emailLogRepo;
    private readonly INotificationUnitOfWork _unitOfWork;
    private readonly ISmtpEmailSender _smtpEmailSender;
    private readonly SmtpOptions _options;
    private readonly ILogger<EmailQueueProcessor> _logger;

    public EmailQueueProcessor(
        IEmailLogRepository emailLogRepo,
        INotificationUnitOfWork unitOfWork,
        ISmtpEmailSender smtpEmailSender,
        IOptions<SmtpOptions> options,
        ILogger<EmailQueueProcessor> logger)
    {
        _emailLogRepo = emailLogRepo;
        _unitOfWork = unitOfWork;
        _smtpEmailSender = smtpEmailSender;
        _options = options.Value;
        _logger = logger;
    }

    public async Task<EmailQueueProcessResult> ProcessPendingEmailsAsync(CancellationToken ct = default)
    {
        var pending = await _emailLogRepo.GetPendingOrRetryableAsync(_options.MaxAttempts, _options.BatchSize, ct);
        if (pending.Count == 0)
        {
            return new EmailQueueProcessResult(0, 0, 0);
        }

        var sent = 0;
        var failed = 0;

        foreach (var email in pending)
        {
            email.Attempts += 1;
            try
            {
                await _smtpEmailSender.SendEmailAsync(email.To, email.Subject, email.Body, ct);
                email.Status = EmailStatus.Sent;
                email.SentAt = DateTime.UtcNow;
                email.LastError = null;
                sent++;
            }
            catch (Exception ex)
            {
                email.Status = EmailStatus.Failed;
                email.LastError = ex.Message.Length > 1000 ? ex.Message[..1000] : ex.Message;
                failed++;
                _logger.LogWarning(
                    ex,
                    "Failed to send email {EmailId} to {Recipient} (attempt {Attempts}/{MaxAttempts})",
                    email.Id,
                    email.To,
                    email.Attempts,
                    _options.MaxAttempts);
            }
        }

        await _unitOfWork.SaveChangesAsync(ct);
        return new EmailQueueProcessResult(pending.Count, sent, failed);
    }
}
