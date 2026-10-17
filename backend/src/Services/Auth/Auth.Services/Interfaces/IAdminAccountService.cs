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
    /// Khởi tạo tài khoản Giảng viên (Lecturer) bởi Quản trị viên (Admin),
    /// kèm phát sinh sự kiện UserRegisteredEvent ghi nhận nguyên tử qua Transactional Outbox.
    /// </summary>
    Task<AccountResponse> CreateLecturerAsync(CreateLecturerRequest request, CancellationToken ct = default);
}
