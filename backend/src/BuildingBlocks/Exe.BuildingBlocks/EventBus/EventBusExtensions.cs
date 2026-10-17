using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using StackExchange.Redis;

namespace Exe.BuildingBlocks.EventBus;

/// <summary>
/// Đăng ký DI cho Redis ConnectionMultiplexer và IEventPublisher (CLAUDE.md mục 7).
/// </summary>
public static class EventBusExtensions
{
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
