# TÀI LIỆU ĐẶC TẢ NGHIỆP VỤ HOÀN CHỈNH & LỘ TRÌNH TRIỂN KHAI THEO GIAI ĐOẠN (MASTER PLAN)
**Dự án:** EXE Team Matching System (PRN232 Final Assignment)  
**Cập nhật:** Chuẩn hóa 100% theo 37 Business Rules (BR-01 → BR-37) & Mô hình 3 Vai trò (`Student` – `Moderator` – `Lecturer`) trên nền tảng Web App.

---

## PHẦN 1: TỔNG QUAN CẤU HÌNH HẠ TẦNG & DỊCH VỤ BÊN THỨ 3 (THIRD-PARTY CONFIGS)

Trước khi đi vào từng giai đoạn, dưới đây là câu trả lời chính xác cho việc **hệ thống có cần cấu hình bên thứ 3 nào ở ngoài hay không**:

### 1.1. Dịch vụ bên thứ 3 bên ngoài: **KHÔNG BẮT BUỘC (0 phụ thuộc bên ngoài khi chạy Docker/Demo)**
Toàn bộ hệ thống được thiết kế khép kín (Self-contained) trong `docker-compose.yml`, cụ thể:
1. **Gửi nhận Email (Cấp tài khoản/mật khẩu, OTP quên mật khẩu, thông báo nhóm)**:
   - **Mặc định khuyên dùng (Local Docker - MailHog)**: Dùng container `mailhog/mailhog` đã có sẵn trong `docker-compose.yml` (cổng SMTP `1025`, giao diện Web xem hộp thư tại `http://localhost:8025`). Mọi email gửi cho 2.000 sinh viên khi Moderator import danh sách FAP đều hiển thị tức thì tại `http://localhost:8025`, không tốn phí, không sợ bị chặn spam và không cần API key bên ngoài.
   - **Tùy chọn mở rộng (Brevo Transactional Email API - Bên thứ 3)**: Trong [`Auth.API/appsettings.json`](../backend/src/Services/Auth/Auth.API/appsettings.json) đã tích hợp sẵn `BrevoOptions`. Nếu bạn muốn gửi tới hòm thư Gmail/`@fpt.edu.vn` thật khi demo, chỉ cần đăng ký tài khoản miễn phí trên `brevo.com`, lấy API Key điền vào biến môi trường `Brevo__ApiKey` và bật `Brevo__EnableRealEmail=true`. Nếu để `false`, hệ thống hoạt động độc lập 100% không cần internet.
2. **Hệ thống FAP (Cung cấp danh sách sinh viên đủ điều kiện học EXE101/EXE201)**:
   - Trường không mở API FAP thật cho sinh viên kết nối, nên hệ thống sử dụng **2 cơ chế nội bộ song song**:
     - **Import File CSV/Excel chuẩn FAP**: Moderator tải file `.csv` / `.xlsx` danh sách sinh viên lên Web.
     - **Mock FAP API nội bộ**: Một endpoint giả lập dữ liệu FAP có sẵn danh sách sinh viên mẫu kỳ `FA26` (`EXE101`, `EXE201`) để Moderator chỉ cần bấm 1 nút *"Đồng bộ từ FAP"* khi demo.
3. **Cơ sở dữ liệu & Message Broker**:
   - **SQL Server 2022** (`mcr.microsoft.com/mssql/server:2022-latest`, cổng `1433`, 6 database độc lập cho 6 service).
   - **Redis 7 Alpine** (`redis:7-alpine`, cổng `6379`, dùng **Redis Streams** làm Event Bus).

### 1.2. Các tinh chỉnh cấu hình nội bộ cần lưu ý trong `docker-compose.yml` và `appsettings.json`
- Trong [`docker-compose.yml`](../docker-compose.yml), mục `notification-service` cần bổ sung biến môi trường `Smtp__Host: mailhog` và `Smtp__Port: 1025` (vì hiện tại trong [`Notification.API/appsettings.json`](../backend/src/Services/Notification/Notification.API/appsettings.json) đang để `Host: localhost`, khi chạy trong container Docker sẽ không gọi sang container `mailhog` được nếu thiếu biến này).
- Trong [`Exe.ApiGateway/appsettings.json`](../backend/src/ApiGateway/Exe.ApiGateway/appsettings.json), bổ sung các route mới cho phân hệ quản lý Học kỳ/Space (`/api/semesters/**`, `/api/spaces/**`) khi triển khai Giai đoạn 1.

---

## PHẦN 2: KIẾN TRÚC PHÂN BỔ TRÁCH NHIỆM GIỮA CÁC MICROSERVICES

Để giữ nguyên 100% khung điểm kiến trúc của môn PRN232 (6 REST Services + 1 gRPC Service + 1 YARP API Gateway + Redis Streams), trách nhiệm của từng service theo nghiệp vụ mới được ánh xạ như sau:

| # | Service | Cổng Swagger / Host | Database | Nhiệm vụ chính theo Nghiệp vụ mới |
| :--- | :--- | :--- | :--- | :--- |
| 1 | **Auth Service** | `http://localhost:5001/swagger` | `ExeAuthDb` | - Chuẩn hóa 3 vai trò: `Student`, `Moderator`, `Lecturer`.<br>- Cấp tài khoản hàng loạt (`Batch Provisioning`) từ danh sách FAP của Moderator (sinh mật khẩu khởi tạo, phát event gửi mail).<br>- Đăng nhập (`Login`), Đổi mật khẩu (`ChangePassword`), Quên mật khẩu (`ForgotPassword`/`ResetPassword`), Đồng ý điều khoản điều phối lần đầu (`AcceptTerms` - `BR-34`). |
| 2 | **User Service** | `http://localhost:5002/swagger` | `ExeUserDb` | - Lưu hồ sơ sinh viên với `StudentCode`, `Major` (Ngành) và `Cohort` (Khóa) tự động trích xuất từ MSSV, **khóa không cho SV tự sửa** (`BR-04`).<br>- Đánh giá **5 kỹ năng cố định** (`Tech`, `Management`, `GraphicDesign`, `Marketing`, `Sale` thang `0–100` - `BR-05`).<br>- Tick cam kết chịu trách nhiệm (`IsCommitted` - `BR-06`) và cờ hoàn thành hồ sơ (`IsProfileCompleted` - `BR-07`). |
| 3 | **Group Service** *(Core Domain)* | `http://localhost:5004/swagger` | `ExeGroupDb` | - Quản lý **Học kỳ (`Semester`)** và **Không gian môn học (`CourseSpace`: `EXE101`, `EXE201`)**, danh sách SV đủ điều kiện của từng Space (`SpaceEnrollment`), cấu hình thông số Space (`BR-01`, `BR-03`, `BR-08`).<br>- Tự động sinh hàng loạt `Room` theo công thức $\lceil \text{Tổng SV} \div \text{Max} \times \text{Hệ số} \rceil$ với mã `FA26EXE101-01` (`BR-09`, `BR-11`).<br>- Toàn bộ vòng đời 5 trạng thái `Room` ↔ `Group`: Vào thẳng (`< Ngưỡng`), Apply (`>= Ngưỡng`), Vote ứng viên (`BR-25`), Bầu Leader (`BR-19`), Rời nhóm tự chuyển Leader (`BR-20`), Đóng tuyển sớm (`BR-28`), Phân phối cưỡng chế SV lẻ & Chốt sổ (`BR-30` → `BR-33`), Chuyển nhóm/Đổi chéo sau chốt sổ (`BR-35` → `BR-37`). |
| 4 | **Matching Service** *(gRPC)* | `localhost:5005` *(HTTP/2 gRPC)* | *Stateless* | - **RPC 1 (`CalculateMatch` / `RankGroups`)**: Gợi ý độ cân bằng 5 kỹ năng + chuyên ngành khi sinh viên tìm Group.<br>- **RPC 2 (`DistributeUnmatchedStudents`)**: Thuật toán phân phối cưỡng chế sinh viên lẻ vào các Room còn thiếu và tạo nhóm mới sao cho cân bằng 5 kỹ năng + chuyên ngành, tự chọn Leader có điểm `Management` cao nhất cho nhóm mới (`BR-31`, `BR-32`). |
| 5 | **Notification Service** | `http://localhost:5006/swagger` | `ExeNotificationDb` | - Nhận event từ Redis Streams, lưu thông báo In-App và gửi Email qua SMTP (`MailHog`): Email cấp tài khoản + mật khẩu khởi tạo, thông báo có đơn Apply mới, kết quả duyệt đơn, kết quả bầu Leader, thông báo chốt sổ & chuyển nhóm. |
| 6 | **Report Service** | `http://localhost:5007/swagger` | `ExeReportDb` | - Dashboard thống kê theo từng Học kỳ & Môn học (`Space`) dành cho **`Lecturer`** (chỉ xem) và **`Moderator`**: tiến độ ghép nhóm, danh sách SV lẻ, danh sách Room thiếu người, cơ cấu ngành/kỹ năng, xuất file CSV. |
| 7 | **Project Service** | `http://localhost:5003/swagger` | `ExeProjectDb` | - Giữ làm phân hệ quản lý **Đề tài dự kiến của Group** (tùy chọn cập nhật sau khi lập nhóm, không bắt buộc phải có trước khi vào Room để tuân thủ `BR-12`), đảm bảo giữ nguyên 6 REST services đã có. |

