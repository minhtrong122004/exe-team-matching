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
    WHERE [MigrationId] = N'20261011110805_InitialCreate'
)
BEGIN
    CREATE TABLE [Projects] (
        [Id] uniqueidentifier NOT NULL,
        [OwnerId] uniqueidentifier NOT NULL,
        [Title] nvarchar(200) NOT NULL,
        [Problem] nvarchar(2000) NOT NULL,
        [Solution] nvarchar(2000) NOT NULL,
        [Domain] nvarchar(50) NOT NULL,
        [Status] nvarchar(50) NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_Projects] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261011110805_InitialCreate'
)
BEGIN
    CREATE TABLE [ProjectTags] (
        [ProjectId] uniqueidentifier NOT NULL,
        [Tag] nvarchar(100) NOT NULL,
        CONSTRAINT [PK_ProjectTags] PRIMARY KEY ([ProjectId], [Tag]),
        CONSTRAINT [FK_ProjectTags_Projects_ProjectId] FOREIGN KEY ([ProjectId]) REFERENCES [Projects] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261011110805_InitialCreate'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261011110805_InitialCreate', N'10.0.12');
END;

COMMIT;
GO

