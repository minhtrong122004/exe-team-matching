using Exe.Contracts.Events;
using Microsoft.Extensions.Logging;
using Notification.Repository.Entities;
using Notification.Repository.Enums;
using Notification.Repository.Interfaces;
using Notification.Services.Interfaces;

namespace Notification.Services.Implementations;

public class NotificationEventHandler : INotificationEventHandler
{
    private readonly INotificationRepository _notificationRepo;
    private readonly IEmailLogRepository _emailLogRepo;
    private readonly IProcessedEventRepository _processedEventRepo;
    private readonly INotificationUnitOfWork _unitOfWork;
    private readonly ILogger<NotificationEventHandler> _logger;

    public NotificationEventHandler(
        INotificationRepository notificationRepo,
        IEmailLogRepository emailLogRepo,
        IProcessedEventRepository processedEventRepo,
        INotificationUnitOfWork unitOfWork,
        ILogger<NotificationEventHandler> logger)
    {
        _notificationRepo = notificationRepo;
        _emailLogRepo = emailLogRepo;
        _processedEventRepo = processedEventRepo;
        _unitOfWork = unitOfWork;
        _logger = logger;
    }

    public async Task<bool> HandleUserRegisteredAsync(UserRegistered @event, Guid eventId, CancellationToken ct = default)
    {
        if (await IsAlreadyProcessedAsync(eventId, nameof(UserRegistered), ct))
            return false;

        var hasInitialPassword = !string.IsNullOrWhiteSpace(@event.InitialPassword);
        var semester = string.IsNullOrWhiteSpace(@event.SemesterCode) ? "FA26" : @event.SemesterCode;
        var subject = string.IsNullOrWhiteSpace(@event.SubjectCode) ? "EXE101" : @event.SubjectCode;

        var title = hasInitialPassword
            ? $"Thông tin tài khoản & Mật khẩu khởi tạo môn {subject} ({semester})"
            : "Chào mừng đến với EXE Team Matching";

        var message = hasInitialPassword
            ? $"Xin chào {@event.FullName} ({@event.StudentCode ?? "FPT"}), tài khoản học phần {subject} kỳ {semester} của bạn đã được cấp từ danh sách FAP. Vui lòng xác nhận quy định điều phối (BR-34) và đổi mật khẩu bảo mật."
            : $"Xin chào {@event.FullName}, tài khoản ({@event.Role}) của bạn đã sẵn sàng để tìm kiếm và ghép nhóm đồ án EXE.";

        await _notificationRepo.AddAsync(new NotificationEntity
        {
            Id = Guid.NewGuid(),
            RecipientId = @event.UserId,
            Type = NotificationType.Welcome,
            Title = title,
            Message = message,
            RelatedEntityId = @event.UserId,
            IsRead = false,
            CreatedAt = DateTime.UtcNow
        }, ct);

        if (!string.IsNullOrWhiteSpace(@event.Email))
        {
            var htmlBody = hasInitialPassword
                ? $"""
                   <div style="font-family: 'Plus Jakarta Sans', Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
                     <div style="background: #0a192f; color: #ffffff; padding: 20px 24px; border-bottom: 3px solid #f26f21;">
                       <h2 style="margin: 0; font-size: 18px;">FPT University — EXE Team Matching</h2>
                       <p style="margin: 4px 0 0; font-size: 13px; color: #cbd5e1;">Thông báo cấp tài khoản sinh viên đủ điều kiện học phần {subject} ({semester})</p>
                     </div>
                     <div style="padding: 24px; color: #0f172a; line-height: 1.6;">
                       <p>Xin chào <strong>{@event.FullName}</strong>,</p>
                       <p>Điều phối viên (Moderator) đã đồng bộ danh sách sinh viên đủ điều kiện từ hệ thống <strong>FAP</strong> cho học phần <strong>{subject} — Học kỳ {semester}</strong>. Dưới đây là thông tin đăng nhập của bạn:</p>
                       <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 16px; margin: 16px 0; font-family: 'JetBrains Mono', monospace; font-size: 14px;">
                         <p style="margin: 4px 0;"><strong>Mã số sinh viên (MSSV):</strong> {@event.StudentCode ?? "N/A"}</p>
                         <p style="margin: 4px 0;"><strong>Email đăng nhập:</strong> {@event.Email}</p>
                         <p style="margin: 4px 0;"><strong>Mật khẩu khởi tạo:</strong> <span style="color: #f26f21; font-weight: 700;">{@event.InitialPassword}</span></p>
                       </div>
                       <p style="font-size: 13px; color: #475569;"><strong>Lưu ý quan trọng khi đăng nhập lần đầu:</strong></p>
                       <ol style="font-size: 13px; color: #475569; padding-left: 20px;">
                         <li>Xác nhận đồng ý với quy định ghép nhóm liên ngành và sự điều phối của Moderator / Giảng viên (BR-34).</li>
                         <li>Đổi mật khẩu cá nhân ngay sau khi đăng nhập để bảo mật tài khoản.</li>
                         <li>Cập nhật bộ chỉ số kỹ năng để tham gia Room ghép nhóm.</li>
                       </ol>
                     </div>
                   </div>
                   """
                : $"<p>Xin chào <strong>{@event.FullName}</strong>,</p><p>{message}</p>";

            await _emailLogRepo.AddAsync(new EmailLog
            {
                Id = Guid.NewGuid(),
                To = @event.Email,
                Subject = $"[EXE Team Matching] {title}",
                Body = htmlBody,
                Status = EmailStatus.Pending,
                Attempts = 0,
                CreatedAt = DateTime.UtcNow
            }, ct);
        }

        await MarkProcessedAndCommitAsync(eventId, ct);
        return true;
    }