---

## PHẦN 3: LỘ TRÌNH TRIỂN KHAI STEP-BY-STEP (6 GIAI ĐOẠN: BACKEND + SWAGGER + FRONTEND)

Mỗi giai đoạn dưới đây được thiết kế theo nguyên tắc **Vertical Slice (Cắt dọc)**: Làm xong Backend tới đâu → Kiểm thử ngay trên **Swagger** → Làm luôn **Frontend** của giai đoạn đó để bấm test trực quan trên trình duyệt trước khi qua giai đoạn tiếp theo.

---

### GIAI ĐOẠN 1: Phân quyền 3 Vai trò (`Student`, `Moderator`, `Lecturer`), Cấp tài khoản từ FAP & Đổi mật khẩu
*(Bao phủ: `BR-01`, `BR-02`, `BR-04`, `BR-34`)*

#### 1.1. Công việc ở Backend
1. **`Exe.BuildingBlocks` ([`Roles.cs`](../backend/src/BuildingBlocks/Exe.BuildingBlocks/Auth/Roles.cs))**:
   - Bổ sung hằng số `public const string Moderator = "Moderator";`.
   - Thêm tổ hợp phân quyền:
     - `ModeratorOnly = "Moderator"` (dành cho các API cấu hình kỳ/môn, import FAP, phân phối SV lẻ, chốt sổ, duyệt chuyển nhóm).
     - `LecturerOrModerator = "Lecturer,Moderator"` (dành cho các API xem Dashboard, xem danh sách nhóm, xem tiến độ và xuất báo cáo CSV).
2. **`Auth Service` (`Auth.Repository`, `Auth.Services`, `Auth.API`)**:
   - **Cập nhật Enum [`AccountRole`](../backend/src/Services/Auth/Auth.Repository/Enums/AccountRole.cs)**: Gồm `Student`, `Moderator`, `Lecturer` (và giữ `Admin` hoặc gộp quyền quản lý tài khoản về `Moderator`).
   - **Cập nhật Entity [`Account`](../backend/src/Services/Auth/Auth.Repository/Entities/Account.cs)**:
     - Thêm trường `bool MustChangePassword` (mặc định `true` khi tài khoản sinh viên mới được tạo tự động từ danh sách FAP).
     - Thêm trường `DateTime? AcceptedTermsAt` (lưu thời điểm sinh viên tick đồng ý điều khoản điều phối ở lần đăng nhập đầu tiên theo `BR-34`).
   - **Seed dữ liệu mẫu đầu kỳ**:
     - Tạo sẵn tài khoản `moderator@fpt.edu.vn / Moderator@123` (Role: `Moderator`) và `lecturer@fpt.edu.vn / Lecturer@123` (Role: `Lecturer`).
   - **Thêm các API mới trên `AuthController`**:
     - `POST /api/auth/change-password`: Cho phép người dùng đã đăng nhập nhập `CurrentPassword` + `NewPassword` để tự đổi mật khẩu (đặt `MustChangePassword = false`).
     - `POST /api/auth/accept-terms`: Ghi nhận sinh viên đồng ý điều khoản `BR-34` (`AcceptedTermsAt = DateTime.UtcNow`).
     - `POST /api/auth/provision-students` (hoặc xử lý qua luồng Import FAP của `Moderator`): Nhận danh sách sinh viên (`Email`, `FullName`, `StudentCode`, `SemesterCode`, `SubjectCode`):
       - Nếu email chưa có trong `ExeAuthDb`: Tạo `Account` (`Role = Student`, `EmailConfirmed = true`, `MustChangePassword = true`), sinh mật khẩu ngẫu nhiên 8 ký tự, băm BCrypt, phát event `StudentAccountProvisionedEvent` (chứa thông tin hồ sơ + mật khẩu khởi tạo để gửi email thông báo).
       - Nếu email đã có từ kỳ trước: Giữ nguyên mật khẩu cũ, chỉ phát event ghi danh sinh viên vào Space môn học mới.
   - **Vô hiệu hóa đăng ký tự do**: Chặn hoặc đóng route `POST /api/auth/register` công khai để đảm bảo chỉ sinh viên trong danh sách FAP và chỉ email trường mới có tài khoản (`BR-01`, `BR-02`).
3. **`Notification Service`**:
   - Bổ sung consumer lắng nghe `StudentAccountProvisionedEvent` để gửi email thông báo **Tên đăng nhập (Email trường) + Mật khẩu khởi tạo + Môn học được mở Space** vào `MailHog` (`http://localhost:8025`).

#### 1.2. Kiểm thử trên Swagger (`http://localhost:5001/swagger`)
- Test `POST /api/auth/login` với tài khoản `moderator@fpt.edu.vn` và `lecturer@fpt.edu.vn` → Kiểm tra JWT claim `role` trả về đúng `Moderator` và `Lecturer`.
- Test API cấp tài khoản sinh viên từ danh sách mẫu → Mở `http://localhost:8025` (MailHog) kiểm tra email chứa mật khẩu khởi tạo đã được gửi tới sinh viên.
- Dùng tài khoản sinh viên vừa nhận trong MailHog gọi `POST /api/auth/login` → Gọi tiếp `POST /api/auth/accept-terms` và `POST /api/auth/change-password` → Đăng nhập lại bằng mật khẩu mới.

