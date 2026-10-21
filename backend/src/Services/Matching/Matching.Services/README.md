# Matching.Services

Logic tính điểm phù hợp sinh viên ↔ nhóm (CLAUDE.md mục 8). C# thuần: không database, không gọi ra ngoài.

```
score = wSkill * skillScore + wMajor * majorScore + wDomain * domainScore   (mặc định 50 / 30 / 20)
```

- `skillScore` = số kỹ năng yêu cầu mà sinh viên có / số kỹ năng yêu cầu (= 1 nếu nhóm không yêu cầu kỹ năng).
- `majorScore` = 1 nếu chuyên ngành sinh viên nằm trong danh sách yêu cầu (= 1 nếu không yêu cầu).
- `domainScore` = 1 nếu lĩnh vực dự án nằm trong lĩnh vực sinh viên quan tâm.
- So sánh không phân biệt hoa thường, bỏ khoảng trắng hai đầu; kỹ năng yêu cầu trùng nhau chỉ tính một lần.
- Điểm làm tròn 1 chữ số thập phân. Xếp hạng: điểm giảm dần, cùng điểm thì theo id; `top <= 0` trả tất cả.

| Thành phần | Vai trò |
|---|---|
| `Interfaces/IMatchingCalculator` | `Calculate`, `RankGroups`, `RankCandidates` |
| `Implementations/MatchingCalculator` | Cài đặt công thức |
| `Options/MatchingWeights` | Trọng số, bind từ `Matching:Weights`; tổng phải bằng 100 (kiểm tra khi khởi động) |
| `Models/` | `StudentInput`, `GroupInput`, `MatchOutcome` (độc lập với kiểu sinh từ proto) |

`Matching.Grpc/Services/MatchingGrpcService` map proto ↔ model và ghi log `[GRPC]`.
Unit test: `backend/tests/Matching.Services.Tests`.
