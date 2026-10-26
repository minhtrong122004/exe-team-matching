import React, { useEffect, useState, useCallback } from 'react';
import {
  Mail,
  Compass,
  Users,
  AlertCircle,
  Download,
  Zap,
  CheckCheck,
  Check,
  RefreshCw,
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


// ── 1. GROUPS PAGE ──────────────────────────────────────────────────────────
export const GroupsPage: React.FC = () => {
  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>
          Khám phá Nhóm Đề tài
        </h1>
        <p style={{ color: 'var(--text-muted, #64748b)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
          Tìm kiếm nhóm đang tuyển thành viên phù hợp với chuyên ngành và kỹ năng của bạn (Group Service + Matching gRPC)
        </p>
      </div>

      <div className="card" style={{ maxWidth: 800, textAlign: 'center', padding: '3.5rem', color: 'var(--text-muted)' }}>
        <Compass size={44} style={{ margin: '0 auto 1rem auto', color: 'var(--text-light, #94a3b8)' }} />
        <h3 style={{ color: 'var(--text-main, #0f172a)', fontSize: '1.2rem', fontWeight: 700 }}>
          Chưa có nhóm đề tài nào
        </h3>
        <p style={{ marginTop: '0.35rem', color: 'var(--text-muted, #64748b)' }}>
          Hiện tại chưa có nhóm đề tài nào được thành lập trong hệ thống. Khi sinh viên tạo nhóm (Group Service), danh sách nhóm sẽ xuất hiện tại đây.
        </p>
      </div>
    </div>
  );
};

// ── 2. MY GROUP PAGE ────────────────────────────────────────────────────────
export const MyGroupPage: React.FC = () => {
  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>
          Nhóm Của Tôi
        </h1>
        <p style={{ color: 'var(--text-muted, #64748b)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
          Quản lý thành viên, xét duyệt yêu cầu tham gia và lời mời của nhóm (Group Service)
        </p>
      </div>

      <div className="card" style={{ maxWidth: 800, textAlign: 'center', padding: '3.5rem', color: 'var(--text-muted)' }}>
        <Users size={44} style={{ margin: '0 auto 1rem auto', color: 'var(--text-light, #94a3b8)' }} />
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main, #0f172a)', marginBottom: '0.5rem' }}>
          Bạn chưa tham gia nhóm nào
        </h2>
        <p style={{ color: 'var(--text-muted, #64748b)', fontSize: '0.9rem', maxWidth: 520, margin: '0 auto 1.5rem auto', lineHeight: 1.5 }}>
          Hiện tại bạn chưa thuộc nhóm đề tài EXE nào. Bạn có thể tìm kiếm và gửi yêu cầu gia nhập các nhóm đang tuyển tại mục "Khám phá nhóm", hoặc đề xuất ý tưởng dự án để thành lập nhóm mới.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
          <a href="/groups" className="btn btn-secondary btn-sm">
            Khám phá nhóm
          </a>
          <a href="/projects" className="btn btn-primary btn-sm">
            Đề xuất ý tưởng dự án
          </a>
        </div>
      </div>
    </div>
  );
};

// ── 3. JOIN REQUESTS PAGE ───────────────────────────────────────────────────
export const JoinRequestsPage: React.FC = () => {
  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>
          Yêu cầu Tham gia Nhóm (0/5)
        </h1>
        <p style={{ color: 'var(--text-muted, #64748b)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
          Theo dõi trạng thái các đơn xin gia nhập nhóm của bạn (Tối đa 5 yêu cầu Pending cùng lúc - BR-03)
        </p>
      </div>

      <div className="card" style={{ maxWidth: 800, textAlign: 'center', padding: '3.5rem', color: 'var(--text-muted)' }}>
        <AlertCircle size={44} style={{ margin: '0 auto 1rem auto', color: 'var(--text-light, #94a3b8)' }} />
        <h3 style={{ color: 'var(--text-main, #0f172a)' }}>Bạn chưa có yêu cầu gia nhập nào</h3>
        <p style={{ marginTop: '0.35rem', color: 'var(--text-muted, #64748b)' }}>
          Hãy khám phá các nhóm đề tài và gửi yêu cầu tham gia phù hợp.
        </p>
      </div>
    </div>
  );
};

// ── 4. INVITATIONS PAGE ─────────────────────────────────────────────────────
export const InvitationsPage: React.FC = () => {
  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>
          Lời mời Tham gia Nhóm (0)
        </h1>
        <p style={{ color: 'var(--text-muted, #64748b)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
          Các lời mời từ trưởng nhóm gửi đến bạn (Tự động hết hạn sau 48h - Background Job BR-10)
        </p>
      </div>

      <div className="card" style={{ maxWidth: 800, textAlign: 'center', padding: '3.5rem', color: 'var(--text-muted)' }}>
        <Mail size={44} style={{ margin: '0 auto 1rem auto', color: 'var(--text-light, #94a3b8)' }} />
        <h3 style={{ color: 'var(--text-main, #0f172a)' }}>Bạn không có lời mời nào đang chờ</h3>
        <p style={{ marginTop: '0.35rem', color: 'var(--text-muted, #64748b)' }}>
          Khi các nhóm tìm kiếm và gửi lời mời đến bạn, chúng sẽ xuất hiện tại đây.
        </p>
      </div>
    </div>
  );
};


// ── 6. NOTIFICATIONS PAGE ───────────────────────────────────────────────────
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
      await loadNotifications();
    } catch {
      setError('Không thể đánh dấu đã đọc thông báo này.');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      await loadNotifications();
    } catch {
      setError('Không thể đánh dấu tất cả thông báo là đã đọc.');
    }
  };

  return (
    <div>
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
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>
            Thông báo Hệ thống ({unreadCount} chưa đọc)
          </h1>
          <p style={{ color: 'var(--text-muted, #64748b)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Thông báo từ Notification Service (Redis Streams Consumer & MailKit Email Queue)
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => void loadNotifications()}
            disabled={loading}
          >
            <RefreshCw size={15} />
            Làm mới
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => void handleMarkAllAsRead()}
            disabled={loading || unreadCount === 0}
          >
            <CheckCheck size={16} />
            Đánh dấu tất cả đã đọc
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
        <button
          className={filterUnread === undefined ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'}
          onClick={() => {
            setPage(1);
            setFilterUnread(undefined);
          }}
        >
          Tất cả
        </button>
        <button
          className={filterUnread === false ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'}
          onClick={() => {
            setPage(1);
            setFilterUnread(false);
          }}
        >
          Chưa đọc ({unreadCount})
        </button>
        <button
          className={filterUnread === true ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'}
          onClick={() => {
            setPage(1);
            setFilterUnread(true);
          }}
        >
          Đã đọc
        </button>
      </div>

      {error && (
        <div
          className="card"
          style={{
            maxWidth: 850,
            marginBottom: '1rem',
            padding: '0.9rem 1.15rem',
            borderLeft: '3px solid #ef4444',
            color: '#ef4444',
            fontSize: '0.875rem',
          }}
        >
          {error}
        </div>
      )}

      {loading ? (
        <div className="card" style={{ maxWidth: 850, padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          Đang tải thông báo...
        </div>
      ) : items.length === 0 ? (
        <div className="card" style={{ maxWidth: 850, padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          Không có thông báo nào phù hợp với bộ lọc hiện tại.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', maxWidth: 850 }}>
          {items.map((n) => (
            <div
              key={n.id}
              className="card"
              style={{
                padding: '1.15rem 1.25rem',
                borderLeft: n.isRead ? '3px solid var(--border-medium, #cbd5e1)' : '3px solid #f26f21',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="badge badge-domain" style={{ fontSize: '0.7rem' }}>
                    {n.type}
                  </span>
                  <h4 style={{ fontWeight: 700, color: 'var(--text-main, #0f172a)', fontSize: '0.95rem' }}>
                    {n.title}
                  </h4>
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)' }}>
                  {new Date(n.createdAt).toLocaleString('vi-VN')}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginTop: '0.4rem' }}>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary, #475569)', margin: 0 }}>
                  {n.message}
                </p>
                {!n.isRead && (
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => void handleMarkAsRead(n.id)}
                    style={{ flexShrink: 0 }}
                  >
                    <Check size={14} />
                    Đã đọc
                  </button>
                )}
              </div>
            </div>
          ))}

          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '0.75rem' }}>
              <button
                className="btn btn-secondary btn-sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Trang trước
              </button>
              <span style={{ alignSelf: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Trang {page} / {totalPages}
              </span>
              <button
                className="btn btn-secondary btn-sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Trang sau
              </button>
            </div>
          )}
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
      setError('Chỉ Quản trị viên (Admin) mới có quyền tạo Snapshot thủ công.');
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

