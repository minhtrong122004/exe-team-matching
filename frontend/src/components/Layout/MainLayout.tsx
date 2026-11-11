import React, { useState, useRef, useEffect, useCallback } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { FptEducationLogo } from '../FptEducationLogo';
import {
  AppearanceCustomizerModal,
  UserAvatarBubble,
  loadAppearanceSettings,
  saveAppearanceSettings,
  applyAccentCssVariables,
  getAccentOption,
  type AppearanceSettings,
} from './AppearanceCustomizerModal';
import { notificationsApi } from '../../api/notifications';
import { useSelectedSpace, selectSpace } from '../../hooks/useSelectedSpace';
import { SPACE_PHASE, SPACE_STATUS_LABEL, spaceLabel } from '../../api/workspace';
import type { UserRole, NotificationResponse } from '../../types';
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
  Sparkles,
  Moon,
  Sun,
  CheckCircle2,
  AlertCircle,
  ArrowLeftRight,
  CheckCheck,
  Check,
  Mail,
  X,
} from '../../utils/icons';

interface NavSection {
  title: string;
  items: {
    to: string;
    label: string;
    icon: React.ReactNode;
    roles: UserRole[];
  }[];
}

const getNotificationTypeConfig = (type: string) => {
  switch (type) {
    case 'GROUP_ACCEPTED':
      return {
        label: 'Đã duyệt vào nhóm',
        icon: CheckCircle2,
        color: '#16A34A',
        bg: '#DCFCE7',
        border: '#BBF7D0',
      };
    case 'GROUP_REQUEST':
    case 'GROUP_INVITE':
      return {
        label: 'Đơn ứng tuyển mới',
        icon: Mail,
        color: '#EA580C',
        bg: '#FFEDD5',
        border: '#FED7AA',
      };
    case 'ELECTION_OPEN':
    case 'MATCHING_FOUND':
      return {
        label: 'Biểu quyết nội bộ',
        icon: Sparkles,
        color: '#7C3AED',
        bg: '#EDE9FE',
        border: '#DDD6FE',
      };
    case 'SYSTEM_ACCOUNT':
    case 'SYSTEM':
    default:
      return {
        label: 'Thông báo học vụ',
        icon: Bell,
        color: '#0054A6',
        bg: '#EFF6FF',
        border: '#BFDBFE',
      };
  }
};

