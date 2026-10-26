using Exe.BuildingBlocks.Auth;
using Matching.Grpc.Services;
using Matching.Services.Implementations;
using Matching.Services.Interfaces;
using Matching.Services.Options;
using Microsoft.Extensions.Options;

var builder = WebApplication.CreateBuilder(args);

// Kestrel chỉ HTTP/2, không TLS (Kestrel:EndpointDefaults:Protocols trong appsettings.json).
builder.Services.AddGrpc();
builder.Services.AddGrpcReflection();
builder.Services.AddHealthChecks();

// Kiểm tra JWT như mọi service (CLAUDE.md mục 11). Group chuyển tiếp header Authorization của người dùng.
builder.Services.AddExeJwtAuthentication(builder.Configuration);

builder.Services.AddOptions<MatchingWeights>()
    .Bind(builder.Configuration.GetSection(MatchingWeights.SectionName))
    .Validate(w => w.IsValid(), "Matching:Weights must be non-negative and sum to 100.")
    .ValidateOnStart();
builder.Services.AddSingleton<IMatchingCalculator>(sp =>
    new MatchingCalculator(sp.GetRequiredService<IOptions<MatchingWeights>>().Value));

var app = builder.Build();

app.UseAuthentication();
app.UseAuthorization();

app.MapGrpcService<MatchingGrpcService>().RequireAuthorization();
if (app.Environment.IsDevelopment())
{
    // Cho phép grpcurl / Postman tự đọc schema khi demo.
    app.MapGrpcReflectionService().AllowAnonymous();
}

app.MapHealthChecks("/health").AllowAnonymous(); // kiểm tra: curl --http2-prior-knowledge http://localhost:8080/health
app.MapGet("/", () => "Matching gRPC service is running (HTTP/2 only)").AllowAnonymous();

app.Run();
