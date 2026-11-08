using Auth.Services.DTOs;
using Exe.BuildingBlocks.Paging;

namespace Auth.Services.Interfaces;

/// <summary>
/// Hợp đồng nghiệp vụ quản trị tài khoản dành cho Quản trị viên (Admin):
/// Xem danh sách phân trang, chi tiết tài khoản, khóa và mở khóa tài khoản.
/// </summary>
public interface IAdminAccountService
{
    Task<PagedResult<AccountResponse>> GetAccountsPagedAsync(GetAccountsQuery query, CancellationToken ct = default);

    Task<AccountResponse> GetAccountByIdAsync(Guid id, CancellationToken ct = default);

    Task<AccountResponse> LockAccountAsync(Guid id, CancellationToken ct = default);

    Task<AccountResponse> UnlockAccountAsync(Guid id, CancellationToken ct = default);

    /// <summary>
    /// Khởi tạo tài khoản Giảng viên (Lecturer) hoặc Điều phối viên (Moderator) bởi Moderator/Admin,
    /// kèm phát sinh sự kiện UserRegisteredEvent ghi nhận nguyên tử qua Transactional Outbox.
    /// </summary>
    Task<AccountResponse> CreateLecturerAsync(CreateLecturerRequest request, CancellationToken ct = default);

    /// <summary>
    /// Đồng bộ & cấp phát tài khoản hàng loạt cho danh sách sinh viên đủ điều kiện học EXE từ FAP (BR-01).
    /// Sinh mật khẩu khởi tạo, phát UserRegisteredEvent sang User Service (gắn MSSV + Major) và Notification Service (gửi email mật khẩu).
    /// </summary>
    Task<ProvisionFapStudentsResponse> ProvisionFapStudentsAsync(ProvisionFapStudentsRequest request, CancellationToken ct = default);

    /// <summary>
    /// Đồng bộ nhanh danh sách sinh viên FAP mẫu kỳ FA26 (1-click demo) để kiểm thử đầy đủ luồng cấp tài khoản + gửi email MailHog.
    /// </summary>
    Task<ProvisionFapStudentsResponse> ProvisionMockFapStudentsAsync(string semesterCode = "FA26", string subjectCode = "EXE101", CancellationToken ct = default);
}
