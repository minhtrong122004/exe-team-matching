namespace Group.Services.Options;

/// <summary>Cấu hình nghiệp vụ của Group Service, bind từ section "Group".</summary>
public sealed class GroupOptions
{
    public const string SectionName = "Group";

    /// <summary>BR-03: số yêu cầu Pending tối đa của một sinh viên.</summary>
    public int MaxPendingJoinRequests { get; set; } = 5;
}
