# Kiến trúc Hệ thống EXE Team Matching (C0 & C1)

Tài liệu sơ đồ kiến trúc C4 Model (Mức C0 — System Context và Mức C1 — Container Diagram) cho hệ thống **EXE Team Matching**.

---

## 1. Mức C0 — System Context Diagram

```mermaid
flowchart TB
    Student["👨‍🎓 Sinh viên (Student)\nTìm kiếm đề tài, ghép nhóm đa ngành,\nứng tuyển & nhận lời mời"]
    Lecturer["👨‍🏫 Giảng viên (Lecturer)\nTheo dõi tiến độ ghép nhóm,\nnhận diện sinh viên chưa có nhóm, xuất CSV"]
    Admin["🛡️ Quản trị viên (Admin)\nQuản lý tài khoản, giảng viên,\ndanh mục kỹ năng & snapshot báo cáo"]

    System["🚀 EXE Team Matching Platform\n(Microservices Ecosystem)\nHỗ trợ kết nối đề tài & thành lập nhóm khởi nghiệp môn EXE"]

    SMTP["📧 Hệ thống Email SMTP / MailHog / Brevo\nGửi mã xác thực OTP & email thông báo"]

    Student -->|"HTTPS (SPA / REST JSON)"| System
    Lecturer -->|"HTTPS (SPA / REST JSON)"| System
    Admin -->|"HTTPS (SPA / REST JSON)"| System
    System -->|"SMTP (Port 1025 / 587)"| SMTP
```

---

## 2. Mức C1 — Container & Communication Diagram

```mermaid
flowchart TB
    subgraph Client["Tầng Giao diện (Frontend)"]
        SPA["🌐 React 19 + TypeScript SPA\n(Vite + Nginx :3000)"]
    end

    subgraph Edge["Tầng Cổng Giao tiếp (API Gateway)"]
        GW["🔀 Exe.ApiGateway\n(YARP Reverse Proxy :5000)"]
    end

    subgraph Services["Tầng Microservices (.NET 10)"]
        Auth["🔐 Auth Service (:5001)\nJWT, Refresh Token, OTP, Outbox"]
        User["👤 User Service (:5002)\nUserProfile, Skills, Availability"]
        Project["💡 Project Service (:5003)\nProject Ideas, Domains, Tags"]
        Group["👥 Group Service (:5004)\nGroups, Slots, JoinRequests, Invitations"]
        Matching["🧠 Matching Service (:5005)\ngRPC Stateless Scoring Engine"]
        Notification["🔔 Notification Service (:5006)\nIn-App Alerts & Email Queue"]
        Report["📊 Report Service (:5007)\nRead-Model Projections & CSV Export"]
    end

    subgraph Data["Tầng Lưu trữ & Sự kiện (Data & Event Bus)"]
        SQL[("🗄️ SQL Server 2022 (:1433)\n6 Isolated Databases:\nExeAuthDb | ExeUserDb | ExeProjectDb\nExeGroupDb | ExeNotificationDb | ExeReportDb")]
        Redis[("⚡ Redis 7 (:6379)\nRedis Streams Event Bus\nexe:events:*")]
        Mail["📬 MailHog / SMTP (:1025 / :8025)"]
    end

    SPA -->|"REST JSON (/api/*)"| GW
    GW --> Auth
    GW --> User
    GW --> Project
    GW --> Group
    GW --> Notification
    GW --> Report

    Group -->|"Sync REST (UserClient / ProjectClient)"| User
    Group -->|"Sync REST"| Project
    Group -->|"Sync gRPC (HTTP/2 :5005)"| Matching

    Auth -->|"XADD UserRegistered"| Redis
    User -->|"XADD UserProfileUpdated"| Redis
    Group -->|"XADD GroupCreated, JoinRequest*,\nInvitationCreated, MemberJoined/Left"| Redis

    Redis -->|"XREADGROUP user-service"| User
    Redis -->|"XREADGROUP notification-service"| Notification
    Redis -->|"XREADGROUP report-service"| Report

    Auth --> SQL
    User --> SQL
    Project --> SQL
    Group --> SQL
    Notification --> SQL
    Report --> SQL
    Notification -->|"SMTP"| Mail
```

