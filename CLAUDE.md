# EXE Team Matching System — Tổng quan dự án

> Đặt file này ở thư mục gốc repo với tên `CLAUDE.md`. Đây là nguồn thông tin duy nhất về
> kiến trúc, quy ước và phạm vi dự án. Đọc hết file trước khi tạo hoặc sửa code.

## 1. Dự án làm gì

Hệ thống web phân tán giúp sinh viên Đại học FPT ghép nhóm đa ngành cho môn EXE
(Experiential Entrepreneurship). Sinh viên tạo hồ sơ kỹ năng, tạo hoặc tham gia nhóm theo một
ý tưởng dự án, và được gợi ý nhóm hoặc ứng viên theo điểm phù hợp (matching score).
Giảng viên và admin xem báo cáo tình hình ghép nhóm.

Đây là **PRN232 Final Assignment**. Mỗi lựa chọn thiết kế bên dưới đều nhằm thể hiện một yêu
cầu được chấm điểm:

| Yêu cầu của Assignment | Thể hiện ở đâu |
|---|---|
| ASP.NET Core REST API, CRUD, layered architecture | Auth, User, Project, Group, Notification, Report service |
| JWT authentication | Auth Service cấp token; Gateway và mọi service đều kiểm tra token |
| Search, filter, sort, pagination | Các API `GET` danh sách của User, Project, Group, Report |
| Background job | Notification Service (nhận event + gửi email), Report Service (tạo báo cáo định kỳ), Group Service (hết hạn lời mời) |
| Message broker (Kafka **hoặc Redis**) có producer + consumer | **Redis Streams** — producer: Auth, User, Group; consumer: User, Notification, Report |
| gRPC service độc lập + tương tác REST↔gRPC | **Matching Service** (gRPC), được Group Service (REST) gọi |
| SQL Server + EF Core | Một container SQL Server, mỗi service một database, dùng EF Core migrations |
| DI, configuration, logging, exception handling | Mọi service (DI có sẵn, `appsettings` + biến môi trường, `ILogger`, middleware xử lý lỗi chung) |
| Docker | Mỗi service một Dockerfile + một `docker-compose.yml` cho toàn hệ thống |
| Swagger / OpenAPI | Mọi REST service có Swagger ở môi trường Development |

> **Không dùng RabbitMQ.** Đề bài chỉ cho phép Apache Kafka hoặc Redis (Pub/Sub hoặc Streams).
> Dự án dùng Redis Streams.

## 2. Các service và người phụ trách

| # | Service | Phụ trách | Loại | Database | Nhiệm vụ |
|---|---|---|---|---|---|
| 1 | **Auth Service** | Vy | REST | `ExeAuthDb` | Đăng ký, đăng nhập, refresh token, đăng xuất, vai trò, khóa/mở khóa tài khoản. Phát `UserRegistered`. |
| 2 | **User Service** | Vy | REST | `ExeUserDb` | Hồ sơ sinh viên/giảng viên: chuyên ngành, kỹ năng, vai trò mong muốn, lĩnh vực quan tâm, trạng thái tìm nhóm. Tìm kiếm ứng viên. |
| 3 | **Matching Service** | Trọng | **gRPC** | không có (stateless) | Tính điểm phù hợp sinh viên↔nhóm và xếp hạng. |
| 4 | **Group Service** | Trọng | REST + gRPC client | `ExeGroupDb` | Nhóm, vị trí tuyển, thành viên, yêu cầu tham gia, lời mời. Luồng nghiệp vụ chính. |
| 5 | **Notification Service** | Phú | REST + background | `ExeNotificationDb` | Nhận event, lưu thông báo trong app, gửi email. |
| 6 | **Project Service** | Tú | REST | `ExeProjectDb` | Ý tưởng dự án EXE: vấn đề, giải pháp, lĩnh vực, tag, trạng thái. |
| 7 | **Report Service** | Phú | REST + background | `ExeReportDb` | Tự xây dữ liệu thống kê từ event và tạo báo cáo ghép nhóm định kỳ (xuất CSV). |
| – | **API Gateway** | Vy | YARP | không có | Cổng vào duy nhất cho web app, kiểm tra JWT, định tuyến. Không chứa nghiệp vụ. |
| – | **Web App** | Tú | React | – | Giao diện cho mọi vai trò. |

Container hạ tầng: `sqlserver`, `redis`, `mailhog` (SMTP server chạy local, có hộp thư web để demo).

### Vai trò
- `Student` — vai trò mặc định. Sinh viên trở thành **Team Leader** của nhóm mình tạo (không phải vai trò riêng; kiểm tra bằng `Group.LeaderId`).
- `Lecturer` — xem báo cáo, danh sách nhóm và sinh viên.
- `Admin` — quản lý tài khoản, xem báo cáo.

### Ngoài phạm vi (không làm)
Quản lý học vụ (học kỳ, lớp, deadline), Google OAuth (chỉ làm thêm khi mọi thứ khác đã xong),
chat realtime, upload CV, app mobile, thanh toán, tích hợp FAP.

## 3. Kiến trúc

