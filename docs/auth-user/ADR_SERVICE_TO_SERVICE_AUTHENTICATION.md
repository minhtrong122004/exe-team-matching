# ADR: Xác thực Liên Dịch vụ cho Tác vụ Chạy ngầm (Service-to-Service Authentication)

> **Architecture Decision Record (ADR-001)**
> Trạng thái: **PROPOSED (Đề xuất chờ Phê duyệt)**
> Người đề xuất: Vy (Auth & User Lead)
> Giai đoạn: Stage H2 — EXE Team Matching System (PRN232 Final Assignment)

---

## 1. BỐI CẢNH VÀ VẤN ĐỀ (CONTEXT & PROBLEM STATEMENT)

Trong kiến trúc hệ thống hiện tại:
- Tất cả các endpoint của User Service (`GET /api/users/{id}`, `POST /api/users/batch`, `GET /api/users`) đều yêu cầu xác thực JWT qua thuộc tính `[Authorize]`.
- **Luồng người dùng trực tiếp (User-driven):** Group Service nhận request từ trình duyệt người dùng qua Gateway, có thể chuyển tiếp nguyên vẹn Bearer Token của người dùng (User JWT Delegation). Luồng này hoạt động tốt.
- **Luồng tác vụ nền (Background Jobs / Asynchronous Workers):** Khi một worker chạy ngầm độc lập (ví dụ: Job kiểm tra hết hạn lời mời `InvitationExpiryJob`, Job quét nhóm tuyển dụng định kỳ của Group Service, hoặc Job tạo báo cáo `ReportSnapshotJob` của Report Service) cần truy vấn danh sách hồ sơ sinh viên từ User Service, nó **không có sẵn token của người dùng**. Nếu gọi thẳng sang User Service không có token, User Service sẽ trả về HTTP `401 Unauthorized`.

Cần một cơ chế xác thực an toàn, chuẩn mực và tuân thủ nguyên tắc Least Privilege (Đặc quyền tối thiểu) để các background jobs có thể tương tác hợp lệ giữa các microservice.

---

## 2. SO SÁNH CÁC PHƯƠNG ÁN (OPTIONS COMPARISON)

| Tiêu chí so sánh | Phương án 1: User JWT Delegation | Phương án 2: Internal Service API Key | Phương án 3: Machine-to-Machine JWT (Khuyến nghị) |
| :--- | :--- | :--- | :--- |
| **Bản chất cơ chế** | Chuyển tiếp token người dùng ban đầu qua header `Authorization` | Dùng chung một API Key bí mật nội bộ (`X-Internal-Service-Key`) | Dịch vụ gọi lấy JWT riêng từ Auth Service (Client Credentials) hoặc ký bằng Service Key |
| **Khả thi cho Background Job** | ❌ **Không khả thi** (Job chạy ngầm không có user context) | ✅ **Khả thi** | ✅ **Khả thi** |
| **Độ phức tạp triển khai** | Rất thấp (đã có) | Rất thấp (1 Middleware kiểm tra header) | Trung bình (cần đăng ký client & cấp token) |
| **Tuân thủ Least Privilege** | Kém (kế thừa toàn bộ quyền của user) | Trung bình (Key có thể bị lạm dụng nếu rò rỉ) | ✅ **Rất cao** (Claim `scope: "service:read"` giới hạn chặt chẽ) |
| **Khả năng kiểm toán (Auditability)** | Biết được user, không phân biệt được service gọi | Khó phân biệt cụ thể service nào gọi nếu dùng chung key | ✅ **Xuất sắc** (Token chỉ rõ `client_id = "group-service"`) |
| **Phù hợp chuẩn Microservices** | Tốt cho user flow, vô dụng cho worker | Chấp nhận được trong mạng nội bộ Docker | ✅ **Chuẩn công nghiệp (OAuth2 Client Credentials)** |

---

## 3. ĐỀ XUẤT KIẾN TRÚC: MACHINE-TO-MACHINE (M2M) JWT

Nhóm Auth/User đề xuất triển khai **Phương án 3: Least-Privilege Machine-to-Machine JWT** cho các tác vụ chạy ngầm.

### Thiết kế kỹ thuật chi tiết:

1. **Token Issuer & Audience:**
   - `Issuer = "exe-auth"` (do Auth Service phát hành).
   - `Audience = "exe-internal-api"` (phân tách rõ ràng với token người dùng `exe-api` để Gateway không cho phép token nội bộ lọt ra ngoài Internet).
2. **Định danh dịch vụ (Service Identity):**
   - Claim `sub`: Định danh định danh máy của client (vd: `"service:group-service"`, `"service:report-service"`).
   - Claim `client_id`: `"group-service"`.
3. **Phân quyền đặc quyền tối thiểu (Scope / Permission Claims):**
   - Chỉ cấp các scope đọc cụ thể, không cấp quyền Admin hay quyền sửa hồ sơ:
     - `scope = "users:read"`: Cho phép gọi `GET /api/users/{id}`, `POST /api/users/batch`.
     - Tuyệt đối không cấp quyền `users:write` hay `skills:write`.
4. **Thời hạn sống của Token (Expiration):**
   - Ngắn hạn: **15 phút** (không cần refresh token; khi hết hạn Worker tự gọi Auth Service cấp token mới bằng Client Secret lưu trong biến môi trường).
5. **Quản lý khóa bí mật (Key Management):**
   - Mỗi service sở hữu một `ClientId` và `ClientSecret` riêng được cấu hình qua Docker environment (`Services__Group__ClientSecret`).
6. **Ranh giới ủy quyền (Authorization Boundaries):**
   - User Service cấu hình một Authorization Policy mới: `InternalServiceOrUserPolicy`:
     - Chấp nhận token người dùng có `sub` là Guid hợp lệ HOẶC token dịch vụ có claim `scope: "users:read"`.

---

## 4. TÁC ĐỘNG TÍCH HỢP TỚI CÁC DỊCH VỤ ĐỒNG ĐỘI

1. **Group Service:** Khi khởi chạy background job, gọi `POST /api/auth/token` với grant type `client_credentials` để lấy M2M token trước khi gọi `IUserClient.GetBatchProfilesAsync()`.
2. **API Gateway:** Cấu hình chặn toàn bộ request từ bên ngoài có Audience là `exe-internal-api`.
3. **Report Service:** Tương tự Group Service khi cần đối chiếu dữ liệu người dùng.

---

## 5. PHÊ DUYỆT CẦN THIẾT TỪ TOÀN NHÓM (REQUIRED APPROVALS)

- [ ] Trọng (Group Service Lead & Matching Service Lead)
- [ ] Tú (Project Service Lead & Frontend Lead)
- [ ] Phú (Notification & Report Service Lead)
- [ ] Vy (Auth & User Service Lead - Đã đề xuất)

*Lưu ý: Không triển khai code cho ADR này trong Stage H2 theo đúng chỉ thị STRICT LIMITS.*