    public async Task<bool> HandleJoinRequestCreatedAsync(JoinRequestCreated @event, Guid eventId, CancellationToken ct = default)
    {
        if (await IsAlreadyProcessedAsync(eventId, nameof(JoinRequestCreated), ct))
            return false;

        var title = $"Yêu cầu tham gia nhóm {@event.GroupName}";
        var message = $"Sinh viên {@event.StudentName} vừa gửi yêu cầu xin gia nhập nhóm \"{@event.GroupName}\".";

        await _notificationRepo.AddAsync(new NotificationEntity
        {
            Id = Guid.NewGuid(),
            RecipientId = @event.LeaderId,
            Type = NotificationType.JoinRequestReceived,
            Title = title,
            Message = message,
            RelatedEntityId = @event.GroupId,
            IsRead = false,
            CreatedAt = DateTime.UtcNow
        }, ct);

        if (!string.IsNullOrWhiteSpace(@event.LeaderEmail))
        {
            await _emailLogRepo.AddAsync(new EmailLog
            {
                Id = Guid.NewGuid(),
                To = @event.LeaderEmail,
                Subject = $"[EXE Team Matching] {title}",
                Body = $"<p>Xin chào <strong>{@event.LeaderName}</strong>,</p><p>{message}</p>",
                Status = EmailStatus.Pending,
                Attempts = 0,
                CreatedAt = DateTime.UtcNow
            }, ct);
        }

        await MarkProcessedAndCommitAsync(eventId, ct);
        return true;
    }

    public async Task<bool> HandleJoinRequestDecidedAsync(JoinRequestDecided @event, Guid eventId, CancellationToken ct = default)
    {
        if (await IsAlreadyProcessedAsync(eventId, nameof(JoinRequestDecided), ct))
            return false;

        var type = @event.Accepted ? NotificationType.JoinRequestAccepted : NotificationType.JoinRequestRejected;
        var statusText = @event.Accepted ? "được chấp nhận" : "bị từ chối";
        var title = $"Kết quả yêu cầu tham gia nhóm {@event.GroupName}";
        var message = $"Yêu cầu tham gia nhóm \"{@event.GroupName}\" của bạn đã {statusText}.";

        await _notificationRepo.AddAsync(new NotificationEntity
        {
            Id = Guid.NewGuid(),
            RecipientId = @event.StudentId,
            Type = type,
            Title = title,
            Message = message,
            RelatedEntityId = @event.GroupId,
            IsRead = false,
            CreatedAt = DateTime.UtcNow
        }, ct);

        if (!string.IsNullOrWhiteSpace(@event.StudentEmail))
        {
            await _emailLogRepo.AddAsync(new EmailLog
            {
                Id = Guid.NewGuid(),
                To = @event.StudentEmail,
                Subject = $"[EXE Team Matching] {title}",
                Body = $"<p>Xin chào <strong>{@event.StudentName}</strong>,</p><p>{message}</p>",
                Status = EmailStatus.Pending,
                Attempts = 0,
                CreatedAt = DateTime.UtcNow
            }, ct);
        }

        await MarkProcessedAndCommitAsync(eventId, ct);
        return true;
    }