```
Web App (React)
   │ HTTPS / REST
API Gateway (YARP, kiểm tra JWT)
   ├── /api/auth/**                         → Auth Service ──────► ExeAuthDb
   ├── /api/users/**, /api/skills/**        → User Service ──────► ExeUserDb
   ├── /api/projects/**                     → Project Service ───► ExeProjectDb
   ├── /api/groups/**, /api/join-requests/**,
   │   /api/invitations/**                  → Group Service ─────► ExeGroupDb
   │                                              ├─ REST → User Service    (hồ sơ sinh viên)
   │                                              ├─ REST → Project Service (lĩnh vực dự án, kiểm tra)
   │                                              └─ gRPC → Matching Service (điểm, xếp hạng)
   ├── /api/notifications/**                → Notification Service ► ExeNotificationDb ──SMTP──► MailHog
   └── /api/reports/**                      → Report Service ────► ExeReportDb

Redis Streams (event bus)
   producer: Auth, User, Group
   consumer: User, Notification, Report
```

### Quy tắc bắt buộc
1. **Mỗi service một database.** Service chỉ kết nối tới database của chính nó. Không bao giờ
   truy vấn bảng của service khác. Cần dữ liệu của service khác thì gọi REST API, gọi gRPC,
   hoặc tự lưu bản sao dựng từ event.
2. Matching Service **không có database** và không gọi ra ngoài. Group Service gom đủ dữ liệu
   đầu vào rồi gửi kèm trong request gRPC.
3. Gateway không chứa nghiệp vụ.
4. Gọi đồng bộ chỉ gồm: Gateway → các service, Group → User, Group → Project, Group → Matching.
   Mọi giao tiếp khác đi bất đồng bộ qua Redis Streams.
5. Gửi email không bao giờ làm chậm request của người dùng. Gửi email lỗi không được làm thất bại thao tác nghiệp vụ.

## 4. Cấu trúc repo

```
exe-team-matching/
├── CLAUDE.md
├── README.md
├── docker-compose.yml                 # chạy toàn hệ thống (backend + frontend + hạ tầng)
├── .env.example
├── .gitignore
├── database/                          # script SQL xuất từ migrations
├── docs/
│   ├── architecture/                  # C0, C1
│   └── openapi/                       # file OpenAPI xuất từ Swagger
├── backend/
│   ├── ExeTeamMatching.sln
│   ├── Directory.Build.props          # TargetFramework net10.0 chung
│   ├── Directory.Packages.props       # quản lý version package tập trung
│   ├── src/
│   │   ├── BuildingBlocks/
│   │   │   ├── Exe.BuildingBlocks/    # phần dùng chung (không chứa nghiệp vụ)
│   │   │   │   ├── EventBus/          # IEventPublisher, RedisStreamsEventBus, EventConsumerBase<T>
│   │   │   │   ├── Auth/              # extension AddExeJwtAuthentication()
│   │   │   │   ├── Web/               # GlobalExceptionHandler, ProblemDetails, exception dùng chung, ICurrentUser
│   │   │   │   ├── Paging/            # PagedRequest, PagedResult<T>
│   │   │   │   └── Persistence/       # extension MigrateDatabase<TContext>()
│   │   │   └── Exe.Contracts/         # chỉ chứa contract dùng chung
│   │   │       ├── Events/            # các record event (mục 7)
│   │   │       └── Protos/matching.proto  # contract gRPC (mục 8)
│   │   ├── ApiGateway/
│   │   │   └── Exe.ApiGateway/
│   │   └── Services/
│   │       ├── Auth/
│   │       │   ├── Auth.API/
│   │       │   ├── Auth.Services/
│   │       │   └── Auth.Repository/
│   │       ├── User/            (3 project giống trên)
│   │       ├── Project/         (3 project giống trên)
│   │       ├── Group/           (3 project giống trên)
│   │       ├── Notification/    (3 project giống trên)
│   │       ├── Report/          (3 project giống trên)
│   │       └── Matching/
│   │           ├── Matching.Grpc/      # gRPC host
│   │           └── Matching.Services/  # logic tính điểm, C# thuần (không có Repository)
│   └── tests/
│       └── Matching.Services.Tests/    # xUnit cho công thức Matching
└── frontend/                           # React + Vite + TypeScript
```

- Dockerfile của các service .NET build với context là `backend/` (để copy được `BuildingBlocks` và `Contracts`).
- Mọi đường dẫn `src/...` trong file này được hiểu là `backend/src/...`.

## 5. Kiến trúc 3 lớp trong mỗi service (API – Services – Repository)

Đề bài yêu cầu đúng 3 lớp: **API – Services – Repository**. Mỗi service gồm 3 project:

| Lớp | Chứa gì | Tham chiếu tới |
|---|---|---|
| `X.API` | `Controllers/`, `Workers/` (event consumer và job định kỳ, viết bằng `BackgroundService`, chỉ gọi lớp Services), `Program.cs` (đăng ký DI), Swagger, middleware | X.Services, X.Repository (chỉ để đăng ký DI), Exe.BuildingBlocks |
| `X.Services` | `Interfaces/` + `Implementations/` (vd. `IGroupService`, `GroupService`), `DTOs/` (Request/Response), `Validators/` (FluentValidation), `Exceptions/`, kiểm tra business rule, `Clients/` (gọi service khác: `IUserClient` bằng typed `HttpClient`, `IMatchingClient` bằng gRPC), gửi email (Notification), publish event qua `IEventPublisher` | X.Repository, Exe.Contracts, Exe.BuildingBlocks |
| `X.Repository` | `Entities/`, `Enums/`, `Data/` (`DbContext`, cấu hình entity, seed), `Migrations/`, `Interfaces/` + `Implementations/` của repository (vd. `IGroupRepository`, `GroupRepository`) | Exe.BuildingBlocks |

