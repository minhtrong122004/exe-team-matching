namespace Project.Repository.Entities;

/// <summary>
/// Tag / từ khoá bổ sung cho ý tưởng dự án.
/// Quan hệ N:1 với ProjectEntity (một dự án có nhiều tag).
/// Không có bảng riêng cho Tag toàn hệ thống — mỗi tag là một hàng gắn với ProjectId.
/// </summary>
public class ProjectTag
{
    public Guid ProjectId { get; set; }

    public string Tag { get; set; } = string.Empty;

    // ── Navigation ────────────────────────────────────────────────────────────
    public ProjectEntity Project { get; set; } = null!;
}
