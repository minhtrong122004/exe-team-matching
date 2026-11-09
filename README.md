# EXE Team Matching System

Hệ thống web phân tán giúp sinh viên Đại học FPT ghép nhóm đa ngành cho môn EXE (Experiential Entrepreneurship).
PRN232 Final Assignment.

## 1. Project description

**Bài toán:** mỗi kỳ có rất nhiều sinh viên học các môn EXE (EXE101, EXE201). Nếu ai cũng tự tạo nhóm thì dễ sinh ra hàng loạt nhóm lẻ, khó quản lý, và luôn còn sinh viên chưa có nhóm khi hết hạn. Hệ thống chia sẵn Room theo danh sách lớp, cho sinh viên tự vào hoặc Apply, rồi hỗ trợ điều phối viên xếp nốt sinh viên lẻ và chốt sổ.

**Đối tượng sử dụng:**

| Vai trò | Làm được gì |
|---|---|
| Student | Đăng nhập Google, khai hồ sơ 5 kỹ năng, vào Room, Apply, vote ứng viên, bầu Leader, xin chuyển nhóm |
| Moderator | Quản lý kỳ và môn, import danh sách, cấu hình, tạo Room, phân phối sinh viên lẻ, chốt sổ, chuyển nhóm, quản lý tài khoản |
| Lecturer | Xem danh sách nhóm, tiến độ, báo cáo và xuất CSV |

**Chức năng chính:**
- Đăng nhập Google, chỉ email có trong danh sách của môn mới vào được
- Import danh sách lớp từ FAP (file `.xls` hoặc `.csv`) và tự tạo Room theo sĩ số
- Vòng đời Room: `Empty → Forming → Recruiting → Closed → Locked`
- Vào thẳng khi dưới ngưỡng; từ ngưỡng trở lên chỉ vào qua Apply, thành viên vote và Leader quyết định
- Bầu Leader trong 24 giờ, Leader chuyển quyền, tự chuyển quyền khi Leader rời nhóm
- Phân phối sinh viên lẻ qua gRPC, có xem trước phương án, rồi chốt sổ
- Chuyển nhóm sau chốt sổ: Moderator chuyển trực tiếp hoặc sinh viên gửi yêu cầu
- Thông báo trong app và email; báo cáo tiến độ, xuất CSV

## 2. System architecture

Sơ đồ C0, C1 nằm ở [docs/architecture/README.md](docs/architecture/README.md), thiết kế dữ liệu ở [docs/architecture/ERD.md](docs/architecture/ERD.md).

```
Web App (React)
   │ REST
API Gateway (YARP, kiểm tra JWT)
   ├── /api/auth/**                       → Auth Service          → ExeAuthDb
   ├── /api/users/**, /api/skills/**      → User Service          → ExeUserDb
   ├── /api/projects/**                   → Project Service       → ExeProjectDb
   ├── /api/groups/**, /api/spaces/**,
   │   /api/join-requests/**,
   │   /api/transfer-requests/**          → Group Service         → ExeGroupDb
   │                                          ├─ REST → Auth, User, Project
   │                                          └─ gRPC → Matching Service
   ├── /api/notifications/**              → Notification Service  → ExeNotificationDb → MailHog
   └── /api/reports/**                    → Report Service        → ExeReportDb

Redis Streams (event bus)
   producer: Auth, User, Group
   consumer: User, Notification, Report
```

**Danh sách service:**

| Service | Loại | Database | Nhiệm vụ |
|---|---|---|---|
| API Gateway | YARP | – | Cổng vào duy nhất, kiểm tra JWT, định tuyến |
| Auth | REST | ExeAuthDb | Đăng nhập Google, JWT, refresh token, cấp và khóa tài khoản |
| User | REST | ExeUserDb | Hồ sơ, 5 kỹ năng, cam kết, tìm ứng viên |
| Project | REST | ExeProjectDb | Đề tài của nhóm |
| Group | REST + gRPC client | ExeGroupDb | Học kỳ, Space, Room, Apply, vote, bầu Leader, phân phối, chốt sổ, chuyển nhóm |
| Matching | gRPC | – | Tính điểm phù hợp, xếp sinh viên lẻ |
| Notification | REST + background | ExeNotificationDb | Thông báo trong app, gửi email |
| Report | REST + background | ExeReportDb | Thống kê, báo cáo định kỳ, xuất CSV |

**Cách giao tiếp:**
- **REST (đồng bộ):** Web → Gateway → service; Group → Auth, User, Project
- **gRPC (đồng bộ):** Group → Matching
- **Redis Streams (bất đồng bộ):** các event bên dưới

**Danh sách event:**

| Event | Service phát | Service nhận |
|---|---|---|
| UserRegistered | Auth | User, Notification, Report |
| UserProfileUpdated | User | Report |
| JoinRequestCreated | Group | Notification |
| JoinRequestDecided | Group | Notification |
| MemberJoined | Group | User, Notification, Report |
| MemberLeft | Group | User, Notification, Report |
| MemberRemoved | Group | Notification |
| MemberTransferredPostLock | Group | Notification, Report |
| SpaceFinalized | Group | Chưa có service nhận |

