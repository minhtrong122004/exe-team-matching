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
  loginDemo: (role?: 'Student' | 'Lecturer' | 'Moderator') => AuthUserDto;
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
        id: '2ea25476-18b3-453e-95d6-b41808498cee',
        email: 'phanvya6k5@gmail.com',
        fullName: 'Phan Thảo Vy',
        role: 'Student',
        studentCode: 'SE194505',
        campus: 'TP. Hồ Chí Minh',
        major: 'Kỹ thuật phần mềm',
        hasAcceptedTerms: true,
        isProfileCompleted: true,
      };
    }

    const demoTokenMap: Record<'Student' | 'Lecturer' | 'Moderator', { accessToken: string; refreshToken: string }> = {
      Moderator: {
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJodHRwOi8vc2NoZW1hcy54bWxzb2FwLm9yZy93cy8yMDA1LzA1L2lkZW50aXR5L2NsYWltcy9uYW1laWRlbnRpZmllciI6IjIyMjIyMjIyLTIyMjItMjIyMi0yMjIyLTIyMjIyMjIyMjIwMiIsInN1YiI6IjIyMjIyMjIyLTIyMjItMjIyMi0yMjIyLTIyMjIyMjIyMjIwMiIsImh0dHA6Ly9zY2hlbWFzLnhtbHNvYXAub3JnL3dzLzIwMDUvMDUvaWRlbnRpdHkvY2xhaW1zL2VtYWlsYWRkcmVzcyI6Im1vZGVyYXRvckBmcHQuZWR1LnZuIiwiZW1haWwiOiJtb2RlcmF0b3JAZnB0LmVkdS52biIsImh0dHA6Ly9zY2hlbWFzLnhtbHNvYXAub3JnL3dzLzIwMDUvMDUvaWRlbnRpdHkvY2xhaW1zL25hbWUiOiJUaFMuIEzDqiBNaW5oIMSQaeG7gXUgUGjhu5FpIiwibmFtZSI6IlRoUy4gTMOqIE1pbmggxJBp4buBdSBQaOG7kWkiLCJodHRwOi8vc2NoZW1hcy5taWNyb3NvZnQuY29tL3dzLzIwMDgvMDYvaWRlbnRpdHkvY2xhaW1zL3JvbGUiOiJNb2RlcmF0b3IiLCJyb2xlIjoiTW9kZXJhdG9yIiwianRpIjoibW9kLXRlc3QtdG9rZW4iLCJuYmYiOjE3OTQzOTMyMzAsImV4cCI6MTgyNTkyOTI0MCwiaXNzIjoiZXhlLWF1dGgiLCJhdWQiOiJleGUtYXBpIn0.Kyivp2x8wMBZJKGiNBc3hv9G-Do0herxaSnFwDqcpls',
        refreshToken: 'demo-refresh-token-moderator-2026',
      },
      Lecturer: {
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJodHRwOi8vc2NoZW1hcy54bWxzb2FwLm9yZy93cy8yMDA1LzA1L2lkZW50aXR5L2NsYWltcy9uYW1laWRlbnRpZmllciI6IjMzMzMzMzMzLTMzMzMtMzMzMy0zMzMzLTMzMzMzMzMzMzMwMyIsInN1YiI6IjMzMzMzMzMzLTMzMzMtMzMzMy0zMzMzLTMzMzMzMzMzMzMwMyIsImh0dHA6Ly9zY2hlbWFzLnhtbHNvYXAub3JnL3dzLzIwMDUvMDUvaWRlbnRpdHkvY2xhaW1zL2VtYWlsYWRkcmVzcyI6ImxlY3R1cmVyQGZwdC5lZHUudm4iLCJlbWFpbCI6ImxlY3R1cmVyQGZwdC5lZHUudm4iLCJodHRwOi8vc2NoZW1hcy54bWxzb2FwLm9yZy93cy8yMDA1LzA1L2lkZW50aXR5L2NsYWltcy9uYW1lIjoiVFMuIE5ndXnhu4VuIFbEg24gR2nhuqNuZyBWacOqbiIsIm5hbWUiOiJUUy4gTmd1eeG7hW4gVsSDbiBHaeG6o25nIFZpw6puIiwiaHR0cDovL3NjaGVtYXMubWljcm9zb2Z0LmNvbS93cy8yMDA4LzA2L2lkZW50aXR5L2NsYWltcy9yb2xlIjoiTGVjdHVyZXIiLCJyb2xlIjoiTGVjdHVyZXIiLCJqdGkiOiJsZWMtdGVzdC10b2tlbiIsIm5iZiI6MTc5NDM5MzI1NiwiZXhwIjoxODI1OTI5MjY2LCJpc3MiOiJleGUtYXV0aCIsImF1ZCI6ImV4ZS1hcGkifQ.IHTV49fxKqIej7HfA3szIZTXuIu5jBW8abJ-OJ4I4fM',
        refreshToken: 'demo-refresh-token-lecturer-2026',
      },
      Student: {
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJodHRwOi8vc2NoZW1hcy54bWxzb2FwLm9yZy93cy8yMDA1LzA1L2lkZW50aXR5L2NsYWltcy9uYW1laWRlbnRpZmllciI6IjJlYTI1NDc2LTE4YjMtNDUzZS05NWQ2LWI0MTgwODQ5OGNlZSIsInN1YiI6IjJlYTI1NDc2LTE4YjMtNDUzZS05NWQ2LWI0MTgwODQ5OGNlZSIsImh0dHA6Ly9zY2hlbWFzLnhtbHNvYXAub3JnL3dzLzIwMDUvMDUvaWRlbnRpdHkvY2xhaW1zL2VtYWlsYWRkcmVzcyI6InBoYW52eWE2azVAZ21haWwuY29tIiwiZW1haWwiOiJwaGFudnlhNms1QGdtYWlsLmNvbSIsImh0dHA6Ly9zY2hlbWFzLnhtbHNvYXAub3JnL3dzLzIwMDUvMDUvaWRlbnRpdHkvY2xhaW1zL25hbWUiOiJQaGFuIFRo4bqjbyBWeSIsIm5hbWUiOiJQaGFuIFRo4bqjbyBWeSIsImh0dHA6Ly9zY2hlbWFzLm1pY3Jvc29mdC5jb20vd3MvMjAwOC8wNi9pZGVudGl0eS9jbGFpbXMvcm9sZSI6IlN0dWRlbnQiLCJyb2xlIjoiU3R1ZGVudCIsImp0aSI6InN0dS10ZXN0LXRva2VuIiwibmJmIjoxNzk0MzkzMjc4LCJleHAiOjE4MjU5MjkyODgsImlzcyI6ImV4ZS1hdXRoIiwiYXVkIjoiZXhlLWFwaSJ9.ReYk_zA3ssVIEbwoffVRsFrPswu66pcprL4lp8NTC5c',
        refreshToken: 'demo-refresh-token-student-vy-2026',
      },
    };

    localStorage.setItem('access_token', demoTokenMap[role].accessToken);
    localStorage.setItem('refresh_token', demoTokenMap[role].refreshToken);
    localStorage.setItem('user', JSON.stringify(demoUser));
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
