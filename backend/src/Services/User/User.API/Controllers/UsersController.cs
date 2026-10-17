using Exe.BuildingBlocks.Paging;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using User.Services.DTOs;
using User.Services.Interfaces;

namespace User.API.Controllers;

/// <summary>
/// REST Controller quản lý thông tin hồ sơ người dùng (CLAUDE.md mục 6, 10).
/// Tất cả endpoints đều yêu cầu xác thực JWT.
/// </summary>
[ApiController]
[Route("api/users")]
[Authorize]
[Produces("application/json")]
public class UsersController : ControllerBase
{
    private readonly IUserProfileService _userProfileService;

    public UsersController(IUserProfileService userProfileService)
    {
        _userProfileService = userProfileService;
    }

    /// <summary>
    /// Lấy thông tin hồ sơ của người dùng đang đăng nhập (dựa trên claim UserId trong JWT).
    /// </summary>
    [HttpGet("me")]
    [ProducesResponseType(typeof(UserProfileResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetCurrentUserProfile(CancellationToken ct)
    {
        var profile = await _userProfileService.GetCurrentUserProfileAsync(ct);
        return Ok(profile);
    }

    /// <summary>
    /// Cập nhật thông tin hồ sơ của chính người dùng đang đăng nhập.
    /// </summary>
    [HttpPut("me")]
    [ProducesResponseType(typeof(UserProfileResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> UpdateCurrentUserProfile([FromBody] UpdateUserProfileRequest request, CancellationToken ct)
    {
        var profile = await _userProfileService.UpdateCurrentUserProfileAsync(request, ct);
        return Ok(profile);
    }

    /// <summary>
    /// Xem thông tin hồ sơ công khai của một người dùng theo UserId (đã loại bỏ Email và StudentCode).
    /// </summary>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(CandidateProfileResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetProfileById([FromRoute] Guid id, CancellationToken ct)
    {
        var profile = await _userProfileService.GetProfileByIdAsync(id, ct);
        return Ok(profile);
    }

    /// <summary>
    /// Tìm kiếm và phân trang danh sách hồ sơ người dùng công khai theo chuyên ngành, kỹ năng, trạng thái tìm nhóm (đã loại bỏ Email và StudentCode).
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(PagedResult<CandidateProfileResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> SearchProfiles([FromQuery] UserSearchFilter filter, CancellationToken ct)
    {
        var result = await _userProfileService.SearchProfilesAsync(filter, ct);
        return Ok(result);
    }

    /// <summary>
    /// Truy vấn danh sách hồ sơ ứng viên theo mảng danh sách UserId (tối đa 100 ID, đã loại bỏ Email và StudentCode để bảo vệ quyền riêng tư).
    /// Phục vụ hiển thị thành viên nhóm và thuật toán Matching Service.
    /// </summary>
    [HttpPost("batch")]
    [ProducesResponseType(typeof(IReadOnlyList<CandidateProfileResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetBatchProfiles([FromBody] BatchUsersRequest request, CancellationToken ct)
    {
        var profiles = await _userProfileService.GetBatchProfilesAsync(request.UserIds, ct);
        return Ok(profiles);
    }
}
