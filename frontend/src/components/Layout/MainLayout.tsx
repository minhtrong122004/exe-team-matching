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
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const userMenuRef = useRef<HTMLDivElement>(null);

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
          roles: ['Student', 'Lecturer', 'Admin'],
        },
        {
          to: '/groups',
          label: 'Khám phá nhóm',
          icon: <Compass size={19} />,
          roles: ['Student', 'Lecturer', 'Admin'],
        },
        {
          to: '/candidates',
          label: 'Danh bạ ứng viên',
          icon: <Users size={19} />,
          roles: ['Student', 'Lecturer', 'Admin'],
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
          roles: ['Student', 'Lecturer', 'Admin'],
        },
        {
          to: '/notifications',
          label: 'Thông báo',
          icon: <Bell size={19} />,
          roles: ['Student', 'Lecturer', 'Admin'],
        },
      ],
    },
    {
      title: 'Quản trị & Báo cáo',
      items: [
        {
          to: '/reports',
          label: 'Báo cáo ghép nhóm',
          icon: <FileText size={19} />,
          roles: ['Lecturer', 'Admin'],
        },
        {
          to: '/admin/accounts',
          label: 'Quản lý tài khoản',
          icon: <Shield size={19} />,
          roles: ['Admin'],
        },
      ],
    },
  ];

  const sidebarWidth = isCollapsed ? 76 : 255;

  // Extract avatar initials (SV: Sinh viên, GV: Giảng viên, AD: Admin)
  const getInitials = (role?: UserRole) => {
    if (role === 'Lecturer') return 'GV';
    if (role === 'Admin') return 'AD';
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
                      user?.role === 'Admin'
                        ? '#dc2626'
                        : user?.role === 'Lecturer'
                        ? '#0054a6'
                        : '#f26f21',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                  }}
                >
                  {getInitials(user?.role)}
                </div>

                {/* Name & ID/Role */}
                <div style={{ textAlign: 'left', lineHeight: 1.25 }}>
                  <div
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
                  <div style={{ fontSize: '0.725rem', color: 'var(--text-muted, #64748b)', fontWeight: 500 }}>
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
                          user?.role === 'Admin'
                            ? '#fef2f2'
                            : user?.role === 'Lecturer'
                            ? '#eef2ff'
                            : '#fff7ed',
                        color:
                          user?.role === 'Admin'
                            ? '#dc2626'
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

                  {/* Account Link - Accessible to Student, Lecturer & Admin */}
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
                            user?.role === 'Admin'
                              ? '#fef2f2'
                              : user?.role === 'Lecturer'
                              ? '#eff6ff'
                              : '#fff7ed',
                          color:
                            user?.role === 'Admin'
                              ? '#dc2626'
                              : user?.role === 'Lecturer'
                              ? '#2563eb'
                              : '#ea580c',
                        }}
                      >
                        {user?.role === 'Admin'
                          ? 'Quản trị viên'
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
    </div>
  );
};
