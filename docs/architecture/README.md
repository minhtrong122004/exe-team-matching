# Kiến trúc EXE Team Matching

Sơ đồ kiến trúc theo C4 Model. Thiết kế dữ liệu của từng service nằm ở [ERD.md](ERD.md).

## C0: System Context

```mermaid
flowchart TB
    Student["Sinh viên (Student)<br/>Khai hồ sơ, vào Room, Apply,<br/>vote, bầu Leader, xin chuyển nhóm"]
    Moderator["Điều phối viên (Moderator)<br/>Import danh sách, cấu hình môn,<br/>phân phối sinh viên lẻ, chốt sổ, chuyển nhóm"]
    Lecturer["Giảng viên (Lecturer)<br/>Xem nhóm, tiến độ và xuất CSV"]

    System["EXE Team Matching<br/>Ghép nhóm cho các môn EXE theo học kỳ"]

    Google["Google Sign-In<br/>Xác thực tài khoản Google"]
    Mail["SMTP / MailHog<br/>Gửi email thông báo"]
    Fap["Danh sách lớp từ FAP<br/>File .xls hoặc .csv do Moderator import"]

    Student -->|"HTTPS"| System
    Moderator -->|"HTTPS"| System
    Lecturer -->|"HTTPS"| System
    Fap -.->|"Moderator tải lên"| Moderator
    System -->|"Kiểm tra ID token"| Google
    System -->|"SMTP"| Mail
```

## C1: Container

```mermaid
flowchart TB
    SPA["Web App<br/>React + Vite, Nginx :3000"]
    GW["API Gateway<br/>YARP + kiểm tra JWT :5000"]

    subgraph Services["Dịch vụ .NET 10"]
        Auth["Auth Service :5001<br/>Đăng nhập Google, JWT, tài khoản, Outbox"]
        User["User Service :5002<br/>Hồ sơ, 5 kỹ năng, cam kết"]
        Project["Project Service :5003<br/>Đề tài của nhóm"]
        Group["Group Service :5004<br/>Học kỳ, Space, Room, Apply, bầu Leader,<br/>phân phối, chốt sổ, chuyển nhóm"]
        Matching["Matching Service :5005<br/>gRPC, không có database"]
        Notification["Notification Service :5006<br/>Thông báo trong app, hàng đợi email"]
        Report["Report Service :5007<br/>Thống kê, báo cáo định kỳ, CSV"]
    end

    SQL[("SQL Server :1433<br/>Mỗi service một database")]
    Redis[("Redis Streams :6379<br/>exe:events:*")]
    Mail["MailHog :1025 / :8025"]
    Google["Google Sign-In"]

    SPA -->|"Lấy ID token"| Google
    SPA -->|"REST /api/*"| GW
    GW --> Auth
    GW --> User
    GW --> Project
    GW --> Group
    GW --> Notification
    GW --> Report

    Auth -->|"Kiểm tra ID token"| Google
    Group -->|"REST: cấp tài khoản khi import"| Auth
    Group -->|"REST: hồ sơ"| User
    Group -->|"REST: đề tài"| Project
    Group -->|"gRPC: điểm, phân phối"| Matching

    Auth -->|"UserRegistered"| Redis
    User -->|"UserProfileUpdated"| Redis
    Group -->|"JoinRequest*, MemberJoined, MemberLeft,<br/>MemberRemoved, MemberTransferredPostLock,<br/>SpaceFinalized"| Redis

    Redis -->|"consumer group user-service"| User
    Redis -->|"consumer group notification-service"| Notification
    Redis -->|"consumer group report-service"| Report

    Auth --> SQL
    User --> SQL
    Project --> SQL
    Group --> SQL
    Notification --> SQL
    Report --> SQL
    Notification -->|"SMTP"| Mail
```

## Luồng đăng nhập

1. Web App lấy ID token từ Google Sign-In.
2. Web App gọi `POST /api/auth/google`.
3. Auth Service kiểm tra chữ ký, hạn và audience của token với Google.
4. Auth Service tìm email trong các tài khoản đã tạo khi import danh sách, so sánh không phân biệt hoa thường.
5. Có tài khoản thì cấp JWT và refresh token. Không có thì trả `403 NOT_IN_FAP_LIST`.
