using Notification.Repository.Data;
using Notification.Repository.Interfaces;

namespace Notification.Repository.Implementations;

public class NotificationUnitOfWork(NotificationDbContext db) : INotificationUnitOfWork
{
    public Task<int> SaveChangesAsync(CancellationToken ct = default) =>
        db.SaveChangesAsync(ct);
}
