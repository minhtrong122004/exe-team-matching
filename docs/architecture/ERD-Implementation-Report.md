# Báo cáo ERD Crow’s Foot — EXE Team Matching

## 1. Mục đích và phạm vi

Tài liệu này là hướng dẫn chuẩn để đọc, vẽ, kiểm tra và triển khai ERD cho hệ thống EXE Team Matching. Sơ đồ Draw.io đi kèm là **ERD vật lý theo từng database**, dựa trên entity, cấu hình `DbContext` và migrations hiện có. Nó giữ đúng kiến trúc database-per-service: mỗi service quản lý schema của mình; không tạo quan hệ FK xuyên database chỉ vì hai cột GUID có cùng ý nghĩa.

Tệp sơ đồ: `EXE-Team-Matching-ERD-Crows-Foot.drawio`.

## 2. Quy ước đọc sơ đồ

- Hình chữ nhật là một thực thể/bảng. Theo yêu cầu ERD khái niệm, sơ đồ không ghi danh sách field.
- Một gạch biểu thị đúng một (`1`); vòng tròn biểu thị không bắt buộc (`0`); chân chim biểu thị nhiều (`N`). Kết hợp vòng tròn + chân chim nghĩa là `0..N`; gạch + chân chim là `1..N`; vòng tròn + gạch là `0..1`.
- Nhãn cạnh mô tả vai trò nghiệp vụ hoặc FK giúp phân biệt hai quan hệ cùng nối một cặp entity.
- Các quan hệ trên sơ đồ là quan hệ có FK vật lý trong cùng database. ID logic liên service ghi ở chú thích, không được vẽ thành FK.
- Mỗi trang là một database: `ExeGroupDb`, `ExeAuthDb`, `ExeUserDb`, `ExeProjectDb`, `ExeNotificationDb`, `ExeReportDb`.

## 3. Kiến trúc dữ liệu cần giữ đúng

Hệ thống hiện có sáu database độc lập. Auth là nguồn định danh tài khoản; User lưu hồ sơ; Group lưu lớp học/nhóm; Project quản lý ý tưởng; Notification lưu thông báo/email; Report xây read model từ events. Matching là stateless và không có database. Gateway cũng không sở hữu database.

`UserProfile.UserId`, `SpaceEnrollment.StudentId`, `GroupMember.UserId`, `Group.LeaderId`, `Project.OwnerId`, `Notification.RecipientId`, `StudentStat.UserId`… có thể chứa GUID do Auth cấp, nhưng những trường đó không phải FK vật lý sang Auth. Group giữ `ProjectId` để liên kết nghiệp vụ với Project Service, nhưng không có FK chéo DB. Report nhận dữ liệu sự kiện, do đó `StudentStat.GroupId` không tạo FK tới `GroupStat`.

## 4. Danh sách thực thể đầy đủ theo database

### 4.1 ExeGroupDb — Group Service

Có 11 thực thể:

1. `CourseSpace` — không gian môn học/học kỳ.
2. `SpaceEnrollment` — snapshot sinh viên đủ điều kiện trong CourseSpace.
3. `Group` — room/nhóm; `SpaceId` nullable.
4. `GroupMember` — thành viên nhóm, khóa kép `(GroupId, UserId)`.
5. `RecruitmentSlot` — vị trí tuyển của nhóm.
6. `JoinRequest` — yêu cầu tham gia nhóm.
7. `ApplicationVote` — phiếu đánh giá join request, khóa kép `(JoinRequestId, VoterId)`.
8. `LeaderElection` — cuộc bầu trưởng nhóm.
9. `ElectionVote` — phiếu bầu, khóa kép `(ElectionId, VoterId)`.
10. `MemberRemovalLog` — nhật ký loại thành viên.
11. `GroupTransferRequest` — yêu cầu chuyển nhóm/đổi chéo.

FK và cardinality:

- `CourseSpace` 1 — 0..N `SpaceEnrollment`; mọi enrollment thuộc đúng một space.
- `CourseSpace` 0..1 — 0..N `Group`; `Group.SpaceId` nullable, một Group có thể không thuộc space.
- `CourseSpace` 1 — 0..N `GroupTransferRequest`.
- `Group` 1 — 0..N `GroupMember`, `RecruitmentSlot`, `JoinRequest`, `LeaderElection`, `MemberRemovalLog`.
- `JoinRequest` 1 — 0..N `ApplicationVote`.
- `LeaderElection` 1 — 0..N `ElectionVote`.
- `GroupTransferRequest` liên hệ `Group` hai lần bằng hai FK riêng: `FromGroupId` và `TargetGroupId`. Mỗi transfer phải có đúng một source group và một target group; một Group có thể được tham chiếu bởi 0..N request theo từng vai trò. Nhãn cạnh cần giữ rõ source/target.

Các trường `SlotId` trong `GroupMember`/`JoinRequest` hiện không có FK cấu hình trong `GroupDbContext`; không vẽ quan hệ FK tới `RecruitmentSlot`. Những ID người dùng như `StudentId`, `LeaderId`, `VoterId` cũng không có FK.

### 4.2 ExeAuthDb — Auth Service

Có 3 thực thể: `Account`, `RefreshToken`, `OutboxMessage`.

- `Account` 1 — 0..N `RefreshToken` qua `RefreshToken.AccountId`.
- `RefreshToken` tự tham chiếu qua `ReplacedByTokenId` (nullable). Một token cũ có thể chỉ tới 0..1 token thay thế. Một token có thể được nhiều token trỏ tới ở mức FK vì `ReplacedByTokenId` không unique; nghiệp vụ rotation thường tạo chuỗi tuyến tính, nhưng constraint DB không áp đặt chuỗi tuyến tính.
- `OutboxMessage` độc lập, không có FK tới Account.

