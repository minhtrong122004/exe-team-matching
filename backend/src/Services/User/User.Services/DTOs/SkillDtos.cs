using User.Repository.Enums;

namespace User.Services.DTOs;

/// <summary>
/// DTO phản hồi thông tin một kỹ năng trong danh mục (CLAUDE.md mục 6, 10).
/// </summary>
public record SkillResponse(
    Guid Id,
    string Name,
    SkillCategory Category,
    string? Description,
    DateTime CreatedAt
);

/// <summary>
/// DTO yêu cầu thêm kỹ năng mới vào danh mục hệ thống.
/// </summary>
public record CreateSkillRequest(
    string Name,
    SkillCategory Category,
    string? Description = null
);

/// <summary>
/// DTO phản hồi kỹ năng thuộc hồ sơ người dùng kèm mức độ thành thạo (1-5).
/// </summary>
public record UserSkillResponse(
    Guid SkillId,
    string SkillName,
    SkillCategory Category,
    int Level,
    DateTime CreatedAt
);

/// <summary>
/// DTO yêu cầu thêm một kỹ năng vào hồ sơ người dùng.
/// </summary>
public record AddUserSkillRequest(
    Guid SkillId,
    int Level
);

/// <summary>
/// DTO yêu cầu cập nhật mức độ thành thạo của kỹ năng trong hồ sơ người dùng.
/// </summary>
public record UpdateUserSkillProficiencyRequest(
    int Level
);

/// <summary>
/// Phần tử kỹ năng trong danh sách cập nhật đồng loạt (PUT /api/users/me/skills).
/// </summary>
public record UserSkillItemRequest(
    Guid SkillId,
    int Level
);

/// <summary>
/// DTO yêu cầu thiết lập toàn bộ danh sách kỹ năng của người dùng (PUT /api/users/me/skills).
/// </summary>
public record BatchSetUserSkillsRequest(
    List<UserSkillItemRequest> Skills
);
