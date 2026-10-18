import React, { useState } from 'react';
import {
  Mail,
  Download,
  Lock,
  Unlock,
  Zap,
} from 'lucide-react';

// ── 1. GROUPS PAGE ──────────────────────────────────────────────────────────
export const GroupsPage: React.FC = () => {
  const [matchScoreVisible, setMatchScoreVisible] = useState<string | null>(null);

  const mockGroups = [
    {
      id: 'g1',
      name: 'EduTech Innovators',
      projectTitle: 'EduMentor — Nền tảng cố vấn học tập P2P',
      domain: 'EdTech',
      leader: 'Nguyễn Văn A',
      maxMembers: 5,
      memberCount: 3,
      status: 'Recruiting',
      slots: [
        { major: 'SE', skills: ['React', '.NET'], count: 1 },
        { major: 'MKT', skills: ['Social Media', 'Content'], count: 1 },
      ],
      matchScore: 92.5,
      matchedSkills: ['React', '.NET'],
      missingSkills: ['Content'],
    },
    {
      id: 'g2',
      name: 'EcoRecycle FPT',
      projectTitle: 'GreenCampus — Thu gom tái chế thông minh',
      domain: 'Other',
      leader: 'Lê Thị Thu',
      maxMembers: 4,
      memberCount: 2,
      status: 'Recruiting',
      slots: [
        { major: 'IA', skills: ['Hardware', 'IoT'], count: 1 },
        { major: 'GD', skills: ['Figma', 'UI/UX'], count: 1 },
      ],
      matchScore: 78.0,
      matchedSkills: ['Figma'],
      missingSkills: ['IoT'],
    },
  ];

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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', gap: '1.5rem' }}>
        {mockGroups.map((g) => (
          <div key={g.id} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <span className="badge badge-domain">{g.domain}</span>
              <span className="badge badge-recruiting">Đang tuyển ({g.memberCount}/{g.maxMembers})</span>
            </div>

            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main, #0f172a)', marginBottom: '0.25rem' }}>
              {g.name}
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted, #64748b)', marginBottom: '1rem' }}>
              Dự án: <strong style={{ color: 'var(--text-main, #334155)' }}>{g.projectTitle}</strong>
            </p>

            <div
              style={{
                background: 'var(--bg-main, #f8fafc)',
                padding: '0.85rem 1rem',
                borderRadius: 8,
                marginBottom: '1rem',
                border: '1px solid var(--border-light, #e2e8f0)',
              }}
            >
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted, #475569)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                Vị trí đang tìm kiếm:
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                {g.slots.map((s, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.825rem' }}>
                    <span style={{ fontWeight: 600, color: '#f26f21' }}>Chuyên ngành: {s.major} ({s.count} bạn)</span>
                    <span style={{ color: 'var(--text-secondary, #64748b)' }}>Kỹ năng: {s.skills.join(', ')}</span>
                  </div>
                ))}
              </div>
            </div>

            {matchScoreVisible === g.id && (
              <div
                style={{
                  background: 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  padding: '0.85rem',
                  borderRadius: 8,
                  marginBottom: '1rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontWeight: 700, color: '#10b981', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Zap size={16} color="#10b981" /> Điểm phù hợp (Matching Score):
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#10b981' }}>
                    {g.matchScore}%
                  </div>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary, #047857)', marginTop: '0.35rem' }}>
                  Kỹ năng khớp: {g.matchedSkills.join(', ')} | Thiếu: {g.missingSkills.join(', ')}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.75rem', borderTop: '1px solid var(--border-light, #f1f5f9)' }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setMatchScoreVisible(matchScoreVisible === g.id ? null : g.id)}
              >
                <Zap size={15} color="#f26f21" />
                {matchScoreVisible === g.id ? 'Ẩn điểm khớp' : 'Xem điểm khớp gRPC'}
              </button>

              <button
                className="btn btn-primary btn-sm"
                onClick={() => alert(`Đã gửi yêu cầu tham gia nhóm ${g.name}!`)}
              >
                Gửi yêu cầu gia nhập
              </button>
            </div>
          </div>
        ))}
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

      <div className="card" style={{ maxWidth: 800 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>
              EduTech Innovators
            </h2>
            <p style={{ color: 'var(--text-muted, #64748b)', fontSize: '0.875rem' }}>
              Đề tài: EduMentor — Nền tảng cố vấn học tập P2P
            </p>
          </div>
          <span className="badge badge-recruiting">Đang tuyển (3/5 thành viên)</span>
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main, #334155)', marginBottom: '0.75rem' }}>
            Danh sách thành viên hiện tại:
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1rem',
                background: 'var(--bg-main, #f8fafc)',
                borderRadius: 8,
                border: '1px solid var(--border-light, #e2e8f0)',
                color: 'var(--text-main)',
              }}
            >
              <div>
                <strong>Nguyễn Văn A</strong> (Bạn) — <span style={{ color: '#f26f21', fontWeight: 600 }}>Trưởng nhóm (SE)</span>
              </div>
              <span className="badge badge-active">Leader</span>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1rem',
                background: 'var(--bg-main, #f8fafc)',
                borderRadius: 8,
                border: '1px solid var(--border-light, #e2e8f0)',
                color: 'var(--text-main)',
              }}
            >
              <div>
                <strong>Trần Thị Mai</strong> — Thành viên (Design/GD)
              </div>
              <span className="badge badge-draft">Member</span>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1rem',
                background: 'var(--bg-main, #f8fafc)',
                borderRadius: 8,
                border: '1px solid var(--border-light, #e2e8f0)',
                color: 'var(--text-main)',
              }}
            >
              <div>
                <strong>Phạm Hoàng Long</strong> — Thành viên (Business/IB)
              </div>
              <span className="badge badge-draft">Member</span>
            </div>
          </div>
        </div>

        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main, #334155)', marginBottom: '0.75rem' }}>
            Yêu cầu xin gia nhập đang chờ duyệt (Pending):
          </h3>
          <div
            style={{
              padding: '1.25rem',
              border: '1px dashed var(--border-medium, #cbd5e1)',
              borderRadius: 8,
              textAlign: 'center',
              color: 'var(--text-muted, #64748b)',
              background: 'var(--bg-main)',
            }}
          >
            Hiện chưa có yêu cầu mới nào đang chờ.
          </div>
        </div>
      </div>
    </div>
  );
};



