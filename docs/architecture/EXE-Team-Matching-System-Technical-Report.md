# EXE Team Matching System — Báo cáo kỹ thuật và nghiệp vụ

> Tài liệu ngữ cảnh tổng hợp cho người đọc hoặc AI cần hiểu hệ thống từ yêu cầu Assignment, kiến trúc, luồng nghiệp vụ, dữ liệu, API, tích hợp, triển khai và những điểm chưa đồng nhất. Nội dung phản ánh working tree được rà soát ngày 10/11/2026; đây là tài liệu phân tích, không khẳng định mọi chức năng đã được kiểm thử hoặc đã triển khai trên môi trường production.
>
> Sơ đồ lớp editable: [EXE-Team-Matching-Class-Diagram.drawio](EXE-Team-Matching-Class-Diagram.drawio). C4: [README kiến trúc](README.md). Mô hình dữ liệu: [ERD](ERD.md).

## 1. Cách đọc báo cáo và thứ tự nguồn sự thật

Báo cáo phân biệt ba loại thông tin:

1. **Yêu cầu Assignment**: nội dung của `PRN232 - Final Assignment.pdf`. Assignment yêu cầu một ứng dụng phân tán với REST API, JWT, CRUD, phân lớp API–Services–Repository, tìm kiếm/lọc/sắp xếp/phân trang, background job, broker Kafka hoặc Redis Streams, gRPC độc lập, relational database, Docker/cloud, Swagger, README và demo end-to-end. Assignment cho phép chọn miền bài toán; nó không quy định các entity hoặc quy tắc nghiệp vụ riêng của EXE Team Matching.
2. **Implementation hiện tại**: mã nguồn backend/frontend, EF configurations/migrations, `docker-compose.yml` và cấu hình service. Khi hành vi thật khác tài liệu mô tả, ưu tiên controller/service/entity/consumer đang chạy trong source.
3. **Tài liệu dự án**: README, ERD, master plan, OpenAPI snapshots và các tài liệu trong `docs/`. Đây là thiết kế/ghi chú hữu ích nhưng một số phần chưa được cập nhật đồng bộ với source.

Không được suy luận rằng một luồng đã hoạt động chỉ vì nó có trong yêu cầu, tài liệu, route UI hoặc sơ đồ. Cũng không được coi ID giữa các microservice là foreign key SQL nếu không có FK trong DbContext tương ứng.

## 2. Tổng quan sản phẩm

EXE Team Matching là ứng dụng web giúp tổ chức ghép nhóm cho sinh viên FPT học EXE101/EXE201 theo học kỳ. Moderator nhập danh sách sinh viên đủ điều kiện, tạo các Space và Room, sinh viên có thể tự vào nhóm ban đầu hoặc nộp đơn vào nhóm đang tuyển, sau đó thành viên bình chọn và Leader quyết định. Hệ thống cung cấp gợi ý matching, phân phối sinh viên chưa có nhóm, chốt danh sách, điều chuyển sau chốt sổ, thông báo và báo cáo.

### Vai trò

| Vai trò | Trách nhiệm chính |
|---|---|
| Student | Đăng nhập Google; hoàn thiện hồ sơ và điểm kỹ năng; xem Space/Room; tự vào Room đủ điều kiện; apply, vote đơn; tham gia bầu Leader; rời nhóm; gửi đề nghị chuyển nhóm sau khi chốt. |
| Moderator | Tạo/cấu hình Space; import roster; provision tài khoản; tạo Room; đóng đăng ký; xem trước/xác nhận phân phối; chốt sổ; xử lý chuyển nhóm; quản trị tài khoản. |
| Lecturer | Xem Space, roster, tiến độ/báo cáo và xuất dữ liệu. Phân quyền cụ thể nằm ở từng endpoint, không suy ra chỉ từ tên trang giao diện. |

### Từ vựng miền nghiệp vụ

- **CourseSpace / Space**: phạm vi một môn trong một học kỳ, chứa roster ghi danh và các Room/Group.
- **SpaceEnrollment**: bản ghi roster ở Group DB; chứa StudentId logic và một số trường hồ sơ snapshot/read model.
- **GroupEntity**: entity lưu một Room khởi tạo trước hoặc nhóm được hình thành từ Room đó. Các lớp giao diện thường gọi Room khi trống/đang tạo nhóm và Group khi đã có thành viên; đây vẫn là cùng entity trong Group DB.
- **GroupMember**: membership hiện tại, khóa ghép GroupId + UserId.
- **RecruitmentSlot**: nhu cầu tuyển theo major/skills và số lượng; không phải tài khoản hay hồ sơ sinh viên.
- **JoinRequest**: đơn apply vào một Group, độc lập với kết quả vote tư vấn.
- **LeaderElection**: quy trình biểu quyết riêng để thay đổi Leader.
- **Finalize / chốt sổ**: khóa Space và nhóm cho đăng ký thông thường; có thể vẫn còn sinh viên chưa được phân phối. Chuyển nhóm sau đó là luồng riêng.

## 3. Đối chiếu PRN232 Final Assignment

