using User.Repository.Enums;

namespace User.Repository.Entities;

/// <summary>
/// Danh mục kỹ năng trong hệ thống (CLAUDE.md mục 6).
/// Tên kỹ năng là duy nhất (Unique Index), phục vụ chuẩn hóa và thuật toán Matching Service.
/// </summary>
public class Skill
{
    public Guid Id { get; set; }

    /// <summary>
    /// Tên kỹ năng chuẩn hóa (ví dụ: C#, React, Docker, Figma, Marketing Strategy). Duy nhất trong hệ thống.
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Nhóm kỹ năng: Technical | Design | Business | Marketing.
    /// </summary>
    public SkillCategory Category { get; set; }

    /// <summary>
    /// Mô tả chi tiết kỹ năng (tuỳ chọn).
    /// </summary>
    public string? Description { get; set; }

    /// <summary>
    /// Thời điểm tạo kỹ năng (UTC).
    /// </summary>
    public DateTime CreatedAt { get; set; }

    // ── Navigation Properties ──────────────────────────────────────────────────
    /// <summary>
    /// Danh sách liên kết người dùng sở hữu kỹ năng này.
    /// </summary>
    public ICollection<UserSkill> UserSkills { get; set; } = new List<UserSkill>();
}