### 4.3 ExeUserDb — User Service

Có 4 thực thể: `UserProfile`, `Skill`, `UserSkill`, `ProcessedEvent`.

- `UserProfile` 1 — 0..N `UserSkill`.
- `Skill` 1 — 0..N `UserSkill`.
- Vì vậy `UserProfile` và `Skill` tạo quan hệ N:N qua associative entity `UserSkill`; bảng trung gian còn có `Level`.
- `ProcessedEvent` độc lập.
- `UserProfile.UserId` dùng cùng GUID với `Account.Id` nhưng không có FK liên DB.

### 4.4 ExeProjectDb — Project Service

Có `Project` và `ProjectTag`.

- `Project` 1 — 0..N `ProjectTag` qua `ProjectTag.ProjectId`.
- `ProjectTag` có khóa kép `(ProjectId, Tag)`; không tồn tại entity Tag độc lập.
- `OwnerId` là tham chiếu logic tới Auth, không phải FK.

### 4.5 ExeNotificationDb — Notification Service

Có `Notification`, `EmailLog`, `ProcessedEvent`. Không có FK giữa các bảng theo entity/config hiện hành.

`Notification.RecipientId` là ID logic người nhận; `RelatedEntityId` là ID đa hình (có thể trỏ tới nhiều kiểu entity) và không có FK vật lý. Không vẽ các quan hệ này như FK.

### 4.6 ExeReportDb — Report Service

Có `StudentStat`, `GroupStat`, `ReportSnapshot`, `ProcessedEvent`. Không có FK giữa chúng theo cấu hình hiện hành.

`StudentStat.GroupId` và `GroupStat.GroupId` là dữ liệu read model; không thiết lập FK. `ReportSnapshot` lưu bản chụp tổng hợp độc lập. Report database được cập nhật từ event, không phải join trực tiếp database nguồn.

## 5. Quy trình vẽ ERD chuẩn cho hệ thống

1. Chọn phạm vi: conceptual, logical hay physical. Sơ đồ bàn giao dùng hình entity và relationship theo Crow’s Foot nhưng chỉ khẳng định FK mà implementation thực sự có.
2. Liệt kê entity từ `DbSet<>`, migrations và bảng tồn tại; không suy luận bảng chỉ từ DTO hoặc API.
3. Với mỗi entity, đối chiếu khóa chính, unique constraint/index và nullability từ EF Core mapping/migration.
4. Chỉ vẽ quan hệ khi có FK vật lý trong cùng DB. Tìm `HasOne/HasMany/HasForeignKey` và xác nhận migration tạo constraint.
5. Xác định cardinality từ nullability và constraint:
   - FK bắt buộc: mỗi bản ghi con phải tham chiếu đúng 1 bản ghi cha.
   - FK nullable: bản ghi con tham chiếu 0..1 cha.
   - Một FK không unique thường cho phép một cha có 0..N bản ghi con.
   - FK unique hoặc PK/FK có thể biến phía con thành 0..1/1:1; phải xác minh migration.
6. Tách mỗi FK thành quan hệ riêng, kể cả khi cùng nối hai entity (ví dụ transfer source và target; self-reference của token).
7. Không nối qua database bằng ID logic. Thay vào đó ghi note trên diagram hoặc báo cáo rằng đây là external/logical reference.
8. Đối chiếu sơ đồ với migrations mới nhất; bảng được xóa trong migration cuối không được giữ trong ERD.
9. Kiểm tra lại tên và số lượng entity, FK, quan hệ tự tham chiếu, nullable FK và các bảng xử lý event/outbox.

## 6. Hướng dẫn triển khai bằng Draw.io

1. Mở diagrams.net (Draw.io), chọn **File → Open From → Device** và mở `EXE-Team-Matching-ERD-Crows-Foot.drawio`.
2. Chọn page theo database ở thanh tab phía dưới. Kéo entity để căn chỉnh; các cạnh là connector gắn đầu vào entity và có thể kéo route.
3. Dùng các endpoint ER Crow’s Foot để giữ ký hiệu nhất quán: one, zero-to-one, many, zero-to-many. Đọc endpoint tại mỗi phía entity, không chỉ dựa vào nhãn quan hệ.
4. Khi sửa schema, cập nhật đúng trang database. Nếu thêm FK, thêm connector và cập nhật cardinality; nếu chỉ thêm ID liên service, cập nhật ghi chú, không thêm FK connector.
5. Lưu bằng **File → Save** để giữ XML Draw.io có thể chỉnh sửa. Có thể export PNG/PDF để nộp hoặc chèn báo cáo, nhưng giữ file `.drawio` làm bản nguồn.

## 7. Ghi chú độ chính xác và giới hạn

Sơ đồ biểu diễn schema EF/migration hiện có, không tự áp đặt thêm ràng buộc nghiệp vụ. Ví dụ `GroupMember.SlotId` có thể mang ý nghĩa gắn thành viên với slot nhưng hiện chưa có FK cấu hình; `Group.ProjectId` có index unique filtered theo nhóm chưa giải tán nhưng vì Project nằm DB khác nên đó là bảo đảm uniqueness trên giá trị, không phải FK; cardinality nghiệp vụ còn chịu ảnh hưởng status/filter và logic service. Vì vậy, nếu muốn đổi sang ERD logic nghiệp vụ thay vì physical ERD, cần phân biệt rõ bằng nét đứt/legend để không khiến người đọc nghĩ các ID ngoại DB được database enforce.

Khi source code thay đổi, migrations/DbContext là chuẩn để cập nhật quan hệ vật lý; tài liệu kiến trúc mô tả ý nghĩa nghiệp vụ và giúp kiểm tra thiếu sót. Không dùng riêng một sơ đồ cũ làm nguồn chuẩn.
