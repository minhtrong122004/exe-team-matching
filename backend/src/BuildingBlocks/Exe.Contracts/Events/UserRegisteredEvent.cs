namespace Exe.Contracts.Events;

/// <summary>
/// Sự kiện phát ra khi người dùng đăng ký tài khoản thành công qua Auth Service.
/// User Service, Notification Service và Report Service lắng nghe sự kiện này qua Redis Streams.
/// (CLAUDE.md mục 7)
/// </summary>
public record UserRegisteredEvent(
    Guid EventId,
    Guid UserId,
    string Email,
    string FullName,
    string Role,
    DateTime OccurredAt,
    int SchemaVersion = 1
);
