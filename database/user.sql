IF OBJECT_ID(N'[__EFMigrationsHistory]') IS NULL
BEGIN
    CREATE TABLE [__EFMigrationsHistory] (
        [MigrationId] nvarchar(150) NOT NULL,
        [ProductVersion] nvarchar(32) NOT NULL,
        CONSTRAINT [PK___EFMigrationsHistory] PRIMARY KEY ([MigrationId])
    );
END;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261017042532_InitialCreate'
)
BEGIN
    CREATE TABLE [ProcessedEvents] (
        [EventId] uniqueidentifier NOT NULL,
        [EventType] nvarchar(100) NOT NULL,
        [ProcessedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_ProcessedEvents] PRIMARY KEY ([EventId])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261017042532_InitialCreate'
)
BEGIN
    CREATE TABLE [Skills] (
        [Id] uniqueidentifier NOT NULL,
        [Name] nvarchar(100) NOT NULL,
        [Category] nvarchar(30) NOT NULL,
        [Description] nvarchar(500) NULL,
        [CreatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_Skills] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261017042532_InitialCreate'
)
BEGIN
    CREATE TABLE [UserProfiles] (
        [UserId] uniqueidentifier NOT NULL,
        [Email] nvarchar(256) NOT NULL,
        [FullName] nvarchar(100) NOT NULL,
        [Role] nvarchar(50) NOT NULL DEFAULT N'Student',
        [StudentCode] nvarchar(20) NULL,
        [Campus] nvarchar(50) NULL,
        [Major] nvarchar(20) NULL,
        [Bio] nvarchar(1000) NULL,
        [DesiredRole] nvarchar(100) NULL,
        [Availability] nvarchar(30) NOT NULL DEFAULT N'LookingForTeam',
        [Interests] nvarchar(500) NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_UserProfiles] PRIMARY KEY ([UserId])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261017042532_InitialCreate'
)
BEGIN
    CREATE TABLE [UserSkills] (
        [UserId] uniqueidentifier NOT NULL,
        [SkillId] uniqueidentifier NOT NULL,
        [Level] int NOT NULL DEFAULT 1,
        [CreatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_UserSkills] PRIMARY KEY ([UserId], [SkillId]),
        CONSTRAINT [FK_UserSkills_Skills_SkillId] FOREIGN KEY ([SkillId]) REFERENCES [Skills] ([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_UserSkills_UserProfiles_UserId] FOREIGN KEY ([UserId]) REFERENCES [UserProfiles] ([UserId]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261017042532_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_ProcessedEvents_ProcessedAt] ON [ProcessedEvents] ([ProcessedAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261017042532_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_Skills_Category] ON [Skills] ([Category]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261017042532_InitialCreate'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Skills_Name] ON [Skills] ([Name]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261017042532_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_UserProfiles_Availability] ON [UserProfiles] ([Availability]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261017042532_InitialCreate'
)
BEGIN
    CREATE UNIQUE INDEX [IX_UserProfiles_Email] ON [UserProfiles] ([Email]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261017042532_InitialCreate'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [IX_UserProfiles_StudentCode] ON [UserProfiles] ([StudentCode]) WHERE [StudentCode] IS NOT NULL');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261017042532_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_UserSkills_SkillId] ON [UserSkills] ([SkillId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261017042532_InitialCreate'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261017042532_InitialCreate', N'10.0.12');
END;

COMMIT;
GO
