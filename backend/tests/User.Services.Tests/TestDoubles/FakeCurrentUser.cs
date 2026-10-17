using Exe.BuildingBlocks.Auth;

namespace User.Services.Tests.TestDoubles;

public class FakeCurrentUser : ICurrentUser
{
    public Guid? UserId { get; set; }
    public string? Email { get; set; }
    public string? FullName { get; set; }
    public string? Role { get; set; }
    public bool IsAuthenticated => UserId.HasValue;
    public bool IsInRole(string role) => Role?.Equals(role, StringComparison.OrdinalIgnoreCase) ?? false;
}