export const MainLayout: React.FC = () => {
  const { user, logout, acceptTerms } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [spaceMenuOpen, setSpaceMenuOpen] = useState(false);
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const [appearance, setAppearance] = useState<AppearanceSettings>(() => loadAppearanceSettings());
  const [notifFilter, setNotifFilter] = useState<'all' | 'unread'>('all');
  const [notifItems, setNotifItems] = useState<NotificationResponse[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  const userMenuRef = useRef<HTMLDivElement>(null);
  const notifMenuRef = useRef<HTMLDivElement>(null);
  const spaceMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    applyAccentCssVariables(appearance.accentId);
    saveAppearanceSettings(appearance);
  }, [appearance]);

  const activeAccent = getAccentOption(appearance.accentId);

  // Thông báo thật từ Notification Service; lỗi thì để trống (không hiện dữ liệu mẫu).
  const loadNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const [pagedRes, unreadRes] = await Promise.all([
        notificationsApi.getMyNotifications({ page: 1, pageSize: 12 }),
        notificationsApi.getUnreadCount(),
      ]);
      const items = pagedRes.items ?? [];
      setNotifItems(items);
      setUnreadCount(unreadRes.unreadCount ?? items.filter((n) => !n.isRead).length);
    } catch {
      setNotifItems([]);
      setUnreadCount(0);
    }
  }, [user]);

  useEffect(() => {
    void loadNotifications();
    const handler = () => void loadNotifications();
    window.addEventListener('notifications:updated', handler);
    // Làm mới định kỳ để thấy thông báo mới do event Redis Streams tạo ra.
    const timer = window.setInterval(handler, 30000);
    return () => {
      window.removeEventListener('notifications:updated', handler);
      window.clearInterval(timer);
    };
  }, [loadNotifications]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationsApi.markAsRead(id);
      setNotifItems((prev) => {
        const updated = prev.map((n) => (n.id === id ? { ...n, isRead: true } : n));
        setUnreadCount(updated.filter((n) => !n.isRead).length);
        return updated;
      });
    } catch {
      void loadNotifications();
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      setNotifItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      void loadNotifications();
    }
  };

  const displayedNotifs = notifFilter === 'unread' ? notifItems.filter((n) => !n.isRead) : notifItems;

  // Không gian môn học đang chọn (dữ liệu thật từ Group Service)
  const { spaces, space: currentSpace } = useSelectedSpace();
  const spacePhase = currentSpace ? SPACE_PHASE[currentSpace.status] : 0;
  const spaceStatusLabel = currentSpace ? SPACE_STATUS_LABEL[currentSpace.status] : 'Chưa có không gian môn học';
  const spaceDot = (status?: string) =>
    status === 'Open' ? '#10B981' : status === 'ClosedRegistration' ? '#F59E0B' : status === 'Locked' ? '#64748B' : '#94A3B8';

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

  // Close user, notification & course space dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
      if (notifMenuRef.current && !notifMenuRef.current.contains(event.target as Node)) {
        setNotifOpen(false);
      }
      if (spaceMenuRef.current && !spaceMenuRef.current.contains(event.target as Node)) {
        setSpaceMenuOpen(false);
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
              icon: <Layers size={20} />,
              roles: ['Moderator'],
            },
            {
              to: '/moderator/distribution',
              label: 'Điều phối Sinh viên lẻ',
              icon: <Users size={20} />,
              roles: ['Moderator'],
            },
            {
              to: '/moderator/transfers',
              label: 'Quản lý Chuyển nhóm',
              icon: <ArrowLeftRight size={20} />,
              roles: ['Moderator'],
            },
            {
              to: '/groups',
              label: 'Danh sách Phòng & Nhóm',
              icon: <Compass size={20} />,
              roles: ['Moderator'],
            },
            {
              to: '/lecturer/dashboard',
              label: 'Danh sách nhóm & Xuất CSV',
              icon: <FileText size={20} />,
              roles: ['Moderator'],
            },
            {
              to: '/reports',
              label: 'Báo cáo thống kê',
              icon: <Sparkles size={20} />,
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
              icon: <User size={20} />,
              roles: ['Moderator'],
            },
            {
              to: '/notifications',
              label: 'Thông báo',
              icon: <Bell size={20} />,
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
              icon: <FileText size={20} />,
              roles: ['Lecturer'],
            },
            {
              to: '/reports',
              label: 'Báo cáo thống kê',
              icon: <Sparkles size={20} />,
              roles: ['Lecturer'],
            },
            {
              to: '/groups',
              label: 'Danh sách Phòng & Nhóm',
              icon: <Compass size={20} />,
              roles: ['Lecturer'],
            },
            {
              to: '/projects',
              label: 'Kho Đề tài dự kiến',
              icon: <Lightbulb size={20} />,
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
              icon: <User size={20} />,
              roles: ['Lecturer'],
            },
            {
              to: '/notifications',
              label: 'Thông báo',
              icon: <Bell size={20} />,
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
            icon: <Compass size={20} />,
            roles: ['Student'],
          },
          {
            to: '/my-group',
            label: 'Nhóm của tôi',
            icon: <Users size={20} />,
            roles: ['Student'],
          },
          {
            to: '/join-requests',
            label: 'Đơn ứng tuyển của tôi',
            icon: <UserPlus size={20} />,
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
            icon: <Lightbulb size={20} />,
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
            icon: <User size={20} />,
            roles: ['Student'],
          },
          {
            to: '/notifications',
            label: 'Thông báo',
            icon: <Bell size={20} />,
            roles: ['Student'],
          },
        ],
      },
    ];
  };

  const navSections: NavSection[] = getNavSectionsForRole(user?.role);
  const sidebarWidth = isCollapsed ? 76 : 272;

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
          SIDEBAR: Linear / Vercel / Cal.com Inspired Precision Layout
         ══════════════════════════════════════════════════════════════ */}
      <aside
        className="motion-sidebar-shell"
        style={{
          width: sidebarWidth,
          background: 'var(--bg-sidebar, #ffffff)',
          color: 'var(--text-main, #0f172a)',
          display: 'flex',
          flexDirection: 'column',
          position: 'fixed',
          top: 0,
          bottom: 0,
          left: 0,
          zIndex: 50,
          borderRight: '1px solid var(--border-light, #e2e8f0)',
          boxShadow: isDarkMode ? '4px 0 20px rgba(0, 0, 0, 0.25)' : '1px 0 0 rgba(15, 23, 42, 0.02)',
          overflowX: isCollapsed ? 'visible' : 'hidden',
        }}
      >
        {/* Unified Brand & Academic Workspace Header (Logo + Semester Context integrated as one cohesive block) */}
        <div
          style={{
            padding: isCollapsed ? '14px 8px' : '16px 12px 14px 12px',
            borderBottom: '1px solid var(--border-subtle, #f1f5f9)',
            display: 'flex',
            flexDirection: 'column',
            gap: isCollapsed ? '10px' : '12px',
            boxSizing: 'border-box',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: isCollapsed ? 'center' : 'space-between',
              padding: isCollapsed ? '0' : '0 4px',
              minHeight: 34,
            }}
          >
            <FptEducationLogo compact={isCollapsed} />
            {!isCollapsed && (
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 500,
                  color: 'var(--text-muted, #64748B)',
                  backgroundColor: isDarkMode ? 'rgba(30, 41, 59, 0.7)' : '#F1F5F9',
                  padding: '2px 7px',
                  borderRadius: 6,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {currentSpace?.semesterCode ?? '—'}
              </span>
            )}
          </div>

          {!isCollapsed ? (
            <div
              onClick={() => {
                setSpaceMenuOpen(true);
              }}
              title="Nhấn để chuyển không gian học phần EXE"
              style={{
                padding: '9px 11px',
                borderRadius: 9,
                backgroundColor: isDarkMode ? 'rgba(30, 41, 59, 0.5)' : '#F8FAFC',
                border: `1px solid ${isDarkMode ? '#334155' : '#EEF2F6'}`,
                cursor: 'pointer',
                transition: 'all 165ms cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                <div
                  style={{
                    fontSize: '13.5px',
                    fontWeight: 600,
                    color: 'var(--text-main, #0F172A)',
                    letterSpacing: '-0.01em',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {currentSpace ? spaceLabel(currentSpace) : 'Chưa chọn môn học'}
                </div>
                <ChevronDown size={14} color="var(--text-light, #94A3B8)" style={{ flexShrink: 0 }} />
              </div>

              {currentSpace && (<>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: '6px',
                  fontSize: '12px',
                  fontWeight: 450,
                  color: 'var(--text-muted, #64748B)',
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      backgroundColor: spaceDot(currentSpace?.status),
                      flexShrink: 0,
                    }}
                  />
                  <span>{spaceStatusLabel}</span>
                </span>
                <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 400, color: 'var(--text-light, #94A3B8)' }}>
                  {spacePhase} / 4
                </span>
              </div>

              {/* Standardized Progress Bar */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '4px',
                  marginTop: '7px',
                }}
              >
                {[1, 2, 3, 4].map((step) => (
                  <div
                    key={step}
                    className="motion-progress-fill"
                    style={{
                      height: 3.5,
                      borderRadius: 999,
                      backgroundColor:
                        step <= spacePhase
                          ? 'var(--status-progress, #7C3AED)'
                          : isDarkMode
                          ? '#334155'
                          : '#E2E8F0',
                    }}
                  />
                ))}
              </div>
              </>)}
            </div>
          ) : (
            <div
              onClick={() => setSpaceMenuOpen(true)}
              data-sidebar-tooltip={currentSpace ? `${spaceLabel(currentSpace)} • ${currentSpace.semesterCode} (${spaceStatusLabel})` : 'Chưa chọn môn học'}
              style={{
                width: 36,
                height: 36,
                margin: '0 auto',
                borderRadius: 8,
                backgroundColor: isDarkMode ? '#1E293B' : '#F8FAFC',
                border: `1px solid ${isDarkMode ? '#334155' : '#E2E8F0'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--text-main, #0F172A)',
                cursor: 'pointer',
              }}
            >
              {currentSpace ? currentSpace.subjectCode.slice(-3) : '—'}
            </div>
          )}
        </div>

        {/* Grouped Navigation — Standardized Spacing & Subtle Pill Active State (Attio / Zainstudio style) */}
        <nav
          style={{
            padding: isCollapsed ? '14px 8px' : '14px 10px',
            flex: 1,
            overflowY: isCollapsed ? 'visible' : 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          {navSections.map((section) => {
            const visibleItems = section.items.filter((item) =>
              user ? item.roles.includes(user.role) : false
            );
            if (visibleItems.length === 0) return null;

            return (
              <div key={section.title}>
                {!isCollapsed && (
                  <div
                    style={{
                      fontSize: '12px',
                      color: 'var(--text-light, #94a3b8)',
                      fontWeight: 500,
                      padding: '0 10px 6px 10px',
                      letterSpacing: '-0.005em',
                    }}
                  >
                    {section.title}
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  {visibleItems.map((item) => {
                    const isNotifItem = item.to === '/notifications';
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        className={({ isActive }) => {
                          const activeState = isNotifItem ? notifOpen : isActive && !notifOpen;
                          return `motion-sidebar-link${activeState ? ' is-active-nav' : ''}`;
                        }}
                        data-sidebar-tooltip={isCollapsed ? item.label : undefined}
                        onClick={(e) => {
                          if (isNotifItem) {
                            e.preventDefault();
                            setSidebarOpen(false);
                            setNotifOpen((prev) => !prev);
                          } else {
                            setSidebarOpen(false);
                            setNotifOpen(false);
                          }
                        }}
                        style={({ isActive }) => {
                          const activeState = isNotifItem ? notifOpen : isActive && !notifOpen;
                          return {
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: isCollapsed ? 'center' : 'space-between',
                            gap: isCollapsed ? 0 : '10px',
                            padding: isCollapsed ? '8px 0' : '8px 10px',
                            minHeight: 38,
                            borderRadius: 8,
                            fontSize: '14px',
                            letterSpacing: '-0.01em',
                            fontWeight: activeState ? 550 : 450,
                            color: activeState
                              ? isDarkMode
                                ? '#FFFFFF'
                                : '#0F172A'
                              : 'var(--text-muted, #475569)',
                            background: activeState
                              ? isDarkMode
                                ? 'rgba(255, 255, 255, 0.08)'
                                : '#F1F5F9'
                              : 'transparent',
                            textDecoration: 'none',
                            outline: 'none',
                            border: 'none',
                          };
                        }}
                        onMouseEnter={(e) => {
                          const isCurrentActive = e.currentTarget.getAttribute('aria-current') === 'page' && !notifOpen;
                          const activeState = isNotifItem ? notifOpen : isCurrentActive;
                          if (!activeState) {
                            e.currentTarget.style.background = isDarkMode ? 'rgba(30, 41, 59, 0.45)' : '#F8FAFC';
                            e.currentTarget.style.color = isDarkMode ? '#F8FAFC' : '#0F172A';
                          }
                        }}
                        onMouseLeave={(e) => {
                          const isCurrentActive = e.currentTarget.getAttribute('aria-current') === 'page' && !notifOpen;
                          const activeState = isNotifItem ? notifOpen : isCurrentActive;
                          if (!activeState) {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = 'var(--text-muted, #475569)';
                          }
                        }}
                      >
                        {({ isActive }) => {
                          const activeState = isNotifItem ? notifOpen : isActive && !notifOpen;
                          return (
                            <>
                              <div style={{ display: 'flex', alignItems: 'center', gap: isCollapsed ? 0 : '10px', minWidth: 0 }}>
                                <div
                                  className="motion-sidebar-icon"
                                  style={{
                                    position: 'relative',
                                    width: 18,
                                    height: 18,
                                    flexShrink: 0,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: activeState ? 'var(--accent-color, #F26F21)' : 'var(--text-light, #64748B)',
                                  }}
                                >
                                  {item.icon}
                                  {isCollapsed && isNotifItem && unreadCount > 0 && (
                                    <span
                                      style={{
                                        position: 'absolute',
                                        top: -5,
                                        right: -6,
                                        minWidth: 15,
                                        height: 15,
                                        padding: '0 3.5px',
                                        borderRadius: 999,
                                        background: 'var(--accent-color, #F26F21)',
                                        color: '#FFFFFF',
                                        fontSize: '10px',
                                        fontWeight: 600,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        boxShadow: `0 0 0 2px ${isDarkMode ? '#0b1120' : '#ffffff'}`,
                                        fontVariantNumeric: 'tabular-nums',
                                      }}
                                    >
                                      {unreadCount > 99 ? '99+' : unreadCount}
                                    </span>
                                  )}
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
                              </div>
                              {!isCollapsed && isNotifItem && unreadCount > 0 && (
                                <span
                                  style={{
                                    minWidth: 18,
                                    height: 18,
                                    padding: '0 5.5px',
                                    borderRadius: 999,
                                    background: 'var(--accent-color, #F26F21)',
                                    color: '#FFFFFF',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontVariantNumeric: 'tabular-nums',
                                    boxShadow: '0 1px 2px rgba(15, 23, 42, 0.08)',
                                  }}
                                >
                                  {unreadCount > 99 ? '99+' : unreadCount}
                                </span>
                              )}
                            </>
                          );
                        }}
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Cohesive Bottom Utility Row (Integrated into Sidebar padding like Attio "... All lists" pill) */}
        <div
          style={{
            padding: isCollapsed ? '8px' : '6px 10px 14px 10px',
          }}
        >
          <button
            type="button"
            onClick={() => setAppearanceOpen(true)}
            data-sidebar-tooltip={isCollapsed ? 'Tùy chỉnh giao diện' : undefined}
            title={!isCollapsed ? 'Tùy chỉnh giao diện cá nhân' : undefined}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: isCollapsed ? 'center' : 'space-between',
              gap: '8px',
              padding: isCollapsed ? '8px 0' : '8px 10px',
              borderRadius: 8,
              backgroundColor: isDarkMode ? 'rgba(30, 41, 59, 0.45)' : '#F8FAFC',
              border: 'none',
              color: 'var(--text-muted, #475569)',
              fontSize: '12.5px',
              fontWeight: 450,
              cursor: 'pointer',
              transition: 'background-color 150ms ease, transform 120ms ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = isDarkMode ? 'rgba(30, 41, 59, 0.75)' : '#F1F5F9';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = isDarkMode ? 'rgba(30, 41, 59, 0.45)' : '#F8FAFC';
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: '50%',
                  background: 'var(--accent-gradient, #F26F21)',
                  flexShrink: 0,
                }}
              />
              {!isCollapsed && <span>Tùy chỉnh giao diện</span>}
            </span>
            {!isCollapsed && (
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 450,
                  color: 'var(--text-light, #94A3B8)',
                }}
              >
                {user?.campus ?? ''}
              </span>
            )}
          </button>
        </div>
      </aside>

      {/* ══════════════════════════════════════════════════════════════
          MAIN CONTENT AREA
         ══════════════════════════════════════════════════════════════ */}
      <div
        className="motion-main-content-shell"
        style={{
          flex: 1,
          marginLeft: sidebarWidth,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* ══════════════════════════════════════════════════════════════
            TOPBAR — Visual Hierarchy: Context first → Utilities → User last
           ══════════════════════════════════════════════════════════════ */}
        <header
          style={{
            height: 64,
            background: 'var(--bg-header, #ffffff)',
            borderBottom: '1px solid var(--border-subtle, #f1f5f9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 2rem',
            position: 'sticky',
            top: 0,
            zIndex: 30,
            transition: 'background-color 200ms ease, border-color 200ms ease',
          }}
        >
          {/* 1. CONTEXT FIRST: Ghost Sidebar Toggle + Unified Semester/Subject Switcher */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              className="motion-topbar-btn"
              onClick={() => setIsCollapsed(!isCollapsed)}
              title={isCollapsed ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên'}
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted, #64748B)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <Menu size={18} />
            </button>

            <div
              style={{
                width: 1,
                height: 18,
                backgroundColor: 'var(--border-light, #E2E8F0)',
                margin: '0 0.25rem',
              }}
            />

            {/* Unified Semester / Subject Switcher */}
            <div style={{ position: 'relative' }} ref={spaceMenuRef}>
              <button
                type="button"
                className="motion-topbar-btn"
                onClick={() => {
                  setSpaceMenuOpen((prev) => !prev);
                  setNotifOpen(false);
                  setUserMenuOpen(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.55rem',
                  padding: '6px 10px',
                  height: 36,
                  borderRadius: 8,
                  backgroundColor: spaceMenuOpen
                    ? isDarkMode
                      ? '#1E293B'
                      : '#F8FAFC'
                    : 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                <span
                  style={{
                    fontSize: '13.5px',
                    fontWeight: 500,
                    color: 'var(--text-muted, #64748B)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {currentSpace?.semesterCode ?? 'Học kỳ'}
                </span>
                <span style={{ color: 'var(--text-light, #CBD5E1)', fontSize: '13px' }}>/</span>
                <span
                  style={{
                    fontSize: '13.5px',
                    fontWeight: 600,
                    color: 'var(--text-main, #0F172A)',
                    whiteSpace: 'nowrap',
                    letterSpacing: '-0.01em',
                  }}
                >
                  {currentSpace ? spaceLabel(currentSpace) : 'Chưa chọn môn học'}
                </span>

                {/* Subtle status dot */}
                {currentSpace && <span
                  title={spaceStatusLabel}
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    backgroundColor: spaceDot(currentSpace?.status),
                    flexShrink: 0,
                  }}
                />}

                <ChevronDown
                  size={14}
                  color="var(--text-light, #64748B)"
                  style={{
                    transform: spaceMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 180ms cubic-bezier(0.22, 1, 0.36, 1)',
                  }}
                />
              </button>

              {spaceMenuOpen && (
                <div
                  className="motion-dropdown-menu-left"
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    left: 0,
                    width: 450,
                    maxWidth: '92vw',
                    backgroundColor: 'var(--bg-card, #FFFFFF)',
                    border: '1px solid var(--border-light, #E2E8F0)',
                    borderRadius: 14,
                    padding: '8px',
                    boxShadow:
                      '0 20px 40px -10px rgba(15, 23, 42, 0.15), 0 4px 12px -2px rgba(15, 23, 42, 0.06)',
                    zIndex: 65,
                  }}
                >
                  <div
                    style={{
                      padding: '6px 10px 6px 10px',
                      fontSize: '11px',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      color: '#94A3B8',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span>Chuyển học kỳ & môn học</span>
                    <span>{spaces.length} không gian</span>
                  </div>

                  {spaces.length === 0 && (
                    <div style={{ padding: '12px 10px', fontSize: '13px', color: '#64748B' }}>
                      {user?.role === 'Student'
                        ? 'Bạn chưa có tên trong danh sách FAP của môn học nào.'
                        : 'Chưa có không gian môn học nào.'}
                    </div>
                  )}

                  {spaces.map((s) => ({
                    value: s.id,
                    code: s.subjectCode.slice(-3),
                    title: spaceLabel(s),
                    subtitle: `Học kỳ ${s.semesterCode} • ${s.totalStudents} SV • ${s.totalRooms} phòng`,
                    badge: SPACE_STATUS_LABEL[s.status],
                    dotColor: spaceDot(s.status),
                  })).map((opt) => {
                    const isSelected = currentSpace?.id === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        className="motion-dropdown-item"
                        onClick={() => {
                          selectSpace(opt.value);
                          setSpaceMenuOpen(false);
                        }}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '12px',
                          padding: '10px',
                          borderRadius: 10,
                          border: isSelected ? '1px solid #E2E8F0' : '1px solid transparent',
                          backgroundColor: isSelected ? '#F8FAFC' : 'transparent',
                          cursor: 'pointer',
                          textAlign: 'left',
                          marginBottom: '2px',
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) e.currentTarget.style.backgroundColor = '#F8FAFC';
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '11px', minWidth: 0 }}>
                          <div
                            style={{
                              width: 34,
                              height: 34,
                              borderRadius: 8,
                              background: isSelected
                                ? 'var(--accent-gradient, linear-gradient(135deg, #f26f21 0%, #ea580c 100%))'
                                : '#F1F5F9',
                              color: isSelected ? '#FFFFFF' : '#334155',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '12px',
                              fontWeight: 600,
                              flexShrink: 0,
                              fontVariantNumeric: 'tabular-nums',
                            }}
                          >
                            {opt.code}
                          </div>

                          <div style={{ minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                              <span
                                style={{
                                  fontSize: '13.5px',
                                  fontWeight: 600,
                                  color: '#0F172A',
                                  letterSpacing: '-0.01em',
                                }}
                              >
                                {opt.title}
                              </span>
                            </div>
                            <div
                              style={{
                                fontSize: '12px',
                                color: '#64748B',
                                marginTop: '3px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                              }}
                            >
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontWeight: 500,
                                  color: '#334155',
                                }}
                              >
                                <span
                                  style={{
                                    width: 6,
                                    height: 6,
                                    borderRadius: '50%',
                                    backgroundColor: opt.dotColor,
                                  }}
                                />
                                {opt.badge}
                              </span>
                              <span>•</span>
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {opt.subtitle}
                              </span>
                            </div>
                          </div>
                        </div>

                        {isSelected && (
                          <span
                            style={{
                              width: 20,
                              height: 20,
                              borderRadius: 999,
                              backgroundColor: 'var(--accent-color, #F26F21)',
                              color: '#FFFFFF',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            <Check size={12} />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* 2. UTILITIES SECOND → 3. USER LAST: Simple icon buttons + Clean User Profile */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            {/* Theme Toggle: Simple Ghost Icon Button */}
            <button
              className="motion-topbar-btn motion-theme-btn"
              onClick={toggleTheme}
              title={isDarkMode ? 'Chuyển sang chế độ Sáng (Light Mode)' : 'Chuyển sang chế độ Tối (Dark Mode)'}
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: 'transparent',
                border: 'none',
                color: isDarkMode ? '#fbbf24' : 'var(--text-muted, #64748B)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* Notification Bell: Simple Ghost Icon Button + Badge */}
            <div style={{ position: 'relative' }} ref={notifMenuRef}>
              <button
                type="button"
                className="motion-topbar-btn motion-bell-btn"
                onClick={() => {
                  setNotifOpen((prev) => !prev);
                  setUserMenuOpen(false);
                }}
                title={`Thông báo hệ thống (${unreadCount} chưa đọc)`}
                style={{
                  position: 'relative',
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: notifOpen ? (isDarkMode ? '#1E293B' : '#F1F5F9') : 'transparent',
                  border: 'none',
                  color: notifOpen
                    ? 'var(--accent-color, #F26F21)'
                    : 'var(--text-muted, #64748B)',
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
                      top: 4,
                      right: 4,
                      minWidth: 15,
                      height: 15,
                      padding: '0 3.5px',
                      borderRadius: 999,
                      background: 'var(--accent-color, #F26F21)',
                      color: '#ffffff',
                      fontSize: '10px',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: `0 0 0 2px ${isDarkMode ? '#0f172a' : '#ffffff'}`,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Popover Dropdown */}
              {notifOpen && (
                <div
                  className="motion-dropdown-menu"
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 10px)',
                    right: 0,
                    width: 420,
                    backgroundColor: 'var(--bg-card, #FFFFFF)',
                    borderRadius: 16,
                    border: '1px solid var(--border-light, #E2E8F0)',
                    boxShadow: '0 20px 45px -10px rgba(15, 23, 42, 0.16), 0 4px 12px rgba(15, 23, 42, 0.06)',
                    zIndex: 120,
                    overflow: 'hidden',
                  }}
                >
                  {/* Header */}
                  <div
                    style={{
                      padding: '15px 18px 12px 18px',
                      borderBottom: '1px solid var(--border-subtle, #F1F5F9)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-main, #0F172A)', margin: 0, letterSpacing: '-0.01em' }}>
                          Thông báo
                        </h3>
                        {unreadCount > 0 && (
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 600,
                              padding: '2px 7px',
                              borderRadius: 999,
                              backgroundColor: 'var(--accent-soft, rgba(242, 111, 33, 0.12))',
                              color: 'var(--accent-color, #F26F21)',
                              fontVariantNumeric: 'tabular-nums',
                            }}
                          >
                            {unreadCount} mới
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {unreadCount > 0 && (
                          <button
                            type="button"
                            onClick={() => void handleMarkAllAsRead()}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              padding: '4px 8px',
                              borderRadius: 6,
                              backgroundColor: 'transparent',
                              border: 'none',
                              fontSize: '12px',
                              fontWeight: 500,
                              color: 'var(--accent-color, #F26F21)',
                              cursor: 'pointer',
                            }}
                          >
                            <CheckCheck size={13} />
                            <span>Đánh dấu đã đọc</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setNotifOpen(false)}
                          style={{
                            width: 26,
                            height: 26,
                            borderRadius: 6,
                            border: 'none',
                            background: 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#64748B',
                            cursor: 'pointer',
                          }}
                          title="Đóng"
                        >
                          <X size={15} />
                        </button>
                      </div>
                    </div>

                    {/* Filter Tabs */}
                    <div
                      style={{
                        display: 'inline-flex',
                        gap: '4px',
                        padding: '3px',
                        borderRadius: 8,
                        backgroundColor: '#F1F5F9',
                      }}
                    >
                      <button
                        type="button"
                        className={`motion-tab-pill${notifFilter === 'all' ? ' is-active-tab' : ''}`}
                        onClick={() => setNotifFilter('all')}
                        style={{
                          padding: '4px 10px',
                          borderRadius: 6,
                          fontSize: '12px',
                          fontWeight: notifFilter === 'all' ? 600 : 450,
                          cursor: 'pointer',
                          backgroundColor: notifFilter === 'all' ? '#FFFFFF' : 'transparent',
                          color: notifFilter === 'all' ? '#0F172A' : '#64748B',
                          boxShadow: notifFilter === 'all' ? '0 1px 2px rgba(15, 23, 42, 0.06)' : 'none',
                          border: 'none',
                        }}
                      >
                        Tất cả ({notifItems.length})
                      </button>
                      <button
                        type="button"
                        className={`motion-tab-pill${notifFilter === 'unread' ? ' is-active-tab' : ''}`}
                        onClick={() => setNotifFilter('unread')}
                        style={{
                          padding: '4px 10px',
                          borderRadius: 6,
                          fontSize: '12px',
                          fontWeight: notifFilter === 'unread' ? 600 : 450,
                          cursor: 'pointer',
                          backgroundColor: notifFilter === 'unread' ? '#FFFFFF' : 'transparent',
                          color: notifFilter === 'unread' ? '#0F172A' : '#64748B',
                          boxShadow: notifFilter === 'unread' ? '0 1px 2px rgba(15, 23, 42, 0.06)' : 'none',
                          border: 'none',
                        }}
                      >
                        Chưa đọc ({unreadCount})
                      </button>
                    </div>
                  </div>

                  {/* Notification Items List */}
                  <div style={{ maxHeight: 380, overflowY: 'auto' }}>
                    {displayedNotifs.length === 0 ? (
                      <div style={{ padding: '32px 20px', textAlign: 'center', color: '#64748B', fontSize: '13.5px' }}>
                        Không có thông báo chưa đọc nào.
                      </div>
                    ) : (
                      displayedNotifs.map((n, idx) => {
                        const cfg = getNotificationTypeConfig(n.type);
                        const IconComp = cfg.icon;
                        const isLast = idx === displayedNotifs.length - 1;

                        return (
                          <div
                            key={n.id}
                            className="motion-dropdown-item"
                            onClick={() => {
                              if (!n.isRead) void handleMarkAsRead(n.id);
                            }}
                            style={{
                              padding: '13px 18px',
                              borderBottom: isLast ? 'none' : '1px solid var(--border-subtle, #F1F5F9)',
                              backgroundColor: !n.isRead ? 'var(--bg-subtle, #F8FAFC)' : 'var(--bg-card, #FFFFFF)',
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: '12px',
                              cursor: !n.isRead ? 'pointer' : 'default',
                            }}
                          >
                            <div
                              style={{
                                width: 32,
                                height: 32,
                                borderRadius: 8,
                                backgroundColor: 'var(--bg-subtle, #F8FAFC)',
                                color: !n.isRead ? 'var(--accent-color, #F26F21)' : '#64748B',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                                marginTop: 2,
                              }}
                            >
                              <IconComp size={15} />
                            </div>

                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px', marginBottom: '3px' }}>
                                <div
                                  style={{
                                    fontSize: '13px',
                                    fontWeight: !n.isRead ? 600 : 500,
                                    color: 'var(--text-main, #0F172A)',
                                    lineHeight: 1.4,
                                  }}
                                >
                                  {n.title}
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0, marginTop: '2px' }}>
                                  <span style={{ fontSize: '11px', color: '#94A3B8', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                                    {new Date(n.createdAt).toLocaleDateString('vi-VN', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                      day: '2-digit',
                                      month: '2-digit',
                                    })}
                                  </span>
                                  {!n.isRead && (
                                    <span
                                      style={{
                                        width: 6,
                                        height: 6,
                                        borderRadius: '50%',
                                        backgroundColor: 'var(--accent-color, #F26F21)',
                                        display: 'inline-block',
                                        flexShrink: 0,
                                      }}
                                      title="Chưa đọc (Bấm để đánh dấu đã đọc)"
                                    />
                                  )}
                                </div>
                              </div>

                              <p
                                style={{
                                  fontSize: '12.5px',
                                  fontWeight: 400,
                                  color: 'var(--text-secondary, #64748B)',
                                  lineHeight: 1.5,
                                  margin: 0,
                                }}
                              >
                                {n.message}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            <div
              style={{
                width: 1,
                height: 20,
                backgroundColor: 'var(--border-light, #E2E8F0)',
                margin: '0 0.35rem',
              }}
            />

            {/* 3. USER LAST: Clean Avatar + Name + Dropdown */}
            <div style={{ position: 'relative' }} ref={userMenuRef}>
              <button
                className="motion-topbar-btn"
                onClick={() => {
                  setUserMenuOpen(!userMenuOpen);
                  setNotifOpen(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.55rem',
                  padding: '4px 8px 4px 4px',
                  borderRadius: 999,
                  background: userMenuOpen ? (isDarkMode ? '#1E293B' : '#F1F5F9') : 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                <UserAvatarBubble
                  settings={appearance}
                  initials={getInitials(user?.role)}
                  size={32}
                  borderRadius={999}
                />

                <span
                  title={user?.fullName || 'Người dùng'}
                  style={{
                    fontSize: '13.5px',
                    fontWeight: 500,
                    color: 'var(--text-main, #0f172a)',
                    maxWidth: 160,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {user?.fullName || 'Người dùng'}
                </span>

                <ChevronDown
                  size={14}
                  color="var(--text-muted, #64748b)"
                  style={{
                    transform: userMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 180ms cubic-bezier(0.22, 1, 0.36, 1)',
                  }}
                />
              </button>

              {/* Popover Menu */}
              {userMenuOpen && (
                <div
                  className="motion-dropdown-menu"
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 10px)',
                    right: 0,
                    width: 268,
                    background: 'var(--bg-card, #ffffff)',
                    borderRadius: 16,
                    boxShadow: '0 20px 40px -10px rgba(15, 23, 42, 0.16), 0 4px 12px rgba(15, 23, 42, 0.06)',
                    border: '1px solid var(--border-light, #e2e8f0)',
                    zIndex: 120,
                    padding: '8px',
                  }}
                >
                  {/* User Profile Header in Popover */}
                  <div
                    style={{
                      padding: '12px 14px',
                      borderBottom: '1px solid var(--border-subtle, #f1f5f9)',
                      marginBottom: '6px',
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 800,
                        fontSize: '14.5px',
                        color: 'var(--text-main, #0f172a)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {user?.fullName}
                    </div>
                    <div
                      style={{
                        fontSize: '12.5px',
                        color: 'var(--text-muted, #64748b)',
                        marginTop: '3px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {user?.email}
                    </div>
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        marginTop: '10px',
                        padding: '3px 9px',
                        borderRadius: 6,
                        whiteSpace: 'nowrap',
                        backgroundColor: 'var(--bg-subtle, #F8FAFC)',
                        border: '1px solid var(--border-light, #E2E8F0)',
                        color: 'var(--text-secondary, #334155)',
                        fontSize: '12px',
                        fontWeight: 500,
                      }}
                    >
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          backgroundColor: 'var(--accent-color, #F26F21)',
                          flexShrink: 0,
                        }}
                      />
                      <span>
                        Vai trò:{' '}
                        {user?.role === 'Moderator'
                          ? 'Điều phối viên'
                          : user?.role === 'Lecturer'
                          ? 'Giảng viên'
                          : 'Sinh viên'}
                      </span>
                    </div>
                  </div>

                  {/* Account Link */}
                  <button
                    type="button"
                    className="motion-dropdown-item"
                    onClick={() => {
                      setUserMenuOpen(false);
                      navigate('/profile');
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '10px 14px',
                      borderRadius: 10,
                      color: 'var(--text-main, #0F172A)',
                      fontSize: '14px',
                      fontWeight: 600,
                      textAlign: 'left',
                      whiteSpace: 'nowrap',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-sidebar-hover, #f8fafc)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <User size={16} color="var(--text-muted, #64748b)" style={{ flexShrink: 0 }} />
                    <span>Hồ sơ cá nhân</span>
                  </button>

                  {/* Cycle Appearance Customizer Link */}
                  <button
                    type="button"
                    className="motion-dropdown-item"
                    onClick={() => {
                      setUserMenuOpen(false);
                      setAppearanceOpen(true);
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '10px',
                      padding: '10px 14px',
                      borderRadius: 10,
                      color: 'var(--text-main, #0F172A)',
                      fontSize: '14px',
                      fontWeight: 600,
                      textAlign: 'left',
                      whiteSpace: 'nowrap',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-sidebar-hover, #f8fafc)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Sparkles size={16} color={activeAccent.hex} style={{ flexShrink: 0 }} />
                      <span>Cá nhân hóa giao diện</span>
                    </div>
                    <span
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        backgroundColor: activeAccent.hex,
                        flexShrink: 0,
                      }}
                    />
                  </button>

                  <div style={{ height: 1, backgroundColor: 'var(--border-subtle, #f1f5f9)', margin: '6px 0' }} />

                  {/* Logout Button */}
                  <button
                    type="button"
                    className="motion-dropdown-item"
                    onClick={handleLogout}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '10px 14px',
                      borderRadius: 10,
                      color: '#E11D48',
                      fontSize: '14px',
                      fontWeight: 600,
                      textAlign: 'left',
                      whiteSpace: 'nowrap',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#FFF1F2')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <LogOut size={16} style={{ flexShrink: 0 }} />
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
        <main style={{ flex: 1, padding: '2.25rem 2.75rem' }}>
          <div key={`${location.pathname}-${currentSpace?.id ?? "none"}`} className="motion-page-enter">
            <Outlet />
          </div>
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
          className="motion-modal-backdrop"
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
            className="motion-modal-dialog"
            style={{
              width: '100%',
              maxWidth: 580,
              padding: 0,
              overflow: 'hidden',
              border: '1px solid var(--border-light, #E2E8F0)',
              borderRadius: '20px',
              backgroundColor: 'var(--bg-card, #FFFFFF)',
              boxShadow: '0 20px 45px rgba(0, 0, 0, 0.15)',
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
                      style={{ marginTop: 2, width: 16, height: 16, accentColor: 'var(--accent-color, #F26F21)' }}
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
                      backgroundColor: termsChecked ? 'var(--accent-color, #F26F21)' : '#CBD5E1',
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
      {/* ══════════════════════════════════════════════════════════════
          CYCLE-STYLE APPEARANCE CUSTOMIZER MODAL ("Make yourself at home")
         ══════════════════════════════════════════════════════════════ */}
      <AppearanceCustomizerModal
        open={appearanceOpen}
        onClose={() => setAppearanceOpen(false)}
        settings={appearance}
        onChangeSettings={setAppearance}
        isDarkMode={isDarkMode}
        onSelectTheme={(dark) => setIsDarkMode(dark)}
        initials={getInitials(user?.role)}
      />
    </div>
  );
};
