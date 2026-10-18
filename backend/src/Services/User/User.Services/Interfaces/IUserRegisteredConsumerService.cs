using Exe.Contracts.Events;

namespace User.Services.Interfaces;

/// <summary>
/// Trạng thái kết quả sau khi xử lý sự kiện UserRegistered.
/// </summary>
public enum ConsumerExecutionStatus
{
    /// <summary>
    /// Xử lý thành công và tạo UserProfile cùng ProcessedEvent mới trong cơ sở dữ liệu.
    /// </summary>
    Success,

    /// <summary>
    /// Sự kiện đã từng được xử lý trước đó (EventId đã tồn tại trong ProcessedEvents). Idempotent.
    /// </summary>
    DuplicateEvent,

    /// <summary>
    /// Xung đột dữ liệu danh tính (UserId đã có UserProfile nhưng EventId lại khác). Không ghi đè.
    /// </summary>
    Conflict,

    /// <summary>
    /// Dữ liệu sự kiện không hợp lệ hoặc SchemaVersion không được hỗ trợ (Poison message).
    /// </summary>
    Invalid
}

/// <summary>
/// Kết quả chi tiết của thao tác tiêu thụ sự kiện.
/// </summary>
public record ConsumerExecutionResult(
    ConsumerExecutionStatus Status,
    string? Message = null
);

/// <summary>
/// Giao diện dịch vụ nghiệp vụ xử lý idempotent sự kiện UserRegistered từ Redis Streams (CLAUDE.md mục 5, 7).
/// </summary>
public interface IUserRegisteredConsumerService
{
    Task<ConsumerExecutionResult> ConsumeAsync(UserRegisteredEvent @event, CancellationToken ct = default);
}