#### 1.3. Công việc ở Frontend (`frontend/src`)
- Cập nhật `AuthContext.tsx`, `ProtectedRoute.tsx` và menu điều hướng `MainLayout.tsx` theo đúng 3 vai trò: **`Student`**, **`Moderator`**, **`Lecturer`**.
- Ẩn bỏ link "Đăng ký tài khoản mới" ở trang `LoginPage.tsx` (thay bằng dòng hướng dẫn: *"Sử dụng tài khoản email trường (@fpt.edu.vn) và mật khẩu đã được gửi qua email đầu học kỳ"*).
- Xây dựng **Modal Onboarding lần đầu đăng nhập** cho `Student`:
  - Hiển thị nội dung điều khoản `BR-34` (*"Moderator/Giảng viên có toàn quyền điều phối sinh viên vào nhóm sau hạn đăng ký"*), bắt buộc tick đồng ý.
  - Kèm form **Đổi mật khẩu mới** ngay trong lần đầu đăng nhập (và thêm mục "Đổi mật khẩu" trong trang Hồ sơ cá nhân để đổi bất cứ lúc nào).

---

### GIAI ĐOẠN 2: Hồ sơ 5 Kỹ năng Sinh viên & Tự động hóa Ngành/Khóa từ MSSV
*(Bao phủ: `BR-04`, `BR-05`, `BR-06`, `BR-07`)*

#### 2.1. Công việc ở Backend (`User Service`)
1. **Cập nhật Entity [`UserProfile`](../backend/src/Services/User/User.Repository/Entities/UserProfile.cs)**:
   - Khóa cứng `StudentCode`, `Major` (Ngành) và thêm trường `Cohort` (Khóa, vd: `K17`, `K18`): Được gán tự động khi nhận event tạo hồ sơ từ danh sách FAP (viết hàm helper tách tự động từ `StudentCode`, ví dụ `SE180123` → `Major = SE`, `Cohort = K18`, `GD170456` → `Major = GD`, `Cohort = K17`).
   - Thêm **5 trường điểm kỹ năng cốt lõi (kiểu `int`, phạm vi `0–100`)** theo `BR-05`:
     - `TechScore` (0–100)
     - `ManagementScore` (0–100)
     - `GraphicDesignScore` (0–100)
     - `MarketingScore` (0–100)
     - `SaleScore` (0–100)
   - Thêm trường cam kết & hoàn thành hồ sơ (`BR-06`, `BR-07`):
     - `bool IsCommitted` (đã tick ô cam kết chịu trách nhiệm với khai báo).
     - `DateTime? CommittedAt`
     - `bool IsProfileCompleted` (`true` khi đã nhập đủ 5 kỹ năng và `IsCommitted == true`).
2. **Cập nhật API trong `UsersController` (`User.API`)**:
   - `PUT /api/users/me/profile-skills`: Sinh viên cập nhật 5 chỉ số kỹ năng (`Tech`, `Management`, `GraphicDesign`, `Marketing`, `Sale`), `Bio`, `DesiredRole` và bắt buộc `IsCommitted = true`.
   - **Chặn sửa `StudentCode`, `Major`, `Cohort`** trong request cập nhật của sinh viên (`BR-04`).
   - Khi lưu thành công, phát event `UserProfileUpdated` (kèm `IsProfileCompleted` và 5 điểm kỹ năng) qua Redis Streams.
   - **Đồng bộ trạng thái Availability (`LookingForTeam` ↔ `InTeam`) qua Background Consumers**:
     - `MemberJoinedConsumer`: Lắng nghe sự kiện `MemberJoined` từ Redis Streams $\rightarrow$ cập nhật `UserProfile.Availability = InTeam`.
     - `MemberLeftConsumer`: Lắng nghe sự kiện `MemberLeft` $\rightarrow$ cập nhật `UserProfile.Availability = LookingForTeam`.
     - Cả hai Consumer được xử lý Idempotent thông qua bảng `ProcessedEvents` trong `ExeUserDb`.

#### 2.2. Kiểm thử trên Swagger (`http://localhost:5002/swagger`)
- Gọi `GET /api/users/me` bằng token `Student` → Xác nhận `StudentCode`, `Major`, `Cohort` đã tự động hiển thị đúng từ dữ liệu FAP.
- Gọi `PUT /api/users/me` với `IsCommitted = false` → Xác nhận trả về lỗi `400 Bad Request` (`BR-06`).
- Gọi `PUT /api/users/me` với 5 điểm kỹ năng (0–100) và `IsCommitted = true` → Xác nhận `IsProfileCompleted = true`.

#### 2.3. Công việc ở Frontend (`ProfilePage.tsx`)
- Hiển thị `Mã số sinh viên`, `Chuyên ngành`, `Khóa` ở dạng **Read-only Badge** (không cho sửa - `BR-04`).
- Thiết kế bộ **5 Thanh trượt / Thang điểm trực quan (0–100% tương ứng mức 1–5)** kèm biểu đồ Radar 5 trục cho: `Tech`, `Management`, `Graphic Design`, `Marketing`, `Sale` (`BR-05`).
- Thêm Checkbox bắt buộc: *"Tôi cam kết chịu trách nhiệm hoàn toàn với thông tin kỹ năng đã khai báo"* (`BR-06`). Nếu chưa hoàn thành hồ sơ, hiển thị Banner nhắc nhở sinh viên phải lưu hồ sơ trước khi vào Room hoặc Apply (`BR-07`).

---

### GIAI ĐOẠN 3: Quản lý Học kỳ, Space Môn học (`EXE101`/`EXE201`), Import FAP & Tự động tạo Room
*(Bao phủ: `BR-01`, `BR-03`, `BR-08`, `BR-09`, `BR-10`, `BR-11`, `BR-12`, `BR-23`)*

#### 3.1. Công việc ở Backend (`Group Service`)
1. **Bổ sung các Entity quản lý Học kỳ & Không gian môn học trong `ExeGroupDb`**:
   - **`CourseSpace`** (Không gian ghép nhóm của 1 môn trong 1 kỳ):
     - `Id`, `SemesterCode` (vd: `FA26`), `SubjectCode` (`EXE101` hoặc `EXE201`), `Name` (vd: `"Fall 2026 - EXE101"`).
     - Các thông số cấu hình của Moderator (`BR-08`):
       - `MaxMembersPerGroup` (mặc định `5`)
       - `GroupThreshold` (tính tự động `= (MaxMembersPerGroup / 2) + 1`, vd: `5 → 3`, `6 → 4` theo `BR-16`)
       - `BufferRatio` (hệ số dự phòng, vd: `1.2`)
       - `MaxConcurrentApplies` (giới hạn số đơn Apply đang chờ cùng lúc của 1 SV, vd: `3` hoặc `5` - `BR-22`, `BR-23`)
       - `RegistrationDeadline` (hạn đăng ký - `BR-08`)
     - `Status` (`Draft` → `Open` → `ClosedRegistration` → `Locked`).
   - **`SpaceEnrollment`** (Danh sách sinh viên đủ điều kiện trong Space đó - `BR-01`):
     - `SpaceId`, `StudentId`, `StudentCode`, `Email`, `FullName`, `Major`, `Cohort`, `ClassCode` (lớp gốc trên FAP để tham khảo, nhưng khác lớp cùng môn vẫn chung Room theo `BR-10`).
