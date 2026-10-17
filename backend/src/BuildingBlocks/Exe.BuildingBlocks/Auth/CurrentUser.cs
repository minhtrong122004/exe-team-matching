using System.Security.Claims;
using Microsoft.AspNetCore.Http;

namespace Exe.BuildingBlocks.Auth;

/// <summary>
/// Triển khai ICurrentUser trích xuất thông tin người dùng từ HttpContext.User.
/// </summary>
public class CurrentUser : ICurrentUser
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public CurrentUser(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    private ClaimsPrincipal? User => _httpContextAccessor.HttpContext?.User;

    public Guid? UserId
    {
        get
        {
            var sub = User?.FindFirstValue(ClaimTypes.NameIdentifier)
                   ?? User?.FindFirstValue("sub");
            return Guid.TryParse(sub, out var id) ? id : null;
        }
    }

    public string? Email => User?.FindFirstValue(ClaimTypes.Email)
                         ?? User?.FindFirstValue("email");

    public string? FullName => User?.FindFirstValue(ClaimTypes.Name)
                            ?? User?.FindFirstValue("name");

    public string? Role => User?.FindFirstValue(ClaimTypes.Role)
                        ?? User?.FindFirstValue("role");

    public bool IsAuthenticated => User?.Identity?.IsAuthenticated ?? false;

    public bool IsInRole(string role) => User?.IsInRole(role) ?? false;
}
