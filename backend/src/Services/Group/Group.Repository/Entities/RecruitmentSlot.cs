namespace Group.Repository.Entities;

/// <summary>Vị trí nhóm đang tuyển, ví dụ "1 sinh viên SE biết React, .NET".</summary>
public class RecruitmentSlot
{
    public Guid Id { get; set; }
    public Guid GroupId { get; set; }

    /// <summary>SE | AI | IA | GD | MKT | IB | Other, null nếu không yêu cầu chuyên ngành.</summary>
    public string? RequiredMajor { get; set; }

    /// <summary>Tên kỹ năng yêu cầu (lưu dạng JSON).</summary>
    public List<string> RequiredSkills { get; set; } = [];

    public int Quantity { get; set; }
    public int Filled { get; set; }

    public bool IsOpen => Filled < Quantity;

    public GroupEntity Group { get; set; } = null!;
}