Chiều gọi chỉ đi một hướng: **Controller / Worker → Service → Repository → SQL Server**.
- Controller và Worker **không** dùng `DbContext` hay repository trực tiếp; luôn đi qua lớp Services.
- Lớp Repository không chứa nghiệp vụ và không biết lớp Services.
- Lớp Services không biết HTTP (không dùng `HttpContext`, `IActionResult`); thông tin người dùng hiện tại lấy qua `ICurrentUser` của BuildingBlocks.

Giữ đơn giản: **không dùng MediatR, không CQRS, không AutoMapper.** Map DTO thủ công hoặc bằng
extension method nhỏ.

## 6. Dữ liệu của từng service

Mọi ID là `Guid`. Mọi thời gian là UTC (`DateTime` với `UtcNow`). ID người dùng giống nhau ở mọi
service (Auth tạo ra và truyền đi qua event `UserRegistered`).

### Auth (`ExeAuthDb`)
- `Account`: Id, Email (unique), PasswordHash (BCrypt), FullName, Role (`Student|Lecturer|Admin`), IsActive, CreatedAt
- `RefreshToken`: Id, AccountId, Token, ExpiresAt, RevokedAt

### User (`ExeUserDb`)
- `UserProfile`: UserId (PK), FullName, Email, StudentCode, Major (`SE|AI|IA|GD|MKT|IB|Other`), Bio, DesiredRole, Availability (`LookingForTeam|InTeam|NotLooking`), Interests (danh sách `ProjectDomain`), UpdatedAt
- `Skill`: Id, Name (unique), Category (`Technical|Design|Business|Marketing`)
- `UserSkill`: UserId, SkillId, Level (1–5)

### Project (`ExeProjectDb`)
- `Project`: Id, OwnerId, Title, Problem, Solution, Domain (`EdTech|FinTech|ECommerce|FnB|Health|Tourism|Other`), Status (`Draft|Recruiting|Active|Completed|Cancelled`), CreatedAt, UpdatedAt
- `ProjectTag`: ProjectId, Tag

### Group (`ExeGroupDb`)
- `Group`: Id, Name, LeaderId, ProjectId (unique: 1 dự án ↔ 1 nhóm), MaxMembers (4–6), Status (`Recruiting|Full|Locked|Disbanded`), CreatedAt, **RowVersion** (concurrency token)
- `GroupMember`: GroupId, UserId, Role (`Leader|Member`), JoinedAt
- `RecruitmentSlot`: Id, GroupId, RequiredMajor, RequiredSkills (danh sách tên kỹ năng), Quantity, Filled
- `JoinRequest`: Id, GroupId, SlotId (nullable), StudentId, Message, Status (`Pending|Accepted|Rejected|Cancelled`), CreatedAt, DecidedAt
- `Invitation`: Id, GroupId, StudentId, InvitedBy, Status (`Pending|Accepted|Rejected|Cancelled|Expired`), CreatedAt, ExpiresAt

### Notification (`ExeNotificationDb`)
- `Notification`: Id, RecipientId, Type, Title, Message, RelatedEntityId, IsRead, CreatedAt
- `EmailLog`: Id, To, Subject, Status (`Pending|Sent|Failed`), Attempts, LastError, SentAt
- `ProcessedEvent`: EventId (PK), ProcessedAt — để consumer không xử lý trùng event

### Report (`ExeReportDb`) — dữ liệu thống kê chỉ dựng từ event
- `StudentStat`: UserId, FullName, Email, Major, HasGroup, GroupId
- `GroupStat`: GroupId, Name, MemberCount, MaxMembers, Status
- `ReportSnapshot`: Id, GeneratedAt, TotalStudents, StudentsWithGroup, StudentsWithoutGroup, TotalGroups, FullGroups, MajorBreakdownJson
- `ProcessedEvent`: EventId (PK), ProcessedAt

## 7. Event (Redis Streams)

### Cấu trúc chung
Mỗi event được publish thành một entry trong stream, gồm các field:
`eventId`, `eventType`, `occurredAt`, `correlationId`, `payload` (JSON của record bên dưới).

- Tên stream: `exe:events:{EventType}` (ví dụ `exe:events:MemberJoined`).
- Mỗi service nhận event dùng **consumer group** riêng, đặt theo tên service (`notification-service`, `report-service`, `user-service`).
- Consumer đọc bằng `XREADGROUP`, xử lý xong rồi mới `XACK`, và **chỉ ACK sau khi** transaction database đã commit. Entry chưa ACK sẽ được xử lý lại khi service khởi động lại.
- Consumer phải idempotent: bỏ qua event có `eventId` đã nằm trong `ProcessedEvent`.
- Payload chứa sẵn email và tên người nhận, để Notification không phải gọi sang User Service.

### Danh sách event

| Event | Service phát | Service nhận | Payload |
|---|---|---|---|
| `UserRegistered` | Auth | User (tạo hồ sơ trống), Notification (email chào mừng), Report | UserId, Email, FullName, Role |
| `UserProfileUpdated` | User | Report | UserId, FullName, Major |
| `GroupCreated` | Group | Report | GroupId, Name, LeaderId, MaxMembers |
| `JoinRequestCreated` | Group | Notification | RequestId, GroupId, GroupName, StudentId, StudentName, LeaderId, LeaderEmail, LeaderName |
| `JoinRequestDecided` | Group | Notification | RequestId, GroupId, GroupName, StudentId, StudentEmail, StudentName, Accepted (bool) |
| `InvitationCreated` | Group | Notification | InvitationId, GroupId, GroupName, StudentId, StudentEmail, StudentName, ExpiresAt |
| `MemberJoined` | Group | User (đặt `InTeam`), Notification, Report | GroupId, GroupName, UserId, UserEmail, UserName, MemberCount, MaxMembers |
| `MemberLeft` | Group | User (đặt `LookingForTeam`), Notification, Report | GroupId, GroupName, UserId, MemberCount |

