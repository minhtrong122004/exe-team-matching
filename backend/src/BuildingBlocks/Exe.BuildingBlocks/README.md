# Exe.BuildingBlocks

Thư viện hạ tầng dùng chung cho mọi service. **Không chứa nghiệp vụ.**
Sửa thư viện này ảnh hưởng cả nhóm: giữ tương thích ngược và ghi rõ trong PR.

| Thư mục | Nội dung |
|---|---|
| `Web/` | ProblemDetails (RFC 9457), `GlobalExceptionHandler`, exception dùng chung, `ICurrentUser`, correlation id, log request, Swagger, typed HttpClient |
| `Auth/` | `AddExeJwtAuthentication()`, `Roles`, `ExeClaims`, `JwtOptions` |
| `Paging/` | `PagedRequest`, `PagedResult<T>` |
| `Persistence/` | `MigrateDatabaseAsync<TContext>()`, `ToPagedResultAsync()`, `OrderBy(key, desc)` |
| `EventBus/` | `IEventPublisher`, `EventConsumerBase<T>` (Redis Streams), `AddExeEventBus()` |

## 1. Program.cs của một REST service

```csharp
using Exe.BuildingBlocks.EventBus;
using Exe.BuildingBlocks.Persistence;
using Exe.BuildingBlocks.Web;

var builder = WebApplication.CreateBuilder(args);

// Controllers + JSON + ProblemDetails + JWT + ICurrentUser + Swagger + /health + log console
builder.AddExeServiceDefaults("Group Service");
builder.Services.AddExeEventBus(builder.Configuration);           // nếu service publish/consume event

builder.Services.AddDbContext<GroupDbContext>(o =>
    o.UseSqlServer(builder.Configuration.GetConnectionString("Default")));
builder.Services.AddScoped<IGroupRepository, GroupRepository>();
builder.Services.AddScoped<IGroupService, GroupService>();
builder.Services.AddValidatorsFromAssemblyContaining<CreateGroupRequestValidator>();

var app = builder.Build();

app.UseExeServiceDefaults();                                      // log → bắt lỗi → Swagger → JWT → controllers
await app.MigrateDatabaseAsync<GroupDbContext>();                 // chỉ chạy ở Development, có retry

app.Run();
```

`appsettings.Development.json` cần có key JWT (≥ 32 ký tự, giống `.env.example`):

```json
{ "Jwt": { "Key": "dev-only-jwt-key-change-me-0123456789abcdef" } }
```

## 2. Lỗi: chỉ cần `throw`, không try/catch trong controller

| Ném trong lớp Services | HTTP | `code` |
|---|---|---|
| `await validator.ValidateAndThrowAsync(request)` (FluentValidation) | 400 | `VALIDATION_ERROR` + `errors` |
| `throw new BadRequestException("...")` | 400 | `BAD_REQUEST` |
| `throw new UnauthorizedException()` | 401 | `UNAUTHORIZED` |
| `throw new ForbiddenException("Only the leader can do this.")` | 403 | `FORBIDDEN` |
| `throw new NotFoundException("Group", id)` | 404 | `NOT_FOUND` |
| `throw new BusinessRuleException("GROUP_FULL", "Group is full.")` | 409 | `GROUP_FULL` |
| Exception khác | 500 | `INTERNAL_ERROR` (không lộ chi tiết) |

Response (RFC 9457, `Content-Type: application/problem+json`):

```json
{
  "type": "https://tools.ietf.org/html/rfc9110#section-15.5.10",
  "title": "Conflict",
  "status": 409,
  "detail": "Group is full.",
  "instance": "PUT /api/join-requests/7f.../accept",
  "code": "GROUP_FULL",
  "traceId": "00-7dd3741c...-01",
  "correlationId": "c30e71eb91f34bc2835731c8d9f7f3b0"
}
```

- `title` là tiêu đề chung theo status; `detail` là thông báo cụ thể — frontend hiển thị `detail`, xử lý logic theo `code`.
- Lỗi validate có thêm `"errors": { "maxMembers": ["Must be between 4 and 6."] }`.
- 401/403 từ JWT và route không tồn tại cũng trả cùng định dạng.

## 3. Người dùng hiện tại

```csharp
public class GroupService(IGroupRepository repo, ICurrentUser currentUser) : IGroupService
{
    public async Task DisbandAsync(Guid groupId, CancellationToken ct)
    {
        var group = await repo.GetByIdAsync(groupId, ct) ?? throw new NotFoundException("Group", groupId);
        if (group.LeaderId != currentUser.UserId)
            throw new ForbiddenException("Only the group leader can disband the group.");
        ...
    }
}
```

Mọi endpoint mặc định **yêu cầu đăng nhập**. Endpoint công khai gắn `[AllowAnonymous]`;
giới hạn vai trò dùng `[Authorize(Roles = Roles.Admin)]` hoặc `Roles.LecturerOrAdmin`.

## 4. Phân trang, lọc, sắp xếp

