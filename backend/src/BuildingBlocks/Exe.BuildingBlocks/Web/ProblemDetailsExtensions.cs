using System.Diagnostics;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.DependencyInjection;

namespace Exe.BuildingBlocks.Web;

public static class ProblemDetailsExtensions
{
    /// <summary>
    /// Bật ProblemDetails (RFC 9457) cho mọi lỗi: exception, 401/403, 404 không có route, lỗi model binding.
    /// Mọi response lỗi đều có dạng:
    /// { "type", "title", "status", "detail", "instance", "code", "traceId", "errors"? }
    /// </summary>
    public static IServiceCollection AddExeProblemDetails(this IServiceCollection services)
    {
        services.AddProblemDetails(options =>
        {
            options.CustomizeProblemDetails = ctx =>
            {
                var problem = ctx.ProblemDetails;
                problem.Instance ??= $"{ctx.HttpContext.Request.Method} {ctx.HttpContext.Request.Path}";
                problem.Extensions.TryAdd("code", DefaultCode(problem.Status));
                problem.Extensions["traceId"] = Activity.Current?.Id ?? ctx.HttpContext.TraceIdentifier;
                if (CorrelationContext.Current is { } correlationId)
                    problem.Extensions["correlationId"] = correlationId;
            };
        });
        services.AddExceptionHandler<GlobalExceptionHandler>();

        // Lỗi model binding ([ApiController] tự trả 400) cũng dùng chung định dạng, có code VALIDATION_ERROR.
        services.Configure<ApiBehaviorOptions>(options =>
        {
            options.InvalidModelStateResponseFactory = context =>
            {
                var problem = new ValidationProblemDetails(context.ModelState)
                {
                    Status = StatusCodes.Status400BadRequest,
                    Detail = "One or more validation errors occurred."
                };
                problem.Extensions["code"] = ErrorCodes.ValidationError;
                return new ObjectResult(problem) { StatusCode = 400, ContentTypes = { "application/problem+json" } };
            };
        });

        return services;
    }

    private static string DefaultCode(int? status) => status switch
    {
        400 => ErrorCodes.BadRequest,
        401 => ErrorCodes.Unauthorized,
        403 => ErrorCodes.Forbidden,
        404 => ErrorCodes.NotFound,
        409 => ErrorCodes.Conflict,
        _ => ErrorCodes.InternalError
    };
}
