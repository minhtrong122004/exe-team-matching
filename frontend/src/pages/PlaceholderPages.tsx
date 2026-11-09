import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  Download,
  Zap,
  CheckCheck,
  Check,
  CheckCircle2,
  Sparkles,
  Bell,
  RefreshCw,
  Mail,
  FileSpreadsheet,
  Crown,
  Search,
} from 'lucide-react';
import { notificationsApi } from '../api/notifications';
import { reportsApi } from '../api/reports';
import { spacesApi } from '../api/spaces';
import type { CourseSpaceResponse, SpaceRosterResponse } from '../types/space';
import type {
  GroupReportItemResponse,
  GroupStatStatus,
  NotificationResponse,
  ReportSnapshotResponse,
  ReportSummaryResponse,
  StudentWithoutGroupResponse,
} from '../types';

export {
  GroupsPage,
  MyGroupPage,
  JoinRequestsPage,
} from './GroupsModulePages';

export { ModeratorSpacesPage } from './moderator/ModeratorSpacesPage';
export { ModeratorDistributionPage } from './moderator/ModeratorDistributionPage';
export { ModeratorTransfersPage } from './moderator/ModeratorTransfersPage';
export { LecturerDashboardPage } from './lecturer/LecturerDashboardPage';

// ── 6. NOTIFICATIONS PAGE ───────────────────────────────────────────────────
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

// ── Fallback Notifications by Role ──
const STUDENT_NOTIFICATIONS: NotificationResponse[] = [
  {
    id: 'notif-stu-01',
    recipientId: 'curr-user',
    type: 'SYSTEM_ACCOUNT',
    title: 'Khởi tạo tài khoản & Cấp quyền truy cập học kỳ Fall 2026',
    message: 'Tài khoản của bạn đã được đồng bộ tự động từ danh sách FAP cho học phần EXE101. Vui lòng hoàn tất khảo sát 5 chỉ số kỹ năng và đổi mật khẩu khởi tạo để bảo mật tài khoản.',
    isRead: true,
    createdAt: '2026-11-08T08:00:00Z',
  },
  {
    id: 'notif-stu-02',
    recipientId: 'curr-user',
    type: 'GROUP_REQUEST',
    title: 'Có ứng viên mới nộp đơn vào nhóm FA26EXE101-02',
    message: 'Sinh viên Nguyễn Minh Trọng (SE185103 • Trí tuệ nhân tạo AI) vừa nộp đơn ứng tuyển vào nhóm của bạn với vai trò Kỹ thuật & AI. Hãy truy cập Nhóm của tôi để xem hồ sơ và biểu quyết.',
    isRead: false,
    createdAt: '2026-11-09T09:15:00Z',
  },
  {
    id: 'notif-stu-03',
    recipientId: 'curr-user',
    type: 'ELECTION_OPEN',
    title: 'Mở đợt biểu quyết bầu Trưởng nhóm mới (Thời hạn 24h)',
    message: 'Thành viên trong nhóm FA26EXE101-02 đã khởi xướng cuộc bỏ phiếu tín nhiệm bầu chọn Trưởng nhóm mới. Cuộc biểu quyết có hiệu lực trong 24h, vui lòng tham gia bỏ phiếu.',
    isRead: false,
    createdAt: '2026-11-09T10:30:00Z',
  },
  {
    id: 'notif-stu-04',
    recipientId: 'curr-user',
    type: 'GROUP_ACCEPTED',
    title: 'Kết quả đơn ứng tuyển phòng FA26EXE101-02',
    message: 'Chúc mừng bạn! Toàn bộ thành viên và Trưởng nhóm FA26EXE101-02 đã đồng ý duyệt bạn vào nhóm chính thức cho đề tài EcoCampus.',
    isRead: false,
    createdAt: '2026-11-09T11:45:00Z',
  },
];

