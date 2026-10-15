using Exe.BuildingBlocks.Paging;
using Project.Services.DTOs;

namespace Project.Services.Interfaces;

/// <summary>
/// Hợp đồng Service cho Project.
/// Controller gọi interface này, không bao giờ gọi Repository trực tiếp.
/// Người dùng hiện tại lấy qua ICurrentUser (BuildingBlocks), không truyền từ controller.
/// </summary>
public interface IProjectService
{
    /// <summary>Lấy danh sách dự án có phân trang, lọc và sắp xếp.</summary>
    Task<PagedResult<ProjectSummaryResponse>> GetProjectsAsync(ProjectQuery query, CancellationToken ct = default);

    /// <summary>
    /// Lấy chi tiết một dự án theo ID.
    /// Ném NotFoundException nếu không tìm thấy.
    /// </summary>
    Task<ProjectResponse> GetProjectByIdAsync(Guid id, CancellationToken ct = default);

    /// <summary>
    /// Tạo ý tưởng dự án mới. OwnerId là người đang đăng nhập.
    /// Ném ValidationException nếu dữ liệu không hợp lệ.
    /// </summary>
    Task<ProjectResponse> CreateProjectAsync(CreateProjectRequest request, CancellationToken ct = default);

    /// <summary>
    /// Cập nhật thông tin dự án.
    /// Ném ValidationException, NotFoundException, hoặc ForbiddenException nếu không phải chủ dự án.
    /// </summary>
    Task<ProjectResponse> UpdateProjectAsync(Guid id, UpdateProjectRequest request, CancellationToken ct = default);

    /// <summary>
    /// Xóa ý tưởng dự án (Cascade xóa luôn Tags).
    /// Ném NotFoundException, hoặc ForbiddenException nếu không phải chủ dự án.
    /// </summary>
    Task DeleteProjectAsync(Guid id, CancellationToken ct = default);
}
