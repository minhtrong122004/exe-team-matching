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
  CheckCircle2,
  Sparkles,
  Bell,
  RefreshCw,
  Eye,
  EyeOff,
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

// ── MOCK DATA FOR DEV & PREVIEW ─────────────────────────────────────────────
const MOCK_GROUPS = [
  {
    id: 'grp-1',
    name: 'EcoCampus - Phân loại rác thông minh tích hợp AI',
    leader: 'Lữ Phước Nhật Tú (SE185102)',
    domain: 'Môi trường & AI',
    membersCount: 3,
    maxMembers: 5,
    members: ['Lữ Phước Nhật Tú (SE)', 'Nguyễn Minh Trọng (AI)', 'Trần Thảo Vy (GD)'],
    recruiting: ['+1 MKT', '+1 IB'],
    description: 'Ứng dụng Computer Vision nhận diện rác thải tại nguồn và tích điểm đổi quà cho sinh viên các cơ sở FPT.',
    campus: 'TP. Hồ Chí Minh (HCM)',
  },
  {
    id: 'grp-2',
    name: 'FinPocket - Trợ lý quản lý tài chính sinh viên',
    leader: 'Lê Hoàng Kim Ngân (IB185401)',
    domain: 'FinTech',
    membersCount: 4,
    maxMembers: 5,
    members: ['Lê Hoàng Kim Ngân (IB)', 'Phan Thanh Long (SE)', 'Đặng Thị Mai (GD)', 'Võ Minh Quân (SE)'],
    recruiting: ['+1 MKT'],
    description: 'Nền tảng quản lý chi tiêu cá nhân kết nối ngân hàng mở Open Banking, cảnh báo vượt ngân sách thông minh.',
    campus: 'TP. Hồ Chí Minh (HCM)',
  },
  {
    id: 'grp-3',
    name: 'UniFood - Đặt món căng tin và thanh toán không tiền mặt',
    leader: 'Hoàng Đình Phú (MK185301)',
    domain: 'F&B & E-Commerce',
    membersCount: 2,
    maxMembers: 5,
    members: ['Hoàng Đình Phú (MKT)', 'Trần Gia Bảo (SE)'],
    recruiting: ['+1 SE', '+1 AI', '+1 GD'],
    description: 'Hệ thống đặt món trước tránh ùn tắc giờ cao điểm tại canteen Đại học FPT, tích hợp thanh toán QR VietQR.',
    campus: 'TP. Hồ Chí Minh (HCM)',
  },
  {
    id: 'grp-4',
    name: 'F-Tour - Du lịch trải nghiệm văn hóa bản địa Gen Z',
    leader: 'Nguyễn Minh Trọng (AI185103)',
    domain: 'Du lịch & EdTech',
    membersCount: 3,
    maxMembers: 5,
    members: ['Nguyễn Minh Trọng (AI)', 'Vũ Thuỳ Dung (IB)', 'Ngô Văn Tài (SE)'],
    recruiting: ['+1 GD', '+1 MKT'],
    description: 'Nền tảng kết nối du khách trẻ với hướng dẫn viên sinh viên bản địa, cá nhân hóa lịch trình bằng AI.',
    campus: 'Đà Nẵng (DN)',
  },
];

const MOCK_JOIN_REQUESTS = [
  {
    id: 'req-1',
    groupName: 'EcoCampus - Phân loại rác thông minh tích hợp AI',
    leaderName: 'Lữ Phước Nhật Tú',
    roleApplied: 'AI & Data Processing',
    status: 'Pending',
    createdAt: '07/11/2026',
    message: 'Chào nhóm, mình có kinh nghiệm train model YOLOv8 và gRPC backend, mong muốn gia nhập nhóm!',
  },
  {
    id: 'req-2',
    groupName: 'FinPocket - Trợ lý quản lý tài chính sinh viên',
    leaderName: 'Lê Hoàng Kim Ngân',
    roleApplied: 'Full-stack Developer',
    status: 'Accepted',
    createdAt: '05/11/2026',
    message: 'Mình có kinh nghiệm làm việc với React và .NET Web API, mong được đồng hành.',
  },
  {
    id: 'req-3',
    groupName: 'UniFood - Đặt món căng tin FPT',
    leaderName: 'Hoàng Đình Phú',
    roleApplied: 'Mobile Developer',
    status: 'Rejected',
    createdAt: '02/11/2026',
    message: 'Nhóm đã đủ thành viên mảng Mobile.',
  },
];

