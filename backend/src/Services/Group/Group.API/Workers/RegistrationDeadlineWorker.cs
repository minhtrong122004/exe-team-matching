using Group.Repository.Data;
using Group.Repository.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Group.API.Workers;

/// <summary>
/// Tiến trình chạy nền tự động kiểm tra hạn chót đăng ký học phần (RegistrationDeadline, BR-30).
/// Khi mốc thời gian vượt quá hạn chót, worker tự động chuyển trạng thái Space từ Open -> ClosedRegistration.
/// </summary>
public sealed class RegistrationDeadlineWorker(
    IServiceProvider serviceProvider,
    ILogger<RegistrationDeadlineWorker> logger) : BackgroundService
{
    private static readonly TimeSpan CheckInterval = TimeSpan.FromSeconds(30);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogInformation("RegistrationDeadlineWorker started. Checking interval: {Interval}s.", CheckInterval.TotalSeconds);

        using var timer = new PeriodicTimer(CheckInterval);

        while (!stoppingToken.IsCancellationRequested && await timer.WaitForNextTickAsync(stoppingToken))
        {
            try
            {
                await CheckExpiredDeadlinesAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error occurred in RegistrationDeadlineWorker while checking expired deadlines.");
            }
        }

        logger.LogInformation("RegistrationDeadlineWorker stopped.");
    }

    private async Task CheckExpiredDeadlinesAsync(CancellationToken ct)
    {
        using var scope = serviceProvider.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<GroupDbContext>();

        var now = DateTime.UtcNow;

        var expiredSpaces = await db.CourseSpaces
            .Where(s => s.Status == CourseSpaceStatus.Open && s.RegistrationDeadline <= now)
            .ToListAsync(ct);

        if (expiredSpaces.Count == 0) return;

        foreach (var space in expiredSpaces)
        {
            space.Status = CourseSpaceStatus.ClosedRegistration;
            space.UpdatedAt = now;

            logger.LogInformation(
                "RegistrationDeadlineWorker: CourseSpace {SpaceId} ({SemesterCode}-{SubjectCode}) reached deadline {Deadline}. Automatically transitioned to ClosedRegistration (BR-30).",
                space.Id, space.SemesterCode, space.SubjectCode, space.RegistrationDeadline);
        }

        await db.SaveChangesAsync(ct);
    }
}

