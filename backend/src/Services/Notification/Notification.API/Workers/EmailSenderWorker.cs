using System.Diagnostics;
using Microsoft.Extensions.Options;
using Notification.Services.DTOs;
using Notification.Services.Interfaces;

namespace Notification.API.Workers;

/// <summary>
/// BackgroundService định kỳ quét bảng EmailLog (Pending/Failed &lt; MaxAttempts) và gửi qua SMTP/MailHog.
/// </summary>
public sealed class EmailSenderWorker : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly SmtpOptions _options;
    private readonly ILogger<EmailSenderWorker> _logger;

    public EmailSenderWorker(
        IServiceScopeFactory scopeFactory,
        IOptions<SmtpOptions> options,
        ILogger<EmailSenderWorker> logger)
    {
        _scopeFactory = scopeFactory;
        _options = options.Value;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await Task.Yield();
        var interval = TimeSpan.FromSeconds(Math.Max(1, _options.PollIntervalSeconds));

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                var sw = Stopwatch.StartNew();
                await using var scope = _scopeFactory.CreateAsyncScope();
                var processor = scope.ServiceProvider.GetRequiredService<IEmailQueueProcessor>();
                var result = await processor.ProcessPendingEmailsAsync(stoppingToken);
                sw.Stop();

                if (result.Processed > 0)
                {
                    _logger.LogInformation(
                        "[JOB] EmailSenderJob finished processed={Processed} sent={Sent} failed={Failed} duration={DurationMs}ms",
                        result.Processed,
                        result.Sent,
                        result.Failed,
                        sw.ElapsedMilliseconds);
                }
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[JOB] EmailSenderJob failed: {Message}", ex.Message);
            }

            await Task.Delay(interval, stoppingToken);
        }
    }
}
