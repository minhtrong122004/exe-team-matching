using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using StackExchange.Redis;

namespace Exe.BuildingBlocks.EventBus;

public static class EventBusExtensions
{
    /// <summary>
    /// Kết nối Redis (ConnectionStrings:Redis) và đăng ký IEventPublisher.
    /// Consumer đăng ký riêng: <c>builder.Services.AddHostedService&lt;UserRegisteredConsumer&gt;();</c>
    /// </summary>
    public static IServiceCollection AddExeEventBus(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("Redis") ?? "localhost:6379";

        services.Configure<EventBusOptions>(configuration.GetSection(EventBusOptions.SectionName));
        services.AddSingleton<IConnectionMultiplexer>(_ =>
        {
            var options = ConfigurationOptions.Parse(connectionString);
            options.AbortOnConnectFail = false; // Redis chưa sẵn sàng thì tự kết nối lại sau
            return ConnectionMultiplexer.Connect(options);
        });
        services.AddSingleton<IEventPublisher, RedisStreamsEventPublisher>();
        return services;
    }
}
