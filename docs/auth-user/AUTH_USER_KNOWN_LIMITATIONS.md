# Các Giới Hạn Đã Biết và Điểm Chặn Kiến Trúc (Known Limitations & Blockers)

> **Tài liệu Báo cáo Giới Hạn và Các Điểm Chặn Kỹ Thuật Cần Quyết Định**
> Dự án: EXE Team Matching System (PRN232 Final Assignment)
> Giai đoạn: Stage H1

---

## 1. KHỞI TẠO TÀI KHOẢN ADMIN (ĐÃ GIẢI QUYẾT TẠI STAGE H2)

### Thực trạng ban đầu:
- Endpoint `POST /api/auth/admin/users` không tồn tại, và cổng đăng ký công khai `POST /api/auth/register` chỉ cho phép vai trò `"Student"`.
- Trước Stage H2, không có cơ chế hợp lệ nào để khởi tạo Admin đầu tiên.

### Giải pháp an toàn đã triển khai (Stage H2):
- Đã triển khai cơ chế **Admin Bootstrap có kiểm soát (Explicit Invocation)**:
  - Chỉ được phép chạy trên môi trường `Development`.
  - Từ chối thực thi nếu trong `ExeAuthDb` đã tồn tại bất kỳ tài khoản Admin nào.
  - Nhận thông tin xác thực an toàn từ `dotnet user-secrets` (`Bootstrap:AdminEmail`, `Bootstrap:AdminPassword`, `Bootstrap:AdminFullName`).
  - Lệnh thực thi: `dotnet run --project backend/src/Services/Auth/Auth.API/Auth.API.csproj -- --bootstrap-admin`.
  - Mật khẩu được băm bằng BCrypt; tuyệt đối không log mật khẩu hay hash.

---

## 2. XÁC THỰC GIỮA CÁC DỊCH VỤ CHO BACKGROUND JOBS (ĐÃ CÓ ADR ĐỀ XUẤT)

### Thực trạng:
- Tất cả các endpoint của User Service (`GET /api/users/{id}`, `POST /api/users/batch`, `GET /api/users`) đều được bảo vệ bởi thuộc tính `[Authorize]`.
- Khi người dùng gửi request từ Web App qua Gateway → Group Service → User Service, Group Service có thể chuyển tiếp nguyên vẹn Bearer Token của người dùng (Token Delegation).
- **Tuy nhiên:** Khi một Background Job (ví dụ: Job kiểm tra hết hạn lời mời, Job quét nhóm định kỳ của Group Service, hoặc Report Worker) cần truy vấn danh sách hồ sơ sinh viên từ User Service, nó **không có sẵn token của người dùng**. Nếu gọi thẳng sang User Service không kèm Bearer Token hợp lệ, User Service sẽ trả về `401 Unauthorized`.

