# Auth & User REST API Contract Specification

> **Tài liệu Hợp đồng Giao tiếp REST API — Auth Service & User Service**
> Dự án: EXE Team Matching System (PRN232 Final Assignment)
> Nhánh: `feature/auth-user-services`
> Người phụ trách: Vy (Auth & User Backend Lead)
> Cập nhật lần cuối: 2026-10-17 (Stage H1)

---

## 1. TỔNG QUAN VÀ QUY ƯỚC CHUNG

1. **Base URL qua API Gateway:** `http://localhost:5000` (YARP Gateway định tuyến)
   - `/api/auth/**` → Auth Service (`http://auth-service:5001`)
   - `/api/users/**`, `/api/skills/**` → User Service (`http://user-service:5002`)
2. **Chuẩn dữ liệu:**
   - Định dạng payload: JSON (`application/json`), thuộc tính camelCase.
   - Định dạng Enum: Chuỗi ký tự (String Enum, vd: `"Student"`, `"LookingForTeam"`, `"Technical"`).
   - Định dạng Thời gian: Chuỗi ISO 8601 UTC (vd: `"2026-10-17T15:35:02.589174Z"`).
   - Định dạng Định danh (ID): UUID / GUID chuẩn (vd: `"89f3a5c3-1d6a-4c36-9c03-b14183fc2d17"`).
3. **Cơ chế xác thực (Authentication):**
   - Header: `Authorization: Bearer <jwt_access_token>`
   - Bất kỳ endpoint nào đánh dấu `[Authorize]` sẽ trả về `401 Unauthorized` nếu thiếu hoặc sai token.
   - Bất kỳ endpoint nào đánh dấu `[Authorize(Roles = "...")]` sẽ trả về `403 Forbidden` nếu người dùng không có vai trò phù hợp.
4. **Chuẩn lỗi hệ thống:**
   - Theo chuẩn RFC 7807 ProblemDetails mở rộng kèm trường `code`:
     ```json
     {
       "status": 409,
       "title": "Mã số sinh viên 'SE123456' đã được sử dụng bởi một tài khoản khác.",
       "code": "STUDENT_CODE_ALREADY_EXISTS",
       "traceId": "0HN7B8..."
     }
     ```

---

## 2. MA TRẬN API AUTH SERVICE (`/api/auth`)

| Method & Route | Auth / Role | Request DTO | Response DTO (HTTP Status) | Trạng thái xác minh |
| :--- | :--- | :--- | :--- | :---: |
| `POST /api/auth/register` | Public (Anonymous) | `RegisterRequest` | `AuthResponse` (201 Created) | **IMPLEMENTED AND VERIFIED** |
| `POST /api/auth/login` | Public (Anonymous) | `LoginRequest` | `AuthResponse` (200 OK) | **IMPLEMENTED AND VERIFIED** |
| `POST /api/auth/refresh` | Public (Anonymous) | `RefreshTokenRequest` | `AuthResponse` (200 OK) | **IMPLEMENTED AND VERIFIED** |
| `POST /api/auth/logout` | Public (Anonymous) | `LogoutRequest` | `{ message: string }` (200 OK) | **IMPLEMENTED AND VERIFIED** |
| `GET /api/auth/me` | Bearer Token | Không | `AccountResponse` (200 OK) | **IMPLEMENTED AND VERIFIED** |
| `GET /api/auth/accounts` | Bearer (Admin) | `GetAccountsQuery` (query) | `PagedResult<AccountResponse>` (200 OK) | **IMPLEMENTED AND VERIFIED** |
| `PATCH /api/auth/accounts/{id}/lock` | Bearer (Admin) | `{id}` (Route Guid) | `AccountResponse` (200 OK) | **IMPLEMENTED AND VERIFIED** |
| `PATCH /api/auth/accounts/{id}/unlock` | Bearer (Admin) | `{id}` (Route Guid) | `AccountResponse` (200 OK) | **IMPLEMENTED AND VERIFIED** |
| `POST /api/auth/accounts/lecturers` | Bearer (Admin) | `CreateLecturerRequest` | `AccountResponse` (201 Created) | **IMPLEMENTED AND VERIFIED** |

