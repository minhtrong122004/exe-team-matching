export type UserRole = 'Student' | 'Moderator' | 'Lecturer';

/// <summary>
/// DTO thông tin người dùng được trả về trong phiên xác thực.
/// </summary>
export interface AuthUserDto {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  hasAcceptedTerms?: boolean;
  acceptedTermsAt?: string | null;
  studentCode?: string | null;
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
/// DTO phản hồi xác thực chuẩn từ Auth Service sau khi đăng nhập hoặc làm mới token.
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
  hasAcceptedTerms?: boolean;
  acceptedTermsAt?: string | null;
  studentCode?: string | null;
}

/// <summary>
/// DTO yêu cầu khởi tạo tài khoản Giảng viên hoặc Điều phối viên (POST /api/auth/accounts/lecturers).
/// </summary>
export interface CreateLecturerRequest {
  email: string;
  fullName: string;
  role?: 'Lecturer' | 'Moderator';
}

export interface AcceptTermsResponse {
  message: string;
  hasAcceptedTerms: boolean;
  acceptedTermsAt: string;
}

export interface GetAccountsQuery {
  search?: string;
  role?: UserRole;
  isActive?: boolean;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}
