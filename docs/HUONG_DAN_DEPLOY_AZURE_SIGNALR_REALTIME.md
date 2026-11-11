# HƯỚNG DẪN KỸ THUẬT & DEPLOY REALTIME SIGNALR + REDIS EVENT BUS (DỰ ÁN EXE TEAM MATCHING)

> **Dành cho**: Toàn bộ thành viên nhóm phát triển, đặc biệt là thành viên phụ trách Triển khai Hạ tầng / DevOps Azure.  
> **Mục tiêu**: Nắm rõ kiến trúc Real-time vừa bổ sung, các tệp thay đổi và cách đưa lên máy chủ Azure VM mà không làm gián đoạn hệ thống.

---

## 1. TỔNG QUAN KIẾN TRÚC REAL-TIME VỪA BỔ SUNG

Hệ thống vừa được tích hợp giải pháp **Đồng bộ thời gian thực Đa vai trò (Multi-Role Real-Time Synchronization)** sử dụng mô hình **Event-Driven Realtime Gateway**:

```
[ Client A (Student / Moderator) ]
        │  (Gọi API HTTP)
        ▼
[ API Gateway (YARP) :5000 ]
        │
        ▼
[ Group.API / User.API ] ──(Ghi DB)──► [ Redis Streams :6379 ]
                                              │
                                              ▼
                             [ Notification.API (SignalR Hub) ]
                                              │ (Bắn WebSocket qua YARP)
                                              ▼
[ Client B, C, D (Mọi Role khác đang mở trình duyệt) ] ──► Tự động cập nhật tức thì (<50ms)
```

### Điểm ưu việt của giải pháp:
1. **Không làm thay đổi cấu trúc Service**:
   - `Group.API`, `User.API`, `Project.API` vẫn hoạt động độc lập, chỉ publish domain events (`MemberJoined`, `MemberLeft`, `MemberRemoved`, `SpaceFinalized`, `MemberTransferredPostLock`, `TransferRequestCreated`, `TransferRequestCancelled`, `TransferRequestRejected`) lên Redis Streams như thiết kế ban đầu.
2. **Không phát sinh chi phí hạ tầng mới**:
   - Sử dụng lại **Redis 7** sẵn có trong Docker Compose làm Event Bus.
   - SignalR Hub được host tập trung ngay bên trong **`Notification.API`** (nâng cấp thành Hub trung tâm).
   - **Không cần mua thêm dịch vụ Azure SignalR Service** trả phí đắt đỏ; toàn bộ chạy self-hosted trong cụm Docker Compose trên Azure VM.
3. **Phân vùng kênh bảo mật (Channel & Group Topology)**:
   - `user_{userId}`: Thông báo cá nhân, đơn được duyệt, lời mời, lý do bị từ chối chuyển nhóm.
   - `space_{spaceId}`: Toàn bộ cập nhật về phòng/nhóm trong môn học (sĩ số `3/5` lên `4/5`, mở/khóa sổ, đơn chuyển nhóm mới).
   - `group_{groupId}`: Cập nhật nội bộ nhóm (thành viên vào/ra, đơn xin gia nhập mới).
   - `role_moderator`, `role_lecturer`: Bảng điều khiển quản trị và giảng viên.

---

## 2. CHI TIẾT CÁC TỆP ĐÃ THAY ĐỔI TRONG MÃ NGUỒN

### 2.1. Phía Backend (.NET 10)
- **`backend/src/BuildingBlocks/Exe.Contracts/Events/GroupEvents.cs`**:
   - Định nghĩa thêm các Domain Events: `TransferRequestCreated` (sinh viên nộp đơn chuyển nhóm sau chốt sổ), `TransferRequestCancelled` (sinh viên rút đơn), `TransferRequestRejected` (Moderator từ chối).
- **`backend/src/Services/Group/Group.Services/Implementations/CourseSpaceService.cs`**:
   - Bổ sung phát sự kiện `TransferRequestCreated` khi sinh viên gửi đơn, `TransferRequestCancelled` khi sinh viên rút đơn, và `TransferRequestRejected` khi Moderator từ chối đơn.
