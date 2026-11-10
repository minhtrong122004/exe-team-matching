using FluentValidation;
using Group.Services.DTOs;

namespace Group.Services.Validators;

internal static class GroupRules
{
    public const int MaxMembers = 6;

    public static readonly string[] Majors = ["SE", "AI", "IA", "GD", "MKT", "IB", "Other"];

    public static bool IsValidMajor(string? major) =>
        string.IsNullOrWhiteSpace(major) || Majors.Contains(major.Trim(), StringComparer.OrdinalIgnoreCase);
}

public class UpdateGroupRequestValidator : AbstractValidator<UpdateGroupRequest>
{
    public UpdateGroupRequestValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Description).MaximumLength(1000);
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

public class TransferLeaderRequestValidator : AbstractValidator<TransferLeaderRequest>
{
    public TransferLeaderRequestValidator()
    {
        RuleFor(x => x.NewLeaderId).NotEmpty();
    }
}

public class RemoveMemberRequestValidator : AbstractValidator<RemoveMemberRequest>
{
    public RemoveMemberRequestValidator()
    {
        RuleFor(x => x.Reason)
            .NotEmpty().WithMessage("Lý do mời ra khỏi nhóm không được để trống.")
            .MinimumLength(10).WithMessage("Lý do mời ra khỏi nhóm phải có ít nhất 10 ký tự.")
            .MaximumLength(1000).WithMessage("Lý do không được vượt quá 1000 ký tự.");
    }
}
