using Exe.Contracts.Events;

namespace User.Services.Interfaces;

/// <summary>
/// Giao diện dịch vụ nghiệp vụ xử lý idempotent sự kiện MemberJoined và MemberLeft từ Group Service (CLAUDE.md mục 7, BR-01).
/// Đồng bộ trạng thái UserProfile.Availability (InTeam / LookingForTeam).
/// </summary>
public interface IUserGroupMembershipConsumerService
{
    Task HandleMemberJoinedAsync(Guid eventId, MemberJoined payload, CancellationToken ct = default);
    Task HandleMemberLeftAsync(Guid eventId, MemberLeft payload, CancellationToken ct = default);
}

