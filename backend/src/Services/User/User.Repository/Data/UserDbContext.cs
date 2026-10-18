using Microsoft.EntityFrameworkCore;
using User.Repository.Entities;
using User.Repository.Enums;

namespace User.Repository.Data;

/// <summary>
/// DbContext duy nhất của User Service — ánh xạ vào database ExeUserDb (CLAUDE.md mục 3, 6).
/// Quản lý hồ sơ người dùng (UserProfile), danh mục kỹ năng (Skill), quan hệ kỹ năng (UserSkill)
/// và ghi nhận idempotent event đã xử lý (ProcessedEvent).
/// </summary>
public class UserDbContext : DbContext
{
    public UserDbContext(DbContextOptions<UserDbContext> options) : base(options) { }

    public DbSet<UserProfile> UserProfiles => Set<UserProfile>();
    public DbSet<Skill> Skills => Set<Skill>();
    public DbSet<UserSkill> UserSkills => Set<UserSkill>();
    public DbSet<ProcessedEvent> ProcessedEvents => Set<ProcessedEvent>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // ── UserProfile Configuration ──────────────────────────────────────────
        modelBuilder.Entity<UserProfile>(entity =>
        {
            entity.ToTable("UserProfiles");
            entity.HasKey(u => u.UserId);

            // UserId lấy từ Auth Account.Id, không tự sinh giá trị
            entity.Property(u => u.UserId)
                  .ValueGeneratedNever();

            entity.Property(u => u.Email)
                  .IsRequired()
                  .HasMaxLength(256);

            entity.HasIndex(u => u.Email)
                  .IsUnique()
                  .HasDatabaseName("IX_UserProfiles_Email");

            entity.Property(u => u.FullName)
                  .IsRequired()
                  .HasMaxLength(100);

            entity.Property(u => u.Role)
                  .IsRequired()
                  .HasMaxLength(50)
                  .HasDefaultValue("Student");

            entity.Property(u => u.StudentCode)
                  .HasMaxLength(20);

            entity.HasIndex(u => u.StudentCode)
                  .IsUnique()
                  .HasFilter("[StudentCode] IS NOT NULL")
                  .HasDatabaseName("IX_UserProfiles_StudentCode");

            entity.Property(u => u.Campus)
                  .HasMaxLength(50);

            entity.Property(u => u.Major)
                  .HasConversion<string>()
                  .HasMaxLength(20);

            entity.Property(u => u.Bio)
                  .HasMaxLength(1000);

            entity.Property(u => u.DesiredRole)
                  .HasMaxLength(100);

            entity.Property(u => u.Availability)
                  .HasConversion<string>()
                  .HasMaxLength(30)
                  .IsRequired()
                  .HasDefaultValue(UserAvailability.LookingForTeam);

            entity.HasIndex(u => u.Availability)
                  .HasDatabaseName("IX_UserProfiles_Availability");

            entity.Property(u => u.Interests)
                  .HasMaxLength(500);

            entity.Property(u => u.CreatedAt)
                  .IsRequired();

            entity.Property(u => u.UpdatedAt)
                  .IsRequired();

            // Quan hệ 1 UserProfile -> N UserSkills (Cascade Delete)
            entity.HasMany(u => u.Skills)
                  .WithOne(us => us.User)
                  .HasForeignKey(us => us.UserId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // ── Skill Configuration ────────────────────────────────────────────────
        modelBuilder.Entity<Skill>(entity =>
        {
            entity.ToTable("Skills");
            entity.HasKey(s => s.Id);

            entity.Property(s => s.Name)
                  .IsRequired()
                  .HasMaxLength(100);

            entity.HasIndex(s => s.Name)
                  .IsUnique()
                  .HasDatabaseName("IX_Skills_Name");

            entity.Property(s => s.Category)
                  .HasConversion<string>()
                  .HasMaxLength(30)
                  .IsRequired();

            entity.HasIndex(s => s.Category)
                  .HasDatabaseName("IX_Skills_Category");

            entity.Property(s => s.Description)
                  .HasMaxLength(500);

            entity.Property(s => s.CreatedAt)
                  .IsRequired();

            // Quan hệ 1 Skill -> N UserSkills (Cascade Delete)
            entity.HasMany(s => s.UserSkills)
                  .WithOne(us => us.Skill)
                  .HasForeignKey(us => us.SkillId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // ── UserSkill Configuration ────────────────────────────────────────────
        modelBuilder.Entity<UserSkill>(entity =>
        {
            entity.ToTable("UserSkills");

            // Khóa chính phức hợp (UserId, SkillId)
            entity.HasKey(us => new { us.UserId, us.SkillId });

            entity.Property(us => us.Level)
                  .IsRequired()
                  .HasDefaultValue(1);

            entity.Property(us => us.CreatedAt)
                  .IsRequired();

            // Index tối ưu hóa truy vấn ngược: tìm kiếm người dùng sở hữu SkillId
            entity.HasIndex(us => us.SkillId)
                  .HasDatabaseName("IX_UserSkills_SkillId");
        });

        // ── ProcessedEvent Configuration ───────────────────────────────────────
        modelBuilder.Entity<ProcessedEvent>(entity =>
        {
            entity.ToTable("ProcessedEvents");
            entity.HasKey(e => e.EventId);

            entity.Property(e => e.EventId)
                  .ValueGeneratedNever();

            entity.Property(e => e.EventType)
                  .IsRequired()
                  .HasMaxLength(100);

            entity.Property(e => e.ProcessedAt)
                  .IsRequired();

            entity.HasIndex(e => e.ProcessedAt)
                  .HasDatabaseName("IX_ProcessedEvents_ProcessedAt");
        });
    }
}
