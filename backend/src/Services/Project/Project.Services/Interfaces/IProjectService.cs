using Project.Services.DTOs;

namespace Project.Services.Interfaces;

/// <summary>
/// Hợp đồng Service cho Project.
/// Controller gọi interface này, không bao giờ gọi Repository trực tiếp.
/// </summary>
public interface IProjectService
{
    /// <summary>
    /// Lấy danh sách dự án có phân trang, lọc và sắp xếp.
    /// Bất kỳ ai cũng có thể gọi (không cần đăng nhập — tùy chính sách).
    /// </summary>
    Task<PagedProjectResponse> GetProjectsAsync(GetProjectsQuery query, CancellationToken ct = default);

    /// <summary>
    /// Lấy chi tiết một dự án theo ID.
    /// Ném NotFoundException nếu không tìm thấy.
    /// </summary>
    Task<ProjectResponse> GetProjectByIdAsync(Guid id, CancellationToken ct = default);

    /// <summary>
    /// Tạo ý tưởng dự án mới.
    /// OwnerId được gán tự động từ JWT (currentUserId).
    /// </summary>
    Task<ProjectResponse> CreateProjectAsync(CreateProjectRequest request, Guid currentUserId, CancellationToken ct = default);

    /// <summary>
    /// Cập nhật thông tin dự án.
    /// Ném NotFoundException nếu không tìm thấy.
    /// Ném ForbiddenException nếu currentUserId không phải là OwnerId.
    /// </summary>
    Task<ProjectResponse> UpdateProjectAsync(Guid id, UpdateProjectRequest request, Guid currentUserId, CancellationToken ct = default);

    /// <summary>
    /// Xóa ý tưởng dự án (Cascade xóa luôn Tags).
    /// Ném NotFoundException nếu không tìm thấy.
    /// Ném ForbiddenException nếu currentUserId không phải là OwnerId.
    /// </summary>
    Task DeleteProjectAsync(Guid id, Guid currentUserId, CancellationToken ct = default);
}
