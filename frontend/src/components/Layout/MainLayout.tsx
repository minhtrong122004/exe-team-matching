import React, { useState, useRef, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { FptEducationLogo } from '../FptEducationLogo';
import { notificationsApi } from '../../api/notifications';
import type { UserRole } from '../../types';
import {
  Lightbulb,
  Users,
  FileText,
  Bell,
  User,
  Shield,
  LogOut,
  Compass,
  Mail,
  UserPlus,
  Menu,
  ChevronDown,
  MapPin,
  Sparkles,
  Moon,
  Sun,
  CheckCircle2,
  KeyRound,
  Lock,
  AlertCircle,
  Eye,
  EyeOff,
} from 'lucide-react';

interface NavSection {
  title: string;
  items: {
    to: string;
    label: string;
    icon: React.ReactNode;
    roles: UserRole[];
  }[];
}

export const MainLayout: React.FC = () => {
  const { user, logout, acceptTerms, changePassword } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // First-Login Onboarding State (BR-34 Terms + Optional/Recommended Initial Password Change)
  const [termsChecked, setTermsChecked] = useState(false);
  const [onboardingLoading, setOnboardingLoading] = useState(false);
  const [onboardingError, setOnboardingError] = useState<string | null>(null);
  const [onboardingSuccess, setOnboardingSuccess] = useState<string | null>(null);
  const [dismissedPasswordStep, setDismissedPasswordStep] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showOnboardingPasswords, setShowOnboardingPasswords] = useState(false);

  const needsTermsAcceptance = user?.role === 'Student' && user.hasAcceptedTerms === false;
  const needsPasswordChange =
    user?.role === 'Student' && Boolean(user.mustChangePassword) && !dismissedPasswordStep;
  const showOnboardingModal = needsTermsAcceptance || needsPasswordChange;

  const handleAcceptTermsSubmit = async () => {
    if (!termsChecked) {
      setOnboardingError('Vui lòng tích chọn xác nhận đồng ý với Quy định ghép nhóm và điều phối (BR-34).');
      return;
    }
    setOnboardingError(null);
    setOnboardingLoading(true);
    try {
      await acceptTerms();
      setOnboardingSuccess('Đã ghi nhận xác nhận đồng ý Quy định ghép nhóm (BR-34).');
    } catch (err: any) {
      setOnboardingError(
        err.response?.data?.detail ||
          err.response?.data?.title ||
          'Không thể lưu xác nhận điều khoản. Vui lòng thử lại.'
      );
    } finally {
      setOnboardingLoading(false);
    }
  };

  const handleOnboardingChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setOnboardingError(null);

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      setOnboardingError('Vui lòng nhập đầy đủ mật khẩu hiện tại và mật khẩu mới.');
      return;
    }
    if (newPassword.length < 8 || !/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword) || !/[^a-zA-Z0-9]/.test(newPassword)) {
      setOnboardingError('Mật khẩu mới phải từ 8 ký tự, gồm ít nhất 1 chữ hoa, 1 chữ số và 1 ký tự đặc biệt.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setOnboardingError('Mật khẩu xác nhận không trùng khớp.');
      return;
    }

    setOnboardingLoading(true);
    try {
      await changePassword({ currentPassword, newPassword, confirmNewPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setDismissedPasswordStep(true);
    } catch (err: any) {
      setOnboardingError(
        err.response?.data?.detail ||
          err.response?.data?.title ||
          err.response?.data?.message ||
          'Mật khẩu hiện tại không chính xác hoặc dữ liệu không hợp lệ.'
      );
    } finally {
      setOnboardingLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    const fetchUnread = async () => {
      try {
        const res = await notificationsApi.getUnreadCount();
        setUnreadCount(res.unreadCount ?? 0);
      } catch {
        // Ignore if notification service is offline in dev
      }
    };
    void fetchUnread();
    const handler = () => void fetchUnread();
    window.addEventListener('notifications:updated', handler);
    return () => window.removeEventListener('notifications:updated', handler);
  }, [user]);

  // Dark / Light Mode state
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('theme') === 'dark';
  });

  useEffect(() => {
    const theme = isDarkMode ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode((prev) => !prev);
  };

  // Close user dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Grouped navigation with /profile accessible to ALL roles
  const navSections: NavSection[] = [
    {
      title: 'Dự án & Ý tưởng',
      items: [
        {
          to: '/projects',
          label: 'Ý tưởng dự án (EXE)',
          icon: <Lightbulb size={19} />,
          roles: ['Student', 'Moderator', 'Lecturer'],
        },
        {
          to: '/groups',
          label: 'Khám phá nhóm',
          icon: <Compass size={19} />,
          roles: ['Student', 'Moderator', 'Lecturer'],
        },
        {
          to: '/candidates',
          label: 'Danh bạ ứng viên',
          icon: <Users size={19} />,
          roles: ['Student', 'Moderator', 'Lecturer'],
        },
      ],
    },
    {
      title: 'Kết nối nhóm',
      items: [
        {
          to: '/my-group',
          label: 'Nhóm của tôi',
          icon: <Users size={19} />,
          roles: ['Student'],
        },
        {
          to: '/join-requests',
          label: 'Yêu cầu tham gia',
          icon: <UserPlus size={19} />,
          roles: ['Student'],
        },
        {
          to: '/invitations',
          label: 'Lời mời vào nhóm',
          icon: <Mail size={19} />,
          roles: ['Student'],
        },
      ],
    },
    {
      title: 'Cá nhân',
      items: [
        {
          to: '/profile',
          label: 'Hồ sơ cá nhân',
          icon: <User size={19} />,
          roles: ['Student', 'Moderator', 'Lecturer'],
        },
        {
          to: '/notifications',
          label: 'Thông báo',
          icon: <Bell size={19} />,
          roles: ['Student', 'Moderator', 'Lecturer'],
        },
      ],
    },
    {
      title: 'Điều phối & Báo cáo',
      items: [
        {
          to: '/reports',
          label: 'Báo cáo ghép nhóm',
          icon: <FileText size={19} />,
          roles: ['Lecturer', 'Moderator'],
        },
        {
          to: '/admin/accounts',
          label: 'Quản lý TK & Đồng bộ FAP',
          icon: <Shield size={19} />,
          roles: ['Moderator'],
        },
      ],
    },
  ];

  const sidebarWidth = isCollapsed ? 76 : 255;

  // Extract avatar initials (SV: Sinh viên, ĐP: Điều phối viên, GV: Giảng viên)
  const getInitials = (role?: UserRole) => {
    if (role === 'Moderator') return 'ĐP';
    if (role === 'Lecturer') return 'GV';
    return 'SV';
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-main, #f4f6fa)' }}>
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.5)',
            backdropFilter: 'blur(3px)',
            zIndex: 40,
          }}
        />
      )}

      {/* ══════════════════════════════════════════════════════════════
          SIDEBAR: Clean White in Light Mode, Dark Slate in Dark Mode
         ══════════════════════════════════════════════════════════════ */}
      <aside
        style={{
          width: sidebarWidth,
          background: 'var(--bg-sidebar, #ffffff)',
          color: 'var(--text-main, #1e293b)',
          display: 'flex',
          flexDirection: 'column',
          position: 'fixed',
          top: 0,
          bottom: 0,
          left: 0,
          zIndex: 50,
          borderRight: '1px solid var(--border-light, #eaedf2)',
          boxShadow: isDarkMode ? '4px 0 20px rgba(0, 0, 0, 0.25)' : '2px 0 10px rgba(0, 0, 0, 0.02)',
          transition: 'width 220ms cubic-bezier(0.4, 0, 0.2, 1), background-color 200ms ease',
          overflowX: 'hidden',
        }}
      >
        {/* Brand Header */}
        <div
          style={{
            padding: isCollapsed ? '1rem 0' : '1.15rem 1.25rem',
            borderBottom: '1px solid var(--border-light, #f1f5f9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: isCollapsed ? 'center' : 'flex-start',
            minHeight: 72,
            boxSizing: 'border-box',
          }}
        >
          <FptEducationLogo compact={isCollapsed} />
        </div>

        {/* Grouped Navigation */}
        <nav
          style={{
            padding: isCollapsed ? '0.85rem 0.35rem' : '1rem 0.75rem',
            flex: 1,
            overflowY: 'auto',
          }}
        >
          {navSections.map((section) => {
            const visibleItems = section.items.filter((item) =>
              user ? item.roles.includes(user.role) : false
            );
            if (visibleItems.length === 0) return null;

            return (
              <div key={section.title} style={{ marginBottom: '1.25rem' }}>
                {!isCollapsed && (
                  <div
                    style={{
                      fontSize: '0.675rem',
                      textTransform: 'uppercase',
                      color: 'var(--text-light, #94a3b8)',
                      fontWeight: 700,
                      padding: '0 0.75rem 0.45rem 0.75rem',
                      letterSpacing: '0.06em',
                    }}
                  >
                    {section.title}
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                  {visibleItems.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={() => setSidebarOpen(false)}
                      title={isCollapsed ? item.label : undefined}
                      style={({ isActive }) => ({
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: isCollapsed ? 'center' : 'flex-start',
                        gap: isCollapsed ? 0 : '0.75rem',
                        padding: isCollapsed ? '0.7rem 0' : '0.6rem 0.85rem',
                        borderRadius: 8,
                        fontSize: '0.865rem',
                        fontWeight: isActive ? 700 : 500,
                        color: isActive ? '#f26f21' : 'var(--text-muted, #475569)',
                        background: isActive ? 'var(--bg-sidebar-active, #fff7ed)' : 'transparent',
                        borderLeft: isCollapsed
                          ? 'none'
                          : isActive
                          ? '3px solid #f26f21'
                          : '3px solid transparent',
                        transition: 'all 120ms ease',
                      })}
                    >
                      <div
                        style={{
                          flexShrink: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {item.icon}
                      </div>
                      {!isCollapsed && (
                        <span
                          style={{
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {item.label}
                        </span>
                      )}
                    </NavLink>
                  ))}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Sidebar Mini Footer */}
        {!isCollapsed && (
          <div
            style={{
              padding: '0.85rem 1.15rem',
              borderTop: '1px solid var(--border-light, #f1f5f9)',
              fontSize: '0.725rem',
              color: 'var(--text-light, #94a3b8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>Môn học EXE</span>
            <span style={{ fontWeight: 600, color: '#f26f21' }}>FA26 • FPT</span>
          </div>
        )}
      </aside>

      {/* ══════════════════════════════════════════════════════════════
          MAIN CONTENT AREA (No colored bar on top)
         ══════════════════════════════════════════════════════════════ */}
      <div
        style={{
          flex: 1,
          marginLeft: sidebarWidth,
          display: 'flex',
          flexDirection: 'column',
          transition: 'margin-left 220ms cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {/* ══════════════════════════════════════════════════════════════
            TOPBAR (Clean, Hamburger + Campus + Moon/Sun + Bell + User)
           ══════════════════════════════════════════════════════════════ */}
        <header
          style={{
            height: 64,
            background: 'var(--bg-header, #ffffff)',
            borderBottom: '1px solid var(--border-light, #eaedf2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 1.75rem',
            position: 'sticky',
            top: 0,
            zIndex: 30,
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            transition: 'background-color 200ms ease, border-color 200ms ease',
          }}
        >
          {/* Left section: Hamburger toggle & University portal identity */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            {/* Hamburger button */}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              title={isCollapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
              style={{
                width: 38,
                height: 38,
                borderRadius: 8,
                background: 'var(--bg-sidebar-hover, #f8fafc)',
                border: '1px solid var(--border-light, #e2e8f0)',
                color: 'var(--text-muted, #475569)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 150ms ease',
                cursor: 'pointer',
              }}
            >
              <Menu size={18} />
            </button>

            {/* Campus selector badge */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.4rem 0.75rem',
                borderRadius: 8,
                background: 'var(--bg-sidebar-hover, #f8fafc)',
                border: '1px solid var(--border-light, #e2e8f0)',
                fontSize: '0.825rem',
                color: 'var(--text-main, #334155)',
                fontWeight: 600,
              }}
            >
              <MapPin size={15} color="#f26f21" />
              <span>Cơ sở TP. Hồ Chí Minh (HCM)</span>
            </div>

            <span style={{ color: 'var(--border-medium, #cbd5e1)' }}>|</span>

            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted, #64748b)', fontWeight: 500 }}>
              Cổng Ghép nhóm Đa ngành Khởi nghiệp EXE
            </span>
          </div>

          {/* Right section: Light/Dark Mode + Notification Bell + User Profile */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {/* Theme Toggle Button: Moon 🌙 / Sun ☀️ */}
            <button
              onClick={toggleTheme}
              title={isDarkMode ? 'Chuyển sang chế độ Sáng (Light Mode)' : 'Chuyển sang chế độ Tối (Dark Mode)'}
              style={{
                width: 38,
                height: 38,
                borderRadius: 8,
                background: isDarkMode ? '#1e293b' : '#f8fafc',
                border: `1px solid ${isDarkMode ? '#334155' : '#e2e8f0'}`,
                color: isDarkMode ? '#fbbf24' : '#475569',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 150ms ease',
              }}
            >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* Notification Bell */}
            <button
              onClick={() => navigate('/notifications')}
              title={`Thông báo hệ thống (${unreadCount} chưa đọc)`}
              style={{
                position: 'relative',
                width: 38,
                height: 38,
                borderRadius: 8,
                background: isDarkMode ? '#1e293b' : '#f8fafc',
                border: `1px solid ${isDarkMode ? '#334155' : '#e2e8f0'}`,
                color: isDarkMode ? '#cbd5e1' : '#475569',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: -4,
                    right: -4,
                    minWidth: 18,
                    height: 18,
                    padding: '0 4px',
                    borderRadius: 999,
                    background: '#f26f21',
                    color: '#ffffff',
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: `0 0 0 2px ${isDarkMode ? '#1e293b' : '#ffffff'}`,
                  }}
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            {/* ══════════════════════════════════════════════════════════
                USER PROFILE & LOGOUT DROPDOWN
               ══════════════════════════════════════════════════════════ */}
            <div style={{ position: 'relative' }} ref={userMenuRef}>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.65rem',
                  padding: '0.3rem 0.65rem',
                  borderRadius: 10,
                  background: userMenuOpen ? 'var(--bg-sidebar-hover, #f1f5f9)' : 'var(--bg-sidebar-hover, #f8fafc)',
                  border: '1px solid var(--border-light, #e2e8f0)',
                  cursor: 'pointer',
                  transition: 'all 150ms ease',
                }}
              >
                {/* Avatar with Initials */}
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 8,
                    background:
                      user?.role === 'Moderator'
                        ? '#008837'
                        : user?.role === 'Lecturer'
                        ? '#0054a6'
                        : '#f26f21',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    flexShrink: 0,
                  }}
                >
                  {getInitials(user?.role)}
                </div>

                {/* Name & ID/Role */}
                <div style={{ textAlign: 'left', lineHeight: 1.35, minWidth: 0 }}>
                  <div
                    title={user?.fullName || 'Người dùng'}
                    style={{
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      color: 'var(--text-main, #0f172a)',
                      maxWidth: 160,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {user?.fullName || 'Người dùng'}
                  </div>
                  <div
                    style={{
                      fontSize: '0.725rem',
                      color: 'var(--text-muted, #64748b)',
                      fontWeight: 600,
                      fontFamily: user?.studentCode ? 'var(--font-mono, monospace)' : undefined,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {user?.studentCode || user?.role}
                  </div>
                </div>

                <ChevronDown size={15} color="var(--text-muted, #64748b)" />
              </button>

              {/* Popover Menu */}
              {userMenuOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    right: 0,
                    width: 250,
                    background: 'var(--bg-card, #ffffff)',
                    borderRadius: 12,
                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15), 0 8px 10px -6px rgba(0,0,0,0.1)',
                    border: '1px solid var(--border-light, #e2e8f0)',
                    zIndex: 100,
                    padding: '0.5rem',
                    animation: 'fadeIn 120ms ease-out',
                  }}
                >
                  {/* User Profile Header in Popover */}
                  <div
                    style={{
                      padding: '0.75rem 0.85rem',
                      borderBottom: '1px solid var(--border-light, #f1f5f9)',
                      marginBottom: '0.35rem',
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main, #0f172a)' }}>
                      {user?.fullName}
                    </div>
                    <div style={{ fontSize: '0.775rem', color: 'var(--text-muted, #64748b)', marginTop: '2px' }}>
                      {user?.email}
                    </div>
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        marginTop: '0.45rem',
                        padding: '0.2rem 0.55rem',
                        borderRadius: 6,
                        background:
                          user?.role === 'Moderator'
                            ? '#f0fdf4'
                            : user?.role === 'Lecturer'
                            ? '#eef2ff'
                            : '#fff7ed',
                        color:
                          user?.role === 'Moderator'
                            ? '#008837'
                            : user?.role === 'Lecturer'
                            ? '#0054a6'
                            : '#ea580c',
                        fontSize: '0.725rem',
                        fontWeight: 700,
                      }}
                    >
                      <Sparkles size={12} />
                      Vai trò: {user?.role}
                    </div>
                  </div>

                  {/* Account Link - Accessible to Student, Lecturer & Moderator */}
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      navigate('/profile');
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.65rem',
                      padding: '0.6rem 0.85rem',
                      borderRadius: 8,
                      color: 'var(--text-main, #334155)',
                      fontSize: '0.85rem',
                      fontWeight: 500,
                      cursor: 'pointer',
                      transition: 'background 100ms ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-sidebar-hover, #f8fafc)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <User size={16} color="var(--text-muted, #64748b)" />
                    <span>Hồ sơ cá nhân (My Account)</span>
                  </button>

                  {/* Quick Role Switcher for Demo */}
                  <div
                    style={{
                      padding: '0.5rem 0.85rem',
                      borderTop: '1px solid var(--border-light, #f1f5f9)',
                      borderBottom: '1px solid var(--border-light, #f1f5f9)',
                      margin: '0.35rem 0',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '0.775rem',
                        padding: '0.25rem 0.2rem',
                      }}
                    >
                      <span style={{ color: 'var(--text-light, #94a3b8)', fontWeight: 600 }}>
                        Vai trò xác thực:
                      </span>
                      <span
                        style={{
                          padding: '0.2rem 0.6rem',
                          borderRadius: 6,
                          fontWeight: 700,
                          fontSize: '0.75rem',
                          background:
                            user?.role === 'Moderator'
                              ? '#f0fdf4'
                              : user?.role === 'Lecturer'
                              ? '#eff6ff'
                              : '#fff7ed',
                          color:
                            user?.role === 'Moderator'
                              ? '#008837'
                              : user?.role === 'Lecturer'
                              ? '#2563eb'
                              : '#ea580c',
                        }}
                      >
                        {user?.role === 'Moderator'
                          ? 'Điều phối viên'
                          : user?.role === 'Lecturer'
                          ? 'Giảng viên'
                          : 'Sinh viên'}
                      </span>
                    </div>
                  </div>

                  {/* Logout Button */}
                  <button
                    onClick={handleLogout}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.65rem',
                      padding: '0.6rem 0.85rem',
                      borderRadius: 8,
                      color: '#dc2626',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'background 100ms ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#fef2f2')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <LogOut size={16} />
                    <span>Đăng xuất</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ══════════════════════════════════════════════════════════════
            PAGE CONTENT
           ══════════════════════════════════════════════════════════════ */}
        <main style={{ flex: 1, padding: '2rem' }}>
          <Outlet />
        </main>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          FIRST-LOGIN ONBOARDING MODAL (BR-34 TERMS & INITIAL PASSWORD)
         ══════════════════════════════════════════════════════════════ */}
      {showOnboardingModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="onboarding-modal-title"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(10, 25, 47, 0.72)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '1.25rem',
          }}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: 580,
              padding: 0,
              overflow: 'hidden',
              border: '1px solid var(--border-light, #e2e8f0)',
              borderRadius: 14,
              background: 'var(--bg-card, #ffffff)',
              animation: 'onboardingPopIn 220ms cubic-bezier(0.23, 1, 0.32, 1)',
            }}
          >
            {/* Modal Banner Header */}
            <div
              style={{
                background: '#0a192f',
                color: '#ffffff',
                padding: '1.35rem 1.75rem',
                borderBottom: '3px solid #f26f21',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: 'rgba(242, 111, 33, 0.2)',
                    border: '1px solid rgba(242, 111, 33, 0.45)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#f26f21',
                    flexShrink: 0,
                  }}
                >
                  {needsTermsAcceptance ? <Shield size={20} /> : <KeyRound size={20} />}
                </div>
                <div>
                  <h2
                    id="onboarding-modal-title"
                    style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#ffffff' }}
                  >
                    {needsTermsAcceptance
                      ? 'Quy định Ghép nhóm & Điều phối Môn EXE (BR-34)'
                      : 'Thiết lập Mật khẩu Bảo mật Lần đầu'}
                  </h2>
                  <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: '#cbd5e1' }}>
                    Sinh viên: <strong>{user?.fullName}</strong>
                    {user?.studentCode ? ` • MSSV: ${user.studentCode}` : ''}
                  </p>
                </div>
              </div>

              <span
                style={{
                  fontFamily: 'var(--font-mono, monospace)',
                  fontVariantNumeric: 'tabular-nums',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  padding: '0.25rem 0.65rem',
                  borderRadius: 999,
                  background: 'rgba(255, 255, 255, 0.12)',
                  color: '#f8fafc',
                  flexShrink: 0,
                }}
              >
                {needsTermsAcceptance ? 'Bước 1 / 2' : 'Bước 2 / 2'}
              </span>
            </div>

            <div style={{ padding: '1.5rem 1.75rem' }}>
              {onboardingError && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    padding: '0.75rem 1rem',
                    borderRadius: 10,
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    color: '#991b1b',
                    fontSize: '0.85rem',
                    marginBottom: '1.25rem',
                  }}
                >
                  <AlertCircle size={17} style={{ flexShrink: 0, color: '#dc2626' }} />
                  <span>{onboardingError}</span>
                </div>
              )}

              {onboardingSuccess && !needsTermsAcceptance && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    padding: '0.75rem 1rem',
                    borderRadius: 10,
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    color: '#166534',
                    fontSize: '0.85rem',
                    marginBottom: '1.25rem',
                  }}
                >
                  <CheckCircle2 size={17} style={{ flexShrink: 0, color: '#16a34a' }} />
                  <span>{onboardingSuccess}</span>
                </div>
              )}

              {needsTermsAcceptance ? (
                <div>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-main, #1e293b)', lineHeight: 1.55, marginTop: 0 }}>
                    Chào mừng bạn đến với hệ thống ghép nhóm học phần <strong>Experiential Entrepreneurship (EXE)</strong>. Trước khi tham gia Room ghép nhóm, vui lòng đọc và xác nhận các nguyên tắc vận hành bắt buộc:
                  </p>

                  <div
                    style={{
                      background: 'var(--bg-main, #f8fafc)',
                      border: '1px solid var(--border-light, #e2e8f0)',
                      borderRadius: 10,
                      padding: '1rem 1.15rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.65rem',
                      fontSize: '0.84rem',
                      color: 'var(--text-main, #334155)',
                      lineHeight: 1.5,
                      marginBottom: '1.25rem',
                    }}
                  >
                    <div>
                      <strong>1. Quy mô & Tỷ lệ Liên ngành (BR-07, BR-08):</strong> Mỗi nhóm chuẩn gồm <strong>6 thành viên</strong> (tối thiểu 4 thành viên hợp lệ), trong đó <strong>tối đa 3 sinh viên khối Công nghệ (SE / AI / IA)</strong> và khuyến khích tối thiểu 2 chuyên ngành khác nhau.
                    </div>
                    <div>
                      <strong>2. Cơ chế Biểu quyết Dân chủ & Bầu Leader (BR-17, BR-22):</strong> Khi phòng có từ 3 thành viên trở lên, ứng viên mới cần đạt <strong>tối thiểu 2/3 phiếu đồng ý</strong>. Khi đủ 6/6 thành viên hoặc đóng tuyển, nhóm có 24 giờ để bầu chọn Leader chính thức.
                    </div>
                    <div>
                      <strong>3. Quyền Điều phối khi Chốt sổ Học kỳ (BR-26, BR-28, BR-34):</strong> Sau thời hạn chốt sổ (Deadline), những sinh viên chưa có nhóm hoặc phòng dưới 4 thành viên sẽ được <strong>Điều phối viên (Moderator) và Giảng viên</strong> ghép tự động để đảm bảo 100% sinh viên đủ điều kiện làm đồ án.
                    </div>
                  </div>

                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.75rem',
                      padding: '0.85rem 1rem',
                      borderRadius: 10,
                      border: termsChecked ? '1px solid #f26f21' : '1px solid var(--border-light, #cbd5e1)',
                      background: termsChecked ? '#fff7ed' : 'transparent',
                      cursor: 'pointer',
                      fontSize: '0.86rem',
                      fontWeight: 600,
                      color: 'var(--text-main, #0f172a)',
                      marginBottom: '1.35rem',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={termsChecked}
                      onChange={(e) => {
                        setTermsChecked(e.target.checked);
                        if (e.target.checked) setOnboardingError(null);
                      }}
                      style={{ marginTop: 3, width: 17, height: 17, accentColor: '#f26f21', flexShrink: 0 }}
                    />
                    <span>
                      Tôi đã đọc hiểu và đồng ý tuân thủ quy định ghép nhóm liên ngành cũng như sự điều phối của Moderator / Giảng viên (BR-34).
                    </span>
                  </label>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="btn btn-secondary"
                      disabled={onboardingLoading}
                    >
                      Đăng xuất
                    </button>
                    <button
                      type="button"
                      onClick={handleAcceptTermsSubmit}
                      className="btn btn-primary"
                      disabled={onboardingLoading || !termsChecked}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}
                    >
                      <CheckCircle2 size={17} />
                      <span>{onboardingLoading ? 'Đang xác nhận...' : 'Xác nhận & Tiếp tục'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleOnboardingChangePassword}>
                  <p style={{ fontSize: '0.88rem', color: 'var(--text-muted, #475569)', lineHeight: 1.55, marginTop: 0 }}>
                    Tài khoản của bạn đang sử dụng <strong>mật khẩu khởi tạo từ danh sách FAP</strong>. Vui lòng thiết lập mật khẩu cá nhân mới để bảo vệ tài khoản trong suốt kỳ học EXE.
                  </p>

                  <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label className="form-label" style={{ fontSize: '0.825rem', fontWeight: 600 }}>
                      Mật khẩu khởi tạo hiện tại *
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Lock size={16} style={{ position: 'absolute', left: 12, top: 12, color: '#94a3b8' }} />
                      <input
                        type={showOnboardingPasswords ? 'text' : 'password'}
                        className="form-control"
                        placeholder="Nhập mật khẩu khởi tạo trong email..."
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        disabled={onboardingLoading}
                        style={{ paddingLeft: '2.35rem', paddingRight: '2.5rem' }}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowOnboardingPasswords((v) => !v)}
                        aria-label={showOnboardingPasswords ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                        style={{
                          position: 'absolute',
                          right: 10,
                          top: 10,
                          background: 'transparent',
                          border: 'none',
                          color: '#64748b',
                          cursor: 'pointer',
                        }}
                      >
                        {showOnboardingPasswords ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', marginBottom: '1.25rem' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.825rem', fontWeight: 600 }}>
                        Mật khẩu mới *
                      </label>
                      <input
                        type={showOnboardingPasswords ? 'text' : 'password'}
                        className="form-control"
                        placeholder="Ít nhất 8 ký tự, chữ hoa, số, ký tự ĐB"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        disabled={onboardingLoading}
                        required
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.825rem', fontWeight: 600 }}>
                        Xác nhận mật khẩu mới *
                      </label>
                      <input
                        type={showOnboardingPasswords ? 'text' : 'password'}
                        className="form-control"
                        placeholder="Nhập lại mật khẩu mới"
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        disabled={onboardingLoading}
                        required
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' }}>
                    <button
                      type="button"
                      onClick={() => setDismissedPasswordStep(true)}
                      className="btn btn-secondary"
                      disabled={onboardingLoading}
                    >
                      Để sau (Đổi tại Hồ sơ cá nhân)
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={onboardingLoading}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}
                    >
                      <KeyRound size={16} />
                      <span>{onboardingLoading ? 'Đang lưu mật khẩu...' : 'Cập nhật mật khẩu mới'}</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
          <style>{`
            @keyframes onboardingPopIn {
              from { opacity: 0; transform: scale(0.96) translateY(6px); }
              to { opacity: 1; transform: scale(1) translateY(0); }
            }
          `}</style>
        </div>
      )}
    </div>
  );
};
