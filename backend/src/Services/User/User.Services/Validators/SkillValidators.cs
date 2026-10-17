using FluentValidation;
using User.Services.DTOs;

namespace User.Services.Validators;

public class CreateSkillRequestValidator : AbstractValidator<CreateSkillRequest>
{
    public CreateSkillRequestValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Tên kỹ năng không được để trống.")
            .MaximumLength(100).WithMessage("Tên kỹ năng không được vượt quá 100 ký tự.");

        RuleFor(x => x.Category)
            .IsInEnum().WithMessage("Nhóm kỹ năng không hợp lệ (phải là Technical, Design, Business, hoặc Marketing).");

        RuleFor(x => x.Description)
            .MaximumLength(500).WithMessage("Mô tả kỹ năng không được vượt quá 500 ký tự.");
    }
}

public class AddUserSkillRequestValidator : AbstractValidator<AddUserSkillRequest>
{
    public AddUserSkillRequestValidator()
    {
        RuleFor(x => x.SkillId)
            .NotEmpty().WithMessage("SkillId không được để trống.");

        RuleFor(x => x.Level)
            .InclusiveBetween(1, 5).WithMessage("Cấp độ kỹ năng phải nằm trong khoảng từ 1 (Beginner) đến 5 (Expert).");
    }
}

public class UpdateUserSkillProficiencyRequestValidator : AbstractValidator<UpdateUserSkillProficiencyRequest>
{
    public UpdateUserSkillProficiencyRequestValidator()
    {
        RuleFor(x => x.Level)
            .InclusiveBetween(1, 5).WithMessage("Cấp độ kỹ năng phải nằm trong khoảng từ 1 (Beginner) đến 5 (Expert).");
    }
}

public class UserSkillItemRequestValidator : AbstractValidator<UserSkillItemRequest>
{
    public UserSkillItemRequestValidator()
    {
        RuleFor(x => x.SkillId)
            .NotEmpty().WithMessage("SkillId không được để trống.");

        RuleFor(x => x.Level)
            .InclusiveBetween(1, 5).WithMessage("Cấp độ kỹ năng phải nằm trong khoảng từ 1 (Beginner) đến 5 (Expert).");
    }
}

public class BatchSetUserSkillsRequestValidator : AbstractValidator<BatchSetUserSkillsRequest>
{
    public BatchSetUserSkillsRequestValidator()
    {
        RuleFor(x => x.Skills)
            .NotNull().WithMessage("Danh sách kỹ năng không được null.")
            .Must(skills => skills == null || skills.Select(s => s.SkillId).Distinct().Count() == skills.Count)
            .WithMessage("Danh sách kỹ năng không được chứa các SkillId trùng lặp.");

        RuleForEach(x => x.Skills)
            .SetValidator(new UserSkillItemRequestValidator());
    }
}