2. **Nâng cấp Entity [`GroupEntity`](../backend/src/Services/Group/Group.Repository/Entities/GroupEntity.cs) thành mô hình `Room / Group`統一**:
   - Thêm `SpaceId` (gắn với `CourseSpace`).
   - Thêm `RoomCode` (Unique trong Space, sinh tự động theo mẫu `<SemesterCode><SubjectCode>-<STT>`, vd: `FA26EXE101-01`, `FA26EXE101-02`... theo `BR-11`).
   - Cho phép `LeaderId` và `ProjectId` là **`Guid?` (nullable)** vì khi hệ thống mới khởi tạo Room trống thì chưa có ai ở trong phòng (`LeaderId = null`).
   - Thêm cờ `bool IsClosedByLeader` (để phân biệt Leader chủ động đóng tuyển sớm khi nhóm có 3–4 người với trường hợp nhóm tự đóng do đủ 5/5 người - `BR-28`).
   - Cập nhật Enum **`GroupStatus`** theo đúng **5 trạng thái vòng đời Room** trong Doc:
     1. `Empty` (Room trống: 0 thành viên)
     2. `Forming` (Room đang lập: `1` đến `< GroupThreshold` thành viên — vào thẳng không cần duyệt)
     3. `Recruiting` (Group đang tuyển: `>= GroupThreshold` và `< MaxMembers` và `!IsClosedByLeader` — chỉ nhận qua Apply)
     4. `Closed` (Đóng tuyển: đã đủ `MaxMembers` HOẶC `IsClosedByLeader == true` — không nhận thêm người, nhưng thành viên vẫn được rời nhóm trước khi chốt sổ)
     5. `Locked` (Đã chốt sổ: khóa cứng hoàn toàn)
3. **Xây dựng các API dành cho `Moderator` & `Student` trên `CourseSpacesController`**:
   - `POST /api/spaces`: Moderator tạo Space môn học mới (vd: Kỳ `FA26`, Môn `EXE101`, cấu hình `MaxMembers = 5`, `BufferRatio = 1.2`, `MaxConcurrentApplies = 3`, `RegistrationDeadline`).
   - `PUT /api/spaces/{spaceId}/config`: Moderator cập nhật cấu hình (nếu giảm `MaxConcurrentApplies` thì đơn đã gửi trước đó giữ nguyên, chỉ áp dụng cho đơn mới theo `BR-23`).
   - `POST /api/spaces/{spaceId}/import-fap` (và `POST /api/spaces/{spaceId}/sync-mock-fap`): Moderator upload file CSV/Excel hoặc bấm đồng bộ dữ liệu mẫu từ FAP → Lưu vào `SpaceEnrollment` và kích hoạt cấp tài khoản tự động qua Auth Service.
   - `POST /api/spaces/{spaceId}/generate-rooms`: Hệ thống tính tự động:
     $$\text{TotalRooms} = \lceil \text{TotalEligibleStudents} \div \text{MaxMembersPerGroup} \times \text{BufferRatio} \rceil$$
     Sinh tự động các Room trống (`Status = Empty`) với mã `FA26EXE101-01` ... `FA26EXE101-N` và mở Space (`Status = Open`) (`BR-09`, `BR-11`).
   - `GET /api/spaces/my`: Sinh viên lấy danh sách các Space mà mình có tên trong `SpaceEnrollment` (`BR-01`, `BR-03`).

#### 3.2. Kiểm thử trên Swagger (`http://localhost:5004/swagger`)
- Dùng token `Moderator` tạo Space `FA26 - EXE101` → Bấm đồng bộ danh sách 50 sinh viên mẫu từ FAP (`sync-mock-fap`) → Gọi `generate-rooms` với `MaxMembers = 5, BufferRatio = 1.2` → Xác nhận hệ thống tự tạo đúng $50 \div 5 \times 1.2 = 12$ Room trống từ `FA26EXE101-01` đến `FA26EXE101-12`.
- Dùng token `Student` gọi `GET /api/spaces/my` → Chỉ thấy đúng Space `FA26 - EXE101` mà sinh viên đó đủ điều kiện học.

#### 3.3. Công việc ở Frontend
- **Màn hình cho `Moderator` (`ModeratorSpaceManagementPage.tsx`)**:
  - Tạo Học kỳ & Môn học (`EXE101`, `EXE201`), chỉnh cấu hình (Sĩ số tối đa, Hệ số dự phòng, Giới hạn Apply, Hạn đăng ký).
  - Nút **"Import danh sách FAP (CSV/Excel)"** và nút **"Đồng bộ dữ liệu FAP mẫu"** + Bảng danh sách sinh viên đủ điều kiện trong kỳ.
  - Nút **"Khởi tạo Room tự động"** hiển thị công thức tính trực quan (ví dụ: `50 SV ÷ 5 × 1.2 = 12 Rooms`).
- **Màn hình cho `Student` & `Lecturer` (Space Selector)**:
  - Sau khi đăng nhập, hiển thị Space của kỳ & môn đang học (`FA26 - EXE101`). Nếu sinh viên không có trong danh sách FAP của kỳ này thì hiển thị màn hình thông báo chưa đủ điều kiện truy cập Space (`BR-01`).

---

### GIAI ĐOẠN 4: Luồng Ghép nhóm Tự nguyện — Vào thẳng Room, Apply vào Group, Vote Ứng viên, Bầu Leader & Đóng tuyển sớm
*(Bao phủ: `BR-07`, `BR-12` → `BR-29`)*

#### 4.1. Công việc ở Backend (`Group Service`)
1. **Gỡ bỏ quyền Sinh viên tự tạo/xóa nhóm**:
   - Đóng API `POST /api/groups` (sinh viên tự tạo nhóm) và `DELETE /api/groups/{id}` (giải tán nhóm) đối với vai trò `Student` (`BR-12`).
2. **Xem danh sách & Chi tiết Room/Group (`BR-13`)**:
   - `GET /api/spaces/{spaceId}/rooms?status=&availableSlots=&search=&page=&pageSize=`: Lọc theo trạng thái (`Empty`, `Forming`, `Recruiting`, `Closed`, `Locked`) và số chỗ còn trống.
   - Với các phòng ở trạng thái `Closed` (đã đủ người hoặc đã đóng tuyển), nếu người gọi là `Student` ngoài nhóm thì **ẩn bớt danh sách chi tiết email/hồ sơ thành viên và đơn ứng tuyển** (`BR-13`). (Riêng `Moderator` và `Lecturer` luôn xem được đầy đủ 100%).
3. **API Vào thẳng Room dưới ngưỡng (`POST /api/rooms/{roomId}/join-direct`) (`BR-14`, `BR-15`, `BR-16`, `BR-21`, `BR-26`)**:
   - **Kiểm tra hoàn thành hồ sơ (BR-07) qua Event-driven Read Model**:
     - Group Service bổ sung `UserProfileUpdatedConsumer` lắng nghe sự kiện `UserProfileUpdated` từ User Service và cập nhật `SpaceEnrollment.IsProfileCompleted = true`.
     - Khi sinh viên gọi `join-direct` hoặc `Apply`, Group Service đọc trực tiếp cờ `IsProfileCompleted` trong bảng `SpaceEnrollment` nội bộ (tốc độ $< 1\text{ms}$, không Temporal Coupling với User Service). Nếu phát hiện cache miss (vừa lưu hồ sơ xong bấm phòng ngay), hệ thống tự động fallback gọi REST sang User Service 1 lần và self-heal cập nhật vào `SpaceEnrollment`.
   - Kiểm tra: Space đang `Open`, sinh viên thuộc `SpaceEnrollment`, đã hoàn thành hồ sơ 5 kỹ năng (`BR-07`), và **chưa ở trong bất kỳ Room/Group nào của môn này** (`BR-21`).
   - Kiểm tra phòng đang ở trạng thái `Empty` hoặc `Forming` (`MemberCount < GroupThreshold`, tức 0, 1 hoặc 2 người).
   - Thêm sinh viên vào phòng ngay lập tức không cần duyệt:
     - Nếu phòng đang `Empty` (0 người): Sinh viên này tự động nhận `Role = Leader`, `Room.LeaderId = studentId`, trạng thái phòng chuyển sang `Forming` (`1/5`) (`BR-15`).
     - Nếu phòng đang `Forming` (1 hoặc 2 người): Sinh viên nhận `Role = Member`.
     - **Kiểm tra chạm ngưỡng (`BR-16`)**: Sau khi thêm, nếu `MemberCount == GroupThreshold` (ví dụ đạt `3/5` người) → Tự động chuyển trạng thái phòng từ `Forming` sang **`Recruiting` (Group đang tuyển)**, khóa cổng vào thẳng!
     - **Hủy đơn chờ khác (`BR-26`) qua Local Transaction nội bộ**: Mọi đơn Apply và lời mời `Pending` khác của sinh viên này trong cùng môn tự động chuyển sang **`Cancelled`** ngay trong cùng database transaction của `ExeGroupDb` (đảm bảo tính nhất quán tức thì và ngăn chặn tuyệt đối Race Condition sinh viên bị lọt vào 2 nhóm; không dùng Event-driven cho xử lý này).
