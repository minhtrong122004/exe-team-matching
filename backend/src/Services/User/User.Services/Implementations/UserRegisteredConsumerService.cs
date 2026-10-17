using Exe.Contracts.Events;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using User.Repository.Entities;
using User.Repository.Enums;
using User.Repository.Interfaces;
using User.Services.Interfaces;

namespace User.Services.Implementations;

/// <summary>
/// Triển khai dịch vụ xử lý idempotent sự kiện UserRegistered theo CLAUDE.md mục 6, 7.
/// Thực hiện transaction nguyên tử: kiểm tra ProcessedEvent, tạo UserProfile, lưu ProcessedEvent, commit.
/// </summary>
public class UserRegisteredConsumerService : IUserRegisteredConsumerService
{
    private readonly IUserProfileRepository _profileRepo;
    private readonly IProcessedEventRepository _processedEventRepo;
    private readonly IUserUnitOfWork _unitOfWork;
    private readonly ILogger<UserRegisteredConsumerService> _logger;

    public UserRegisteredConsumerService(
        IUserProfileRepository profileRepo,
        IProcessedEventRepository processedEventRepo,
        IUserUnitOfWork unitOfWork,
        ILogger<UserRegisteredConsumerService> logger)
    {
        _profileRepo = profileRepo;
        _processedEventRepo = processedEventRepo;
        _unitOfWork = unitOfWork;
        _logger = logger;
    }

    public async Task<ConsumerExecutionResult> ConsumeAsync(UserRegisteredEvent @event, CancellationToken ct = default)
    {
        ct.ThrowIfCancellationRequested();
        ArgumentNullException.ThrowIfNull(@event);

        // 1. Kiểm tra SchemaVersion được hỗ trợ
        if (@event.SchemaVersion != 1)
        {
            _logger.LogWarning("Unsupported SchemaVersion {SchemaVersion} for EventId {EventId}", @event.SchemaVersion, @event.EventId);
            return new ConsumerExecutionResult(ConsumerExecutionStatus.Invalid, $"Unsupported SchemaVersion: {@event.SchemaVersion}");
        }

        // 2. Kiểm tra tính hợp lệ của dữ liệu phong bì (Envelope validation)
        if (@event.EventId == Guid.Empty || @event.UserId == Guid.Empty ||
            string.IsNullOrWhiteSpace(@event.Email) || string.IsNullOrWhiteSpace(@event.FullName))
        {
            _logger.LogWarning("Invalid payload envelope data: EventId={EventId}, UserId={UserId}", @event.EventId, @event.UserId);
            return new ConsumerExecutionResult(ConsumerExecutionStatus.Invalid, "Event contains empty required fields.");
        }

        // 3. Thực thi Database Transaction nguyên tử tương thích với SqlServerRetryingExecutionStrategy
        return await _unitOfWork.ExecuteInTransactionAsync(async () =>
        {
            try
            {
                // 4. Kiểm tra ProcessedEvents bằng EventId (Idempotent check)
                if (await _processedEventRepo.HasBeenProcessedAsync(@event.EventId, ct))
                {
                    _logger.LogInformation("Event {EventId} has already been processed. Treating as duplicate.", @event.EventId);
                    return new ConsumerExecutionResult(ConsumerExecutionStatus.DuplicateEvent, "Event already processed.");
                }

                // 5. Kiểm tra xung đột UserId hoặc Email (Xung đột danh tính hồ sơ)
                if (await _profileRepo.ExistsAsync(@event.UserId, ct))
                {
                    _logger.LogWarning(
                        "UserProfile already exists for UserId {UserId}, but EventId {EventId} is new. Conflicting identity detected.",
                        @event.UserId, @event.EventId);
                    return new ConsumerExecutionResult(
                        ConsumerExecutionStatus.Conflict,
                        $"UserProfile with UserId {@event.UserId} already exists under a different EventId.");
                }

                var normalizedEmail = @event.Email.Trim().ToLowerInvariant();
                var existingByEmail = await _profileRepo.GetByEmailAsync(normalizedEmail, ct);
                if (existingByEmail != null)
                {
                    _logger.LogWarning(
                        "UserProfile already exists for Email {Email} (UserId {ExistingUserId}), but Event has new UserId {UserId} and EventId {EventId}. Conflicting identity detected.",
                        @event.Email, existingByEmail.UserId, @event.UserId, @event.EventId);
                    return new ConsumerExecutionResult(
                        ConsumerExecutionStatus.Conflict,
                        $"UserProfile with Email {@event.Email} already exists under UserId {existingByEmail.UserId}.");
                }

                // 6. Tạo hồ sơ người dùng rỗng (UserProfile) với UserId từ Auth Service
                var now = DateTime.UtcNow;
                var profile = new UserProfile
                {
                    UserId = @event.UserId,
                    Email = normalizedEmail,
                    FullName = @event.FullName.Trim(),
                    Role = string.IsNullOrWhiteSpace(@event.Role) ? "Student" : @event.Role.Trim(),
                    Availability = UserAvailability.LookingForTeam,
                    CreatedAt = now,
                    UpdatedAt = now
                };

                await _profileRepo.AddAsync(profile, ct);

                // 7. Ghi nhận ProcessedEvent
                var processedEvent = new ProcessedEvent
                {
                    EventId = @event.EventId,
                    EventType = nameof(UserRegisteredEvent).Replace("Event", ""),
                    ProcessedAt = now
                };

                await _processedEventRepo.AddAsync(processedEvent, ct);

                // 8. Lưu thay đổi và Commit Transaction nguyên tử
                await _unitOfWork.SaveChangesAsync(ct);

                _logger.LogInformation("Successfully created UserProfile for UserId {UserId} from EventId {EventId}", @event.UserId, @event.EventId);
                return new ConsumerExecutionResult(ConsumerExecutionStatus.Success);
            }
            catch (DbUpdateException ex) when (IsUniqueConstraintViolation(ex))
            {
                // Xử lý race condition khi 2 consumer xử lý đồng thời cùng 1 bản tin
                if (await _processedEventRepo.HasBeenProcessedAsync(@event.EventId, ct))
                {
                    _logger.LogInformation("Race condition resolved: Event {EventId} was processed concurrently.", @event.EventId);
                    return new ConsumerExecutionResult(ConsumerExecutionStatus.DuplicateEvent, "Event processed concurrently.");
                }

                if (await _profileRepo.ExistsAsync(@event.UserId, ct) || await _profileRepo.GetByEmailAsync(@event.Email.Trim().ToLowerInvariant(), ct) != null)
                {
                    _logger.LogWarning("Race condition / constraint conflict: UserProfile with UserId {UserId} or Email {Email} already exists.", @event.UserId, @event.Email);
                    return new ConsumerExecutionResult(ConsumerExecutionStatus.Conflict, "UserProfile with this UserId or Email already exists.");
                }

                throw;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to process UserRegisteredEvent {EventId} for UserId {UserId}. Transaction rolled back.",
                    @event.EventId, @event.UserId);
                throw;
            }
        }, ct);
    }

    private static bool IsUniqueConstraintViolation(DbUpdateException ex)
    {
        if (ex.InnerException is SqlException sqlEx)
        {
            return sqlEx.Number is 2601 or 2627;
        }
        return false;
    }
}
