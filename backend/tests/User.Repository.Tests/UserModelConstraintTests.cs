using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.Extensions.DependencyInjection;
using User.Repository;
using User.Repository.Data;
using User.Repository.Entities;
using User.Repository.Enums;
using User.Repository.Interfaces;

namespace User.Repository.Tests;

public class UserModelConstraintTests
{
    private readonly UserDbContext _dbContext;

    public UserModelConstraintTests()
    {
        var options = new DbContextOptionsBuilder<UserDbContext>()
            .UseSqlServer("Server=dummy;Database=ExeUserDb;TrustServerCertificate=True")
            .Options;

        _dbContext = new UserDbContext(options);
    }

    [Fact]
    public void UserProfileModel_ShouldHaveCorrectTableAndPrimaryKey()
    {
        var entityType = _dbContext.Model.FindEntityType(typeof(UserProfile));
        Assert.NotNull(entityType);

        Assert.Equal("UserProfiles", entityType.GetTableName());

        var primaryKey = entityType.FindPrimaryKey();
        Assert.NotNull(primaryKey);
        Assert.Single(primaryKey.Properties);
        Assert.Equal("UserId", primaryKey.Properties[0].Name);

        // UserId must not be auto-generated (it comes from Auth Service Account.Id)
        var userIdProp = primaryKey.Properties[0];
        Assert.Equal(ValueGenerated.Never, userIdProp.ValueGenerated);
    }

    [Fact]
    public void UserProfileModel_ShouldEnforceRequiredFieldsAndUniqueEmail()
    {
        var entityType = _dbContext.Model.FindEntityType(typeof(UserProfile))!;

        // Email: required, max length 256, unique index
        var emailProp = entityType.FindProperty("Email")!;
        Assert.False(emailProp.IsNullable);
        Assert.Equal(256, emailProp.GetMaxLength());

        var emailIndex = entityType.GetIndexes().FirstOrDefault(i => i.Properties.Any(p => p.Name == "Email"));
        Assert.NotNull(emailIndex);
        Assert.True(emailIndex.IsUnique);
        Assert.Equal("IX_UserProfiles_Email", emailIndex.GetDatabaseName());

        // FullName: required, max length 100
        var fullNameProp = entityType.FindProperty("FullName")!;
        Assert.False(fullNameProp.IsNullable);
        Assert.Equal(100, fullNameProp.GetMaxLength());

        // Role: required, max length 50, default "Student"
        var roleProp = entityType.FindProperty("Role")!;
        Assert.False(roleProp.IsNullable);
        Assert.Equal(50, roleProp.GetMaxLength());
        Assert.Equal("Student", roleProp.GetDefaultValue());

        // Timestamps: required
        var createdAtProp = entityType.FindProperty("CreatedAt")!;
        Assert.False(createdAtProp.IsNullable);

        var updatedAtProp = entityType.FindProperty("UpdatedAt")!;
        Assert.False(updatedAtProp.IsNullable);
    }

    [Fact]
    public void UserProfileModel_OptionalFieldsShouldBeNullable()
    {
        var entityType = _dbContext.Model.FindEntityType(typeof(UserProfile))!;

        var studentCodeProp = entityType.FindProperty("StudentCode")!;
        Assert.True(studentCodeProp.IsNullable);
        Assert.Equal(20, studentCodeProp.GetMaxLength());

        var campusProp = entityType.FindProperty("Campus")!;
        Assert.True(campusProp.IsNullable);
        Assert.Equal(50, campusProp.GetMaxLength());

        var majorProp = entityType.FindProperty("Major")!;
        Assert.True(majorProp.IsNullable);
        Assert.Equal(20, majorProp.GetMaxLength());

        var bioProp = entityType.FindProperty("Bio")!;
        Assert.True(bioProp.IsNullable);
        Assert.Equal(1000, bioProp.GetMaxLength());

        var desiredRoleProp = entityType.FindProperty("DesiredRole")!;
        Assert.True(desiredRoleProp.IsNullable);
        Assert.Equal(100, desiredRoleProp.GetMaxLength());

        var interestsProp = entityType.FindProperty("Interests")!;
        Assert.True(interestsProp.IsNullable);
        Assert.Equal(500, interestsProp.GetMaxLength());
    }

    [Fact]
    public void UserProfileModel_StudentCode_ShouldHaveFilteredUniqueIndex()
    {
        var entityType = _dbContext.Model.FindEntityType(typeof(UserProfile))!;
        var studentCodeIndex = entityType.GetIndexes().FirstOrDefault(i => i.Properties.Any(p => p.Name == "StudentCode"));

        Assert.NotNull(studentCodeIndex);
        Assert.True(studentCodeIndex.IsUnique);
        Assert.Equal("[StudentCode] IS NOT NULL", studentCodeIndex.GetFilter());
        Assert.Equal("IX_UserProfiles_StudentCode", studentCodeIndex.GetDatabaseName());
    }

    [Fact]
    public void UserProfileModel_Availability_ShouldBeConfiguredWithDefaultAndIndex()
    {
        var entityType = _dbContext.Model.FindEntityType(typeof(UserProfile))!;

        var availProp = entityType.FindProperty("Availability")!;
        Assert.False(availProp.IsNullable);
        Assert.Equal(30, availProp.GetMaxLength());
        Assert.Equal(UserAvailability.LookingForTeam, availProp.GetDefaultValue());

        var availIndex = entityType.GetIndexes().FirstOrDefault(i => i.Properties.Any(p => p.Name == "Availability"));
        Assert.NotNull(availIndex);
        Assert.False(availIndex.IsUnique);
        Assert.Equal("IX_UserProfiles_Availability", availIndex.GetDatabaseName());
    }