- **`backend/src/BuildingBlocks/Exe.BuildingBlocks/Auth/JwtAuthenticationExtensions.cs`**:
  - Bổ sung sự kiện `OnMessageReceived` trong cấu hình JWT Bearer: Trích xuất JWT token từ query string (`?access_token=...`) trong quá trình bắt tay WebSocket (Handshake) của SignalR.
- **`backend/src/Services/Notification/Notification.API/Hubs/AppRealtimeHub.cs`** *(File mới)*:
  - Hub SignalR tập trung, xác thực `[Authorize]`.
  - Tự động gán Client vào nhóm `user_{userId}` và `role_{role}` khi kết nối.
  - Cung cấp các hàm `JoinSpace`, `LeaveSpace`, `JoinGroup`, `LeaveGroup`.
- **`backend/src/Services/Notification/Notification.API/Workers/NotificationEventConsumers.cs`**:
  - Tiêm `IHubContext<AppRealtimeHub>` vào các Consumer. Khi nhận event từ Redis Streams, tự động bắn tín hiệu SignalR tương ứng xuống Client.
  - Bổ sung `SpaceFinalizedConsumer` để bắn sự kiện khi Điều phối viên chốt sổ môn học.
  - Bổ sung `TransferRequestCreatedConsumer`, `TransferRequestCancelledConsumer`, `TransferRequestRejectedConsumer` để cập nhật bảng yêu cầu chuyển nhóm tức thời cho Moderator và thông báo cho sinh viên.
- **`backend/src/Services/Notification/Notification.API/Program.cs`**:
  - Đăng ký `builder.Services.AddSignalR()`.
  - Đăng ký HostedService `SpaceFinalizedConsumer`, `TransferRequestCreatedConsumer`, `TransferRequestCancelledConsumer`, `TransferRequestRejectedConsumer`.
  - Ánh xạ Hub: `app.MapHub<AppRealtimeHub>("/hubs/realtime")` và `app.MapHub<AppRealtimeHub>("/hubs/notifications")`.
- **`backend/src/ApiGateway/Exe.ApiGateway/appsettings.json`**:
  - Thêm cấu hình định tuyến YARP cho `/hubs/{**catch-all}` và `/api/hubs/{**catch-all}` trỏ về cluster `notification`.

### 2.2. Phía Frontend (React 19 + TypeScript + Vite)
- **`frontend/package.json`**: Cài đặt thư viện chính chủ `@microsoft/signalr`.
- **`frontend/nginx.conf`**:
  - Thêm khối cấu hình `location /hubs/` hỗ trợ WebSocket Upgrade (`Upgrade $http_upgrade`, `Connection "upgrade"`) và thiết lập `proxy_read_timeout 86400s` (tránh rớt kết nối WebSocket).
- **`frontend/vite.config.ts`**:
  - Cấu hình proxy development cho `/hubs` với `ws: true`.
- **`frontend/src/contexts/RealtimeContext.tsx`** *(File mới)*:
  - Quản lý vòng đời kết nối SignalR: tự động kết nối khi đăng nhập, tự động ngắt khi đăng xuất, tự reconnect với chính sách exponential backoff (`0s -> 2s -> 5s -> 10s -> 30s`).
  - Tự động phát Custom Event của trình duyệt (`realtime:space-updated`, `realtime:group-updated`, `notifications:updated`, v.v.).
- **`frontend/src/App.tsx`**: Bọc toàn bộ ứng dụng trong `<RealtimeProvider>`.
- **`frontend/src/hooks/useSelectedSpace.ts`**:
  - Tự động tải lại danh sách môn học khi nhận sự kiện `realtime:space-updated`.
  - Tự động gửi ý định tham gia kênh của môn học đang mở.
