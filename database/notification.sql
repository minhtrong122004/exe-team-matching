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
    WHERE [MigrationId] = N'20261022040417_InitialCreate'
)
BEGIN
    CREATE TABLE [EmailLogs] (
        [Id] uniqueidentifier NOT NULL,
        [To] nvarchar(256) NOT NULL,
        [Subject] nvarchar(300) NOT NULL,
        [Body] nvarchar(4000) NOT NULL,
        [Status] nvarchar(32) NOT NULL,
        [Attempts] int NOT NULL DEFAULT 0,
        [LastError] nvarchar(1000) NULL,
        [CreatedAt] datetime2 NOT NULL,
        [SentAt] datetime2 NULL,
        CONSTRAINT [PK_EmailLogs] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022040417_InitialCreate'
)
BEGIN
    CREATE TABLE [Notifications] (
        [Id] uniqueidentifier NOT NULL,
        [RecipientId] uniqueidentifier NOT NULL,
        [Type] nvarchar(64) NOT NULL,
        [Title] nvarchar(250) NOT NULL,
        [Message] nvarchar(1500) NOT NULL,
        [RelatedEntityId] uniqueidentifier NULL,
        [IsRead] bit NOT NULL DEFAULT CAST(0 AS bit),
        [CreatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_Notifications] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022040417_InitialCreate'
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
    WHERE [MigrationId] = N'20261022040417_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_EmailLogs_Status_Attempts_CreatedAt] ON [EmailLogs] ([Status], [Attempts], [CreatedAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022040417_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_Notifications_RecipientId_IsRead_CreatedAt] ON [Notifications] ([RecipientId], [IsRead], [CreatedAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022040417_InitialCreate'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261022040417_InitialCreate', N'10.0.12');
END;

COMMIT;
GO