    [Fact]
    public void SkillModel_ShouldHaveCorrectTableKeyAndUniqueNameIndex()
    {
        var entityType = _dbContext.Model.FindEntityType(typeof(Skill));
        Assert.NotNull(entityType);

        Assert.Equal("Skills", entityType.GetTableName());

        var primaryKey = entityType.FindPrimaryKey();
        Assert.NotNull(primaryKey);
        Assert.Single(primaryKey.Properties);
        Assert.Equal("Id", primaryKey.Properties[0].Name);

        var nameProp = entityType.FindProperty("Name")!;
        Assert.False(nameProp.IsNullable);
        Assert.Equal(100, nameProp.GetMaxLength());

        var nameIndex = entityType.GetIndexes().FirstOrDefault(i => i.Properties.Any(p => p.Name == "Name"));
        Assert.NotNull(nameIndex);
        Assert.True(nameIndex.IsUnique);
        Assert.Equal("IX_Skills_Name", nameIndex.GetDatabaseName());

        var catProp = entityType.FindProperty("Category")!;
        Assert.False(catProp.IsNullable);
        Assert.Equal(30, catProp.GetMaxLength());

        var catIndex = entityType.GetIndexes().FirstOrDefault(i => i.Properties.Any(p => p.Name == "Category"));
        Assert.NotNull(catIndex);
        Assert.Equal("IX_Skills_Category", catIndex.GetDatabaseName());
    }

    [Fact]
    public void UserSkillModel_ShouldHaveCompositePrimaryKeyAndCascadeForeignKeys()
    {
        var entityType = _dbContext.Model.FindEntityType(typeof(UserSkill));
        Assert.NotNull(entityType);

        Assert.Equal("UserSkills", entityType.GetTableName());

        var primaryKey = entityType.FindPrimaryKey();
        Assert.NotNull(primaryKey);
        Assert.Equal(2, primaryKey.Properties.Count);
        Assert.Contains(primaryKey.Properties, p => p.Name == "UserId");
        Assert.Contains(primaryKey.Properties, p => p.Name == "SkillId");

        var levelProp = entityType.FindProperty("Level")!;
        Assert.False(levelProp.IsNullable);
        Assert.Equal(1, levelProp.GetDefaultValue());

        // Foreign key to UserProfile
        var userFk = entityType.GetForeignKeys()
            .FirstOrDefault(fk => fk.PrincipalEntityType.ClrType == typeof(UserProfile));
        Assert.NotNull(userFk);
        Assert.Equal(DeleteBehavior.Cascade, userFk.DeleteBehavior);

        // Foreign key to Skill
        var skillFk = entityType.GetForeignKeys()
            .FirstOrDefault(fk => fk.PrincipalEntityType.ClrType == typeof(Skill));
        Assert.NotNull(skillFk);
        Assert.Equal(DeleteBehavior.Cascade, skillFk.DeleteBehavior);

        // Index on SkillId
        var skillIdIndex = entityType.GetIndexes().FirstOrDefault(i => i.Properties.Any(p => p.Name == "SkillId"));
        Assert.NotNull(skillIdIndex);
        Assert.Equal("IX_UserSkills_SkillId", skillIdIndex.GetDatabaseName());
    }

    [Fact]
    public void ProcessedEventModel_ShouldHaveKeyAndNeverAutoGenerated()
    {
        var entityType = _dbContext.Model.FindEntityType(typeof(ProcessedEvent));
        Assert.NotNull(entityType);

        Assert.Equal("ProcessedEvents", entityType.GetTableName());

        var primaryKey = entityType.FindPrimaryKey();
        Assert.NotNull(primaryKey);
        Assert.Single(primaryKey.Properties);
        Assert.Equal("EventId", primaryKey.Properties[0].Name);

        var eventIdProp = primaryKey.Properties[0];
        Assert.Equal(ValueGenerated.Never, eventIdProp.ValueGenerated);

        var eventTypeProp = entityType.FindProperty("EventType")!;
        Assert.False(eventTypeProp.IsNullable);
        Assert.Equal(100, eventTypeProp.GetMaxLength());

        var processedAtProp = entityType.FindProperty("ProcessedAt")!;
        Assert.False(processedAtProp.IsNullable);

        var processedAtIndex = entityType.GetIndexes()
            .FirstOrDefault(i => i.Properties.Any(p => p.Name == "ProcessedAt"));
        Assert.NotNull(processedAtIndex);
        Assert.Equal("IX_ProcessedEvents_ProcessedAt", processedAtIndex.GetDatabaseName());
    }

    [Fact]
    public void AddUserRepository_ShouldRegisterAllRequiredServicesInDI()
    {
        var services = new ServiceCollection();
        services.AddUserRepository("Server=dummy;Database=ExeUserDb;TrustServerCertificate=True");

        var provider = services.BuildServiceProvider();

        Assert.NotNull(provider.GetService<UserDbContext>());
        Assert.NotNull(provider.GetService<IUserProfileRepository>());
        Assert.NotNull(provider.GetService<ISkillRepository>());
        Assert.NotNull(provider.GetService<IUserSkillRepository>());
        Assert.NotNull(provider.GetService<IProcessedEventRepository>());
        Assert.NotNull(provider.GetService<IUserUnitOfWork>());
    }
}