    public async Task<bool> HandleInvitationCreatedAsync(InvitationCreated @event, Guid eventId, CancellationToken ct = default)
    {
        if (await IsAlreadyProcessedAsync(eventId, nameof(InvitationCreated), ct))
            return false;

        var title = $"Lời mời tham gia nhóm {@event.GroupName}";
        var message = $"Bạn nhận được lời mời tham gia nhóm \"{@event.GroupName}\" (hết hạn lúc {@event.ExpiresAt:dd/MM/yyyy HH:mm} UTC).";

        await _notificationRepo.AddAsync(new NotificationEntity
        {
            Id = Guid.NewGuid(),
            RecipientId = @event.StudentId,
            Type = NotificationType.InvitationReceived,
            Title = title,
            Message = message,
            RelatedEntityId = @event.GroupId,
            IsRead = false,
            CreatedAt = DateTime.UtcNow
        }, ct);

        if (!string.IsNullOrWhiteSpace(@event.StudentEmail))
        {
            await _emailLogRepo.AddAsync(new EmailLog
            {
                Id = Guid.NewGuid(),
                To = @event.StudentEmail,
                Subject = $"[EXE Team Matching] {title}",
                Body = $"<p>Xin chào <strong>{@event.StudentName}</strong>,</p><p>{message}</p>",
                Status = EmailStatus.Pending,
                Attempts = 0,
                CreatedAt = DateTime.UtcNow
            }, ct);
        }

        await MarkProcessedAndCommitAsync(eventId, ct);
        return true;
    }

    public async Task<bool> HandleMemberJoinedAsync(MemberJoined @event, Guid eventId, CancellationToken ct = default)
    {
        if (await IsAlreadyProcessedAsync(eventId, nameof(MemberJoined), ct))
            return false;

        var title = $"Đã gia nhập nhóm {@event.GroupName}";
        var message = $"Chúc mừng {@event.UserName}! Bạn đã chính thức trở thành thành viên của nhóm \"{@event.GroupName}\" ({@event.MemberCount}/{@event.MaxMembers} thành viên).";

        await _notificationRepo.AddAsync(new NotificationEntity
        {
            Id = Guid.NewGuid(),
            RecipientId = @event.UserId,
            Type = NotificationType.MemberJoined,
            Title = title,
            Message = message,
            RelatedEntityId = @event.GroupId,
            IsRead = false,
            CreatedAt = DateTime.UtcNow
        }, ct);

        if (!string.IsNullOrWhiteSpace(@event.UserEmail))
        {
            await _emailLogRepo.AddAsync(new EmailLog
            {
                Id = Guid.NewGuid(),
                To = @event.UserEmail,
                Subject = $"[EXE Team Matching] {title}",
                Body = $"<p>Xin chào <strong>{@event.UserName}</strong>,</p><p>{message}</p>",
                Status = EmailStatus.Pending,
                Attempts = 0,
                CreatedAt = DateTime.UtcNow
            }, ct);
        }

        await MarkProcessedAndCommitAsync(eventId, ct);
        return true;
    }

    public async Task<bool> HandleMemberLeftAsync(MemberLeft @event, Guid eventId, CancellationToken ct = default)
    {
        if (await IsAlreadyProcessedAsync(eventId, nameof(MemberLeft), ct))
            return false;

        var title = $"Đã rời nhóm {@event.GroupName}";
        var message = $"Bạn đã rời khỏi nhóm \"{@event.GroupName}\" (số thành viên còn lại: {@event.MemberCount}).";

        await _notificationRepo.AddAsync(new NotificationEntity
        {
            Id = Guid.NewGuid(),
            RecipientId = @event.UserId,
            Type = NotificationType.MemberLeft,
            Title = title,
            Message = message,
            RelatedEntityId = @event.GroupId,
            IsRead = false,
            CreatedAt = DateTime.UtcNow
        }, ct);

        await MarkProcessedAndCommitAsync(eventId, ct);
        return true;
    }

