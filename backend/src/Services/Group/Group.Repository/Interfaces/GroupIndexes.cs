namespace Group.Repository.Interfaces;

/// <summary>
/// Tên các unique index gắn với business rule, để lớp Services nhận ra
/// <see cref="UniqueConstraintViolationException"/> nào ứng với rule nào.
/// </summary>
public static class GroupIndexes
{
    /// <summary>BR-11: một dự án chỉ thuộc một nhóm chưa giải tán.</summary>
    public const string ProjectId = "IX_Groups_ProjectId";
}
