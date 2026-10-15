namespace Exe.BuildingBlocks.Auth;

/// <summary>Cấu hình JWT, đọc từ section "Jwt" (biến môi trường Jwt__Key, Jwt__Issuer, Jwt__Audience).</summary>
public sealed class JwtOptions
{
    public const string SectionName = "Jwt";

    public string Issuer { get; set; } = "exe-auth";
    public string Audience { get; set; } = "exe-api";
    public string Key { get; set; } = string.Empty;
    public int AccessTokenMinutes { get; set; } = 60;
    public int RefreshTokenDays { get; set; } = 7;
}
