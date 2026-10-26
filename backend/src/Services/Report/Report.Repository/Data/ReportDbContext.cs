using Microsoft.EntityFrameworkCore;
using Report.Repository.Entities;

namespace Report.Repository.Data;

public class ReportDbContext : DbContext
{
    public ReportDbContext(DbContextOptions<ReportDbContext> options) : base(options)
    {
    }

    public DbSet<StudentStat> StudentStats => Set<StudentStat>();
    public DbSet<GroupStat> GroupStats => Set<GroupStat>();
    public DbSet<ReportSnapshot> ReportSnapshots => Set<ReportSnapshot>();
    public DbSet<ProcessedEvent> ProcessedEvents => Set<ProcessedEvent>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<StudentStat>(b =>
        {
            b.ToTable("StudentStats");
            b.HasKey(x => x.UserId);
            b.Property(x => x.Email).IsRequired().HasMaxLength(256);
            b.Property(x => x.FullName).IsRequired().HasMaxLength(200);
            b.Property(x => x.Major).HasMaxLength(32);
            b.Property(x => x.HasGroup).HasDefaultValue(false);
            b.Property(x => x.UpdatedAt).IsRequired();
            b.HasIndex(x => new { x.HasGroup, x.Major });
        });

        modelBuilder.Entity<GroupStat>(b =>
        {
            b.ToTable("GroupStats");
            b.HasKey(x => x.GroupId);
            b.Property(x => x.Name).IsRequired().HasMaxLength(200);
            b.Property(x => x.LeaderId).IsRequired();
            b.Property(x => x.MemberCount).IsRequired();
            b.Property(x => x.MaxMembers).IsRequired();
            b.Property(x => x.Status)
                .HasConversion<string>()
                .IsRequired()
                .HasMaxLength(32);
            b.Property(x => x.UpdatedAt).IsRequired();
            b.HasIndex(x => x.Status);
        });

        modelBuilder.Entity<ReportSnapshot>(b =>
        {
            b.ToTable("ReportSnapshots");
            b.HasKey(x => x.Id);
            b.Property(x => x.GeneratedAt).IsRequired();
            b.Property(x => x.ByMajorJson).IsRequired().HasMaxLength(4000);
            b.HasIndex(x => x.GeneratedAt);
        });

        modelBuilder.Entity<ProcessedEvent>(b =>
        {
            b.ToTable("ProcessedEvents");
            b.HasKey(x => x.EventId);
            b.Property(x => x.ProcessedAt).IsRequired();
        });
    }
}