### Tiến độ giải quyết tại Stage H2:
- Đã soạn thảo tài liệu quyết định kiến trúc chi tiết: [ADR_SERVICE_TO_SERVICE_AUTHENTICATION.md](file:///Users/phanvy/Desktop/khach/SE%20FPT%202024/FALL_26/PRN232/Assignment/EXE_Team_Matching/exe-team-matching/docs/auth-user/ADR_SERVICE_TO_SERVICE_AUTHENTICATION.md).
- **Khuyến nghị toàn nhóm:** Triển khai Machine-to-Machine JWT Token (OAuth2 Client Credentials) với thời hạn ngắn (15 phút), claim `scope: "users:read"`, phân tách Audience `exe-internal-api`. Chờ phê duyệt từ các thành viên phụ trách Group và Report service trước khi code.

---

## 3. TÍNH NHẤT QUÁN CUỐI CÙNG GIỮA AUTH VÀ USER (EVENTUAL CONSISTENCY)

- Khi sinh viên đăng ký tài khoản qua `POST /api/auth/register`, tài khoản được tạo ngay lập tức trong `ExeAuthDb`, nhưng hồ sơ trong `ExeUserDb` được tạo **bất đồng bộ** thông qua Redis Streams (`Auth Outbox Worker` → `Redis Stream` → `User Consumer Worker`).
- Độ trễ thông thường trong môi trường local/container là **100ms – 500ms**.
- Nếu Frontend ngay lập tức điều hướng sang trang Profile và gọi `GET /api/users/me` trong vòng vài mili-giây đầu tiên, có thể gặp `404 NotFound` nếu Consumer Worker chưa kịp xử lý xong.
- *Khuyến nghị Frontend:* Khi nhận kết quả đăng ký thành công, hiển thị thông báo chào mừng hoặc chờ 500ms trước khi redirect sang trang hồ sơ, hoặc xử lý retry nhẹ (retry 1-2 lần) nếu gặp 404 trong lần tải đầu tiên.

---

## 4. GIỚI HẠN THU HỒI ACCESS TOKEN (STATELESS JWT LIMITATION)

- JWT Access Token được ký bằng khóa đối xứng HMAC-SHA256 và có thời hạn sống **60 phút**.
- Khi người dùng gọi `POST /api/auth/logout` hoặc Admin khóa tài khoản (`PATCH /api/auth/accounts/{id}/lock`), hệ thống đã thu hồi thành công **Refresh Token** trong database, ngăn không cho tài khoản lấy token mới.
- **Tuy nhiên:** Do JWT là phi trạng thái (stateless), Access Token đã cấp trước đó vẫn sẽ hợp lệ cho đến khi hết hạn 60 phút, trừ khi triển khai thêm một Distributed Token Blacklist (lưu danh sách jti bị thu hồi vào Redis) trên `ExceptionHandlingMiddleware` hoặc Authentication Handler.
- Đối với phạm vi môn học PRN232, việc thu hồi Refresh Token và chặn refresh phiên mới là phù hợp với chuẩn thiết kế.

---

## 5. LỖ HỔNG PHỤ THUỘC NUGET (ĐÃ GIẢI QUYẾT TRIỆT ĐỂ TẠI STAGE H2)

- Lỗ hổng bảo mật `GHSA-846f-f764-76mx` (High) và `GHSA-2fmv-rv2c-59x7` (Moderate) trong `System.Security.Cryptography.Pkcs` đã được giải quyết triệt để tại Stage H2.
- Đã kích hoạt `<CentralPackageTransitivePinningEnabled>true</CentralPackageTransitivePinningEnabled>` và ghim `<PackageVersion Include="System.Security.Cryptography.Pkcs" Version="10.0.13" />` trong `Directory.Packages.props`.
- **Kết quả:** Toàn bộ 96 cảnh báo `NU1902/NU1903` đã bị xóa bỏ hoàn toàn (0 Warnings khi build toàn bộ 28 projects).

---

## 6. KHÁC BIỆT THỰC TẾ SO VỚI ĐẶC TẢ SƠ BỘ TRONG CLAUDE.MD

| Endpoint / Tính năng | Mô tả trong CLAUDE.md sơ bộ | Thực tế mã nguồn triển khai | Ghi chú kỹ thuật |
| :--- | :--- | :--- | :--- |
| **Cập nhật mã sinh viên** | `PUT /users/me/student-code` | Đã gộp vào `PUT /api/users/me` | Trường `StudentCode` được gửi trong request body của `PUT /api/users/me`. Có kiểm tra trùng lặp và trả về 409 Conflict. |
| **Khóa / Mở khóa tài khoản** | `PUT /auth/accounts/{id}/lock` | `PATCH /api/auth/accounts/{id}/lock` | Sử dụng phương thức `PATCH` vì đây là thao tác cập nhật một phần trạng thái (partial update `IsActive`). |
| **Tạo Admin qua API** | Không nêu rõ | Không có endpoint | Chỉ cho phép đăng ký Student công khai. Cần script SQL hoặc seed data để có tài khoản Admin đầu tiên. |
| **Danh mục kỹ năng** | `GET /skills` | `GET /api/skills`, `POST /api/skills`, `GET /api/skills/{id}` | Endpoint `POST /api/skills` được bảo vệ nghiêm ngặt chỉ dành cho `Admin` (Decision 1 của đồ án). |
