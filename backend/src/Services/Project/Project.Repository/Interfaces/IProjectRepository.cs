using Exe.BuildingBlocks.Paging;
using Project.Repository.Entities;
using Project.Repository.Enums;

namespace Project.Repository.Interfaces;

/// <summary>
/// Hợp đồng Repository cho ProjectEntity.
/// Lớp Services dùng interface này, không bao giờ dùng DbContext trực tiếp.
/// </summary>
public interface IProjectRepository
{
    /// <summary>
    /// Lấy dự án có phân trang, lọc và sắp xếp.
    /// sortBy: title | domain | status | updatedAt | createdAt (mặc định).
    /// </summary>
    Task<PagedResult<ProjectEntity>> GetPagedAsync(
        string? search,
        ProjectDomain? domain,
        ProjectStatus? status,
        Guid? ownerId,
        string? sortBy,
        bool descending,
        int page,
        int pageSize,
        CancellationToken ct = default);

    /// <summary>Lấy dự án theo ID, bao gồm cả danh sách Tags (được EF Core track để cập nhật).</summary>
    Task<ProjectEntity?> GetByIdAsync(Guid id, CancellationToken ct = default);

    /// <summary>Thêm dự án mới vào database.</summary>
    Task AddAsync(ProjectEntity project, CancellationToken ct = default);

    /// <summary>Lưu thay đổi của dự án đã lấy bằng GetByIdAsync (entity đang được track).</summary>
    Task UpdateAsync(ProjectEntity project, CancellationToken ct = default);

    /// <summary>Xóa dự án và các tag liên quan (Cascade Delete).</summary>
    Task DeleteAsync(ProjectEntity project, CancellationToken ct = default);
}
