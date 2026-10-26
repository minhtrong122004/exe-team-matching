using System.Net;

namespace Exe.BuildingBlocks.Exceptions;

/// <summary>
/// Lớp ngoại lệ cơ sở cho các lỗi nghiệp vụ trong hệ thống (CLAUDE.md mục 10).
/// </summary>
public abstract class AppException : Exception
{
    public HttpStatusCode StatusCode { get; }
    public string ErrorCode { get; }

    protected AppException(string message, HttpStatusCode statusCode = HttpStatusCode.BadRequest, string errorCode = "BAD_REQUEST")
        : base(message)
    {
        StatusCode = statusCode;
        ErrorCode = errorCode;
    }
}

/// <summary>
/// Lỗi 404 Not Found — Tài nguyên không tồn tại.
/// </summary>
public class NotFoundException : AppException
{
    public NotFoundException(string message, string errorCode = "NOT_FOUND")
        : base(message, HttpStatusCode.NotFound, errorCode)
    {
    }

    public NotFoundException(string resourceName, object key)
        : base($"{resourceName} with identifier '{key}' was not found.", HttpStatusCode.NotFound, "NOT_FOUND")
    {
    }
}

/// <summary>
/// Lỗi 403 Forbidden — Không có quyền thực hiện hành động.
/// </summary>
public class ForbiddenException : AppException
{
    public ForbiddenException(string message = "You do not have permission to perform this action.", string errorCode = "FORBIDDEN")
        : base(message, HttpStatusCode.Forbidden, errorCode)
    {
    }
}

/// <summary>
/// Lỗi 409 Conflict — Xung đột trạng thái / vi phạm business rule.
/// </summary>
public class ConflictException : AppException
{
    public ConflictException(string message, string errorCode = "CONFLICT")
        : base(message, HttpStatusCode.Conflict, errorCode)
    {
    }
}

/// <summary>
/// Lỗi 401 Unauthorized — Chưa đăng nhập hoặc token không hợp lệ.
/// </summary>
public class UnauthorizedException : AppException
{
    public UnauthorizedException(string message = "Authentication is required to access this resource.", string errorCode = "UNAUTHORIZED")
        : base(message, HttpStatusCode.Unauthorized, errorCode)
    {
    }
}

/// <summary>
/// Lỗi 400 Bad Request — Dữ liệu đầu vào không hợp lệ.
/// </summary>
public class ValidationException : AppException
{
    public IDictionary<string, string[]> Errors { get; }

    public ValidationException(string message = "One or more validation errors occurred.", string errorCode = "VALIDATION_ERROR")
        : base(message, HttpStatusCode.BadRequest, errorCode)
    {
        Errors = new Dictionary<string, string[]>();
    }

    public ValidationException(IDictionary<string, string[]> errors, string message = "One or more validation errors occurred.")
        : base(message, HttpStatusCode.BadRequest, "VALIDATION_ERROR")
    {
        Errors = errors;
    }
}

/// <summary>
/// Lỗi 400 Bad Request — Yêu cầu không hợp lệ hoặc vi phạm điều kiện nghiệp vụ.
/// </summary>
public class BadRequestException : AppException
{
    public BadRequestException(string message, string errorCode = "BAD_REQUEST")
        : base(message, HttpStatusCode.BadRequest, errorCode)
    {
    }
}

/// <summary>
/// Lỗi 503 Service Unavailable — Dịch vụ bên ngoài hoặc hạ tầng tạm thời không khả dụng.
/// </summary>
public class ServiceUnavailableException : AppException
{
    public ServiceUnavailableException(string message, string errorCode = "SERVICE_UNAVAILABLE")
        : base(message, HttpStatusCode.ServiceUnavailable, errorCode)
    {
    }
}
