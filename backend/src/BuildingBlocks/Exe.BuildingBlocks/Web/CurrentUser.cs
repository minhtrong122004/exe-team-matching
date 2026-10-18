using System.Security.Claims;
using Exe.BuildingBlocks.Auth;
using Microsoft.AspNetCore.Http;

namespace Exe.BuildingBlocks.Web;

/// <summary>
/// Người dùng đang gọi API, đọc từ JWT. Lớp Services dùng interface này thay vì HttpContext
/// (CLAUDE.md mục 5: lớp Services không biết HTTP).
/// </summary>
public interface ICurrentUser
{
    bool IsAuthenticated { get; }

    /// <summary>Id người dùng (claim "sub"); ném UnauthorizedException nếu chưa đăng nhập.</summary>
    Guid UserId { get; }

    string? Email { get; }
    string? FullName { get; }
    string? Role { get; }
    bool IsInRole(string role);
}

public sealed class CurrentUser(IHttpContextAccessor accessor) : ICurrentUser
{
    private ClaimsPrincipal? Principal => accessor.HttpContext?.User;

    public bool IsAuthenticated => Principal?.Identity?.IsAuthenticated == true;

    public Guid UserId =>
        Guid.TryParse(Principal?.FindFirst(ExeClaims.Subject)?.Value, out var id)
            ? id
            : throw new UnauthorizedException();

    public string? Email => Principal?.FindFirst(ExeClaims.Email)?.Value;
    public string? FullName => Principal?.FindFirst(ExeClaims.Name)?.Value;
    public string? Role => Principal?.FindFirst(ExeClaims.Role)?.Value;
    public bool IsInRole(string role) => Principal?.IsInRole(role) == true;
}
