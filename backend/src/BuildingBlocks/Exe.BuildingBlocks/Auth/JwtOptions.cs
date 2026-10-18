namespace Exe.BuildingBlocks.Auth;

/// <summary>
/// Cấu hình JWT dùng chung cho toàn hệ thống (CLAUDE.md mục 11).
/// Được bind từ section "Jwt" trong appsettings.json.
/// </summary>
public sealed class JwtOptions
{
    public const string SectionName = "Jwt";

    public string Issuer { get; set; } = "exe-auth";
    public string Audience { get; set; } = "exe-api";
    public string Key { get; set; } = string.Empty;
    public int AccessTokenExpirationMinutes { get; set; } = 60;
    public int RefreshTokenExpirationDays { get; set; } = 7;

    // Thuộc tính tương thích cho các service trên nhánh develop
    public int AccessTokenMinutes
    {
        get => AccessTokenExpirationMinutes;
        set => AccessTokenExpirationMinutes = value;
    }

    public int RefreshTokenDays
    {
        get => RefreshTokenExpirationDays;
        set => RefreshTokenExpirationDays = value;
    }
}
