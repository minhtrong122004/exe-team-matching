import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type {
  User,
  AuthResponse,
  AuthUserDto,
  AccountResponse,
  UserProfileResponse,
  AcceptTermsResponse,
} from '../types';
import apiClient, { clearAuthSession } from '../api/client';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  loginWithGoogle: (idToken: string) => Promise<AuthUserDto>;
  loginDemo?: (role?: 'Student' | 'Lecturer' | 'Moderator') => AuthUserDto;
  acceptTerms: () => Promise<AcceptTermsResponse>;
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

  const loginDemo = useCallback((role: 'Student' | 'Lecturer' | 'Moderator' = 'Student'): AuthUserDto => {
    let demoUser: User;
    if (role === 'Moderator') {
      demoUser = {
        id: '22222222-2222-2222-2222-222222222202',
        email: 'moderator@fpt.edu.vn',
        fullName: 'ThS. Lê Minh Điều Phối',
        role: 'Moderator',
        campus: 'Hà Nội',
        hasAcceptedTerms: true,
        isProfileCompleted: true,
      };
    } else if (role === 'Lecturer') {
      demoUser = {
        id: '33333333-3333-3333-3333-333333333303',
        email: 'lecturer@fpt.edu.vn',
        fullName: 'TS. Nguyễn Văn Giảng Viên',
        role: 'Lecturer',
        campus: 'Đà Nẵng',
        hasAcceptedTerms: true,
        isProfileCompleted: true,
      };
    } else {
      demoUser = {
        id: '11111111-1111-1111-1111-111111111101',
        email: 'tulpnse185102@fpt.edu.vn',
        fullName: 'Lữ Phước Nhật Tú',
        role: 'Student',
        studentCode: 'SE185102',
        campus: 'TP. Hồ Chí Minh',
        major: 'Kỹ thuật phần mềm',
        hasAcceptedTerms: true,
        isProfileCompleted: true,
      };
    }
    localStorage.setItem('access_token', 'demo-access-token');
    localStorage.setItem('refresh_token', 'demo-refresh-token');
    localStorage.setItem('user', JSON.stringify(demoUser));
    localStorage.setItem('is_demo_mode', 'true');
    setUser(demoUser);
    setIsLoading(false);
    return demoUser;
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
        studentCode: account.studentCode || undefined,
        hasAcceptedTerms: account.hasAcceptedTerms ?? false,
        acceptedTermsAt: account.acceptedTermsAt ?? null,
      };

      if (account.role === 'Student') {
        try {
          const profileRes = await apiClient.get<UserProfileResponse>('/users/me');
          if (profileRes.data?.fullName) {
            verifiedUser.fullName = profileRes.data.fullName;
            verifiedUser.studentCode = profileRes.data.studentCode || undefined;
            verifiedUser.campus = profileRes.data.campus || undefined;
            verifiedUser.major = profileRes.data.major || undefined;
            verifiedUser.isProfileCompleted = Boolean(profileRes.data.isProfileCompleted);
          }
        } catch {
          // Bỏ qua nếu UserProfile chưa được tạo
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
          studentCode: account.studentCode || undefined,
          hasAcceptedTerms: account.hasAcceptedTerms ?? false,
          acceptedTermsAt: account.acceptedTermsAt ?? null,
        };

        if (account.role === 'Student') {
          try {
            const profileRes = await apiClient.get<UserProfileResponse>('/users/me');
            if (isMounted && profileRes.data?.fullName) {
              verifiedUser.fullName = profileRes.data.fullName;
              verifiedUser.studentCode = profileRes.data.studentCode || undefined;
              verifiedUser.campus = profileRes.data.campus || undefined;
              verifiedUser.major = profileRes.data.major || undefined;
              verifiedUser.isProfileCompleted = Boolean(profileRes.data.isProfileCompleted);
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

  const loginWithGoogle = async (idToken: string): Promise<AuthUserDto> => {
    const response = await apiClient.post<AuthResponse>('/auth/google', { idToken });
    const { accessToken, refreshToken, user: authUser } = response.data;

    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);

    const currentUser: User = {
      ...authUser,
      studentCode: authUser.studentCode || undefined,
      hasAcceptedTerms: authUser.hasAcceptedTerms ?? false,
      acceptedTermsAt: authUser.acceptedTermsAt ?? null,
    };

    if (authUser.role === 'Student') {
      try {
        const profileRes = await apiClient.get<UserProfileResponse>('/users/me', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (profileRes.data?.fullName) {
          currentUser.fullName = profileRes.data.fullName;
          currentUser.studentCode = profileRes.data.studentCode || currentUser.studentCode || undefined;
          currentUser.campus = profileRes.data.campus || undefined;
          currentUser.major = profileRes.data.major || undefined;
          currentUser.isProfileCompleted = Boolean(profileRes.data.isProfileCompleted);
        }
      } catch {
        // Hồ sơ chưa kịp tạo thì dùng thông tin từ Auth.
      }
    }

    localStorage.setItem('user', JSON.stringify(currentUser));
    setUser(currentUser);
    return authUser;
  };

  const acceptTerms = async (): Promise<AcceptTermsResponse> => {
    const response = await apiClient.post<AcceptTermsResponse>('/auth/accept-terms', {
      accepted: true,
    });
    updateUserData({
      hasAcceptedTerms: true,
      acceptedTermsAt: response.data.acceptedTermsAt,
    });
    return response.data;
  };

  const logout = async (): Promise<void> => {
    const refreshToken = localStorage.getItem('refresh_token');
    if (refreshToken) {
      try {
        await apiClient.post('/auth/logout', { refreshToken });
      } catch (err) {
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
        loginWithGoogle,
        loginDemo,
        acceptTerms,
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