// ── 4. JOIN REQUESTS PAGE ───────────────────────────────────────────────────
export const JoinRequestsPage: React.FC = () => {
  const [requests, setRequests] = useState([
    {
      id: 'req1',
      groupName: 'EcoRecycle FPT',
      projectTitle: 'GreenCampus — Thu gom tái chế thông minh',
      role: 'UI/UX Design',
      message: 'Em ứng tuyển vị trí UI/UX Design cho app di động, đã có sản phẩm Figma cá nhân ạ.',
      status: 'Pending',
      createdAt: '2 giờ trước',
    },
    {
      id: 'req2',
      groupName: 'FPT FoodPass',
      projectTitle: 'Đặt cơm trưa Canteen không cần xếp hàng',
      role: 'Frontend Developer',
      message: 'Em có kinh nghiệm React và TailwindCSS, mong muốn đồng hành cùng nhóm.',
      status: 'Pending',
      createdAt: '1 ngày trước',
    },
  ]);

  const handleCancel = (id: string) => {
    setRequests(prev => prev.filter(r => r.id !== id));
    alert('Đã hủy yêu cầu tham gia thành công.');
  };

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>
          Yêu cầu Tham gia Nhóm ({requests.length}/5)
        </h1>
        <p style={{ color: 'var(--text-muted, #64748b)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
          Theo dõi trạng thái các đơn xin gia nhập nhóm của bạn (Tối đa 5 yêu cầu Pending cùng lúc - BR-03)
        </p>
      </div>

      {requests.length === 0 ? (
        <div className="card" style={{ maxWidth: 800, textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          <h3 style={{ color: 'var(--text-main)' }}>Bạn chưa có yêu cầu gia nhập nào</h3>
          <p style={{ marginTop: '0.25rem' }}>Hãy khám phá các nhóm đề tài và gửi yêu cầu tham gia phù hợp.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: 800 }}>
          {requests.map(req => (
            <div key={req.id} className="card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    Nhóm: {req.groupName}
                  </h3>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                    Dự án: <strong style={{ color: 'var(--text-secondary)' }}>{req.projectTitle}</strong> • Vị trí: <span style={{ color: '#f26f21', fontWeight: 600 }}>{req.role}</span>
                  </div>
                </div>
                <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.18)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.35)' }}>
                  Đang chờ duyệt ({req.status})
                </span>
              </div>

              <div
                style={{
                  background: 'var(--bg-main)',
                  padding: '0.75rem 1rem',
                  borderRadius: 8,
                  border: '1px solid var(--border-light)',
                  fontSize: '0.875rem',
                  color: 'var(--text-secondary)',
                  marginBottom: '1rem',
                }}
              >
                <em>"{req.message}"</em>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.5rem', borderTop: '1px solid var(--border-light)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Gửi lúc: {req.createdAt}</span>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleCancel(req.id)}
                  style={{ color: '#ef4444' }}
                >
                  Rút lại yêu cầu
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── 5. INVITATIONS PAGE ─────────────────────────────────────────────────────
export const InvitationsPage: React.FC = () => {
  const [invitations, setInvitations] = useState([
    {
      id: 'inv1',
      groupName: 'EduTech Innovators',
      projectTitle: 'EduMentor — Nền tảng cố vấn học tập P2P',
      leaderName: 'Trần Văn Hoàng (Leader)',
      invitedRole: 'Backend Developer (.NET / EF Core)',
      message: 'Chào bạn! Hồ sơ kỹ năng C# và .NET của bạn rất phù hợp với dự án EduMentor bên mình. Mời bạn tham gia cùng nhóm nhé!',
      expiresIn: 'Còn 38 giờ (BR-10: Hết hạn sau 48h)',
    },
  ]);

  const handleAction = (id: string, action: 'accept' | 'reject') => {
    setInvitations(prev => prev.filter(inv => inv.id !== id));
    if (action === 'accept') {
      alert('Chúc mừng! Bạn đã chính thức gia nhập nhóm.');
    } else {
      alert('Đã từ chối lời mời gia nhập nhóm.');
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>
          Lời mời Tham gia Nhóm ({invitations.length})
        </h1>
        <p style={{ color: 'var(--text-muted, #64748b)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
          Các lời mời từ trưởng nhóm gửi đến bạn (Tự động hết hạn sau 48h - Background Job BR-10)
        </p>
      </div>

      {invitations.length === 0 ? (
        <div className="card" style={{ maxWidth: 800, textAlign: 'center', padding: '3.5rem', color: 'var(--text-muted)' }}>
          <Mail size={44} style={{ margin: '0 auto 1rem auto', color: 'var(--text-light)' }} />
          <h3 style={{ color: 'var(--text-main)' }}>Bạn không có lời mời nào đang chờ</h3>
          <p style={{ marginTop: '0.25rem', color: 'var(--text-muted)' }}>Khi các nhóm tìm kiếm và gửi lời mời đến bạn, chúng sẽ xuất hiện tại đây.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: 800 }}>
          {invitations.map(inv => (
            <div key={inv.id} className="card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    {inv.groupName}
                  </h3>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                    Người mời: <strong style={{ color: 'var(--text-secondary)' }}>{inv.leaderName}</strong> • Đề tài: <strong style={{ color: 'var(--text-secondary)' }}>{inv.projectTitle}</strong>
                  </div>
                </div>
                <span className="badge badge-recruiting">
                  {inv.invitedRole}
                </span>
              </div>

              <div
                style={{
                  background: 'var(--bg-main)',
                  padding: '0.85rem 1rem',
                  borderRadius: 8,
                  border: '1px solid var(--border-light)',
                  fontSize: '0.875rem',
                  color: 'var(--text-secondary)',
                  marginBottom: '1rem',
                  lineHeight: 1.5,
                }}
              >
                {inv.message}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.5rem', borderTop: '1px solid var(--border-light)' }}>
                <span style={{ fontSize: '0.75rem', color: '#f59e0b', fontWeight: 600 }}>
                  ⏱ {inv.expiresIn}
                </span>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleAction(inv.id, 'reject')}
                  >
                    Từ chối
                  </button>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => handleAction(inv.id, 'accept')}
                  >
                    Đồng ý gia nhập
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── 6. NOTIFICATIONS PAGE ───────────────────────────────────────────────────
export const NotificationsPage: React.FC = () => {
  const notifications = [
    {
      id: '1',
      title: 'Chào mừng bạn đến với hệ thống EXE Team Matching',
      message: 'Vui lòng hoàn thiện hồ sơ kỹ năng để nhận được gợi ý nhóm tốt nhất.',
      time: '10 phút trước',
      isRead: false,
    },
    {
      id: '2',
      title: 'Ý tưởng dự án mới được đăng',
      message: 'Nguyễn Văn A vừa đề xuất ý tưởng "EduMentor — Nền tảng cố vấn học tập P2P".',
      time: '1 giờ trước',
      isRead: true,
    },
  ];

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

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: 800 }}>
        {notifications.map((n) => (
          <div
            key={n.id}
            className="card"
            style={{
              padding: '1.25rem',
              borderLeft: n.isRead ? '3px solid var(--border-medium, #cbd5e1)' : '3px solid #f26f21',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
              <h4 style={{ fontWeight: 700, color: 'var(--text-main, #0f172a)', fontSize: '0.95rem' }}>{n.title}</h4>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)' }}>{n.time}</span>
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary, #475569)' }}>{n.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── 7. REPORTS PAGE (Lecturer & Admin) ───────────────────────────────────────
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
          className="btn btn-primary"
          onClick={() => alert('Đang xuất báo cáo định dạng CSV...')}
        >
          <Download size={18} />
          Xuất báo cáo CSV
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        <div className="card">
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted, #64748b)', fontWeight: 600 }}>TỔNG SINH VIÊN</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main, #0f172a)', marginTop: '0.25rem' }}>340</div>
          <div style={{ fontSize: '0.75rem', color: '#10b981', marginTop: '0.25rem' }}>100% sinh viên môn EXE</div>
        </div>
        <div className="card">
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted, #64748b)', fontWeight: 600 }}>ĐÃ CÓ NHÓM</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#10b981', marginTop: '0.25rem' }}>285</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #64748b)', marginTop: '0.25rem' }}>83.8% hoàn thành</div>
        </div>
        <div className="card">
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted, #64748b)', fontWeight: 600 }}>CHƯA CÓ NHÓM</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#ef4444', marginTop: '0.25rem' }}>55</div>
          <div style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '0.25rem' }}>Cần hỗ trợ ghép</div>
        </div>
        <div className="card">
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted, #64748b)', fontWeight: 600 }}>TỔNG SỐ NHÓM</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#6366f1', marginTop: '0.25rem' }}>68</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #64748b)', marginTop: '0.25rem' }}>52 nhóm đã đủ quân số</div>
        </div>
      </div>
    </div>
  );
};

// ── 8. ADMIN ACCOUNTS PAGE ──────────────────────────────────────────────────
export const AdminAccountsPage: React.FC = () => {
  const [accounts, setAccounts] = useState([
    { id: '1', email: 'student.a@fpt.edu.vn', name: 'Nguyễn Văn A', role: 'Student', isActive: true },
    { id: '2', email: 'lecturer@fpt.edu.vn', name: 'TS. Trần Văn B', role: 'Lecturer', isActive: true },
    { id: '3', email: 'troublemaker@fpt.edu.vn', name: 'Lê Văn C', role: 'Student', isActive: false },
  ]);

  const toggleStatus = (id: string) => {
    setAccounts((prev) =>
      prev.map((acc) => (acc.id === id ? { ...acc, isActive: !acc.isActive } : acc))
    );
  };

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>
          Quản trị Tài khoản Hệ thống
        </h1>
        <p style={{ color: 'var(--text-muted, #64748b)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
          Quản lý, phân quyền và khóa/mở khóa tài khoản người dùng (Auth Service Admin API)
        </p>
      </div>

      <div className="card">
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem', color: 'var(--text-main)' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border-light, #e2e8f0)', color: 'var(--text-muted, #64748b)', fontSize: '0.8rem', textTransform: 'uppercase' }}>
              <th style={{ padding: '0.75rem 1rem' }}>Họ và tên</th>
              <th style={{ padding: '0.75rem 1rem' }}>Email</th>
              <th style={{ padding: '0.75rem 1rem' }}>Vai trò</th>
              <th style={{ padding: '0.75rem 1rem' }}>Trạng thái</th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((acc) => (
              <tr key={acc.id} style={{ borderBottom: '1px solid var(--border-light, #f1f5f9)' }}>
                <td style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-main)' }}>{acc.name}</td>
                <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>{acc.email}</td>
                <td style={{ padding: '1rem' }}>
                  <span className="badge badge-draft">{acc.role}</span>
                </td>
                <td style={{ padding: '1rem' }}>
                  <span className={`badge badge-${acc.isActive ? 'active' : 'cancelled'}`}>
                    {acc.isActive ? 'Hoạt động' : 'Bị khóa'}
                  </span>
                </td>
                <td style={{ padding: '1rem', textAlign: 'right' }}>
                  <button
                    className={`btn btn-sm ${acc.isActive ? 'btn-secondary' : 'btn-primary'}`}
                    onClick={() => toggleStatus(acc.id)}
                  >
                    {acc.isActive ? <Lock size={14} /> : <Unlock size={14} />}
                    {acc.isActive ? 'Khóa' : 'Mở khóa'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
