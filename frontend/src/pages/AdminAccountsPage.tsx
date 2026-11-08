import React, { useState, useEffect, useCallback, useId } from 'react';
import apiClient from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import type {
  AccountResponse,
  CreateLecturerRequest,
  GetAccountsQuery,
  UserRole,
  PagedResult,
  FapStudentImportItem,
  ProvisionFapStudentsResponse,
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
  ShieldCheck,
  FileSpreadsheet,
  KeyRound,
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

  // Modal tạo giảng viên / điều phối viên
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [createFullName, setCreateFullName] = useState<string>('');
  const [createEmail, setCreateEmail] = useState<string>('');
  const [createPassword, setCreatePassword] = useState<string>('');
  const [createRole, setCreateRole] = useState<'Lecturer' | 'Moderator'>('Lecturer');
  const [showCreatePassword, setShowCreatePassword] = useState<boolean>(false);
  const [createLoading, setCreateLoading] = useState<boolean>(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Modal đồng bộ danh sách Sinh viên từ FAP (BR-01)
  const [isFapModalOpen, setIsFapModalOpen] = useState<boolean>(false);
  const [fapSemesterCode, setFapSemesterCode] = useState<string>('FA26');
  const [fapSubjectCode, setFapSubjectCode] = useState<string>('EXE101');
  const [fapRawText, setFapRawText] = useState<string>(
    [
      'SE180101, Nguyễn Hoàng Phương Huyền Trân, trannhphse180101@fpt.edu.vn, SE',
      'AI180205, Trần Minh Khôi, khoitmai180205@fpt.edu.vn, AI',
      'GD180312, Lê Ngọc Bảo Châu, chaulnbgd180312@fpt.edu.vn, GD',
      'MKT180408, Phạm Quốc Đạt, datpqmkt180408@fpt.edu.vn, MKT',
      'IB180519, Võ Thị Thanh Thảo, thaovttib180519@fpt.edu.vn, IB',
      'IA180622, Đặng Gia Huy, huydgia180622@fpt.edu.vn, IA',
      'SA180123, Nguyễn Văn Chuyển Ngành, chuyennganh.sa180123@fpt.edu.vn, SE',
    ].join('\n')
  );
  const [fapLoading, setFapLoading] = useState<boolean>(false);
  const [fapError, setFapError] = useState<string | null>(null);
  const [fapResult, setFapResult] = useState<ProvisionFapStudentsResponse | null>(null);

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
        role: createRole,
      };

      await apiClient.post<AccountResponse>('/auth/accounts/lecturers', payload);

      // Thành công: Xóa mật khẩu ngay, đóng modal, làm mới danh sách
      setCreatePassword('');
      setCreateFullName('');
      setCreateEmail('');
      setIsCreateModalOpen(false);
      setSuccessMessage(
        `Đã khởi tạo thành công tài khoản ${createRole === 'Moderator' ? 'Điều phối viên (Moderator)' : 'Giảng viên (Lecturer)'} cho "${trimmedEmail}"!`
      );

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

  // Xử lý đồng bộ danh sách sinh viên từ FAP (BR-01)
  const handleProvisionFapSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFapError(null);
    setFapResult(null);

    const lines = fapRawText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      setFapError('Vui lòng nhập ít nhất 1 dòng sinh viên theo định dạng: MSSV, Họ và tên, Email, Chuyên ngành (tùy chọn).');
      return;
    }

    const parsedStudents: FapStudentImportItem[] = [];
    for (let i = 0; i < lines.length; i++) {
      const parts = lines[i].split(/[,\t;|]/).map((p) => p.trim());
      if (parts.length < 3 || !parts[0] || !parts[1] || !parts[2]) {
        setFapError(
          `Dòng ${i + 1} không đúng định dạng ("${lines[i]}"). Định dạng chuẩn: MSSV, Họ và tên, Email, Chuyên ngành (tùy chọn)`
        );
        return;
      }
      parsedStudents.push({
        studentCode: parts[0].toUpperCase(),
        fullName: parts[1],
        email: parts[2].toLowerCase(),
        major: parts[3] ? parts[3] : undefined,
      });
    }

    setFapLoading(true);
    try {
      const res = await apiClient.post<ProvisionFapStudentsResponse>(
        '/auth/accounts/provision-fap',
        {
          students: parsedStudents,
          semesterCode: fapSemesterCode.trim().toUpperCase() || 'FA26',
          subjectCode: fapSubjectCode.trim().toUpperCase() || 'EXE101',
        }
      );
      setFapResult(res.data);
      setSuccessMessage(
        `Đồng bộ FAP (${res.data.semesterCode} - ${res.data.subjectCode}) hoàn tất: Cấp mới ${res.data.newlyCreatedCount} SV, giữ nguyên ${res.data.existingCount} SV kỳ trước.`
      );
      await fetchAccounts();
    } catch (err: any) {
      setFapError(
        err.response?.data?.detail ||
          err.response?.data?.title ||
          err.response?.data?.message ||
          'Không thể đồng bộ danh sách sinh viên FAP. Vui lòng kiểm tra định dạng dữ liệu.'
      );
    } finally {
      setFapLoading(false);
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
              Quản trị Tài khoản & Đồng bộ FAP
            </h1>
          </div>
          <p style={{ color: 'var(--text-muted, #64748b)', fontSize: '0.925rem' }}>
            Đồng bộ danh sách sinh viên đủ điều kiện học EXE từ FAP (BR-01), cấp tài khoản Giảng viên / Moderator và kiểm soát quyền truy cập.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              setFapError(null);
              setIsFapModalOpen(true);
            }}
            style={{
              whiteSpace: 'nowrap',
              borderColor: '#0054a6',
              color: '#0054a6',
              background: '#eff6ff',
              fontWeight: 700,
            }}
          >
            <FileSpreadsheet size={18} />
            <span>Đồng bộ Sinh viên từ FAP (BR-01)</span>
          </button>

          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setCreateError(null);
              setIsCreateModalOpen(true);
            }}
            style={{ whiteSpace: 'nowrap' }}
          >
            <UserPlus size={18} />
            <span>Thêm Giảng viên / Moderator</span>
          </button>
        </div>
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
              <option value="Moderator">Điều phối viên (Moderator)</option>
              <option value="Lecturer">Giảng viên (Lecturer)</option>
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
                                acc.role === 'Moderator'
                                  ? '#008837'
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
                            {acc.role === 'Moderator'
                              ? 'ĐP'
                              : acc.role === 'Lecturer'
                              ? 'GV'
                              : 'SV'}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div
                              style={{
                                fontWeight: 600,
                                color: 'var(--text-main)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.4rem',
                                flexWrap: 'wrap',
                              }}
                            >
                              <span>{acc.fullName}</span>
                              {acc.studentCode && (
                                <span
                                  style={{
                                    fontFamily: 'var(--font-mono, monospace)',
                                    fontVariantNumeric: 'tabular-nums',
                                    fontSize: '0.72rem',
                                    fontWeight: 700,
                                    backgroundColor: '#eff6ff',
                                    color: '#0054a6',
                                    padding: '0.1rem 0.45rem',
                                    borderRadius: 6,
                                    border: '1px solid #bfdbfe',
                                    flexShrink: 0,
                                  }}
                                >
                                  {acc.studentCode}
                                </span>
                              )}
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
                        {acc.role === 'Moderator' && (
                          <span
                            className="badge"
                            style={{
                              backgroundColor: '#f0fdf4',
                              color: '#008837',
                              border: '1px solid #bbf7d0',
                            }}
                          >
                            <ShieldCheck size={12} />
                            Điều phối viên
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
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', alignItems: 'flex-start' }}>
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
                          {acc.role === 'Student' && (
                            <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                              <span
                                style={{
                                  fontSize: '0.68rem',
                                  fontWeight: 600,
                                  padding: '0.1rem 0.4rem',
                                  borderRadius: 4,
                                  backgroundColor: acc.hasAcceptedTerms ? '#f0fdf4' : '#fffbeb',
                                  color: acc.hasAcceptedTerms ? '#15803d' : '#b45309',
                                  border: acc.hasAcceptedTerms ? '1px solid #bbf7d0' : '1px solid #fde68a',
                                }}
                              >
                                {acc.hasAcceptedTerms ? 'Đã đồng ý BR-34' : 'Chờ đồng ý BR-34'}
                              </span>
                              {acc.mustChangePassword && (
                                <span
                                  style={{
                                    fontSize: '0.68rem',
                                    fontWeight: 600,
                                    padding: '0.1rem 0.4rem',
                                    borderRadius: 4,
                                    backgroundColor: '#fff7ed',
                                    color: '#c2410c',
                                    border: '1px solid #fed7aa',
                                  }}
                                >
                                  MK khởi tạo FAP
                                </span>
                              )}
                            </div>
                          )}
                        </div>
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
                  Khởi tạo tài khoản Giảng viên / Moderator
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
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.55rem',
              }}
            >
              <ShieldCheck size={16} color="#0054a6" style={{ flexShrink: 0, marginTop: 2 }} />
              <p style={{ margin: 0 }}>
                <strong>Lưu ý phân quyền (BR-02):</strong> <strong>Giảng viên (Lecturer)</strong> có quyền quan sát nhóm và xem báo cáo. <strong>Điều phối viên (Moderator)</strong> có quyền đồng bộ sinh viên FAP và vận hành điều phối học kỳ.
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
              {/* Vai trò khởi tạo */}
              <div className="form-group">
                <label className="form-label">
                  Vai trò hệ thống <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <select
                  className="form-control"
                  value={createRole}
                  onChange={(e) => setCreateRole(e.target.value as 'Lecturer' | 'Moderator')}
                  disabled={createLoading}
                >
                  <option value="Lecturer">Giảng viên (Lecturer — Quan sát nhóm & Xem báo cáo)</option>
                  <option value="Moderator">Điều phối viên (Moderator — Đồng bộ FAP & Điều phối kỳ học)</option>
                </select>
              </div>

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
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.5rem',
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
              <span>
                Khi bị khóa, người dùng sẽ bị thu hồi phiên đăng nhập hiện tại và không thể truy cập vào hệ thống cho đến khi được Moderator hoặc Admin mở khóa trở lại.
              </span>
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

      {/* ── MODAL: ĐỒNG BỘ DANH SÁCH SINH VIÊN TỪ FAP (BR-01, BR-04) ──── */}
      {isFapModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="fap-provision-modal-title"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(10, 25, 47, 0.68)',
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
              maxWidth: 740,
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '1.75rem',
              boxShadow: 'var(--shadow-xl)',
              animation: 'fadeIn 0.2s cubic-bezier(0.23, 1, 0.32, 1)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.15rem',
                borderBottom: '1px solid var(--border-light, #eaedf2)',
                paddingBottom: '0.85rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    backgroundColor: '#eff6ff',
                    color: '#0054a6',
                    border: '1px solid #bfdbfe',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <FileSpreadsheet size={20} />
                </div>
                <div>
                  <h3 id="fap-provision-modal-title" style={{ fontSize: '1.18rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                    Đồng bộ Danh sách Sinh viên từ FAP (BR-01 & BR-04)
                  </h3>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Tự động khởi tạo tài khoản Student, tách ngành từ MSSV và gửi email mật khẩu khởi tạo qua MailHog
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!fapLoading) setIsFapModalOpen(false);
                }}
                disabled={fapLoading}
                style={{ color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}
                aria-label="Đóng cửa sổ đồng bộ FAP"
              >
                <X size={18} />
              </button>
            </div>

            {fapError && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  backgroundColor: '#fef2f2',
                  color: '#991b1b',
                  border: '1px solid #fecaca',
                  padding: '0.75rem 1rem',
                  borderRadius: 10,
                  marginBottom: '1rem',
                  fontSize: '0.85rem',
                }}
              >
                <AlertCircle size={16} style={{ flexShrink: 0, color: '#ef4444' }} />
                <span>{fapError}</span>
              </div>
            )}

            <form onSubmit={handleProvisionFapSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '0.85rem', alignItems: 'flex-end', marginBottom: '1rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                    Mã Học kỳ (Semester) *
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={fapSemesterCode}
                    onChange={(e) => setFapSemesterCode(e.target.value.toUpperCase())}
                    placeholder="FA26"
                    disabled={fapLoading}
                    style={{ fontFamily: 'var(--font-mono, monospace)' }}
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                    Mã Môn học (Subject) *
                  </label>
                  <select
                    className="form-control"
                    value={fapSubjectCode}
                    onChange={(e) => setFapSubjectCode(e.target.value)}
                    disabled={fapLoading}
                    style={{ fontFamily: 'var(--font-mono, monospace)' }}
                  >
                    <option value="EXE101">EXE101 — Experiential Entrepreneurship 1</option>
                    <option value="EXE201">EXE201 — Experiential Entrepreneurship 2</option>
                  </select>
                </div>

                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={fapLoading}
                  onClick={() => {
                    setFapRawText(
                      [
                        'SE180101, Nguyễn Hoàng Phương Huyền Trân, trannhphse180101@fpt.edu.vn, SE',
                        'AI180205, Trần Minh Khôi, khoitmai180205@fpt.edu.vn, AI',
                        'GD180312, Lê Ngọc Bảo Châu, chaulnbgd180312@fpt.edu.vn, GD',
                        'MKT180408, Phạm Quốc Đạt, datpqmkt180408@fpt.edu.vn, MKT',
                        'IB180519, Võ Thị Thanh Thảo, thaovttib180519@fpt.edu.vn, IB',
                        'IA180622, Đặng Gia Huy, huydgia180622@fpt.edu.vn, IA',
                        'SA180123, Nguyễn Văn Chuyển Ngành, chuyennganh.sa180123@fpt.edu.vn, SE',
                      ].join('\n')
                    );
                    setFapError(null);
                  }}
                >
                  Nạp danh sách FAP mẫu (7 SV)
                </button>
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                  Danh sách Sinh viên từ FAP (Mỗi dòng: <code>MSSV, Họ và tên, Email, Chuyên ngành (tùy chọn)</code>) *
                </label>
                <textarea
                  className="form-control"
                  rows={7}
                  value={fapRawText}
                  onChange={(e) => setFapRawText(e.target.value)}
                  disabled={fapLoading}
                  placeholder="SE180101, Nguyễn Văn A, anvse180101@fpt.edu.vn, SE"
                  style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '0.82rem', lineHeight: 1.55 }}
                />
                <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '0.35rem', lineHeight: 1.55 }}>
                  • <strong>Cột 4 (Chuyên ngành)</strong>: Có thể nhập mã (<code>SE</code>, <code>AI</code>, <code>IA</code>, <code>GD</code>, <code>MKT</code>, <code>IB</code>) hoặc tên tiếng Việt (<code>Kỹ thuật phần mềm</code>...). Nếu để trống, hệ thống sẽ tự động nhận diện từ tiền tố MSSV (ví dụ: <code>SE18...</code> &rarr; SE). Phù hợp cho trường hợp sinh viên chuyển cơ sở / chuyển ngành (như MSSV <code>SA...</code> học SE).<br />
                  • <strong>Quy tắc mật khẩu khởi tạo tự động</strong>: <code>Fpt@&#123;MSSV&#125;!</code> (ví dụ: <code>Fpt@SE180101!</code>). Nếu email đã tồn tại từ kỳ trước, hệ thống giữ nguyên mật khẩu cũ của sinh viên.
                </div>
              </div>

              {fapResult && (
                <div
                  style={{
                    marginBottom: '1.25rem',
                    border: '1px solid #bfdbfe',
                    borderRadius: 10,
                    overflow: 'hidden',
                    backgroundColor: '#f8fafc',
                  }}
                >
                  <div
                    style={{
                      padding: '0.7rem 1rem',
                      backgroundColor: '#eff6ff',
                      borderBottom: '1px solid #bfdbfe',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      color: '#0054a6',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    <span>
                      Kết quả đồng bộ ({fapResult.semesterCode} • {fapResult.subjectCode}): Tổng {fapResult.totalProcessed} SV
                    </span>
                    <span>
                      Cấp mới: {fapResult.newlyCreatedCount} • Đã có TK: {fapResult.existingCount}
                    </span>
                  </div>
                  <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#475569' }}>
                          <th style={{ padding: '0.5rem 0.75rem' }}>MSSV</th>
                          <th style={{ padding: '0.5rem 0.75rem' }}>Họ và tên</th>
                          <th style={{ padding: '0.5rem 0.75rem' }}>Email</th>
                          <th style={{ padding: '0.5rem 0.75rem' }}>Trạng thái & Mật khẩu</th>
                        </tr>
                      </thead>
                      <tbody>
                        {fapResult.results.map((item) => (
                          <tr key={item.accountId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '0.5rem 0.75rem', fontFamily: 'var(--font-mono, monospace)', fontWeight: 700 }}>
                              {item.studentCode}
                            </td>
                            <td style={{ padding: '0.5rem 0.75rem', fontWeight: 600 }}>{item.fullName}</td>
                            <td style={{ padding: '0.5rem 0.75rem', color: '#475569' }}>{item.email}</td>
                            <td style={{ padding: '0.5rem 0.75rem', color: item.isNewlyCreated ? '#008837' : '#0054a6', fontWeight: 600 }}>
                              {item.statusMessage}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid var(--border-light, #eaedf2)', paddingTop: '1rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsFapModalOpen(false)}
                  disabled={fapLoading}
                >
                  Đóng
                </button>
                <button type="submit" className="btn btn-primary" disabled={fapLoading}>
                  {fapLoading ? (
                    <>
                      <RefreshCw size={16} className="spin" />
                      <span>Đang đồng bộ & gửi email...</span>
                    </>
                  ) : (
                    <>
                      <KeyRound size={16} />
                      <span>Thực thi Đồng bộ & Gửi Email Mật khẩu</span>
                    </>
                  )}
                </button>
              </div>
            </form>
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
