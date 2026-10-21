namespace Group.Services.Options;

/// <summary>Cấu hình nghiệp vụ của Group Service, bind từ section "Group".</summary>
public sealed class GroupOptions
{
    public const string SectionName = "Group";

    /// <summary>Số ngày lời mời còn hiệu lực.</summary>
    public int InvitationExpiryDays { get; set; } = 7;

    /// <summary>Chu kỳ chạy InvitationExpiryJob (BR-10: mỗi 10 phút).</summary>
    public int InvitationExpiryJobIntervalMinutes { get; set; } = 10;

    /// <summary>BR-03: số yêu cầu Pending tối đa của một sinh viên.</summary>
    public int MaxPendingJoinRequests { get; set; } = 5;
}