4. **Luồng Rời phòng / Rời nhóm (`POST /api/rooms/{roomId}/leave`) (`BR-17`, `BR-20`, `BR-29`)**:
   - Chỉ cho phép rời khi Space đang `Open` (chưa hết hạn đăng ký và chưa chốt sổ). Cho phép rời ngay cả khi nhóm đang ở trạng thái `Closed` (Đóng tuyển) theo `BR-29`.
   - **Nếu người rời là `Leader` (`BR-20`)**:
     - Còn thành viên khác trong phòng: Tự động chuyển `LeaderId` và `Role = Leader` cho thành viên có `JoinedAt` sớm nhất kế tiếp (`OrderBy(m => m.JoinedAt).First()`).
     - Nếu là người cuối cùng rời phòng (`MemberCount == 0`): Đặt `LeaderId = null`, chuyển trạng thái phòng về **`Empty` (Room trống)**.
   - **Cập nhật lại trạng thái phòng sau khi có người rời (`BR-17`)**:
     - Nếu `MemberCount` rớt xuống `< GroupThreshold` (ví dụ từ 3 người xuống 2 người) và `> 0`: Đặt `IsClosedByLeader = false`, chuyển trạng thái phòng về **`Forming` (Room đang lập)** để mở lại cổng vào thẳng; các đơn Apply đang chờ (nếu có) vẫn giữ nguyên (`BR-17`).
     - Nếu trước đó phòng đang `Closed` do đủ `5/5` người (`!IsClosedByLeader`), nay 1 người rời còn `4/5` người → chuyển trạng thái về `Recruiting`.
5. **Luồng Apply, Mở Vote ứng viên & Leader duyệt (`BR-22` → `BR-28`)**:
   - **Sinh viên nộp đơn Apply (`POST /api/rooms/{roomId}/join-requests`)**:
     - Chỉ áp dụng cho phòng đang ở trạng thái **`Recruiting` (Group đang tuyển, từ 3 người trở lên)** (`BR-16`).
     - Kiểm tra sinh viên chưa ở Room nào (`BR-24`), đã hoàn thành hồ sơ (`BR-07`), và số đơn `Pending` hiện tại `< Space.MaxConcurrentApplies` (`BR-22`).
   - **Vote ứng viên (`CandidateVote`) (`BR-25`)**:
     - Tạo thêm bảng `JoinRequestVote` (`Id`, `JoinRequestId`, `VoterUserId`, `IsApproved (bool)`, `VotedAt`).
     - Thêm cờ `bool IsVotingOpen` trên `JoinRequest`.
     - `POST /api/join-requests/{id}/open-vote`: `Leader` mở cuộc vote cho đơn Apply này.
     - `POST /api/join-requests/{id}/votes`: Thành viên trong Group bỏ phiếu `Đồng ý (true)` hoặc `Từ chối (false)` (mỗi thành viên 1 phiếu, có thể đổi ý khi đơn chưa chốt).
     - `PUT /api/join-requests/{id}/accept` & `PUT /api/join-requests/{id}/reject`: `Leader` xem thống kê phiếu bầu của nhóm và ra quyết định cuối cùng.
     - **Khi `Accept`**:
       - Đơn Apply của sinh viên này ở các nhóm khác chuyển thành **`Cancelled`** (`BR-26`).
       - Nếu nhóm chưa đủ người (`4/5`), các đơn chờ khác vào nhóm này giữ nguyên (`BR-27`).
       - Nếu nhóm vừa chạm mức đủ người (`5/5`): Trạng thái nhóm chuyển sang **`Closed`**, và **mọi đơn Apply đang chờ khác vào nhóm này chuyển thành `Rejected`** (chú ý: sửa code hiện tại từ `Cancelled` sang **`Rejected`** để đúng `BR-28`!).
6. **Leader chủ động Đóng tuyển / Mở tuyển lại (`BR-28`, `BR-29`)**:
   - `PUT /api/rooms/{roomId}/close-recruitment`: Chỉ `Leader` của Group (`MemberCount >= GroupThreshold`) được gọi. Đặt `IsClosedByLeader = true`, `Status = Closed`, và chuyển toàn bộ đơn Apply `Pending` của nhóm sang **`Rejected`** (`BR-28`).
   - `PUT /api/rooms/{roomId}/reopen-recruitment`: Khi Space vẫn đang `Open` và `MemberCount < MaxMembers`, Leader có thể mở tuyển lại (`IsClosedByLeader = false`, `Status = Recruiting`).
7. **Bầu lại Leader (`LeaderElection`) (`BR-18`, `BR-19`)**:
   - API chuyển Leader trực tiếp của Leader hiện tại (`PUT /api/rooms/{roomId}/leader` - đã có sẵn, giữ nguyên theo `BR-18`).
   - Thêm bảng `LeaderElection` (`Id`, `GroupId`, `CandidateUserId`, `InitiatedByUserId`, `Status: Active|Passed|Failed|Cancelled`, `CreatedAt`, `ExpiresAt = CreatedAt + 24h`) và `LeaderElectionVote` (`ElectionId`, `VoterUserId`, `IsAgreed`).
   - `POST /api/rooms/{roomId}/leader-elections`: Thành viên mở cuộc bầu cho 1 ứng viên trong nhóm (kiểm tra nhóm đang không có cuộc bầu `Active` nào khác - `BR-19`).
   - `POST /api/leader-elections/{electionId}/votes`: Thành viên bỏ phiếu. Ngay khi số phiếu đồng ý `> 50%` số thành viên hiện tại của nhóm → Tự động cập nhật `Group.LeaderId = CandidateUserId`, đánh dấu `Election.Status = Passed`.
   - Thêm Background Job `LeaderElectionExpiryJob`: Quét các cuộc bầu quá 24h chưa đủ phiếu chuyển sang `Failed`.

#### 4.2. Kiểm thử trên Swagger (`http://localhost:5004/swagger`)
- **Test Vào thẳng (`0 → 3 người`)**:
  - SV 1 gọi `join-direct` vào `FA26EXE101-01` → Thành `Leader`, Room sang `Forming (1/5)`.
  - SV 2 gọi `join-direct` → Vào thẳng làm `Member`, Room `Forming (2/5)`.
  - SV 3 gọi `join-direct` → Vào thẳng làm `Member`, Room chạm ngưỡng 3 người → Tự động biến thành `Recruiting (3/5)`.
- **Test Khóa vào thẳng & Apply (`4 → 5 người`)**:
  - SV 4 gọi `join-direct` vào phòng trên → Nhận lỗi `409 Conflict` (vì đã đủ 3 người).
  - SV 4 gọi `POST /join-requests` (Apply) → Leader mở vote → SV 1, 2, 3 gọi API vote → Leader gọi `accept` → Phòng lên `4/5`.
