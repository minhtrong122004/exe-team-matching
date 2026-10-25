using Exe.Contracts.Events;

namespace Notification.Services.Interfaces;

public interface INotificationEventHandler
{
    Task<bool> HandleUserRegisteredAsync(UserRegistered @event, Guid eventId, CancellationToken ct = default);
    Task<bool> HandleJoinRequestCreatedAsync(JoinRequestCreated @event, Guid eventId, CancellationToken ct = default);
    Task<bool> HandleJoinRequestDecidedAsync(JoinRequestDecided @event, Guid eventId, CancellationToken ct = default);
    Task<bool> HandleInvitationCreatedAsync(InvitationCreated @event, Guid eventId, CancellationToken ct = default);
    Task<bool> HandleMemberJoinedAsync(MemberJoined @event, Guid eventId, CancellationToken ct = default);
    Task<bool> HandleMemberLeftAsync(MemberLeft @event, Guid eventId, CancellationToken ct = default);
}
