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

                if (!string.IsNullOrWhiteSpace(@event.StudentCode))
                {
                    var normalizedCode = @event.StudentCode.Trim().ToUpperInvariant();
                    profile.StudentCode = normalizedCode;
                    profile.Campus ??= "HCM";
                    profile.Cohort = ParseCohortFromStudentCode(normalizedCode);
                    profile.Major = ParseMajor(@event.Major, normalizedCode);
                }
                else if (!string.IsNullOrWhiteSpace(@event.Major))
                {
                    profile.Major = ParseMajor(@event.Major, string.Empty);
                }

                EnrichDemoStudentProfileIfApplicable(profile);

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

    private static Major? ParseMajor(string? rawMajor, string studentCode)
    {
        if (!string.IsNullOrWhiteSpace(rawMajor))
        {
            var trimmed = rawMajor.Trim();
            if (Enum.TryParse<Major>(trimmed, true, out var explicitMajor))
            {
                return explicitMajor;
            }
            var upper = trimmed.ToUpperInvariant();
            if (upper is "KỸ THUẬT PHẦN MỀM" or "KY THUAT PHAN MEM" or "SOFTWARE ENGINEERING" or "KTPM")
                return Major.SE;
            if (upper is "TRÍ TUỆ NHÂN TẠO" or "TRI TUE NHAN TAO" or "ARTIFICIAL INTELLIGENCE")
                return Major.AI;
            if (upper is "AN TOÀN THÔNG TIN" or "AN TOAN THONG TIN" or "INFORMATION ASSURANCE" or "ATTT")
                return Major.IA;
            if (upper is "THIẾT KẾ ĐỒ HỌA" or "THIET KE DO HOA" or "GRAPHIC DESIGN" or "TKDH")
                return Major.GD;
            if (upper is "MK" or "MARKETING" or "DIGITAL MARKETING")
                return Major.MKT;
            if (upper is "KINH DOANH QUỐC TẾ" or "KINH DOANH QUOC TE" or "INTERNATIONAL BUSINESS" or "KDQT" or "QUẢN TRỊ KINH DOANH" or "QTKD")
                return Major.IB;
            return Major.Other;
        }
        if (!string.IsNullOrWhiteSpace(studentCode))
        {
            return ParseMajorFromStudentCode(studentCode);
        }
        return null;
    }

    /// <summary>
    /// Tự động bóc tách Khóa sinh viên (Cohort) từ số trong Mã số sinh viên (BR-04).
    /// Ví dụ: SE180101 -> K18, AI180205 -> K18, GD170312 -> K17, SA180123 -> K18.
    /// </summary>
    private static string? ParseCohortFromStudentCode(string studentCode)
    {
        if (string.IsNullOrWhiteSpace(studentCode)) return null;
        var trimmed = studentCode.Trim().ToUpperInvariant();
        var match = System.Text.RegularExpressions.Regex.Match(trimmed, @"(?:[A-Z]+)?(\d{2})");
        if (match.Success && match.Groups.Count > 1)
        {
            return $"K{match.Groups[1].Value}";
        }
        return "K18";
    }

    /// <summary>
    /// Tự động bóc tách Chuyên ngành (Major) từ tiền tố Mã số sinh viên (BR-04).
    /// Ví dụ: SE180101 -> SE, AI180205 -> AI, GD180312 -> GD, MKT180408/MK180104 -> MKT, IB180519 -> IB, IA180622 -> IA.
    /// </summary>
    private static Major ParseMajorFromStudentCode(string studentCode)
    {
        var upper = studentCode.Trim().ToUpperInvariant();
        if (upper.StartsWith("SE") || upper.StartsWith("HE") || upper.StartsWith("QE") || upper.StartsWith("CE") || upper.StartsWith("DE"))
            return Major.SE;
        if (upper.StartsWith("AI"))
            return Major.AI;
        if (upper.StartsWith("IA"))
            return Major.IA;
        if (upper.StartsWith("GD") || upper.StartsWith("HA") || upper.StartsWith("SA") || upper.StartsWith("CA"))
            return Major.GD;
        if (upper.StartsWith("MKT") || upper.StartsWith("MK") || upper.StartsWith("MC"))
            return Major.MKT;
        if (upper.StartsWith("IB") || upper.StartsWith("HS") || upper.StartsWith("SS") || upper.StartsWith("CS") || upper.StartsWith("BA"))
            return Major.IB;
        return Major.Other;
    }

    private static void EnrichDemoStudentProfileIfApplicable(UserProfile profile)
    {
        var now = DateTime.UtcNow;
        switch (profile.Email)
        {
            case "student1@exe.local":
                profile.StudentCode = "SE180101";
                profile.Campus = "HCM";
                profile.Cohort = "K18";
                profile.Major = Major.SE;
                profile.DesiredRole = "Backend / System Architect";
                profile.Bio = "Sinh viên năm cuối ngành Kỹ thuật phần mềm, đam mê kiến trúc Microservices với .NET 10, Redis và Docker.";
                profile.Interests = "EdTech,FinTech,SaaS";
                profile.TechScore = 90;
                profile.ManagementScore = 80;
                profile.GraphicDesignScore = 40;
                profile.MarketingScore = 50;
                profile.SaleScore = 45;
                profile.IsCommitted = true;
                profile.CommittedAt = now;
                profile.IsProfileCompleted = true;
                break;
            case "student2@exe.local":
                profile.StudentCode = "AI180102";
                profile.Campus = "HCM";
                profile.Cohort = "K18";
                profile.Major = Major.AI;
                profile.DesiredRole = "AI / Machine Learning Engineer";
                profile.Bio = "Nghiên cứu NLP, LLM RAG và Computer Vision ứng dụng cho giáo dục và y tế thông minh.";
                profile.Interests = "EdTech,HealthTech,AI";
                profile.TechScore = 85;
                profile.ManagementScore = 65;
                profile.GraphicDesignScore = 50;
                profile.MarketingScore = 40;
                profile.SaleScore = 30;
                profile.IsCommitted = true;
                profile.CommittedAt = now;
                profile.IsProfileCompleted = true;
                break;
            case "student3@exe.local":
                profile.StudentCode = "GD180103";
                profile.Campus = "HCM";
                profile.Cohort = "K18";
                profile.Major = Major.GD;
                profile.DesiredRole = "Product Designer (UI/UX)";
                profile.Bio = "Chuyên thiết kế Design System trên Figma, tối ưu trải nghiệm người dùng và nhận diện thương hiệu khởi nghiệp.";
                profile.Interests = "EdTech,ECommerce,Design";
                profile.TechScore = 45;
                profile.ManagementScore = 60;
                profile.GraphicDesignScore = 95;
                profile.MarketingScore = 60;
                profile.SaleScore = 40;
                profile.IsCommitted = true;
                profile.CommittedAt = now;
                profile.IsProfileCompleted = true;
                break;
            case "student4@exe.local":
                profile.StudentCode = "MK180104";
                profile.Campus = "HCM";
                profile.Cohort = "K18";
                profile.Major = Major.MKT;
                profile.DesiredRole = "Growth & Digital Marketing Lead";
                profile.Bio = "Kinh nghiệm xây dựng chiến dịch Go-To-Market, Content Marketing và phân tích chuyển đổi cho dự án EXE.";
                profile.Interests = "ECommerce,EdTech,FinTech";
                profile.TechScore = 35;
                profile.ManagementScore = 70;
                profile.GraphicDesignScore = 65;
                profile.MarketingScore = 95;
                profile.SaleScore = 75;
                profile.IsCommitted = true;
                profile.CommittedAt = now;
                profile.IsProfileCompleted = true;
                break;
            case "student5@exe.local":
                profile.StudentCode = "IB180105";
                profile.Campus = "HCM";
                profile.Cohort = "K18";
                profile.Major = Major.IB;
                profile.DesiredRole = "Business Analyst & Pitching Lead";
                profile.Bio = "Phụ trách mô hình tài chính, Business Model Canvas, nghiên cứu thị trường và thuyết trình gọi vốn.";
                profile.Interests = "FinTech,GreenTech,SaaS";
                profile.TechScore = 30;
                profile.ManagementScore = 85;
                profile.GraphicDesignScore = 35;
                profile.MarketingScore = 70;
                profile.SaleScore = 90;
                profile.IsCommitted = true;
                profile.CommittedAt = now;
                profile.IsProfileCompleted = true;
                break;
            case "student6@exe.local":
                profile.StudentCode = "SE180106";
                profile.Campus = "HCM";
                profile.Cohort = "K18";
                profile.Major = Major.SE;
                profile.DesiredRole = "Frontend / Mobile Lead";
                profile.Bio = "Thành thạo React 19, TypeScript, tối ưu hiệu năng giao diện web và ứng dụng di động.";
                profile.Interests = "EdTech,ECommerce,HealthTech";
                profile.TechScore = 90;
                profile.ManagementScore = 50;
                profile.GraphicDesignScore = 75;
                profile.MarketingScore = 40;
                profile.SaleScore = 35;
                profile.IsCommitted = true;
                profile.CommittedAt = now;
                profile.IsProfileCompleted = true;
                break;
            case "student7@exe.local":
                profile.StudentCode = "IA180107";
                profile.Campus = "HCM";
                profile.Cohort = "K18";
                profile.Major = Major.IA;
                profile.DesiredRole = "DevSecOps & Security Engineer";
                profile.Bio = "Đảm bảo an toàn thông tin, kiểm thử bảo mật OWASP và vận hành hạ tầng đám mây cho sản phẩm khởi nghiệp.";
                profile.Interests = "FinTech,HealthTech,Cybersecurity";
                profile.TechScore = 85;
                profile.ManagementScore = 60;
                profile.GraphicDesignScore = 30;
                profile.MarketingScore = 35;
                profile.SaleScore = 40;
                profile.IsCommitted = true;
                profile.CommittedAt = now;
                profile.IsProfileCompleted = true;
                break;
            case "student8@exe.local":
                profile.StudentCode = "GD180108";
                profile.Campus = "HCM";
                profile.Cohort = "K18";
                profile.Major = Major.GD;
                profile.DesiredRole = "Brand & Motion Designer";
                profile.Bio = "Sáng tạo bộ nhận diện thương hiệu, ấn phẩm truyền thông và video pitch deck chuyên nghiệp.";
                profile.Interests = "GreenTech,ECommerce,Media";
                profile.TechScore = 35;
                profile.ManagementScore = 55;
                profile.GraphicDesignScore = 90;
                profile.MarketingScore = 65;
                profile.SaleScore = 50;
                profile.IsCommitted = true;
                profile.CommittedAt = now;
                profile.IsProfileCompleted = true;
                break;
        }
    }
}