- **Test Đảo chiều trạng thái khi rời nhóm (`BR-17`, `BR-20`)**:
  - Khi phòng đang `3/5`, cho SV 1 (đang là `Leader`) gọi `POST /leave` → Xác nhận SV 2 (vào sớm tiếp theo) tự động lên làm `Leader` mới, và phòng tụt xuống `2/5` nên tự động quay về `Forming` (mở lại vào thẳng).

#### 4.3. Công việc ở Frontend (`GroupsModulePages.tsx`)
- **Trang Danh sách Room/Group của Space**:
  - Bộ lọc theo trạng thái (`Room trống`, `Đang lập (Vào thẳng)`, `Group đang tuyển (Apply)`, `Đã đóng tuyển`) và số chỗ trống (`BR-13`).
  - Trên mỗi thẻ Room:
    - Nếu `0–2 người`: Hiển thị nút màu xanh lá **"Vào thẳng Room"** (`BR-14`).
    - Nếu `3–4 người (Đang tuyển)`: Hiển thị nút màu xanh dương **"Apply vào Group"** kèm điểm phù hợp (`Matching Score`) (`BR-16`).
    - Nếu `Đóng tuyển / Đã đủ`: Hiển thị nhãn khóa và ẩn thông tin chi tiết thành viên đối với người ngoài (`BR-13`).
- **Trang Chi tiết Room/Group của tôi (`MyGroupPage`)**:
  - Hiển thị biểu đồ cân bằng 5 kỹ năng của cả nhóm + danh sách thành viên.
  - **Tab Đơn ứng tuyển (Apply & Vote)**: Danh sách ứng viên đang Apply + thanh tiến độ phiếu bầu của các thành viên trong nhóm (nút `Đồng ý` / `Từ chối` cho từng Member; nút `Mở Vote`, `Accept`, `Reject` cho Leader).
  - **Khu vực Quản trị nhóm**:
    - Cho Leader: Nút **"Đóng tuyển sớm"** / **"Mở tuyển lại"**, nút **"Chuyển quyền Leader"**.
    - Cho Member: Nút **"Mở bầu cử Leader mới"** + Hộp thoại bỏ phiếu nếu trong nhóm đang có cuộc bầu Leader diễn ra (đếm ngược 24h).
    - Nút **"Rời nhóm"** (hiển thị khi chưa hết hạn đăng ký; nếu là Leader thì nhắc sẽ tự chuyển quyền Leader cho người vào sớm nhất kế tiếp).

---

### GIAI ĐOẠN 5: Đóng đăng ký, Thuật toán gRPC Phân phối cưỡng chế Sinh viên lẻ & Chốt sổ
*(Bao phủ: `BR-30`, `BR-31`, `BR-32`, `BR-33`)*

#### 5.1. Công việc ở Backend (`Matching Service` gRPC + `Group Service`)
1. **Nâng cấp `Matching Service` (gRPC - [`matching.proto`](../backend/src/BuildingBlocks/Exe.Contracts/Protos/matching.proto) & [`MatchingCalculator.cs`](../backend/src/Services/Matching/Matching.Services/Implementations/MatchingCalculator.cs))**:
   - Cập nhật `StudentProfile` trong Proto để chứa **5 điểm kỹ năng (`Tech`, `Management`, `GraphicDesign`, `Marketing`, `Sale`)** và `Major`.
   - Cập nhật công thức tính điểm gợi ý (`CalculateMatch` / `RankGroups`): Tính độ bù đắp (Complementarity) — nếu Group đang thiếu kỹ năng nào trong 5 kỹ năng hoặc thiếu ngành nào, sinh viên mạnh về kỹ năng/ngành đó sẽ có điểm Matching cao hơn.
   - **Bổ sung RPC mới `DistributeUnmatchedStudents (DistributeRequest) returns (DistributeResponse)` (`BR-31`, `BR-32`)**:
     - **Input**: Danh sách toàn bộ sinh viên lẻ (chưa có nhóm, kèm 5 điểm kỹ năng + `Major`), danh sách các Room đang có người nhưng chưa đủ sĩ số (`1–4 người`), danh sách các Room trống (`0 người`), cùng `MaxMembers` (5) và `GroupThreshold` (3).
     - **Thuật toán xử lý trong `Matching.Services`**:
       1. *Bước 1*: Lấp các Room đang có người nhưng chưa đủ (`1–4 người`) trước (ưu tiên cứu các Room `1–2 người` lên đủ ngưỡng `3 người`, sau đó lấp lên `5 người`), mỗi bước chọn sinh viên lẻ giúp **tối ưu độ cân bằng 5 kỹ năng và đa dạng chuyên ngành** của phòng đó; **giữ nguyên Leader hiện tại của các phòng này** (`BR-31`).
       2. *Bước 2 (Balancing Partition)*: Với số sinh viên lẻ còn dư, phân bổ vào các Room trống để tạo các nhóm mới theo quy tắc cân đối sĩ số toán học:
          - **Quy tắc ngưỡng bắt buộc (BR-16)**: Mọi nhóm mới tạo đều phải đạt sĩ số từ `GroupThreshold` (3 người) đến `MaxMembers` (5 người).
          - **Nếu số sinh viên lẻ còn lại $< 3$ người**: Thuật toán **tuyệt đối không tạo nhóm mới** (không tạo nhóm 1–2 người vi phạm BR-16), giữ lại trong `TotalRemaining` để Moderator xử lý riêng.
          - **Nếu số sinh viên lẻ $N \ge 3$**: Tự động phân rã $N$ thành các nhóm cân bằng (ví dụ: $6 \rightarrow [3, 3]$; $7 \rightarrow [4, 3]$; $8 \rightarrow [4, 4]$; $11 \rightarrow [4, 4, 3]$) để tất cả các nhóm mới đều đủ điều kiện làm đề tài.
       3. *Bước 3*: Trong mỗi nhóm mới được tạo từ Room trống, tự động chọn **sinh viên có điểm `ManagementScore` cao nhất làm `Leader`** (nếu bằng điểm thì xét tổng điểm 5 kỹ năng) (`BR-32`).
2. **Xây dựng API Điều phối cuối kỳ cho `Moderator` trên `Group Service`**:
   - Background Job `RegistrationDeadlineJob` (hoặc API `PUT /api/spaces/{spaceId}/close-registration`): Chuyển Space sang `ClosedRegistration` khi hết hạn đăng ký, khóa việc sinh viên tự vào/rời nhóm và lọc ra danh sách SV lẻ + Room thiếu người (`BR-30`).
   - `POST /api/spaces/{spaceId}/distribute-preview`: Moderator gọi để xem trước phương án ghép sinh viên lẻ từ `Matching Service` (gRPC).
   - `POST /api/spaces/{spaceId}/distribute-confirm`: Thực thi phân phối cưỡng chế sinh viên lẻ vào các Room theo kết quả của `Matching Service`, phát event `MemberJoined` cho từng sinh viên được ghép.
   - `POST /api/spaces/{spaceId}/finalize` (**Chốt sổ - `BR-33`**):
     - Chuyển trạng thái Space sang `Locked`.
     - Chuyển toàn bộ các nhóm có thành viên sang trạng thái **`Locked` (Đã chốt sổ)**.
     - Chuyển toàn bộ các đơn Apply còn đang `Pending` trong Space sang **`Rejected`** (`BR-33`).

