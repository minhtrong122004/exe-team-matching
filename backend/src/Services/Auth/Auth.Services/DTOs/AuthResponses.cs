namespace Auth.Services.DTOs;

/// <summary>
/// DTO phản hồi xác thực chuẩn sau khi đăng ký, đăng nhập hoặc làm mới token.
/// Tương thích 100% với Frontend React/Vite (client.ts & AuthContext.tsx).
/// </summary>
public record AuthResponse(
    string AccessToken,
    string RefreshToken,
    AuthUserDto User
);

/// <summary>
/// Thông tin tài khoản định danh trong phiên làm việc.
/// </summary>
public record AuthUserDto(
    Guid Id,
    string Email,
    string FullName,
    string Role
);

/// <summary>
/// DTO phản hồi chi tiết tài khoản cho /api/auth/me và danh sách tài khoản Admin.
/// </summary>
public record AccountResponse(
    Guid Id,
    string Email,
    string FullName,
    string Role,
    bool IsActive,
    DateTime CreatedAt,
    DateTime? UpdatedAt = null
);
