namespace Project.Repository.Enums;

/// <summary>
/// Trạng thái vòng đời của một ý tưởng dự án EXE.
/// Draft       – Mới tạo, chưa công khai hoặc chưa tìm nhóm.
/// Recruiting  – Đang mở để nhóm liên kết (Group Service kiểm tra trạng thái này).
/// Active      – Đã có nhóm, đang thực hiện.
/// Completed   – Hoàn thành.
/// Cancelled   – Hủy bỏ.
/// </summary>
public enum ProjectStatus
{
    Draft,
    Recruiting,
    Active,
    Completed,
    Cancelled
}
