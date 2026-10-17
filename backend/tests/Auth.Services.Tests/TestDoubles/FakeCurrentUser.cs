using Exe.BuildingBlocks.Auth;
using Microsoft.Extensions.Logging;

namespace Auth.Services.Tests.TestDoubles;

public class FakeCurrentUser : ICurrentUser
{
    public Guid? UserId { get; set; }
    public string? Email { get; set; }
    public string? FullName { get; set; }
    public string? Role { get; set; }
    public bool IsAuthenticated => UserId.HasValue;
    public bool IsInRole(string role) => Role?.Equals(role, StringComparison.OrdinalIgnoreCase) ?? false;
}

public class NullLogger<T> : ILogger<T>
{
    public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;
    public bool IsEnabled(LogLevel logLevel) => true;
    public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception, Func<TState, Exception?, string> formatter) { }
}