| Hạng mục | Cách hệ thống đáp ứng theo source/cấu hình |
|---|---|
| REST API, CRUD, layered design | ASP.NET Core API theo các project API, Services, Repository; các service có controllers, application services, repositories và EF Core. CRUD rõ nhất ở Project, hồ sơ, account, Space/Group. |
| JWT | Auth phát access JWT và refresh token; Gateway xác thực JWT trước khi reverse proxy. Google ID token là đầu vào đăng nhập, không thay thế access JWT nội bộ. |
| Search/filter/sort/paging | Có các query/paged result ở Group, Space, User, Project và Report; chi tiết từng query tùy endpoint. |
| Background job | Auth outbox publisher; deadline worker ở Group; consumers ở User/Group/Notification/Report; email sender và report snapshot workers. |
| Broker | Redis Streams với producer và consumer groups; event được partition theo stream dạng `exe:events:{EventType}`. |
| gRPC độc lập | Matching gRPC service riêng, không có DB; Group gọi các RPC tính điểm, xếp hạng, phân phối và phân tích AI. |
| Relational DB / EF Core | SQL Server, EF Core migrations, một database cho từng REST service sở hữu persistence. Matching không dùng DB. |
| Deployment | `docker-compose.yml` khai báo SQL Server, Redis, MailHog, Gateway, sáu REST service, Matching gRPC và frontend; health checks được khai báo. |
| Tài liệu API | Swagger/OpenAPI được cấu hình cho API service; các file OpenAPI lưu trong `docs/openapi` có thể cũ hơn source. |
| README/demo | README mô tả setup, ports và demo từ import roster tới chuyển nhóm/report. Hướng dẫn chạy không thay thế cho bằng chứng runtime; report này không khẳng định demo/test đã chạy thành công trong lần rà soát. |

## 4. Kiến trúc triển khai và giao tiếp

```text
React 19 / Vite / TypeScript
      │ REST + JWT
      ▼
YARP API Gateway :5000
  ├── Auth         :5001 ── ExeAuthDb
  ├── User         :5002 ── ExeUserDb
  ├── Project      :5003 ── ExeProjectDb
  ├── Group        :5004 ── ExeGroupDb ── REST → Auth / User / Project
  │                                      └─ gRPC → Matching :5005
  ├── Notification :5006 ── ExeNotificationDb ── SMTP → MailHog
  └── Report       :5007 ── ExeReportDb

Auth / User / Group ── Redis Streams :6379 ── User / Notification / Report consumers
SQL Server :1433; frontend container :3000; MailHog UI :8025, SMTP :1025
```

Gateway là điểm vào REST chung, áp JWT và route theo prefix. Matching không phải REST controller phía sau Gateway; Group gọi Matching trực tiếp bằng gRPC. Group dùng REST đến Auth khi provision roster, User để đọc hồ sơ, Project để lấy dữ liệu dự án. Các service lưu dữ liệu riêng; Group DB không join SQL sang DB khác.

### Cấu hình Compose

Compose cung cấp SQL Server 2022, Redis 7 có AOF, MailHog, YARP, Auth/User/Project/Group/Notification/Report REST, Matching gRPC và web. Ports host được map lần lượt: Gateway 5000; Auth 5001; User 5002; Project 5003; Group 5004; Matching 5005; Notification 5006; Report 5007; web 3000; SQL 1433; Redis 6379; MailHog 8025. Trong mạng Compose, service kết nối nhau bằng DNS service name và cổng container 8080.

Cấu hình nhạy cảm/đi theo môi trường gồm JWT key, SQL password, Google client ID, moderator/lecturer seed emails và Gemini key. Không chép giá trị secret từ `.env`, appsettings hoặc Compose vào tài liệu chia sẻ.

## 5. Tổ chức lớp và quy tắc UML

Mỗi service REST chia thành API (HTTP/auth/response mapping), Services (use case, authorization nghiệp vụ, validation/orchestration) và Repository/DbContext (persistence). Interface được inject qua DI. Validator kiểm tra request/shape/range; state transition và invariant liên quan nhiều entity thuộc service nghiệp vụ. Controller không phải nơi sở hữu quy tắc chuyển trạng thái.

Trong draw.io:

- Hộp `«controller»` gọi `«service : interface»`; service gọi `«repository»`.
- `«validator»` và lớp `«static»`/guard được đặt riêng, liên kết tới tầng gọi chúng.
- Entity được nối association/multiplicity khi có quan hệ EF/FK thật trong cùng database.
- Tham chiếu Account/User/Project/Group giữa các service được vẽ/ghi là scalar logical ID; không tạo association/FK xuyên DB.
- Redis event và gRPC là giao tiếp hạ tầng, không phải entity/foreign key.
- Matching có nhiều model RPC và component không persistence; không gắn repository hoặc DB vào Matching.

Sơ đồ gồm 10 trang: tổng quan/quy ước; Auth; User; Group Space/Room; Group membership; Group apply/vote/election/transfer; Project; Notification; Report; Matching gRPC.

## 6. Mô hình dữ liệu theo service

### 6.1 Auth — `ExeAuthDb`

