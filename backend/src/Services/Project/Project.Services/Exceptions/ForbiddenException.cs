namespace Project.Services.Exceptions;

/// <summary>
/// Ném khi người dùng không có quyền thực hiện hành động này.
/// Ví dụ: sinh viên khác cố sửa/xóa dự án của người khác.
/// ExceptionHandlingMiddleware (BuildingBlocks) sẽ bắt và trả 403 Forbidden.
/// </summary>
public class ForbiddenException : Exception
{
    public ForbiddenException(string message = "You do not have permission to perform this action.")
        : base(message) { }
}
