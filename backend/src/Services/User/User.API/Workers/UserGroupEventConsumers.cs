using Exe.BuildingBlocks.EventBus;
using Exe.Contracts.Events;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using User.Services.Interfaces;

namespace User.API.Workers;

/// <summary>
/// Consumer lắng nghe sự kiện MemberJoined từ Group Service để cập nhật UserProfile.Availability = InTeam.
/// </summary>
public sealed class MemberJoinedConsumer(IServiceProvider services)
    : EventConsumerBase<MemberJoined>(services)
{
    protected override string ConsumerGroup => "user-service";

    protected override Task HandleAsync(
        MemberJoined @event,
        EventEnvelope envelope,
        IServiceProvider services,
        CancellationToken cancellationToken) =>
        services.GetRequiredService<IUserGroupMembershipConsumerService>()
            .HandleMemberJoinedAsync(envelope.EventId, @event, cancellationToken);
}

/// <summary>
/// Consumer lắng nghe sự kiện MemberLeft từ Group Service để cập nhật UserProfile.Availability = LookingForTeam.
/// </summary>
public sealed class MemberLeftConsumer(IServiceProvider services)
    : EventConsumerBase<MemberLeft>(services)
{
    protected override string ConsumerGroup => "user-service";

    protected override Task HandleAsync(
        MemberLeft @event,
        EventEnvelope envelope,
        IServiceProvider services,
        CancellationToken cancellationToken) =>
        services.GetRequiredService<IUserGroupMembershipConsumerService>()
            .HandleMemberLeftAsync(envelope.EventId, @event, cancellationToken);
}

/// <summary>
/// Worker chạy một lần trong Development để gán kỹ năng mẫu cho 8 tài khoản sinh viên demo (student1..8@exe.local)
/// và xuất bản sự kiện UserProfileUpdated để Report Service đồng bộ Major.
/// </summary>
public sealed class DemoStudentSkillsEnricherWorker(
    IServiceScopeFactory scopeFactory,
    IEventPublisher eventPublisher,
    ILogger<DemoStudentSkillsEnricherWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        try
        {
            await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken);

            var skillMap = new Dictionary<string, (string SkillName, int Level)[]>
            {
                ["student1@exe.local"] = [(".NET Core Microservices", 5), ("Docker & Containerization", 4), ("SQL & Database Design", 4)],
                ["student2@exe.local"] = [("Python & Machine Learning", 5), ("SQL & Database Design", 4)],
                ["student3@exe.local"] = [("UI/UX & Figma Design", 5), ("Graphic Design & Branding", 4)],
                ["student4@exe.local"] = [("Digital Marketing & Growth", 5), ("Content Strategy & SEO", 4)],
                ["student5@exe.local"] = [("Business Model & Lean Startup", 5), ("Financial Planning & Pitching", 4)],
                ["student6@exe.local"] = [("React & TypeScript", 5), ("UI/UX & Figma Design", 4)],
                ["student7@exe.local"] = [("Docker & Containerization", 5), (".NET Core Microservices", 4)],
                ["student8@exe.local"] = [("Graphic Design & Branding", 5), ("UI/UX & Figma Design", 4), ("Content Strategy & SEO", 3)],
            };

            for (var attempt = 0; attempt < 6 && !stoppingToken.IsCancellationRequested; attempt++)
            {
                using var scope = scopeFactory.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<User.Repository.Data.UserDbContext>();
                if (!db.Database.IsRelational())
                {
                    return;
                }

                var allSkills = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions.ToListAsync(db.Skills, stoppingToken);
                var skillsByName = allSkills.ToDictionary(s => s.Name, s => s.Id, StringComparer.OrdinalIgnoreCase);

                var demoProfiles = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions.ToListAsync(
                    Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions.Include(
                        db.UserProfiles.Where(u => u.Email.StartsWith("student") && u.Email.EndsWith("@exe.local")),
                        u => u.Skills),
                    stoppingToken);

                if (demoProfiles.Count < 8)
                {
                    await Task.Delay(TimeSpan.FromSeconds(4), stoppingToken);
                    continue;
                }

                var now = DateTime.UtcNow;
                var updatedProfiles = new List<User.Repository.Entities.UserProfile>();

                foreach (var profile in demoProfiles)
                {
                    if (profile.Skills.Count == 0 && skillMap.TryGetValue(profile.Email, out var desiredSkills))
                    {
                        foreach (var (sName, level) in desiredSkills)
                        {
                            if (skillsByName.TryGetValue(sName, out var skillId))
                            {
                                db.UserSkills.Add(new User.Repository.Entities.UserSkill
                                {
                                    UserId = profile.UserId,
                                    SkillId = skillId,
                                    Level = level,
                                    CreatedAt = now
                                });
                            }
                        }
                        updatedProfiles.Add(profile);
                    }
                }

                if (updatedProfiles.Count > 0)
                {
                    await db.SaveChangesAsync(stoppingToken);
                    foreach (var profile in updatedProfiles)
                    {
                        await eventPublisher.PublishAsync(new UserProfileUpdated(
                            profile.UserId,
                            profile.FullName,
                            profile.Major?.ToString()
                        ), stoppingToken);
                    }
                    logger.LogInformation("Enriched {Count} demo student profiles with skills and published UserProfileUpdated events.", updatedProfiles.Count);
                }

                break;
            }
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "DemoStudentSkillsEnricherWorker encountered a non-fatal error.");
        }
    }
}
