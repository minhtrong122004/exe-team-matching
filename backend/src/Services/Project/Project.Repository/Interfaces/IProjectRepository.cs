using Project.Repository.Entities;
using Project.Repository.Enums;

namespace Project.Repository.Interfaces;

/// <summary>
/// Hợp đồng Repository cho ProjectEntity.
/// Lớp Services dùng interface này, không bao giờ dùng DbContext trực tiếp.
/// </summary>
public interface IProjectRepository
{
    /// <summary>Lấy toàn bộ dự án có phân trang, lọc và sắp xếp.</summary>
    Task<(IEnumerable<ProjectEntity> Items, int TotalCount)> GetPagedAsync(
        string? search,
        ProjectDomain? domain,
        ProjectStatus? status,
        Guid? ownerId,
        string sortBy,
        bool ascending,
        int page,
        int pageSize,
        CancellationToken ct = default);

    /// <summary>Lấy dự án theo ID, bao gồm cả danh sách Tags.</summary>
    Task<ProjectEntity?> GetByIdAsync(Guid id, CancellationToken ct = default);

    /// <summary>Thêm dự án mới vào database.</summary>
    Task AddAsync(ProjectEntity project, CancellationToken ct = default);

    /// <summary>Cập nhật thông tin dự án (entity đã được track bởi EF Core).</summary>
    Task UpdateAsync(ProjectEntity project, CancellationToken ct = default);

    /// <summary>Xóa dự án và các tag liên quan (Cascade Delete).</summary>
    Task DeleteAsync(ProjectEntity project, CancellationToken ct = default);
}
