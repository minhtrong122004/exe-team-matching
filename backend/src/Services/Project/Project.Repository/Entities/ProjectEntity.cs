using Project.Repository.Enums;

namespace Project.Repository.Entities;

/// <summary>
/// Ý tưởng dự án khởi nghiệp EXE của sinh viên.
/// Một dự án chỉ được gắn với tối đa một nhóm (Group Service kiểm tra).
/// OwnerId là ID từ Auth Service (cùng GUID trên toàn hệ thống).
/// </summary>
public class ProjectEntity
{
    public Guid Id { get; set; }

    /// <summary>ID của sinh viên tạo ra ý tưởng dự án này (từ JWT claim 'sub').</summary>
    public Guid OwnerId { get; set; }

    public string Title { get; set; } = string.Empty;

    /// <summary>Mô tả vấn đề thực tế mà dự án giải quyết.</summary>
    public string Problem { get; set; } = string.Empty;

    /// <summary>Giải pháp mà dự án đề xuất.</summary>
    public string Solution { get; set; } = string.Empty;

    public ProjectDomain Domain { get; set; }

    public ProjectStatus Status { get; set; } = ProjectStatus.Draft;

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    // ── Navigation ────────────────────────────────────────────────────────────
    /// <summary>Danh sách tag (từ khoá) mô tả thêm cho dự án.</summary>
    public ICollection<ProjectTag> Tags { get; set; } = new List<ProjectTag>();
}
