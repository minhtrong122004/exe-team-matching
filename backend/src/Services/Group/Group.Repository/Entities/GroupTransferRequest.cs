using Group.Repository.Enums;

namespace Group.Repository.Entities;

/// <summary>
/// Yêu cầu hoặc ghi nhận điều chuyển sinh viên giữa các nhóm sau chốt sổ (BR-35, BR-36, BR-37).
/// </summary>
public class GroupTransferRequest
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid SpaceId { get; set; }

    /// <summary>Sinh viên cần điều chuyển.</summary>
    public Guid RequesterStudentId { get; set; }
    public string RequesterStudentName { get; set; } = string.Empty;
    public string RequesterStudentCode { get; set; } = string.Empty;

    /// <summary>Nhóm nguồn của sinh viên trước khi chuyển.</summary>
    public Guid FromGroupId { get; set; }
    public string FromGroupCode { get; set; } = string.Empty;

    /// <summary>Nhóm đích chuyển tới.</summary>
    public Guid TargetGroupId { get; set; }
    public string TargetGroupCode { get; set; } = string.Empty;

    /// <summary>Sinh viên đối ứng trong trường hợp đổi chéo 2 người (Swap).</summary>
    public Guid? SwapWithStudentId { get; set; }
    public string? SwapWithStudentName { get; set; }
    public string? SwapWithStudentCode { get; set; }

    /// <summary>Lý do điều chuyển hoặc ghi chú nguyện vọng.</summary>
    public string Reason { get; set; } = string.Empty;

    /// <summary>Trạng thái yêu cầu: Pending, Approved, Rejected, Cancelled.</summary>
    public TransferRequestStatus Status { get; set; } = TransferRequestStatus.Pending;

    /// <summary>Thời gian gửi yêu cầu.</summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>Thời gian Moderator duyệt hoặc từ chối.</summary>
    public DateTime? DecidedAt { get; set; }

    /// <summary>ID của Moderator thực hiện xử lý hoặc điều chuyển trực tiếp.</summary>
    public Guid? DecidedByModeratorId { get; set; }

    /// <summary>Ghi chú của Moderator khi duyệt/từ chối.</summary>
    public string? DecisionReason { get; set; }

    // Navigation properties
    public CourseSpace? Space { get; set; }
    public GroupEntity? FromGroup { get; set; }
    public GroupEntity? TargetGroup { get; set; }
}