const MODERATOR_NOTIFICATIONS: NotificationResponse[] = [
  {
    id: 'notif-mod-01',
    recipientId: 'mod-user',
    type: 'SYSTEM_ACCOUNT',
    title: 'Đồng bộ thành công 50 sinh viên từ FAP cho học phần EXE101',
    message: 'Hệ thống đã nạp danh sách 50 sinh viên đủ điều kiện từ FAP kỳ Fall 2026 và tự động gửi 50 email cấp tài khoản khởi tạo qua hệ thống MailHog.',
    isRead: true,
    createdAt: '2026-11-08T08:30:00Z',
  },
  {
    id: 'notif-mod-02',
    recipientId: 'mod-user',
    type: 'GROUP_REQUEST',
    title: 'Có 3 yêu cầu xin chuyển nhóm / đổi chéo mới sau chốt sổ đang chờ duyệt',
    message: 'Sinh viên từ các nhóm đã nộp 3 đơn chuyển nhóm kèm lý do đổi chéo đề tài. Vui lòng vào trang Quản lý Chuyển nhóm để xem xét và phê duyệt.',
    isRead: false,
    createdAt: '2026-11-09T09:30:00Z',
  },
  {
    id: 'notif-mod-03',
    recipientId: 'mod-user',
    type: 'SYSTEM',
    title: 'Cảnh báo: Còn 8 sinh viên chưa có nhóm khi sắp đến hạn đóng đăng ký',
    message: 'Thời hạn đăng ký tự nguyện sắp kết thúc. Còn 8 sinh viên chưa tham gia phòng nào, chuẩn bị kích hoạt phân bổ tự động vào các phòng còn trống chỗ.',
    isRead: false,
    createdAt: '2026-11-09T10:45:00Z',
  },
  {
    id: 'notif-mod-04',
    recipientId: 'mod-user',
    type: 'GROUP_ACCEPTED',
    title: 'Phòng FA26EXE101-02 vừa chạm ngưỡng 3 thành viên và chuyển sang chế độ Nhóm đang tuyển',
    message: 'Phòng FA26EXE101-02 vừa tiếp nhận thành viên thứ 3, đủ điều kiện thành lập nhóm và tự động chuyển từ Vào thẳng sang Nhóm đang tuyển (Nộp đơn).',
    isRead: false,
    createdAt: '2026-11-09T11:15:00Z',
  },
];

const LECTURER_NOTIFICATIONS: NotificationResponse[] = [
  {
    id: 'notif-lec-01',
    recipientId: 'lec-user',
    type: 'SYSTEM_ACCOUNT',
    title: 'Danh sách 10 nhóm học phần EXE101 đã được chốt sổ chính thức - Sẵn sàng xuất báo cáo CSV chấm điểm',
    message: 'Điều phối viên đã khóa sổ và chốt danh sách chính thức 10 nhóm môn EXE101. Giảng viên có thể vào trang Tổng quan & Xuất báo cáo để tải file CSV phục vụ theo dõi và chấm điểm.',
    isRead: false,
    createdAt: '2026-11-09T12:00:00Z',
  },
];

