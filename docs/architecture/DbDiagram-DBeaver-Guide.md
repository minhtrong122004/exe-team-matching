# Hướng dẫn lấy schema bằng DBeaver và vẽ trên dbdiagram.io

## 1. Kiến trúc database của repo

Hệ thống hiện dùng SQL Server và sáu database riêng: `ExeAuthDb`, `ExeUserDb`, `ExeProjectDb`, `ExeGroupDb`, `ExeNotificationDb`, `ExeReportDb`. Chạy bằng Docker Compose thì host kết nối từ máy cá nhân là `localhost`, port `1433`; container backend dùng hostname `sqlserver`. Matching là stateless, không có database.

DBML đã chuẩn bị tại `EXE-Team-Matching-All-Databases.dbml`. Đây là schema tổng hợp hiện tại, dựa trên EF entities, DbContext và migrations. File có thể paste trực tiếp vào dbdiagram.io. Không có FK giả giữa các database.

## 2. Khởi động SQL Server

Từ thư mục repo, nếu hệ thống chưa chạy, khởi động hạ tầng bằng `docker compose up -d sqlserver`. Xem trạng thái bằng `docker compose ps sqlserver`. Đợi container ở trạng thái healthy trước khi kết nối. Port mapping trong compose là `1433:1433`.

Thông tin kết nối cho DBeaver:

| Thuộc tính | Giá trị |
|---|---|
| Driver | Microsoft SQL Server |
| Host | `localhost` |
| Port | `1433` |
| Authentication | SQL Server Authentication |
| Username | `sa` |
| Password | Giá trị `SA_PASSWORD` trong `.env`; nếu chưa đặt, Compose dùng fallback hiện khai báo trong `docker-compose.yml` |
| Database | `master` (kếtin ban đầu) |
| Encrypt | Optional/disable hoặc driver default |
| Trust server certificate | bật nếu có tùy chọn |

Mật khẩu hiện lấy từ biến `SA_PASSWORD` của môi trường Compose (có giá trị mặc định trong file Compose khi biến này không được đặt). Dùng đúng giá trị của môi trường đang chạy; không chia sẻ password hoặc commit `.env`. Không dùng `Server=sqlserver` trong DBeaver chạy trên máy host; tên đó chỉ phân giải bên trong Docker network.

## 3. Tạo kết nối trong DBeaver

1. Mở DBeaver → **Database → New Database Connection**.
2. Chọn **SQL Server**. Cài Microsoft JDBC driver nếu DBeaver hỏi.
3. Điền Host `localhost`, Port `1433`, Database `master`, Username `sa`, password tương ứng môi trường.
4. Nếu wizard có tab SSL, bật **Trust server certificate** cho SQL Server local dev.
5. Bấm **Test Connection**, sau đó **Finish**.
6. Mở kết nối → Databases. Chọn lần lượt sáu database nói trên. Nếu danh sách cũ, right-click connection → **Refresh**.
7. Nếu database không xuất hiện, xem migration/service logs; chỉ tạo database sau khi migrations thực sự chạy. DDL hiện hành có thể xem trong thư mục `database/*.sql`, nhưng migration là nguồn kiểm tra schema.

## 4. Trích DDL từ DBeaver (khi cần schema đang chạy)

Làm lần lượt cho từng database để không bỏ sót bảng hoặc constraint:

1. Mở database → **Schemas → dbo → Tables**.
2. Chọn tất cả bảng nghiệp vụ (có thể bỏ qua `__EFMigrationsHistory` nếu không muốn đưa bảng quản lý migration vào ERD).
3. Right-click → **Generate SQL → DDL**. Tùy phiên bản DBeaver, có thể dùng **Tools → Dump database** hoặc **Export Data** với định dạng DDL/SQL. Chọn object types: tables, primary keys, unique constraints/indexes, foreign keys, indexes; không chọn data rows.
4. Lưu thành file riêng theo database, ví dụ `ExeGroupDb-schema.sql`. Lặp lại cho cả sáu DB.
5. Kiểm tra script có `CREATE TABLE`, `PRIMARY KEY`, `FOREIGN KEY`, `CREATE INDEX` và filtered indexes. Một số phiên bản DBeaver không xuất đầy đủ filtered index, check constraint, computed/default definition; đối chiếu `database/*.sql` và EF migrations.