- **Account**: PK `Id`; `Email` duy nhất; `RegistrationFullName`; `Role` (Student/Moderator/Lecturer); `StudentCode?`; `AcceptedTermsAt?`; `IsActive`; timestamps.
- **RefreshToken**: PK `Id`; FK `AccountId`; `TokenHash` duy nhất; thời điểm tạo/hết hạn/thu hồi; `ReplacedByTokenId?` self-reference; `RevokeReason`.
- **OutboxMessage**: PK `Id`; `EventType`; JSON `Payload`; thời điểm tạo/đã xử lý; retry count/error.

Account sở hữu 0..n refresh tokens. Outbox được ghi để tách việc commit tài khoản khỏi thời điểm publish event.

### 6.2 User — `ExeUserDb`

- **UserProfile**: PK `UserId` (logic = `Account.Id`, không FK liên DB); email, tên, role, student code, campus, major, cohort; năm điểm `TechScore`, `ManagementScore`, `GraphicDesignScore`, `MarketingScore`, `SaleScore`; commitment và thời điểm; `IsProfileCompleted`; Bio, DesiredRole, Availability, Interests; timestamps.
- **Skill**: danh mục kỹ năng có tên duy nhất, category và description.
- **UserSkill**: liên kết nhiều-nhiều, composite PK `(UserId, SkillId)`, proficiency `Level` 1..5.
- **ProcessedEvent**: event ID đã xử lý để hạn chế áp dụng lại event.

Năm điểm số cố định dùng cho matching/distribution khác với Skill catalog tự do và mức thành thạo UserSkill.

### 6.3 Group — `ExeGroupDb`

- **CourseSpace**: PK `Id`; cặp `SemesterCode + SubjectCode` duy nhất; tên; MaxMembersPerGroup; GroupThreshold; BufferRatio; MaxConcurrentApplies; RegistrationDeadline; trạng thái Draft/Open/ClosedRegistration/Locked; timestamps.
- **SpaceEnrollment**: PK `Id`; FK `SpaceId`; `StudentId` logic; student code/email/name/major/cohort/class snapshot; `IsProfileCompleted`; `EnrolledAt`.
- **GroupEntity**: PK `Id`; `SpaceId?` local FK; RoomCode; Name/Description; `LeaderId?` logic; `ProjectId?` logic; ProjectDomain; MaxMembers; GroupStatus; `IsClosedByLeader`; RowVersion; member/slot/request/election/removal navigations.
- **GroupMember**: composite key `(GroupId, UserId)`; Group FK; UserId logic; role Leader/Member; SlotId?; name/email snapshot; JoinedAt.
- **RecruitmentSlot**: PK Id, FK GroupId; RequiredMajor/RequiredSkills; Quantity/Filled; trạng thái open suy ra từ số lượng.
- **JoinRequest**: PK Id, FK GroupId; SlotId? scalar; StudentId logic; tên/email snapshot; message; Pending/Accepted/Rejected/Cancelled; created/decided timestamps.
- **ApplicationVote**: composite key `(JoinRequestId, VoterId)`; FK JoinRequest; VoterId logic; voter snapshot, up/down, comment, time.
- **LeaderElection**: PK Id, FK GroupId; candidate/initiator IDs logic và tên snapshot; Active/Passed/Failed/TimedOut; start/expiry/completion.
- **ElectionVote**: composite `(ElectionId, VoterId)`; FK election; voter logic ID/snapshot; agree; time.
- **MemberRemovalLog**: PK Id, FK GroupId; removed-user/leader IDs logic; snapshots; category/reason/time.
- **GroupTransferRequest**: PK Id; FK SpaceId, FromGroupId, TargetGroupId; requester/swap student IDs logic; lý do, Pending/Approved/Rejected/Cancelled, quyết định và audit fields.

Các FK trong Group DB là nội bộ DB. FK đáng chú ý: Space → Enrollment (cascade), Space → Group (set null), Group → Member/Slot/JoinRequest/Election/RemovalLog (cascade), JoinRequest → votes, Election → votes, TransferRequest → Space (cascade) và From/Target Group (restrict). `SlotId`, UserId, Account IDs và ProjectId không phải mọi trường đều có FK local.

### 6.4 Project — `ExeProjectDb`

- **ProjectEntity**: PK Id; OwnerId (logical Account.Id); Title, Problem, Solution, Domain, Status, timestamps.
- **ProjectTag**: project + tag; một Project có 0..n tags, cascade nội bộ.

Project Service không lưu bản sao Group membership. Group giữ ProjectId logic và đọc project qua REST khi cần.

### 6.5 Notification — `ExeNotificationDb`

- **NotificationEntity**: PK Id; RecipientId logic; Type, Title, Message, RelatedEntityId?; IsRead, CreatedAt.
- **EmailLog**: PK Id; To, Subject, Body, Status, Attempts, LastError?, CreatedAt, SentAt?.
- **ProcessedEvent**: event ID/time cho idempotency.

Notification entity và email log là hai đầu ra khác nhau; gửi email xử lý bất đồng bộ sau khi event tạo log.

### 6.6 Report — `ExeReportDb`

