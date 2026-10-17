using User.Repository.Enums;

namespace User.Repository.Entities;

/// <summary>
/// Hồ sơ người dùng thuộc quyền sở hữu của User Service (CLAUDE.md mục 6).
/// Khóa chính UserId dùng chung GUID với Account.Id từ Auth Service.
/// Các trường thông tin bổ sung (StudentCode, Campus, Major, Bio,...) đều là tuỳ chọn (nullable)
/// để hỗ trợ khởi tạo hồ sơ trống khi nhận sự kiện UserRegisteredEvent từ Auth Service.
/// </summary>
public class UserProfile
{
    /// <summary>
    /// Khóa chính (cùng GUID với Auth.Account.Id). Không tự tăng.
    /// </summary>
    public Guid UserId { get; set; }

    /// <summary>
    /// Địa chỉ email liên hệ (đồng bộ từ Auth Service).
    /// </summary>
    public string Email { get; set; } = string.Empty;

    /// <summary>
    /// Họ và tên hiển thị (có thể cập nhật độc lập với tên đăng ký ban đầu).
    /// </summary>
    public string FullName { get; set; } = string.Empty;

    /// <summary>
    /// Vai trò hệ thống của người dùng (Student, Lecturer, Admin) đồng bộ từ Auth Service.
    /// </summary>
    public string Role { get; set; } = "Student";

    /// <summary>
    /// Mã số sinh viên (ví dụ: SE170000) - tuỳ chọn đối với Giảng viên hoặc hồ sơ mới tạo.
    /// </summary>
    public string? StudentCode { get; set; }

    /// <summary>
    /// Cơ sở học tập / làm việc (ví dụ: TP. Hồ Chí Minh, Hà Nội, Đà Nẵng, Cần Thơ, Quy Nhơn).
    /// </summary>
    public string? Campus { get; set; }

    /// <summary>
    /// Chuyên ngành học (SE, AI, IA, GD, MKT, IB, Other) - tuỳ chọn.
    /// </summary>
    public Major? Major { get; set; }

    /// <summary>
    /// Tiểu sử giới thiệu ngắn về bản thân.
    /// </summary>
    public string? Bio { get; set; }

    /// <summary>
    /// Vai trò mong muốn trong nhóm khởi nghiệp EXE (ví dụ: Frontend Dev, Backend Dev, AI Engineer, UI/UX Designer, Team Leader).
    /// </summary>
    public string? DesiredRole { get; set; }

    /// <summary>
    /// Trạng thái tìm kiếm nhóm: LookingForTeam | InTeam | NotLooking.
    /// </summary>
    public UserAvailability Availability { get; set; } = UserAvailability.LookingForTeam;

    /// <summary>
    /// Danh sách các lĩnh vực dự án quan tâm (EdTech, FinTech, ECommerce, FnB, Health, Tourism, Other) lưu dạng chuỗi JSON hoặc phân cách.
    /// </summary>
    public string? Interests { get; set; }

    /// <summary>
    /// Thời điểm tạo hồ sơ (UTC).
    /// </summary>
    public DateTime CreatedAt { get; set; }

    /// <summary>
    /// Thời điểm cập nhật hồ sơ gần nhất (UTC).
    /// </summary>
    public DateTime UpdatedAt { get; set; }

    // ── Navigation Properties ──────────────────────────────────────────────────
    /// <summary>
    /// Danh sách kỹ năng và mức độ thành thạo của người dùng.
    /// </summary>
    public ICollection<UserSkill> Skills { get; set; } = new List<UserSkill>();
}
