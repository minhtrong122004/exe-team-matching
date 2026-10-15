using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Exe.BuildingBlocks.Web;

public static class ServiceClientExtensions
{
    /// <summary>
    /// Đăng ký typed HttpClient gọi sang service khác (CLAUDE.md mục 11):
    /// base URL lấy từ "Services:{serviceName}" (biến môi trường Services__User=http://user-service:8080),
    /// timeout 5 giây, retry đơn giản, tự chuyển tiếp Authorization và X-Correlation-Id.
    /// <code>builder.Services.AddExeServiceClient&lt;IUserClient, UserClient&gt;(builder.Configuration, "User");</code>
    /// </summary>
    public static IHttpClientBuilder AddExeServiceClient<TClient, TImplementation>(
        this IServiceCollection services, IConfiguration configuration, string serviceName)
        where TClient : class
        where TImplementation : class, TClient
    {
        var baseUrl = configuration[$"Services:{serviceName}"]
                      ?? throw new InvalidOperationException($"Missing configuration 'Services:{serviceName}'.");

        services.AddHttpContextAccessor();
        services.AddTransient<ForwardHeadersHandler>();

        var builder = services
            .AddHttpClient<TClient, TImplementation>(client => client.BaseAddress = new Uri(baseUrl))
            .AddHttpMessageHandler<ForwardHeadersHandler>();

        builder.AddStandardResilienceHandler(options =>
        {
            options.AttemptTimeout.Timeout = TimeSpan.FromSeconds(5);
            options.TotalRequestTimeout.Timeout = TimeSpan.FromSeconds(15);
            options.Retry.MaxRetryAttempts = 2;
        });

        return builder;
    }
}

/// <summary>Chuyển tiếp header Authorization của người gọi và X-Correlation-Id sang service khác.</summary>
public sealed class ForwardHeadersHandler(IHttpContextAccessor accessor) : DelegatingHandler
{
    protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        var authorization = accessor.HttpContext?.Request.Headers.Authorization.ToString();
        if (!string.IsNullOrEmpty(authorization) && request.Headers.Authorization is null)
            request.Headers.TryAddWithoutValidation("Authorization", authorization);

        if (CorrelationContext.Current is { } correlationId && !request.Headers.Contains(CorrelationContext.HeaderName))
            request.Headers.TryAddWithoutValidation(CorrelationContext.HeaderName, correlationId);

        return base.SendAsync(request, cancellationToken);
    }
}