- **StudentStat**: PK UserId logic; Email, FullName, Major; HasGroup, GroupId?; UpdatedAt.
- **GroupStat**: PK GroupId logic; Name, LeaderId; MemberCount, MaxMembers, Status; UpdatedAt.
- **ReportSnapshot**: PK Id; GeneratedAt; aggregate counts; ByMajorJson.
- **ProcessedEvent**: event ID/time cho idempotency.

Đây là projection/read model được cập nhật từ event và snapshot worker, không phải live join với DB User/Group.

## 7. Quy tắc nghiệp vụ và trạng thái

### 7.1 Cấu hình Space và roster

- Moderator tạo Space ở trạng thái Draft; cặp môn/học kỳ không trùng.
- Sĩ số nhóm hợp lệ 4–6; buffer ratio 1–2; giới hạn số đơn apply đang chờ mỗi sinh viên 1–5 (giá trị mặc định theo model/service có thể cấu hình trong range).
- Import roster kiểm tra yêu cầu và provision tài khoản qua Auth bằng email; kết quả account ID được ánh xạ vào `SpaceEnrollment.StudentId`. Bản ghi enrollment có thể giữ snapshot roster.
- Số Room sinh ra: `ceil(enrollment count / MaxMembersPerGroup * BufferRatio)`. Từ chối tạo khi không có enrollment hoặc còn Room hoạt động/đã có thành viên; các Room trống cũ có thể được thay thế. RoomCode được tạo từ semester/subject và sequence.
- RegistrationDeadlineWorker kiểm tra định kỳ và chuyển Open → ClosedRegistration. Một số use case cũng đóng muộn khi nhận thấy deadline đã qua.

### 7.2 Vòng đời nhóm/Room

Tài liệu sản phẩm thường mô tả `Empty → Forming → Recruiting → Closed → Locked`. Enum hiện tại còn có `Disbanded`; vì vậy tài liệu/sơ đồ chỉ năm trạng thái là mô tả giản lược, không đầy đủ enum. Room trống có thể được GroupEntity lưu với Status Empty. Thành viên đầu tiên gia nhập trở thành Leader và nhóm chuyển Forming. Khi chạm threshold, nhóm chuyển sang Recruiting và người mới phải Apply thay vì tự vào. Đóng tuyển sớm chuyển Closed; finalize khóa Space/nhóm.

`GroupThreshold` mặc định/tính theo model là đa số đơn giản `floor(max/2) + 1`; không đồng nhất với MaxMembers.

### 7.3 Điều kiện tự vào Room

Sinh viên phải:

1. Có enrollment hợp lệ trong Space đang mở, chưa quá deadline.
2. Có hồ sơ hoàn thiện. Group đọc cờ `SpaceEnrollment.IsProfileCompleted`; khi cần đối chiếu có thể fallback sang User Service.
3. Chưa ở một nhóm hoạt động khác cùng Space.
4. Gia nhập Room Empty/Forming còn dưới threshold và chưa bị khóa/đóng.

Người vào đầu tiên làm Leader. Khi gia nhập thành công, các đơn apply chờ khác của sinh viên trong cùng phạm vi được hủy; Group phát event membership sau khi lưu.

### 7.4 Application, vote và quyết định

- Chỉ Group Recruiting nhận Apply. Người gửi phải đủ điều kiện Space, đã hoàn thành hồ sơ, chưa là member của nhóm khác trong Space, chưa có đơn pending trùng và không vượt MaxConcurrentApplies.
- Có thể gắn Slot còn mở; slot làm rõ nhu cầu tuyển, nhưng không thay thế quyết định của Leader.
- Mỗi thành viên có thể lưu ApplicationVote theo đơn; vote là ý kiến tham khảo, không tự động accept/reject.
- Leader quyết định. Accept thay đổi trạng thái đơn và thêm GroupMember trong luồng persistence cục bộ, xử lý retry khi gặp concurrency; các đơn pending của ứng viên ở nhóm khác bị cancel. Nếu đạt giới hạn hoặc tuyển đóng, đơn pending liên quan có thể bị từ chối/hủy.
- Group phát JoinRequestCreated/Decided và MemberJoined phù hợp với hành động. Các event này không tạo một transaction xuyên service với Notification/User/Report.

### 7.5 Rời nhóm, loại thành viên, Leader

- Không cho thay đổi membership thông thường trong nhóm Locked.
- Khi thành viên rời: nếu là Leader và còn người, promote thành viên có JoinedAt sớm nhất; nếu không còn ai, bỏ Leader và nhóm trở về Empty. Nếu số thành viên tụt dưới threshold, trạng thái về Forming. Trường hợp nhóm đầy và không bị Leader đóng tuyển thì có thể mở lại Recruiting khi có chỗ.
- Leader có thể loại thành viên qua endpoint remove, có audit log/category/reason; remove cập nhật slot nếu thành viên gắn slot và phát MemberLeft/MemberRemoved theo implementation.
- Chuyển Leader trực tiếp cho member khác là use case riêng; election cũng cập nhật LeaderId và role.
- `RowVersion`/concurrency token cùng retry giới hạn bảo vệ các thay đổi đồng thời; đây không phải khóa toàn cục giữa các service.

### 7.6 Bầu Leader

