import axios from 'axios';

// API Gateway Base URL (mặc định /api qua Vite dev proxy hoặc VITE_API_BASE_URL)
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: tự động đính kèm JWT Bearer token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Flag tránh gọi refresh lặp vô tận và hàng đợi request đồng thời
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

export const clearAuthSession = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user');
  delete apiClient.defaults.headers.common['Authorization'];
  window.dispatchEvent(new Event('auth:logout'));
};

// Response interceptor: tự động bắt lỗi 401 và làm mới refresh token an toàn
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Bỏ qua nếu không có response hoặc không phải lỗi 401
    if (!error.response || error.response.status !== 401) {
      return Promise.reject(error);
    }

    // Không thử refresh nếu bản thân request là auth endpoint công khai / đặc thù
    const url = originalRequest.url || '';
    const isAuthEndpoint =
      url.includes('/auth/login') ||
      url.includes('/auth/register') ||
      url.includes('/auth/verify-email') ||
      url.includes('/auth/resend-verification') ||
      url.includes('/auth/forgot-password') ||
      url.includes('/auth/reset-password') ||
      url.includes('/auth/refresh') ||
      url.includes('/auth/logout');

    if (originalRequest._retry || isAuthEndpoint) {
      return Promise.reject(error);
    }

    // Nếu đang trong quá trình refresh, xếp request vào hàng đợi
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((token) => {
          if (token && originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${token}`;
          }
          return apiClient(originalRequest);
        })
        .catch((err) => Promise.reject(err));
    }

    originalRequest._retry = true;
    isRefreshing = true;

    const currentRefreshToken = localStorage.getItem('refresh_token');
    if (!currentRefreshToken) {
      // Không có refresh token -> dọn dẹp phiên và từ chối
      clearAuthSession();
      if (
        window.location.pathname !== '/login' &&
        window.location.pathname !== '/register' &&
        window.location.pathname !== '/verify-email' &&
        window.location.pathname !== '/forgot-password' &&
        window.location.pathname !== '/reset-password'
      ) {
        window.location.href = '/login';
      }
      isRefreshing = false;
      return Promise.reject(error);
    }

    try {
      // Gọi trực tiếp axios không qua apiClient để tránh loop interceptor
      const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
        refreshToken: currentRefreshToken,
      });

      // Kiểm tra: nếu trong lúc chờ refresh mà user đã bấm đăng xuất, hủy lưu token muộn
      if (!localStorage.getItem('refresh_token')) {
        processQueue(new Error('User logged out during refresh'), null);
        return Promise.reject(new Error('Session terminated during token refresh'));
      }

      const { accessToken, refreshToken: newRefreshToken, user: updatedUser } = response.data;

      localStorage.setItem('access_token', accessToken);
      if (newRefreshToken) {
        localStorage.setItem('refresh_token', newRefreshToken);
      }
      if (updatedUser) {
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }

      apiClient.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
      processQueue(null, accessToken);

      if (originalRequest.headers) {
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
      }
      return apiClient(originalRequest);
    } catch (refreshErr) {
      processQueue(refreshErr, null);
      clearAuthSession();
      if (
        window.location.pathname !== '/login' &&
        window.location.pathname !== '/register' &&
        window.location.pathname !== '/verify-email' &&
        window.location.pathname !== '/forgot-password' &&
        window.location.pathname !== '/reset-password'
      ) {
        window.location.href = '/login';
      }
      return Promise.reject(refreshErr);
    } finally {
      isRefreshing = false;
    }
  }
);

export default apiClient;
