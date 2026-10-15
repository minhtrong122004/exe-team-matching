using Microsoft.EntityFrameworkCore;
using Project.Repository.Entities;
using Project.Repository.Enums;

namespace Project.Repository.Data;

/// <summary>
/// DbContext duy nhất của Project Service — ánh xạ vào database ExeProjectDb.
/// Mỗi service chỉ được dùng DbContext của chính mình (CLAUDE.md mục 3).
/// </summary>
public class ProjectDbContext : DbContext
{
    public ProjectDbContext(DbContextOptions<ProjectDbContext> options) : base(options) { }

    public DbSet<ProjectEntity> Projects => Set<ProjectEntity>();
    public DbSet<ProjectTag> ProjectTags => Set<ProjectTag>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // ── ProjectEntity ──────────────────────────────────────────────────────
        modelBuilder.Entity<ProjectEntity>(entity =>
        {
            entity.ToTable("Projects");
            entity.HasKey(p => p.Id);

            entity.Property(p => p.Title)
                  .IsRequired()
                  .HasMaxLength(200);

            entity.Property(p => p.Problem)
                  .IsRequired()
                  .HasMaxLength(2000);

            entity.Property(p => p.Solution)
                  .IsRequired()
                  .HasMaxLength(2000);

            // Enum lưu dạng chuỗi để dễ đọc trong DB và Swagger
            entity.Property(p => p.Domain)
                  .HasConversion<string>()
                  .HasMaxLength(50);

            entity.Property(p => p.Status)
                  .HasConversion<string>()
                  .HasMaxLength(50);

            entity.Property(p => p.CreatedAt).IsRequired();
            entity.Property(p => p.UpdatedAt).IsRequired();
        });

        // ── ProjectTag ─────────────────────────────────────────────────────────
        modelBuilder.Entity<ProjectTag>(entity =>
        {
            entity.ToTable("ProjectTags");

            // Khóa chính phức hợp: một dự án không được có 2 tag giống nhau
            entity.HasKey(t => new { t.ProjectId, t.Tag });

            entity.Property(t => t.Tag)
                  .IsRequired()
                  .HasMaxLength(100);

            // Quan hệ: ProjectTag N ←→ 1 ProjectEntity (cascade delete)
            entity.HasOne(t => t.Project)
                  .WithMany(p => p.Tags)
                  .HasForeignKey(t => t.ProjectId)
                  .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
