var builder = WebApplication.CreateBuilder(args);

builder.Services.AddGrpc();
builder.Services.AddHealthChecks();

var app = builder.Build();

// TODO(Trọng): app.MapGrpcService<MatchingGrpcService>(); (CLAUDE.md mục 8)
app.MapHealthChecks("/health"); // kiểm tra: curl --http2-prior-knowledge http://localhost:8080/health
app.MapGet("/", () => "Matching gRPC service is running (HTTP/2 only)");

app.Run();