- Người khởi tạo là member hiện tại; candidate cũng phải là member và khác Leader đang tại vị (theo guard hiện tại).
- Mỗi Group chỉ một election Active; mỗi thành viên một vote.
- Thời hạn 24 giờ. Election Passed khi số phiếu đồng ý vượt 50% tổng thành viên; Failed nếu đã đủ phiếu mà không đạt majority; TimedOut nếu hết hạn. Candidate rời nhóm có thể làm election fail.
- Khi Passed, GroupEntity.LeaderId và vai trò GroupMember được đồng bộ trong Group DB.

### 7.7 Matching, phân phối và finalize

- Gợi ý nhóm/ứng viên và AI Mentor là chức năng hỗ trợ; không tự thêm sinh viên vào nhóm.
- Khi đóng đăng ký, Moderator xem danh sách chưa có nhóm, xem trước phương án gRPC, xác nhận; khi confirm service nên tính lại preview từ dữ liệu hiện thời trước khi ghi kết quả.
- Matching ưu tiên các Room đang có thành viên để đưa chúng ít nhất lên threshold, sau đó sử dụng Room trống. Số lượng gán cần tôn trọng threshold, MaxMembers và tồn kho Room; một số sinh viên có thể còn unmatched nếu không thể tạo nhóm hợp lệ.
- Group lưu assignments cục bộ, cập nhật leader/member, hủy request liên quan và phát MemberJoined sau khi persistence thành công.
- Finalize yêu cầu Space ClosedRegistration, chuyển Space sang Locked, khóa nhóm có member, đóng Room thừa rỗng, reject JoinRequest còn pending và phát SpaceFinalized. Response có thể báo số sinh viên còn unmatched; finalize không hàm ý mọi sinh viên đều đã có nhóm.

### 7.8 Điều chuyển sau chốt sổ

- Moderator có thể chuyển trực tiếp hoặc đổi chéo; sinh viên có thể gửi transfer request. Hệ thống ghi audit trong GroupTransferRequest.
- Chỉ sau khi Space Locked. Yêu cầu phải có lý do theo request/validator.
- Nhóm đích phải còn sức chứa. Nhóm nguồn phải còn ít nhất threshold sau khi chuyển, trừ trường hợp swap đồng thời làm cân bằng. Với swap, sinh viên đổi lại phải thuộc nhóm đích.
- Student chỉ giữ một pending request theo quy tắc hiện hành; Moderator quyết định và service tái xác minh trạng thái/capacity trước khi áp dụng.
- Sau chuyển, membership và trạng thái hai nhóm được chuẩn hóa, request được đánh dấu Approved và MemberTransferredPostLock được phát.

## 8. Luồng đầu-cuối

### A. Đăng nhập và hồ sơ

1. Frontend lấy Google ID token.
2. `POST /api/auth/google`; Auth kiểm tra token Google (chữ ký, audience, hạn) và tìm Account đã provision, email so khớp không phân biệt hoa thường. Không có/không active thì không cấp phiên.
3. Auth phát JWT access token và refresh token. Refresh token raw chỉ dùng để trao đổi; DB lưu SHA-256 hash. Refresh có rotation; phát hiện token đã thu hồi/thay thế bị dùng lại sẽ thu hồi các refresh session. Logout thu hồi refresh token hiện tại.
4. `GET /api/auth/me` trả principal. `POST /api/auth/accept-terms` ghi nhận thời điểm đồng ý.
5. Profile có thể được tạo từ UserRegistered event; nếu chưa có, các luồng profile có thể tạo profile rỗng. Sinh viên cập nhật thông tin profile thường, rồi cập nhật 5 điểm kỹ năng/commitment qua endpoint chuyên biệt. Khi cập nhật hoàn tất, User Service đặt `IsCommitted`, `CommittedAt`, `IsProfileCompleted` và publish UserProfileUpdated.
6. Kỹ năng catalog được lưu qua Skill/UserSkill, độc lập 5 điểm số cố định.

Account lock chặn đăng nhập/refresh tương lai; do access JWT stateless, access token đã phát vẫn có thể hợp lệ đến hết hạn nếu downstream chỉ kiểm tra chữ ký/claims.

### B. Moderator tạo Space, import và tạo Room

1. Moderator tạo Space và cấu hình môn/học kỳ, max size, threshold, buffer, apply limit, deadline.
2. Import CSV/XLS/XLSX được frontend parse rồi gửi payload roster cho Group API (các định dạng chính xác cần đối chiếu parser hiện tại nếu UI thay đổi).
3. Group gọi Auth provision các tài khoản student chưa có, nhận mapping email → account ID, lưu enrollment vào Group DB.
4. Tạo Room theo công thức buffer; Group chưa gán StudentId vào GroupMember.
5. Student đăng nhập, hoàn thành hồ sơ rồi thấy Space/Room phù hợp.

### C. Sinh viên tự vào và hình thành nhóm

Sinh viên gọi direct-join Room hợp lệ. Group kiểm tra Space/enrollment/profile/membership/deadline/state/capacity; thêm GroupMember; người đầu thành Leader; cập nhật Group state; hủy đơn pending cạnh tranh; publish MemberJoined. Consumer cập nhật User availability/Notification/Report sau đó, có độ trễ eventual consistency.

