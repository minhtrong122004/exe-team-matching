using System.ComponentModel.DataAnnotations;
using System.Text.RegularExpressions;
using Auth.Repository.Entities;
using Auth.Repository.Enums;
using Auth.Repository.Interfaces;
using Auth.Services.DTOs;
using Auth.Services.Interfaces;
using Auth.Services.Security;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Auth.Services.Implementations;

/// <summary>
/// Triển khai an toàn dịch vụ khởi tạo tài khoản Quản trị viên (Admin Bootstrap).
/// Tuân thủ nghiêm ngặt các nguyên tắc:
/// 1. Chỉ chạy trên môi trường Development.
/// 2. Từ chối thực thi nếu đã có bất kỳ Admin nào tồn tại trong hệ thống.
/// 3. Không hardcode thông tin xác thực; nhận thông tin từ local secret configuration.
/// 4. Không bao giờ in hoặc ghi log mật khẩu và chuỗi băm mật khẩu.
/// </summary>
public partial class AdminBootstrapService : IAdminBootstrapService
{
    private readonly IHostEnvironment _environment;
    private readonly IAccountRepository _accountRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IPasswordHasher _passwordHasher;
    private readonly AdminBootstrapOptions _options;
    private readonly ILogger<AdminBootstrapService> _logger;

    public AdminBootstrapService(
        IHostEnvironment environment,
        IAccountRepository accountRepository,
        IUnitOfWork unitOfWork,
        IPasswordHasher passwordHasher,
        IOptions<AdminBootstrapOptions> options,
        ILogger<AdminBootstrapService> logger)
    {
        _environment = environment;
        _accountRepository = accountRepository;
        _unitOfWork = unitOfWork;
        _passwordHasher = passwordHasher;
        _options = options?.Value ?? new AdminBootstrapOptions();
        _logger = logger;
    }

    public async Task<AccountResponse> BootstrapAdminAsync(CancellationToken ct = default)
    {
        // 1. Kiểm tra môi trường thực thi: Chỉ cho phép trong Development
        if (!_environment.IsDevelopment())
        {
            throw new InvalidOperationException("Admin bootstrap is strictly prohibited outside the Development environment.");
        }

        // 2. Kiểm tra thông tin cấu hình từ local secrets / biến môi trường
        var email = _options.AdminEmail?.Trim();
        var password = _options.AdminPassword;
        var fullName = string.IsNullOrWhiteSpace(_options.AdminFullName)
            ? "System Administrator"
            : _options.AdminFullName.Trim();

        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
        {
            throw new InvalidOperationException(
                "Admin bootstrap credentials are not configured. " +
                "Please set 'Bootstrap:AdminEmail' and 'Bootstrap:AdminPassword' using 'dotnet user-secrets' or environment variables.");
        }

        // 3. Kiểm tra định dạng Email
        if (!new EmailAddressAttribute().IsValid(email))
        {
            throw new InvalidOperationException($"The provided Admin email '{email}' is not in a valid email format.");
        }

        // 4. Kiểm tra độ phức tạp mật khẩu theo chuẩn hệ sinh thái (>= 8 ký tự, 1 hoa, 1 thường, 1 số, 1 ký tự đặc biệt)
        if (password.Length < 8 ||
            !PasswordUpperRegex().IsMatch(password) ||
            !PasswordLowerRegex().IsMatch(password) ||
            !PasswordDigitRegex().IsMatch(password) ||
            !PasswordSpecialRegex().IsMatch(password))
        {
            throw new InvalidOperationException(
                "The provided Admin password does not meet complexity requirements: " +
                "Minimum 8 characters, at least 1 uppercase letter, at least 1 lowercase letter, at least 1 digit, and at least 1 special character.");
        }

        // 5. Băm mật khẩu bằng BCrypt theo chính sách bảo mật hiện hành trước khi mở giao dịch
        var passwordHash = _passwordHasher.HashPassword(password);
        var normalizedEmail = email.ToLowerInvariant();

        Account? adminAccount = null;

        // 6. Thực thi kiểm tra và ghi nhận nguyên tử trong Transaction mức Serializable để ngăn ngừa race condition
        await _unitOfWork.ExecuteInTransactionAsync(async () =>
        {
            var (_, adminCount) = await _accountRepository.GetPagedAsync(
                search: null,
                role: AccountRole.Admin,
                isActive: null,
                sortBy: "CreatedAt",
                ascending: false,
                page: 1,
                pageSize: 1,
                ct: ct);

            if (adminCount > 0)
            {
                throw new InvalidOperationException(
                    "An Admin account already exists in ExeAuthDb. Admin bootstrap is strictly permitted only for initial setup.");
            }

            if (await _accountRepository.ExistsByEmailAsync(normalizedEmail, ct))
            {
                throw new InvalidOperationException($"An account with email '{normalizedEmail}' already exists.");
            }

            var now = DateTime.UtcNow;
            adminAccount = new Account
            {
                Id = Guid.NewGuid(),
                Email = normalizedEmail,
                PasswordHash = passwordHash,
                RegistrationFullName = fullName,
                Role = AccountRole.Admin,
                IsActive = true,
                EmailConfirmed = true,
                EmailConfirmedAt = now,
                CreatedAt = now,
                UpdatedAt = now
            };

            await _accountRepository.AddAsync(adminAccount, ct);
            await _unitOfWork.SaveChangesAsync(ct);
        }, System.Data.IsolationLevel.Serializable, ct);

        // 7. Ghi log an toàn tuyệt đối không lộ mật khẩu hay hash
        _logger.LogInformation(
            "Admin account successfully bootstrapped for email: {Email} (AccountId: {AccountId}).",
            adminAccount!.Email, adminAccount.Id);

        return new AccountResponse(
            adminAccount.Id,
            adminAccount.Email,
            adminAccount.RegistrationFullName,
            adminAccount.Role.ToString(),
            adminAccount.IsActive,
            adminAccount.CreatedAt
        );
    }

    [GeneratedRegex(@"[A-Z]")]
    private static partial Regex PasswordUpperRegex();

    [GeneratedRegex(@"[a-z]")]
    private static partial Regex PasswordLowerRegex();

    [GeneratedRegex(@"[0-9]")]
    private static partial Regex PasswordDigitRegex();

    [GeneratedRegex(@"[^a-zA-Z0-9]")]
    private static partial Regex PasswordSpecialRegex();
}
