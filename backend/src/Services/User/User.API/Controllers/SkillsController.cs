using Exe.BuildingBlocks.Auth;
using Exe.BuildingBlocks.Exceptions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using User.Repository.Enums;
using User.Services.DTOs;
using User.Services.Interfaces;

namespace User.API.Controllers;

/// <summary>
/// REST Controller quản lý danh mục kỹ năng hệ thống và kỹ năng của người dùng (CLAUDE.md mục 6, 10).
/// </summary>
[ApiController]
[Route("api/skills")]
[Authorize]
[Produces("application/json")]
public class SkillsController : ControllerBase
{
    private readonly ISkillService _skillService;
    private readonly ICurrentUser _currentUser;

    public SkillsController(ISkillService skillService, ICurrentUser currentUser)
    {
        _skillService = skillService;
        _currentUser = currentUser;
    }

    /// <summary>
    /// Lấy danh sách kỹ năng trong hệ thống (tùy chọn lọc theo danh mục Category).
    /// Yêu cầu người dùng đã xác thực.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<SkillResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetSkills([FromQuery] SkillCategory? category, CancellationToken ct)
    {
        var skills = category.HasValue
            ? await _skillService.GetSkillsByCategoryAsync(category.Value, ct)
            : await _skillService.GetAllSkillsAsync(ct);

        return Ok(skills);
    }

    /// <summary>
    /// Thêm kỹ năng mới vào danh mục hệ thống.
    /// Quyền hạn: Chỉ Quản trị viên (Admin) được phép thực hiện (Decision 1).
    /// </summary>
    [HttpPost]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(SkillResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> CreateSkill([FromBody] CreateSkillRequest request, CancellationToken ct)
    {
        var skill = await _skillService.CreateSkillAsync(request, ct);
        return CreatedAtAction(nameof(GetSkillById), new { id = skill.Id }, skill);
    }

    /// <summary>
    /// Lấy thông tin chi tiết một kỹ năng theo Id.
    /// </summary>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(SkillResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetSkillById([FromRoute] Guid id, CancellationToken ct)
    {
        var skill = await _skillService.GetSkillByIdAsync(id, ct);
        return Ok(skill);
    }

    /// <summary>
    /// Lấy danh sách kỹ năng thuộc hồ sơ người dùng hiện tại (kèm mức độ thành thạo 1-5).
    /// </summary>
    [HttpGet("/api/users/me/skills")]
    [ProducesResponseType(typeof(IReadOnlyList<UserSkillResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetCurrentUserSkills(CancellationToken ct)
    {
        var userId = GetCurrentUserId();
        var skills = await _skillService.GetUserSkillsAsync(userId, ct);
        return Ok(skills);
    }

    /// <summary>
    /// Thay thế đồng loạt toàn bộ danh sách kỹ năng của người dùng hiện tại.
    /// Đảm bảo tính nguyên tử (Atomic replacement) trong một giao dịch.
    /// </summary>
    [HttpPut("/api/users/me/skills")]
    [ProducesResponseType(typeof(IReadOnlyList<UserSkillResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> SetCurrentUserSkills([FromBody] BatchSetUserSkillsRequest request, CancellationToken ct)
    {
        var userId = GetCurrentUserId();
        var skills = await _skillService.SetUserSkillsAsync(userId, request, ct);
        return Ok(skills);
    }

    /// <summary>
    /// Cập nhật mức độ thành thạo (1-5) của một kỹ năng cụ thể trong hồ sơ người dùng hiện tại.
    /// </summary>
    [HttpPatch("/api/users/me/skills/{skillId:guid}")]
    [ProducesResponseType(typeof(UserSkillResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateUserSkillProficiency(
        [FromRoute] Guid skillId,
        [FromBody] UpdateUserSkillProficiencyRequest request,
        CancellationToken ct)
    {
        var userId = GetCurrentUserId();
        var updated = await _skillService.UpdateUserSkillProficiencyAsync(userId, skillId, request, ct);
        return Ok(updated);
    }

    /// <summary>
    /// Xóa một kỹ năng khỏi hồ sơ của người dùng hiện tại.
    /// </summary>
    [HttpDelete("/api/users/me/skills/{skillId:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> RemoveSkillFromUser([FromRoute] Guid skillId, CancellationToken ct)
    {
        var userId = GetCurrentUserId();
        await _skillService.RemoveSkillFromUserAsync(userId, skillId, ct);
        return NoContent();
    }

    private Guid GetCurrentUserId()
    {
        if (!_currentUser.UserId.HasValue)
        {
            throw new UnauthorizedException("Phiên đăng nhập không hợp lệ hoặc thiếu claim UserId.");
        }
        return _currentUser.UserId.Value;
    }
}
