namespace User.Repository.Entities;

/// <summary>
/// Bảng quan hệ N-N giữa UserProfile và Skill, kèm cấp độ thành thạo (CLAUDE.md mục 6).
/// Khóa chính phức hợp gồm (UserId, SkillId).
/// </summary>
public class UserSkill
{
    /// <summary>
    /// ID hồ sơ người dùng (khóa ngoại trỏ đến UserProfile.UserId trong ExeUserDb).
    /// </summary>
    public Guid UserId { get; set; }

    /// <summary>
    /// ID kỹ năng (khóa ngoại trỏ đến Skill.Id trong ExeUserDb).
    /// </summary>
    public Guid SkillId { get; set; }

    /// <summary>
    /// Mức độ thành thạo kỹ năng từ 1 (Beginner) đến 5 (Expert). Mặc định là 1.
    /// </summary>
    public int Level { get; set; } = 1;

    /// <summary>
    /// Thời điểm gán kỹ năng (UTC).
    /// </summary>
    public DateTime CreatedAt { get; set; }

    // ── Navigation Properties ──────────────────────────────────────────────────
    public UserProfile User { get; set; } = null!;
    public Skill Skill { get; set; } = null!;
}
