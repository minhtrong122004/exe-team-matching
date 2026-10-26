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

export interface GetAccountsQuery {
  search?: string;
  role?: UserRole;
  isActive?: boolean;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

/// <summary>
/// DTO phản hồi sau khi đăng ký tài khoản (Gate H).
/// </summary>
export interface RegisterResponse {
  message: string;
  email: string;
  expiresAt: string;
}

/// <summary>
/// DTO yêu cầu xác thực email bằng mã OTP (POST /api/auth/verify-email).
/// </summary>
export interface VerifyEmailRequest {
  email: string;
  otp: string;
}

/// <summary>
/// DTO phản hồi sau khi xác thực email thành công (POST /api/auth/verify-email).
/// </summary>
export interface VerifyEmailResponse {
  message: string;
  email: string;
}

/// <summary>
/// DTO yêu cầu gửi lại mã xác thực OTP (POST /api/auth/resend-verification).
/// </summary>
export interface ResendVerificationRequest {
  email: string;
}

/// <summary>
/// DTO phản hồi sau khi gửi lại mã xác thực OTP (POST /api/auth/resend-verification).
/// </summary>
export interface ResendVerificationResponse {
  message: string;
  email: string;
  resendCooldownSeconds: number;
  expiresAt: string;
}

/// <summary>
/// DTO yêu cầu gửi mã OTP đặt lại mật khẩu (POST /api/auth/forgot-password).
/// </summary>
export interface ForgotPasswordRequest {
  email: string;
}

/// <summary>
/// DTO phản hồi sau khi gửi yêu cầu quên mật khẩu (POST /api/auth/forgot-password).
/// </summary>
export interface ForgotPasswordResponse {
  message: string;
  email: string;
  resendCooldownSeconds: number;
  expiresAt: string;
}

/// <summary>
/// DTO yêu cầu đặt lại mật khẩu bằng mã OTP (POST /api/auth/reset-password).
/// </summary>
export interface ResetPasswordRequest {
  email: string;
  otp: string;
  newPassword: string;
  confirmNewPassword: string;
}

/// <summary>
/// DTO phản hồi sau khi đặt lại mật khẩu thành công (POST /api/auth/reset-password).
/// </summary>
export interface ResetPasswordResponse {
  message: string;
  email: string;
}
