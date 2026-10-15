using System.Text.Json;

namespace Exe.BuildingBlocks.EventBus;

/// <summary>Các field của một entry trong stream: eventId, eventType, occurredAt, correlationId, payload (CLAUDE.md mục 7).</summary>
public sealed record EventEnvelope(Guid EventId, string EventType, DateTime OccurredAt, string? CorrelationId, string Payload);

public static class EventStreams
{
    /// <summary>exe:events:{EventType}, ví dụ exe:events:MemberJoined.</summary>
    public static string For(string eventType) => $"exe:events:{eventType}";

    /// <summary>Tên event = tên record trong Exe.Contracts/Events.</summary>
    public static string For<TEvent>() => For(typeof(TEvent).Name);

    internal static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
}
