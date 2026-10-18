# Redis Streams Event Contract Specification

> **Tài liệu Hợp đồng Sự kiện (Event-Driven Specification) qua Redis Streams**
> Dự án: EXE Team Matching System (PRN232 Final Assignment)
> Dịch vụ phát sự kiện: **Auth Service** (qua Transactional Outbox)
> Dịch vụ nhận sự kiện hiện tại: **User Service** (tạo hồ sơ trống)
> Dịch vụ nhận tiếp theo: **Notification Service** (gửi email), **Report Service** (thống kê)

---

## 1. CẤU TRÚC ENVELOPE CỦA BẢN TIN REDIS STREAM

Mỗi bản tin (entry) khi được xuất bản sang Redis Streams thông qua `IEventPublisher` (triển khai `RedisStreamEventPublisher`) luôn chứa đúng 5 trường chuẩn sau:

| Tên trường (Key) | Kiểu dữ liệu | Ý nghĩa kỹ thuật | Ví dụ |
| :--- | :--- | :--- | :--- |
| `eventId` | String (Guid) | Định danh duy nhất toàn cục của sự kiện (dùng cho Idempotency) | `"5d13f3f7-30ce-48a6-b6a8-6acee66e00c9"` |
| `eventType` | String | Tên định danh của loại sự kiện (bỏ tiền tố "exe:events:") | `"UserRegistered"` |
| `occurredAt` | String (ISO 8601 UTC) | Thời điểm sự kiện phát sinh tại Producer (chính xác đến nano/microsec) | `"2026-10-17T15:35:01.9740000Z"` |
| `correlationId` | String | Mã định danh truy vết xuyên suốt luồng HTTP request sang Event bus | `"0HN7B8AC..."` hoặc `eventId` |
| `payload` | String (JSON stringified) | Nội dung nghiệp vụ chi tiết của sự kiện | `{"eventId":"...","userId":"...","email":"...","fullName":"...","role":"Student","occurredAt":"...","schemaVersion":1}` |

---

## 2. SCHEMA SỰ KIỆN: `UserRegisteredEvent`

- **Record Contract C#:** `Exe.Contracts.Events.UserRegisteredEvent`
- **Stream Name:** `exe:events:UserRegistered`
- **Dead-Letter Stream Name:** `exe:deadletter:UserRegistered`
- **Schema Version:** `1`

### Định nghĩa Record C#:
```csharp
namespace Exe.Contracts.Events;

public record UserRegisteredEvent(
    Guid EventId,
    Guid UserId,
    string Email,
    string FullName,
    string Role,
    DateTime OccurredAt,
    int SchemaVersion = 1
);
```

### JSON Payload mẫu bên trong trường `payload`:
```json
{
  "eventId": "5d13f3f7-30ce-48a6-b6a8-6acee66e00c9",
  "userId": "89f3a5c3-1d6a-4c36-9c03-b14183fc2d17",
  "email": "student@fpt.edu.vn",
  "fullName": "Nguyen Van A",
  "role": "Student",
  "occurredAt": "2026-10-17T15:35:01.9740000Z",
  "schemaVersion": 1
}
```

---

## 3. NGUYÊN TẮC QUẢN LÝ CONSUMER GROUP (QUAN TRỌNG CHO ĐỒNG ĐỘI)

Trong Redis Streams, các consumer trong cùng một Consumer Group sẽ chia nhau xử lý các entry (load balancing). Nếu một service khác dùng chung group name, chúng sẽ tranh chấp message!

> [!IMPORTANT]
> **Quy định bắt buộc:** Mỗi Microservice nhận sự kiện `UserRegistered` **PHẢI** tạo và sử dụng một Consumer Group độc lập mang tên của chính service đó:
> - User Service: `user-service`
> - Notification Service: `notification-service`
> - Report Service: `report-service`
> - Group Service (nếu cần): `group-service`

### Lệnh khởi tạo Consumer Group an toàn:
Trước khi bắt đầu đọc, Consumer Worker của service phải kiểm tra sự tồn tại của Consumer Group trên stream hoặc tự động tạo nếu chưa có:
```csharp
// Đọc từ đầu stream ("0-0") nếu là consumer mới, hoặc từ cuối stream ("$")
try
{
    await db.StreamCreateConsumerGroupAsync("exe:events:UserRegistered", "notification-service", "0-0", createStream: true);
}
catch (RedisServerException ex) when (ex.Message.Contains("BUSYGROUP"))
{
    // Group đã tồn tại, an toàn bỏ qua
}
```

---

## 4. CƠ CHẾ BẢO ĐẢM TÍNH BẤT BIẾN VÀ TIN CẬY (RELIABILITY & IDEMPOTENCY)

1. **At-Least-Once Delivery (Phân phối ít nhất một lần):**
   - Sự kiện có thể được gửi lại (replay) khi hệ thống gặp sự cố mạng hoặc khởi động lại.
   - Producer đảm bảo bản tin được ghi vào Outbox trong SQL Server cùng transaction với nghiệp vụ Auth.
2. **Xử lý Idempotency tại Consumer:**
   - Mỗi Consumer Service phải sở hữu một bảng `ProcessedEvents` trong database riêng:
     ```sql
     CREATE TABLE [ProcessedEvents] (
         [EventId] uniqueidentifier NOT NULL PRIMARY KEY,
         [ProcessedAt] datetime2 NOT NULL
     );
     ```
   - Trước khi thực hiện logic nghiệp vụ, Consumer kiểm tra `IF EXISTS (SELECT 1 FROM ProcessedEvents WHERE EventId = @EventId)`.
   - Nếu đã tồn tại: Bỏ qua nghiệp vụ và gọi ngay `XACK`.
   - Nếu chưa tồn tại: Thực thi nghiệp vụ và chèn bản ghi vào `ProcessedEvents` trong cùng một transaction.
3. **Thứ tự ACK (Acknowledge Semantics):**
   - **Chỉ gọi `XACK` sau khi transaction database đã commit thành công.**
   - Tuyệt đối không gọi `XACK` trước khi lưu trữ dữ liệu.
4. **Phục hồi tin tồn đọng (Pending Entries List - PEL Recovery):**
   - Khi Consumer gặp sự cố crash trước khi `XACK`, bản tin rơi vào trạng thái Pending trong PEL.
   - Worker chạy định kỳ quét `XPENDING` với thời gian nhàn rỗi `PendingMinIdleMs` (10 giây) để claim lại (`XCLAIM` hoặc `XAUTOCLAIM`) và xử lý tiếp.
5. **Dead-Letter Queue (DLQ):**
   - Nếu một bản tin bị lỗi xử lý vượt quá `MaxRetryCount = 5` lần (poison message, cú pháp JSON hỏng), Consumer sẽ chuyển tiếp bản tin đó sang stream `exe:deadletter:UserRegistered` kèm theo nguyên nhân lỗi (`exceptionMessage`, `retryCount`), sau đó gọi `XACK` bản tin gốc để giải phóng stream chính.
