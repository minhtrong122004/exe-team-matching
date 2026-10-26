using Exe.BuildingBlocks.Web;
using Exe.Contracts.Matching;
using FluentValidation;
using Group.Services.Clients;
using Group.Services.Implementations;
using Group.Services.Interfaces;
using Group.Services.Options;
using Group.Services.Validators;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Group.Services;

public static class DependencyInjection
{
    /// <summary>Nghiệp vụ, validator và client gọi User/Project (REST) + Matching (gRPC).</summary>
    public static IServiceCollection AddGroupServices(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddOptions<GroupOptions>().Bind(configuration.GetSection(GroupOptions.SectionName));

        // ── Business services ────────────────────────────────────────────────
        services.AddScoped<IGroupService, GroupService>();
        services.AddScoped<IJoinRequestService, JoinRequestService>();
        services.AddScoped<IInvitationService, InvitationService>();
        services.AddScoped<IGroupMatchingService, GroupMatchingService>();
        services.AddScoped<GroupMembershipManager>();
        services.AddScoped<GroupEventPublisher>();

        services.AddValidatorsFromAssemblyContaining<CreateGroupRequestValidator>(includeInternalTypes: true);

        // ── REST clients (base URL: Services:User, Services:Project) ─────────
        services.AddExeServiceClient<IUserClient, UserClient>(configuration, "User");
        services.AddExeServiceClient<IProjectClient, ProjectClient>(configuration, "Project");

        // ── gRPC client (Services:Matching, HTTP/2 không TLS) ────────────────
        var matchingUrl = configuration["Services:Matching"]
                          ?? throw new InvalidOperationException("Missing configuration 'Services:Matching'.");
        services.AddSingleton<MatchingMetadataInterceptor>();
        services.AddGrpcClient<MatchingService.MatchingServiceClient>(o => o.Address = new Uri(matchingUrl))
            .AddInterceptor<MatchingMetadataInterceptor>();
        services.AddScoped<IMatchingClient, MatchingClient>();

        return services;
    }
}
