# HƯỚNG DẪN KIỂM THỬ THỦ CÔNG (MANUAL UI ACCEPTANCE GUIDE)
## TÍNH NĂNG: ĐĂNG KÝ EMAIL VÀ XÁC THỰC MÃ OTP QUA BREVO (STAGE A1)

> **Dự án:** PRN232 — EXE Team Matching System  
> **Nhánh phát triển:** `feature/auth-email-verification`  
> **Commit SHA:** `5f2a4f6`  
> **Phiên bản tài liệu:** 1.0 (Tháng 10/2026)  

---

## 1. MỤC TIÊU VÀ PHẠM VI KIỂM THỬ

Tài liệu này hướng dẫn chi tiết từng bước để kiểm thử thủ công giao diện (UI) và tính toàn vẹn hệ thống cho luồng Đăng ký tài khoản Sinh viên bằng bất kỳ hòm thư điện tử nào (Gmail, Outlook, FPT EDU,...) và xác thực kích hoạt tài khoản thông qua mã OTP 6 chữ số gửi qua dịch vụ Brevo Transactional Email.

---

## 2. CHUẨN BỊ MÔI TRƯỜNG (ENVIRONMENT PREPARATION)

### 2.1. Khởi động Cơ sở dữ liệu và Hạ tầng (Docker)
Mở Terminal tại thư mục gốc repository (`exe-team-matching`):
```bash
docker compose up -d sqlserver redis
```
*Kiểm tra:* Đảm bảo SQL Server đang lắng nghe tại port `1433` và Redis tại port `6379`.

---

### 2.2. Hướng dẫn Thiết lập Cấu hình Brevo Transactional Email (Bắt buộc cho Email Thật)

Nếu bạn muốn kiểm thử gửi email thật tới hộp thư cá nhân, hãy thực hiện theo các bước sau. **Tuyệt đối không dán API key trực tiếp vào mã nguồn hoặc file git-tracked!**

