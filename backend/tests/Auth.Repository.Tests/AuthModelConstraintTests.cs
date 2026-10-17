using Auth.Repository;
using Auth.Repository.Data;
using Auth.Repository.Entities;
using Auth.Repository.Enums;
using Auth.Repository.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Auth.Repository.Tests;

public class AuthModelConstraintTests
{
    private readonly AuthDbContext _dbContext;

    public AuthModelConstraintTests()
    {
        var options = new DbContextOptionsBuilder<AuthDbContext>()
            .UseSqlServer("Server=dummy;Database=ExeAuthDb;TrustServerCertificate=True")
            .Options;

        _dbContext = new AuthDbContext(options);
    }

    [Fact]
    public void AccountModel_ShouldHaveCorrectTableAndKeyConfiguration()
    {
        var entityType = _dbContext.Model.FindEntityType(typeof(Account));
        Assert.NotNull(entityType);

        Assert.Equal("Accounts", entityType.GetTableName());

        var primaryKey = entityType.FindPrimaryKey();
        Assert.NotNull(primaryKey);
        Assert.Single(primaryKey.Properties);
        Assert.Equal("Id", primaryKey.Properties[0].Name);
    }

    [Fact]
    public void AccountModel_ShouldEnforceUniqueEmailAndMaxLengths()
    {
        var entityType = _dbContext.Model.FindEntityType(typeof(Account))!;

        var emailProp = entityType.FindProperty("Email")!;
        Assert.False(emailProp.IsNullable);
        Assert.Equal(256, emailProp.GetMaxLength());

        var emailIndex = entityType.GetIndexes().FirstOrDefault(i => i.Properties.Any(p => p.Name == "Email"));
        Assert.NotNull(emailIndex);
        Assert.True(emailIndex.IsUnique);

        var passwordProp = entityType.FindProperty("PasswordHash")!;
        Assert.False(passwordProp.IsNullable);
        Assert.Equal(255, passwordProp.GetMaxLength());

        var fullNameProp = entityType.FindProperty("RegistrationFullName")!;
        Assert.False(fullNameProp.IsNullable);
        Assert.Equal(100, fullNameProp.GetMaxLength());

        var roleProp = entityType.FindProperty("Role")!;
        Assert.False(roleProp.IsNullable);
        Assert.Equal(20, roleProp.GetMaxLength());

        var isActiveProp = entityType.FindProperty("IsActive")!;
        Assert.False(isActiveProp.IsNullable);
    }

    [Fact]
    public void RefreshTokenModel_ShouldEnforceUniqueTokenHashAndForeignKey()
    {
        var entityType = _dbContext.Model.FindEntityType(typeof(RefreshToken))!;

        Assert.Equal("RefreshTokens", entityType.GetTableName());

        var hashProp = entityType.FindProperty("TokenHash")!;
        Assert.False(hashProp.IsNullable);
        Assert.Equal(64, hashProp.GetMaxLength());
        Assert.False(hashProp.IsUnicode());

        var hashIndex = entityType.GetIndexes().FirstOrDefault(i => i.Properties.Any(p => p.Name == "TokenHash"));
        Assert.NotNull(hashIndex);
        Assert.True(hashIndex.IsUnique);

        var foreignKey = entityType.GetForeignKeys()
            .FirstOrDefault(fk => fk.PrincipalEntityType.ClrType == typeof(Account));
        Assert.NotNull(foreignKey);
        Assert.Equal(DeleteBehavior.Cascade, foreignKey.DeleteBehavior);
    }

    [Fact]
    public void OutboxMessageModel_ShouldHaveFilteredIndexOnProcessedAt()
    {
        var entityType = _dbContext.Model.FindEntityType(typeof(OutboxMessage))!;

        Assert.Equal("OutboxMessages", entityType.GetTableName());

        var processedAtIndex = entityType.GetIndexes()
            .FirstOrDefault(i => i.Properties.Any(p => p.Name == "ProcessedAt"));

        Assert.NotNull(processedAtIndex);
        Assert.Equal("[ProcessedAt] IS NULL", processedAtIndex.GetFilter());
    }

    [Fact]
    public void AddAuthRepository_ShouldRegisterAllRequiredServices()
    {
        var services = new ServiceCollection();
        services.AddAuthRepository("Server=dummy;Database=ExeAuthDb;TrustServerCertificate=True");

        var provider = services.BuildServiceProvider();

        Assert.NotNull(provider.GetService<AuthDbContext>());
        Assert.NotNull(provider.GetService<IAccountRepository>());
        Assert.NotNull(provider.GetService<IRefreshTokenRepository>());
        Assert.NotNull(provider.GetService<IOutboxRepository>());
        Assert.NotNull(provider.GetService<IUnitOfWork>());
    }
}
