namespace Notification.Repository.Interfaces;

public interface INotificationUnitOfWork
{
    Task<int> SaveChangesAsync(CancellationToken ct = default);
}
