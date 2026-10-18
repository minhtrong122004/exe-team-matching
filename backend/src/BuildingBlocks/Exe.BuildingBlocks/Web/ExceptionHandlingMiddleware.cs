using System.Net;
using System.Text.Json;
using Exe.BuildingBlocks.Exceptions;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;

namespace Exe.BuildingBlocks.Web;

/// <summary>
/// Middleware xử lý ngoại lệ tập trung chuẩn RFC 7807 ProblemDetails (CLAUDE.md mục 10, 11).
/// Định dạng: { "status": 409, "title": "...", "code": "GROUP_FULL", "traceId": "..." }
/// </summary>
public class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;

    public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exe.BuildingBlocks.Exceptions.AppException ex)
        {
            _logger.LogWarning("AppException on {Method} {Path}: {Message} [Code: {Code}]",
                context.Request.Method, context.Request.Path, ex.Message, ex.ErrorCode);

            await WriteProblemDetailsResponseAsync(context, (int)ex.StatusCode, ex.Message, ex.ErrorCode,
                ex is Exe.BuildingBlocks.Exceptions.ValidationException vex && vex.Errors.Count > 0 ? vex.Errors : null);
        }
        catch (Exe.BuildingBlocks.Web.AppException ex)
        {
            _logger.LogWarning("AppException on {Method} {Path}: {Message} [Code: {Code}]",
                context.Request.Method, context.Request.Path, ex.Message, ex.Code);

            await WriteProblemDetailsResponseAsync(context, ex.StatusCode, ex.Message, ex.Code);
        }
        catch (FluentValidation.ValidationException ex)
        {
            _logger.LogWarning("FluentValidation.ValidationException on {Method} {Path}: {Message}",
                context.Request.Method, context.Request.Path, ex.Message);

            var errors = ex.Errors
                .GroupBy(e => e.PropertyName)
                .ToDictionary(g => g.Key, g => g.Select(e => e.ErrorMessage).ToArray());

            await WriteProblemDetailsResponseAsync(context, (int)HttpStatusCode.BadRequest,
                "One or more validation errors occurred.", "VALIDATION_ERROR", errors);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unhandled exception on {Method} {Path}", context.Request.Method, context.Request.Path);

            await WriteProblemDetailsResponseAsync(context, (int)HttpStatusCode.InternalServerError,
                "An unexpected internal error occurred.", "INTERNAL_ERROR");
        }
    }

    private static async Task WriteProblemDetailsResponseAsync(
        HttpContext context,
        int statusCode,
        string title,
        string code,
        IDictionary<string, string[]>? errors = null)
    {
        context.Response.StatusCode = statusCode;
        context.Response.ContentType = "application/problem+json";

        var payload = new Dictionary<string, object?>
        {
            ["status"] = statusCode,
            ["title"] = title,
            ["code"] = code,
            ["traceId"] = context.TraceIdentifier
        };

        if (errors is { Count: > 0 })
        {
            payload["errors"] = errors;
        }

        var json = JsonSerializer.Serialize(payload, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        });

        await context.Response.WriteAsync(json);
    }
}

public static class ExceptionHandlingMiddlewareExtensions
{
    public static IApplicationBuilder UseExeExceptionHandler(this IApplicationBuilder app)
    {
        return app.UseMiddleware<ExceptionHandlingMiddleware>();
    }
}
