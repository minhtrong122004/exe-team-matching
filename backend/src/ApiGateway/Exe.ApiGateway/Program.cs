var builder = WebApplication.CreateBuilder(args);

builder.Services.AddReverseProxy()
    .LoadFromConfig(builder.Configuration.GetSection("ReverseProxy"));
builder.Services.AddHealthChecks();

// TODO(Vy): kiểm tra JWT (AddExeJwtAuthentication) và gắn AuthorizationPolicy cho từng route.

var app = builder.Build();

app.MapHealthChecks("/health").AllowAnonymous();
app.MapReverseProxy();

app.Run();
