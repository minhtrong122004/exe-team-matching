namespace Group.Services.Clients;

/// <summary>Gọi Project Service qua REST: kiểm tra chủ dự án (BR-11) và lấy lĩnh vực dự án cho Matching.</summary>
public interface IProjectClient
{
    /// <summary>GET /api/projects/{id}; null nếu không tồn tại.</summary>
    Task<ProjectDto?> GetProjectAsync(Guid projectId, CancellationToken ct = default);
}

/// <summary>Phần dữ liệu dự án Group cần (khớp ProjectResponse của Project Service).</summary>
public sealed record ProjectDto(Guid Id, Guid OwnerId, string Title, string Domain, string Status);
