import React, { useState, useEffect, useCallback, useId } from 'react';
import apiClient from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import type {
  AccountResponse,
  CreateLecturerRequest,
  GetAccountsQuery,
  UserRole,
  PagedResult,
} from '../types';
import {
  Users,
  Search,
  Filter,
  UserPlus,
  Lock,
  Unlock,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  GraduationCap,
  Shield,
  X,
  Mail,
  User as UserIcon,
} from 'lucide-react';

export const AdminAccountsPage: React.FC = () => {
  const { user: authUser } = useAuth();
  const searchInputId = useId();
  const roleFilterId = useId();
  const statusFilterId = useId();
  const sortByFilterId = useId();
  const pageSizeId = useId();
  const lecturerNameId = useId();
  const lecturerEmailId = useId();
  const lecturerPasswordId = useId();

  // State danh sách tài khoản & phân trang
  const [accounts, setAccounts] = useState<AccountResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Phân trang
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);

  // Bộ lọc
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'true' | 'false'>('ALL');
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Debounce tìm kiếm
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
      setPage(1); // Reset về trang 1 khi gõ tìm kiếm
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Modal tạo giảng viên
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [createFullName, setCreateFullName] = useState<string>('');
  const [createEmail, setCreateEmail] = useState<string>('');
  const [createPassword, setCreatePassword] = useState<string>('');
  const [showCreatePassword, setShowCreatePassword] = useState<boolean>(false);
  const [createLoading, setCreateLoading] = useState<boolean>(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Modal xác nhận khóa tài khoản
  const [accountToLock, setAccountToLock] = useState<AccountResponse | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Hàm tải danh sách tài khoản từ Backend
  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: GetAccountsQuery = {
        page,
        pageSize,
        sortBy,
        sortDir,
      };

      if (debouncedSearch) {
        params.search = debouncedSearch;
      }
      if (roleFilter !== 'ALL') {
        params.role = roleFilter;
      }
      if (statusFilter !== 'ALL') {
        params.isActive = statusFilter === 'true';
      }

      const response = await apiClient.get<PagedResult<AccountResponse>>('/auth/accounts', {
        params,
      });

      const data = response.data;
      setAccounts(data.items || []);
      setTotalCount(data.totalCount || 0);
      setTotalPages(data.totalPages || 1);
    } catch (err: unknown) {
      const axiosErr = err as {
        response?: { data?: { message?: string; title?: string }; status?: number };
      };
      if (axiosErr.response?.status === 403) {
        setError('Bạn không có quyền quản trị để xem danh sách tài khoản.');
      } else {
        setError(
          axiosErr.response?.data?.message ||
            axiosErr.response?.data?.title ||
            'Không thể tải danh sách tài khoản. Vui lòng thử lại sau.'
        );
      }
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, debouncedSearch, roleFilter, statusFilter, sortBy, sortDir]);

  // Gọi fetch ban đầu qua queueMicrotask để tránh oxlint set-state-in-effect
  useEffect(() => {
    queueMicrotask(() => {
      fetchAccounts();
    });
  }, [fetchAccounts]);

  // Xử lý tạo tài khoản Giảng viên
  const handleCreateLecturerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    // Kiểm tra định dạng đầu vào theo đúng quy chuẩn Backend
    const trimmedName = createFullName.trim();
    const trimmedEmail = createEmail.trim().toLowerCase();

    if (!trimmedName || trimmedName.length < 2) {
      setCreateError('Họ và tên giảng viên phải có ít nhất 2 ký tự.');
      return;
    }
    if (trimmedName.length > 100) {
      setCreateError('Họ và tên giảng viên không được vượt quá 100 ký tự.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
      setCreateError('Địa chỉ email không đúng định dạng hợp lệ.');
      return;
    }
    if (trimmedEmail.length > 256) {
      setCreateError('Địa chỉ email không được vượt quá 256 ký tự.');
      return;
    }

    if (!createPassword || createPassword.length < 8) {
      setCreateError('Mật khẩu phải có ít nhất 8 ký tự.');
      return;
    }
    if (!/[A-Z]/.test(createPassword)) {
      setCreateError('Mật khẩu phải chứa ít nhất một chữ in hoa (A-Z).');
      return;
    }
    if (!/[0-9]/.test(createPassword)) {
      setCreateError('Mật khẩu phải chứa ít nhất một chữ số (0-9).');
      return;
    }
    if (!/[^a-zA-Z0-9]/.test(createPassword)) {
      setCreateError('Mật khẩu phải chứa ít nhất một ký tự đặc biệt (!@#$%^&*...).');
      return;
    }

    setCreateLoading(true);
    try {
      const payload: CreateLecturerRequest = {
        fullName: trimmedName,
        email: trimmedEmail,
        password: createPassword,
      };

      await apiClient.post<AccountResponse>('/auth/accounts/lecturers', payload);

      // Thành công: Xóa mật khẩu ngay, đóng modal, làm mới danh sách
      setCreatePassword('');
      setCreateFullName('');
      setCreateEmail('');
      setIsCreateModalOpen(false);
      setSuccessMessage(`Đã khởi tạo thành công tài khoản Giảng viên cho "${trimmedEmail}"!`);

      // Làm mới danh sách tài khoản
      await fetchAccounts();
    } catch (err: unknown) {
      const axiosErr = err as {
        response?: {
          status?: number;
          data?: {
            title?: string;
            message?: string;
            errors?: Record<string, string[]>;
          };
        };
      };

      if (axiosErr.response?.status === 409) {
        setCreateError(
          axiosErr.response.data?.title ||
            'Email này đã được sử dụng trong hệ thống. Vui lòng chọn địa chỉ email khác.'
        );
      } else if (axiosErr.response?.status === 400 && axiosErr.response.data?.errors) {
        const firstErrKey = Object.keys(axiosErr.response.data.errors)[0];
        const msg = axiosErr.response.data.errors[firstErrKey]?.[0];
        setCreateError(msg || 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.');
      } else {
        setCreateError(
          axiosErr.response?.data?.title ||
            axiosErr.response?.data?.message ||
            'Đã xảy ra lỗi khi tạo tài khoản giảng viên. Vui lòng thử lại.'
        );
      }
    } finally {
      setCreateLoading(false);
    }
  };

  // Khóa tài khoản
  const handleConfirmLock = async () => {
    if (!accountToLock) return;

    // Ràng buộc bảo mật: Không thể tự khóa tài khoản của chính mình
    if (accountToLock.id === authUser?.id || accountToLock.email === authUser?.email) {
      setError('Bạn không thể tự khóa tài khoản của chính mình!');
      setAccountToLock(null);
      return;
    }

    setActionLoadingId(accountToLock.id);
    try {
      await apiClient.patch<AccountResponse>(`/auth/accounts/${accountToLock.id}/lock`);
      setSuccessMessage(`Đã khóa thành công tài khoản "${accountToLock.email}".`);
      setAccountToLock(null);
      await fetchAccounts();
    } catch (err: unknown) {
      const axiosErr = err as {
        response?: { data?: { message?: string; title?: string }; status?: number };
      };
      setError(
        axiosErr.response?.data?.message ||
          axiosErr.response?.data?.title ||
          'Không thể khóa tài khoản. Vui lòng thử lại sau.'
      );
    } finally {
      setActionLoadingId(null);
    }
  };

  // Mở khóa tài khoản
  const handleUnlock = async (account: AccountResponse) => {
    setActionLoadingId(account.id);
    try {
      await apiClient.patch<AccountResponse>(`/auth/accounts/${account.id}/unlock`);
      setSuccessMessage(`Đã mở khóa thành công tài khoản "${account.email}".`);
      await fetchAccounts();
    } catch (err: unknown) {
      const axiosErr = err as {
        response?: { data?: { message?: string; title?: string }; status?: number };
      };
      setError(
        axiosErr.response?.data?.message ||
          axiosErr.response?.data?.title ||
          'Không thể mở khóa tài khoản. Vui lòng thử lại sau.'
      );
    } finally {
      setActionLoadingId(null);
    }
  };

  // Định dạng ngày hiển thị theo chuẩn Việt Nam
  const formatDate = (dateString?: string | null) => {
    if (!dateString) return '—';
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  // Reset bộ lọc
  const handleResetFilters = () => {
    setSearchTerm('');
    setRoleFilter('ALL');
    setStatusFilter('ALL');
    setSortBy('createdAt');
    setSortDir('desc');
    setPage(1);
  };

  const hasActiveFilters =
    Boolean(searchTerm) || roleFilter !== 'ALL' || statusFilter !== 'ALL' || sortBy !== 'createdAt';

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: '3rem' }}>
      {/* ── HEADER & TIÊU ĐỀ ────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.75rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 'var(--radius-md, 10px)',
                background: 'linear-gradient(135deg, #f26f21 0%, #ea580c 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                boxShadow: '0 2px 6px rgba(242, 111, 33, 0.3)',
              }}
            >
              <Shield size={20} />
            </div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>
              Quản trị Tài khoản Hệ thống
            </h1>
          </div>
          <p style={{ color: 'var(--text-muted, #64748b)', fontSize: '0.925rem' }}>
            Quản lý người dùng, phân quyền, cấp tài khoản Giảng viên và kiểm soát trạng thái truy cập hệ thống.
          </p>
        </div>

        <button
          className="btn btn-primary"
          onClick={() => {
            setCreateError(null);
            setIsCreateModalOpen(true);
          }}
          style={{ whiteSpace: 'nowrap' }}
        >
          <UserPlus size={18} />
          <span>Thêm tài khoản Giảng viên</span>
        </button>
      </div>

      {/* ── THÔNG BÁO PHẢN HỒI (SUCCESS / ERROR) ────────────────────────── */}
      {successMessage && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#ecfdf5',
            color: '#065f46',
            border: '1px solid #a7f3d0',
            padding: '0.85rem 1.25rem',
            borderRadius: 'var(--radius-md, 10px)',
            marginBottom: '1.25rem',
            fontSize: '0.9rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <CheckCircle2 size={18} style={{ color: '#10b981', flexShrink: 0 }} />
            <span>{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            style={{ color: '#065f46', cursor: 'pointer', padding: 4 }}
            aria-label="Đóng thông báo thành công"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {error && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#fef2f2',
            color: '#991b1b',
            border: '1px solid #fecaca',
            padding: '0.85rem 1.25rem',
            borderRadius: 'var(--radius-md, 10px)',
            marginBottom: '1.25rem',
            fontSize: '0.9rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <AlertCircle size={18} style={{ color: '#ef4444', flexShrink: 0 }} />
            <span>{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            style={{ color: '#991b1b', cursor: 'pointer', padding: 4 }}
            aria-label="Đóng thông báo lỗi"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* ── BỘ LỌC & TÌM KIẾM ──────────────────────────────────────────── */}
      <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            alignItems: 'flex-end',
          }}
        >
          {/* Ô tìm kiếm từ khóa */}
          <div style={{ gridColumn: 'span 2' }}>
            <label
              htmlFor={searchInputId}
              style={{
                display: 'block',
                fontSize: '0.8rem',
                fontWeight: 600,
                color: 'var(--text-muted)',
                marginBottom: '0.35rem',
              }}
            >
              Tìm kiếm tài khoản
            </label>
            <div style={{ position: 'relative' }}>
              <Search
                size={16}
                style={{
                  position: 'absolute',
                  left: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              />
              <input
                id={searchInputId}
                type="text"
                className="form-control"
                placeholder="Nhập họ tên hoặc email cần tìm..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ paddingLeft: '2.25rem' }}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  style={{
                    position: 'absolute',
                    right: 10,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                  }}
                  aria-label="Xóa từ khóa tìm kiếm"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Lọc theo vai trò */}
          <div>
            <label
              htmlFor={roleFilterId}
              style={{
                display: 'block',
                fontSize: '0.8rem',
                fontWeight: 600,
                color: 'var(--text-muted)',
                marginBottom: '0.35rem',
              }}
            >
              Vai trò người dùng
            </label>
            <select
              id={roleFilterId}
              className="form-control"
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value as UserRole | 'ALL');
                setPage(1);
              }}
            >
              <option value="ALL">Tất cả vai trò</option>
              <option value="Student">Sinh viên (Student)</option>
              <option value="Lecturer">Giảng viên (Lecturer)</option>
              <option value="Admin">Quản trị viên (Admin)</option>
            </select>
          </div>

          {/* Lọc theo trạng thái */}
          <div>
            <label
              htmlFor={statusFilterId}
              style={{
                display: 'block',
                fontSize: '0.8rem',
                fontWeight: 600,
                color: 'var(--text-muted)',
                marginBottom: '0.35rem',
              }}
            >
              Trạng thái hoạt động
            </label>
            <select
              id={statusFilterId}
              className="form-control"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as 'ALL' | 'true' | 'false');
                setPage(1);
              }}
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="true">Đang hoạt động</option>
              <option value="false">Đã bị khóa</option>
            </select>
          </div>

          {/* Sắp xếp */}
          <div>
            <label
              htmlFor={sortByFilterId}
              style={{
                display: 'block',
                fontSize: '0.8rem',
                fontWeight: 600,
                color: 'var(--text-muted)',
                marginBottom: '0.35rem',
              }}
            >
              Sắp xếp theo
            </label>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <select
                id={sortByFilterId}
                className="form-control"
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value);
                  setPage(1);
                }}
              >
                <option value="createdAt">Ngày tạo</option>
                <option value="fullName">Họ và tên</option>
                <option value="email">Email</option>
                <option value="role">Vai trò</option>
              </select>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
                title={sortDir === 'asc' ? 'Tăng dần (A-Z)' : 'Giảm dần (Z-A)'}
                style={{ padding: '0 0.75rem' }}
              >
                {sortDir === 'asc' ? '↑' : '↓'}
              </button>
            </div>
          </div>

          {/* Nút thao tác nhanh */}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => fetchAccounts()}
              disabled={loading}
              title="Tải lại danh sách"
              style={{ flex: 1 }}
            >
              <RefreshCw size={16} className={loading ? 'spin' : ''} />
              <span>Làm mới</span>
            </button>
            {hasActiveFilters && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleResetFilters}
                title="Đặt lại tất cả bộ lọc"
              >
                <Filter size={16} />
                <span>Đặt lại</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── BẢNG DANH SÁCH TÀI KHOẢN ────────────────────────────────────── */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              textAlign: 'left',
              fontSize: '0.9rem',
              color: 'var(--text-main)',
            }}
          >
            <thead>
              <tr
                style={{
                  borderBottom: '2px solid var(--border-light, #e2e8f0)',
                  backgroundColor: 'var(--bg-sidebar-hover, #f8fafc)',
                  color: 'var(--text-muted, #64748b)',
                  fontSize: '0.78rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                <th style={{ padding: '0.85rem 1.25rem' }}>Người dùng</th>
                <th style={{ padding: '0.85rem 1.25rem' }}>Email</th>
                <th style={{ padding: '0.85rem 1.25rem' }}>Vai trò</th>
                <th style={{ padding: '0.85rem 1.25rem' }}>Trạng thái</th>
                <th style={{ padding: '0.85rem 1.25rem' }}>Ngày đăng ký</th>
                <th style={{ padding: '0.85rem 1.25rem', textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading && accounts.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '3.5rem 1rem', textAlign: 'center' }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        border: '3px solid #f26f21',
                        borderTopColor: 'transparent',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                        margin: '0 auto 12px auto',
                      }}
                    />
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                      Đang tải danh sách tài khoản từ hệ thống...
                    </p>
                  </td>
                </tr>
              ) : accounts.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '3.5rem 1rem', textAlign: 'center' }}>
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: '50%',
                        backgroundColor: 'var(--bg-main, #f1f5f9)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 12px auto',
                        color: 'var(--text-muted)',
                      }}
                    >
                      <Users size={24} />
                    </div>
                    <h3
                      style={{
                        fontSize: '1.1rem',
                        fontWeight: 700,
                        marginBottom: '0.35rem',
                        color: 'var(--text-main)',
                      }}
                    >
                      Không tìm thấy tài khoản nào
                    </h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1rem' }}>
                      Không có kết quả nào phù hợp với bộ lọc hoặc từ khóa hiện tại.
                    </p>
                    {hasActiveFilters && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={handleResetFilters}
                      >
                        Xóa bộ lọc tìm kiếm
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                accounts.map((acc) => {
                  const isSelf = acc.id === authUser?.id || acc.email === authUser?.email;
                  const isActionLoading = actionLoadingId === acc.id;

                  return (
                    <tr
                      key={acc.id}
                      style={{
                        borderBottom: '1px solid var(--border-light, #f1f5f9)',
                        transition: 'background-color var(--transition-fast, 150ms)',
                      }}
                    >
                      {/* Người dùng & Avatar */}
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: '50%',
                              backgroundColor:
                                acc.role === 'Admin'
                                  ? '#0a192f'
                                  : acc.role === 'Lecturer'
                                  ? '#f26f21'
                                  : '#2563eb',
                              color: '#fff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '0.8rem',
                              flexShrink: 0,
                            }}
                          >
                            {acc.role === 'Lecturer' ? 'GV' : acc.role === 'Admin' ? 'AD' : 'SV'}
                          </div>
                          <div>
                            <div
                              style={{
                                fontWeight: 600,
                                color: 'var(--text-main)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.4rem',
                              }}
                            >
                              <span>{acc.fullName}</span>
                              {isSelf && (
                                <span
                                  style={{
                                    fontSize: '0.68rem',
                                    fontWeight: 700,
                                    backgroundColor: '#fff7ed',
                                    color: '#ea580c',
                                    padding: '0.1rem 0.45rem',
                                    borderRadius: 'var(--radius-full, 9999px)',
                                    border: '1px solid #fed7aa',
                                  }}
                                >
                                  Bạn
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-light, #94a3b8)' }}>
                              ID: {acc.id.substring(0, 8)}...
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td style={{ padding: '1rem 1.25rem', color: 'var(--text-muted)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Mail size={14} style={{ color: 'var(--text-light)', flexShrink: 0 }} />
                          <span style={{ wordBreak: 'break-all' }}>{acc.email}</span>
                        </div>
                      </td>

                      {/* Vai trò */}
                      <td style={{ padding: '1rem 1.25rem' }}>
                        {acc.role === 'Admin' && (
                          <span
                            className="badge"
                            style={{
                              backgroundColor: '#1e293b',
                              color: '#f8fafc',
                              border: '1px solid #334155',
                            }}
                          >
                            <Shield size={12} />
                            Quản trị viên
                          </span>
                        )}
                        {acc.role === 'Lecturer' && (
                          <span
                            className="badge"
                            style={{
                              backgroundColor: '#fff7ed',
                              color: '#c2410c',
                              border: '1px solid #ffedd5',
                            }}
                          >
                            <GraduationCap size={12} />
                            Giảng viên
                          </span>
                        )}
                        {acc.role === 'Student' && (
                          <span
                            className="badge"
                            style={{
                              backgroundColor: '#eff6ff',
                              color: '#1d4ed8',
                              border: '1px solid #dbeafe',
                            }}
                          >
                            <UserIcon size={12} />
                            Sinh viên
                          </span>
                        )}
                      </td>

                      {/* Trạng thái */}
                      <td style={{ padding: '1rem 1.25rem' }}>
                        {acc.isActive ? (
                          <span className="badge badge-active">
                            <CheckCircle2 size={12} />
                            Hoạt động
                          </span>
                        ) : (
                          <span className="badge badge-cancelled">
                            <Lock size={12} />
                            Bị khóa
                          </span>
                        )}
                      </td>

                      {/* Ngày đăng ký */}
                      <td
                        style={{
                          padding: '1rem 1.25rem',
                          color: 'var(--text-muted)',
                          fontSize: '0.825rem',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {formatDate(acc.createdAt)}
                      </td>

                      {/* Thao tác */}
                      <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                        {acc.isActive ? (
                          <button
                            type="button"
                            className="btn btn-sm btn-secondary"
                            onClick={() => {
                              if (isSelf) return;
                              setAccountToLock(acc);
                            }}
                            disabled={isSelf || isActionLoading}
                            title={
                              isSelf
                                ? 'Không thể tự khóa tài khoản của chính mình'
                                : 'Khóa tài khoản người dùng này'
                            }
                            style={{
                              opacity: isSelf ? 0.5 : 1,
                              cursor: isSelf ? 'not-allowed' : 'pointer',
                              color: isSelf ? 'var(--text-muted)' : '#dc2626',
                              borderColor: isSelf ? undefined : '#fecaca',
                            }}
                          >
                            {isActionLoading ? (
                              <RefreshCw size={13} className="spin" />
                            ) : (
                              <Lock size={13} />
                            )}
                            <span>Khóa</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-sm btn-primary"
                            onClick={() => handleUnlock(acc)}
                            disabled={isActionLoading}
                            title="Mở khóa tài khoản người dùng này"
                          >
                            {isActionLoading ? (
                              <RefreshCw size={13} className="spin" />
                            ) : (
                              <Unlock size={13} />
                            )}
                            <span>Mở khóa</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── FOOTER PHÂN TRANG ────────────────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            padding: '1rem 1.25rem',
            borderTop: '1px solid var(--border-light, #eaedf2)',
            backgroundColor: 'var(--bg-card, #ffffff)',
          }}
        >
          {/* Thông tin số lượng */}
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Hiển thị{' '}
            <strong style={{ color: 'var(--text-main)' }}>
              {totalCount === 0 ? 0 : (page - 1) * pageSize + 1}
            </strong>{' '}
            –{' '}
            <strong style={{ color: 'var(--text-main)' }}>
              {Math.min(page * pageSize, totalCount)}
            </strong>{' '}
            trong tổng số <strong style={{ color: 'var(--text-main)' }}>{totalCount}</strong> tài
            khoản
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {/* Lựa chọn số mục mỗi trang */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
              <label htmlFor={pageSizeId} style={{ color: 'var(--text-muted)' }}>
                Hiển thị:
              </label>
              <select
                id={pageSizeId}
                className="form-control"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                style={{ padding: '0.3rem 0.5rem', width: 'auto', fontSize: '0.85rem' }}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>

            {/* Điều hướng trang */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={page <= 1 || loading}
                title="Trang trước"
                style={{ padding: '0.4rem 0.6rem' }}
              >
                <ChevronLeft size={16} />
              </button>

              <span style={{ fontSize: '0.85rem', padding: '0 0.5rem', color: 'var(--text-main)' }}>
                Trang <strong>{page}</strong> / {totalPages || 1}
              </span>

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={page >= totalPages || loading}
                title="Trang tiếp theo"
                style={{ padding: '0.4rem 0.6rem' }}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── MODAL: KHỞI TẠO TÀI KHOẢN GIẢNG VIÊN ─────────────────────── */}
      {isCreateModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
        >
          <div
            className="card modal-content"
            style={{
              width: '100%',
              maxWidth: 520,
              padding: '1.75rem',
              boxShadow: 'var(--shadow-xl, 0 20px 25px -5px rgba(0, 0, 0, 0.2))',
              position: 'relative',
              animation: 'fadeIn 0.2s ease',
            }}
          >
            {/* Header Modal */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.25rem',
                borderBottom: '1px solid var(--border-light, #eaedf2)',
                paddingBottom: '0.85rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 'var(--radius-sm, 6px)',
                    backgroundColor: '#fff7ed',
                    color: '#ea580c',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <GraduationCap size={20} />
                </div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  Khởi tạo tài khoản Giảng viên
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!createLoading) setIsCreateModalOpen(false);
                }}
                disabled={createLoading}
                style={{ color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}
                aria-label="Đóng cửa sổ"
              >
                <X size={18} />
              </button>
            </div>

            {/* Thông báo nhắc nhở vai trò */}
            <div
              style={{
                backgroundColor: 'var(--bg-main, #f8fafc)',
                border: '1px solid var(--border-light, #e2e8f0)',
                borderRadius: 'var(--radius-md, 10px)',
                padding: '0.75rem 1rem',
                marginBottom: '1.25rem',
                fontSize: '0.825rem',
                color: 'var(--text-muted)',
              }}
            >
              <p style={{ margin: 0 }}>
                💡 <strong>Lưu ý:</strong> Tài khoản được tạo tại đây sẽ có vai trò{' '}
                <strong>Giảng viên (Lecturer)</strong> để tham gia quản trị hội đồng và duyệt đề
                tài. Sinh viên tự đăng ký qua cổng chung.
              </p>
            </div>

            {createError && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  backgroundColor: '#fef2f2',
                  color: '#991b1b',
                  border: '1px solid #fecaca',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md, 10px)',
                  marginBottom: '1.25rem',
                  fontSize: '0.85rem',
                }}
              >
                <AlertCircle size={16} style={{ flexShrink: 0, color: '#ef4444' }} />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateLecturerSubmit}>
              {/* Họ và tên */}
              <div className="form-group">
                <label htmlFor={lecturerNameId} className="form-label">
                  Họ và tên giảng viên <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  id={lecturerNameId}
                  type="text"
                  className="form-control"
                  placeholder="Ví dụ: TS. Trần Văn Bình"
                  value={createFullName}
                  onChange={(e) => setCreateFullName(e.target.value)}
                  disabled={createLoading}
                  required
                />
              </div>

              {/* Email */}
              <div className="form-group">
                <label htmlFor={lecturerEmailId} className="form-label">
                  Địa chỉ Email <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  id={lecturerEmailId}
                  type="email"
                  className="form-control"
                  placeholder="Ví dụ: binhtv@fe.edu.vn"
                  value={createEmail}
                  onChange={(e) => setCreateEmail(e.target.value)}
                  disabled={createLoading}
                  required
                />
              </div>

              {/* Mật khẩu khởi tạo */}
              <div className="form-group">
                <label htmlFor={lecturerPasswordId} className="form-label">
                  Mật khẩu khởi tạo <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    id={lecturerPasswordId}
                    type={showCreatePassword ? 'text' : 'password'}
                    className="form-control"
                    placeholder="Nhập mật khẩu an toàn..."
                    value={createPassword}
                    onChange={(e) => setCreatePassword(e.target.value)}
                    disabled={createLoading}
                    required
                    style={{ paddingRight: '2.5rem' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCreatePassword((prev) => !prev)}
                    style={{
                      position: 'absolute',
                      right: 10,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                    }}
                    aria-label={showCreatePassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    {showCreatePassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                  Yêu cầu: Tối thiểu 8 ký tự, ít nhất 1 chữ in hoa (A-Z), 1 chữ số (0-9) và 1 ký tự đặc
                  biệt.
                </p>
              </div>

              {/* Nút hành động */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '0.75rem',
                  marginTop: '1.5rem',
                  paddingTop: '1rem',
                  borderTop: '1px solid var(--border-light, #eaedf2)',
                }}
              >
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsCreateModalOpen(false)}
                  disabled={createLoading}
                >
                  Hủy bỏ
                </button>
                <button type="submit" className="btn btn-primary" disabled={createLoading}>
                  {createLoading ? (
                    <>
                      <RefreshCw size={16} className="spin" />
                      <span>Đang tạo tài khoản...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus size={16} />
                      <span>Tạo tài khoản Giảng viên</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: XÁC NHẬN KHÓA TÀI KHOẢN ─────────────────────────── */}
      {accountToLock && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
        >
          <div
            className="card modal-content"
            style={{
              width: '100%',
              maxWidth: 460,
              padding: '1.75rem',
              boxShadow: 'var(--shadow-xl)',
              animation: 'fadeIn 0.2s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  backgroundColor: '#fee2e2',
                  color: '#dc2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Lock size={20} />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)' }}>
                Xác nhận khóa tài khoản
              </h3>
            </div>

            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
              Bạn có chắc chắn muốn khóa tài khoản người dùng{' '}
              <strong style={{ color: 'var(--text-main)' }}>{accountToLock.fullName}</strong> (
              <span style={{ color: '#2563eb' }}>{accountToLock.email}</span>)?
            </p>

            <div
              style={{
                backgroundColor: '#fffbeb',
                border: '1px solid #fef3c7',
                borderRadius: 'var(--radius-md, 10px)',
                padding: '0.75rem 1rem',
                marginBottom: '1.5rem',
                fontSize: '0.825rem',
                color: '#92400e',
              }}
            >
              ⚠️ Khi bị khóa, người dùng sẽ bị thu hồi phiên đăng nhập hiện tại và không thể truy cập
              vào hệ thống cho đến khi được Admin mở khóa trở lại.
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setAccountToLock(null)}
                disabled={actionLoadingId === accountToLock.id}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleConfirmLock}
                disabled={actionLoadingId === accountToLock.id}
              >
                {actionLoadingId === accountToLock.id ? (
                  <>
                    <RefreshCw size={16} className="spin" />
                    <span>Đang khóa...</span>
                  </>
                ) : (
                  <>
                    <Lock size={16} />
                    <span>Xác nhận khóa tài khoản</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Animation spin keyframe */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
};
