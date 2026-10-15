namespace Project.Services.Exceptions;

/// <summary>
/// Ném khi người dùng yêu cầu một tài nguyên không tồn tại.
/// ExceptionHandlingMiddleware (BuildingBlocks) sẽ bắt và trả 404 Not Found.
/// </summary>
public class NotFoundException : Exception
{
    public NotFoundException(string message) : base(message) { }

    public NotFoundException(string resourceName, Guid id)
        : base($"{resourceName} with id '{id}' was not found.") { }
}
