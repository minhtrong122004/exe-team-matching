using FluentValidation;
using Project.Services.DTOs;

namespace Project.Services.Validators;

/// <summary>Kiểm tra hợp lệ khi tạo ý tưởng dự án mới.</summary>
public class CreateProjectRequestValidator : AbstractValidator<CreateProjectRequest>
{
    public CreateProjectRequestValidator()
    {
        RuleFor(x => x.Title)
            .NotEmpty().WithMessage("Tên dự án không được để trống.")
            .MaximumLength(200).WithMessage("Tên dự án tối đa 200 ký tự.");

        RuleFor(x => x.Problem)
            .NotEmpty().WithMessage("Mô tả vấn đề không được để trống.")
            .MaximumLength(2000).WithMessage("Mô tả vấn đề tối đa 2000 ký tự.");

        RuleFor(x => x.Solution)
            .NotEmpty().WithMessage("Mô tả giải pháp không được để trống.")
            .MaximumLength(2000).WithMessage("Mô tả giải pháp tối đa 2000 ký tự.");

        RuleFor(x => x.Domain)
            .IsInEnum().WithMessage("Lĩnh vực dự án không hợp lệ.");

        RuleForEach(x => x.Tags)
            .MaximumLength(100).WithMessage("Mỗi tag tối đa 100 ký tự.")
            .When(x => x.Tags != null && x.Tags.Count > 0);

        RuleFor(x => x.Tags)
            .Must(tags => tags == null || tags.Count <= 10)
            .WithMessage("Dự án tối đa 10 tag.");
    }
}

/// <summary>Kiểm tra hợp lệ khi cập nhật ý tưởng dự án.</summary>
public class UpdateProjectRequestValidator : AbstractValidator<UpdateProjectRequest>
{
    public UpdateProjectRequestValidator()
    {
        RuleFor(x => x.Title)
            .NotEmpty().WithMessage("Tên dự án không được để trống.")
            .MaximumLength(200).WithMessage("Tên dự án tối đa 200 ký tự.");

        RuleFor(x => x.Problem)
            .NotEmpty().WithMessage("Mô tả vấn đề không được để trống.")
            .MaximumLength(2000).WithMessage("Mô tả vấn đề tối đa 2000 ký tự.");

        RuleFor(x => x.Solution)
            .NotEmpty().WithMessage("Mô tả giải pháp không được để trống.")
            .MaximumLength(2000).WithMessage("Mô tả giải pháp tối đa 2000 ký tự.");

        RuleFor(x => x.Domain)
            .IsInEnum().WithMessage("Lĩnh vực dự án không hợp lệ.");

        RuleFor(x => x.Status)
            .IsInEnum().WithMessage("Trạng thái dự án không hợp lệ.");

        RuleForEach(x => x.Tags)
            .MaximumLength(100).WithMessage("Mỗi tag tối đa 100 ký tự.")
            .When(x => x.Tags != null && x.Tags.Count > 0);

        RuleFor(x => x.Tags)
            .Must(tags => tags == null || tags.Count <= 10)
            .WithMessage("Dự án tối đa 10 tag.");
    }
}