### Chi tiết các endpoint Auth

#### 1. Đăng ký tài khoản (`POST /api/auth/register`)
- **Ràng buộc:** Email hợp lệ (max 256 ký tự); Password tối thiểu 8 ký tự, gồm ít nhất 1 chữ hoa, 1 số, 1 ký tự đặc biệt; Role chỉ được phép là `"Student"` (bỏ trống tự nhận diện là Student).
- **Tác dụng phụ (Side effect):** Ghi bản ghi vào `ExeAuthDb.Accounts` và đồng thời chèn 1 bản ghi vào `ExeAuthDb.OutboxMessages` trong cùng transaction để Worker xuất bản event `UserRegistered` sang Redis Streams.
- **Request mẫu:**
  ```json
  {
    "email": "student@fpt.edu.vn",
    "password": "Password@123",
    "fullName": "Nguyen Van A",
    "role": "Student"
  }
  ```
- **Response mẫu (201 Created):**
  ```json
  {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "cRH6jy3Id478kDEw6EjoRCGZnZfDPW3PQnrIuNJpCrzi2qGCqxiOOVg-gqmsEhAuwMYzmX5z_M04b2CCmB_Z9A",
    "user": {
      "id": "89f3a5c3-1d6a-4c36-9c03-b14183fc2d17",
      "email": "student@fpt.edu.vn",
      "fullName": "Nguyen Van A",
      "role": "Student"
    }
  }
  ```

#### 2. Đăng nhập (`POST /api/auth/login`)
- **Tác dụng phụ:** Sinh Access Token mới (hạn 60 phút) và Refresh Token mới (hạn 7 ngày) lưu hash SHA-256 vào `ExeAuthDb.RefreshTokens`.
- **Mã lỗi:** `400 BadRequest` (thiếu trường), `401 Unauthorized` (sai mật khẩu hoặc email không tồn tại), `403 Forbidden` (tài khoản đang bị khóa `IsActive = false`).

#### 3. Làm mới Token (`POST /api/auth/refresh`)
- **Cơ chế Token Rotation:** Khi Refresh Token hợp lệ được gửi lên, nó bị thu hồi (`RevokedAt = UtcNow`) và thay thế bằng cặp Access Token/Refresh Token mới (`ReplacedByTokenId`).
- **Phát hiện tái sử dụng (Reuse Detection):** Nếu gửi lại một Refresh Token đã bị thu hồi, hệ thống coi đó là hành vi tấn công giả mạo, lập tức thu hồi toàn bộ các Refresh Token của tài khoản đó và trả về `401 Unauthorized`.

#### 4. Khóa / Mở khóa tài khoản Admin (`PATCH /api/auth/accounts/{id}/lock` & `unlock`)
- **Lưu ý khác biệt so với CLAUDE.md:** Code thực tế sử dụng phương thức HTTP **`PATCH`** thay vì `PUT` vì chỉ thay đổi cờ trạng thái `IsActive`.
- **Tác dụng phụ khi khóa:** Thu hồi toàn bộ Refresh Token của tài khoản bị khóa (`RevokeReason = "ACCOUNT_LOCKED"`).

#### 5. Khởi tạo tài khoản Giảng viên (`POST /api/auth/accounts/lecturers`)
- **Phân quyền:** Yêu cầu quyền Quản trị viên (`[Authorize(Roles = "Admin")]`). Anonymous trả về `401 Unauthorized`, Student trả về `403 Forbidden`.
- **Nguyên tử hóa:** Ghi nhận đồng thời `Account` (Role = `Lecturer`) và `OutboxMessage` (`UserRegisteredEvent` với `Role = "Lecturer"`) trong cùng một database transaction.
- **Request mẫu:**
  ```json
  {
    "email": "lecturer@fpt.edu.vn",
    "password": "LecturerPass@123",
    "fullName": "TS. Nguyen Van B"
  }
  ```