## 3. Technology stack

| Phần | Công nghệ |
|---|---|
| Backend | .NET 10, ASP.NET Core Web API, Entity Framework Core 10, FluentValidation, MailKit |
| Xác thực | Google Sign-In (Google.Apis.Auth), JWT |
| Giao tiếp | REST, gRPC (Grpc.AspNetCore), Redis Streams (StackExchange.Redis), YARP |
| Database | SQL Server 2022 (mỗi service một database) |
| Tài liệu API | Swagger / OpenAPI (Swashbuckle) |
| Frontend | React 19, Vite, TypeScript, React Router, Axios |
| Hạ tầng | Docker, Docker Compose, Redis 7, MailHog |
| Test | xUnit |

## 4. Installation guide

**Yêu cầu cài đặt:**
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (bắt buộc)
- [.NET 10 SDK](https://dotnet.microsoft.com/download) (để viết code backend)
- [Node.js 22 LTS](https://nodejs.org/) (để viết code frontend)
- Git

**Các bước:**

```bash
git clone <repository-url>
cd exe-team-matching

# Tạo file cấu hình môi trường, rồi điền email Google của Moderator vào MODERATOR_EMAILS
cp .env.example .env          # Windows: copy .env.example .env

# Khôi phục công cụ dotnet-ef và build backend
cd backend
dotnet tool restore
dotnet build
```

## 5. Deployment instructions

**Chạy toàn bộ hệ thống:**

```bash
docker compose up -d --build
docker compose ps              # mọi container phải ở trạng thái healthy
```

**Địa chỉ truy cập:**

| Thành phần | Địa chỉ |
|---|---|
| Web App | http://localhost:3000 |
| API Gateway | http://localhost:5000 |
| Auth Service (Swagger) | http://localhost:5001/swagger |
| User Service (Swagger) | http://localhost:5002/swagger |
| Project Service (Swagger) | http://localhost:5003/swagger |
| Group Service (Swagger) | http://localhost:5004/swagger |
| Matching Service (gRPC) | localhost:5005 |
| Notification Service (Swagger) | http://localhost:5006/swagger |
| Report Service (Swagger) | http://localhost:5007/swagger |
| MailHog (hộp thư) | http://localhost:8025 |
| SQL Server | `localhost,1433` (user `sa`, mật khẩu trong `.env`) |
| Redis | `localhost:6379` |

**Đăng nhập:** hệ thống chỉ đăng nhập bằng Google, nên cần có internet và phải mở bằng `http://localhost:3000` (không dùng `127.0.0.1` hay IP máy).

| Vai trò | Cách có tài khoản |
|---|---|
| Moderator, Lecturer | Khai báo email Google trong `.env` (`MODERATOR_EMAILS`, `LECTURER_EMAILS`, nhiều email cách nhau bằng dấu phẩy), rồi khởi động lại Auth Service |
| Student | Moderator import danh sách vào Space. Email Google phải trùng email trong danh sách |

`student1..8@exe.local` chỉ là dữ liệu mẫu, không đăng nhập được vì không phải tài khoản Google thật.

**Luồng demo:**
1. Moderator đăng nhập, tạo Space, import danh sách, bấm tạo Room.
2. Sinh viên đăng nhập, đồng ý điều khoản, khai 5 kỹ năng và tick cam kết.
3. Sinh viên vào Room; đủ ngưỡng thì Room thành Group, người khác phải Apply.
4. Thành viên vote, Leader Accept hoặc Reject; xem thông báo và email ở MailHog.
5. Moderator đóng đăng ký, xem trước và xác nhận phân phối sinh viên lẻ, rồi chốt sổ.
6. Sau chốt sổ, sinh viên xin chuyển nhóm và Moderator duyệt; Lecturer xem báo cáo và xuất CSV.

**Lệnh thường dùng:**

```bash
docker compose logs -f group-service             # xem log một service
docker compose logs -f | grep "\[EVENT-"         # lọc log event khi demo
docker compose up -d --build group-service       # build lại một service sau khi sửa code
docker compose down                              # tắt hệ thống (giữ dữ liệu)
docker compose down -v                           # tắt và xóa toàn bộ dữ liệu
```

**Chạy một service bằng Visual Studio để debug:**

```bash
docker compose up -d                  # chạy cả hệ thống
docker compose stop group-service     # tắt service mình đang sửa
```
Sau đó mở `backend/ExeTeamMatching.sln`, chọn project `Group.API` làm Startup Project và bấm F5.

## 6. Team member responsibilities

| Thành viên | Service | Phần việc |
|---|---|---|
| Vy | Auth, User, API Gateway | Đăng nhập, JWT, quản lý tài khoản; hồ sơ, kỹ năng; định tuyến Gateway |
| Trọng | Group, Matching | Space, Room, Apply, vote, bầu Leader, phân phối, chốt sổ, chuyển nhóm; gRPC |
| Phú | Notification, Report | Nhận event, thông báo trong app, gửi email; thống kê, báo cáo định kỳ, xuất CSV |
| Tú | Project, Web App | Đề tài của nhóm; giao diện React cho mọi vai trò |
