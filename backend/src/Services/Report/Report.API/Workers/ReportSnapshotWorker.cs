using System.Diagnostics;
using Microsoft.Extensions.Options;
using Report.Services.DTOs;
using Report.Services.Interfaces;

namespace Report.API.Workers;

/// <summary>
/// BackgroundService định kỳ chụp thống kê lưu vào bảng ReportSnapshots (CLAUDE.md mục 6, 8, 10).
/// </summary>
public sealed class ReportSnapshotWorker : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly SnapshotOptions _options;
    private readonly ILogger<ReportSnapshotWorker> _logger;

    public ReportSnapshotWorker(
        IServiceScopeFactory scopeFactory,
        IOptions<SnapshotOptions> options,
        ILogger<ReportSnapshotWorker> logger)
    {
        _scopeFactory = scopeFactory;
        _options = options.Value;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await Task.Yield();
        var interval = TimeSpan.FromMinutes(Math.Max(1, _options.IntervalMinutes));

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                _logger.LogInformation("[JOB] ReportSnapshotJob started");
                var sw = Stopwatch.StartNew();

                await using var scope = _scopeFactory.CreateAsyncScope();
                var reportService = scope.ServiceProvider.GetRequiredService<IReportService>();
                var snapshot = await reportService.CreateSnapshotAsync(stoppingToken);

                sw.Stop();
                _logger.LogInformation(
                    "[JOB] ReportSnapshotJob finished snapshotId={SnapshotId} duration={DurationMs}ms",
                    snapshot.Id,
                    sw.ElapsedMilliseconds);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[JOB] ReportSnapshotJob failed: {Message}", ex.Message);
            }

            await Task.Delay(interval, stoppingToken);
        }
    }
}
