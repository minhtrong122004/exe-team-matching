using Exe.BuildingBlocks.Auth;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddExeJwtAuthentication(builder.Configuration);
builder.Services.AddAuthorization();

builder.Services.AddReverseProxy()
    .LoadFromConfig(builder.Configuration.GetSection("ReverseProxy"));
builder.Services.AddHealthChecks();

var app = builder.Build();

app.UseAuthentication();
app.UseAuthorization();

app.MapHealthChecks("/health").AllowAnonymous();
app.MapReverseProxy();

app.Run();
