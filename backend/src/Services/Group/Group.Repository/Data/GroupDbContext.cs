using Group.Repository.Entities;
using Group.Repository.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Group.Repository.Data;

/// <summary>
/// DbContext duy nhất của Group Service — ánh xạ vào database ExeGroupDb (CLAUDE.md mục 3, 6).
/// </summary>
public class GroupDbContext(DbContextOptions<GroupDbContext> options) : DbContext(options)
{
    public DbSet<GroupEntity> Groups => Set<GroupEntity>();
    public DbSet<GroupMember> GroupMembers => Set<GroupMember>();
    public DbSet<RecruitmentSlot> RecruitmentSlots => Set<RecruitmentSlot>();
    public DbSet<JoinRequest> JoinRequests => Set<JoinRequest>();
    public DbSet<Invitation> Invitations => Set<Invitation>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // ── GroupEntity ────────────────────────────────────────────────────────
        modelBuilder.Entity<GroupEntity>(entity =>
        {
            entity.ToTable("Groups");
            entity.HasKey(g => g.Id);

            entity.Property(g => g.Name).IsRequired().HasMaxLength(100);
            entity.Property(g => g.Description).HasMaxLength(1000);
            entity.Property(g => g.ProjectDomain).IsRequired().HasMaxLength(50);
            entity.Property(g => g.Status).HasConversion<string>().HasMaxLength(20);
            entity.Property(g => g.RowVersion).IsRowVersion();
            entity.Ignore(g => g.IsActive);

            // BR-11: một dự án chỉ thuộc một nhóm chưa giải tán.
            entity.HasIndex(g => g.ProjectId)
                  .HasDatabaseName(GroupIndexes.ProjectId)
                  .IsUnique()
                  .HasFilter("[Status] <> 'Disbanded'");

            entity.HasIndex(g => g.Status);
            entity.HasIndex(g => g.LeaderId);
        });

        // ── GroupMember ────────────────────────────────────────────────────────
        modelBuilder.Entity<GroupMember>(entity =>
        {
            entity.ToTable("GroupMembers");
            entity.HasKey(m => new { m.GroupId, m.UserId });

            entity.Property(m => m.Role).HasConversion<string>().HasMaxLength(20);
            entity.Property(m => m.FullName).IsRequired().HasMaxLength(200);
            entity.Property(m => m.Email).IsRequired().HasMaxLength(256);

            entity.HasIndex(m => m.UserId);

            entity.HasOne(m => m.Group)
                  .WithMany(g => g.Members)
                  .HasForeignKey(m => m.GroupId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // ── RecruitmentSlot ────────────────────────────────────────────────────
        modelBuilder.Entity<RecruitmentSlot>(entity =>
        {
            entity.ToTable("RecruitmentSlots");
            entity.HasKey(s => s.Id);

            entity.Property(s => s.RequiredMajor).HasMaxLength(20);
            entity.PrimitiveCollection(s => s.RequiredSkills).HasMaxLength(2000); // lưu JSON
            entity.Ignore(s => s.IsOpen);

            entity.HasOne(s => s.Group)
                  .WithMany(g => g.Slots)
                  .HasForeignKey(s => s.GroupId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // ── JoinRequest ────────────────────────────────────────────────────────
        modelBuilder.Entity<JoinRequest>(entity =>
        {
            entity.ToTable("JoinRequests");
            entity.HasKey(r => r.Id);

            entity.Property(r => r.StudentName).IsRequired().HasMaxLength(200);
            entity.Property(r => r.StudentEmail).IsRequired().HasMaxLength(256);
            entity.Property(r => r.Message).HasMaxLength(1000);
            // UPDATE kèm "WHERE Status = <trạng thái lúc đọc>": duyệt/từ chối/hủy đồng thời thì chỉ một bên thắng.
            entity.Property(r => r.Status).HasConversion<string>().HasMaxLength(20).IsConcurrencyToken();

            entity.HasIndex(r => new { r.StudentId, r.Status });
            entity.HasIndex(r => new { r.GroupId, r.Status });

            // BR-04: chặn ở database cả khi hai request cùng qua bước kiểm tra HasPendingAsync.
            entity.HasIndex(r => new { r.StudentId, r.GroupId })
                  .HasDatabaseName(GroupIndexes.PendingJoinRequest)
                  .IsUnique()
                  .HasFilter("[Status] = 'Pending'");

            entity.HasOne(r => r.Group)
                  .WithMany()
                  .HasForeignKey(r => r.GroupId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // ── Invitation ─────────────────────────────────────────────────────────
        modelBuilder.Entity<Invitation>(entity =>
        {
            entity.ToTable("Invitations");
            entity.HasKey(i => i.Id);

            entity.Property(i => i.StudentName).IsRequired().HasMaxLength(200);
            // Chấp nhận lời mời không ghi đè được trạng thái Expired do InvitationExpiryJob vừa đặt (BR-10).
            entity.Property(i => i.Status).HasConversion<string>().HasMaxLength(20).IsConcurrencyToken();

            entity.HasIndex(i => new { i.StudentId, i.Status });
            entity.HasIndex(i => new { i.GroupId, i.Status });

            entity.HasIndex(i => new { i.StudentId, i.GroupId })
                  .HasDatabaseName(GroupIndexes.PendingInvitation)
                  .IsUnique()
                  .HasFilter("[Status] = 'Pending'");
            entity.HasIndex(i => new { i.Status, i.ExpiresAt }); // job hết hạn lời mời

            entity.HasOne(i => i.Group)
                  .WithMany()
                  .HasForeignKey(i => i.GroupId)
                  .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