```csharp
// Services/DTOs
public class GroupQuery : PagedRequest           // ?page=1&pageSize=10&sortBy=name&sortDir=desc&search=...
{
    public string? Search { get; set; }
    public GroupStatus? Status { get; set; }
}

// API/Controllers
[HttpGet]
public async Task<ActionResult<PagedResult<GroupResponse>>> Search([FromQuery] GroupQuery query, CancellationToken ct)
    => Ok(await groupService.SearchAsync(query, ct));

// Repository
var q = db.Groups.AsNoTracking();
if (!string.IsNullOrWhiteSpace(search)) q = q.Where(g => g.Name.Contains(search));
q = sortBy switch
{
    "name" => q.OrderBy(g => g.Name, descending),
    _      => q.OrderBy(g => g.CreatedAt, descending)
};
return await q.ToPagedResultAsync(page, pageSize, ct);

// Services: entity → DTO
return (await repo.SearchAsync(...)).Map(g => g.ToResponse());
```

Response: `{ "items": [...], "page": 1, "pageSize": 10, "totalCount": 42, "totalPages": 5, "hasPrevious": false, "hasNext": true }`
(`pageSize` tối đa 50).

## 5. Quy ước controller (RESTful)

```csharp
[ApiController]
[Route("api/groups")]
[Produces("application/json")]
public class GroupsController(IGroupService groupService) : ControllerBase
{
    /// <summary>Tạo nhóm mới cho một dự án.</summary>
    [HttpPost]
    [ProducesResponseType<GroupResponse>(StatusCodes.Status201Created)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<GroupResponse>> Create(CreateGroupRequest request, CancellationToken ct)
    {
        var created = await groupService.CreateAsync(request, ct);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);   // 201 + header Location
    }

    [HttpGet("{id:guid}")]  public async Task<ActionResult<GroupResponse>> GetById(Guid id, CancellationToken ct) => ...;   // 200
    [HttpPut("{id:guid}")]  ...                                                                                            // 200
    [HttpDelete("{id:guid}")] ... return NoContent();                                                                       // 204
    [HttpPost("{id:guid}/leave")] ...                    // thao tác chuyển trạng thái: /accept, /reject, /cancel, /leave
}
```

- URL: danh từ số nhiều, kebab-case (`/api/join-requests`), không có động từ (trừ thao tác chuyển trạng thái).
- Thêm `<GenerateDocumentationFile>true</GenerateDocumentationFile>` vào `X.API.csproj` để Swagger hiện XML comment.

## 6. Gọi service khác (REST)

```csharp
// Group.Services/Clients/UserClient.cs
public class UserClient(HttpClient http) : IUserClient
{
    public Task<UserProfileDto?> GetAsync(Guid id, CancellationToken ct) =>
        http.GetFromJsonAsync<UserProfileDto>($"api/users/{id}", ct);
}

// Program.cs — base URL từ Services:User (Docker: Services__User=http://user-service:8080)
builder.Services.AddExeServiceClient<IUserClient, UserClient>(builder.Configuration, "User");
```

Tự có timeout 5 giây, retry, chuyển tiếp `Authorization` và `X-Correlation-Id`.

## 7. Event (Redis Streams)

**Publish** (Auth, User, Group) — gọi sau khi `SaveChangesAsync` thành công:

```csharp
await eventPublisher.PublishAsync(new MemberJoined(group.Id, group.Name, userId, email, name, count, max), ct);
// log: [EVENT-PUBLISH] MemberJoined eventId=... payload=...
```

**Consume** (User, Notification, Report) — mỗi event một class trong `X.API/Workers`:

```csharp
public sealed class MemberJoinedConsumer(IServiceProvider sp) : EventConsumerBase<MemberJoined>(sp)
{
    protected override string ConsumerGroup => "notification-service";

    protected override Task HandleAsync(MemberJoined e, EventEnvelope envelope, IServiceProvider scope, CancellationToken ct) =>
        scope.GetRequiredService<INotificationEventHandler>().HandleAsync(e, envelope.EventId, ct);
}

// Program.cs
builder.Services.AddHostedService<MemberJoinedConsumer>();
```

Trong `HandleAsync` của lớp Services: kiểm tra `envelope.EventId` đã có trong bảng `ProcessedEvent` chưa → bỏ qua nếu có;
nếu chưa thì xử lý và thêm `ProcessedEvent` trong **cùng một** `SaveChangesAsync`. Base class chỉ ACK sau khi `HandleAsync` chạy xong.

## 8. Cấu hình cần có

| Key | Ví dụ | Ghi chú |
|---|---|---|
| `ConnectionStrings:Default` | `Server=localhost,1433;Database=ExeGroupDb;...` | đã có trong appsettings.json |
| `ConnectionStrings:Redis` | `localhost:6379` | đã có trong appsettings.json |
| `Jwt:Key` | ≥ 32 ký tự | Docker lấy từ `.env`; local đặt trong `appsettings.Development.json` |
| `Services:User`, `Services:Project`, `Services:Matching` | `http://localhost:5002` | chỉ Group cần |
