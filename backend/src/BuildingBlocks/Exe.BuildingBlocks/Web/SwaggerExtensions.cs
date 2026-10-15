using System.Reflection;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.OpenApi;

namespace Exe.BuildingBlocks.Web;

public static class SwaggerExtensions
{
    /// <summary>Swagger có nút "Authorize" để nhập Bearer token và đọc XML comment của controller.</summary>
    public static IServiceCollection AddExeSwagger(this IServiceCollection services, string title)
    {
        services.AddEndpointsApiExplorer();
        services.AddSwaggerGen(options =>
        {
            options.SwaggerDoc("v1", new OpenApiInfo { Title = title, Version = "v1" });

            options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
            {
                Type = SecuritySchemeType.Http,
                Scheme = "bearer",
                BearerFormat = "JWT",
                In = ParameterLocation.Header,
                Description = "Paste the access token (without the 'Bearer ' prefix)."
            });
            options.AddSecurityRequirement(document => new OpenApiSecurityRequirement
            {
                [new OpenApiSecuritySchemeReference("Bearer", document)] = []
            });

            // XML comment của controller (cần <GenerateDocumentationFile>true</GenerateDocumentationFile> trong X.API.csproj).
            var entryAssembly = Assembly.GetEntryAssembly();
            if (entryAssembly is not null)
            {
                var xmlPath = Path.Combine(AppContext.BaseDirectory, $"{entryAssembly.GetName().Name}.xml");
                if (File.Exists(xmlPath)) options.IncludeXmlComments(xmlPath);
            }
        });
        return services;
    }
}
