import React from 'react';
import {
  Mail,
  Download,
  Users,
  Compass,
  Bell,
  AlertCircle,
  FileText,
} from 'lucide-react';

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

// ── 5. NOTIFICATIONS PAGE ───────────────────────────────────────────────────
export const NotificationsPage: React.FC = () => {
  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>
          Thông báo Hệ thống
        </h1>
        <p style={{ color: 'var(--text-muted, #64748b)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
          Thông báo realtime từ Notification Service (Redis Streams Consumer)
        </p>
      </div>

      <div className="card" style={{ maxWidth: 800, textAlign: 'center', padding: '3.5rem', color: 'var(--text-muted)' }}>
        <Bell size={44} style={{ margin: '0 auto 1rem auto', color: 'var(--text-light, #94a3b8)' }} />
        <h3 style={{ color: 'var(--text-main, #0f172a)' }}>Không có thông báo mới</h3>
        <p style={{ marginTop: '0.35rem', color: 'var(--text-muted, #64748b)' }}>
          Hệ thống sẽ gửi thông báo đến bạn khi có cập nhật, lời mời hoặc phê duyệt mới.
        </p>
      </div>
    </div>
  );
};

// ── 6. REPORTS PAGE (Lecturer & Admin) ───────────────────────────────────────
export const ReportsPage: React.FC = () => {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>
            Báo cáo Tình hình Ghép nhóm EXE
          </h1>
          <p style={{ color: 'var(--text-muted, #64748b)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Dành cho Giảng viên & Quản trị viên theo dõi tiến độ sinh viên (Report Service)
          </p>
        </div>

        <button
          className="btn btn-secondary"
          onClick={() => alert('Hiện chưa có dữ liệu để xuất báo cáo CSV.')}
        >
          <Download size={18} />
          Xuất báo cáo CSV
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        <div className="card">
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted, #64748b)', fontWeight: 600 }}>TỔNG SINH VIÊN</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main, #0f172a)', marginTop: '0.25rem' }}>0</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #64748b)', marginTop: '0.25rem' }}>0% sinh viên môn EXE</div>
        </div>
        <div className="card">
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted, #64748b)', fontWeight: 600 }}>ĐÃ CÓ NHÓM</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#10b981', marginTop: '0.25rem' }}>0</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #64748b)', marginTop: '0.25rem' }}>0% hoàn thành</div>
        </div>
        <div className="card">
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted, #64748b)', fontWeight: 600 }}>CHƯA CÓ NHÓM</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-muted, #64748b)', marginTop: '0.25rem' }}>0</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #64748b)', marginTop: '0.25rem' }}>Chưa có sinh viên cần ghép</div>
        </div>
        <div className="card">
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted, #64748b)', fontWeight: 600 }}>TỔNG SỐ NHÓM</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#6366f1', marginTop: '0.25rem' }}>0</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #64748b)', marginTop: '0.25rem' }}>0 nhóm đã thành lập</div>
        </div>
      </div>

      <div
        className="card"
        style={{
          padding: '2rem',
          textAlign: 'center',
          color: 'var(--text-muted, #64748b)',
          border: '1px dashed var(--border-medium, #cbd5e1)',
          background: 'var(--bg-main, #f8fafc)',
        }}
      >
        <FileText size={36} style={{ margin: '0 auto 0.75rem auto', color: 'var(--text-light, #94a3b8)' }} />
        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main, #0f172a)', marginBottom: '0.25rem' }}>
          Chưa có dữ liệu thống kê
        </h3>
        <p style={{ fontSize: '0.875rem', maxWidth: 500, margin: '0 auto' }}>
          Hệ thống hiện chưa ghi nhận sinh viên hoặc nhóm đề tài nào. Khi người dùng thật đăng ký và các nhóm đề tài được thành lập (Report Service), số liệu thống kê sẽ được tự động tổng hợp tại đây.
        </p>
      </div>
    </div>
  );
};
