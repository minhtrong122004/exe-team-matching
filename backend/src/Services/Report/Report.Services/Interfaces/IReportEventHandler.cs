using Exe.Contracts.Events;

namespace Report.Services.Interfaces;

public interface IReportEventHandler
{
    Task<bool> HandleUserRegisteredAsync(UserRegistered @event, Guid eventId, CancellationToken ct = default);
    Task<bool> HandleUserProfileUpdatedAsync(UserProfileUpdated @event, Guid eventId, CancellationToken ct = default);
    Task<bool> HandleGroupCreatedAsync(GroupCreated @event, Guid eventId, CancellationToken ct = default);
    Task<bool> HandleMemberJoinedAsync(MemberJoined @event, Guid eventId, CancellationToken ct = default);
    Task<bool> HandleMemberLeftAsync(MemberLeft @event, Guid eventId, CancellationToken ct = default);
}
