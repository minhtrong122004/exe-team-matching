import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User, UserRole, AuthResponse } from '../types';
import apiClient from '../api/client';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string, role: UserRole) => Promise<void>;
  logout: () => void;
  mockLoginAs: (role: UserRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Tải thông tin phiên đăng nhập từ localStorage
    try {
      const savedUser = localStorage.getItem('user');
      const token = localStorage.getItem('access_token');
      if (savedUser && token) {
        const parsed = JSON.parse(savedUser);
        // Clean up personal name back to generic student demo name
        if (
          parsed.fullName?.toLowerCase().includes('tú') ||
          parsed.fullName?.toLowerCase().includes('nhat') ||
          !parsed.studentCode
        ) {
          parsed.fullName = 'Nguyễn Văn A';
          parsed.studentCode = 'SE185102';
          parsed.email = 'sinhvien@fpt.edu.vn';
          parsed.campus = 'TP. Hồ Chí Minh (HCM)';
          parsed.major = 'Kỹ thuật phần mềm (SE)';
          localStorage.setItem('user', JSON.stringify(parsed));
        }
        setUser(parsed);
      }
    } catch (e) {
      console.error('Error loading stored user:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await apiClient.post<AuthResponse>('/auth/login', { email, password });
      const { accessToken, refreshToken, user: userData } = response.data;

      localStorage.setItem('access_token', accessToken);
      localStorage.setItem('refresh_token', refreshToken);
      localStorage.setItem('user', JSON.stringify(userData));

      setUser(userData);
    } catch (err: unknown) {
      // Nếu API Auth chưa chạy hoặc lỗi kết nối, throw để form hiển thị
      throw err;
    }
  };

  const register = async (email: string, password: string, fullName: string, role: UserRole) => {
    await apiClient.post('/auth/register', { email, password, fullName, role });
    // Tự động đăng nhập sau khi đăng ký
    await login(email, password);
  };

  const logout = () => {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        apiClient.post('/auth/logout', { refreshToken }).catch(() => {});
      }
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      setUser(null);
    }
  };

  // Mock login phục vụ demo & dev khi Auth Service chưa chạy dữ liệu thực
  const mockLoginAs = (role: UserRole) => {
    const mockUsers: Record<UserRole, User> = {
      Student: {
        id: '11111111-1111-1111-1111-111111111111',
        email: 'sinhvien@fpt.edu.vn',
        fullName: 'Nguyễn Văn A',
        role: 'Student',
        studentCode: 'SE185102',
        campus: 'TP. Hồ Chí Minh (HCM)',
        major: 'Kỹ thuật phần mềm (SE)',
      },
      Lecturer: {
        id: '22222222-2222-2222-2222-222222222222',
        email: 'lecturer@fpt.edu.vn',
        fullName: 'TS. Trần Văn B',
        role: 'Lecturer',
        studentCode: 'GV8812',
        campus: 'TP. Hồ Chí Minh (HCM)',
        major: 'Bộ môn Khởi nghiệp EXE',
      },
      Admin: {
        id: '33333333-3333-3333-3333-333333333333',
        email: 'admin@fpt.edu.vn',
        fullName: 'Quản trị viên Hệ thống',
        role: 'Admin',
        studentCode: 'AD001',
        campus: 'FPT University Headquarter',
        major: 'Ban Đào tạo FPT',
      },
    };

    const dummyToken = 'mock_jwt_token_' + Date.now();
    const selectedUser = mockUsers[role];
    localStorage.setItem('access_token', dummyToken);
    localStorage.setItem('refresh_token', 'mock_refresh_token');
    localStorage.setItem('user', JSON.stringify(selectedUser));
    setUser(selectedUser);
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
        mockLoginAs,
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
