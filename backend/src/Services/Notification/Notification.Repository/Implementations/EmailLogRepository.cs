using Microsoft.EntityFrameworkCore;
using Notification.Repository.Data;
using Notification.Repository.Entities;
using Notification.Repository.Enums;
using Notification.Repository.Interfaces;

namespace Notification.Repository.Implementations;

public class EmailLogRepository(NotificationDbContext db) : IEmailLogRepository
{
    public async Task AddAsync(EmailLog emailLog, CancellationToken ct = default) =>
        await db.EmailLogs.AddAsync(emailLog, ct);

    public async Task<IReadOnlyList<EmailLog>> GetPendingOrRetryableAsync(
        int maxAttempts,
        int batchSize,
        CancellationToken ct = default)
    {
        return await db.EmailLogs
            .Where(e => e.Status == EmailStatus.Pending ||
                        (e.Status == EmailStatus.Failed && e.Attempts < maxAttempts))
            .OrderBy(e => e.CreatedAt)
            .Take(batchSize)
            .ToListAsync(ct);
    }

    public void Update(EmailLog emailLog) =>
        db.EmailLogs.Update(emailLog);
}
