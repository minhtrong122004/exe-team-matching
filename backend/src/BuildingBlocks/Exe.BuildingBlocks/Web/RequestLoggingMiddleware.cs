using System.Diagnostics;
using Exe.BuildingBlocks.Auth;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;

namespace Exe.BuildingBlocks.Web;

/// <summary>
/// Đọc hoặc tạo X-Correlation-Id (trả lại trong response header) và log mỗi request:
/// method, path, status code, thời gian xử lý, userId, correlationId.
/// </summary>
public sealed class RequestLoggingMiddleware(RequestDelegate next, ILogger<RequestLoggingMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext context)
    {
        var correlationId = context.Request.Headers[CorrelationContext.HeaderName].FirstOrDefault();
        if (string.IsNullOrWhiteSpace(correlationId))
        {
            correlationId = Guid.NewGuid().ToString("N");
            context.Request.Headers[CorrelationContext.HeaderName] = correlationId; // để Gateway chuyển tiếp
        }

        CorrelationContext.Current = correlationId;
        context.Response.OnStarting(() =>
        {
            context.Response.Headers[CorrelationContext.HeaderName] = correlationId;
            return Task.CompletedTask;
        });

        var stopwatch = Stopwatch.StartNew();
        try
        {
            await next(context);
        }
        finally
        {
            stopwatch.Stop();
            if (!context.Request.Path.StartsWithSegments("/health"))
            {
                var userId = context.User.FindFirst(ExeClaims.Subject)?.Value ?? "anonymous";
                logger.LogInformation(
                    "HTTP {Method} {Path} -> {StatusCode} in {Elapsed} ms userId={UserId} correlationId={CorrelationId}",
                    context.Request.Method, context.Request.Path.Value, context.Response.StatusCode,
                    stopwatch.ElapsedMilliseconds, userId, correlationId);
            }
        }
    }
}