#### Bước 1: Đăng ký / Đăng nhập tài khoản Brevo
1. Truy cập trang chủ Brevo: [https://www.brevo.com](https://www.brevo.com).
2. Tạo tài khoản miễn phí (gói Free hỗ trợ 300 email giao dịch mỗi ngày, hoàn toàn đủ cho kiểm thử).
3. Xác minh địa chỉ email cá nhân dùng để đăng ký tài khoản Brevo.

#### Bước 2: Tạo API Key
1. Tại giao diện Brevo Dashboard, nhấp vào tên tài khoản ở góc trên bên phải -> chọn **SMTP & API** (hoặc truy cập trực tiếp [https://app.brevo.com/settings/keys/api](https://app.brevo.com/settings/keys/api)).
2. Chuyển sang tab **API Keys**.
3. Nhấp vào nút **Generate a new API key**.
4. Đặt tên gợi nhớ, ví dụ: `PRN232_ExeTeamMatching_Dev`.
5. Sao chép chuỗi API key được hiển thị (chuỗi bắt đầu bằng `xkeysib-...`). Lưu ý: Brevo chỉ hiển thị khóa này 1 lần duy nhất!

#### Bước 3: Xác thực Người gửi (Sender Verification)
1. Trong menu bên trái hoặc góc tài khoản, vào **Senders, Domains & Dedicated IPs** -> chọn **Senders**.
2. Nhấp vào **Add a sender**.
3. Nhập Tên người gửi: `PRN232 EXE Team Matching`.
4. Nhập Địa chỉ email người gửi: sử dụng địa chỉ email bạn vừa dùng để đăng ký tài khoản Brevo (đây là email đã được Brevo xác thực quyền sở hữu).
5. Brevo sẽ gửi một email xác thực 6 số/link tới email người gửi đó nếu là email mới. Nhấp xác nhận.

#### Bước 4: Cấu hình Khóa an toàn vào .NET User Secrets
Chạy lệnh sau tại thư mục gốc dự án:
```bash
dotnet user-secrets set "Brevo:ApiKey" "xkeysib-YOUR_ACTUAL_BREVO_API_KEY_HERE" --project backend/src/Services/Auth/Auth.API
dotnet user-secrets set "Brevo:SenderEmail" "dia_chi_email_sender_da_xac_thuc@domain.com" --project backend/src/Services/Auth/Auth.API
dotnet user-secrets set "Brevo:SenderName" "PRN232 EXE Team Matching" --project backend/src/Services/Auth/Auth.API
dotnet user-secrets set "Brevo:EnableRealEmail" "true" --project backend/src/Services/Auth/Auth.API
```

> **Ghi chú về Chế độ Mock / Fallback:**  
> Nếu bạn **chưa cấu hình API Key** hoặc để `EnableRealEmail: false`, hệ thống tự động nhận diện và chuyển sang **Mock Delivery Mode**:
> - Không gây lỗi hệ thống.
> - Log thông báo mã hóa gửi OTP sạch sẽ (không in mã trần hoặc API key vào log).
> - Để lấy mã OTP kiểm thử trong chế độ Mock: Bạn có thể kiểm tra trực tiếp bảng `EmailVerificationChallenges` trong database hoặc sử dụng endpoint / console test.

---

### 2.3. Khởi động Các Dịch vụ Backend & Frontend

Khởi động các dịch vụ bằng 4 cửa sổ Terminal riêng biệt:

**Terminal 1 — Auth Service (Port 5001):**
```bash
dotnet run --project backend/src/Services/Auth/Auth.API
```
*Tự động áp dụng Migration EF Core mới `AddEmailVerificationAndOtp` vào SQL Server lúc khởi động.*

**Terminal 2 — User Service (Port 5002):**
```bash
dotnet run --project backend/src/Services/User/User.API
```

**Terminal 3 — API Gateway (Port 5000):**
```bash
dotnet run --project backend/src/ApiGateway/Exe.ApiGateway
```

**Terminal 4 — React Frontend (Port 5173):**
```bash
cd frontend
npm run dev
```

---

## 3. KỊCH BẢN KIỂM THỬ THÀNH CÔNG (HAPPY PATH FLOW)

### Kịch bản TC-01: Đăng ký tài khoản Sinh viên với Gmail và Kích hoạt OTP

| Bước | Thao tác trên giao diện UI | Kết quả mong đợi trên giao diện | Hành vi Backend bên dưới | Tiêu chuẩn PASS/FAIL |
| :--- | :--- | :--- | :--- | :--- |
| **1** | Mở trình duyệt truy cập `http://localhost:5173/register` | Trang Đăng ký hiển thị với giao diện chuẩn FPT Education, trường email hỗ trợ mọi email (placeholder: `sinhvien@gmail.com hoặc ten@fpt.edu.vn`). | Không có | PASS nếu form tải mượt mà, không lỗi |
| **2** | Nhập thông tin:<br>- Họ tên: `Nguyễn Văn A`<br>- Email: `test.student.2026@gmail.com`<br>- Mật khẩu: `Student@2026`<br>- Xác nhận MK: `Student@2026`<br>Nhấn nút **"Đăng ký tài khoản"** | Nút chuyển sang trạng thái "Đang khởi tạo tài khoản...", sau đó **tự động chuyển hướng sang** `http://localhost:5173/verify-email?email=test.student.2026%40gmail.com` | `POST /api/auth/register` trả về HTTP 200 `{ message, email, expiresAt }`. **Không trả về Access Token hay Refresh Token.** Account được lưu với `EmailConfirmed = false`. Tạo OTP challenge. | PASS nếu không lưu token vào localStorage và URL chuyển sang `/verify-email`. |
| **3** | Quan sát trang Xác thực Email (`/verify-email`) | - Tiêu đề: "Xác thực địa chỉ Email".<br>- Email người nhận hiển thị dưới dạng che giấu bảo mật: `t***t@gmail.com`.<br>- 6 ô nhập mã OTP riêng biệt với hiệu ứng focus ô đầu tiên.<br>- Nút "Xác nhận mã OTP" bị disable khi chưa đủ 6 số.<br>- Bộ đếm ngược gửi lại: "Gửi lại mã (59s...)" | Backend không bị gọi thêm | PASS nếu UI hiển thị đầy đủ thông tin bảo mật và ô nhập số. |
| **4** | Mở hòm thư Gmail (hoặc kiểm tra challenge trong DB nếu mock) lấy mã OTP 6 chữ số (ví dụ: `849201`). | Nhận được email từ `PRN232 EXE Team Matching` với chủ đề "Mã xác thực OTP đăng ký tài khoản - EXE Team Matching", template HTML tiếng Việt chuyên nghiệp, hiển thị mã OTP 6 chữ số và cảnh báo hết hạn trong 5 phút. | Brevo REST API gửi email thành công | PASS nếu nhận được email chuẩn định dạng. |
| **5** | Quay lại tab trình duyệt, nhập 6 chữ số (hoặc sao chép và Paste vào ô đầu tiên). | Các ô tự động nhảy số theo thứ tự. Khi đủ 6 chữ số, nút "Xác nhận mã OTP" sáng màu cam FPT. | UI tự bắt sự kiện onPaste và auto-advance. | PASS nếu hỗ trợ cả gõ phím và dán mã 6 số. |
| **6** | Nhấn **"Xác nhận mã OTP"** | - Nút hiển thị "Đang xác thực...".<br>- Banner xanh lá hiển thị: "Xác thực tài công! Tài khoản của bạn đã được kích hoạt. Đang chuyển hướng về trang Đăng nhập...".<br>- Sau 2.5 giây tự động chuyển về `http://localhost:5173/login?verified=true&email=...` | `POST /api/auth/verify-email` trả về 200. Account cập nhật `EmailConfirmed = true`. Ghi `UserRegisteredEvent` vào Transactional Outbox. | PASS nếu tài khoản được kích hoạt và chuyển hướng login an toàn. |
| **7** | Tại trang Đăng nhập (`/login`), nhập mật khẩu `Student@2026` và nhấn "Đăng nhập". | Đăng nhập thành công, lưu token vào context, chuyển hướng vào trang `http://localhost:5173/projects`. | `POST /api/auth/login` trả về 200 OK cùng AccessToken, RefreshToken và thông tin Sinh viên. User Service tiêu thụ outbox event và tạo hồ sơ. | PASS nếu vào được ứng dụng với vai trò Student. |
| **8** | Nhấp vào mục **"Hồ sơ cá nhân"** (`/profile`) | Hiển thị chính xác Họ tên `Nguyễn Văn A`, Email `test.student.2026@gmail.com`, vai trò `Sinh viên`. | `GET /api/users/me` trả về hồ sơ đồng bộ thành công. | PASS nếu thông tin sinh viên đầy đủ và khớp với lúc đăng ký. |

---

## 4. CÁC KỊCH BẢN KIỂM THỬ TIÊU CỰC (NEGATIVE & EDGE CASES)

### Kịch bản TC-02: Đăng nhập trước khi xác thực email (Pending Account Blocking)
1. Đăng ký một tài khoản mới: `unverified.student@gmail.com`.
2. Khi hệ thống chuyển sang `/verify-email`, **không** nhập OTP mà mở tab mới truy cập thẳng `/login`.
3. Nhập email `unverified.student@gmail.com` và mật khẩu vừa tạo, bấm **Đăng nhập**.
4. **Kết quả mong đợi:** 
   - Đăng nhập bị chặn với mã lỗi HTTP 403 Forbidden (`EMAIL_NOT_CONFIRMED`).
   - Trên UI hiển thị thông báo màu đỏ: *"Tài khoản của bạn chưa được xác thực email. Vui lòng xác thực mã OTP trước khi đăng nhập."*
   - Kèm theo nút bấm trực tiếp: **"Nhập mã xác thực OTP ngay &rarr;"** dẫn về trang `/verify-email?email=unverified.student@gmail.com`.
5. **Tiêu chuẩn:** PASS nếu tài khoản chưa xác thực không thể lấy được JWT token.

---

### Kịch bản TC-03: Nhập sai mã OTP (Wrong OTP)
1. Tại màn hình `/verify-email`, cố tình nhập mã sai: `000000`.
2. Nhấn nút "Xác nhận mã OTP".
3. **Kết quả mong đợi:**
   - Hệ thống báo lỗi: *"Mã OTP không chính xác. Bạn còn lại 4 lần thử."*
   - Ô nhập OTP không bị xóa sạch để người dùng dễ kiểm tra và sửa đổi.
4. **Tiêu chuẩn:** PASS nếu số lần thử còn lại được hiển thị và giảm đúng sau mỗi lần nhập sai.

---

### Kịch bản TC-04: Khóa mã xác thực sau 5 lần nhập sai liên tiếp (Brute-Force Protection)
1. Cố tình nhập sai mã OTP liên tiếp 5 lần.
2. Tại lần thứ 5, nhấn xác nhận.
3. **Kết quả mong đợi:**
   - Hệ thống báo lỗi: *"Đã vượt quá số lần nhập sai cho phép (tối đa 5 lần). Vui lòng nhấn 'Gửi lại mã OTP' để nhận mã mới."*
   - Các ô nhập mã OTP bị vô hiệu hóa (disabled).
4. **Tiêu chuẩn:** PASS nếu thử tiếp lần thứ 6 sẽ nhận HTTP 403 `MAX_FAILED_ATTEMPTS`.

---

### Kịch bản TC-05: Giới hạn Cooldown gửi lại mã OTP (60s Resend Cooldown)
1. Nhấn nút "Gửi lại mã OTP" khi bộ đếm cooldown đang hiển thị (ví dụ còn 45s).
2. Nút bấm bị vô hiệu hóa (disabled) và không thể nhấp được.
3. Khi đồng hồ đếm về `0s`, nút chuyển sang màu cam "Gửi lại mã OTP".
4. Nhấn nút "Gửi lại mã OTP".
5. **Kết quả mong đợi:**
   - Thông báo màu xanh: *"Mã OTP mới đã được gửi tới hộp thư của bạn."*
   - Đồng hồ cooldown tự động reset về 60 giây và bắt đầu đếm ngược lại.
   - Mã OTP cũ bị hủy hiệu lực; chỉ có mã OTP mới nhất mới có thể xác thực.
6. **Tiêu chuẩn:** PASS nếu không thể spam gửi email liên tục.

---

### Kịch bản TC-06: Sử dụng mã OTP đã hết hạn (Expired OTP)
1. Chờ quá 5 phút kể từ khi yêu cầu mã OTP (hoặc điều chỉnh thời gian `ExpiresAt` trong database về quá khứ để test nhanh).
2. Nhập mã OTP đó và nhấn xác nhận.
3. **Kết quả mong đợi:**
   - Hệ thống báo lỗi: *"Mã OTP đã hết hạn (quá 5 phút). Vui lòng nhấn 'Gửi lại mã OTP' để nhận mã mới."*
4. **Tiêu chuẩn:** PASS nếu mã quá hạn bị từ chối với HTTP 400 `OTP_EXPIRED`.

---

### Kịch bản TC-07: Tái sử dụng mã OTP đã xác thực thành công (Replay Attack Prevention)
1. Sau khi đã xác thực thành công một mã OTP ở TC-01, mở lại URL `/verify-email?email=test.student.2026@gmail.com`.
2. Nhập lại chính mã OTP vừa dùng.
3. **Kết quả mong đợi:**
   - Hệ thống thông báo: *"Tài khoản này đã được xác thực trước đó. Bạn có thể đăng nhập ngay."*
   - Hoặc chuyển hướng thẳng sang trang Đăng nhập.
4. **Tiêu chuẩn:** PASS nếu challenge không thể bị kích hoạt lần 2.

---

### Kịch bản TC-08: Đăng ký với Email đã tồn tại (Duplicate Email Conflict)
1. Vào `/register`, nhập lại email `test.student.2026@gmail.com` đã kích hoạt.
2. Bấm "Đăng ký tài khoản".
3. **Kết quả mong đợi:**
   - Hệ thống hiển thị lỗi rõ ràng: *"Email này đã được đăng ký trong hệ thống. Vui lòng đăng nhập hoặc dùng email khác."*
4. **Tiêu chuẩn:** PASS nếu mã trả về là HTTP 409 Conflict.

---

## 5. KIỂM TRA HỒI QUY CÁC TÍNH NĂNG CŨ (REGRESSION ACCEPTANCE)

Để đảm bảo tính năng mới không làm gián đoạn hệ thống hiện tại, hãy kiểm tra các tài khoản sau:

| Mã Kiểm Thử | Tài Khoản Kiểm Thử | Mật Khẩu | Kết Quả Mong Đợi | Trạng Thái |
| :--- | :--- | :--- | :--- | :--- |
| **REG-01** | `admin@fpt.edu.vn` (Admin) | `Admin@2026` | Đăng nhập thành công ngay lập tức, vào được trang Quản trị tài khoản (`/admin/accounts`). Không bị hỏi mã OTP. | [ ] PASS / [ ] FAIL |
| **REG-02** | `tran.thi.b@fpt.edu.vn` (Lecturer) | `Lecturer@2026` | Đăng nhập thành công, vào được trang Báo cáo (`/reports`). Không bị hỏi mã OTP. | [ ] PASS / [ ] FAIL |
| **REG-03** | `nguyen.van.a@fpt.edu.vn` (Student cũ) | `Student@2026` | Tài khoản tồn tại trước migration được tự động đánh dấu `EmailConfirmed = true`, đăng nhập bình thường. | [ ] PASS / [ ] FAIL |
| **REG-04** | Admin tạo Giảng viên mới | Menu Quản trị | Admin tạo tài khoản giảng viên mới thành công; tài khoản này có `EmailConfirmed = true` mặc định. | [ ] PASS / [ ] FAIL |
| **REG-05** | Candidate Discovery | Danh bạ ứng viên | Chỉ hiển thị các sinh viên đã kích hoạt tài khoản; tài khoản chưa xác thực OTP không xuất hiện trong danh sách tìm kiếm. | [ ] PASS / [ ] FAIL |
| **REG-06** | Session Refresh & Logout | Menu người dùng | Tự động làm mới access token sau 60 phút hoạt động bình thường; bấm Đăng xuất thu hồi token an toàn. | [ ] PASS / [ ] FAIL |

---

## 6. BẢNG CHECKLIST TỔNG HỢP (PASS/FAIL CHECKLIST)

| STT | Kịch bản kiểm thử | Người thực hiện | Ngày test | Kết quả | Ghi chú / Bằng chứng |
| :---: | :--- | :---: | :---: | :---: | :--- |
| 1 | TC-01: Đăng ký Gmail + Nhận mã Brevo + Kích hoạt thành công | User | | [ ] PASS / [ ] FAIL | |
| 2 | TC-02: Chặn đăng nhập khi tài khoản chưa kích hoạt (403) | User | | [ ] PASS / [ ] FAIL | |
| 3 | TC-03: Nhập sai OTP hiển thị số lượt thử còn lại | User | | [ ] PASS / [ ] FAIL | |
| 4 | TC-04: Khóa mã sau 5 lần nhập sai liên tiếp | User | | [ ] PASS / [ ] FAIL | |
| 5 | TC-05: Cooldown 60 giây khi bấm Gửi lại mã OTP | User | | [ ] PASS / [ ] FAIL | |
| 6 | TC-06: Chặn mã OTP hết hạn (quá 5 phút) | User | | [ ] PASS / [ ] FAIL | |
| 7 | TC-07: Chặn tái sử dụng mã OTP cũ | User | | [ ] PASS / [ ] FAIL | |
| 8 | TC-08: Báo lỗi trùng lặp khi đăng ký email đã tồn tại (409) | User | | [ ] PASS / [ ] FAIL | |
| 9 | REG-01 đến REG-06: Kiểm tra hồi quy Admin, Lecturer, Student cũ | User | | [ ] PASS / [ ] FAIL | |

---

## 7. XỬ LÝ SỰ CỐ THƯỜNG GẶP (TROUBLESHOOTING)

1. **Email không về hộp thư:**
   - Kiểm tra thư mục **Spam / Rác** hoặc tab **Promotions / Quảng cáo** trong Gmail.
   - Kiểm tra log của Auth Service trong terminal: nếu thấy log `[MOCK EMAIL]` nghĩa là chưa bật `Brevo:EnableRealEmail: true` hoặc chưa cấu hình API key.
   - Nếu thấy lỗi `401 Unauthorized` từ Brevo: API Key không chính xác.
   - Nếu thấy lỗi `400 Bad Request / unverified sender` từ Brevo: Địa chỉ `SenderEmail` chưa được xác thực trong tài khoản Brevo của bạn.

2. **Lỗi kết nối cơ sở dữ liệu:**
   - Chạy `docker ps` để đảm bảo container `sqlserver` và `redis` đang ở trạng thái `Up`.
   - Nếu bảng `EmailVerificationChallenges` chưa có, khởi động lại Auth Service để EF Core tự động chạy migration `20261022025826_AddEmailVerificationAndOtp`.

3. **Màn hình giao diện không chuyển hướng:**
   - Nhấn `F12` kiểm tra tab Console và Network để xem phản hồi chi tiết từ API Gateway hoặc Auth Service.
