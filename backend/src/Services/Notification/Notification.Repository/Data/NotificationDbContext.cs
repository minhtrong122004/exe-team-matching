using Microsoft.EntityFrameworkCore;
using Notification.Repository.Entities;

namespace Notification.Repository.Data;

/// <summary>
/// DbContext của Notification Service (ExeNotificationDb - CLAUDE.md mục 6).
/// </summary>
public class NotificationDbContext(DbContextOptions<NotificationDbContext> options) : DbContext(options)
{
    public DbSet<NotificationEntity> Notifications => Set<NotificationEntity>();
    public DbSet<EmailLog> EmailLogs => Set<EmailLog>();
    public DbSet<ProcessedEvent> ProcessedEvents => Set<ProcessedEvent>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<NotificationEntity>(entity =>
        {
            entity.ToTable("Notifications");
            entity.HasKey(e => e.Id);

            entity.Property(e => e.Type)
                .HasConversion<string>()
                .HasMaxLength(64)
                .IsRequired();

            entity.Property(e => e.Title)
                .HasMaxLength(250)
                .IsRequired();

            entity.Property(e => e.Message)
                .HasMaxLength(1500)
                .IsRequired();

            entity.Property(e => e.IsRead)
                .HasDefaultValue(false)
                .IsRequired();

            entity.Property(e => e.CreatedAt)
                .IsRequired();

            entity.HasIndex(e => new { e.RecipientId, e.IsRead, e.CreatedAt })
                .HasDatabaseName("IX_Notifications_RecipientId_IsRead_CreatedAt");
        });

        modelBuilder.Entity<EmailLog>(entity =>
        {
            entity.ToTable("EmailLogs");
            entity.HasKey(e => e.Id);

            entity.Property(e => e.To)
                .HasMaxLength(256)
                .IsRequired();

            entity.Property(e => e.Subject)
                .HasMaxLength(300)
                .IsRequired();

            entity.Property(e => e.Body)
                .HasMaxLength(4000)
                .IsRequired();

            entity.Property(e => e.Status)
                .HasConversion<string>()
                .HasMaxLength(32)
                .IsRequired();

            entity.Property(e => e.Attempts)
                .HasDefaultValue(0)
                .IsRequired();

            entity.Property(e => e.LastError)
                .HasMaxLength(1000);

            entity.Property(e => e.CreatedAt)
                .IsRequired();

            entity.HasIndex(e => new { e.Status, e.Attempts, e.CreatedAt })
                .HasDatabaseName("IX_EmailLogs_Status_Attempts_CreatedAt");
        });

        modelBuilder.Entity<ProcessedEvent>(entity =>
        {
            entity.ToTable("ProcessedEvents");
            entity.HasKey(e => e.EventId);
            entity.Property(e => e.EventId).ValueGeneratedNever();
            entity.Property(e => e.ProcessedAt).IsRequired();
        });
    }
}
