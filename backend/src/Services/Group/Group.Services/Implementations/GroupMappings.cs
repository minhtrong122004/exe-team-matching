using Group.Repository.Entities;
using Group.Repository.Enums;
using Group.Services.DTOs;
using Group.Services.Validators;

namespace Group.Services.Implementations;

/// <summary>Map entity → DTO thủ công (không dùng AutoMapper).</summary>
internal static class GroupMappings
{
    public static GroupSummaryResponse ToSummary(this GroupEntity g)
    {
        var openSlots = g.Slots.Where(s => s.IsOpen).ToList();
        return new GroupSummaryResponse(
            Id:            g.Id,
            Name:          g.Name,
            Description:   g.Description,
            LeaderId:      g.LeaderId,
            LeaderName:    g.LeaderName(),
            ProjectId:     g.ProjectId,
            ProjectDomain: g.ProjectDomain ?? "General",
            MemberCount:   g.Members.Count,
            MaxMembers:    g.MaxMembers,
            Status:        g.Status.ToString(),
            OpenMajors:    openSlots.Where(s => s.RequiredMajor != null).Select(s => s.RequiredMajor!).Distinct().ToList(),
            OpenSkills:    openSlots.SelectMany(s => s.RequiredSkills).Distinct(StringComparer.OrdinalIgnoreCase).ToList(),
            CreatedAt:     g.CreatedAt,
            SpaceId:       g.SpaceId,
            RoomCode:      g.RoomCode,
            IsClosedByLeader: g.IsClosedByLeader);
    }

    /// <param name="hideMembers">BR-13: nhóm đã đóng thì ẩn thành viên và Leader với sinh viên ngoài nhóm.</param>
    public static GroupDetailResponse ToDetail(this GroupEntity g, bool hideMembers = false) => new(
        Id:            g.Id,
        Name:          g.Name,
        Description:   g.Description,
        LeaderId:      hideMembers ? null : g.LeaderId,
        LeaderName:    hideMembers ? string.Empty : g.LeaderName(),
        ProjectId:     g.ProjectId,
        ProjectDomain: g.ProjectDomain ?? "General",
        MemberCount:   g.Members.Count,
        MaxMembers:    g.MaxMembers,
        Status:        g.Status.ToString(),
        Members:       hideMembers ? [] : g.Members
                           .OrderBy(m => m.Role == MemberRole.Leader ? 0 : 1)
                           .ThenBy(m => m.JoinedAt)
                           .Select(m => new MemberResponse(
                               m.UserId,
                               m.FullName,
                               m.Role.ToString(),
                               m.SlotId,
                               m.JoinedAt,
                               m.Email,
                               !string.IsNullOrWhiteSpace(m.Email) && m.Email.Contains('@')
                                   ? m.Email.Split('@')[0].ToUpper()
                                   : null))
                           .ToList(),
        Slots:         g.Slots.Select(ToResponse).ToList(),
        CreatedAt:     g.CreatedAt,
        UpdatedAt:     g.UpdatedAt,
        SpaceId:       g.SpaceId,
        RoomCode:      g.RoomCode,
        IsClosedByLeader: g.IsClosedByLeader);

    public static SlotResponse ToResponse(this RecruitmentSlot s) =>
        new(s.Id, s.RequiredMajor, s.RequiredSkills, s.Quantity, s.Filled);

    public static JoinRequestResponse ToResponse(this JoinRequest r)
    {
        var distinctVotes = r.Votes?.DistinctBy(v => v.VoterId).ToList() ?? [];
        var upvotes = distinctVotes.Count(v => v.IsUpvote);
        var downvotes = distinctVotes.Count(v => !v.IsUpvote);
        var votes = distinctVotes.Select(v => new ApplicationVoteResponse(
            v.VoterId,
            v.VoterName,
            v.IsUpvote,
            v.Comment,
            v.VotedAt
        )).ToList();

        return new JoinRequestResponse(
            Id:          r.Id,
            GroupId:     r.GroupId,
            GroupName:   r.Group?.Name ?? string.Empty,
            SlotId:      r.SlotId,
            StudentId:   r.StudentId,
            StudentName: r.StudentName,
            Message:     r.Message,
            Status:      r.Status.ToString(),
            CreatedAt:   r.CreatedAt,
            DecidedAt:   r.DecidedAt,
            Upvotes:     upvotes,
            Downvotes:   downvotes,
            Votes:       votes);
    }

    public static GroupMember? Leader(this GroupEntity g) => g.Members.FirstOrDefault(m => m.UserId == g.LeaderId);

    private static string LeaderName(this GroupEntity g) => g.Leader()?.FullName ?? string.Empty;

    /// <summary>Áp dữ liệu request vào slot (chuẩn hóa chuyên ngành và kỹ năng).</summary>
    public static void Apply(this RecruitmentSlot slot, SlotRequest request)
    {
        slot.RequiredMajor = NormalizeMajor(request.RequiredMajor);
        slot.RequiredSkills = (request.RequiredSkills ?? [])
            .Where(s => !string.IsNullOrWhiteSpace(s))
            .Select(s => s.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();
        slot.Quantity = request.Quantity;
    }

    /// <summary>"se" → "SE"; rỗng → null.</summary>
    public static string? NormalizeMajor(string? major) =>
        string.IsNullOrWhiteSpace(major)
            ? null
            : GroupRules.Majors.First(m => string.Equals(m, major.Trim(), StringComparison.OrdinalIgnoreCase));
}