Các record event nằm trong `Exe.Contracts/Events`, khai báo bằng `record` của C#.

## 8. gRPC — Matching Service

`backend/src/BuildingBlocks/Exe.Contracts/Protos/matching.proto`:

```proto
syntax = "proto3";
option csharp_namespace = "Exe.Contracts.Matching";
package matching.v1;

service MatchingService {
  rpc CalculateMatch (MatchRequest) returns (MatchResult);
  rpc RankGroups (RankGroupsRequest) returns (RankGroupsResponse);
  rpc RankCandidates (RankCandidatesRequest) returns (RankCandidatesResponse);
}

message StudentProfile {
  string user_id = 1;
  string major = 2;
  repeated string skills = 3;
  repeated string interests = 4;   // lĩnh vực dự án quan tâm
  string availability = 5;
}

message GroupNeed {
  string group_id = 1;
  repeated string required_majors = 2;
  repeated string required_skills = 3;
  string project_domain = 4;
}

message MatchRequest { StudentProfile student = 1; GroupNeed group = 2; }

message MatchResult {
  string user_id = 1;
  string group_id = 2;
  double score = 3;                 // 0–100
  repeated string matched_skills = 4;
  repeated string missing_skills = 5;
}

message RankGroupsRequest { StudentProfile student = 1; repeated GroupNeed groups = 2; int32 top = 3; }
message RankGroupsResponse { repeated MatchResult results = 1; }

message RankCandidatesRequest { GroupNeed group = 1; repeated StudentProfile candidates = 2; int32 top = 3; }
message RankCandidatesResponse { repeated MatchResult results = 1; }
```

### Công thức tính điểm (viết trong `Matching.Services`, có unit test)
```
score = 50 * skillScore + 30 * majorScore + 20 * domainScore

skillScore  = |kỹ năng sinh viên ∩ kỹ năng yêu cầu| / |kỹ năng yêu cầu|   (= 1.0 nếu nhóm không yêu cầu kỹ năng)
majorScore  = 1.0 nếu chuyên ngành sinh viên ∈ chuyên ngành yêu cầu, ngược lại 0.0   (= 1.0 nếu không yêu cầu)
domainScore = 1.0 nếu lĩnh vực dự án ∈ lĩnh vực sinh viên quan tâm, ngược lại 0.0
```
So sánh kỹ năng không phân biệt hoa thường. Làm tròn điểm đến 1 chữ số thập phân. Trọng số đặt
trong `appsettings.json` (`Matching:Weights`) để có thể điều chỉnh.

### Ai gọi Matching
Chỉ Group Service gọi, qua `IMatchingClient` trong `Group.Services/Clients`, implement bằng
`Grpc.Net.ClientFactory`:
- `GET /api/groups/{id}/match-score` → User (hồ sơ) + Project (lĩnh vực) → `CalculateMatch`
- `GET /api/groups/suggestions` → các nhóm đang tuyển + User (hồ sơ) → `RankGroups`
- `GET /api/groups/{id}/candidates` → User (sinh viên `LookingForTeam`) → `RankCandidates`

Trong Docker, Matching lắng nghe trên một endpoint Kestrel **chỉ HTTP/2, không TLS** (cổng 8080).
Group kết nối tới `http://matching-service:8080`.

## 9. Business rule (kiểm tra ở Group Service nếu không ghi khác)

- **BR-01** Mỗi sinh viên chỉ là thành viên của tối đa một nhóm đang hoạt động (`Recruiting|Full|Locked`).
- **BR-02** `MaxMembers` của nhóm từ 4 đến 6 (kiểm tra khi tạo/sửa).
- **BR-03** Mỗi sinh viên có tối đa 5 yêu cầu tham gia ở trạng thái `Pending` cùng lúc.
- **BR-04** Sinh viên không được có hai yêu cầu `Pending` tới cùng một nhóm, và không được gửi yêu cầu tới nhóm mình đang ở.
- **BR-05** Chỉ trưởng nhóm được duyệt/từ chối yêu cầu, gửi lời mời và xóa thành viên.
- **BR-06** Không thể chấp nhận khi `MemberCount >= MaxMembers` → trả `409 GROUP_FULL`.
- **BR-07** Khi sinh viên vào một nhóm (qua yêu cầu hoặc lời mời), mọi yêu cầu và lời mời `Pending` khác của sinh viên đó chuyển thành `Cancelled`.
- **BR-08** Khi nhóm đủ người, trạng thái nhóm thành `Full` và các yêu cầu/lời mời `Pending` của nhóm chuyển thành `Cancelled`.
- **BR-09** Trưởng nhóm không được rời nhóm; phải chuyển quyền trưởng nhóm hoặc giải tán nhóm.
- **BR-10** Lời mời `Expired` không thể chấp nhận. Một background job (mỗi 10 phút) chuyển lời mời `Pending` đã quá `ExpiresAt` sang `Expired`.
- **BR-11** Một dự án chỉ thuộc một nhóm (`ProjectId` unique); chỉ chủ dự án được tạo nhóm cho dự án đó. Group kiểm tra bằng cách gọi Project Service.
- **BR-12** Matching chỉ gợi ý, không bao giờ tự thêm sinh viên vào nhóm.