### D. Apply → vote → Leader quyết định

Sinh viên xem gợi ý (gRPC), gửi JoinRequest vào Group Recruiting. Các member vote; Leader accept/reject. Vote chỉ lưu phản hồi, không quyết định hộ Leader. Accept thêm membership, xử lý pending đơn khác và phát events. Notification tạo in-app/email log; email worker gửi sau. User membership projection cập nhật Availability.

### E. Đóng tuyển → điều phối → chốt sổ

Moderator đóng registration thủ công hoặc deadline worker tự chuyển trạng thái. Unmatched summary dựa roster và membership hiện tại. Preview gọi gRPC nhưng chưa commit. Confirm tính lại và lưu assignments nếu còn hợp lệ. Cuối cùng finalize khóa Space/nhóm và từ chối đơn còn pending. Có thể còn unmatched nếu thiếu số lượng phù hợp/capacity; report phải hiển thị sự thật này.

### F. Transfer sau finalize

Student gửi request từ nhóm nguồn sang đích; service kiểm tra threshold, capacity, swap và một pending request. Moderator approve/reject; lúc approve kiểm tra lại điều kiện, thay đổi membership và ghi audit. Event post-lock phát để Notification và Report cập nhật.

## 9. API và giao diện

Tất cả route chính được định tuyến qua Gateway dưới `/api`. Prefix gồm `/api/auth`, `/api/users`, `/api/skills`, `/api/projects`, `/api/groups`, `/api/spaces`, `/api/join-requests`, `/api/transfer-requests`, `/api/notifications`, `/api/reports`.

- **Auth**: Google login, refresh, logout, me, accept-terms, accounts/list/lock/unlock, lecturer creation, FAP student provisioning.
- **User/Skills**: profile me GET/PUT, profile-skills PUT, get user, search/batch; skill catalog CRUD, user skills list/set/add/update proficiency/delete.
- **Project**: list/search/filter/sort/page, detail, create/update/delete; owner được sửa/xóa.
- **Spaces**: create/list/my/detail/config/delete, import-fap, generate-rooms, enrollments, rooms query, close-registration, unmatched-summary, distribute-preview, distribute-confirm, finalize, direct-transfer, transfer request list/decision, roster/CSV.
- **Groups**: list/search/filter/sort/page, my, suggestions, detail/update, slots, match-score, candidates, ai-mentor, remove/leave/leader transfer/direct-join, close/reopen recruitment, election APIs.
- **Join requests**: create, list per Group, my requests, accept/reject/cancel, application vote.
- **Notifications**: list/current user, unread count, mark one/all read.
- **Reports**: summary, snapshot list/detail/generate, CSV exports, students without group, groups.

Frontend dùng React Router, AuthContext và ProtectedRoute. Route root chuyển Moderator về `/moderator/spaces`, Lecturer về `/lecturer/dashboard`, Student về `/groups`. Route `/register`, `/verify-email`, `/forgot-password`, `/reset-password` hiện redirect về login; không chứng minh có đăng ký mật khẩu/email. Nhiều view dùng chung `CourseSpacesPage` với tab/initial mode cho rooms, roster, distribution, transfers; Lecturer dashboard route hiện cũng map tới roster view. Có trang Login, Profile, Projects, Candidate Discovery, Admin Accounts, nhóm/join requests/notifications, Moderator distribution/transfers/spaces và Lecturer dashboard. Một số trang như MyGroup/JoinRequests/Notifications xuất phát từ PlaceholderPages; cần xác minh mức hoàn thiện UI trước khi tuyên bố tính năng hoàn chỉnh.

## 10. Redis Streams, event contracts và workers

| Event | Producer | Consumer đã đăng ký theo source/docs | Tác động tiêu biểu |
|---|---|---|---|
| UserRegistered | Auth outbox publisher | User, Notification, Report | Tạo profile/read model, thông báo/email, thống kê student. |
| UserProfileUpdated | User | Group, Report | Cập nhật enrollment profile completion; refresh StudentStat. |
| JoinRequestCreated | Group | Notification | Thông báo Leader/nhóm có đơn mới. |
| JoinRequestDecided | Group | Notification | Thông báo kết quả đơn. |
| MemberJoined | Group | User, Notification, Report | Availability, thông báo, projection group/student. |
| MemberLeft | Group | User, Notification, Report | Availability, thông báo, projection. |
| MemberRemoved | Group | Notification | Thông báo thành viên bị remove. |
| MemberTransferredPostLock | Group | Notification, Report | Thông báo transfer; cập nhật projection/report. |
| SpaceFinalized | Group | Chưa có consumer đăng ký hiện tại | Không được giả định Report/Notification đã xử lý event này. |
| GroupCreated | Không tìm thấy producer hiện tại | Report consumer có handler | Handler tồn tại nhưng không có nơi phát đã xác nhận; GroupStat có thể cần được tạo bởi event membership hoặc luồng khác. |