- **Response mẫu (201 Created):** Trả về `AccountResponse` an toàn không chứa mật khẩu hay chuỗi băm mật khẩu.

---

## 3. MA TRẬN API USER & SKILL SERVICE (`/api/users`, `/api/skills`)

| Method & Route | Auth / Role | Request DTO | Response DTO (HTTP Status) | Trạng thái xác minh |
| :--- | :--- | :--- | :--- | :---: |
| `GET /api/users/me` | Bearer Token | Không | `UserProfileResponse` (200 OK) | **IMPLEMENTED AND VERIFIED** |
| `PUT /api/users/me` | Bearer Token | `UpdateUserProfileRequest` | `UserProfileResponse` (200 OK) | **IMPLEMENTED AND VERIFIED** |
| `GET /api/users/{id}` | Bearer Token | `{id}` (Route Guid) | `CandidateProfileResponse` (200 OK) | **IMPLEMENTED AND VERIFIED** |
| `GET /api/users` | Bearer Token | `UserSearchFilter` (query) | `PagedResult<CandidateProfileResponse>` (200 OK) | **IMPLEMENTED AND VERIFIED** |
| `POST /api/users/batch` | Bearer Token | `BatchUsersRequest` (body) | `IReadOnlyList<CandidateProfileResponse>` (200 OK) | **IMPLEMENTED AND VERIFIED** |
| `GET /api/skills` | Bearer Token | `category` (query enum, opt) | `IReadOnlyList<SkillResponse>` (200 OK) | **IMPLEMENTED AND VERIFIED** |
| `POST /api/skills` | Bearer (Admin) | `CreateSkillRequest` | `SkillResponse` (201 Created) | **IMPLEMENTED AND VERIFIED** |
| `GET /api/skills/{id}` | Bearer Token | `{id}` (Route Guid) | `SkillResponse` (200 OK) | **IMPLEMENTED AND VERIFIED** |
| `GET /api/users/me/skills` | Bearer Token | Không | `IReadOnlyList<UserSkillResponse>` (200 OK) | **IMPLEMENTED AND VERIFIED** |
| `PUT /api/users/me/skills` | Bearer Token | `BatchSetUserSkillsRequest` | `IReadOnlyList<UserSkillResponse>` (200 OK) | **IMPLEMENTED AND VERIFIED** |
| `PATCH /api/users/me/skills/{skillId}` | Bearer Token | `UpdateUserSkillProficiencyRequest` | `UserSkillResponse` (200 OK) | **IMPLEMENTED AND VERIFIED** |
| `DELETE /api/users/me/skills/{skillId}` | Bearer Token | `{skillId}` (Route Guid) | 204 NoContent | **IMPLEMENTED AND VERIFIED** |

### Chi tiết các endpoint User & Skill

#### 1. Lấy thông tin hồ sơ của bản thân (`GET /api/users/me`)
- **Cơ chế:** Tự động trích xuất `UserId` từ claim trong JWT token của người gọi.
- **Response mẫu (200 OK):**
  ```json
  {
    "userId": "89f3a5c3-1d6a-4c36-9c03-b14183fc2d17",
    "email": "student@fpt.edu.vn",
    "fullName": "Nguyen Van A",
    "role": "Student",
    "studentCode": "SE123456",
    "campus": "HoaLac",
    "major": "SE",
    "bio": "Sinh viên kỳ 7 tìm nhóm làm đề tài EXE",
    "desiredRole": "Backend Developer",
    "availability": "LookingForTeam",
    "interests": ["FinTech", "EdTech"],
    "skills": [
      {
        "skillId": "5a2e3013-ba5e-4eb1-aaae-8f04008e6efd",
        "skillName": "C#/.NET",
        "category": "Technical",
        "level": 4,
        "createdAt": "2026-10-17T15:35:05.089164Z"
      }
    ],
    "createdAt": "2026-10-17T15:35:02.589174Z",
    "updatedAt": "2026-10-17T15:35:04.893997Z"
  }
  ```

