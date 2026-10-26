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
    WHERE [MigrationId] = N'20261022041122_InitialCreate'
)
BEGIN
    CREATE TABLE [GroupStats] (
        [GroupId] uniqueidentifier NOT NULL,
        [Name] nvarchar(200) NOT NULL,
        [LeaderId] uniqueidentifier NOT NULL,
        [MemberCount] int NOT NULL,
        [MaxMembers] int NOT NULL,
        [Status] nvarchar(32) NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_GroupStats] PRIMARY KEY ([GroupId])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022041122_InitialCreate'
)
BEGIN
    CREATE TABLE [ProcessedEvents] (
        [EventId] uniqueidentifier NOT NULL,
        [ProcessedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_ProcessedEvents] PRIMARY KEY ([EventId])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022041122_InitialCreate'
)
BEGIN
    CREATE TABLE [ReportSnapshots] (
        [Id] uniqueidentifier NOT NULL,
        [GeneratedAt] datetime2 NOT NULL,
        [TotalStudents] int NOT NULL,
        [StudentsInGroup] int NOT NULL,
        [StudentsWithoutGroup] int NOT NULL,
        [TotalGroups] int NOT NULL,
        [RecruitingGroups] int NOT NULL,
        [FullGroups] int NOT NULL,
        [ByMajorJson] nvarchar(4000) NOT NULL,
        CONSTRAINT [PK_ReportSnapshots] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022041122_InitialCreate'
)
BEGIN
    CREATE TABLE [StudentStats] (
        [UserId] uniqueidentifier NOT NULL,
        [Email] nvarchar(256) NOT NULL,
        [FullName] nvarchar(200) NOT NULL,
        [Major] nvarchar(32) NULL,
        [HasGroup] bit NOT NULL DEFAULT CAST(0 AS bit),
        [GroupId] uniqueidentifier NULL,
        [UpdatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_StudentStats] PRIMARY KEY ([UserId])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022041122_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_GroupStats_Status] ON [GroupStats] ([Status]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022041122_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_ReportSnapshots_GeneratedAt] ON [ReportSnapshots] ([GeneratedAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022041122_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_StudentStats_HasGroup_Major] ON [StudentStats] ([HasGroup], [Major]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022041122_InitialCreate'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261022041122_InitialCreate', N'10.0.12');
END;

COMMIT;
GO

