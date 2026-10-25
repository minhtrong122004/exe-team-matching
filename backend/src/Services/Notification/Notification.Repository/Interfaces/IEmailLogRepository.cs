using Notification.Repository.Entities;

namespace Notification.Repository.Interfaces;

public interface IEmailLogRepository
{
    Task AddAsync(EmailLog emailLog, CancellationToken ct = default);

    Task<IReadOnlyList<EmailLog>> GetPendingOrRetryableAsync(
        int maxAttempts,
        int batchSize,
        CancellationToken ct = default);

    void Update(EmailLog emailLog);
}