**Xử lý đồng thời:** thao tác chấp nhận/vào nhóm chạy trong một transaction và dựa vào
`Group.RowVersion`. Khi gặp `DbUpdateConcurrencyException`, tải lại dữ liệu và kiểm tra lại BR-06;
nếu nhóm đã đủ thì trả `409 GROUP_FULL`.

## 10. Danh sách REST API

Mọi route có tiền tố `/api` và đi qua Gateway (`http://localhost:5000`).

**Auth**
`POST /auth/register` · `POST /auth/login` · `POST /auth/refresh` · `POST /auth/logout` · `GET /auth/me`
Admin: `GET /auth/accounts` (search, role, isActive, phân trang) · `PUT /auth/accounts/{id}/lock` · `PUT /auth/accounts/{id}/unlock`

**User**
`GET /users/me` · `PUT /users/me` · `PUT /users/me/skills` · `GET /users/{id}`
`GET /users?search=&major=&skill=&availability=&sortBy=&sortDir=&page=&pageSize=`
`POST /users/batch` (body: danh sách ID — Group dùng) · `GET /skills`

**Project**
`GET /projects?search=&domain=&status=&ownerId=&sortBy=&sortDir=&page=&pageSize=`
`GET /projects/{id}` · `POST /projects` · `PUT /projects/{id}` · `DELETE /projects/{id}` (chỉ chủ dự án)

**Group**
`GET /groups?search=&status=&domain=&major=&sortBy=&sortDir=&page=&pageSize=` · `GET /groups/{id}` · `POST /groups` · `PUT /groups/{id}` · `DELETE /groups/{id}` (giải tán)
`GET /groups/my` · `POST /groups/{id}/slots` · `PUT /groups/{id}/slots/{slotId}` · `DELETE /groups/{id}/slots/{slotId}`
`GET /groups/{id}/match-score` · `GET /groups/suggestions` · `GET /groups/{id}/candidates`
`POST /groups/{id}/join-requests` · `GET /groups/{id}/join-requests` · `GET /join-requests/my`
`PUT /join-requests/{id}/accept` · `PUT /join-requests/{id}/reject` · `PUT /join-requests/{id}/cancel`
`POST /groups/{id}/invitations` · `GET /invitations/my` · `PUT /invitations/{id}/accept` · `PUT /invitations/{id}/reject`
`DELETE /groups/{id}/members/{userId}` · `POST /groups/{id}/leave` · `PUT /groups/{id}/leader`

**Notification**
`GET /notifications?isRead=&page=&pageSize=` · `GET /notifications/unread-count` · `PUT /notifications/{id}/read` · `PUT /notifications/read-all`

**Report** (Lecturer, Admin)
`GET /reports/summary` · `GET /reports/snapshots?from=&to=&page=&pageSize=` · `GET /reports/snapshots/{id}` · `GET /reports/snapshots/{id}/export` (CSV)
`POST /reports/snapshots/generate` (Admin — chạy job tạo báo cáo ngay, dùng khi demo thay vì chờ lịch)
`GET /reports/students-without-group?major=&page=&pageSize=` · `GET /reports/groups?status=&page=&pageSize=`

### Quy ước
- Danh từ số nhiều, kebab-case, không dùng động từ trong đường dẫn, trừ các thao tác chuyển trạng thái (`/accept`, `/reject`, `/cancel`, `/leave`).
- Tham số phân trang: `page` (mặc định 1), `pageSize` (mặc định 10, tối đa 50), `sortBy`, `sortDir` (`asc|desc`).
- Response phân trang: `{ "items": [...], "page": 1, "pageSize": 10, "totalCount": 42, "totalPages": 5, "hasPrevious": false, "hasNext": true }`.
- Lỗi theo chuẩn RFC 9457 ProblemDetails (`Content-Type: application/problem+json`), thêm field mở rộng `code`, `traceId`, `correlationId`:
  `{ "type": "https://tools.ietf.org/html/rfc9110#section-15.5.10", "title": "Conflict", "status": 409, "detail": "Group is full.", "instance": "PUT /api/join-requests/.../accept", "code": "GROUP_FULL", "traceId": "..." }`.
  - `title`: tiêu đề chung theo status (`Not Found`, `Conflict`...), **không đổi** giữa các lần lỗi. `detail`: thông báo cụ thể của lần lỗi này.
  - Lỗi validate (400) có thêm `"errors": { "maxMembers": ["Must be between 4 and 6."] }`.
  - Frontend **hiển thị `detail`** cho người dùng và **rẽ nhánh theo `code`**, không so sánh chuỗi `title`/`detail`.
- Mã trạng thái: 200, 201 (+ header `Location`), 204, 400 (dữ liệu không hợp lệ), 401, 403, 404, 409 (vi phạm business rule), 500.
- JSON dạng camelCase; enum trả về dạng chuỗi.

## 11. Phần dùng chung

