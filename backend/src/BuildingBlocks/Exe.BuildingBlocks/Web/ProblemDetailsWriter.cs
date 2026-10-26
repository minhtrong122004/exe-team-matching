using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.DependencyInjection;

namespace Exe.BuildingBlocks.Web;

/// <summary>
/// Ghi lỗi theo RFC 9457 (ProblemDetails) qua IProblemDetailsService có sẵn của ASP.NET Core,
/// nên mọi lỗi đều được bổ sung "code", "traceId", "instance" giống nhau (xem ProblemDetailsExtensions).
/// </summary>
public static class ProblemDetailsWriter
{
    public static async Task WriteAsync(HttpContext context, int status, string code, string? detail,
        IDictionary<string, string[]>? errors = null)
    {
        ProblemDetails problem = errors is null
            ? new ProblemDetails()
            : new ValidationProblemDetails(errors);

        problem.Status = status;
        problem.Detail = detail;
        problem.Extensions["code"] = code;

        context.Response.StatusCode = status;
        var service = context.RequestServices.GetService<IProblemDetailsService>();
        if (service != null)
        {
            await service.WriteAsync(new ProblemDetailsContext { HttpContext = context, ProblemDetails = problem });
        }
        else
        {
            context.Response.ContentType = "application/problem+json";
            await System.Text.Json.JsonSerializer.SerializeAsync(context.Response.Body, problem);
        }
    }
}
