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
    /// Khóa sinh viên (ví dụ: K17, K18, K19) - bóc tách tự động từ Mã số sinh viên (BR-04).
    /// </summary>
    public string? Cohort { get; set; }

    // ── 5 Chỉ số kỹ năng cốt lõi (0–100) theo chuẩn BR-05 ───────────────────
    /// <summary>
    /// Điểm kỹ năng Công nghệ & Lập trình (Tech Score, 0–100).
    /// </summary>
    public int TechScore { get; set; } = 0;

    /// <summary>
    /// Điểm kỹ năng Quản trị dự án & Teamwork (Management Score, 0–100).
    /// </summary>
    public int ManagementScore { get; set; } = 0;

    /// <summary>
    /// Điểm kỹ năng Thiết kế đồ họa & UI/UX (Graphic Design Score, 0–100).
    /// </summary>
    public int GraphicDesignScore { get; set; } = 0;

    /// <summary>
    /// Điểm kỹ năng Tiếp thị số & Truyền thông (Marketing Score, 0–100).
    /// </summary>
    public int MarketingScore { get; set; } = 0;

    /// <summary>
    /// Điểm kỹ năng Bán hàng & Đàm phán (Sale Score, 0–100).
    /// </summary>
    public int SaleScore { get; set; } = 0;

    // ── Cam kết & Hoàn thành hồ sơ theo BR-06, BR-07 ────────────────────────
    /// <summary>
    /// Đánh dấu sinh viên đã cam kết chịu trách nhiệm với thông tin kỹ năng đã khai báo (BR-06).
    /// </summary>
    public bool IsCommitted { get; set; } = false;

    /// <summary>
    /// Thời điểm sinh viên bấm cam kết kỹ năng (UTC).
    /// </summary>
    public DateTime? CommittedAt { get; set; }

    /// <summary>
    /// Trạng thái hoàn thành hồ sơ (true khi đã khai báo điểm kỹ năng và IsCommitted == true) (BR-07).
    /// Sinh viên bắt buộc phải có IsProfileCompleted = true mới đủ điều kiện vào Room hoặc nộp đơn Apply.
    /// </summary>
    public bool IsProfileCompleted { get; set; } = false;

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