Cách khác trong SQL Editor để liệt kê bảng: chạy query metadata trên từng database:

```sql
SELECT s.name AS schema_name, t.name AS table_name
FROM sys.tables AS t
JOIN sys.schemas AS s ON s.schema_id = t.schema_id
WHERE t.is_ms_shipped = 0
ORDER BY s.name, t.name;
```

Không dùng reverse engineering output làm nguồn duy nhất nếu DB chưa migrate mới nhất hoặc môi trường chứa schema cũ. So sánh migration mới nhất và `DbContext`.

## 5. Vẽ bằng dbdiagram.io

1. Mở dbdiagram.io và tạo diagram mới.
2. Chọn DBML mode/editor.
3. Mở `EXE-Team-Matching-All-Databases.dbml` bằng editor, copy toàn bộ nội dung, paste vào DBML editor.
4. Đợi parser cập nhật diagram. Nếu báo lỗi, xem dòng lỗi; dbdiagram có thể thay đổi hỗ trợ cú pháp theo phiên bản. `TableGroup` gom bảng theo database; nếu parser không nhận `TableGroup`, bỏ riêng các block TableGroup, không xóa bảng hay `Ref`.
5. Kiểm tra sáu nhóm database, bảng mối quan hệ và cardinality. Export PNG/PDF cho báo cáo; giữ DBML trong repo làm source chỉnh sửa.
6. Trong sơ đồ tổng thể, giữ database prefixes để bảng cùng tên như `processed_events` không bị lẫn. Khi trình bày, có thể chia thành 6 diagram riêng nếu một trang quá rộng.

## 6. Chọn Logical hay Physical ERD

- **Logical**: thể hiện entity, PK/FK và quan hệ nghiệp vụ; có thể dùng tên thân thiện, ít kiểu dữ liệu và bỏ chi tiết index/default. Những quan hệ xuyên service nếu muốn đưa vào phải dùng nét đứt/ghi chú `logical reference`, không giả lập FK DB.
- **Physical**: thể hiện bảng, column, SQL Server data type, nullability, PK, FK, unique/index/default và filtered index. DBML hiện có thiên về physical schema, đồng thời ghi note cho các constraint đặc thù.
- Không vẽ `Project.OwnerId → Account.Id`, `Group.LeaderId → Account.Id`, hay `StudentStat.GroupId → GroupStat.GroupId` thành FK: chúng thuộc database khác hoặc là read model. Giao tiếp được bảo đảm bởi service/event, không phải SQL Server.

## 7. Giới hạn cần lưu ý khi chuyển SQL Server DDL sang DBML

DBML biểu diễn khá tốt PK/FK/index cơ bản, nhưng filtered index SQL Server như `WHERE Status = 'Pending'`, `rowversion`, primitive collection/JSON mapping, cascade action đặc thù và default expression có thể cần ghi chú/biên tập thủ công. Trong file đã ghi notes cho các điểm cần kiểm tra. DDL reverse-engineered từ server chính xác với server đang chạy; DBML trong repo mô tả schema được triển khai bằng code/migrations hiện hành. Khi chúng lệch nhau, xác định migration nào đã áp dụng trước khi cập nhật ERD.

## 8. Kiểm tra sau khi import

- Số bảng dự kiến: Auth 3, User 4, Project 2, Group 11, Notification 3, Report 4 (tổng 27; không tính `__EFMigrationsHistory`).
- Quan hệ FK: Auth 2; User 2; Project 1; Group 12; Notification 0; Report 0 (tổng 17).
- `RefreshToken` tự tham chiếu và `GroupTransferRequest` có hai FK riêng tới `Groups` phải xuất hiện đủ.
- Xác nhận FK nullable `Groups.space_id` được thể hiện optional; FK còn lại là required theo migrations hiện tại.
- Bảng `__EFMigrationsHistory` là metadata EF, thường không đưa vào ERD nghiệp vụ.
