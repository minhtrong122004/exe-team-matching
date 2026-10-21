using System.Diagnostics;
using Group.Services.Interfaces;
using Group.Services.Options;
using Microsoft.Extensions.Options;

namespace Group.API.Workers;

/// <summary>
/// BR-10: định kỳ (mặc định 10 phút) chuyển lời mời Pending đã quá ExpiresAt sang Expired.
/// Chạy một lần ngay khi khởi động để demo không phải chờ.
/// </summary>
public sealed class InvitationExpiryJob(
    IServiceScopeFactory scopeFactory,
    IOptions<GroupOptions> options,
    ILogger<InvitationExpiryJob> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var interval = TimeSpan.FromMinutes(Math.Max(1, options.Value.InvitationExpiryJobIntervalMinutes));
        using var timer = new PeriodicTimer(interval);

        do
        {
            await RunOnceAsync(stoppingToken);
        }
        while (await timer.WaitForNextTickAsync(stoppingToken));
    }

    private async Task RunOnceAsync(CancellationToken ct)
    {
        var sw = Stopwatch.StartNew();
        try
        {
            await using var scope = scopeFactory.CreateAsyncScope();
            var service = scope.ServiceProvider.GetRequiredService<IInvitationService>();
            var expired = await service.ExpireOverdueAsync(ct);

            logger.LogInformation("[JOB] InvitationExpiryJob expired={Expired} duration={Duration}ms",
                expired, sw.ElapsedMilliseconds);
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested)
        {
            // dừng service
        }
        catch (Exception ex)
        {
            // Lỗi một lần (vd. SQL Server chưa sẵn sàng) không được làm dừng job.
            logger.LogError(ex, "[JOB] InvitationExpiryJob failed after {Duration}ms", sw.ElapsedMilliseconds);
        }
    }
}
