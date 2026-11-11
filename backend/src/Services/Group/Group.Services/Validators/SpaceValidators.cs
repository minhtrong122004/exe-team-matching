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
            .InclusiveBetween(4, 6).WithMessage("Sĩ số tối đa một nhóm phải từ 4 đến 6 thành viên (mặc định 5).");

        RuleFor(x => x.BufferRatio)
            .InclusiveBetween(1.0m, 2.0m).WithMessage("Hệ số dự phòng phải từ 1.0 đến 2.0 (mặc định 1.2).");

        RuleFor(x => x.MaxConcurrentApplies)
            .InclusiveBetween(1, 5).WithMessage("Số lượng đơn ứng tuyển chờ xử lý cùng lúc phải từ 1 đến 5 (mặc định 3).");

        RuleFor(x => x.RegistrationDeadline)
            .NotNull().WithMessage("Hạn chót đăng ký học phần là bắt buộc.")
            .GreaterThan(DateTime.UtcNow).WithMessage("Hạn chót đăng ký phải lớn hơn thời điểm hiện tại.");
    }
}

public class UpdateSpaceConfigRequestValidator : AbstractValidator<UpdateSpaceConfigRequest>
{
    public UpdateSpaceConfigRequestValidator()
    {
        RuleFor(x => x.MaxMembersPerGroup)
            .InclusiveBetween(4, 6).WithMessage("Sĩ số tối đa một nhóm phải từ 4 đến 6 thành viên (mặc định 5).");

        RuleFor(x => x.BufferRatio)
            .InclusiveBetween(1.0m, 2.0m).WithMessage("Hệ số dự phòng phải từ 1.0 đến 2.0 (mặc định 1.2).");

        RuleFor(x => x.MaxConcurrentApplies)
            .InclusiveBetween(1, 5).WithMessage("Số lượng đơn ứng tuyển chờ xử lý cùng lúc phải từ 1 đến 5 (mặc định 3).");

        RuleFor(x => x.RegistrationDeadline)
            .NotEmpty().WithMessage("Hạn chót đăng ký học phần là bắt buộc.");

        RuleFor(x => x.Name)
            .MaximumLength(200).WithMessage("Tên Không gian học phần không được vượt quá 200 ký tự.")
            .When(x => !string.IsNullOrEmpty(x.Name));
    }
}

public class ImportFapStudentsRequestValidator : AbstractValidator<ImportFapStudentsRequest>
{
    public ImportFapStudentsRequestValidator()
    {
        RuleFor(x => x.Students)
            .NotEmpty().WithMessage("Danh sách sinh viên import từ FAP không được để trống.");

        // Chặn ngay tại đây để báo đúng trường sai, thay vì để Auth từ chối rồi chỉ báo lỗi cấp tài khoản chung chung.
        RuleForEach(x => x.Students).ChildRules(student =>
        {
            student.RuleFor(s => s.StudentCode).NotEmpty().WithMessage("Mã số sinh viên (MSSV) không được để trống.");
            student.RuleFor(s => s.FullName).NotEmpty().WithMessage("Họ và tên sinh viên không được để trống.");
            student.RuleFor(s => s.Major).NotEmpty().WithMessage("Ngành của sinh viên không được để trống.");
            student.RuleFor(s => s.Email)
                .NotEmpty().WithMessage("Email sinh viên không được để trống.")
                .EmailAddress().WithMessage("Định dạng email sinh viên không hợp lệ.");
        });
    }
}
