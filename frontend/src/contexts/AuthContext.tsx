import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type {
  User,
  AuthResponse,
  AuthUserDto,
  AccountResponse,
  UserProfileResponse,
  RegisterResponse,
  VerifyEmailResponse,
  ResendVerificationResponse,
  ForgotPasswordResponse,
  ResetPasswordRequest,
  ResetPasswordResponse,
} from '../types';
import apiClient, { clearAuthSession } from '../api/client';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<AuthUserDto>;
  register: (email: string, password: string, fullName: string) => Promise<RegisterResponse>;
  verifyEmail: (email: string, otp: string) => Promise<VerifyEmailResponse>;
  resendVerification: (email: string) => Promise<ResendVerificationResponse>;
  forgotPassword: (email: string) => Promise<ForgotPasswordResponse>;
  resetPassword: (data: ResetPasswordRequest) => Promise<ResetPasswordResponse>;
  logout: () => Promise<void>;
  refreshCurrentUser: () => Promise<void>;
  updateUserData: (partial: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const savedUser = localStorage.getItem('user');
      const token = localStorage.getItem('access_token');
      if (savedUser && token) {
        return JSON.parse(savedUser) as User;
      }
    } catch {
      // Ignored
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const updateUserData = useCallback((partial: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...partial };
      localStorage.setItem('user', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const refreshCurrentUser = useCallback(async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const response = await apiClient.get<AccountResponse>('/auth/me');
      const account = response.data;
      const verifiedUser: User = {
        id: account.id,
        email: account.email,
        fullName: account.fullName,
        role: account.role,
      };

      // Đối với Sinh viên, đồng bộ fullName và thông tin học thuật từ User Service (nguồn chuẩn)
      if (account.role === 'Student') {
        try {
          const profileRes = await apiClient.get<UserProfileResponse>('/users/me');
          if (profileRes.data?.fullName) {
            verifiedUser.fullName = profileRes.data.fullName;
            verifiedUser.studentCode = profileRes.data.studentCode || undefined;
            verifiedUser.campus = profileRes.data.campus || undefined;
            verifiedUser.major = profileRes.data.major || undefined;
          }
        } catch {
          // Bỏ qua nếu UserProfile chưa được tạo hoặc User.API tạm thời bận
        }
      }

      setUser(verifiedUser);
      localStorage.setItem('user', JSON.stringify(verifiedUser));
    } catch (err) {
      console.warn('Phiên đăng nhập không hợp lệ hoặc hết hạn:', err);
      clearAuthSession();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const verifySession = async () => {
      const token = localStorage.getItem('access_token');
      if (!token) {
        if (isMounted) {
          setUser(null);
          setIsLoading(false);
        }
        return;
      }

      try {
        const response = await apiClient.get<AccountResponse>('/auth/me');
        if (!isMounted) return;

        const account = response.data;
        const verifiedUser: User = {
          id: account.id,
          email: account.email,
          fullName: account.fullName,
          role: account.role,
        };

        // Đối với Sinh viên, đồng bộ fullName từ User Service (nguồn chuẩn cập nhật hồ sơ)
        if (account.role === 'Student') {
          try {
            const profileRes = await apiClient.get<UserProfileResponse>('/users/me');
            if (isMounted && profileRes.data?.fullName) {
              verifiedUser.fullName = profileRes.data.fullName;
              verifiedUser.studentCode = profileRes.data.studentCode || undefined;
              verifiedUser.campus = profileRes.data.campus || undefined;
              verifiedUser.major = profileRes.data.major || undefined;
            }
          } catch {
            // Giữ nguyên fallback fullName từ Auth.API nếu Profile chưa khả dụng
          }
        }

        if (isMounted) {
          setUser(verifiedUser);
          localStorage.setItem('user', JSON.stringify(verifiedUser));
        }
      } catch {
        if (isMounted) {
          clearAuthSession();
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    verifySession();

    // Lắng nghe sự kiện đăng xuất từ Axios Interceptor (khi refresh token thất bại)
    const handleLogoutEvent = () => {
      if (isMounted) {
        setUser(null);
        setIsLoading(false);
      }
    };

    window.addEventListener('auth:logout', handleLogoutEvent);
    return () => {
      isMounted = false;
      window.removeEventListener('auth:logout', handleLogoutEvent);
    };
  }, []);

  const login = async (email: string, password: string): Promise<AuthUserDto> => {
    const response = await apiClient.post<AuthResponse>('/auth/login', {
      email: email.trim(),
      password,
    });

    const { accessToken, refreshToken, user: authUser } = response.data;

    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);

    const currentUser: User = { ...authUser };
    if (authUser.role === 'Student') {
      try {
        const profileRes = await apiClient.get<UserProfileResponse>('/users/me', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (profileRes.data?.fullName) {
          currentUser.fullName = profileRes.data.fullName;
          currentUser.studentCode = profileRes.data.studentCode || undefined;
          currentUser.campus = profileRes.data.campus || undefined;
          currentUser.major = profileRes.data.major || undefined;
        }
      } catch {
        // Fallback to authUser
      }
    }

    localStorage.setItem('user', JSON.stringify(currentUser));
    setUser(currentUser);
    return authUser;
  };

  const register = async (
    email: string,
    password: string,
    fullName: string
  ): Promise<RegisterResponse> => {
    // Đăng ký tài khoản sinh viên mới (Gate C, D, H).
    // Phản hồi trả về thông tin chờ xác thực OTP, tuyệt đối không lưu token vào localStorage trước khi xác thực.
    const response = await apiClient.post<RegisterResponse>('/auth/register', {
      email: email.trim(),
      password,
      fullName: fullName.trim(),
      role: 'Student',
    });

    return response.data;
  };

  const verifyEmail = async (email: string, otp: string): Promise<VerifyEmailResponse> => {
    const response = await apiClient.post<VerifyEmailResponse>('/auth/verify-email', {
      email: email.trim(),
      otp: otp.trim(),
    });
    return response.data;
  };

  const resendVerification = async (email: string): Promise<ResendVerificationResponse> => {
    const response = await apiClient.post<ResendVerificationResponse>('/auth/resend-verification', {
      email: email.trim(),
    });
    return response.data;
  };

  const forgotPassword = async (email: string): Promise<ForgotPasswordResponse> => {
    const response = await apiClient.post<ForgotPasswordResponse>('/auth/forgot-password', {
      email: email.trim(),
    });
    return response.data;
  };

  const resetPassword = async (data: ResetPasswordRequest): Promise<ResetPasswordResponse> => {
    const response = await apiClient.post<ResetPasswordResponse>('/auth/reset-password', {
      email: data.email.trim(),
      otp: data.otp.trim(),
      newPassword: data.newPassword,
      confirmNewPassword: data.confirmNewPassword,
    });
    return response.data;
  };

  const logout = async (): Promise<void> => {
    const refreshToken = localStorage.getItem('refresh_token');
    if (refreshToken) {
      try {
        await apiClient.post('/auth/logout', { refreshToken });
      } catch (err) {
        // Tiếp tục dọn dẹp local storage ngay cả khi mạng hoặc server gặp sự cố
        console.warn('Lỗi khi thu hồi refresh token từ server:', err);
      }
    }

    clearAuthSession();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        verifyEmail,
        resendVerification,
        forgotPassword,
        resetPassword,
        logout,
        refreshCurrentUser,
        updateUserData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
