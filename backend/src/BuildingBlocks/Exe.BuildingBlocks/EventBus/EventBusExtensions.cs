using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using StackExchange.Redis;

namespace Exe.BuildingBlocks.EventBus;

/// <summary>
/// Đăng ký DI cho Redis ConnectionMultiplexer và IEventPublisher (CLAUDE.md mục 7).
/// </summary>
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

    /// <summary>
    /// Đăng ký Redis Event Publisher cho Auth và User Service.
    /// </summary>
    public static IServiceCollection AddExeRedisEventPublisher(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var redisConnectionString = configuration.GetConnectionString("Redis")
                                 ?? configuration["ConnectionStrings:Redis"]
                                 ?? "localhost:6379";

        services.AddSingleton<IConnectionMultiplexer>(sp =>
        {
            var options = ConfigurationOptions.Parse(redisConnectionString);
            options.AbortOnConnectFail = false; // Khởi động an toàn ngay cả khi Redis tạm thời chưa sẵn sàng
            options.ConnectTimeout = 5000;
            options.SyncTimeout = 5000;
            return ConnectionMultiplexer.Connect(options);
        });

        services.AddSingleton<IEventPublisher, RedisStreamEventPublisher>();

        return services;
    }
}
