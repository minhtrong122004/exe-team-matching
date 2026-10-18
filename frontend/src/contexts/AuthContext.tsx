import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User, AuthResponse, AuthUserDto, AccountResponse } from '../types';
import apiClient, { clearAuthSession } from '../api/client';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<AuthUserDto>;
  register: (email: string, password: string, fullName: string) => Promise<AuthUserDto>;
  logout: () => Promise<void>;
  refreshCurrentUser: () => Promise<void>;
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
        if (isMounted) {
          const account = response.data;
          const verifiedUser: User = {
            id: account.id,
            email: account.email,
            fullName: account.fullName,
            role: account.role,
          };
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
    localStorage.setItem('user', JSON.stringify(authUser));

    setUser(authUser);
    return authUser;
  };

  const register = async (
    email: string,
    password: string,
    fullName: string
  ): Promise<AuthUserDto> => {
    // Đăng ký tài khoản sinh viên mới (Role luôn cố định là "Student" theo CLAUDE.md)
    const response = await apiClient.post<AuthResponse>('/auth/register', {
      email: email.trim(),
      password,
      fullName: fullName.trim(),
      role: 'Student',
    });

    const { accessToken, refreshToken, user: authUser } = response.data;

    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
    localStorage.setItem('user', JSON.stringify(authUser));

    setUser(authUser);
    return authUser;
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
        logout,
        refreshCurrentUser,
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
