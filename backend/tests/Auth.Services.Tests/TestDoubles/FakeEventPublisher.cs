using Exe.BuildingBlocks.EventBus;

namespace Auth.Services.Tests.TestDoubles;

public class FakeEventPublisher : IEventPublisher
{
    public readonly List<(string StreamName, object Event)> PublishedEvents = new();
    public bool ShouldFail { get; set; } = false;
    public string FailureMessage { get; set; } = "Simulated Redis failure";

    public Task PublishAsync<T>(string streamName, T @event, CancellationToken cancellationToken = default) where T : class
    {
        if (ShouldFail)
        {
            throw new InvalidOperationException(FailureMessage);
        }

        PublishedEvents.Add((streamName, @event));
        return Task.CompletedTask;
    }
}
