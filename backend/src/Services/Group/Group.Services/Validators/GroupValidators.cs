using FluentValidation;
using Group.Services.DTOs;

namespace Group.Services.Validators;

internal static class GroupRules
{
    public const int MinMembers = 4;
    public const int MaxMembers = 6;

    public static readonly string[] Majors = ["SE", "AI", "IA", "GD", "MKT", "IB", "Other"];

    public static bool IsValidMajor(string? major) =>
        string.IsNullOrWhiteSpace(major) || Majors.Contains(major.Trim(), StringComparer.OrdinalIgnoreCase);
}

public class CreateGroupRequestValidator : AbstractValidator<CreateGroupRequest>
{
    public CreateGroupRequestValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Description).MaximumLength(1000);
        RuleFor(x => x.ProjectId).NotEmpty();

        // BR-02
        RuleFor(x => x.MaxMembers)
            .InclusiveBetween(GroupRules.MinMembers, GroupRules.MaxMembers)
            .WithMessage($"Must be between {GroupRules.MinMembers} and {GroupRules.MaxMembers}.");

        RuleForEach(x => x.Slots).SetValidator(new SlotRequestValidator());

        // Trưởng nhóm chiếm 1 chỗ, nên tổng vị trí tuyển không vượt quá MaxMembers - 1.
        RuleFor(x => x.Slots)
            .Must((req, slots) => slots is null || slots.Sum(s => s.Quantity) <= req.MaxMembers - 1)
            .WithMessage("Total slot quantity must not exceed maxMembers - 1.");
    }
}

public class UpdateGroupRequestValidator : AbstractValidator<UpdateGroupRequest>
{
    public UpdateGroupRequestValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Description).MaximumLength(1000);

        // BR-02
        RuleFor(x => x.MaxMembers)
            .InclusiveBetween(GroupRules.MinMembers, GroupRules.MaxMembers)
            .WithMessage($"Must be between {GroupRules.MinMembers} and {GroupRules.MaxMembers}.");
    }
}

public class SlotRequestValidator : AbstractValidator<SlotRequest>
{
    public SlotRequestValidator()
    {
        RuleFor(x => x.RequiredMajor)
            .Must(GroupRules.IsValidMajor)
            .WithMessage($"Must be one of: {string.Join(", ", GroupRules.Majors)}.");

        RuleFor(x => x.RequiredSkills)
            .Must(s => s is null || s.Count <= 20).WithMessage("At most 20 skills.");
        RuleForEach(x => x.RequiredSkills).NotEmpty().MaximumLength(50);

        RuleFor(x => x.Quantity).InclusiveBetween(1, GroupRules.MaxMembers - 1);
    }
}

public class CreateJoinRequestRequestValidator : AbstractValidator<CreateJoinRequestRequest>
{
    public CreateJoinRequestRequestValidator()
    {
        RuleFor(x => x.Message).MaximumLength(1000);
    }
}

public class CreateInvitationRequestValidator : AbstractValidator<CreateInvitationRequest>
{
    public CreateInvitationRequestValidator()
    {
        RuleFor(x => x.StudentId).NotEmpty();
    }
}

public class TransferLeaderRequestValidator : AbstractValidator<TransferLeaderRequest>
{
    public TransferLeaderRequestValidator()
    {
        RuleFor(x => x.NewLeaderId).NotEmpty();
    }
}
