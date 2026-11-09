using Auth.Services.DTOs;
using FluentValidation;

namespace Auth.Services.Validators;

public class CreateLecturerRequestValidator : AbstractValidator<CreateLecturerRequest>
{
    public CreateLecturerRequestValidator()
    {
        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("Email không được để trống.")
            .EmailAddress().WithMessage("Định dạng email không hợp lệ.")
            .MaximumLength(256).WithMessage("Email không được vượt quá 256 ký tự.");

        RuleFor(x => x.FullName)
            .NotEmpty().WithMessage("Họ và tên không được để trống.")
            .MinimumLength(2).WithMessage("Họ và tên phải có ít nhất 2 ký tự.")
            .MaximumLength(100).WithMessage("Họ và tên không được vượt quá 100 ký tự.");

        RuleFor(x => x.Role)
            .Must(role => string.IsNullOrWhiteSpace(role) ||
                          role.Trim().Equals("Lecturer", StringComparison.OrdinalIgnoreCase) ||
                          role.Trim().Equals("Moderator", StringComparison.OrdinalIgnoreCase))
            .WithMessage("Vai trò khởi tạo chỉ cho phép 'Lecturer' hoặc 'Moderator'.");
    }
}

public class ProvisionFapStudentsRequestValidator : AbstractValidator<ProvisionFapStudentsRequest>
{
    public ProvisionFapStudentsRequestValidator()
    {
        RuleFor(x => x.Students)
            .NotEmpty().WithMessage("Danh sách sinh viên FAP không được để trống.");

        RuleFor(x => x.SemesterCode)
            .NotEmpty().WithMessage("Mã học kỳ không được để trống.")
            .MaximumLength(20).WithMessage("Mã học kỳ không vượt quá 20 ký tự.");

        RuleFor(x => x.SubjectCode)
            .NotEmpty().WithMessage("Mã môn học không được để trống.")
            .MaximumLength(20).WithMessage("Mã môn học không vượt quá 20 ký tự.");

        RuleForEach(x => x.Students).ChildRules(student =>
        {
            student.RuleFor(s => s.StudentCode)
                .NotEmpty().WithMessage("Mã số sinh viên (MSSV) không được để trống.")
                .MaximumLength(32).WithMessage("MSSV không được vượt quá 32 ký tự.");

            student.RuleFor(s => s.FullName)
                .NotEmpty().WithMessage("Họ và tên sinh viên không được để trống.")
                .MaximumLength(100).WithMessage("Họ và tên không được vượt quá 100 ký tự.");

            student.RuleFor(s => s.Email)
                .NotEmpty().WithMessage("Email sinh viên không được để trống.")
                .EmailAddress().WithMessage("Định dạng email sinh viên không hợp lệ.")
                .MaximumLength(256).WithMessage("Email không được vượt quá 256 ký tự.");
        });
    }
}

public class GoogleLoginRequestValidator : AbstractValidator<GoogleLoginRequest>
{
    public GoogleLoginRequestValidator()
    {
        RuleFor(x => x.IdToken)
            .NotEmpty().WithMessage("Thiếu Google ID token.");
    }
}

public class RefreshTokenRequestValidator : AbstractValidator<RefreshTokenRequest>
{
    public RefreshTokenRequestValidator()
    {
        RuleFor(x => x.RefreshToken)
            .NotEmpty().WithMessage("Refresh token không được để trống.");
    }
}

public class LogoutRequestValidator : AbstractValidator<LogoutRequest>
{
    public LogoutRequestValidator()
    {
        RuleFor(x => x.RefreshToken)
            .NotEmpty().WithMessage("Refresh token không được để trống.");
    }
}
