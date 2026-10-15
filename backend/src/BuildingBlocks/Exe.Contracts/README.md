# Exe.Contracts

"Hợp đồng" dữ liệu giữa các service. **Không chứa logic.** Sửa ở đây ảnh hưởng nhiều service:
chỉ được **thêm** (field nullable/có mặc định, message/rpc mới), không đổi tên hoặc xóa, và ghi rõ trong PR.

## Events (Redis Streams) — `Events/`

| Record | Phát | Nhận |
|---|---|---|
| `UserRegistered` | Auth | User, Notification, Report |
| `UserProfileUpdated` | User | Report |
| `GroupCreated` | Group | Report |
| `JoinRequestCreated` | Group | Notification |
| `JoinRequestDecided` | Group | Notification |
| `InvitationCreated` | Group | Notification |
| `MemberJoined` | Group | User, Notification, Report |
| `MemberLeft` | Group | User, Notification, Report |

Publish và consume bằng `IEventPublisher` / `EventConsumerBase<T>` của `Exe.BuildingBlocks` (xem README bên đó):

```csharp
using Exe.Contracts.Events;

await eventPublisher.PublishAsync(new UserRegistered(account.Id, account.Email, account.FullName, "Student"), ct);
```

## gRPC — `Protos/matching.proto`

Build project này sinh code C# trong namespace `Exe.Contracts.Matching`:

| Dùng ở | Class sinh ra |
|---|---|
| Matching.Grpc (server) | `MatchingService.MatchingServiceBase` — kế thừa và override `CalculateMatch`, `RankGroups`, `RankCandidates` |
| Group.Services (client) | `MatchingService.MatchingServiceClient` — đăng ký bằng `AddGrpcClient<MatchingService.MatchingServiceClient>(...)` |
| Cả hai | `StudentProfile`, `GroupNeed`, `MatchRequest`, `MatchResult`, ... |

```csharp
// Matching.Grpc
public class MatchingGrpcService : MatchingService.MatchingServiceBase
{
    public override Task<MatchResult> CalculateMatch(MatchRequest request, ServerCallContext context) { ... }
}

// Group.API/Program.cs
builder.Services.AddGrpcClient<MatchingService.MatchingServiceClient>(o =>
    o.Address = new Uri(builder.Configuration["Services:Matching"]!));   // http://matching-service:8080
```
