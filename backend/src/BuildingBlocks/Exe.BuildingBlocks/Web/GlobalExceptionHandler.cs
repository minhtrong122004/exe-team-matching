using System.Text.Json;
using FluentValidation;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;

namespace Exe.BuildingBlocks.Web;

/// <summary>
/// Bắt mọi exception chưa xử lý (cơ chế IExceptionHandler chuẩn của ASP.NET Core 8+) và trả ProblemDetails:
/// ValidationException → 400 (kèm "errors"), AppException → status của nó, còn lại → 500 (không lộ stack trace).
/// </summary>
public sealed class GlobalExceptionHandler(ILogger<GlobalExceptionHandler> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext context, Exception exception, CancellationToken cancellationToken)
    {
        switch (exception)
        {
            case ValidationException validation:
                var errors = validation.Errors
                    .GroupBy(e => JsonNamingPolicy.CamelCase.ConvertName(e.PropertyName))
                    .ToDictionary(g => g.Key, g => g.Select(e => e.ErrorMessage).Distinct().ToArray());
                logger.LogWarning("Validation failed on {Method} {Path}: {Fields}",
                    context.Request.Method, context.Request.Path, string.Join(", ", errors.Keys));
                await ProblemDetailsWriter.WriteAsync(context, 400, ErrorCodes.ValidationError,
                    "One or more validation errors occurred.", errors);
                return true;

            case AppException app:
                logger.LogWarning("{Method} {Path} failed with {StatusCode} {Code}: {Message}",
                    context.Request.Method, context.Request.Path, app.StatusCode, app.Code, app.Message);
                await ProblemDetailsWriter.WriteAsync(context, app.StatusCode, app.Code, app.Message);
                return true;

            case OperationCanceledException when context.RequestAborted.IsCancellationRequested:
                // Client đã ngắt kết nối, không cần trả lỗi.
                return true;

            default:
                logger.LogError(exception, "Unhandled exception on {Method} {Path}",
                    context.Request.Method, context.Request.Path);
                await ProblemDetailsWriter.WriteAsync(context, 500, ErrorCodes.InternalError,
                    "An unexpected error occurred. Please try again later.");
                return true;
        }
    }
}