#### 5.2. Kiểm thử trên Swagger (`http://localhost:5004/swagger`)
- Dùng token `Moderator` gọi `GET /api/spaces/{spaceId}/unmatched-summary` → Xem danh sách SV lẻ và các Room đang có 1, 2, 3, 4 người.
- Gọi `POST /api/spaces/{spaceId}/distribute-preview` → Kiểm tra log `[GRPC]` gọi sang `Matching Service`, xem kết quả xếp nhóm cân bằng 5 kỹ năng và kiểm tra nhóm mới tạo có `Leader` đúng là người có điểm `Management` cao nhất (`BR-32`).
- Gọi `POST /api/spaces/{spaceId}/distribute-confirm` và `POST /api/spaces/{spaceId}/finalize` → Xác nhận mọi nhóm chuyển sang `Locked` và sinh viên gọi API `leave` bị chặn (`409 Conflict`).

#### 5.3. Công việc ở Frontend (`ModeratorDistributionPage.tsx`)
- Màn hình điều phối dành riêng cho **`Moderator`**:
  - Hiển thị 2 cột trực quan: **Danh sách Sinh viên lẻ chưa có nhóm** vs. **Danh sách Room/Group chưa đủ người**.
  - Nút **"Chạy Matching Phân phối tự động (Preview)"**: Hiển thị bảng kết quả dự kiến (ai được xếp vào phòng nào, điểm cân bằng 5 kỹ năng trước và sau khi xếp, ai được chọn làm Leader nhóm mới).
  - Nút **"Xác nhận Phân phối"** và nút **"Chốt sổ Học kỳ (Finalize & Lock)"**.

---

### GIAI ĐOẠN 6: Chuyển nhóm sau Chốt sổ (`BR-35` → `BR-37`) & Dashboard Báo cáo cho `Lecturer` / `Moderator`
*(Bao phủ: `BR-35`, `BR-36`, `BR-37` và toàn bộ quyền quan sát của vai trò `Lecturer`)*

#### 6.1. Công việc ở Backend (`Group Service` + `Report Service`)
1. **Chuyển nhóm sau chốt sổ trên `Group Service` (`BR-35`, `BR-36`, `BR-37`)**:
   - Tạo Entity **`GroupTransferRequest`**:
     - `Id`, `SpaceId`, `RequesterStudentId`, `FromGroupId`, `TargetGroupId`, `SwapWithStudentId` (nullable — dùng khi đổi chéo 2 người), `Reason`, `Status` (`Pending`, `Approved`, `Rejected`, `Cancelled`), `CreatedAt`, `DecidedAt`, `DecidedByModeratorId`.
   - **Kiểm tra quy tắc `BR-37` (dùng chung cho cả khi SV gửi đơn và khi Moderator chuyển trực tiếp)**:
     - **Nếu là Chuyển 1 chiều (`SwapWithStudentId == null`)**:
       - Nhóm đích (`TargetGroup`) phải còn chỗ trống (`MemberCount < MaxMembers`).
       - Nhóm cũ (`FromGroup`) sau khi bớt 1 người vẫn phải **đủ ngưỡng Group (`MemberCount - 1 >= GroupThreshold`, tức `>= 3 người`)**. Nếu nhóm cũ đang chỉ có đúng 3 người thì hệ thống báo lỗi yêu cầu phải chọn **Đổi chéo 2 sinh viên (`Swap`)**!
     - **Nếu là Đổi chéo 2 người (`SwapWithStudentId != null`)**:
       - Hoán đổi nhóm của `RequesterStudentId` và `SwapWithStudentId` trong cùng 1 transaction (sĩ số 2 nhóm không đổi nên luôn hợp lệ).
     - Nếu sinh viên chuyển đi đang là `Leader` của nhóm cũ, hệ thống tự động gán người vào sớm nhất kế tiếp trong nhóm cũ làm `Leader` mới.
   - **Các API chuyển nhóm**:
     - `POST /api/transfer-requests`: Sinh viên gửi yêu cầu chuyển nhóm sau khi Space đã `Locked` (`BR-36`).
     - `GET /api/spaces/{spaceId}/transfer-requests`: `Moderator` xem danh sách yêu cầu chuyển nhóm.
     - `PUT /api/transfer-requests/{id}/approve` & `PUT /api/transfer-requests/{id}/reject`: `Moderator` duyệt hoặc từ chối (`BR-36`).
     - `POST /api/spaces/{spaceId}/direct-transfer`: `Moderator` chuyển trực tiếp 1 sinh viên sang nhóm khác hoặc đổi chéo 2 sinh viên bất kỳ mà không cần sinh viên gửi đơn (`BR-35`).
2. **Nâng cấp `Report Service` cho `Lecturer` và `Moderator`**:
   - Cập nhật các bảng thống kê trong `ExeReportDb` (`StudentStat`, `GroupStat`, `ReportSnapshot`) thêm `SpaceId` (`SemesterCode`, `SubjectCode`) và thông tin 5 kỹ năng.
   - Cho phép cả **`Lecturer`** và **`Moderator`** (`[Authorize(Roles = Roles.LecturerOrModerator)]`) truy cập:
     - `GET /api/reports/summary?spaceId=`: Tổng quan số SV đủ điều kiện, số SV đã có nhóm, số SV lẻ, số Room trống / Đang lập / Group đang tuyển / Đóng tuyển / Đã chốt sổ, thống kê theo chuyên ngành.
     - `GET /api/reports/groups?spaceId=&status=`: Xem danh sách các nhóm, thành viên, Leader, và trạng thái ghép nhóm.
     - `GET /api/reports/export-csv?spaceId=`: Xuất danh sách nhóm & thành viên chính thức ra file CSV để giảng viên lấy danh sách chấm điểm.

#### 6.2. Kiểm thử trên Swagger (`http://localhost:5004/swagger` & `http://localhost:5007/swagger`)
- Dùng token `Student` (sau khi Space đã `Locked`) gửi `POST /api/transfer-requests` → Dùng token `Moderator` gọi `PUT /api/transfer-requests/{id}/approve` → Kiểm tra thành viên đã được chuyển nhóm thành công và thỏa mãn `BR-37`.
- Dùng token `Moderator` gọi `POST /api/spaces/{spaceId}/direct-transfer` để chuyển trực tiếp hoặc đổi chéo 2 sinh viên.
- Dùng token `Lecturer` gọi các API trên `Report Service` và `Group Service` → Xác nhận `Lecturer` xem được toàn bộ danh sách nhóm, thành viên, thống kê và tải được file CSV, nhưng nếu dùng token `Lecturer` gọi API chốt sổ hay chuyển nhóm của `Moderator` sẽ bị chặn `403 Forbidden`.

#### 6.3. Công việc ở Frontend
- **Cho `Student`**: Trong trang `MyGroupPage` (khi Space đã `Locked`), nút *"Rời nhóm"* được thay bằng nút **"Xin chuyển nhóm / Đổi chéo"** (chọn mã nhóm muốn tới, chọn sinh viên đổi chéo nếu nhóm đích đã đầy hoặc nhóm cũ chỉ có 3 người, nhập lý do) + bảng theo dõi trạng thái đơn xin chuyển nhóm.
- **Cho `Moderator`**: Tab **"Quản lý Chuyển nhóm sau chốt sổ"** (Duyệt/Từ chối đơn của SV + Công cụ chuyển trực tiếp / đổi chéo 2 sinh viên giữa 2 nhóm).
- **Cho `Lecturer` (`LecturerDashboardPage.tsx`)**:
  - Giao diện Dashboard chuyên biệt, sạch sẽ dành cho Giảng viên hướng dẫn:
    - Chọn Học kỳ & Môn học (`FA26 - EXE101`, `FA26 - EXE201`).
    - Xem biểu đồ tiến độ ghép nhóm toàn khóa, cơ cấu chuyên ngành.
    - Xem danh sách toàn bộ các Team/Group, bấm vào từng Team xem chi tiết các thành viên, ai là Leader, biểu đồ 5 kỹ năng của nhóm đó và tải xuống file CSV danh sách nhóm.