- **JWT:** HS256 với một key dùng chung. `Jwt__Issuer=exe-auth`, `Jwt__Audience=exe-api`, `Jwt__Key` lấy từ biến môi trường. Claim: `sub` (user id), `email`, `name`, `role`. Access token 60 phút, refresh token 7 ngày. Mọi service kiểm tra token bằng `AddExeJwtAuthentication()`; Gateway cũng kiểm tra.
- **Gọi REST giữa các service:** typed `HttpClient` đặt trong `X.Services/Clients`; chuyển tiếp header `Authorization` của người gọi. Base URL lấy từ cấu hình (`Services__User=http://user-service:8080`). Timeout 5 giây và retry đơn giản (`Microsoft.Extensions.Http.Resilience`).
- **Logging:** dùng `ILogger<T>` có sẵn, xuất ra console (xem được bằng `docker compose logs`). Log mỗi request gồm method, path, status code, thời gian xử lý, userId và correlationId.
- **Log để demo (bắt buộc):** mỗi lần publish event, consume event, chạy background job và gọi gRPC đều phải ghi một dòng log `Information` rõ ràng, có tiền tố cố định để dễ lọc khi demo:
  `[EVENT-PUBLISH] MemberJoined eventId=... groupId=...`
  `[EVENT-CONSUME] notification-service MemberJoined eventId=...`
  `[JOB] ReportSnapshotJob started/finished snapshotId=... duration=...ms`
  `[JOB] InvitationExpiryJob expired=3`
  `[GRPC] CalculateMatch userId=... groupId=... score=78.5 duration=...ms`
- **Correlation ID:** đọc header `X-Correlation-Id` hoặc tự tạo; truyền tiếp vào các lời gọi HTTP và envelope của event.
- **Xử lý lỗi:** `GlobalExceptionHandler` (cơ chế `IExceptionHandler` + `AddProblemDetails()` có sẵn của ASP.NET Core) trong `BuildingBlocks/Web`, bật bằng `AddExeServiceDefaults()`. Lớp Services chỉ cần `throw`, controller không try/catch:
  FluentValidation `ValidationException → 400 VALIDATION_ERROR`, `BadRequestException → 400`, `UnauthorizedException → 401`, `ForbiddenException → 403`, `NotFoundException → 404`, `BusinessRuleException(code, message) → 409 <code>`, còn lại → 500 `INTERNAL_ERROR` (không trả stack trace). 401/403 của JWT và route không tồn tại cũng trả ProblemDetails. Không tự tạo class exception trùng tên trong service; dùng exception của `Exe.BuildingBlocks.Web`. Cách dùng chi tiết: `backend/src/BuildingBlocks/Exe.BuildingBlocks/README.md`.
- **Migrations:** mỗi service có EF Core migrations riêng; tự chạy khi khởi động nếu `ASPNETCORE_ENVIRONMENT=Development`. Thử kết nối lại trong lúc SQL Server đang khởi động.
- **Dữ liệu mẫu (Development):** danh sách kỹ năng (React, .NET, Java, Python, UI/UX, Figma, Content Marketing, SEO, Business Analysis, Sales…); tài khoản `admin@exe.local / Admin@123`, `lecturer@exe.local / Lecturer@123`, `student1..8@exe.local / Student@123` với nhiều chuyên ngành khác nhau.
- **Health check:** `GET /health` ở mọi service; `docker compose` dùng để kiểm tra container.
- **Swagger:** bật ở Development, có nút nhập Bearer token.

## 12. Công nghệ sử dụng

