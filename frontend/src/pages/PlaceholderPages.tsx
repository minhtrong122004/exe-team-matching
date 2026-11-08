import React, { useEffect, useState, useCallback } from 'react';
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
} from 'lucide-react';
import { notificationsApi } from '../api/notifications';
import { reportsApi } from '../api/reports';
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
  InvitationsPage,
} from './GroupsModulePages';

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
    case 'GROUP_INVITE':
      return {
        label: 'Lời mời mới',
        icon: Mail,
        color: '#EA580C',
        bg: '#FFEDD5',
        border: '#FED7AA',
      };
    case 'MATCHING_FOUND':
      return {
        label: 'Gợi ý ghép nhóm',
        icon: Sparkles,
        color: '#7C3AED',
        bg: '#EDE9FE',
        border: '#DDD6FE',
      };
    case 'SYSTEM':
    default:
      return {
        label: 'Hệ thống',
        icon: Bell,
        color: '#2563EB',
        bg: '#DBEAFE',
        border: '#BFDBFE',
      };
  }
};

export const NotificationsPage: React.FC = () => {
  const [items, setItems] = useState<NotificationResponse[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [filterUnread, setFilterUnread] = useState<boolean | undefined>(undefined);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

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
      setItems(pagedRes.items || []);
      setTotalPages(Math.max(1, pagedRes.totalPages || 1));
      setUnreadCount(unreadRes.unreadCount ?? 0);
      window.dispatchEvent(new Event('notifications:updated'));
    } catch {
      setError('Không thể tải danh sách thông báo từ Notification Service.');
    } finally {
      setLoading(false);
    }
  }, [filterUnread, page]);

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
  const [activeTab, setActiveTab] = useState<'students' | 'groups' | 'snapshots'>('students');
  const [loading, setLoading] = useState<boolean>(true);
  const [exporting, setExporting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

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
        ) : snapshots.length === 0 ? (
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
        )}
      </div>
    </div>
  );
};