Auth ghi OutboxMessage trong transaction nghiệp vụ, sau đó worker phát stream `exe:events:UserRegistered`. Contract/wrapper có cả tên `UserRegisteredEvent` và `UserRegistered`; cần giữ payload/serializer tương thích khi chỉnh producer/consumer. UserProfileUpdated được phát sau khi lưu profile; lỗi publish có đường xử lý không làm rollback profile, do đó projection có thể trễ/mất nếu không có retry bền vững tương ứng.

Các consumer dùng Redis consumer groups; event ID ở User/Notification/Report có ProcessedEvent idempotency. `EventConsumerBase` dùng retry counter trong process; sau giới hạn thì ghi log và ACK theo implementation base, không nên mô tả như dead-letter queue bền vững nếu chưa có code DLQ riêng. Đây là điểm khác với một số tài liệu nói về PEL/DLQ. Redis Streams và persistence/recovery cần được đánh giá theo cấu hình môi trường khi triển khai thật.

### Background jobs

- AuthOutboxPublisherWorker phát các OutboxMessage chưa xử lý và cập nhật retry/processed state.
- RegistrationDeadlineWorker định kỳ đóng đăng ký đã hết hạn.
- User, Group, Notification, Report chạy consumers theo worker registrations.
- EmailSenderWorker lấy EmailLog pending/retryable, gửi bằng MailKit qua SMTP, ghi Attempts/Status/LastError/SentAt.
- ReportSnapshotWorker tạo snapshot theo timer/SnapshotOptions (mặc định trong config khoảng 15 phút theo source/docs).

## 11. Matching gRPC và AI Mentor

MatchingService là service stateless, định nghĩa trong `backend/src/BuildingBlocks/Exe.Contracts/Protos/matching.proto`; Group gom dữ liệu rồi gửi vào gRPC, Matching không tự truy vấn User/Group DB.

RPC: `CalculateMatch`, `RankGroups`, `RankCandidates`, `DistributeUnmatchedStudents`, `AnalyzeGroupWithAI`. Model gRPC mang major, named skills, interests, availability, năm điểm số cố định, nhu cầu group (major/skill/domain và điểm trung bình), distribution rooms/candidates, cùng kết quả match/room plan.

Điểm match mặc định: Skill 50%, Major 30%, Domain 20% (tổng 100). Skill fit có thể dùng điểm skill số và deficit compensation so với mục tiêu (70 khi có số trung bình group), kết hợp named-skill overlap. Major là fit khi không có major bắt buộc hoặc major phù hợp. Domain fit dựa interests sinh viên có bao gồm project domain. Kết quả gồm score 0–100, matched/missing skills; ranking theo điểm giảm dần và tie-break ổn định theo implementation.

Phân phối unmatched: ưu tiên lấp Room có người trước để đạt threshold; sau đó cân bằng phân sinh viên vào Room trống theo constraint threshold/max và matching major/skill. Leader hiện hữu được giữ. Nhóm mới chọn Leader theo ManagementScore cao nhất, sau đó tổng điểm và StudentCode làm tie-break. Nếu không đủ điều kiện lập nhóm, số unmatched còn lại trả về.

AI Mentor gọi Gemini nếu cấu hình key hợp lệ; có heuristic fallback, timeout và fallback xử lý parse/response. Nó trả assessment, strengths, blind spots, topic recommendations, roadmap, synergy score và metadata có AI generated hay không. AI Mentor chỉ hỗ trợ tư vấn, không thay đổi membership hay tự quyết định nghiệp vụ.

## 12. Validation, bảo mật và tính nhất quán

- JWT bảo vệ hầu hết route; login/refresh/logout Google flow được mở theo attribute hiện tại; endpoint khác có role policy.
- UserId/StudentId trong JWT được các service dùng làm logical identity. Dữ liệu qua REST nội bộ cần được xác thực/ủy quyền phù hợp; tài liệu có đề cập M2M client credentials như hướng cải thiện, nhưng không coi đó là đã triển khai đầy đủ. Một số Group client chuyển tiếp user bearer token; background worker không có user token.
- Request validators kiểm tra shape/range (ví dụ 4..6 members, điểm 0..100, reason). Service kiểm tra state, ownership, role, enrollment, giới hạn, concurrency và invariants liên quan nhiều entity.
- Mỗi DB transaction chỉ bao trùm DB do service sở hữu; REST/gRPC/event/email không nằm trong một distributed transaction chung. Event-based read models là eventual consistency.
- Group dùng concurrency token RowVersion và retry có giới hạn trong một số thao tác; nếu retry hết thì request thất bại, không khẳng định thành công tuyệt đối trong cạnh tranh.
- Gateway JWT check không làm access token bị thu hồi ngay khi Account bị khóa, nếu các service chỉ xác minh chữ ký và expiration.

## 13. Known discrepancies, giới hạn và cách bảo trì tài liệu