#### 2. Cập nhật hồ sơ (`PUT /api/users/me`)
- **Xác thực StudentCode:** `StudentCode` được cập nhật trực tiếp tại endpoint này (không có endpoint riêng `/student-code`). Nếu cung cấp mã đã thuộc về người khác, trả về `409 Conflict` (`code: STUDENT_CODE_ALREADY_EXISTS`).
- **Request mẫu:**
  ```json
  {
    "fullName": "Nguyen Van A (Updated)",
    "studentCode": "SE123456",
    "campus": "HoaLac",
    "major": "SE",
    "bio": "Senior student looking for backend team",
    "desiredRole": "Backend Lead",
    "availability": "LookingForTeam",
    "interests": ["FinTech", "EdTech"]
  }
  ```

#### 3. Tra cứu hàng loạt hồ sơ (`POST /api/users/batch`) — Phục vụ Group & Matching
- **Mục đích:** Group Service gom danh sách thành viên nhóm hoặc ứng viên gợi ý để gửi sang lấy thông tin hiển thị mà không cần gọi tuần tự N lần.
- **Giới hạn an toàn:** Tối đa 100 ID mỗi request (`UserIds.Count <= 100`).
- **Request mẫu:**
  ```json
  {
    "userIds": [
      "89f3a5c3-1d6a-4c36-9c03-b14183fc2d17",
      "37b79320-fc21-4ef4-b3b6-2e5018dcee6e"
    ]
  }
  ```
- **Response mẫu (200 OK):** Trả về mảng JSON `UserProfileResponse[]`.

#### 4. Gán toàn bộ kỹ năng của người dùng (`PUT /api/users/me/skills`)
- **Tính nguyên tử (Atomic Replacement):** Xóa toàn bộ kỹ năng cũ của user và chèn danh sách mới trong một transaction duy nhất.
- **Request mẫu:**
  ```json
  {
    "skills": [
      {
        "skillId": "5a2e3013-ba5e-4eb1-aaae-8f04008e6efd",
        "level": 4
      }
    ]
  }
  ```
- **Ràng buộc:** `level` từ 1 (Beginner) đến 5 (Expert).

---

## 4. BẢO MẬT VÀ QUYỀN RIÊNG TƯ DỮ LIỆU (DATA PRIVACY)

1. **Phân tách dữ liệu:**
   - Dữ liệu mật khẩu (`PasswordHash`), phiên làm việc (`RefreshTokens`), thông tin outbox (`OutboxMessages`) nằm độc quyền tại `ExeAuthDb` và **không bao giờ** bị lộ qua User Service API.
2. **Quyền riêng tư hồ sơ sinh viên (User Privacy Remediation — Stage H3.2):**
   - Đã tách bạch hoàn toàn 2 mô hình phản hồi:
     - **Private DTO (`UserProfileResponse`):** Dành riêng cho chính chủ (`GET /api/users/me`, `PUT /api/users/me`). Chứa đầy đủ thông tin định danh bao gồm `Email` và `StudentCode`.
     - **Public DTO (`CandidateProfileResponse`):** Áp dụng cho tìm kiếm (`GET /api/users`), xem chi tiết ứng viên (`GET /api/users/{id}`) và tra cứu hàng loạt (`POST /api/users/batch`). Tuyệt đối **không chứa** `Email` và `StudentCode` trong JSON serialize.
3. **Bảng so sánh trường dữ liệu Public vs Private:**

| Trường thông tin | `UserProfileResponse` (`/me`) | `CandidateProfileResponse` (Public/Batch) |
| :--- | :---: | :---: |
| `userId` | Có | Có |
| `email` | **Có** (Private) | **KHÔNG** (Ẩn PII) |
| `fullName` | Có | Có |
| `role` | Có | Có |
| `studentCode` | **Có** (Private) | **KHÔNG** (Ẩn PII) |
| `campus`, `major`, `bio`, `desiredRole` | Có | Có |
| `availability` | Có | Có |
| `interests`, `skills` | Có | Có |
| `createdAt`, `updatedAt` | Có | Có |