---

## PHẦN 4: BẢNG CHECKLIST ĐỐI CHIẾU 37 BUSINESS RULES VỚI 6 GIAI ĐOẠN

| Mã quy tắc | Nội dung tóm tắt | Thuộc Giai đoạn | Service chịu trách nhiệm |
| :--- | :--- | :---: | :--- |
| **BR-01** | Lấy danh sách SV đủ điều kiện từ FAP theo kỳ/môn; chỉ SV trong danh sách mới vào được Space | Giai đoạn 1 & 3 | `Group Service` + `Auth Service` |
| **BR-02** | Đăng nhập bằng email trường, cấp mật khẩu qua email & tự đổi mật khẩu | Giai đoạn 1 | `Auth Service` + `Notification Service` |
| **BR-03** | Sau khi đăng nhập, SV thấy Space của học kỳ và môn mình đang học | Giai đoạn 3 | `Group Service` |
| **BR-04** | Ngành (`Major`) và Khóa (`Cohort`) lấy tự động từ MSSV, SV không sửa được | Giai đoạn 2 | `User Service` |
| **BR-05** | SV tự đánh giá 5 kỹ năng: `Tech`, `Management`, `Graphic Design`, `Marketing`, `Sale` (lưu `0–100`) | Giai đoạn 2 | `User Service` |
| **BR-06** | Phải tick ô cam kết chịu trách nhiệm mới lưu được hồ sơ | Giai đoạn 2 | `User Service` |
| **BR-07** | Phải hoàn thành hồ sơ trước khi vào Room hoặc Apply | Giai đoạn 2 & 4 | `User Service` + `Group Service` |
| **BR-08** | Moderator cấu hình cho từng môn: sĩ số tối đa (mặc định 5), hệ số dự phòng, giới hạn Apply, hạn đăng ký | Giai đoạn 3 | `Group Service` |
| **BR-09** | Số Room = làm tròn lên ($\text{Tổng SV} \div \text{Sĩ số tối đa} \times \text{Hệ số dự phòng}$) | Giai đoạn 3 | `Group Service` |
| **BR-10** | Room chia theo môn: SV khác lớp cùng môn được chung nhóm | Giai đoạn 3 | `Group Service` |
| **BR-11** | Mã Room = mã kỳ + mã môn + số thứ tự (vd: `FA26EXE101-01`) | Giai đoạn 3 | `Group Service` |
| **BR-12** | Sinh viên không tự tạo nhóm, chỉ vào các Room hệ thống đã tạo | Giai đoạn 3 & 4 | `Group Service` |
| **BR-13** | SV xem danh sách Room, lọc theo trạng thái & chỗ trống; Room đã đủ/đóng tuyển ẩn bớt thông tin | Giai đoạn 4 | `Group Service` |
| **BR-14** | Room dưới ngưỡng (`0–2 người`): SV chưa có nhóm vào thẳng, không cần duyệt | Giai đoạn 4 | `Group Service` |
| **BR-15** | Người đầu tiên vào Room trống làm `Leader` | Giai đoạn 4 | `Group Service` |
| **BR-16** | Ngưỡng thành Group = `> 50%` sĩ số tối đa (`5 → 3`). Đạt ngưỡng thì tự khóa vào thẳng, chỉ vào qua Apply | Giai đoạn 4 | `Group Service` |
| **BR-17** | Group có người rời rớt dưới ngưỡng thì quay lại thành Room, mở lại vào thẳng; đơn chờ giữ nguyên | Giai đoạn 4 | `Group Service` |
| **BR-18** | Leader được chuyển quyền Leader cho thành viên khác | Giai đoạn 4 | `Group Service` |
| **BR-19** | Thành viên mở cuộc bầu Leader (`> 50%` đồng ý, hạn 24h, mỗi Room 1 cuộc bầu 1 lúc) | Giai đoạn 4 | `Group Service` |
| **BR-20** | Leader rời Room thì quyền Leader tự chuyển cho người vào sớm nhất; người cuối rời thì Room về trống | Giai đoạn 4 | `Group Service` |
| **BR-21** | Mỗi SV chỉ ở 1 Room tại 1 thời điểm trong 1 môn | Giai đoạn 4 | `Group Service` |
| **BR-22** | Số đơn Apply đang chờ của 1 SV không vượt giới hạn Moderator cấu hình | Giai đoạn 4 | `Group Service` |
| **BR-23** | Moderator đổi giới hạn thì đơn đã gửi giữ nguyên; giới hạn mới chỉ áp dụng cho đơn gửi sau | Giai đoạn 3 & 4 | `Group Service` |
| **BR-24** | Chỉ SV chưa ở Room nào mới được Apply; SV được rút đơn khi đơn còn chờ | Giai đoạn 4 | `Group Service` |
| **BR-25** | Leader mở vote cho từng ứng viên, mỗi thành viên 1 phiếu nhận/bỏ; Leader quyết định `Accept`/`Reject` | Giai đoạn 4 | `Group Service` |
| **BR-26** | SV vào được 1 nhóm (được Accept hoặc vào thẳng Room) thì mọi đơn chờ khác của họ chuyển thành `Cancel` | Giai đoạn 4 | `Group Service` |
| **BR-27** | Nhóm nhận thêm người nhưng chưa đủ thì các đơn chờ khác giữ nguyên | Giai đoạn 4 | `Group Service` |
| **BR-28** | Nhóm đủ người hoặc Leader đóng tuyển thì mọi đơn đang chờ vào nhóm đó chuyển thành `Reject` | Giai đoạn 4 | `Group Service` |
| **BR-29** | Nhóm đóng tuyển thì người ngoài không vào được, nhưng thành viên vẫn được rời nhóm (trước hạn chốt) | Giai đoạn 4 | `Group Service` |
| **BR-30** | Hết hạn đăng ký, hệ thống lọc ra SV chưa có nhóm và các nhóm chưa đủ người | Giai đoạn 5 | `Group Service` |
| **BR-31** | Moderator phân phối cưỡng chế SV lẻ: lấp các Room còn thiếu trước (giữ nguyên Leader), còn dư mới tạo nhóm mới | Giai đoạn 5 | `Group Service` + `Matching Service` |
| **BR-32** | `Matching Service` (gRPC) xếp SV lẻ cân bằng 5 kỹ năng & chuyên ngành; nhóm mới tạo thì Leader là người có điểm `Management` cao nhất | Giai đoạn 5 | `Matching Service` (gRPC) |
| **BR-33** | Moderator chốt sổ: mọi thành viên bị khóa cứng, không ai tự vào hay tự rời; đơn còn chờ chuyển thành `Reject` | Giai đoạn 5 | `Group Service` |
| **BR-34** | Ứng dụng hiển thị điều khoản toàn quyền điều phối; SV đồng ý khi đăng nhập lần đầu | Giai đoạn 1 | `Auth Service` |
| **BR-35** | Sau chốt sổ, Moderator được chuyển trực tiếp 1 SV sang nhóm khác | Giai đoạn 6 | `Group Service` |
| **BR-36** | SV gửi yêu cầu chuyển nhóm, Moderator `Approve` hoặc `Reject` | Giai đoạn 6 | `Group Service` |
| **BR-37** | Nhóm nhận phải còn chỗ; nhóm cũ sau khi chuyển vẫn phải đủ ngưỡng, nếu không phải đổi chéo 2 người (`Swap`) | Giai đoạn 6 | `Group Service` |

