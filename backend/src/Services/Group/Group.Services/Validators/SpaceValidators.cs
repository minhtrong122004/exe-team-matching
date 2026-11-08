using FluentValidation;
using Group.Services.DTOs;

namespace Group.Services.Validators;

public class CreateCourseSpaceRequestValidator : AbstractValidator<CreateCourseSpaceRequest>
{
    public CreateCourseSpaceRequestValidator()
    {
        RuleFor(x => x.SemesterCode)
            .NotEmpty().WithMessage("Mã học kỳ không được để trống (vd: FA26).")
            .MaximumLength(20).WithMessage("Mã học kỳ không quá 20 ký tự.");

        RuleFor(x => x.SubjectCode)
            .NotEmpty().WithMessage("Mã môn học không được để trống (vd: EXE101, EXE201).")
            .MaximumLength(20).WithMessage("Mã môn học không quá 20 ký tự.");

        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Tên không gian môn học không được để trống.")
            .MaximumLength(100).WithMessage("Tên không gian không quá 100 ký tự.");

        RuleFor(x => x.MaxMembersPerGroup)
            .InclusiveBetween(4, 6).WithMessage("Sĩ số tối đa một nhóm phải từ 4 đến 6 thành viên (BR-02, mặc định 5).");

        RuleFor(x => x.BufferRatio)
            .InclusiveBetween(1.0m, 2.0m).WithMessage("Hệ số dự phòng phải từ 1.0 đến 2.0 (mặc định 1.2).");

        RuleFor(x => x.MaxConcurrentApplies)
            .InclusiveBetween(1, 5).WithMessage("Số lượng đơn ứng tuyển chờ xử lý cùng lúc phải từ 1 đến 5 (mặc định 3).");
    }
}

public class UpdateSpaceConfigRequestValidator : AbstractValidator<UpdateSpaceConfigRequest>
{
    public UpdateSpaceConfigRequestValidator()
    {
        RuleFor(x => x.MaxMembersPerGroup)
            .InclusiveBetween(4, 6).WithMessage("Sĩ số tối đa một nhóm phải từ 4 đến 6 thành viên (BR-02, mặc định 5).");

        RuleFor(x => x.BufferRatio)
            .InclusiveBetween(1.0m, 2.0m).WithMessage("Hệ số dự phòng phải từ 1.0 đến 2.0 (mặc định 1.2).");

        RuleFor(x => x.MaxConcurrentApplies)
            .InclusiveBetween(1, 5).WithMessage("Số lượng đơn ứng tuyển chờ xử lý cùng lúc phải từ 1 đến 5 (mặc định 3).");
    }
}

public class ImportFapStudentsRequestValidator : AbstractValidator<ImportFapStudentsRequest>
{
    public ImportFapStudentsRequestValidator()
    {
        RuleFor(x => x.Students)
            .NotEmpty().WithMessage("Danh sách sinh viên import từ FAP không được để trống.");
    }
}
