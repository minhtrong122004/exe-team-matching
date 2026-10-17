namespace Exe.BuildingBlocks.Auth;

/// <summary>
/// Cấu hình JWT dùng chung cho toàn hệ thống (CLAUDE.md mục 11).
/// </summary>
public class JwtOptions
{
    public const string SectionName = "Jwt";

    public string Issuer { get; set; } = "exe-auth";
    public string Audience { get; set; } = "exe-api";
    public string Key { get; set; } = string.Empty;
    public int AccessTokenExpirationMinutes { get; set; } = 60;
    public int RefreshTokenExpirationDays { get; set; } = 7;
}
