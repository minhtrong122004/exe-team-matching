SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO
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

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261108052108_Phase3CourseSpaceAndRooms'
)
BEGIN
    DROP INDEX [IX_Groups_ProjectId] ON [Groups];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261108052108_Phase3CourseSpaceAndRooms'
)
BEGIN
    DECLARE @var nvarchar(max);
    SELECT @var = QUOTENAME([d].[name])
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Groups]') AND [c].[name] = N'ProjectId');
    IF @var IS NOT NULL EXEC(N'ALTER TABLE [Groups] DROP CONSTRAINT ' + @var + ';');
    ALTER TABLE [Groups] ALTER COLUMN [ProjectId] uniqueidentifier NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261108052108_Phase3CourseSpaceAndRooms'
)
BEGIN
    DECLARE @var1 nvarchar(max);
    SELECT @var1 = QUOTENAME([d].[name])
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Groups]') AND [c].[name] = N'ProjectDomain');
    IF @var1 IS NOT NULL EXEC(N'ALTER TABLE [Groups] DROP CONSTRAINT ' + @var1 + ';');
    ALTER TABLE [Groups] ALTER COLUMN [ProjectDomain] nvarchar(50) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261108052108_Phase3CourseSpaceAndRooms'
)
BEGIN
    DECLARE @var2 nvarchar(max);
    SELECT @var2 = QUOTENAME([d].[name])
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Groups]') AND [c].[name] = N'LeaderId');
    IF @var2 IS NOT NULL EXEC(N'ALTER TABLE [Groups] DROP CONSTRAINT ' + @var2 + ';');
    ALTER TABLE [Groups] ALTER COLUMN [LeaderId] uniqueidentifier NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261108052108_Phase3CourseSpaceAndRooms'
)
BEGIN
    ALTER TABLE [Groups] ADD [IsClosedByLeader] bit NOT NULL DEFAULT CAST(0 AS bit);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261108052108_Phase3CourseSpaceAndRooms'
)
BEGIN
    ALTER TABLE [Groups] ADD [RoomCode] nvarchar(50) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261108052108_Phase3CourseSpaceAndRooms'
)
BEGIN
    ALTER TABLE [Groups] ADD [SpaceId] uniqueidentifier NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261108052108_Phase3CourseSpaceAndRooms'
)
BEGIN
    CREATE TABLE [CourseSpaces] (
        [Id] uniqueidentifier NOT NULL,
        [SemesterCode] nvarchar(20) NOT NULL,
        [SubjectCode] nvarchar(20) NOT NULL,
        [Name] nvarchar(100) NOT NULL,
        [MaxMembersPerGroup] int NOT NULL,
        [GroupThreshold] int NOT NULL,
        [BufferRatio] decimal(5,2) NOT NULL,
        [MaxConcurrentApplies] int NOT NULL,
        [RegistrationDeadline] datetime2 NOT NULL,
        [Status] nvarchar(30) NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_CourseSpaces] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261108052108_Phase3CourseSpaceAndRooms'
)
BEGIN
    CREATE TABLE [SpaceEnrollments] (
        [Id] uniqueidentifier NOT NULL,
        [SpaceId] uniqueidentifier NOT NULL,
        [StudentId] uniqueidentifier NOT NULL,
        [StudentCode] nvarchar(20) NOT NULL,
        [Email] nvarchar(256) NOT NULL,
        [FullName] nvarchar(200) NOT NULL,
        [Major] nvarchar(20) NOT NULL,
        [Cohort] nvarchar(10) NOT NULL,
        [ClassCode] nvarchar(50) NULL,
        [EnrolledAt] datetime2 NOT NULL,
        CONSTRAINT [PK_SpaceEnrollments] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_SpaceEnrollments_CourseSpaces_SpaceId] FOREIGN KEY ([SpaceId]) REFERENCES [CourseSpaces] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261108052108_Phase3CourseSpaceAndRooms'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [IX_Groups_ProjectId] ON [Groups] ([ProjectId]) WHERE [ProjectId] IS NOT NULL AND [Status] <> ''Disbanded''');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261108052108_Phase3CourseSpaceAndRooms'
)
BEGIN
    CREATE INDEX [IX_Groups_SpaceId] ON [Groups] ([SpaceId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261108052108_Phase3CourseSpaceAndRooms'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [IX_Groups_SpaceId_RoomCode] ON [Groups] ([SpaceId], [RoomCode]) WHERE [SpaceId] IS NOT NULL AND [RoomCode] IS NOT NULL');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261108052108_Phase3CourseSpaceAndRooms'
)
BEGIN
    CREATE UNIQUE INDEX [IX_CourseSpaces_SemesterCode_SubjectCode] ON [CourseSpaces] ([SemesterCode], [SubjectCode]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261108052108_Phase3CourseSpaceAndRooms'
)
BEGIN
    CREATE INDEX [IX_CourseSpaces_Status] ON [CourseSpaces] ([Status]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261108052108_Phase3CourseSpaceAndRooms'
)
BEGIN
    CREATE UNIQUE INDEX [IX_SpaceEnrollments_SpaceId_StudentCode] ON [SpaceEnrollments] ([SpaceId], [StudentCode]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261108052108_Phase3CourseSpaceAndRooms'
)
BEGIN
    CREATE UNIQUE INDEX [IX_SpaceEnrollments_SpaceId_StudentId] ON [SpaceEnrollments] ([SpaceId], [StudentId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261108052108_Phase3CourseSpaceAndRooms'
)
BEGIN
    ALTER TABLE [Groups] ADD CONSTRAINT [FK_Groups_CourseSpaces_SpaceId] FOREIGN KEY ([SpaceId]) REFERENCES [CourseSpaces] ([Id]) ON DELETE SET NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261108052108_Phase3CourseSpaceAndRooms'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261108052108_Phase3CourseSpaceAndRooms', N'10.0.12');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261108072526_Phase4RoomGroupLifecycleAndVoting'
)
BEGIN
    CREATE TABLE [ApplicationVotes] (
        [JoinRequestId] uniqueidentifier NOT NULL,
        [VoterId] uniqueidentifier NOT NULL,
        [VoterName] nvarchar(200) NOT NULL,
        [IsUpvote] bit NOT NULL,
        [Comment] nvarchar(500) NULL,
        [VotedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_ApplicationVotes] PRIMARY KEY ([JoinRequestId], [VoterId]),
        CONSTRAINT [FK_ApplicationVotes_JoinRequests_JoinRequestId] FOREIGN KEY ([JoinRequestId]) REFERENCES [JoinRequests] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261108072526_Phase4RoomGroupLifecycleAndVoting'
)
BEGIN
    CREATE TABLE [LeaderElections] (
        [Id] uniqueidentifier NOT NULL,
        [GroupId] uniqueidentifier NOT NULL,
        [CandidateId] uniqueidentifier NOT NULL,
        [CandidateName] nvarchar(200) NOT NULL,
        [InitiatedById] uniqueidentifier NOT NULL,
        [InitiatedByName] nvarchar(200) NOT NULL,
        [Status] nvarchar(20) NOT NULL,
        [StartedAt] datetime2 NOT NULL,
        [ExpiresAt] datetime2 NOT NULL,
        [CompletedAt] datetime2 NULL,
        CONSTRAINT [PK_LeaderElections] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_LeaderElections_Groups_GroupId] FOREIGN KEY ([GroupId]) REFERENCES [Groups] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261108072526_Phase4RoomGroupLifecycleAndVoting'
)
BEGIN
    CREATE TABLE [ElectionVotes] (
        [ElectionId] uniqueidentifier NOT NULL,
        [VoterId] uniqueidentifier NOT NULL,
        [VoterName] nvarchar(200) NOT NULL,
        [IsAgree] bit NOT NULL,
        [VotedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_ElectionVotes] PRIMARY KEY ([ElectionId], [VoterId]),
        CONSTRAINT [FK_ElectionVotes_LeaderElections_ElectionId] FOREIGN KEY ([ElectionId]) REFERENCES [LeaderElections] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261108072526_Phase4RoomGroupLifecycleAndVoting'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [IX_LeaderElections_GroupId_Active] ON [LeaderElections] ([GroupId], [Status]) WHERE [Status] = ''Active''');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261108072526_Phase4RoomGroupLifecycleAndVoting'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261108072526_Phase4RoomGroupLifecycleAndVoting', N'10.0.12');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261108104453_Phase4MemberRemovalAuditLog'
)
BEGIN
    CREATE TABLE [MemberRemovalLogs] (
        [Id] uniqueidentifier NOT NULL,
        [GroupId] uniqueidentifier NOT NULL,
        [RemovedUserId] uniqueidentifier NOT NULL,
        [RemovedUserName] nvarchar(200) NOT NULL,
        [RemovedUserEmail] nvarchar(256) NOT NULL,
        [LeaderId] uniqueidentifier NOT NULL,
        [LeaderName] nvarchar(200) NOT NULL,
        [Category] nvarchar(100) NOT NULL,
        [Reason] nvarchar(1000) NOT NULL,
        [RemovedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_MemberRemovalLogs] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_MemberRemovalLogs_Groups_GroupId] FOREIGN KEY ([GroupId]) REFERENCES [Groups] ([Id]) ON DELETE CASCADE
    );

    CREATE INDEX [IX_MemberRemovalLogs_GroupId] ON [MemberRemovalLogs] ([GroupId]);
    CREATE INDEX [IX_MemberRemovalLogs_RemovedUserId] ON [MemberRemovalLogs] ([RemovedUserId]);

    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261108104453_Phase4MemberRemovalAuditLog', N'10.0.12');
END;

COMMIT;
GO

-- ── Giai đoạn 5: Đồng bộ dữ liệu phòng dự phòng dư & trạng thái Chốt sổ ─────────
BEGIN TRANSACTION;
GO

SET QUOTED_IDENTIFIER ON;
GO

UPDATE [Groups]
SET [Status] = 'Closed', [UpdatedAt] = GETUTCDATE()
WHERE [Status] = 'Empty' AND (SELECT COUNT(*) FROM [GroupMembers] gm WHERE gm.[GroupId] = [Groups].[Id]) = 0;
GO

COMMIT;
GO



