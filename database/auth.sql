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
    WHERE [MigrationId] = N'20261015071237_InitialCreate'
)
BEGIN
    CREATE TABLE [Accounts] (
        [Id] uniqueidentifier NOT NULL,
        [Email] nvarchar(256) NOT NULL,
        [PasswordHash] nvarchar(255) NOT NULL,
        [RegistrationFullName] nvarchar(100) NOT NULL,
        [Role] nvarchar(20) NOT NULL,
        [IsActive] bit NOT NULL DEFAULT CAST(1 AS bit),
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_Accounts] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261015071237_InitialCreate'
)
BEGIN
    CREATE TABLE [OutboxMessages] (
        [Id] uniqueidentifier NOT NULL,
        [EventType] nvarchar(100) NOT NULL,
        [Payload] nvarchar(max) NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [ProcessedAt] datetime2 NULL,
        [RetryCount] int NOT NULL DEFAULT 0,
        [LastError] nvarchar(max) NULL,
        CONSTRAINT [PK_OutboxMessages] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261015071237_InitialCreate'
)
BEGIN
    CREATE TABLE [RefreshTokens] (
        [Id] uniqueidentifier NOT NULL,
        [AccountId] uniqueidentifier NOT NULL,
        [TokenHash] varchar(64) NOT NULL,
        [ExpiresAt] datetime2 NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [RevokedAt] datetime2 NULL,
        [ReplacedByTokenId] uniqueidentifier NULL,
        [RevokeReason] nvarchar(100) NULL,
        CONSTRAINT [PK_RefreshTokens] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_RefreshTokens_Accounts_AccountId] FOREIGN KEY ([AccountId]) REFERENCES [Accounts] ([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_RefreshTokens_RefreshTokens_ReplacedByTokenId] FOREIGN KEY ([ReplacedByTokenId]) REFERENCES [RefreshTokens] ([Id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261015071237_InitialCreate'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Accounts_Email] ON [Accounts] ([Email]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261015071237_InitialCreate'
)
BEGIN
    EXEC(N'CREATE INDEX [IX_OutboxMessages_ProcessedAt] ON [OutboxMessages] ([ProcessedAt]) WHERE [ProcessedAt] IS NULL');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261015071237_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_RefreshTokens_AccountId] ON [RefreshTokens] ([AccountId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261015071237_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_RefreshTokens_ReplacedByTokenId] ON [RefreshTokens] ([ReplacedByTokenId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261015071237_InitialCreate'
)
BEGIN
    CREATE UNIQUE INDEX [IX_RefreshTokens_TokenHash] ON [RefreshTokens] ([TokenHash]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261015071237_InitialCreate'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261015071237_InitialCreate', N'10.0.12');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022025826_AddEmailVerificationAndOtp'
)
BEGIN
    ALTER TABLE [Accounts] ADD [EmailConfirmed] bit NOT NULL DEFAULT CAST(0 AS bit);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022025826_AddEmailVerificationAndOtp'
)
BEGIN
    ALTER TABLE [Accounts] ADD [EmailConfirmedAt] datetime2 NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022025826_AddEmailVerificationAndOtp'
)
BEGIN
    UPDATE Accounts SET EmailConfirmed = 1, EmailConfirmedAt = CreatedAt WHERE EmailConfirmed = 0;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022025826_AddEmailVerificationAndOtp'
)
BEGIN
    CREATE TABLE [EmailVerificationChallenges] (
        [Id] uniqueidentifier NOT NULL,
        [AccountId] uniqueidentifier NOT NULL,
        [Email] nvarchar(256) NOT NULL,
        [OtpHash] varchar(64) NOT NULL,
        [Salt] varchar(64) NOT NULL,
        [ExpiresAt] datetime2 NOT NULL,
        [FailedAttempts] int NOT NULL DEFAULT 0,
        [ResendAvailableAt] datetime2 NULL,
        [IsUsed] bit NOT NULL DEFAULT CAST(0 AS bit),
        [CreatedAt] datetime2 NOT NULL,
        [UsedAt] datetime2 NULL,
        CONSTRAINT [PK_EmailVerificationChallenges] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_EmailVerificationChallenges_Accounts_AccountId] FOREIGN KEY ([AccountId]) REFERENCES [Accounts] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022025826_AddEmailVerificationAndOtp'
)
BEGIN
    CREATE INDEX [IX_EmailVerificationChallenges_AccountId] ON [EmailVerificationChallenges] ([AccountId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022025826_AddEmailVerificationAndOtp'
)
BEGIN
    CREATE INDEX [IX_EmailVerificationChallenges_Email] ON [EmailVerificationChallenges] ([Email]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022025826_AddEmailVerificationAndOtp'
)
BEGIN
    CREATE INDEX [IX_EmailVerificationChallenges_ExpiresAt] ON [EmailVerificationChallenges] ([ExpiresAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022025826_AddEmailVerificationAndOtp'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261022025826_AddEmailVerificationAndOtp', N'10.0.12');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261024013649_AddChallengePurposeToVerificationChallenge'
)
BEGIN
    ALTER TABLE [EmailVerificationChallenges] ADD [Purpose] nvarchar(30) NOT NULL DEFAULT N'EmailVerification';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261024013649_AddChallengePurposeToVerificationChallenge'
)
BEGIN
    CREATE INDEX [IX_EmailVerificationChallenges_Email_Purpose] ON [EmailVerificationChallenges] ([Email], [Purpose]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261024013649_AddChallengePurposeToVerificationChallenge'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261024013649_AddChallengePurposeToVerificationChallenge', N'10.0.12');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261107043928_Phase1RolesTermsAndProvisioning'
)
BEGIN
    ALTER TABLE [Accounts] ADD [AcceptedTermsAt] datetime2 NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261107043928_Phase1RolesTermsAndProvisioning'
)
BEGIN
    ALTER TABLE [Accounts] ADD [MustChangePassword] bit NOT NULL DEFAULT CAST(0 AS bit);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261107043928_Phase1RolesTermsAndProvisioning'
)
BEGIN
    ALTER TABLE [Accounts] ADD [StudentCode] nvarchar(32) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261107043928_Phase1RolesTermsAndProvisioning'
)
BEGIN
    DELETE FROM [Accounts] WHERE [Email] = N'admin@exe.local'; UPDATE [Accounts] SET [Role] = N'Moderator' WHERE [Role] = N'Admin';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261107043928_Phase1RolesTermsAndProvisioning'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261107043928_Phase1RolesTermsAndProvisioning', N'10.0.12');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261109115344_RemovePasswordAndOtp'
)
BEGIN
    DROP TABLE [EmailVerificationChallenges];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261109115344_RemovePasswordAndOtp'
)
BEGIN
    DECLARE @var nvarchar(max);
    SELECT @var = QUOTENAME([d].[name])
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Accounts]') AND [c].[name] = N'EmailConfirmed');
    IF @var IS NOT NULL EXEC(N'ALTER TABLE [Accounts] DROP CONSTRAINT ' + @var + ';');
    ALTER TABLE [Accounts] DROP COLUMN [EmailConfirmed];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261109115344_RemovePasswordAndOtp'
)
BEGIN
    DECLARE @var1 nvarchar(max);
    SELECT @var1 = QUOTENAME([d].[name])
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Accounts]') AND [c].[name] = N'EmailConfirmedAt');
    IF @var1 IS NOT NULL EXEC(N'ALTER TABLE [Accounts] DROP CONSTRAINT ' + @var1 + ';');
    ALTER TABLE [Accounts] DROP COLUMN [EmailConfirmedAt];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261109115344_RemovePasswordAndOtp'
)
BEGIN
    DECLARE @var2 nvarchar(max);
    SELECT @var2 = QUOTENAME([d].[name])
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Accounts]') AND [c].[name] = N'MustChangePassword');
    IF @var2 IS NOT NULL EXEC(N'ALTER TABLE [Accounts] DROP CONSTRAINT ' + @var2 + ';');
    ALTER TABLE [Accounts] DROP COLUMN [MustChangePassword];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261109115344_RemovePasswordAndOtp'
)
BEGIN
    DECLARE @var3 nvarchar(max);
    SELECT @var3 = QUOTENAME([d].[name])
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Accounts]') AND [c].[name] = N'PasswordHash');
    IF @var3 IS NOT NULL EXEC(N'ALTER TABLE [Accounts] DROP CONSTRAINT ' + @var3 + ';');
    ALTER TABLE [Accounts] DROP COLUMN [PasswordHash];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261109115344_RemovePasswordAndOtp'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261109115344_RemovePasswordAndOtp', N'10.0.12');
END;

COMMIT;
GO

