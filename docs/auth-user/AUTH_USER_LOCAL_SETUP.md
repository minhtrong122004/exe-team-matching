# Hướng dẫn Thiết lập và Khởi chạy Cục bộ (Local Setup Guide)

> **Hướng dẫn Cài đặt, Cấu hình và Vận hành Auth Service & User Service**
> Dự án: EXE Team Matching System (PRN232 Final Assignment)

---

## 1. YÊU CẦU MÔI TRƯỜNG TIÊN QUYẾT (PREREQUISITES)

- **.NET SDK:** 10.0 (`net10.0`)
- **Docker & Docker Compose:** Chạy container `sqlserver` (SQL Server 2022) và `redis` (Redis 7 Alpine).
- **EF Core CLI:** `dotnet tool install --global dotnet-ef` (nếu chưa cài).

---

## 2. KHỞI CHẠY HẠ TẦNG DOCKER

Từ thư mục gốc dự án (`exe-team-matching/`):

```bash
# Khởi động SQL Server và Redis
docker compose up -d sqlserver redis

# Kiểm tra trạng thái container
docker compose ps
```

- SQL Server lắng nghe tại: `localhost:1433`
- Redis lắng nghe tại: `localhost:6379`

---

## 3. CƠ SỞ DỮ LIỆU & EF CORE MIGRATIONS

Mỗi service sở hữu một Database độc lập theo đúng nguyên tắc Database per Microservice:

| Service | Database Name | Migration Name | Thư mục Project chứa DbContext |
| :--- | :--- | :--- | :--- |
| **Auth Service** | `ExeAuthDb` | `20261015071237_InitialCreate` | `backend/src/Services/Auth/Auth.Repository` |
| **User Service** | `ExeUserDb` | `20261017042532_InitialCreate` | `backend/src/Services/User/User.Repository` |

### Lệnh chạy Migration an toàn:

```bash
# Chạy migration cho ExeAuthDb
dotnet ef database update \
    --project backend/src/Services/Auth/Auth.Repository \
    --startup-project backend/src/Services/Auth/Auth.API \
    --connection "Server=localhost,1433;Database=ExeAuthDb;User Id=sa;Password=<YOUR_SA_PASSWORD>;TrustServerCertificate=True"

# Chạy migration cho ExeUserDb
dotnet ef database update \
    --project backend/src/Services/User/User.Repository \
    --startup-project backend/src/Services/User/User.API \
    --connection "Server=localhost,1433;Database=ExeUserDb;User Id=sa;Password=<YOUR_SA_PASSWORD>;TrustServerCertificate=True"
```

---

## 4. CẤU HÌNH BIẾN MÔI TRƯỜNG & USER SECRETS

> [!CAUTION]
> **Quy tắc an ninh:** Không bao giờ commit chuỗi kết nối chứa mật khẩu hoặc JWT Secret Key vào git. Khi chạy cục bộ, dùng `dotnet user-secrets`.

### Cấu hình cho Auth Service:
```bash
cd backend/src/Services/Auth/Auth.API
dotnet user-secrets set "ConnectionStrings:Default" "Server=localhost,1433;Database=ExeAuthDb;User Id=sa;Password=<YOUR_SA_PASSWORD>;TrustServerCertificate=True"
dotnet user-secrets set "ConnectionStrings:Redis" "localhost:6379"
dotnet user-secrets set "Jwt:Key" "EXE_TEAM_MATCHING_JWT_SECRET_KEY_FOR_LOCAL_DEV_PRN232_123456"
dotnet user-secrets set "Jwt:Issuer" "exe-auth"
dotnet user-secrets set "Jwt:Audience" "exe-api"

# Cấu hình khởi tạo tài khoản Admin ban đầu (Stage H2):
dotnet user-secrets set "Bootstrap:AdminEmail" "admin.dev@exe.local"
dotnet user-secrets set "Bootstrap:AdminPassword" "<YourStrongAdminPassword@123>"
dotnet user-secrets set "Bootstrap:AdminFullName" "EXE Dev Administrator"
```

### 4.1 Khởi tạo Tài khoản Quản trị viên Ban đầu (Admin Bootstrap)
Sau khi cấu hình `user-secrets`, chạy lệnh CLI chuyên dụng để khởi tạo tài khoản Admin đầu tiên:
```bash
dotnet run --project backend/src/Services/Auth/Auth.API/Auth.API.csproj --launch-profile http -- --bootstrap-admin
```
- Lệnh sẽ tự động băm mật khẩu bằng BCrypt và lưu vào `ExeAuthDb.Accounts`.
- Nếu đã tồn tại bất kỳ tài khoản Admin nào, lệnh sẽ từ chối thực thi để bảo vệ an toàn dữ liệu.


### Cấu hình cho User Service:
> [!IMPORTANT]
> **Bắt buộc đồng bộ JWT Key:** User Service (và tất cả service khác như Gateway, Group) **PHẢI** dùng chung giá trị `Jwt:Key`, `Jwt:Issuer` và `Jwt:Audience` với Auth Service thì mới giải mã và xác thực được Token!

```bash
cd backend/src/Services/User/User.API
dotnet user-secrets set "ConnectionStrings:Default" "Server=localhost,1433;Database=ExeUserDb;User Id=sa;Password=<YOUR_SA_PASSWORD>;TrustServerCertificate=True"
dotnet user-secrets set "ConnectionStrings:Redis" "localhost:6379"
dotnet user-secrets set "Jwt:Key" "EXE_TEAM_MATCHING_JWT_SECRET_KEY_FOR_LOCAL_DEV_PRN232_123456"
dotnet user-secrets set "Jwt:Issuer" "exe-auth"
dotnet user-secrets set "Jwt:Audience" "exe-api"
```

---

## 5. KHỞI CHẠY DỊCH VỤ VÀ KIỂM TRA SWAGGER

Mở 2 cửa sổ terminal riêng biệt từ thư mục gốc `exe-team-matching/`:

### Cửa sổ 1: Chạy Auth Service (Cổng 5001)
```bash
dotnet run --project backend/src/Services/Auth/Auth.API/Auth.API.csproj --launch-profile http
```
- Swagger UI: `http://localhost:5001/swagger`
- Health check: `http://localhost:5001/health`

### Cửa sổ 2: Chạy User Service (Cổng 5002)
```bash
dotnet run --project backend/src/Services/User/User.API/User.API.csproj --launch-profile http
```
- Swagger UI: `http://localhost:5002/swagger`
- Health check: `http://localhost:5002/health`

---

## 6. KIỂM THỬ XÁC NHẬN TOÀN HỆ THỐNG (UNIT TEST)

```bash
# Chạy toàn bộ 130 unit tests của hệ thống
dotnet test backend/ExeTeamMatching.sln
```
Kết quả mong đợi: `130 Passed, 0 Failed, 0 Skipped`.