    public async Task<bool> HandleMemberRemovedAsync(MemberRemoved @event, Guid eventId, CancellationToken ct = default)
    {
        if (await IsAlreadyProcessedAsync(eventId, nameof(MemberRemoved), ct))
            return false;

        var categoryText = string.IsNullOrWhiteSpace(@event.Category) ? "Khác" : @event.Category;
        var title = $"Thông báo rời khỏi nhóm {@event.GroupName}";
        var message = $"Trưởng nhóm {@event.LeaderName} đã mời bạn ra khỏi nhóm \"{@event.GroupName}\". Phân loại: [{categoryText}]. Lý do: {@event.Reason}";

        await _notificationRepo.AddAsync(new NotificationEntity
        {
            Id = Guid.NewGuid(),
            RecipientId = @event.UserId,
            Type = NotificationType.MemberRemoved,
            Title = title,
            Message = message,
            RelatedEntityId = @event.GroupId,
            IsRead = false,
            CreatedAt = DateTime.UtcNow
        }, ct);

        if (!string.IsNullOrWhiteSpace(@event.UserEmail))
        {
            var htmlBody = $"""
               <div style="font-family: 'Plus Jakarta Sans', Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background: #ffffff;">
                 <div style="background: #0a192f; color: #ffffff; padding: 20px 24px; border-bottom: 3px solid #f26f21;">
                   <h2 style="margin: 0; font-size: 18px; font-weight: 700;">FPT University — EXE Team Matching</h2>
                   <p style="margin: 4px 0 0; font-size: 13px; color: #cbd5e1;">Thông báo thay đổi nhân sự nhóm học phần EXE</p>
                 </div>
                 <div style="padding: 24px; color: #0f172a; line-height: 1.6;">
                   <p>Xin chào <strong>{@event.UserName}</strong>,</p>
                   <p>Hệ thống ghi nhận bạn đã được Trưởng nhóm mời ra khỏi nhóm với thông tin chi tiết dưới đây:</p>
                   <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0;">
                     <p style="margin: 4px 0;"><strong>Tên nhóm / Phòng:</strong> {@event.GroupName}</p>
                     <p style="margin: 4px 0;"><strong>Trưởng nhóm thực hiện:</strong> {@event.LeaderName}</p>
                     <p style="margin: 4px 0;"><strong>Phân loại lý do:</strong> <span style="background: #fee2e2; color: #b91c1c; padding: 2px 8px; border-radius: 4px; font-weight: 600; font-size: 13px;">{categoryText}</span></p>
                     <p style="margin: 8px 0 4px 0;"><strong>Giải trình chi tiết từ Trưởng nhóm:</strong></p>
                     <blockquote style="margin: 4px 0; padding: 8px 12px; background: #ffffff; border-left: 3px solid #f26f21; color: #334155; font-style: italic;">
                       {@event.Reason}
                     </blockquote>
                     <p style="margin: 6px 0 0 0; font-size: 12px; color: #64748b;">Thời gian: {@event.RemovedAt:dd/MM/yyyy HH:mm:ss} UTC</p>
                   </div>
                   <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 14px; margin: 16px 0; font-size: 13px; color: #1e3a8a;">
                     <p style="margin: 0 0 6px 0; font-weight: 700;">Hướng dẫn dành cho bạn:</p>
                     <ul style="margin: 0; padding-left: 20px;">
                       <li>Trạng thái của bạn hiện đã được đưa về <strong>Sẵn sàng tìm nhóm (Looking for team)</strong>.</li>
                       <li>Bạn có thể vào lại hệ thống để vào trực tiếp các Room mở hoặc nộp đơn Apply vào các nhóm khác phù hợp với kỹ năng của mình.</li>
                       <li>Nếu bạn nhận thấy có sự nhầm lẫn hoặc mâu thuẫn không thể tự giải quyết, vui lòng phản ánh đến <strong>Giảng viên hướng dẫn</strong> hoặc <strong>Điều phối viên học kỳ (Moderator)</strong>.</li>
                     </ul>
                   </div>
                   <div style="text-align: center; margin: 24px 0 12px;">
                     <a href="http://localhost:3000/spaces" style="display: inline-block; background: #0054a6; color: #ffffff; text-decoration: none; padding: 10px 24px; border-radius: 6px; font-weight: 600; font-size: 14px;">Khám phá Không gian & Nhóm mới</a>
                   </div>
                   <p style="font-size: 12px; color: #64748b; margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 12px;">
                     Email tự động từ Hệ thống Khởi nghiệp & Ghép nhóm EXE FPT University. Vui lòng không trả lời trực tiếp email này.
                   </p>
                 </div>
               </div>
               """;

            await _emailLogRepo.AddAsync(new EmailLog
            {
                Id = Guid.NewGuid(),
                To = @event.UserEmail,
                Subject = $"[EXE Team Matching] Thông báo mời ra khỏi nhóm: {@event.GroupName}",
                Body = htmlBody,
                Status = EmailStatus.Pending,
                Attempts = 0,
                CreatedAt = DateTime.UtcNow
            }, ct);
        }

        await MarkProcessedAndCommitAsync(eventId, ct);
        return true;
    }

    private async Task<bool> IsAlreadyProcessedAsync(Guid eventId, string eventType, CancellationToken ct)
    {
        if (await _processedEventRepo.ExistsAsync(eventId, ct))
        {
            _logger.LogInformation("Skipping duplicate event {EventType} ({EventId})", eventType, eventId);
            return true;
        }
        return false;
    }

    private async Task MarkProcessedAndCommitAsync(Guid eventId, CancellationToken ct)
    {
        await _processedEventRepo.AddAsync(new ProcessedEvent
        {
            EventId = eventId,
            ProcessedAt = DateTime.UtcNow
        }, ct);
        await _unitOfWork.SaveChangesAsync(ct);
    }
}