1. **OpenAPI snapshots có thể cũ**: Group snapshot còn route/flow invitation hoặc Group creation không còn trong controller; dùng controller hiện tại làm nguồn route thật.
2. **Auth docs cũ**: migration `RemovePasswordAndOtp` cùng entity/current controller cho thấy auth bằng Google và refresh, không phải password/OTP; các UI route forgot/reset/register redirect login.
3. **Enum GroupStatus**: README mô tả năm trạng thái chính; code có thêm Disbanded. Cần cập nhật ERD/docs nếu muốn thể hiện đủ enum.
4. **Event không khớp**: Report handler nhận GroupCreated nhưng không thấy producer; SpaceFinalized có producer nhưng chưa có consumer. Không vẽ mũi tên như thể event có đầy đủ tác dụng downstream.
5. **Event retry/DLQ**: shared consumer base ACK sau số lần thử và log; không gọi cơ chế này là durable DLQ nếu chưa bổ sung implementation.
6. **UserProfileUpdated reliability**: publish sau commit có thể fail riêng với commit hồ sơ. Auth dùng Outbox còn các producer khác có thể không có cùng đảm bảo.
7. **Cross-service references**: ERD là service-local; các `UserId`, `OwnerId`, `LeaderId`, `ProjectId` không được diễn giải thành SQL FK giữa database.
8. **Plan / BR numbering**: master plan cũ ghi tới BR-37; source của Phase 6 có comment BR-38 cho Lecturer dashboard. Đây là khác biệt quản lý tài liệu, không tự động chứng minh một rule mới.
9. **Service-to-service auth**: chưa tuyên bố M2M security hoàn chỉnh; xác minh từng typed client/worker trước khi khẳng định.
10. **Profile/roster cache**: Group lưu cờ IsProfileCompleted và snapshot dữ liệu; trạng thái đọc có thể trễ so với User DB khi consumer chưa xử lý event.
11. **Project reference**: Group giữ ProjectId scalar và service xác nhận qua REST; không có Project FK trong Group DB.
12. **UI completeness**: route tồn tại không đồng nghĩa trang đã hoàn tất; một số component/page đang là placeholder hoặc dùng chung màn hình.
13. **Môi trường và demo**: Compose khai báo được các service/healthchecks nhưng chỉ khi thực chạy mới xác nhận giao tiếp, secrets, migration, Google credentials, Gemini và MailHog hoạt động đúng.

### Tập tin nguồn nên rà khi thay đổi

- Gateway: `backend/src/ApiGateway/Exe.ApiGateway/` và `appsettings*.json`.
- Auth: `backend/src/Services/Auth/` (API controllers, Auth/Admin services, entities, migrations, outbox worker).
- User: `backend/src/Services/User/` (controllers, profile/skill services, entities, event consumers).
- Group: `backend/src/Services/Group/` (Spaces/Groups/JoinRequests/TransferRequests controllers; CourseSpace/Group/JoinRequest/Election services; validators, guards, entities, EF configurations, workers).
- Matching contract/runtime: `backend/src/BuildingBlocks/Exe.Contracts/Protos/matching.proto`, `backend/src/Services/Matching/`.
- Project: `backend/src/Services/Project/`.
- Notification: `backend/src/Services/Notification/`.
- Report: `backend/src/Services/Report/`.
- Event contracts/base: `backend/src/BuildingBlocks/Exe.Contracts/`, `backend/src/BuildingBlocks/Exe.BuildingBlocks/EventBus/`.
- Web: `frontend/src/App.tsx`, `contexts/AuthContext.tsx`, `components/ProtectedRoute.tsx`, pages, API clients, types.
- Deployment/docs: `docker-compose.yml`, `.env.example`, `README.md`, `docs/architecture/`, `docs/openapi/`.

### Test coverage inventory

Repository có xUnit test projects cho Auth repository/services, User repository/services, Group services, Matching, Notification và Report. Tên test cho thấy coverage các nhóm như room lifecycle/election, distribution/finalize, post-lock transfer/roster, profile và event consumers. Báo cáo này không chạy test; trạng thái pass/fail phải được lấy từ lần chạy hiện tại, không suy từ việc file test tồn tại.

## 14. Hướng dẫn cho AI tiếp tục làm việc với dự án

Khi được yêu cầu sửa hoặc giải thích hệ thống:

1. Đọc mục 1 để phân biệt assignment, implementation và tài liệu thiết kế.
2. Đọc `docs/architecture/EXE-Team-Matching-Class-Diagram.drawio` cho sơ đồ lớp và `ERD.md` cho FK/persistence; không đổi logical IDs thành FK xuyên service.
3. Trước khi sửa nghiệp vụ, truy theo luồng Controller → interface/service → repository/entity → event/gRPC client/consumer → frontend client/page tương ứng.
4. Kiểm tra enum/validator/EF configuration/migration và tests hiện hành; không chỉ dựa vào README/OpenAPI snapshot.
5. Khi mô tả event, nêu đúng producer, consumer và độ trễ; đánh dấu rõ event không có producer/consumer đang hoạt động.
6. Giữ quy tắc nghiệp vụ ở service/domain guard; controller chủ yếu HTTP mapping, validator kiểm tra request, database constraint là lớp bảo vệ cuối.
7. Phân biệt “có route”, “có implementation”, “có test”, “test đã pass”, và “đã deploy/demo”; chỉ nói mức đã có bằng chứng.
8. Sau khi thay đổi code, cập nhật đồng bộ sơ đồ, báo cáo, ERD/OpenAPI nếu chúng bị ảnh hưởng; không ghi secret vào tài liệu.
