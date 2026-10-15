namespace Exe.BuildingBlocks.Web;

// Exception dùng chung cho lớp Services. Không cần try/catch trong controller:
// GlobalExceptionHandler tự chuyển chúng thành ProblemDetails với đúng status code.
//
//   throw new NotFoundException("Group", id);                          → 404
//   throw new ForbiddenException("Only the leader can do this.");       → 403
//   throw new BusinessRuleException("GROUP_FULL", "Group is full.");    → 409
//   await validator.ValidateAndThrowAsync(request);                     → 400 (FluentValidation.ValidationException)

/// <summary>Lớp cha của mọi exception nghiệp vụ có status code xác định.</summary>
public abstract class AppException(int statusCode, string code, string message) : Exception(message)
{
    public int StatusCode { get; } = statusCode;

    /// <summary>Mã lỗi máy đọc được, trả về ở field "code" (vd. GROUP_FULL).</summary>
    public string Code { get; } = code;
}

/// <summary>400 — dữ liệu đầu vào sai nhưng không đến từ validator (vd. id trong URL và body không khớp).</summary>
public sealed class BadRequestException(string message, string code = ErrorCodes.BadRequest)
    : AppException(400, code, message);

/// <summary>401 — chưa đăng nhập hoặc thông tin đăng nhập sai.</summary>
public sealed class UnauthorizedException(string message = "Authentication is required.", string code = ErrorCodes.Unauthorized)
    : AppException(401, code, message);

/// <summary>403 — đã đăng nhập nhưng không có quyền.</summary>
public sealed class ForbiddenException(string message = "You do not have permission to perform this action.", string code = ErrorCodes.Forbidden)
    : AppException(403, code, message);

/// <summary>404 — không tìm thấy tài nguyên.</summary>
public sealed class NotFoundException : AppException
{
    public NotFoundException(string message) : base(404, ErrorCodes.NotFound, message) { }

    public NotFoundException(string resourceName, object id)
        : base(404, ErrorCodes.NotFound, $"{resourceName} with id '{id}' was not found.") { }
}

/// <summary>409 — vi phạm business rule hoặc xung đột trạng thái (vd. GROUP_FULL, EMAIL_ALREADY_EXISTS).</summary>
public sealed class BusinessRuleException(string code, string message) : AppException(409, code, message);

/// <summary>Mã lỗi dùng chung. Mã riêng của từng service (GROUP_FULL...) đặt trong service đó.</summary>
public static class ErrorCodes
{
    public const string BadRequest = "BAD_REQUEST";
    public const string ValidationError = "VALIDATION_ERROR";
    public const string Unauthorized = "UNAUTHORIZED";
    public const string Forbidden = "FORBIDDEN";
    public const string NotFound = "NOT_FOUND";
    public const string Conflict = "CONFLICT";
    public const string InternalError = "INTERNAL_ERROR";
}