const MOCK_INVITATIONS = [
  {
    id: 'inv-1',
    groupName: 'F-Tour - Du lịch trải nghiệm bản địa Gen Z',
    leaderName: 'Nguyễn Minh Trọng',
    roleOffered: 'Frontend Lead / React Specialist',
    expiresIn: 'Còn 36 giờ',
    createdAt: '08/11/2026',
    message: 'Chào bạn, nhóm mình rất ấn tượng với profile React và .NET của bạn. Nhóm đang cần 1 bạn Lead mảng Web app môn EXE, mời bạn tham gia cùng nhé!',
  },
  {
    id: 'inv-2',
    groupName: 'SmartAttendance - Điểm danh khuôn mặt AI',
    leaderName: 'Phạm Đăng Khôi',
    roleOffered: 'DevOps / Cloud Architecture',
    expiresIn: 'Còn 12 giờ',
    createdAt: '07/11/2026',
    message: 'Nhóm mình muốn mời bạn phụ trách mảng Docker CI/CD và triển khai Cloud cho đồ án.',
  },
];

const MOCK_NOTIFICATIONS: NotificationResponse[] = [
  {
    id: 'notif-1',
    recipientId: 'usr-1',
    title: 'Yêu cầu tham gia nhóm được chấp thuận',
    message: 'Trưởng nhóm đề tài "EcoCampus - Green Living" đã chấp thuận yêu cầu gia nhập của bạn. Chào mừng bạn đến với nhóm!',
    type: 'GROUP_ACCEPTED',
    isRead: false,
    createdAt: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
  },
  {
    id: 'notif-2',
    recipientId: 'usr-1',
    title: 'Lời mời tham gia nhóm mới',
    message: 'Nguyễn Minh Trọng (Trưởng nhóm F-Tour) đã gửi lời mời bạn tham gia nhóm với vai trò Frontend Lead.',
    type: 'GROUP_INVITE',
    isRead: false,
    createdAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
  },
  {
    id: 'notif-3',
    recipientId: 'usr-1',
    title: 'Thuật toán Matching tìm thấy đồng đội phù hợp',
    message: 'Hệ thống vừa đề xuất 3 ứng viên chuyên ngành GD và MKT có độ tương thích cao (>85%) với dự án của bạn.',
    type: 'MATCHING_FOUND',
    isRead: true,
    createdAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
  },
  {
    id: 'notif-4',
    recipientId: 'usr-1',
    title: 'Thông báo học kỳ khởi nghiệp EXE',
    message: 'Hạn chót chốt danh sách nhóm dự án môn EXE là ngày 25/11/2026. Vui lòng hoàn tất đội ngũ trước thời hạn.',
    type: 'SYSTEM',
    isRead: true,
    createdAt: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
  },
];

