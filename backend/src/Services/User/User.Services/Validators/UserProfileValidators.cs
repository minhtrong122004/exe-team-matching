using FluentValidation;
using User.Services.DTOs;

namespace User.Services.Validators;

public class UpdateUserProfileRequestValidator : AbstractValidator<UpdateUserProfileRequest>
{
    public UpdateUserProfileRequestValidator()
    {
        RuleFor(x => x.FullName)
            .NotEmpty().WithMessage("Họ và tên không được để trống.")
            .MaximumLength(100).WithMessage("Họ và tên không được vượt quá 100 ký tự.");

        RuleFor(x => x.StudentCode)
            .MaximumLength(20).WithMessage("Mã số sinh viên không được vượt quá 20 ký tự.")
            .Matches("^[a-zA-Z0-9]+$")
            .When(x => !string.IsNullOrWhiteSpace(x.StudentCode))
            .WithMessage("Mã số sinh viên chỉ được chứa chữ cái và số.");

        RuleFor(x => x.Campus)
            .MaximumLength(50).WithMessage("Cơ sở học tập không được vượt quá 50 ký tự.");

        RuleFor(x => x.Bio)
            .MaximumLength(1000).WithMessage("Tiểu sử không được vượt quá 1000 ký tự.");

        RuleFor(x => x.DesiredRole)
            .MaximumLength(100).WithMessage("Vai trò mong muốn không được vượt quá 100 ký tự.");

        RuleFor(x => x.Availability)
            .IsInEnum().WithMessage("Trạng thái tìm nhóm không hợp lệ.");

        RuleFor(x => x.Major)
            .IsInEnum()
            .When(x => x.Major.HasValue)
            .WithMessage("Chuyên ngành không hợp lệ.");

        RuleFor(x => x.Interests)
            .Must(list => list == null || list.Count <= 20)
            .WithMessage("Danh sách lĩnh vực quan tâm không được vượt quá 20 mục.");

        RuleForEach(x => x.Interests)
            .MaximumLength(50).WithMessage("Mỗi lĩnh vực quan tâm không được vượt quá 50 ký tự.");
    }
}

public class CreateUserProfileInternalRequestValidator : AbstractValidator<CreateUserProfileInternalRequest>
{
    public CreateUserProfileInternalRequestValidator()
    {
        RuleFor(x => x.UserId)
            .NotEmpty().WithMessage("UserId không được để trống.");

        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("Email không được để trống.")
            .EmailAddress().WithMessage("Địa chỉ email không hợp lệ.")
            .MaximumLength(256).WithMessage("Email không được vượt quá 256 ký tự.");

        RuleFor(x => x.FullName)
            .NotEmpty().WithMessage("Họ và tên không được để trống.")
            .MaximumLength(100).WithMessage("Họ và tên không được vượt quá 100 ký tự.");

        RuleFor(x => x.Role)
            .NotEmpty().WithMessage("Vai trò không được để trống.")
            .MaximumLength(50).WithMessage("Vai trò không được vượt quá 50 ký tự.");
    }
}

public class BatchUsersRequestValidator : AbstractValidator<BatchUsersRequest>
{
    public BatchUsersRequestValidator()
    {
        RuleFor(x => x.UserIds)
            .NotNull().WithMessage("Danh sách UserIds không được null.")
            .Must(ids => ids != null && ids.Count <= 100).WithMessage("Không thể truy vấn quá 100 hồ sơ cùng lúc.");

        RuleForEach(x => x.UserIds)
            .NotEmpty().WithMessage("UserId không được rỗng.");
    }
}
