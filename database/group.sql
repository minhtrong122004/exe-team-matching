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
    WHERE [MigrationId] = N'20261021052455_InitialCreate'
)
BEGIN
    CREATE TABLE [Groups] (
        [Id] uniqueidentifier NOT NULL,
        [Name] nvarchar(100) NOT NULL,
        [Description] nvarchar(1000) NULL,
        [LeaderId] uniqueidentifier NOT NULL,
        [ProjectId] uniqueidentifier NOT NULL,
        [ProjectDomain] nvarchar(50) NOT NULL,
        [MaxMembers] int NOT NULL,
        [Status] nvarchar(20) NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_Groups] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261021052455_InitialCreate'
)
BEGIN
    CREATE TABLE [GroupMembers] (
        [GroupId] uniqueidentifier NOT NULL,
        [UserId] uniqueidentifier NOT NULL,
        [Role] nvarchar(20) NOT NULL,
        [SlotId] uniqueidentifier NULL,
        [FullName] nvarchar(200) NOT NULL,
        [Email] nvarchar(256) NOT NULL,
        [JoinedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_GroupMembers] PRIMARY KEY ([GroupId], [UserId]),
        CONSTRAINT [FK_GroupMembers_Groups_GroupId] FOREIGN KEY ([GroupId]) REFERENCES [Groups] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261021052455_InitialCreate'
)
BEGIN
    CREATE TABLE [Invitations] (
        [Id] uniqueidentifier NOT NULL,
        [GroupId] uniqueidentifier NOT NULL,
        [StudentId] uniqueidentifier NOT NULL,
        [StudentName] nvarchar(200) NOT NULL,
        [InvitedBy] uniqueidentifier NOT NULL,
        [Status] nvarchar(20) NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [ExpiresAt] datetime2 NOT NULL,
        [RespondedAt] datetime2 NULL,
        CONSTRAINT [PK_Invitations] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Invitations_Groups_GroupId] FOREIGN KEY ([GroupId]) REFERENCES [Groups] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261021052455_InitialCreate'
)
BEGIN
    CREATE TABLE [JoinRequests] (
        [Id] uniqueidentifier NOT NULL,
        [GroupId] uniqueidentifier NOT NULL,
        [SlotId] uniqueidentifier NULL,
        [StudentId] uniqueidentifier NOT NULL,
        [StudentName] nvarchar(200) NOT NULL,
        [StudentEmail] nvarchar(256) NOT NULL,
        [Message] nvarchar(1000) NULL,
        [Status] nvarchar(20) NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [DecidedAt] datetime2 NULL,
        CONSTRAINT [PK_JoinRequests] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_JoinRequests_Groups_GroupId] FOREIGN KEY ([GroupId]) REFERENCES [Groups] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261021052455_InitialCreate'
)
BEGIN
    CREATE TABLE [RecruitmentSlots] (
        [Id] uniqueidentifier NOT NULL,
        [GroupId] uniqueidentifier NOT NULL,
        [RequiredMajor] nvarchar(20) NULL,
        [RequiredSkills] nvarchar(2000) NOT NULL,
        [Quantity] int NOT NULL,
        [Filled] int NOT NULL,
        CONSTRAINT [PK_RecruitmentSlots] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_RecruitmentSlots_Groups_GroupId] FOREIGN KEY ([GroupId]) REFERENCES [Groups] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261021052455_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_GroupMembers_UserId] ON [GroupMembers] ([UserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261021052455_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_Groups_LeaderId] ON [Groups] ([LeaderId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261021052455_InitialCreate'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [IX_Groups_ProjectId] ON [Groups] ([ProjectId]) WHERE [Status] <> ''Disbanded''');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261021052455_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_Groups_Status] ON [Groups] ([Status]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261021052455_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_Invitations_GroupId_Status] ON [Invitations] ([GroupId], [Status]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261021052455_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_Invitations_Status_ExpiresAt] ON [Invitations] ([Status], [ExpiresAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261021052455_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_Invitations_StudentId_Status] ON [Invitations] ([StudentId], [Status]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261021052455_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_JoinRequests_GroupId_Status] ON [JoinRequests] ([GroupId], [Status]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261021052455_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_JoinRequests_StudentId_Status] ON [JoinRequests] ([StudentId], [Status]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261021052455_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_RecruitmentSlots_GroupId] ON [RecruitmentSlots] ([GroupId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261021052455_InitialCreate'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261021052455_InitialCreate', N'10.0.12');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261026055115_AddPendingUniqueIndexes'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [IX_JoinRequests_StudentId_GroupId_Pending] ON [JoinRequests] ([StudentId], [GroupId]) WHERE [Status] = ''Pending''');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261026055115_AddPendingUniqueIndexes'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [IX_Invitations_StudentId_GroupId_Pending] ON [Invitations] ([StudentId], [GroupId]) WHERE [Status] = ''Pending''');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261026055115_AddPendingUniqueIndexes'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261026055115_AddPendingUniqueIndexes', N'10.0.12');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261026055232_StatusConcurrencyTokens'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261026055232_StatusConcurrencyTokens', N'10.0.12');
END;

COMMIT;
GO

