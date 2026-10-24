using Auth.Services.DTOs;
using Auth.Services.Interfaces;
using Exe.BuildingBlocks.Auth;
using Exe.BuildingBlocks.Exceptions;
using Exe.BuildingBlocks.Paging;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Auth.API.Controllers;

[ApiController]
[Route("api/auth")]
[Produces("application/json")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly IAdminAccountService _adminAccountService;
    private readonly ICurrentUser _currentUser;

    public AuthController(
        IAuthService authService,
        IAdminAccountService adminAccountService,
        ICurrentUser currentUser)
    {
        _authService = authService;
        _adminAccountService = adminAccountService;
        _currentUser = currentUser;
    }

    /// <summary>
    /// Đăng ký tài khoản sinh viên mới (Gate C, D, E, H).
    /// Sinh mã OTP 6 số và gửi qua Brevo Transactional Email.
    /// </summary>
    [HttpPost("register")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(RegisterResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request, CancellationToken ct)
    {
        var result = await _authService.RegisterAsync(request, ct);
        return StatusCode(StatusCodes.Status201Created, result);
    }

    /// <summary>
    /// Xác thực email tài khoản bằng mã OTP 6 số (Gate H, I).
    /// Kích hoạt tài khoản và phát sinh UserRegisteredEvent vào Transactional Outbox.
    /// </summary>
    [HttpPost("verify-email")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(VerifyEmailResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> VerifyEmail([FromBody] VerifyEmailRequest request, CancellationToken ct)
    {
        var result = await _authService.VerifyEmailAsync(request, ct);
        return Ok(result);
    }

    /// <summary>
    /// Gửi lại mã OTP xác thực email (Gate H).
    /// Áp dụng cooldown 60 giây và giới hạn 5 lần/giờ.
    /// </summary>
    [HttpPost("resend-verification")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(ResendVerificationResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> ResendVerification([FromBody] ResendVerificationRequest request, CancellationToken ct)
    {
        var result = await _authService.ResendVerificationAsync(request, ct);
        return Ok(result);
    }

    /// <summary>
    /// Gửi mã OTP đặt lại mật khẩu qua email (Brevo Transactional Email).
    /// Hỗ trợ chống dò quét tài khoản (User Enumeration Protection) và Cooldown 60s.
    /// </summary>
    [HttpPost("forgot-password")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(ForgotPasswordResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request, CancellationToken ct)
    {
        var result = await _authService.ForgotPasswordAsync(request, ct);
        return Ok(result);
    }

    /// <summary>
    /// Đặt lại mật khẩu tài khoản bằng mã OTP 6 số.
    /// Thu hồi tất cả Refresh Token của tài khoản để bảo mật phiên đăng nhập.
    /// </summary>
    [HttpPost("reset-password")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(ResetPasswordResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request, CancellationToken ct)
    {
        var result = await _authService.ResetPasswordAsync(request, ct);
        return Ok(result);
    }

    /// <summary>
    /// Đăng nhập tài khoản bằng email và mật khẩu.
    /// </summary>
    [HttpPost("login")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(AuthResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> Login([FromBody] LoginRequest request, CancellationToken ct)
    {
        var result = await _authService.LoginAsync(request, ct);
        return Ok(result);
    }

    /// <summary>
    /// Làm mới Access Token bằng Refresh Token (Token Rotation).
    /// </summary>
    [HttpPost("refresh")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(AuthResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Refresh([FromBody] RefreshTokenRequest request, CancellationToken ct)
    {
        var result = await _authService.RefreshTokenAsync(request, ct);
        return Ok(result);
    }

    /// <summary>
    /// Đăng xuất và thu hồi Refresh Token hiện tại.
    /// </summary>
    [HttpPost("logout")]
    [AllowAnonymous]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> Logout([FromBody] LogoutRequest request, CancellationToken ct)
    {
        await _authService.LogoutAsync(request, ct);
        return Ok(new { message = "Đăng xuất thành công." });
    }

    /// <summary>
    /// Lấy thông tin tài khoản đang đăng nhập từ JWT claims.
    /// </summary>
    [HttpGet("me")]
    [Authorize]
    [ProducesResponseType(typeof(AccountResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetCurrentUser(CancellationToken ct)
    {
        if (!_currentUser.UserId.HasValue)
        {
            throw new UnauthorizedException("Phiên đăng nhập không hợp lệ hoặc thiếu claim UserId.");
        }

        var account = await _authService.GetCurrentAccountAsync(_currentUser.UserId.Value, ct);
        return Ok(account);
    }

    /// <summary>
    /// Xem danh sách tài khoản phân trang (Chỉ dành cho Admin).
    /// </summary>
    [HttpGet("accounts")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(PagedResult<AccountResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> GetAccounts([FromQuery] GetAccountsQuery query, CancellationToken ct)
    {
        var result = await _adminAccountService.GetAccountsPagedAsync(query, ct);
        return Ok(result);
    }

    /// <summary>
    /// Khóa tài khoản và thu hồi toàn bộ Refresh Token (Chỉ dành cho Admin).
    /// </summary>
    [HttpPatch("accounts/{id:guid}/lock")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(AccountResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> LockAccount([FromRoute] Guid id, CancellationToken ct)
    {
        var result = await _adminAccountService.LockAccountAsync(id, ct);
        return Ok(result);
    }

    /// <summary>
    /// Mở khóa tài khoản (Chỉ dành cho Admin).
    /// </summary>
    [HttpPatch("accounts/{id:guid}/unlock")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(AccountResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UnlockAccount([FromRoute] Guid id, CancellationToken ct)
    {
        var result = await _adminAccountService.UnlockAccountAsync(id, ct);
        return Ok(result);
    }

    /// <summary>
    /// Khởi tạo tài khoản Giảng viên (Chỉ dành cho Admin).
    /// </summary>
    [HttpPost("accounts/lecturers")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(AccountResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> CreateLecturer([FromBody] CreateLecturerRequest request, CancellationToken ct)
    {
        var result = await _adminAccountService.CreateLecturerAsync(request, ct);
        return StatusCode(StatusCodes.Status201Created, result);
    }
}
