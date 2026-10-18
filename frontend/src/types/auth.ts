export type UserRole = 'Student' | 'Lecturer' | 'Admin';

/// <summary>
/// DTO thông tin người dùng được trả về trong phiên xác thực (CLAUDE.md mục 11).
/// </summary>
export interface AuthUserDto {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
}

/// <summary>
/// DTO yêu cầu đăng ký tài khoản sinh viên mới (POST /api/auth/register).
/// </summary>
export interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
  role?: string;
}

/// <summary>
/// DTO yêu cầu đăng nhập tài khoản (POST /api/auth/login).
/// </summary>
export interface LoginRequest {
  email: string;
  password: string;
}

/// <summary>
/// DTO yêu cầu làm mới Access Token bằng Refresh Token (POST /api/auth/refresh).
/// </summary>
export interface RefreshTokenRequest {
  refreshToken: string;
}

/// <summary>
/// DTO yêu cầu đăng xuất và thu hồi Refresh Token (POST /api/auth/logout).
/// </summary>
export interface LogoutRequest {
  refreshToken: string;
}

/// <summary>
/// DTO phản hồi xác thực chuẩn từ Auth Service sau khi login/register/refresh.
/// </summary>
export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUserDto;
}

/// <summary>
/// DTO phản hồi chi tiết tài khoản từ Auth Service (GET /api/auth/me, GET /api/auth/accounts).
/// </summary>
export interface AccountResponse {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string | null;
}

/// <summary>
/// DTO yêu cầu khởi tạo tài khoản Giảng viên (POST /api/auth/accounts/lecturers).
/// </summary>
export interface CreateLecturerRequest {
  email: string;
  password: string;
  fullName: string;
}

/// <summary>
/// Tham số truy vấn danh sách tài khoản phân trang (GET /api/auth/accounts).
/// </summary>
export interface GetAccountsQuery {
  search?: string;
  role?: UserRole;
  isActive?: boolean;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}