- **Các trang giao diện tự động đồng bộ thời gian thực**:
  - `GroupsModulePages.tsx` (`GroupsPage`, `MyGroupPage`, `JoinRequestsPage`): Nhảy sĩ số, tự cập nhật danh sách nhóm và trạng thái đơn duyệt.
  - `ModeratorSpacesPage.tsx`: Cập nhật sĩ số phòng và danh sách sinh viên tức thì.
  - `ModeratorDistributionPage.tsx`: Cập nhật danh sách sinh viên lẻ chưa có nhóm.
  - `ModeratorTransfersPage.tsx`: Cập nhật yêu cầu chuyển nhóm sau chốt sổ.
  - `LecturerDashboardPage.tsx`: Bảng telemetry của giảng viên nhảy số trực tiếp.
  - `MainLayout.tsx`: Icon quả chuông và thông báo cập nhật ngay lập tức.

---

## 3. HƯỚNG DẪN DEPLOY LÊN AZURE VM DÀNH CHO THÀNH VIÊN NHÓM

Quy trình CI/CD trên nhánh `develop` của dự án đã được cấu hình trong `.github/workflows/deploy.yml`. Để deploy bản cập nhật này lên Azure VM, các thành viên thực hiện theo hướng dẫn dưới đây:

### 3.1. Đối với Thành viên Lấy Code về (Git Workflow)
1. Kéo code nhánh tính năng về hoặc merge PR vào `develop`:
   ```bash
   git checkout develop
   git pull origin develop
   ```
2. Kiểm tra build cục bộ trước khi deploy (đảm bảo môi trường sạch sẽ):
   ```bash
   # 1. Kiểm tra Backend
   dotnet build backend/ExeTeamMatching.sln
   dotnet test backend/ExeTeamMatching.sln

   # 2. Kiểm tra Frontend
   cd frontend
   npm ci
   npm run build
   ```

### 3.2. Quy trình Auto-Deploy qua GitHub Actions
Vì file `.github/workflows/deploy.yml` đã được cài đặt tự động kích hoạt khi có commit mới trên nhánh `develop`:
- Khi PR của tính năng Real-time này được merge vào `develop`:
  1. GitHub Actions sẽ tự động chạy job `Backend build & test` và `Frontend build`.
  2. Khi cả hai pass, job `Deploy to Azure VM` sẽ tự động đóng gói bằng `git archive`, SSH vào Azure VM, chạy lệnh:
     ```bash
     cd ~/exe-team-matching
     sudo docker compose up -d --build --remove-orphans
     ```
  3. Quá trình deploy hoàn toàn tự động, **không cần SSH vào VM để sửa file bằng tay**.

### 3.3. Bảng Kiểm tra (Checklist) Cấu hình trên Azure VM
Nếu cần kiểm tra trực tiếp trên máy chủ Azure VM, lưu ý 3 điểm sau:

| Hạng mục | Trạng thái yêu cầu | Ghi chú kỹ thuật |
| :--- | :--- | :--- |
| **Cổng kết nối (Ports)** | Port `80` (HTTP) và/hoặc `443` (HTTPS), hoặc `3000` (Web) | WebSockets chạy **ngay trên cổng HTTP/HTTPS thông thường**, **KHÔNG CẦN** mở thêm bất kỳ port lạ nào trên Azure NSG (Network Security Group). |
| **Biến môi trường (`.env`) trên VM** | Giữ nguyên file `.env` hiện tại | Không cần thêm biến môi trường mới. SignalR sử dụng chung `ConnectionStrings__Redis` và `Jwt__Key` đã có sẵn trong Docker Compose. |
| **Nginx Reverse Proxy ngoài VM (nếu có)** | Phải bật WebSocket proxy headers | Nếu trên Azure VM có một Nginx trung gian chạy ngoài Docker để cài SSL (Let's Encrypt), đảm bảo đã có cấu hình chuyển tiếp WebSockets (xem mục 3.4 bên dưới). |

### 3.4. Cấu hình Nginx Host ngoài VM (Chỉ áp dụng nếu có Nginx ngoài Docker cấp SSL)
Nếu Azure VM dùng Nginx bên ngoài để gắn chứng chỉ SSL trỏ vào container Frontend (`localhost:3000`), mở file config Nginx trên host (`/etc/nginx/sites-available/...`) và bổ sung:

```nginx
# Cấu hình WebSocket passthrough cho SignalR
location /hubs/ {
    proxy_pass http://127.0.0.1:3000/hubs/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 86400s;
    proxy_send_timeout 86400s;
}
```
*Lưu ý: Nếu Azure VM trỏ thẳng domain vào container `web` (port 80 hoặc 3000) của Docker Compose thì file `frontend/nginx.conf` bên trong container đã được cấu hình sẵn 100%, không cần làm gì thêm.*

---

## 4. KỊCH BẢN KIỂM THỬ THỜI GIAN THỰC (TEST GUIDE)

Sau khi deploy lên Azure VM (hoặc chạy test dưới local), thực hiện kịch bản kiểm thử sau:

### Kịch bản 1: Sinh viên vào Room -> Sĩ số tự nhảy trên màn hình Điều phối viên & Giảng viên
1. Mở **Trình duyệt Chrome (Cửa sổ 1)**: Đăng nhập tài khoản `Moderator` (`moderator@fe.edu.vn`), vào trang **Học kỳ & Phòng** (`/moderator/spaces`), chọn môn `FA26 EXE101`.
2. Mở **Trình duyệt Firefox / Ẩn danh (Cửa sổ 2)**: Đăng nhập tài khoản `Student` (`student1@fpt.edu.vn`), vào trang **Khám phá nhóm** (`/groups`), chọn môn `FA26 EXE101`.
3. Tại Cửa sổ 2 (Student): Bấm **"Vào phòng"** tại phòng trống bất kỳ (ví dụ `FA26EXE101-02` đang là `0/5`).
4. **Kết quả quan sát**:
   - Tại Cửa sổ 1 (Moderator) và mọi màn hình khác đang xem môn học đó: Sĩ số phòng `FA26EXE101-02` **lập tức nhảy lên `1/5` mà không cần F5 hoặc bấm nút Tải lại**.

### Kịch bản 2: Điều phối viên Chốt sổ -> Sinh viên tự động bị khóa thao tác
1. Để Cửa sổ 2 (Student) đang mở trang danh sách phòng.
2. Tại Cửa sổ 1 (Moderator): Bấm nút **"Chốt sổ học phần"** (Finalize).
3. **Kết quả quan sát**:
   - Cửa sổ 2 (Student) lập tức nhận tín hiệu `SpaceFinalized`: Các nút "Vào phòng" / "Tạo phòng" tự động khóa, trạng thái chuyển sang "Đã chốt sổ", đồng thời mở khóa tính năng xin điều chuyển nhóm.

### Kịch bản 3: Sinh viên gửi đơn Apply -> Trưởng nhóm nhận thông báo tức thì
1. Cửa sổ 1: Đăng nhập tài khoản Trưởng nhóm.
2. Cửa sổ 2: Đăng nhập sinh viên khác, bấm nộp đơn xin gia nhập nhóm của Trưởng nhóm.
3. **Kết quả quan sát**:
   - Icon quả chuông ở góc trên Cửa sổ 1 lập tức chuyển sang màu đỏ và nhảy số thông báo mới.
   - Khi Trưởng nhóm mở trang `MyGroup`, đơn ứng tuyển mới đã xuất hiện sẵn trong danh sách chờ duyệt.

---

## 5. CÁC LỆNH HỖ TRỢ XỬ LÝ SỰ CỐ TRÊN MÁY CHỦ (TROUBLESHOOTING)

Nếu có sự cố kết nối, SSH vào Azure VM và sử dụng các lệnh sau:

```bash
# 1. Kiểm tra trạng thái toàn bộ containers
sudo docker compose ps

# 2. Xem log realtime của Notification Service (SignalR Hub)
sudo docker compose logs -f notification-service

# 3. Xem log của API Gateway (kiểm tra WebSockets upgrade)
sudo docker compose logs -f api-gateway

# 4. Xem log của Nginx Web Frontend
sudo docker compose logs -f web
```
*(Trong log của `notification-service`, khi có client kết nối thành công sẽ xuất hiện dòng: `SignalR connected: ConnectionId=..., UserId=..., Role=...`).*

