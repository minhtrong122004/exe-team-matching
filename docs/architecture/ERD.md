# ERD theo từng service

Mỗi service có database riêng. Quan hệ giữa các database chỉ là ID logic, không có khóa ngoại: `UserId`, `StudentId`, `LeaderId` đều là `Account.Id` do Auth Service tạo. Vì vậy mỗi service được vẽ thành một sơ đồ riêng.

## ExeGroupDb (Group Service)

```mermaid
erDiagram
    CourseSpace ||--o{ SpaceEnrollment : "ghi danh"
    CourseSpace ||--o{ Group : "có các Room"
    CourseSpace ||--o{ GroupTransferRequest : "có"
    Group ||--o{ GroupMember : "có"
    Group ||--o{ RecruitmentSlot : "có"
    Group ||--o{ JoinRequest : "nhận"
    Group ||--o{ LeaderElection : "tổ chức"
    Group ||--o{ MemberRemovalLog : "ghi lại"
    Group ||--o{ GroupTransferRequest : "chuyển đi hoặc đến"
    JoinRequest ||--o{ ApplicationVote : "được vote"
    LeaderElection ||--o{ ElectionVote : "được vote"

    CourseSpace {
        guid Id PK
        string SemesterCode UK
        string SubjectCode UK
        string Name
        int MaxMembersPerGroup
        int GroupThreshold
        decimal BufferRatio
        int MaxConcurrentApplies
        datetime RegistrationDeadline
        string Status "Draft, Open, ClosedRegistration, Locked"
    }
    SpaceEnrollment {
        guid Id PK
        guid SpaceId FK
        guid StudentId "Account.Id"
        string StudentCode
        string Email
        string FullName
        string Major
        string Cohort
        string ClassCode
        datetime EnrolledAt
    }
    Group {
        guid Id PK
        guid SpaceId FK
        string RoomCode UK
        string Name
        string Description
        guid LeaderId "Account.Id"
        guid ProjectId "Project.Id, không bắt buộc"
        string ProjectDomain
        int MaxMembers
        string Status "Empty, Forming, Recruiting, Closed, Locked"
        bool IsClosedByLeader
        binary RowVersion
    }
    GroupMember {
        guid GroupId PK
        guid UserId PK
        string Role "Leader, Member"
        guid SlotId
        string FullName
        string Email
        datetime JoinedAt
    }
    RecruitmentSlot {
        guid Id PK
        guid GroupId FK
        string RequiredMajor
        string RequiredSkills
        int Quantity
        int Filled
    }
    JoinRequest {
        guid Id PK
        guid GroupId FK
        guid SlotId
        guid StudentId
        string StudentName
        string StudentEmail
        string Message
        string Status "Pending, Accepted, Rejected, Cancelled"
        datetime CreatedAt
        datetime DecidedAt
    }
    ApplicationVote {
        guid JoinRequestId PK
        guid VoterId PK
        string VoterName
        bool IsUpvote
        string Comment
        datetime VotedAt
    }
    LeaderElection {
        guid Id PK
        guid GroupId FK
        guid CandidateId
        string CandidateName
        guid InitiatedById
        string InitiatedByName
        string Status "Active, Passed, Failed, TimedOut"
        datetime StartedAt
        datetime ExpiresAt
        datetime CompletedAt
    }
    ElectionVote {
        guid ElectionId PK
        guid VoterId PK
        string VoterName
        bool IsAgree
        datetime VotedAt
    }
    MemberRemovalLog {
        guid Id PK
        guid GroupId FK
        guid RemovedUserId
        string RemovedUserName
        string RemovedUserEmail
        guid LeaderId
        string LeaderName
        string Category
        string Reason
        datetime RemovedAt
    }
    GroupTransferRequest {
        guid Id PK
        guid SpaceId FK
        guid RequesterStudentId
        guid FromGroupId FK
        guid TargetGroupId FK
        guid SwapWithStudentId
        string Reason
        string Status "Pending, Approved, Rejected, Cancelled"
        datetime CreatedAt
        datetime DecidedAt
        guid DecidedByModeratorId
        string DecisionReason
    }
```

## ExeAuthDb (Auth Service)

```mermaid
erDiagram
    Account ||--o{ RefreshToken : "có"

    Account {
        guid Id PK
        string Email UK
        string RegistrationFullName
        string Role "Student, Moderator, Lecturer"
        string StudentCode
        datetime AcceptedTermsAt
        bool IsActive
        datetime CreatedAt
        datetime UpdatedAt
    }
    RefreshToken {
        guid Id PK
        guid AccountId FK
        string TokenHash UK
        datetime ExpiresAt
        datetime RevokedAt
        guid ReplacedByTokenId FK
        string RevokeReason
    }
    OutboxMessage {
        guid Id PK
        string EventType
        string Payload
        datetime CreatedAt
        datetime ProcessedAt
        int RetryCount
        string LastError
    }
```

## ExeUserDb (User Service)

```mermaid
erDiagram
    UserProfile ||--o{ UserSkill : "có"
    Skill ||--o{ UserSkill : "thuộc"

    UserProfile {
        guid UserId PK "Account.Id"
        string Email UK
        string FullName
        string Role
        string StudentCode UK
        string Campus
        string Major
        string Cohort
        int TechScore
        int ManagementScore
        int GraphicDesignScore
        int MarketingScore
        int SaleScore
        bool IsCommitted
        datetime CommittedAt
        bool IsProfileCompleted
        string Bio
        string DesiredRole
        string Availability
        string Interests
    }
    Skill {
        guid Id PK
        string Name UK
        string Category
        string Description
    }
    UserSkill {
        guid UserId PK
        guid SkillId PK
        int Level
    }
    ProcessedEvent {
        guid EventId PK
        string EventType
        datetime ProcessedAt
    }
```

## ExeProjectDb (Project Service)

```mermaid
erDiagram
    Project ||--o{ ProjectTag : "có"

    Project {
        guid Id PK
        guid OwnerId "Account.Id"
        string Title
        string Problem
        string Solution
        string Domain
        string Status
        datetime CreatedAt
        datetime UpdatedAt
    }
    ProjectTag {
        guid ProjectId PK
        string Tag PK
    }
```

## ExeNotificationDb (Notification Service)

```mermaid
erDiagram
    Notification {
        guid Id PK
        guid RecipientId "Account.Id"
        string Type
        string Title
        string Message
        guid RelatedEntityId
        bool IsRead
        datetime CreatedAt
    }
    EmailLog {
        guid Id PK
        string To
        string Subject
        string Body
        string Status "Pending, Sent, Failed"
        int Attempts
        string LastError
        datetime CreatedAt
        datetime SentAt
    }
    ProcessedEvent {
        guid EventId PK
        datetime ProcessedAt
    }
```

## ExeReportDb (Report Service)

Dữ liệu ở đây được dựng lại từ event, không truy vấn database của service khác.

```mermaid
erDiagram
    StudentStat {
        guid UserId PK "Account.Id"
        string Email
        string FullName
        string Major
        bool HasGroup
        guid GroupId
        datetime UpdatedAt
    }
    GroupStat {
        guid GroupId PK "Group.Id"
        string Name
        guid LeaderId
        int MemberCount
        int MaxMembers
        string Status
        datetime UpdatedAt
    }
    ReportSnapshot {
        guid Id PK
        datetime GeneratedAt
        int TotalStudents
        int StudentsInGroup
        int StudentsWithoutGroup
        int TotalGroups
        int RecruitingGroups
        int FullGroups
        string ByMajorJson
    }
    ProcessedEvent {
        guid EventId PK
        datetime ProcessedAt
    }
```
