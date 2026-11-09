import React, { useState, useRef, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { FptEducationLogo } from '../FptEducationLogo';
import { notificationsApi } from '../../api/notifications';
import type { UserRole } from '../../types';
import {
  Lightbulb,
  Layers,
  Users,
  FileText,
  Bell,
  User,
  LogOut,
  Compass,
  UserPlus,
  Menu,
  ChevronDown,
  MapPin,
  Sparkles,
  Moon,
  Sun,
  CheckCircle2,
  AlertCircle,
  ArrowLeftRight,
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
  const { user, logout, acceptTerms } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Topbar Course Space Selector
  const [selectedSpace, setSelectedSpace] = useState<string>(() => {
    return localStorage.getItem('selectedCourseSpace') || 'exe101';
  });

  const handleSpaceChange = (newSpace: string) => {
    setSelectedSpace(newSpace);
    localStorage.setItem('selectedCourseSpace', newSpace);
    window.dispatchEvent(new CustomEvent('coursespace:changed', { detail: newSpace }));
  };

  // First-Login Onboarding State (Terms)
  const [termsChecked, setTermsChecked] = useState(false);
  const [onboardingLoading, setOnboardingLoading] = useState(false);
  const [onboardingError, setOnboardingError] = useState<string | null>(null);
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);

  const showOnboardingModal =
    !onboardingDismissed &&
    user?.role === 'Student' &&
    user.hasAcceptedTerms === false;

  const handleCompleteOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!termsChecked) {
      setOnboardingError('Vui lòng tích chọn đồng ý với quy định điều phối nhóm của nhà trường.');
      return;
    }
    setOnboardingError(null);
    setOnboardingLoading(true);

    try {
      await acceptTerms();
      setOnboardingDismissed(true);
    } catch (err: any) {
      setOnboardingError(err?.message || 'Có lỗi xảy ra khi xác nhận. Vui lòng thử lại.');
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
    document.documentElement.classList.toggle('dark', isDarkMode);
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

  // Extract avatar initials (SV: Sinh viên, ĐP: Điều phối viên, GV: Giảng viên)
  const getInitials = (role?: UserRole) => {
    if (role === 'Moderator') return 'ĐP';
    if (role === 'Lecturer') return 'GV';
    return 'SV';
  };

  // Role-specific navigation sections
  const getNavSectionsForRole = (role?: UserRole): NavSection[] => {
    if (role === 'Moderator') {
      return [
        {
          title: 'Điều phối & Học kỳ',
          items: [
            {
              to: '/moderator/spaces',
              label: 'Quản lý Học kỳ & Phòng',
              icon: <Layers size={19} />,
              roles: ['Moderator'],
            },
            {
              to: '/moderator/distribution',
              label: 'Điều phối Sinh viên lẻ',
              icon: <Users size={19} />,
              roles: ['Moderator'],
            },
            {
              to: '/moderator/transfers',
              label: 'Quản lý Chuyển nhóm',
              icon: <ArrowLeftRight size={19} />,
              roles: ['Moderator'],
            },
            {
              to: '/groups',
              label: 'Danh sách Phòng & Nhóm',
              icon: <Compass size={19} />,
              roles: ['Moderator'],
            },
            {
              to: '/reports',
              label: 'Tổng quan & Xuất báo cáo',
              icon: <FileText size={19} />,
              roles: ['Moderator'],
            },
          ],
        },
        {
          title: 'Hệ thống',
          items: [
            {
              to: '/profile',
              label: 'Hồ sơ cá nhân',
              icon: <User size={19} />,
              roles: ['Moderator'],
            },
            {
              to: '/notifications',
              label: 'Thông báo',
              icon: <Bell size={19} />,
              roles: ['Moderator'],
            },
          ],
        },
      ];
    }

    if (role === 'Lecturer') {
      return [
        {
          title: 'Giảng dạy & Cố vấn EXE',
          items: [
            {
              to: '/lecturer/dashboard',
              label: 'Tổng quan & Xuất báo cáo',
              icon: <FileText size={19} />,
              roles: ['Lecturer'],
            },
            {
              to: '/groups',
              label: 'Danh sách Phòng & Nhóm',
              icon: <Compass size={19} />,
              roles: ['Lecturer'],
            },
            {
              to: '/projects',
              label: 'Kho Đề tài dự kiến',
              icon: <Lightbulb size={19} />,
              roles: ['Lecturer'],
            },
          ],
        },
        {
          title: 'Hệ thống',
          items: [
            {
              to: '/profile',
              label: 'Hồ sơ cá nhân',
              icon: <User size={19} />,
              roles: ['Lecturer'],
            },
            {
              to: '/notifications',
              label: 'Thông báo',
              icon: <Bell size={19} />,
              roles: ['Lecturer'],
            },
          ],
        },
      ];
    }

    // Default for Student
    return [
      {
        title: 'Ghép đội & Học phần EXE',
        items: [
          {
            to: '/groups',
            label: 'Khám phá Phòng & Nhóm',
            icon: <Compass size={19} />,
            roles: ['Student'],
          },
          {
            to: '/my-group',
            label: 'Nhóm của tôi',
            icon: <Users size={19} />,
            roles: ['Student'],
          },
          {
            to: '/join-requests',
            label: 'Đơn ứng tuyển của tôi',
            icon: <UserPlus size={19} />,
            roles: ['Student'],
          },
        ],
      },
      {
        title: 'Khám phá & Đề tài',
        items: [
          {
            to: '/projects',
            label: 'Kho Đề tài dự kiến',
            icon: <Lightbulb size={19} />,
            roles: ['Student'],
          },
        ],
      },
      {
        title: 'Cá nhân',
        items: [
          {
            to: '/profile',
            label: 'Hồ sơ 5 Kỹ năng',
            icon: <User size={19} />,
            roles: ['Student'],
          },
          {
            to: '/notifications',
            label: 'Thông báo',
            icon: <Bell size={19} />,
            roles: ['Student'],
          },
        ],
      },
    ];
  };

  const navSections: NavSection[] = getNavSectionsForRole(user?.role);
  const sidebarWidth = isCollapsed ? 76 : 255;

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
                padding: '0.4rem 0.65rem',
                borderRadius: 8,
                background: 'var(--bg-sidebar-hover, #f8fafc)',
                border: '1px solid var(--border-light, #e2e8f0)',
                fontSize: '0.825rem',
                color: 'var(--text-main, #334155)',
                fontWeight: 600,
              }}
            >
              <MapPin size={15} color="#f26f21" />
              <span>TP. HCM</span>
            </div>

            {/* Course Space Selector */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.35rem 0.65rem',
                borderRadius: 8,
                backgroundColor: 'var(--bg-card, #FFFFFF)',
                border: '1px solid var(--border-medium, #CBD5E1)',
                boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
              }}
            >
              <Layers size={15} color="#F27024" />
              <select
                value={selectedSpace}
                onChange={(e) => handleSpaceChange(e.target.value)}
                aria-label="Course Space Selector"
                style={{
                  border: 'none',
                  backgroundColor: 'transparent',
                  fontSize: '0.825rem',
                  fontWeight: 600,
                  color: 'var(--text-main, #0F172A)',
                  outline: 'none',
                  cursor: 'pointer',
                  maxWidth: '380px',
                }}
              >
                <option value="exe101">Học kỳ Fall 2026 • Môn EXE101 (Đang mở đăng ký)</option>
                <option value="exe201">Học kỳ Fall 2026 • Môn EXE201 (Đang mở đăng ký)</option>
                <option value="exe201-unauthorized">Học kỳ Fall 2026 • Môn EXE201 (Mô phỏng: Chưa có trong danh sách FAP)</option>
              </select>
            </div>
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
                        ? '#0054a6'
                        : user?.role === 'Lecturer'
                        ? '#008837'
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
                    {user?.role === 'Moderator'
                      ? 'Điều phối viên'
                      : user?.role === 'Lecturer'
                      ? 'Giảng viên'
                      : user?.studentCode || 'Sinh viên'}
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
            PAGE CONTENT (Handles FAP Eligibility Check)
           ══════════════════════════════════════════════════════════════ */}
        <main style={{ flex: 1, padding: '2rem' }}>
          {selectedSpace === 'exe201-unauthorized' ? (
            <div
              style={{
                maxWidth: 580,
                margin: '48px auto',
                padding: '36px 32px',
                borderRadius: 16,
                border: '1px solid var(--border-light, #E2E8F0)',
                backgroundColor: 'var(--bg-card, #FFFFFF)',
                textAlign: 'center',
                boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #FEE2E2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                }}
              >
                <AlertCircle size={30} color="#DC2626" />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', marginBottom: '8px' }}>
                Chưa đủ điều kiện tham gia học phần
              </h3>
              <p style={{ fontSize: '14px', color: '#64748B', lineHeight: 1.6, marginBottom: '24px' }}>
                Tài khoản của bạn hiện chưa có trong danh sách đủ điều kiện học môn này từ hệ thống FAP. Vui lòng liên hệ bộ phận Điều phối (Moderator) để được kiểm tra.
              </p>
              <button
                type="button"
                onClick={() => handleSpaceChange('exe101')}
                style={{
                  padding: '10px 24px',
                  borderRadius: 10,
                  backgroundColor: '#F27024',
                  color: '#FFFFFF',
                  border: 'none',
                  fontWeight: 600,
                  fontSize: '14px',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(242, 112, 36, 0.25)',
                }}
              >
                Quay lại Không gian Hợp lệ
              </button>
            </div>
          ) : (
            <Outlet />
          )}
        </main>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          FIRST-LOGIN ONBOARDING MODAL (TERMS)
         ══════════════════════════════════════════════════════════════ */}
      {showOnboardingModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="onboarding-modal-title"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '1.25rem',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 580,
              padding: 0,
              overflow: 'hidden',
              border: '1px solid var(--border-light, #E2E8F0)',
              borderRadius: '20px',
              backgroundColor: 'var(--bg-card, #FFFFFF)',
              boxShadow: '0 20px 45px rgba(0, 0, 0, 0.15)',
              animation: 'onboardingPopIn 220ms cubic-bezier(0.23, 1, 0.32, 1)',
            }}
          >
            {/* Modal Header: Clean White Header with 1px border */}
            <div
              style={{
                backgroundColor: 'var(--bg-card, #FFFFFF)',
                color: 'var(--text-main, #0F172A)',
                padding: '1.25rem 1.75rem',
                borderBottom: '1px solid var(--border-subtle, #F1F5F9)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <h2
                  id="onboarding-modal-title"
                  style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: 'var(--text-main, #0F172A)' }}
                >
                  Xác nhận Quy định Ghép nhóm & Điều phối
                </h2>
                <p style={{ margin: '0.35rem 0 0', fontSize: '13px', color: 'var(--text-muted, #64748B)' }}>
                  Sinh viên: <strong style={{ color: 'var(--text-main, #0F172A)' }}>{user?.fullName}</strong>
                  {user?.studentCode ? ` • MSSV: ${user.studentCode}` : ''}
                </p>
              </div>
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
                    backgroundColor: '#FEF2F2',
                    border: '1px solid #FECACA',
                    color: '#991B1B',
                    fontSize: '0.85rem',
                    marginBottom: '1.25rem',
                  }}
                >
                  <AlertCircle size={17} style={{ flexShrink: 0, color: '#DC2626' }} />
                  <span>{onboardingError}</span>
                </div>
              )}

              <form onSubmit={handleCompleteOnboarding}>
                <div
                  style={{
                    backgroundColor: 'var(--bg-subtle, #F8FAFC)',
                    border: '1px solid var(--border-light, #E2E8F0)',
                    borderRadius: 12,
                    padding: '16px',
                    marginBottom: '18px',
                  }}
                >
                  <p style={{ fontSize: '13px', color: 'var(--text-main, #0F172A)', lineHeight: 1.55, marginTop: 0 }}>
                    Chào mừng bạn đến với hệ thống ghép nhóm học phần <strong>Experiential Entrepreneurship (EXE)</strong>. Trước khi tham gia phòng ghép nhóm, vui lòng đọc và xác nhận các nguyên tắc vận hành:
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: 'var(--text-secondary, #334155)', marginBottom: '14px' }}>
                    <div>
                      <strong>1. Vào phòng và lập nhóm:</strong> Phòng dưới ngưỡng thì sinh viên vào thẳng, người đầu tiên làm Nhóm trưởng. Khi đạt ngưỡng (hơn 50% sĩ số), phòng chuyển sang chế độ tuyển và chỉ nhận thêm qua đơn ứng tuyển.
                    </div>
                    <div>
                      <strong>2. Duyệt đơn:</strong> Thành viên bỏ phiếu trên từng đơn để tham khảo ý kiến, Nhóm trưởng quyết định nhận hoặc từ chối.
                    </div>
                    <div>
                      <strong>3. Quyền điều phối:</strong> Điều phối viên (Moderator) có quyền điều phối sinh viên vào các nhóm khi nhóm chưa đủ số lượng tối đa hoặc sau khi hết thời hạn đăng ký tự nguyện.
                    </div>
                  </div>

                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '8px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: 'var(--text-main, #0F172A)',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={termsChecked}
                      onChange={(e) => {
                        setTermsChecked(e.target.checked);
                        if (e.target.checked) setOnboardingError(null);
                      }}
                      style={{ marginTop: 2, width: 16, height: 16, accentColor: '#F27024' }}
                    />
                    <span>
                      Tôi đã đọc hiểu và đồng ý với quy định ghép nhóm cũng như quyền điều phối của nhà trường.
                    </span>
                  </label>
                </div>

                {/* Footer Modal: Actions */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '10px' }}>
                  <button
                    type="submit"
                    disabled={onboardingLoading || !termsChecked}
                    style={{
                      padding: '9px 20px',
                      borderRadius: 10,
                      backgroundColor: termsChecked ? '#F27024' : '#CBD5E1',
                      border: 'none',
                      color: '#FFFFFF',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: termsChecked ? 'pointer' : 'not-allowed',
                      boxShadow: termsChecked ? '0 2px 8px rgba(242, 112, 36, 0.25)' : 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <CheckCircle2 size={16} />
                    <span>{onboardingLoading ? 'Đang hoàn tất...' : 'Hoàn tất & Vào không gian học tập'}</span>
                  </button>
                </div>
              </form>
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
