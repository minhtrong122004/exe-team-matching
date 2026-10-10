# EXE Team Matching System

Hệ thống web phân tán giúp sinh viên Đại học FPT ghép nhóm đa ngành cho môn EXE (Experiential Entrepreneurship).
PRN232 Final Assignment.

## 1. Project description

**Bài toán:** sinh viên làm môn EXE cần tìm nhóm đa ngành (lập trình, thiết kế, kinh doanh, marketing) phù hợp với
ý tưởng dự án, nhưng việc tìm người hiện làm thủ công qua mạng xã hội, khó biết ai còn trống và ai hợp với nhóm.

**Đối tượng sử dụng:**

| Vai trò | Làm được gì |
|---|---|
| Student | Tạo hồ sơ kỹ năng, tạo dự án, tạo/tham gia nhóm, nhận gợi ý nhóm hoặc ứng viên phù hợp |
| Lecturer | Xem danh sách nhóm, sinh viên và báo cáo ghép nhóm |
| Admin | Quản lý tài khoản, xem báo cáo |

**Chức năng chính:**
- Đăng ký, đăng nhập (JWT), quản lý tài khoản
- Hồ sơ sinh viên: chuyên ngành, kỹ năng, lĩnh vực quan tâm, trạng thái tìm nhóm
- Quản lý ý tưởng dự án EXE
- Tạo nhóm, vị trí cần tuyển, yêu cầu tham gia, lời mời
- Tính điểm phù hợp sinh viên ↔ nhóm (matching score) qua gRPC
- Thông báo trong app và email
- Báo cáo tình hình ghép nhóm, xuất CSV

## 2. System architecture

> TODO: thêm hình C0, C1 vào `docs/architecture/` và chèn vào đây.

```
Web App (React)
   │ REST
API Gateway (YARP, kiểm tra JWT)
   ├── /api/auth/**                       → Auth Service          → ExeAuthDb
   ├── /api/users/**, /api/skills/**      → User Service          → ExeUserDb
   ├── /api/projects/**                   → Project Service       → ExeProjectDb
   ├── /api/groups/**, /api/join-requests/**,
   │   /api/invitations/**                → Group Service         → ExeGroupDb
   │                                          ├─ REST → User, Project
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
| Auth | REST | ExeAuthDb | Đăng ký, đăng nhập, refresh token, khóa tài khoản |
| User | REST | ExeUserDb | Hồ sơ, kỹ năng, tìm ứng viên |
| Project | REST | ExeProjectDb | Ý tưởng dự án EXE |
| Group | REST + gRPC client | ExeGroupDb | Nhóm, vị trí tuyển, yêu cầu tham gia, lời mời |
| Matching | gRPC | – | Tính điểm phù hợp và xếp hạng |
| Notification | REST + background | ExeNotificationDb | Thông báo trong app, gửi email |
| Report | REST + background | ExeReportDb | Thống kê, báo cáo định kỳ, xuất CSV |

**Cách giao tiếp:**
- **REST (đồng bộ):** Web → Gateway → service; Group → User, Group → Project
- **gRPC (đồng bộ):** Group → Matching
- **Redis Streams (bất đồng bộ):** các event bên dưới

**Danh sách event:**

| Event | Service phát | Service nhận |
|---|---|---|
| UserRegistered | Auth | User, Notification, Report |
| UserProfileUpdated | User | Report |
| GroupCreated | Group | Report |
| JoinRequestCreated | Group | Notification |
| JoinRequestDecided | Group | Notification |
| InvitationCreated | Group | Notification |
| MemberJoined | Group | User, Notification, Report |
| MemberLeft | Group | User, Notification, Report |

## 3. Technology stack

| Phần | Công nghệ |
|---|---|
| Backend | .NET 10, ASP.NET Core Web API, Entity Framework Core 10, FluentValidation, BCrypt, MailKit |
| Giao tiếp | REST, gRPC (Grpc.AspNetCore), Redis Streams (StackExchange.Redis), YARP |
| Database | SQL Server 2022 (mỗi service một database) |
| Tài liệu API | Swagger / OpenAPI (Swashbuckle) |
| Frontend | React 18, Vite, TypeScript, React Router, Axios, TanStack Query, Ant Design |
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

# Tạo file cấu hình môi trường (không bắt buộc: thiếu .env thì dùng giá trị mặc định)
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

**Tài khoản mẫu:** (TODO: có sau khi Auth Service seed dữ liệu)

| Email | Mật khẩu | Vai trò |
|---|---|---|
| admin@exe.local | Admin@123 | Admin |
| lecturer@exe.local | Lecturer@123 | Lecturer |
| student1..8@exe.local | Student@123 | Student |

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
| Vy | Auth, User, API Gateway | Đăng ký/đăng nhập, JWT, quản lý tài khoản; hồ sơ, kỹ năng, tìm ứng viên; định tuyến Gateway |
| Trọng | Group, Matching | Nhóm, vị trí tuyển, yêu cầu tham gia, lời mời, business rule; gRPC tính điểm phù hợp |
| Phú | Notification, Report | Nhận event, thông báo trong app, gửi email; thống kê, báo cáo định kỳ, xuất CSV |
| Tú | Project, Web App | CRUD ý tưởng dự án; giao diện React cho mọi vai trò |