// ── 1. GROUPS PAGE ──────────────────────────────────────────────────────────
export const GroupsPage: React.FC = () => {
  const [showPreview, setShowPreview] = useState<boolean>(true);

  return (
    <div>
      {/* Page Header */}
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
            Khám phá Nhóm Đề tài
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '4px', margin: 0 }}>
            Tìm kiếm nhóm dự án môn EXE đang tuyển thành viên phù hợp với chuyên ngành và kỹ năng của bạn
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowPreview((v) => !v)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: 'var(--bg-card)',
            color: 'var(--text-secondary)',
            border: '1px solid var(--border-light)',
            borderRadius: '8px',
            padding: '7px 14px',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          {showPreview ? <EyeOff size={15} /> : <Eye size={15} />}
          <span>{showPreview ? 'Đóng dữ liệu mẫu' : 'Xem dữ liệu mẫu (Preview UI)'}</span>
        </button>
      </div>

      {!showPreview ? (
        <div
          style={{
            width: '100%',
            backgroundColor: 'var(--bg-card)',
            borderRadius: '16px',
            border: '1px dashed var(--border-medium)',
            padding: '60px 24px',
            textAlign: 'center',
          }}
        >
          <Compass size={44} style={{ margin: '0 auto 12px auto', color: 'var(--text-muted)' }} />
          <h3 style={{ color: 'var(--text-main)', fontSize: '18px', fontWeight: 700, marginBottom: '6px' }}>
            Chưa có nhóm đề tài nào đang hoạt động
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', maxWidth: 500, margin: '0 auto 18px auto', lineHeight: 1.5 }}>
            Hiện tại chưa có nhóm đề tài nào được thành lập. Bạn có thể bấm nút &quot;Xem dữ liệu mẫu&quot; phía trên để xem trước giao diện các thẻ nhóm sinh viên FPT hoặc đề xuất ý tưởng để tạo nhóm mới.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={() => setShowPreview(true)}
              style={{
                backgroundColor: 'var(--pill-active-bg)',
                color: 'var(--pill-active-text)',
                borderRadius: '8px',
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: 600,
                border: '1px solid var(--pill-active-border)',
                cursor: 'pointer',
              }}
            >
              Bật xem dữ liệu mẫu
            </button>
            <a
              href="/projects"
              style={{
                backgroundColor: 'var(--bg-card)',
                color: 'var(--text-main)',
                border: '1px solid var(--border-light)',
                borderRadius: '8px',
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: 600,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              Đề xuất ý tưởng dự án
            </a>
          </div>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: '20px',
          }}
        >
          {MOCK_GROUPS.map((g) => (
            <div
              key={g.id}
              style={{
                backgroundColor: 'var(--bg-card)',
                borderRadius: '16px',
                border: '1px solid var(--border-light)',
                padding: '22px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: 'var(--shadow-sm)',
                transition: 'all 0.2s ease',
              }}
            >
              <div>
                {/* Meta Top */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      color: 'var(--text-secondary)',
                      backgroundColor: 'var(--bg-tag)',
                      border: '1px solid var(--border-light)',
                      padding: '3px 8px',
                      borderRadius: '6px',
                    }}
                  >
                    {g.domain}
                  </span>
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      color: 'var(--text-main)',
                      backgroundColor: 'var(--bg-subtle)',
                      border: '1px solid var(--border-light)',
                      padding: '3px 8px',
                      borderRadius: '6px',
                    }}
                  >
                    {g.membersCount}/{g.maxMembers} thành viên
                  </span>
                </div>

                {/* Title */}
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)', lineHeight: 1.4, margin: '0 0 8px 0' }}>
                  {g.name}
                </h3>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.55, margin: '0 0 14px 0' }}>
                  {g.description}
                </p>

                {/* Leader info */}
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Trưởng nhóm: </span>
                  <strong style={{ color: 'var(--text-main)' }}>{g.leader}</strong>
                </div>

                {/* Recruitment slots */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '6px', textTransform: 'uppercase' }}>
                    Đang tuyển vị trí:
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {g.recruiting.map((r, idx) => (
                      <span
                        key={idx}
                        style={{
                          backgroundColor: 'var(--bg-tag)',
                          border: '1px solid var(--border-light)',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: 'var(--text-secondary)',
                        }}
                      >
                        {r}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => alert(`Đã gửi yêu cầu xin gia nhập nhóm "${g.name}"!`)}
                  className="btn-card-action"
                  style={{
                    width: '100%',
                    padding: '9px 14px',
                    borderRadius: '8px',
                    fontSize: '13px',
                  }}
                >
                  Gửi yêu cầu tham gia
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── 2. MY GROUP PAGE ────────────────────────────────────────────────────────
export const MyGroupPage: React.FC = () => {
  const [showPreview, setShowPreview] = useState<boolean>(true);

  return (
    <div>
      {/* Page Header */}
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
            Nhóm Của Tôi
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '4px', margin: 0 }}>
            Quản lý thông tin đề tài, danh sách thành viên và xét duyệt yêu cầu gia nhập nhóm môn EXE
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowPreview((v) => !v)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: 'var(--bg-card)',
            color: 'var(--text-secondary)',
            border: '1px solid var(--border-light)',
            borderRadius: '8px',
            padding: '7px 14px',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          {showPreview ? <EyeOff size={15} /> : <Eye size={15} />}
          <span>{showPreview ? 'Đóng dữ liệu mẫu' : 'Xem dữ liệu mẫu (Preview UI)'}</span>
        </button>
      </div>

      {!showPreview ? (
        <div
          style={{
            width: '100%',
            backgroundColor: 'var(--bg-card)',
            borderRadius: '16px',
            border: '1px dashed var(--border-medium)',
            padding: '60px 24px',
            textAlign: 'center',
          }}
        >
          <Users size={44} style={{ margin: '0 auto 12px auto', color: 'var(--text-muted)' }} />
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px' }}>
            Bạn chưa tham gia nhóm nào
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', maxWidth: 520, margin: '0 auto 18px auto', lineHeight: 1.5 }}>
            Hiện tại bạn chưa thuộc nhóm đề tài EXE nào. Bạn có thể tìm kiếm và gửi yêu cầu gia nhập các nhóm đang tuyển tại mục &quot;Khám phá nhóm&quot;, hoặc đề xuất ý tưởng dự án để thành lập nhóm mới.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={() => setShowPreview(true)}
              style={{
                backgroundColor: 'var(--pill-active-bg)',
                color: 'var(--pill-active-text)',
                borderRadius: '8px',
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: 600,
                border: '1px solid var(--pill-active-border)',
                cursor: 'pointer',
              }}
            >
              Bật xem dữ liệu mẫu
            </button>
            <a
              href="/projects"
              style={{
                backgroundColor: 'var(--bg-card)',
                color: 'var(--text-main)',
                border: '1px solid var(--border-light)',
                borderRadius: '8px',
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: 600,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              Đề xuất ý tưởng dự án
            </a>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Group Overview Banner */}
          <div
            style={{
              backgroundColor: 'var(--bg-card)',
              borderRadius: '16px',
              border: '1px solid var(--border-light)',
              padding: '24px',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      color: 'var(--text-secondary)',
                      backgroundColor: 'var(--bg-tag)',
                      border: '1px solid var(--border-light)',
                      padding: '3px 8px',
                      borderRadius: '6px',
                    }}
                  >
                    Môi trường & AI
                  </span>
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#15803D',
                      backgroundColor: '#F0FDF4',
                      border: '1px solid #DCFCE7',
                      padding: '3px 8px',
                      borderRadius: '6px',
                    }}
                  >
                    ● Đang hoạt động
                  </span>
                </div>
                <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 6px 0' }}>
                  EcoCampus - Hệ thống phân loại rác thông minh tích hợp AI
                </h2>
                <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
                  Ứng dụng Computer Vision tự động phân loại rác thải tại nguồn và tích điểm đổi quà tại căng tin trường cho sinh viên.
                </p>
              </div>

              <div
                style={{
                  backgroundColor: 'var(--bg-subtle)',
                  border: '1px solid var(--border-light)',
                  borderRadius: '10px',
                  padding: '10px 16px',
                  minWidth: '160px',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Sĩ số nhóm</div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-main)', marginTop: '2px' }}>3 / 5 thành viên</div>
                <div style={{ width: '100%', height: 6, backgroundColor: 'var(--border-subtle)', borderRadius: 9999, marginTop: 8, overflow: 'hidden' }}>
                  <div style={{ width: '60%', height: '100%', background: 'linear-gradient(90deg, #F27024 0%, #EA580C 100%)', borderRadius: 9999 }} />
                </div>
              </div>
            </div>
          </div>

          {/* 2 Column Layout: Members & Pending Requests */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
            {/* Column 1: Members */}
            <div
              style={{
                backgroundColor: 'var(--bg-card)',
                borderRadius: '16px',
                border: '1px solid var(--border-light)',
                padding: '22px',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '14px' }}>
                Thành viên chính thức (3)
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {/* Member 1 */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 4px',
                    borderBottom: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      className="avatar-pastel-0"
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '9999px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '13px',
                        flexShrink: 0,
                      }}
                    >
                      NT
                    </div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)' }}>Lữ Phước Nhật Tú</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>SE185102 • Kỹ thuật phần mềm (SE)</div>
                    </div>
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#F27024', backgroundColor: 'rgba(242, 111, 33, 0.1)', border: '1px solid rgba(242, 111, 33, 0.25)', padding: '3px 9px', borderRadius: '6px' }}>
                    Trưởng nhóm
                  </span>
                </div>

                {/* Member 2 */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 4px',
                    borderBottom: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      className="avatar-pastel-1"
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '9999px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '13px',
                        flexShrink: 0,
                      }}
                    >
                      MT
                    </div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)' }}>Nguyễn Minh Trọng</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>SE185103 • Trí tuệ nhân tạo (AI)</div>
                    </div>
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', backgroundColor: 'var(--bg-tag)', border: '1px solid var(--border-light)', padding: '3px 9px', borderRadius: '6px' }}>
                    Thành viên
                  </span>
                </div>

                {/* Member 3 */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 4px',
                    borderBottom: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      className="avatar-pastel-2"
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '9999px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '13px',
                        flexShrink: 0,
                      }}
                    >
                      TV
                    </div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)' }}>Trần Thảo Vy</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>GD185201 • Thiết kế đồ họa (GD)</div>
                    </div>
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', backgroundColor: 'var(--bg-tag)', border: '1px solid var(--border-light)', padding: '3px 9px', borderRadius: '6px' }}>
                    Thành viên
                  </span>
                </div>

                {/* Recruiting Slot Empty */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    border: '1px dashed var(--border-medium)',
                    backgroundColor: 'var(--bg-subtle)',
                    marginTop: '10px',
                  }}
                >
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                    Vị trí còn trống: <strong style={{ color: 'var(--text-main)' }}>+1 MKT (Digital Marketing)</strong>
                  </span>
                  <a href="/candidates" style={{ fontSize: '12px', color: '#F27024', fontWeight: 600, textDecoration: 'none' }}>
                    Tìm kiếm →
                  </a>
                </div>
              </div>
            </div>

            {/* Column 2: Pending Requests */}
            <div
              style={{
                backgroundColor: 'var(--bg-card)',
                borderRadius: '16px',
                border: '1px solid var(--border-light)',
                padding: '22px',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '14px' }}>
                Đơn xin gia nhập đang chờ duyệt (1)
              </h3>
              <div
                style={{
                  border: '1px solid var(--border-light)',
                  borderRadius: '12px',
                  padding: '16px',
                  backgroundColor: 'var(--bg-card)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      className="avatar-pastel-3"
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '9999px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '13px',
                        flexShrink: 0,
                      }}
                    >
                      HP
                    </div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)' }}>Hoàng Đình Phú</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>MK185301 • Marketing (MKT)</div>
                    </div>
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#B45309', backgroundColor: '#FEF3C7', padding: '2px 8px', borderRadius: '6px' }}>
                    Chờ duyệt
                  </span>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '8px 0 14px 0' }}>
                  &quot;Chào nhóm, mình có kinh nghiệm xây dựng kế hoạch Go-to-market và truyền thông chiến dịch sinh viên, rất muốn phụ trách mảng MKT cho EcoCampus.&quot;
                </p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => alert('Đã phê duyệt thành viên Hoàng Đình Phú vào nhóm!')}
                    className="btn-card-action"
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      cursor: 'pointer',
                    }}
                  >
                    Chấp nhận
                  </button>
                  <button
                    type="button"
                    onClick={() => alert('Đã từ chối đơn gia nhập.')}
                    className="btn-card-secondary"
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      cursor: 'pointer',
                    }}
                  >
                    Từ chối
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── 3. JOIN REQUESTS PAGE ───────────────────────────────────────────────────
export const JoinRequestsPage: React.FC = () => {
  const [showPreview, setShowPreview] = useState<boolean>(true);

  return (
    <div>
      {/* Page Header */}
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
            Yêu cầu Tham gia Nhóm {showPreview ? '(3/5)' : '(0/5)'}
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '4px', margin: 0 }}>
            Theo dõi trạng thái các đơn xin gia nhập nhóm của bạn (Tối đa 5 yêu cầu đang chờ duyệt cùng lúc)
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowPreview((v) => !v)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: 'var(--bg-card)',
            color: 'var(--text-secondary)',
            border: '1px solid var(--border-light)',
            borderRadius: '8px',
            padding: '7px 14px',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          {showPreview ? <EyeOff size={15} /> : <Eye size={15} />}
          <span>{showPreview ? 'Đóng dữ liệu mẫu' : 'Xem dữ liệu mẫu (Preview UI)'}</span>
        </button>
      </div>

      {!showPreview ? (
        <div
          style={{
            width: '100%',
            backgroundColor: 'var(--bg-card)',
            borderRadius: '16px',
            border: '1px dashed var(--border-medium)',
            padding: '60px 24px',
            textAlign: 'center',
          }}
        >
          <AlertCircle size={44} style={{ margin: '0 auto 12px auto', color: 'var(--text-muted)' }} />
          <h3 style={{ color: 'var(--text-main)', fontSize: '18px', fontWeight: 700, marginBottom: '6px' }}>
            Bạn chưa có yêu cầu gia nhập nào
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', maxWidth: 450, margin: '0 auto 18px auto', lineHeight: 1.5 }}>
            Hãy khám phá danh sách các nhóm đề tài đang tuyển người và gửi yêu cầu tham gia phù hợp với chuyên ngành của bạn.
          </p>
          <a
            href="/groups"
            style={{
              backgroundColor: 'var(--pill-active-bg)',
              color: 'var(--pill-active-text)',
              borderRadius: '8px',
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 600,
              textDecoration: 'none',
              display: 'inline-block',
            }}
          >
            Khám phá nhóm đề tài
          </a>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {MOCK_JOIN_REQUESTS.map((req) => (
            <div
              key={req.id}
              style={{
                backgroundColor: 'var(--bg-card)',
                borderRadius: '14px',
                border: '1px solid var(--border-light)',
                padding: '20px 22px',
                boxShadow: 'var(--shadow-sm)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <div style={{ flex: 1, minWidth: 260 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <h4 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                    {req.groupName}
                  </h4>
                  {req.status === 'Pending' && (
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#B45309', backgroundColor: '#FEF3C7', border: '1px solid #FDE68A', padding: '2px 8px', borderRadius: '6px' }}>
                      Đang chờ duyệt
                    </span>
                  )}
                  {req.status === 'Accepted' && (
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#15803D', backgroundColor: '#DCFCE7', border: '1px solid #BBF7D0', padding: '2px 8px', borderRadius: '6px' }}>
                      Đã chấp nhận
                    </span>
                  )}
                  {req.status === 'Rejected' && (
                    <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', backgroundColor: 'var(--bg-tag)', border: '1px solid var(--border-light)', padding: '2px 8px', borderRadius: '6px' }}>
                      Đã từ chối
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                  Trưởng nhóm: <strong style={{ color: 'var(--text-secondary)' }}>{req.leaderName}</strong> • Vị trí ứng tuyển: <strong style={{ color: 'var(--text-main)' }}>{req.roleApplied}</strong>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                  Lời nhắn: &quot;{req.message}&quot;
                </p>
              </div>

              <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Gửi ngày: {req.createdAt}</span>
                {req.status === 'Pending' && (
                  <button
                    type="button"
                    onClick={() => alert('Đã hủy yêu cầu gia nhập nhóm!')}
                    style={{
                      backgroundColor: 'var(--bg-card)',
                      color: '#DC2626',
                      border: '1px solid #FECACA',
                      borderRadius: '6px',
                      padding: '5px 12px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Hủy yêu cầu
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── 4. INVITATIONS PAGE ─────────────────────────────────────────────────────
export const InvitationsPage: React.FC = () => {
  const [showPreview, setShowPreview] = useState<boolean>(true);

  return (
    <div>
      {/* Page Header */}
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
            Lời mời Tham gia Nhóm {showPreview ? '(2)' : '(0)'}
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '4px', margin: 0 }}>
            Danh sách các lời mời từ các trưởng nhóm gửi đến bạn (Thời hạn phản hồi tự động trong 48 giờ)
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowPreview((v) => !v)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: 'var(--bg-card)',
            color: 'var(--text-secondary)',
            border: '1px solid var(--border-light)',
            borderRadius: '8px',
            padding: '7px 14px',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          {showPreview ? <EyeOff size={15} /> : <Eye size={15} />}
          <span>{showPreview ? 'Đóng dữ liệu mẫu' : 'Xem dữ liệu mẫu (Preview UI)'}</span>
        </button>
      </div>

      {!showPreview ? (
        <div
          style={{
            width: '100%',
            backgroundColor: 'var(--bg-card)',
            borderRadius: '16px',
            border: '1px dashed var(--border-medium)',
            padding: '60px 24px',
            textAlign: 'center',
          }}
        >
          <Mail size={44} style={{ margin: '0 auto 12px auto', color: 'var(--text-muted)' }} />
          <h3 style={{ color: 'var(--text-main)', fontSize: '18px', fontWeight: 700, marginBottom: '6px' }}>
            Bạn không có lời mời nào đang chờ
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', maxWidth: 450, margin: '0 auto 18px auto', lineHeight: 1.5 }}>
            Khi các trưởng nhóm tìm kiếm và gửi lời mời gia nhập đến bạn, danh sách lời mời sẽ xuất hiện tại đây.
          </p>
          <a
            href="/profile"
            style={{
              backgroundColor: 'var(--pill-active-bg)',
              color: 'var(--pill-active-text)',
              borderRadius: '8px',
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 600,
              textDecoration: 'none',
              display: 'inline-block',
            }}
          >
            Cập nhật kỹ năng hồ sơ
          </a>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {MOCK_INVITATIONS.map((inv) => (
            <div
              key={inv.id}
              style={{
                backgroundColor: 'var(--bg-card)',
                borderRadius: '16px',
                border: '1px solid var(--border-light)',
                padding: '22px',
                boxShadow: 'var(--shadow-sm)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                flexWrap: 'wrap',
                gap: '16px',
              }}
            >
              <div style={{ flex: 1, minWidth: 280 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <h4 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                    {inv.groupName}
                  </h4>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-main)', backgroundColor: 'var(--bg-tag)', border: '1px solid var(--border-light)', padding: '2px 8px', borderRadius: '6px' }}>
                    {inv.expiresIn}
                  </span>
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  Người gửi: <strong style={{ color: 'var(--text-secondary)' }}>{inv.leaderName}</strong> • Vị trí đề xuất: <strong style={{ color: 'var(--text-main)' }}>{inv.roleOffered}</strong>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                  &quot;{inv.message}&quot;
                </p>
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => alert(`Đã đồng ý gia nhập nhóm "${inv.groupName}"!`)}
                  className="btn-card-action"
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontSize: '13px',
                  }}
                >
                  Đồng ý gia nhập
                </button>
                <button
                  type="button"
                  onClick={() => alert('Đã từ chối lời mời gia nhập nhóm.')}
                  className="btn-card-secondary"
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontSize: '13px',
                  }}
                >
                  Từ chối
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

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
  const [items, setItems] = useState<NotificationResponse[]>(MOCK_NOTIFICATIONS);
  const [unreadCount, setUnreadCount] = useState<number>(2);
  const [filterUnread, setFilterUnread] = useState<boolean | undefined>(undefined);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
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
        // Fallback to realistic mock notifications
        let list = [...MOCK_NOTIFICATIONS];
        if (filterUnread !== undefined) {
          list = list.filter((n) => n.isRead === filterUnread);
        }
        setItems(list);
        setUnreadCount(list.filter((n) => !n.isRead).length);
      }
      window.dispatchEvent(new Event('notifications:updated'));
    } catch {
      // Offline fallback: Use mock notifications gracefully without displaying red errors
      let list = [...MOCK_NOTIFICATIONS];
      if (filterUnread !== undefined) {
        list = list.filter((n) => n.isRead === filterUnread);
      }
      setItems(list);
      setUnreadCount(list.filter((n) => !n.isRead).length);
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

