using Group.Repository.Data;
using Group.Repository.Implementations;
using Group.Repository.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Group.Repository;

public static class DependencyInjection
{
    /// <summary>DbContext (ConnectionStrings:Default) và các repository của Group Service.</summary>
    public static IServiceCollection AddGroupRepository(this IServiceCollection services, IConfiguration configuration)
    {
        // Không bật EnableRetryOnFailure: thao tác vào nhóm tự thử lại khi xung đột RowVersion,
        // còn lúc SQL Server đang khởi động thì MigrateDatabaseAsync đã có retry.
        services.AddDbContext<GroupDbContext>(options =>
            options.UseSqlServer(configuration.GetConnectionString("Default")));

        services.AddScoped<IGroupRepository, GroupRepository>();
        services.AddScoped<IJoinRequestRepository, JoinRequestRepository>();
        services.AddScoped<IInvitationRepository, InvitationRepository>();
        services.AddScoped<IGroupUnitOfWork, GroupUnitOfWork>();
        return services;
    }
}
