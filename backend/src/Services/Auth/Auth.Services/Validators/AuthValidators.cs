using Auth.Services.DTOs;
using FluentValidation;

namespace Auth.Services.Validators;

public class RegisterRequestValidator : AbstractValidator<RegisterRequest>
{
    public RegisterRequestValidator()
    {
        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("Email không được để trống.")
            .EmailAddress().WithMessage("Định dạng email không hợp lệ.")
            .MaximumLength(256).WithMessage("Email không được vượt quá 256 ký tự.");

        RuleFor(x => x.FullName)
            .NotEmpty().WithMessage("Họ và tên không được để trống.")
            .MinimumLength(2).WithMessage("Họ và tên phải có ít nhất 2 ký tự.")
            .MaximumLength(100).WithMessage("Họ và tên không được vượt quá 100 ký tự.");

        RuleFor(x => x.Password)
            .NotEmpty().WithMessage("Mật khẩu không được để trống.")
            .MinimumLength(8).WithMessage("Mật khẩu phải có ít nhất 8 ký tự.")
            .Matches(@"[A-Z]").WithMessage("Mật khẩu phải chứa ít nhất một chữ hoa.")
            .Matches(@"[0-9]").WithMessage("Mật khẩu phải chứa ít nhất một chữ số.")
            .Matches(@"[^a-zA-Z0-9]").WithMessage("Mật khẩu phải chứa ít nhất một ký tự đặc biệt.");

        RuleFor(x => x.Role)
            .Must(role => string.IsNullOrWhiteSpace(role) || role.Trim().Equals("Student", StringComparison.OrdinalIgnoreCase))
            .WithMessage("Cổng đăng ký công khai chỉ cho phép vai trò 'Student'. Tài khoản Giảng viên (Lecturer) và Quản trị viên (Admin) phải do Quản trị viên khởi tạo.");
    }
}

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

        RuleFor(x => x.Password)
            .NotEmpty().WithMessage("Mật khẩu không được để trống.")
            .MinimumLength(8).WithMessage("Mật khẩu phải có ít nhất 8 ký tự.")
            .Matches(@"[A-Z]").WithMessage("Mật khẩu phải chứa ít nhất một chữ hoa.")
            .Matches(@"[0-9]").WithMessage("Mật khẩu phải chứa ít nhất một chữ số.")
            .Matches(@"[^a-zA-Z0-9]").WithMessage("Mật khẩu phải chứa ít nhất một ký tự đặc biệt.");
    }
}

public class LoginRequestValidator : AbstractValidator<LoginRequest>
{
    public LoginRequestValidator()
    {
        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("Email không được để trống.")
            .EmailAddress().WithMessage("Định dạng email không hợp lệ.");

        RuleFor(x => x.Password)
            .NotEmpty().WithMessage("Mật khẩu không được để trống.");
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

public class VerifyEmailRequestValidator : AbstractValidator<VerifyEmailRequest>
{
    public VerifyEmailRequestValidator()
    {
        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("Email không được để trống.")
            .EmailAddress().WithMessage("Định dạng email không hợp lệ.")
            .MaximumLength(256).WithMessage("Email không được vượt quá 256 ký tự.");

        RuleFor(x => x.Otp)
            .NotEmpty().WithMessage("Mã xác thực OTP không được để trống.")
            .Length(6).WithMessage("Mã xác thực OTP phải gồm đúng 6 chữ số.")
            .Matches(@"^\d{6}$").WithMessage("Mã xác thực OTP chỉ bao gồm các chữ số (0-9).");
    }
}

public class ResendVerificationRequestValidator : AbstractValidator<ResendVerificationRequest>
{
    public ResendVerificationRequestValidator()
    {
        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("Email không được để trống.")
            .EmailAddress().WithMessage("Định dạng email không hợp lệ.")
            .MaximumLength(256).WithMessage("Email không được vượt quá 256 ký tự.");
    }
}

public class ForgotPasswordRequestValidator : AbstractValidator<ForgotPasswordRequest>
{
    public ForgotPasswordRequestValidator()
    {
        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("Email không được để trống.")
            .EmailAddress().WithMessage("Định dạng email không hợp lệ.")
            .MaximumLength(256).WithMessage("Email không được vượt quá 256 ký tự.");
    }
}

public class ResetPasswordRequestValidator : AbstractValidator<ResetPasswordRequest>
{
    public ResetPasswordRequestValidator()
    {
        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("Email không được để trống.")
            .EmailAddress().WithMessage("Định dạng email không hợp lệ.")
            .MaximumLength(256).WithMessage("Email không được vượt quá 256 ký tự.");

        RuleFor(x => x.Otp)
            .NotEmpty().WithMessage("Mã xác thực OTP không được để trống.")
            .Length(6).WithMessage("Mã xác thực OTP phải gồm đúng 6 chữ số.")
            .Matches(@"^\d{6}$").WithMessage("Mã xác thực OTP chỉ bao gồm các chữ số (0-9).");

        RuleFor(x => x.NewPassword)
            .NotEmpty().WithMessage("Mật khẩu mới không được để trống.")
            .MinimumLength(8).WithMessage("Mật khẩu mới phải có ít nhất 8 ký tự.")
            .Matches(@"[A-Z]").WithMessage("Mật khẩu mới phải chứa ít nhất một chữ hoa.")
            .Matches(@"[0-9]").WithMessage("Mật khẩu mới phải chứa ít nhất một chữ số.")
            .Matches(@"[^a-zA-Z0-9]").WithMessage("Mật khẩu mới phải chứa ít nhất một ký tự đặc biệt.");

        RuleFor(x => x.ConfirmNewPassword)
            .Equal(x => x.NewPassword).WithMessage("Mật khẩu xác nhận không trùng khớp.");
    }
}