**Backend:** .NET 10 (`net10.0`, C# 14), ASP.NET Core Web API, EF Core 10 (SqlServer), Grpc.AspNetCore, Grpc.Net.ClientFactory, Google.Protobuf/Grpc.Tools, StackExchange.Redis, Yarp.ReverseProxy, FluentValidation, BCrypt.Net-Next, MailKit, Swashbuckle.AspNetCore (bản hỗ trợ .NET 10), Microsoft.Extensions.Http.Resilience, xUnit (test công thức Matching).
Mọi package Microsoft (`Microsoft.EntityFrameworkCore.*`, `Microsoft.AspNetCore.*`, `Microsoft.Extensions.*`) dùng bản 10.x cho khớp với runtime. Quản lý version tập trung bằng `Directory.Packages.props` ở thư mục `backend/`, và đặt `<TargetFramework>net10.0</TargetFramework>` chung trong `Directory.Build.props` (cũng ở `backend/`).
**Frontend:** React 18, Vite, TypeScript, React Router, Axios, TanStack Query, Ant Design.
**Hạ tầng:** SQL Server 2022, Redis 7, MailHog, Docker, Docker Compose.

## 13. Docker Compose

| Container | Image / build | Cổng ngoài | Ghi chú |
|---|---|---|---|
| `sqlserver` | `mcr.microsoft.com/mssql/server:2022-latest` | 1433 | một instance, sáu database |
| `redis` | `redis:7-alpine` | 6379 | event bus |
| `mailhog` | `mailhog/mailhog` | 8025 (giao diện), 1025 (SMTP) | hộp thư để demo |
| `api-gateway` | build | 5000 | |
| `auth-service` | build | 5001 | |
| `user-service` | build | 5002 | |
| `project-service` | build | 5003 | |
| `group-service` | build | 5004 | |
| `matching-service` | build | 5005 | gRPC, HTTP/2 |
| `notification-service` | build | 5006 | |
| `report-service` | build | 5007 | |
| `web` | build (`frontend/`) | 3000 | |

- Mọi container .NET lắng nghe cổng `8080` bên trong; các service gọi nhau bằng tên container, không dùng IP.
- Mỗi service một Dockerfile multi-stage (build bằng `mcr.microsoft.com/dotnet/sdk:10.0` → chạy bằng `mcr.microsoft.com/dotnet/aspnet:10.0`).
- Secret và connection string lấy từ `.env` (chỉ commit `.env.example`).
- `docker compose up -d --build` phải khởi động được toàn hệ thống từ một bản clone mới.

## 14. Luồng demo (đầu cuối, dùng khi thuyết trình)

1. Sinh viên A đăng ký → `UserRegistered` → User tạo hồ sơ, Notification gửi email chào mừng (xem được trong MailHog).
2. Sinh viên A điền hồ sơ và kỹ năng → `UserProfileUpdated` → Report cập nhật dữ liệu thống kê.
3. Sinh viên A tạo dự án, rồi tạo nhóm cho dự án đó kèm các vị trí cần tuyển.
4. Sinh viên B tìm nhóm (lọc + sắp xếp + phân trang) và mở một nhóm → Group gọi User + Project qua REST, rồi gọi Matching qua **gRPC** → hiện điểm, kỹ năng khớp và kỹ năng còn thiếu.
5. Sinh viên B gửi yêu cầu tham gia → `JoinRequestCreated` → Notification tạo thông báo trong app và gửi email cho trưởng nhóm.
6. Trưởng nhóm chấp nhận → `MemberJoined` → User đặt B thành `InTeam`, Report cập nhật thống kê, Notification báo cho B. Các yêu cầu đang chờ khác của B bị hủy.
7. Job của Report tạo báo cáo; giảng viên mở báo cáo và xuất CSV.
8. Một lời mời quá hạn được background job của Group chuyển sang `Expired`.

## 15. Base code — hạn 11/10

### Backend (điều kiện hoàn thành)
- [ ] Solution, `BuildingBlocks`, `Exe.Contracts`, đủ project của các service theo 3 lớp API – Services – Repository, Gateway
- [ ] `docker-compose.yml`, Dockerfile, `.env.example`; `docker compose up -d --build` chạy được mọi container và mọi `/health` trả 200
- [ ] Mỗi service có database: `DbContext`, entity theo mục 6, migration đầu tiên, tự migrate + seed ở Development
- [ ] JWT: Auth cấp token (`register`, `login`); Gateway và các service từ chối request không có token hợp lệ
- [ ] Gateway cấu hình đủ route ở mục 3
- [ ] Event bus Redis Streams trong BuildingBlocks, chạy được một luồng: `UserRegistered` → User + Notification
- [ ] Matching gRPC server có `CalculateMatch` chạy được; Group gọi nó từ `GET /groups/{id}/match-score`
- [ ] Xử lý lỗi chung (GlobalExceptionHandler + ProblemDetails), helper phân trang, Swagger ở mọi REST service
- [ ] README có đủ khung 6 mục theo mục 17 (nội dung chi tiết bổ sung dần)

### Frontend (điều kiện hoàn thành)
- [ ] Project Vite + React + TypeScript trong `frontend/`, có Dockerfile, chạy ở cổng 3000
- [ ] Axios client trỏ tới Gateway, có interceptor gắn JWT và tự refresh token
- [ ] Routing, route được bảo vệ theo vai trò; layout chính có menu
- [ ] Trang chạy được: Login, Register
- [ ] Trang khung (placeholder): Profile, Projects, Groups (danh sách/chi tiết), My Group, Join Requests, Invitations, Notifications, Reports, Admin Accounts

## 16. Cách làm việc trong repo (cho Claude Code và cả nhóm)

- Chỉ làm trong thư mục service mình được giao. Sửa `BuildingBlocks` hoặc `Exe.Contracts` sẽ ảnh hưởng cả nhóm: giữ tương thích ngược và ghi rõ trong PR.
- Không bao giờ thêm reference từ service này sang project của service khác. Các service chỉ dùng chung `Exe.Contracts` và `Exe.BuildingBlocks`.
- Không bao giờ kết nối service tới database của service khác.
- Nhánh: `main` (ổn định), `develop` (tích hợp), `feature/<service>-<tên-ngắn>`. Mở PR vào `develop`.
- Trước khi push: `dotnet build` thành công và `docker compose up` vẫn chạy được.
- Khi yêu cầu trong file này chưa rõ hoặc mâu thuẫn với code, dừng lại hỏi thay vì tự đoán.

## 17. Yêu cầu bắt buộc của giảng viên (PRN232 Final Assignment) — checklist

Mọi mục dưới đây là **bắt buộc**. Trước khi nộp, từng dòng phải được đánh dấu xong.

### 17.1 Chức năng (mục 2 của đề)
| Yêu cầu | Cách đáp ứng | Phụ trách |
|---|---|---|
| Ít nhất một ASP.NET Core REST API | 6 REST service | cả nhóm |
| Theo nguyên tắc và quy ước đặt tên RESTful | Quy ước ở mục 10 | cả nhóm |
| CRUD cho entity nghiệp vụ chính | Project, Group (+ slot), UserProfile, Account (admin) | Tú, Trọng, Vy |
| Layered architecture (API – Services – Repository) | Mỗi service có đúng 3 project `X.API`, `X.Services`, `X.Repository` (mục 5) | cả nhóm |
| JWT authentication | Auth Service cấp, mọi service kiểm tra | Vy |
| Search, filter, sort, pagination | `GET /projects`, `/groups`, `/users`, `/reports/*`, `/auth/accounts` | Tú, Trọng, Vy, Phú |
| Ít nhất một background job | Notification (nhận event, gửi email), Report (tạo báo cáo định kỳ), Group (hết hạn lời mời) | Phú, Trọng |
| Message broker: Kafka **hoặc Redis**, có ít nhất 1 producer + 1 consumer | Redis Streams; producer: Auth, User, Group; consumer: User, Notification, Report | Vy, Trọng, Phú |
| gRPC service độc lập + tương tác REST ↔ gRPC | Matching Service; Group (REST) gọi Matching (gRPC) | Trọng |

### 17.2 Triển khai (mục 3 của đề)
- Toàn hệ thống chạy bằng **Docker Desktop + Docker Compose**: `docker compose up -d --build`.
- Phải chứng minh các thành phần giao tiếp được với nhau: luồng demo ở mục 14 đi qua đủ Gateway → REST → gRPC → Redis Streams → consumer → SQL Server → MailHog.

### 17.3 Kỹ thuật (mục 4 của đề)
ASP.NET Core .NET 10 (đề yêu cầu .NET 8 trở lên) · Entity Framework Core · SQL Server · Dependency Injection ·
Configuration management (`appsettings.json` + `appsettings.Development.json` + biến môi trường, dùng Options pattern) ·
Logging và exception handling · JWT · RESTful API · gRPC · Message broker · Background Service · Docker.
Tất cả đã có trong mục 5, 8, 11, 12, 13.

### 17.4 Sản phẩm phải nộp (mục 5 của đề)
- [ ] Toàn bộ source code
- [ ] **Database scripts hoặc migrations**: EF Core migrations của từng service, **và** script SQL xuất sẵn trong thư mục `database/` (`dotnet ef migrations script --idempotent -o database/<service>.sql`)
- [ ] Dockerfile cho mỗi service và web
- [ ] `docker-compose.yml`
- [ ] **API documentation (Swagger/OpenAPI)**: Swagger UI ở mọi REST service; mỗi controller có XML comment và `[ProducesResponseType]` cho các mã trạng thái chính; xuất file `docs/openapi/<service>.json`
- [ ] **README.md** có đủ 6 mục sau:
  1. **Project description** — bài toán, đối tượng sử dụng, chức năng chính
  2. **System architecture** — hình C0, C1 (đặt trong `docs/architecture/`), danh sách service, cách giao tiếp (REST, gRPC, Redis Streams), danh sách event
  3. **Technology stack** — theo mục 12
  4. **Installation guide** — yêu cầu cài đặt (Docker Desktop, .NET 10 SDK, Node 22 LTS), clone, tạo `.env` từ `.env.example`
  5. **Deployment instructions** — `docker compose up -d --build`, bảng cổng truy cập (Web, Gateway, Swagger từng service, MailHog), tài khoản mẫu, cách xem log
  6. **Team member responsibilities** — bảng thành viên ↔ service ↔ phần việc (theo mục 2)

### 17.5 Demo khi thuyết trình (mục 6 của đề)
Mỗi mục phải có bằng chứng nhìn thấy được:

| Phải demo | Cách chứng minh |
|---|---|
| System architecture | Slide C0, C1 |
| REST API | Swagger hoặc Web App: CRUD, search/filter/sort/paging, 401 khi thiếu token |
| Background job chạy | Gọi `POST /reports/snapshots/generate` hoặc chờ lịch; log `[JOB]`; snapshot mới trong báo cáo |
| Publish và consume message | Log `[EVENT-PUBLISH]` ở Group và `[EVENT-CONSUME]` ở Notification/Report/User; thông báo mới trong app; email trong MailHog |
| gRPC | Mở trang chi tiết nhóm thấy matching score; log `[GRPC]` ở Group và Matching |
| Docker deployment | `docker compose ps` thấy tất cả container `healthy` |
| Luồng nghiệp vụ đầu cuối | Chạy luồng mục 14 |

### 17.6 Thang điểm — dùng để ưu tiên công việc
| Tiêu chí | Trọng số | Ưu tiên |
|---|---|---|
| System architecture and design | 20% | C0/C1 khớp code, đúng database-per-service |
| REST API implementation | 20% | CRUD + JWT + search/filter/sort/paging chạy đúng |
| Message Broker integration | 15% | Redis Streams, consumer group, ACK, idempotent |
| gRPC service | 15% | Matching chạy độc lập, Group gọi được |
| Background Job | 10% | Có job chạy thật và thấy được trong log |
| Docker/Cloud deployment | 10% | Một lệnh chạy toàn hệ thống |
| Documentation and presentation | 10% | README đủ 6 mục, Swagger, slide |

Chức năng làm thêm ngoài yêu cầu tối thiểu chỉ được cộng điểm khi thiết kế và cài đặt tốt.
Làm xong và chạy ổn mọi mục bắt buộc trước, rồi mới làm thêm (ví dụ Google OAuth, SignalR realtime).

### Prompt khởi động (một người chạy một lần để tạo base code)
> Đọc `CLAUDE.md`. Tạo base code theo mục 15 (cả backend và frontend):
> cấu trúc solution và project theo mục 4, kiến trúc 3 lớp API – Services – Repository theo mục 5,
> entity theo mục 6, event bus và luồng `UserRegistered` theo mục 7, Matching gRPC service
> và lời gọi từ Group theo mục 8, phần dùng chung theo mục 11, và Docker Compose theo mục 13.
> Đảm bảo `docker compose up -d --build` chạy được từ một bản clone mới. Tạo sẵn khung README
> 6 mục và các thư mục `database/`, `docs/architecture/`, `docs/openapi/` theo mục 17.4.
> Chưa làm đầy đủ chức năng nghiệp vụ; để lại TODO rõ ràng cho từng người phụ trách.
