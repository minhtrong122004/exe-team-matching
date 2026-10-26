using Exe.BuildingBlocks.Web;
using Grpc.Core;
using Grpc.Core.Interceptors;
using Microsoft.AspNetCore.Http;

namespace Group.Services.Clients;

/// <summary>
/// Gắn header Authorization của người gọi và X-Correlation-Id của request hiện tại vào metadata
/// của mọi lời gọi gRPC sang Matching (CLAUDE.md mục 11), giống ForwardHeadersHandler làm cho HttpClient.
/// </summary>
public sealed class MatchingMetadataInterceptor(IHttpContextAccessor accessor) : Interceptor
{
    public override AsyncUnaryCall<TResponse> AsyncUnaryCall<TRequest, TResponse>(
        TRequest request,
        ClientInterceptorContext<TRequest, TResponse> context,
        AsyncUnaryCallContinuation<TRequest, TResponse> continuation)
    {
        var headers = context.Options.Headers ?? new Metadata();

        var authorization = accessor.HttpContext?.Request.Headers.Authorization.ToString();
        if (!string.IsNullOrEmpty(authorization) && headers.Get("authorization") is null)
            headers.Add("authorization", authorization);

        if (CorrelationContext.Current is { } correlationId && headers.Get(CorrelationContext.HeaderName) is null)
            headers.Add(CorrelationContext.HeaderName, correlationId);

        var forwarded = new ClientInterceptorContext<TRequest, TResponse>(
            context.Method, context.Host, context.Options.WithHeaders(headers));
        return continuation(request, forwarded);
    }
}