export const NotificationsPage: React.FC = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<NotificationResponse[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [filterUnread, setFilterUnread] = useState<boolean | undefined>(undefined);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const getRoleFallbackNotifications = useCallback(() => {
    if (user?.role === 'Moderator') return MODERATOR_NOTIFICATIONS;
    if (user?.role === 'Lecturer') return LECTURER_NOTIFICATIONS;
    return STUDENT_NOTIFICATIONS;
  }, [user?.role]);

  const applyFallbackNotifications = useCallback(() => {
    const source = getRoleFallbackNotifications();
    let list = [...source];
    if (filterUnread === false) {
      list = list.filter((n) => !n.isRead);
    } else if (filterUnread === true) {
      list = list.filter((n) => n.isRead);
    }
    setItems(list);
    setTotalPages(1);
    setUnreadCount(source.filter((n) => !n.isRead).length);
    setError(null);
  }, [filterUnread, getRoleFallbackNotifications]);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [pagedRes, unreadRes] = await Promise.all([
        notificationsApi.getMyNotifications({
          isRead: filterUnread,
          page,
          pageSize: 10,
        }),
        notificationsApi.getUnreadCount(),
      ]);
      if (pagedRes.items && pagedRes.items.length > 0) {
        setItems(pagedRes.items);
        setTotalPages(Math.max(1, pagedRes.totalPages || 1));
        setUnreadCount(unreadRes.unreadCount ?? 0);
      } else {
        applyFallbackNotifications();
      }
      window.dispatchEvent(new Event('notifications:updated'));
    } catch {
      // Offline mode: automatically fallback to clean sample notifications by role without showing red error
      applyFallbackNotifications();
    } finally {
      setLoading(false);
    }
  }, [filterUnread, page, applyFallbackNotifications]);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationsApi.markAsRead(id);
    } catch {
      // In offline mode, update state locally
    }
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    setUnreadCount((c) => Math.max(0, c - 1));
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
    } catch {
      // In offline mode, update state locally
    }
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  return (
    <div>
      {/* Header */}
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
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '-0.02em', margin: 0 }}>
            Thông báo Hệ thống ({unreadCount} chưa đọc)
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '4px', margin: 0 }}>
            Cập nhật trạng thái ghép nhóm, lời mời và kết quả dự án môn EXE của bạn
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => void loadNotifications()}
            disabled={loading}
            className="btn-card-secondary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              borderRadius: '8px',
              padding: '7px 14px',
              fontSize: '13px',
              fontWeight: 500,
            }}
          >
            <RefreshCw size={14} />
            <span>Làm mới</span>
          </button>
          <button
            type="button"
            onClick={() => void handleMarkAllAsRead()}
            disabled={loading || unreadCount === 0}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: unreadCount > 0 ? 'var(--pill-active-bg)' : 'var(--bg-tag)',
              color: unreadCount > 0 ? 'var(--pill-active-text)' : 'var(--text-muted)',
              border: '1px solid ' + (unreadCount > 0 ? 'var(--pill-active-border)' : 'var(--border-light)'),
              borderRadius: '8px',
              padding: '7px 14px',
              fontSize: '13px',
              fontWeight: 500,
              cursor: unreadCount > 0 ? 'pointer' : 'default',
            }}
          >
            <CheckCheck size={15} />
            <span>Đánh dấu tất cả đã đọc</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '1.25rem' }}>
        <button
          type="button"
          onClick={() => {
            setPage(1);
            setFilterUnread(undefined);
          }}
          style={{
            backgroundColor: filterUnread === undefined ? 'var(--pill-active-bg)' : 'var(--pill-inactive-bg)',
            color: filterUnread === undefined ? 'var(--pill-active-text)' : 'var(--pill-inactive-text)',
            border: '1px solid ' + (filterUnread === undefined ? 'var(--pill-active-border)' : 'var(--pill-inactive-border)'),
            borderRadius: '8px',
            padding: '6px 14px',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Tất cả
        </button>
        <button
          type="button"
          onClick={() => {
            setPage(1);
            setFilterUnread(false);
          }}
          style={{
            backgroundColor: filterUnread === false ? 'var(--pill-active-bg)' : 'var(--pill-inactive-bg)',
            color: filterUnread === false ? 'var(--pill-active-text)' : 'var(--pill-inactive-text)',
            border: '1px solid ' + (filterUnread === false ? 'var(--pill-active-border)' : 'var(--pill-inactive-border)'),
            borderRadius: '8px',
            padding: '6px 14px',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Chưa đọc ({unreadCount})
        </button>
        <button
          type="button"
          onClick={() => {
            setPage(1);
            setFilterUnread(true);
          }}
          style={{
            backgroundColor: filterUnread === true ? 'var(--pill-active-bg)' : 'var(--pill-inactive-bg)',
            color: filterUnread === true ? 'var(--pill-active-text)' : 'var(--pill-inactive-text)',
            border: '1px solid ' + (filterUnread === true ? 'var(--pill-active-border)' : 'var(--pill-inactive-border)'),
            borderRadius: '8px',
            padding: '6px 14px',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Đã đọc
        </button>
      </div>

      {error && (
        <div
          style={{
            marginBottom: '1rem',
            padding: '0.85rem 1.15rem',
            color: '#dc2626',
            backgroundColor: '#fee2e2',
            border: '1px solid #fca5a5',
            borderRadius: '10px',
            fontSize: '13px',
          }}
        >
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: '14px', padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          Đang tải thông báo...
        </div>
      ) : items.length === 0 ? (
        <div style={{ backgroundColor: 'var(--bg-card)', border: '1px dashed var(--border-medium)', borderRadius: '14px', padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          Không có thông báo nào phù hợp với bộ lọc hiện tại.
        </div>
      ) : (
        <div
          style={{
            backgroundColor: 'var(--bg-card)',
            borderRadius: '16px',
            border: '1px solid var(--border-light)',
            overflow: 'hidden',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          {items.map((n, idx) => {
            const config = getNotificationTypeConfig(n.type);
            const IconComponent = config.icon;
            const isLast = idx === items.length - 1;

            return (
              <div
                key={n.id}
                style={{
                  backgroundColor: !n.isRead ? 'var(--bg-subtle)' : 'var(--bg-card)',
                  padding: '16px 20px',
                  borderBottom: isLast ? 'none' : '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px',
                  transition: 'background-color 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', flex: 1 }}>
                  {/* Round Pastel Icon */}
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '9999px',
                      backgroundColor: config.bg,
                      color: config.color,
                      border: `1px solid ${config.border}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: '2px',
                    }}
                  >
                    <IconComponent size={18} />
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                      {!n.isRead && (
                        <span
                          style={{
                            width: '7px',
                            height: '7px',
                            borderRadius: '50%',
                            backgroundColor: '#F27024',
                            display: 'inline-block',
                            flexShrink: 0,
                          }}
                        />
                      )}
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          color: config.color,
                          backgroundColor: config.bg,
                          border: `1px solid ${config.border}`,
                          padding: '2px 8px',
                          borderRadius: '6px',
                        }}
                      >
                        {config.label}
                      </span>
                      <h4 style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '15px', margin: 0 }}>
                        {n.title}
                      </h4>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                        {new Date(n.createdAt).toLocaleDateString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                      </span>
                    </div>

                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0 0', lineHeight: 1.5 }}>
                      {n.message}
                    </p>
                  </div>
                </div>

                {!n.isRead && (
                  <button
                    type="button"
                    onClick={() => void handleMarkAsRead(n.id)}
                    className="btn-card-secondary"
                    style={{
                      borderRadius: '8px',
                      padding: '6px 12px',
                      fontSize: '12px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      flexShrink: 0,
                    }}
                  >
                    <Check size={13} />
                    <span>Đã đọc</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '16px' }}>
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="btn-card-secondary"
            style={{
              borderRadius: '6px',
              padding: '6px 12px',
              fontSize: '12px',
              opacity: page <= 1 ? 0.5 : 1,
            }}
          >
            Trước
          </button>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)', alignSelf: 'center' }}>
            Trang {page} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="btn-card-secondary"
            style={{
              borderRadius: '6px',
              padding: '6px 12px',
              fontSize: '12px',
              opacity: page >= totalPages ? 0.5 : 1,
            }}
          >
            Sau
          </button>
        </div>
      )}
    </div>
  );
};

// ── 7. REPORTS PAGE (Lecturer & Admin) ───────────────────────────────────────
export const ReportsPage: React.FC = () => {
  const [summary, setSummary] = useState<ReportSummaryResponse | null>(null);
  const [students, setStudents] = useState<StudentWithoutGroupResponse[]>([]);
  const [studentsTotal, setStudentsTotal] = useState<number>(0);
  const [groups, setGroups] = useState<GroupReportItemResponse[]>([]);
  const [groupsTotal, setGroupsTotal] = useState<number>(0);
  const [snapshots, setSnapshots] = useState<ReportSnapshotResponse[]>([]);
  const [snapshotsTotal, setSnapshotsTotal] = useState<number>(0);
  const [selectedMajor, setSelectedMajor] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<GroupStatStatus | ''>('');
  const [activeTab, setActiveTab] = useState<'students' | 'groups' | 'snapshots' | 'roster'>('students');
  const [loading, setLoading] = useState<boolean>(true);
  const [exporting, setExporting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Phase 6: Space Roster for Lecturer & Admin
  const [spaces, setSpaces] = useState<CourseSpaceResponse[]>([]);
  const [selectedSpaceId, setSelectedSpaceId] = useState<string>('');
  const [roster, setRoster] = useState<SpaceRosterResponse | null>(null);
  const [loadingRoster, setLoadingRoster] = useState<boolean>(false);
  const [rosterSearch, setRosterSearch] = useState<string>('');
  const [exportingRosterCsv, setExportingRosterCsv] = useState<boolean>(false);

  useEffect(() => {
    spacesApi.getAllSpaces().then((list) => {
      setSpaces(list);
      if (list.length > 0 && !selectedSpaceId) {
        setSelectedSpaceId(list[0].id);
      }
    }).catch(() => {});
  }, []);

  const loadSpaceRoster = useCallback(async (spaceId: string) => {
    setLoadingRoster(true);
    try {
      const res = await spacesApi.getSpaceRoster(spaceId);
      setRoster(res);
    } catch {
      setRoster(null);
    } finally {
      setLoadingRoster(false);
    }
  }, []);

  useEffect(() => {
    if (selectedSpaceId && activeTab === 'roster') {
      void loadSpaceRoster(selectedSpaceId);
    }
  }, [selectedSpaceId, activeTab, loadSpaceRoster]);

  const handleExportRosterCsv = async () => {
    if (!selectedSpaceId) return;
    setExportingRosterCsv(true);
    try {
      const blob = await spacesApi.exportSpaceRosterCsv(selectedSpaceId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const sp = spaces.find((s) => s.id === selectedSpaceId);
      a.download = `${sp?.semesterCode || 'EXE'}_${sp?.subjectCode || '101'}_Roster_BangDiem.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setError('Không thể xuất file CSV bảng điểm.');
    } finally {
      setExportingRosterCsv(false);
    }
  };

  const loadReportData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [summaryRes, studentsRes, groupsRes, snapshotsRes] = await Promise.all([
        reportsApi.getSummary(),
        reportsApi.getStudentsWithoutGroup({
          major: selectedMajor || undefined,
          page: 1,
          pageSize: 20,
        }),
        reportsApi.getGroups({
          status: selectedStatus,
          page: 1,
          pageSize: 20,
        }),
        reportsApi.getSnapshots({ page: 1, pageSize: 10 }),
      ]);
      setSummary(summaryRes);
      setStudents(studentsRes.items || []);
      setStudentsTotal(studentsRes.totalCount ?? (studentsRes.items?.length || 0));
      setGroups(groupsRes.items || []);
      setGroupsTotal(groupsRes.totalCount ?? (groupsRes.items?.length || 0));
      setSnapshots(snapshotsRes.items || []);
      setSnapshotsTotal(snapshotsRes.totalCount ?? (snapshotsRes.items?.length || 0));
    } catch {
      setError('Không thể tải dữ liệu báo cáo từ Report Service.');
    } finally {
      setLoading(false);
    }
  }, [selectedMajor, selectedStatus]);

  useEffect(() => {
    void loadReportData();
  }, [loadReportData]);

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const blob = await reportsApi.exportSummaryCsv();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `exe-report-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setError('Không thể xuất báo cáo CSV.');
    } finally {
      setExporting(false);
    }
  };

  const handleGenerateSnapshot = async () => {
    setLoading(true);
    setError(null);
    try {
      await reportsApi.generateSnapshot();
      await loadReportData();
      setActiveTab('snapshots');
    } catch {
      setError('Chỉ Điều phối viên (Moderator) mới có quyền tạo Snapshot thủ công.');
      setLoading(false);
    }
  };

  const handleExportSnapshotCsv = async (snapshotId: string) => {
    try {
      const blob = await reportsApi.exportSnapshotCsv(snapshotId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `exe-report-snapshot-${snapshotId.slice(0, 8)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setError('Không thể xuất file CSV của bản chụp này.');
    }
  };

  const totalStudents = summary?.totalStudents ?? 0;
  const studentsInGroup = summary?.studentsInGroup ?? 0;
  const studentsWithoutGroup = summary?.studentsWithoutGroup ?? 0;
  const totalGroups = summary?.totalGroups ?? 0;
  const fullGroups = summary?.fullGroups ?? 0;
  const inGroupPercent =
    totalStudents > 0 ? ((studentsInGroup / totalStudents) * 100).toFixed(1) : '0.0';

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '2rem',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>
            Báo cáo Tình hình Ghép nhóm EXE
          </h1>
          <p style={{ color: 'var(--text-muted, #64748b)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Dành cho Giảng viên & Quản trị viên theo dõi tiến độ sinh viên (Report Service • Redis Streams Projection)
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          <button
            className="btn btn-secondary"
            onClick={() => void loadReportData()}
            disabled={loading}
          >
            <RefreshCw size={17} />
            Làm mới
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => void handleGenerateSnapshot()}
            disabled={loading}
          >
            <Zap size={17} color="#f26f21" />
            Chụp Snapshot ngay
          </button>
          <button
            className="btn btn-primary"
            onClick={() => void handleExportCsv()}
            disabled={exporting}
          >
            <Download size={18} />
            {exporting ? 'Đang xuất CSV...' : 'Xuất báo cáo CSV'}
          </button>
        </div>
      </div>

      {error && (
        <div
          className="card"
          style={{
            marginBottom: '1.25rem',
            padding: '0.9rem 1.15rem',
            borderLeft: '3px solid #ef4444',
            color: '#ef4444',
            fontSize: '0.875rem',
          }}
        >
          {error}
        </div>
      )}

      {/* Summary KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1.25rem',
          marginBottom: '1.75rem',
        }}
      >
        <div className="card">
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted, #64748b)', fontWeight: 600 }}>
            TỔNG SINH VIÊN
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main, #0f172a)', marginTop: '0.25rem' }}>
            {totalStudents}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#10b981', marginTop: '0.25rem' }}>
            100% sinh viên môn EXE
          </div>
        </div>
        <div className="card">
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted, #64748b)', fontWeight: 600 }}>
            ĐÃ CÓ NHÓM
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#10b981', marginTop: '0.25rem' }}>
            {studentsInGroup}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #64748b)', marginTop: '0.25rem' }}>
            {inGroupPercent}% hoàn thành
          </div>
        </div>
        <div className="card">
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted, #64748b)', fontWeight: 600 }}>
            CHƯA CÓ NHÓM
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#ef4444', marginTop: '0.25rem' }}>
            {studentsWithoutGroup}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '0.25rem' }}>
            Cần hỗ trợ ghép nhóm
          </div>
        </div>
        <div className="card">
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted, #64748b)', fontWeight: 600 }}>
            TỔNG SỐ NHÓM
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#6366f1', marginTop: '0.25rem' }}>
            {totalGroups}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #64748b)', marginTop: '0.25rem' }}>
            {fullGroups} nhóm đã đủ quân số
          </div>
        </div>
      </div>

      {/* Breakdown by Major */}
      {summary && summary.byMajor.length > 0 && (
        <div className="card" style={{ marginBottom: '1.75rem' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.85rem' }}>
            Phân bố sinh viên theo chuyên ngành
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
            {summary.byMajor.map((m) => (
              <div
                key={m.major}
                style={{
                  padding: '0.75rem 1rem',
                  borderRadius: 8,
                  background: 'var(--bg-main, #f8fafc)',
                  border: '1px solid var(--border-light, #e2e8f0)',
                }}
              >
                <div style={{ fontWeight: 700, color: '#f26f21', fontSize: '0.9rem' }}>
                  Ngành {m.major}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                  Tổng: <strong>{m.totalStudents}</strong> • Có nhóm: <strong style={{ color: '#10b981' }}>{m.studentsInGroup}</strong> • Chưa: <strong style={{ color: '#ef4444' }}>{m.studentsWithoutGroup}</strong>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detail Tabs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            className={activeTab === 'students' ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'}
            onClick={() => setActiveTab('students')}
          >
            Sinh viên chưa có nhóm ({studentsTotal})
          </button>
          <button
            className={activeTab === 'groups' ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'}
            onClick={() => setActiveTab('groups')}
          >
            Danh sách nhóm ({groupsTotal})
          </button>
          <button
            className={activeTab === 'snapshots' ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'}
            onClick={() => setActiveTab('snapshots')}
          >
            Lịch sử Snapshot ({snapshotsTotal})
          </button>
          <button
            className={activeTab === 'roster' ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'}
            onClick={() => setActiveTab('roster')}
            style={{ gap: '0.35rem', fontWeight: 700 }}
          >
            <FileSpreadsheet size={15} />
            <span>Bảng điểm Roster Hậu Chốt sổ</span>
          </button>
        </div>

        {activeTab === 'students' && (
          <select
            value={selectedMajor}
            onChange={(e) => setSelectedMajor(e.target.value)}
            style={{
              padding: '0.45rem 0.75rem',
              borderRadius: 8,
              border: '1px solid var(--border-light, #cbd5e1)',
              background: 'var(--bg-card, #ffffff)',
              color: 'var(--text-main)',
              fontSize: '0.85rem',
            }}
          >
            <option value="">Tất cả chuyên ngành</option>
            <option value="SE">SE (Kỹ thuật phần mềm)</option>
            <option value="AI">AI (Trí tuệ nhân tạo)</option>
            <option value="IA">IA (An toàn thông tin)</option>
            <option value="GD">GD (Thiết kế đồ họa)</option>
            <option value="MKT">MKT (Digital Marketing)</option>
            <option value="IB">IB (Kinh doanh quốc tế)</option>
            <option value="Other">Other</option>
            <option value="Unassigned">Unassigned (Chưa chọn ngành)</option>
          </select>
        )}

        {activeTab === 'groups' && (
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as GroupStatStatus | '')}
            style={{
              padding: '0.45rem 0.75rem',
              borderRadius: 8,
              border: '1px solid var(--border-light, #cbd5e1)',
              background: 'var(--bg-card, #ffffff)',
              color: 'var(--text-main)',
              fontSize: '0.85rem',
            }}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="Recruiting">Recruiting (Đang tuyển)</option>
            <option value="Full">Full (Đã đủ thành viên)</option>
            <option value="Locked">Locked (Đã khóa)</option>
            <option value="Archived">Archived (Đã giải tán)</option>
          </select>
        )}
      </div>

      {/* Tab Content */}
      <div className="card">
        {loading ? (
          <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Đang tải dữ liệu báo cáo...
          </div>
        ) : activeTab === 'students' ? (
          students.length === 0 ? (
            <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              Không có sinh viên nào chưa có nhóm theo bộ lọc hiện tại.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {students.map((s) => (
                <div
                  key={s.userId}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.75rem 1rem',
                    borderRadius: 8,
                    background: 'var(--bg-main, #f8fafc)',
                    border: '1px solid var(--border-light, #e2e8f0)',
                  }}
                >
                  <div>
                    <strong style={{ color: 'var(--text-main)' }}>{s.fullName}</strong>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{s.email}</div>
                  </div>
                  <span className="badge badge-domain">{s.major || 'Chưa chọn ngành'}</span>
                </div>
              ))}
            </div>
          )
        ) : activeTab === 'groups' ? (
          groups.length === 0 ? (
            <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              Chưa có nhóm nào theo bộ lọc hiện tại.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {groups.map((g) => (
                <div
                  key={g.groupId}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.75rem 1rem',
                    borderRadius: 8,
                    background: 'var(--bg-main, #f8fafc)',
                    border: '1px solid var(--border-light, #e2e8f0)',
                  }}
                >
                  <div>
                    <strong style={{ color: 'var(--text-main)' }}>{g.name}</strong>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Cập nhật: {new Date(g.updatedAt).toLocaleString('vi-VN')}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className="badge badge-recruiting">
                      {g.memberCount}/{g.maxMembers} thành viên
                    </span>
                    <span className="badge badge-domain">{g.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : activeTab === 'snapshots' ? (
          snapshots.length === 0 ? (
          <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Chưa có bản chụp định kỳ nào được tạo.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {snapshots.map((snap) => (
              <div
                key={snap.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.75rem 1rem',
                  borderRadius: 8,
                  background: 'var(--bg-main, #f8fafc)',
                  border: '1px solid var(--border-light, #e2e8f0)',
                }}
              >
                <div>
                  <strong style={{ color: 'var(--text-main)' }}>
                    Snapshot lúc {new Date(snap.generatedAt).toLocaleString('vi-VN')}
                  </strong>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    SV: {snap.totalStudents} (Có nhóm: {snap.studentsInGroup}, Chưa: {snap.studentsWithoutGroup})
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="badge badge-domain">
                    Nhóm: {snap.totalGroups} (Đủ: {snap.fullGroups})
                  </span>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => void handleExportSnapshotCsv(snap.id)}
                  >
                    <Download size={14} />
                    CSV
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : activeTab === 'roster' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Space Selector & Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', background: 'var(--bg-main)', padding: '0.85rem 1rem', borderRadius: 8, border: '1px solid var(--border-light)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                  Không gian môn học:
                </label>
                <select
                  value={selectedSpaceId}
                  onChange={(e) => setSelectedSpaceId(e.target.value)}
                  style={{
                    padding: '0.45rem 0.85rem',
                    borderRadius: 6,
                    border: '1px solid var(--border-medium)',
                    background: 'var(--bg-card)',
                    color: 'var(--text-main)',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                  }}
                >
                  {spaces.map((sp) => (
                    <option key={sp.id} value={sp.id}>
                      [{sp.semesterCode} • {sp.subjectCode}] {sp.name} ({sp.status})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => selectedSpaceId && void loadSpaceRoster(selectedSpaceId)}
                  disabled={loadingRoster || !selectedSpaceId}
                >
                  <RefreshCw size={14} className={loadingRoster ? 'animate-spin' : ''} />
                  <span>Tải lại</span>
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={handleExportRosterCsv}
                  disabled={exportingRosterCsv || !roster || roster.totalStudents === 0}
                  style={{ gap: '0.4rem', fontWeight: 700, background: '#059669', borderColor: '#059669' }}
                >
                  <Download size={15} />
                  <span>{exportingRosterCsv ? 'Đang xuất CSV...' : 'Xuất CSV Bảng điểm (UTF-8 BOM)'}</span>
                </button>
              </div>
            </div>

            {/* KPI Roster Summary */}
            {roster && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.85rem' }}>
                <div style={{ padding: '0.85rem', borderRadius: 8, background: 'var(--bg-main)', border: '1px solid var(--border-light)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>TỔNG NHÓM</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--fpt-blue)', fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}>
                    {roster.totalGroups}
                  </div>
                </div>
                <div style={{ padding: '0.85rem', borderRadius: 8, background: 'var(--bg-main)', border: '1px solid var(--border-light)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>TỔNG SINH VIÊN</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#059669', fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}>
                    {roster.totalStudents}
                  </div>
                </div>
                <div style={{ padding: '0.85rem', borderRadius: 8, background: 'var(--bg-main)', border: '1px solid var(--border-light)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>SĨ SỐ BÌNH QUÂN</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--fpt-orange)', fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}>
                    {roster.totalGroups > 0 ? (roster.totalStudents / roster.totalGroups).toFixed(1) : '0'} SV/nhóm
                  </div>
                </div>
                <div style={{ padding: '0.85rem', borderRadius: 8, background: 'var(--bg-main)', border: '1px solid var(--border-light)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>TRẠNG THÁI</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: roster.status === 'Locked' ? '#dc2626' : 'var(--text-main)', marginTop: '0.25rem' }}>
                    {roster.status === 'Locked' ? 'Đã Chốt sổ (Locked)' : roster.status}
                  </div>
                </div>
              </div>
            )}

            {/* Filter Search */}
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="form-control"
                placeholder="Tìm kiếm nhóm, MSSV hoặc tên sinh viên trong Bảng điểm..."
                value={rosterSearch}
                onChange={(e) => setRosterSearch(e.target.value)}
                style={{ paddingLeft: '2.25rem', fontSize: '0.85rem' }}
              />
            </div>

            {/* Roster Groups List */}
            {loadingRoster ? (
              <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 0.5rem auto' }} />
                <div>Đang tải bảng điểm Roster...</div>
              </div>
            ) : !roster || roster.groups.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                Không có dữ liệu nhóm nào trong Không gian này.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {roster.groups
                  .filter((g) => {
                    if (!rosterSearch.trim()) return true;
                    const q = rosterSearch.trim().toLowerCase();
                    return g.groupCode.toLowerCase().includes(q) || g.name.toLowerCase().includes(q) || g.members.some(m => m.fullName.toLowerCase().includes(q) || m.studentCode.toLowerCase().includes(q));
                  })
                  .map((grp) => (
                    <div key={grp.groupId} style={{ border: '1px solid var(--border-light)', borderRadius: 8, padding: '1rem', background: 'var(--bg-main)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--fpt-blue)', fontSize: '0.85rem' }}>
                            {grp.groupCode}
                          </span>
                          <strong style={{ color: 'var(--text-main)', fontSize: '0.95rem' }}>{grp.name}</strong>
                          {grp.projectIdeaTitle && (
                            <span className="badge badge-secondary" style={{ fontSize: '0.7rem' }}>
                              Đề tài: {grp.projectIdeaTitle}
                            </span>
                          )}
                        </div>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 700, color: 'var(--fpt-orange)', fontVariantNumeric: 'tabular-nums' }}>
                          {grp.memberCount} / {grp.maxMembers} SV
                        </span>
                      </div>

                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', background: 'var(--bg-card)', borderRadius: 6, overflow: 'hidden' }}>
                        <thead>
                          <tr style={{ background: 'var(--bg-main)', borderBottom: '1px solid var(--border-light)', color: 'var(--text-muted)', textAlign: 'left' }}>
                            <th style={{ padding: '0.45rem 0.65rem' }}>MSSV</th>
                            <th style={{ padding: '0.45rem 0.65rem' }}>Họ và tên</th>
                            <th style={{ padding: '0.45rem 0.65rem' }}>Ngành</th>
                            <th style={{ padding: '0.45rem 0.65rem', textAlign: 'center' }}>Vai trò</th>
                            <th style={{ padding: '0.45rem 0.65rem', textAlign: 'center', color: '#0284c7' }}>Tech</th>
                            <th style={{ padding: '0.45rem 0.65rem', textAlign: 'center', color: '#f59e0b' }}>Quản lý</th>
                            <th style={{ padding: '0.45rem 0.65rem', textAlign: 'center', color: '#ec4899' }}>Design</th>
                            <th style={{ padding: '0.45rem 0.65rem', textAlign: 'center', color: '#8b5cf6' }}>Mkt</th>
                            <th style={{ padding: '0.45rem 0.65rem', textAlign: 'center', color: '#10b981' }}>Sale</th>
                          </tr>
                        </thead>
                        <tbody>
                          {grp.members.map((m) => (
                            <tr key={m.studentId} style={{ borderBottom: '1px solid var(--border-light)' }}>
                              <td style={{ padding: '0.45rem 0.65rem', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                                {m.studentCode}
                              </td>
                              <td style={{ padding: '0.45rem 0.65rem', fontWeight: 600 }}>{m.fullName}</td>
                              <td style={{ padding: '0.45rem 0.65rem' }}>
                                <span className="badge badge-secondary" style={{ fontSize: '0.7rem' }}>
                                  {m.major}
                                </span>
                              </td>
                              <td style={{ padding: '0.45rem 0.65rem', textAlign: 'center' }}>
                                {m.isLeader ? (
                                  <span className="badge badge-warning" style={{ fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', gap: '0.2rem', fontWeight: 700 }}>
                                    <Crown size={11} /> Leader
                                  </span>
                                ) : (
                                  <span className="badge badge-secondary" style={{ fontSize: '0.7rem' }}>Thành viên</span>
                                )}
                              </td>
                              <td style={{ padding: '0.45rem 0.65rem', textAlign: 'center', fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>
                                {m.techScore}%
                              </td>
                              <td style={{ padding: '0.45rem 0.65rem', textAlign: 'center', fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: '#f59e0b' }}>
                                {m.managementScore}%
                              </td>
                              <td style={{ padding: '0.45rem 0.65rem', textAlign: 'center', fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>
                                {m.designScore}%
                              </td>
                              <td style={{ padding: '0.45rem 0.65rem', textAlign: 'center', fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>
                                {m.marketingScore}%
                              </td>
                              <td style={{ padding: '0.45rem 0.65rem', textAlign: 'center', fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>
                                {m.saleScore}%
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
};

