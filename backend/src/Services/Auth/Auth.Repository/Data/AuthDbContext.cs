using Auth.Repository.Entities;
using Microsoft.EntityFrameworkCore;

namespace Auth.Repository.Data;

/// <summary>
/// DbContext duy nhất của Auth Service — ánh xạ vào database ExeAuthDb (CLAUDE.md mục 3, 6).
/// Quản lý xác thực, tài khoản, refresh token và outbox message.
/// </summary>
public class AuthDbContext : DbContext
{
    public AuthDbContext(DbContextOptions<AuthDbContext> options) : base(options) { }

    public DbSet<Account> Accounts => Set<Account>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<OutboxMessage> OutboxMessages => Set<OutboxMessage>();
    public DbSet<EmailVerificationChallenge> EmailVerificationChallenges => Set<EmailVerificationChallenge>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // ── Account Configuration ─────────────────────────────────────────────
        modelBuilder.Entity<Account>(entity =>
        {
            entity.ToTable("Accounts");
            entity.HasKey(a => a.Id);

            entity.Property(a => a.Email)
                  .IsRequired()
                  .HasMaxLength(256);

            entity.HasIndex(a => a.Email)
                  .IsUnique()
                  .HasDatabaseName("IX_Accounts_Email");

            entity.Property(a => a.PasswordHash)
                  .IsRequired()
                  .HasMaxLength(255);

            entity.Property(a => a.RegistrationFullName)
                  .IsRequired()
                  .HasMaxLength(100);

            entity.Property(a => a.Role)
                  .HasConversion<string>()
                  .HasMaxLength(20)
                  .IsRequired();

            entity.Property(a => a.IsActive)
                  .IsRequired()
                  .HasDefaultValue(true);

            entity.Property(a => a.EmailConfirmed)
                  .IsRequired()
                  .HasDefaultValue(false);

            entity.Property(a => a.EmailConfirmedAt)
                  .IsRequired(false);

            entity.Property(a => a.CreatedAt)
                  .IsRequired();

            entity.Property(a => a.UpdatedAt)
                  .IsRequired();

            // Quan hệ 1 Account -> N RefreshTokens (Cascade Delete)
            entity.HasMany(a => a.RefreshTokens)
                  .WithOne(r => r.Account)
                  .HasForeignKey(r => r.AccountId)
                  .OnDelete(DeleteBehavior.Cascade);

            // Quan hệ 1 Account -> N VerificationChallenges (Cascade Delete)
            entity.HasMany(a => a.VerificationChallenges)
                  .WithOne(c => c.Account)
                  .HasForeignKey(c => c.AccountId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // ── EmailVerificationChallenge Configuration ───────────────────────────
        modelBuilder.Entity<EmailVerificationChallenge>(entity =>
        {
            entity.ToTable("EmailVerificationChallenges");
            entity.HasKey(c => c.Id);

            entity.Property(c => c.AccountId)
                  .IsRequired();

            entity.Property(c => c.Email)
                  .IsRequired()
                  .HasMaxLength(256);

            entity.Property(c => c.Purpose)
                  .HasConversion<string>()
                  .HasMaxLength(30)
                  .IsRequired()
                  .HasDefaultValue(Auth.Repository.Enums.ChallengePurpose.EmailVerification);

            entity.Property(c => c.OtpHash)
                  .IsRequired()
                  .HasMaxLength(64)
                  .IsUnicode(false);

            entity.Property(c => c.Salt)
                  .IsRequired()
                  .HasMaxLength(64)
                  .IsUnicode(false);

            entity.Property(c => c.ExpiresAt)
                  .IsRequired();

            entity.Property(c => c.FailedAttempts)
                  .IsRequired()
                  .HasDefaultValue(0);

            entity.Property(c => c.IsUsed)
                  .IsRequired()
                  .HasDefaultValue(false);

            entity.Property(c => c.CreatedAt)
                  .IsRequired();

            entity.HasIndex(c => c.AccountId)
                  .HasDatabaseName("IX_EmailVerificationChallenges_AccountId");

            entity.HasIndex(c => c.Email)
                  .HasDatabaseName("IX_EmailVerificationChallenges_Email");

            entity.HasIndex(c => new { c.Email, c.Purpose })
                  .HasDatabaseName("IX_EmailVerificationChallenges_Email_Purpose");

            entity.HasIndex(c => c.ExpiresAt)
                  .HasDatabaseName("IX_EmailVerificationChallenges_ExpiresAt");
        });

        // ── RefreshToken Configuration ────────────────────────────────────────
        modelBuilder.Entity<RefreshToken>(entity =>
        {
            entity.ToTable("RefreshTokens");
            entity.HasKey(r => r.Id);

            entity.Property(r => r.TokenHash)
                  .IsRequired()
                  .HasMaxLength(64)
                  .IsUnicode(false); // SHA-256 hex string chỉ cần ASCII varchar(64)

            entity.HasIndex(r => r.TokenHash)
                  .IsUnique()
                  .HasDatabaseName("IX_RefreshTokens_TokenHash");

            entity.HasIndex(r => r.AccountId)
                  .HasDatabaseName("IX_RefreshTokens_AccountId");

            entity.Property(r => r.ExpiresAt)
                  .IsRequired();

            entity.Property(r => r.CreatedAt)
                  .IsRequired();

            entity.Property(r => r.RevokeReason)
                  .HasMaxLength(100);

            // Tự liên kết để truy vết chuỗi xoay vòng token mà không lưu raw token
            entity.HasOne(r => r.ReplacedByToken)
                  .WithMany()
                  .HasForeignKey(r => r.ReplacedByTokenId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        // ── OutboxMessage Configuration ───────────────────────────────────────
        modelBuilder.Entity<OutboxMessage>(entity =>
        {
            entity.ToTable("OutboxMessages");
            entity.HasKey(m => m.Id);

            entity.Property(m => m.EventType)
                  .IsRequired()
                  .HasMaxLength(100);

            entity.Property(m => m.Payload)
                  .IsRequired();

            entity.Property(m => m.CreatedAt)
                  .IsRequired();

            entity.Property(m => m.RetryCount)
                  .IsRequired()
                  .HasDefaultValue(0);

            // Filtered index tối ưu hóa cho Worker quét các tin chưa xử lý
            entity.HasIndex(m => m.ProcessedAt)
                  .HasDatabaseName("IX_OutboxMessages_ProcessedAt")
                  .HasFilter("[ProcessedAt] IS NULL");
        });
    }
}
