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
    /// Đăng nhập bằng Google ID token. Email phải có trong danh sách FAP, nếu không trả 403 NOT_IN_FAP_LIST.
    /// </summary>
    [HttpPost("google")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(AuthResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> LoginWithGoogle([FromBody] GoogleLoginRequest request, CancellationToken ct)
    {
        var result = await _authService.LoginWithGoogleAsync(request, ct);
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
    /// Sinh viên xác nhận đồng ý quy định ghép nhóm & sự điều phối của Moderator/Giảng viên ở lần đầu đăng nhập (BR-34).
    /// </summary>
    [HttpPost("accept-terms")]
    [Authorize]
    [ProducesResponseType(typeof(AcceptTermsResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> AcceptTerms([FromBody] AcceptTermsRequest? request, CancellationToken ct)
    {
        if (!_currentUser.UserId.HasValue)
        {
            throw new UnauthorizedException("Phiên đăng nhập không hợp lệ hoặc thiếu claim UserId.");
        }

        var result = await _authService.AcceptTermsAsync(_currentUser.UserId.Value, ct);
        return Ok(result);
    }

    /// <summary>
    /// Xem danh sách tài khoản phân trang (Dành cho Moderator).
    /// </summary>
    [HttpGet("accounts")]
    [Authorize(Roles = Roles.Moderator)]
    [ProducesResponseType(typeof(PagedResult<AccountResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> GetAccounts([FromQuery] GetAccountsQuery query, CancellationToken ct)
    {
        var result = await _adminAccountService.GetAccountsPagedAsync(query, ct);
        return Ok(result);
    }

    /// <summary>
    /// Khóa tài khoản và thu hồi toàn bộ Refresh Token (Dành cho Moderator).
    /// </summary>
    [HttpPatch("accounts/{id:guid}/lock")]
    [HttpPut("accounts/{id:guid}/lock")]
    [Authorize(Roles = Roles.Moderator)]
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
    /// Mở khóa tài khoản (Dành cho Moderator).
    /// </summary>
    [HttpPatch("accounts/{id:guid}/unlock")]
    [HttpPut("accounts/{id:guid}/unlock")]
    [Authorize(Roles = Roles.Moderator)]
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
    /// Khởi tạo tài khoản Giảng viên (Lecturer) hoặc Điều phối viên (Moderator) (Dành cho Moderator).
    /// </summary>
    [HttpPost("accounts/lecturers")]
    [Authorize(Roles = Roles.Moderator)]
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

    /// <summary>
    /// Đồng bộ và cấp tài khoản hàng loạt cho danh sách sinh viên đủ điều kiện học EXE từ FAP (BR-01).
    /// Tự động tạo tài khoản Student, gắn MSSV và tách ngành/khóa (BR-04).
    /// </summary>
    [HttpPost("accounts/provision-fap")]
    [Authorize(Roles = Roles.Moderator)]
    [ProducesResponseType(typeof(ProvisionFapStudentsResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> ProvisionFapStudents([FromBody] ProvisionFapStudentsRequest request, CancellationToken ct)
    {
        var result = await _adminAccountService.ProvisionFapStudentsAsync(request, ct);
        return Ok(result);
    }
}
