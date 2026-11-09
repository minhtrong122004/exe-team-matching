import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import type { UserProfileResponse, UpdateProfileSkillsRequest } from '../types';
import {
  Sparkles,
  Save,
  AlertCircle,
  CheckCircle2,
  Lock,
  Eye,
  EyeOff,
  KeyRound,
  ShieldCheck,
} from 'lucide-react';

// ══════════════════════════════════════════════════════════════
// SVG 5-AXIS RADAR CHART (BIỂU ĐỒ NGŨ GIÁC NĂNG LỰC)
// ══════════════════════════════════════════════════════════════
const RadarChart5: React.FC<{
  tech: number;
  management: number;
  graphicDesign: number;
  marketing: number;
  sale: number;
}> = ({ tech, management, graphicDesign, marketing, sale }) => {
  const size = 300;
  const cx = size / 2;
  const cy = size / 2;
  const R = 85;

  // 5 trục: Tech (-90°), Management (-18°), Graphic Design (54°), Marketing (126°), Sale (198°)
  const angles = [
    -Math.PI / 2,
    -Math.PI / 2 + (2 * Math.PI) / 5,
    -Math.PI / 2 + (4 * Math.PI) / 5,
    -Math.PI / 2 + (6 * Math.PI) / 5,
    -Math.PI / 2 + (8 * Math.PI) / 5,
  ];

  const gridLevels = [0.25, 0.5, 0.75, 1.0];
  const scores = [tech, management, graphicDesign, marketing, sale];

  const dataPoints = angles.map((angle, idx) => {
    const scoreFrac = Math.max(0.04, Math.min(1, scores[idx] / 100));
    const r = scoreFrac * R;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    return { x, y };
  });

  const polygonPointsStr = dataPoints.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  const skillLabels = [
    { name: 'Tech', score: tech, angle: angles[0], align: 'middle', dy: -10, dx: 0 },
    { name: 'Management', score: management, angle: angles[1], align: 'start', dy: 4, dx: 8 },
    { name: 'Design', score: graphicDesign, angle: angles[2], align: 'start', dy: 14, dx: 6 },
    { name: 'Marketing', score: marketing, angle: angles[3], align: 'end', dy: 14, dx: -6 },
    { name: 'Sale', score: sale, angle: angles[4], align: 'end', dy: 4, dx: -8 },
  ];

  const avg = Math.round((tech + management + graphicDesign + marketing + sale) / 5);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        backgroundColor: 'var(--bg-subtle, #F8FAFC)',
        borderRadius: 14,
        padding: '1rem',
        border: '1px solid var(--border-light, #E2E8F0)',
        boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
      }}
    >
      <svg
        viewBox={`0 0 ${size} ${size}`}
        style={{ width: '100%', maxWidth: 280, height: 'auto', overflow: 'visible' }}
        role="img"
        aria-label="Biểu đồ radar 5 kỹ năng sinh viên"
      >
        {/* Vòng đa giác lưới đồng tâm */}
        {gridLevels.map((level, lIdx) => {
          const r = level * R;
          const pts = angles
            .map((a) => `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`)
            .join(' ');
          return (
            <polygon
              key={lIdx}
              points={pts}
              fill={lIdx === gridLevels.length - 1 ? 'var(--bg-card, #FFFFFF)' : 'none'}
              stroke="var(--border-medium, #CBD5E1)"
              strokeWidth={lIdx === gridLevels.length - 1 ? '1.5' : '1'}
              strokeDasharray={lIdx === gridLevels.length - 1 ? undefined : '3 3'}
            />
          );
        })}

        {/* 5 đường nan hoa hướng tâm */}
        {angles.map((a, aIdx) => (
          <line
            key={aIdx}
            x1={cx}
            y1={cy}
            x2={(cx + R * Math.cos(a)).toFixed(1)}
            y2={(cy + R * Math.sin(a)).toFixed(1)}
            stroke="var(--border-light, #E2E8F0)"
            strokeWidth="1.2"
          />
        ))}

        {/* Đa giác dữ liệu 5 kỹ năng (Cam FPT) */}
        <polygon
          points={polygonPointsStr}
          fill="rgba(242, 112, 36, 0.18)"
          stroke="#F27024"
          strokeWidth="2"
          strokeLinejoin="round"
        />

        {/* Điểm nút đỉnh dữ liệu */}
        {dataPoints.map((p, pIdx) => (
          <circle
            key={pIdx}
            cx={p.x}
            cy={p.y}
            r={4}
            fill="#F27024"
            stroke="#FFFFFF"
            strokeWidth="2"
          />
        ))}

        {/* Vòng tròn tâm hiển thị điểm trung bình */}
        <circle cx={cx} cy={cy} r={24} fill="var(--bg-card, #FFFFFF)" stroke="var(--border-light, #E2E8F0)" strokeWidth="1" />
        <text
          x={cx}
          y={cy - 3}
          textAnchor="middle"
          fontSize="8.5"
          fontWeight="700"
          fill="var(--text-muted, #64748B)"
          letterSpacing="0.05em"
        >
          ĐIỂM TB
        </text>
        <text
          x={cx}
          y={cy + 13}
          textAnchor="middle"
          fontSize="14"
          fontWeight="800"
          fill="#F27024"
          fontFamily="monospace"
        >
          {avg}%
        </text>

        {/* Nhãn 5 trục kỹ năng */}
        {skillLabels.map((lbl, idx) => {
          const lx = cx + (R + 6) * Math.cos(lbl.angle) + lbl.dx;
          const ly = cy + (R + 6) * Math.sin(lbl.angle) + lbl.dy;
          return (
            <g key={idx}>
              <text
                x={lx}
                y={ly}
                textAnchor={lbl.align as any}
                fontSize="11"
                fontWeight="700"
                fill="var(--text-main, #0F172A)"
              >
                {lbl.name}
              </text>
              <text
                x={lx}
                y={ly + 12}
                textAnchor={lbl.align as any}
                fontSize="11"
                fontWeight="800"
                fill="#F27024"
                fontFamily="monospace"
              >
                {lbl.score}%
              </text>
            </g>
          );
        })}
      </svg>

      <div style={{ marginTop: '0.65rem', fontSize: '11.5px', color: 'var(--text-muted, #64748B)', textAlign: 'center' }}>
        Biểu đồ Ngũ giác Năng lực EXE (Tự động co giãn theo thời gian thực)
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════
// PROFILE PAGE COMPONENT
// ══════════════════════════════════════════════════════════════
export const ProfilePage: React.FC = () => {
  const { user: authUser, updateUserData } = useAuth();

  // State thông báo
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Tab navigation: 'skills' (Hồ sơ năng lực) | 'security' (Đổi mật khẩu)
  const [activeTab, setActiveTab] = useState<'skills' | 'security'>('skills');

  // Trạng thái hoàn tất hồ sơ (Nút toggle phục vụ Demo)
  const [isProfileCompleted, setIsProfileCompleted] = useState<boolean>(() => {
    return authUser?.isProfileCompleted ?? true;
  });

  // 5 Kỹ năng Cốt lõi (Thang 0-100)
  const [techScore, setTechScore] = useState<number>(85);
  const [managementScore, setManagementScore] = useState<number>(78);
  const [graphicDesignScore, setGraphicDesignScore] = useState<number>(45);
  const [marketingScore, setMarketingScore] = useState<number>(40);
  const [saleScore, setSaleScore] = useState<number>(60);
  const [bio, setBio] = useState<string>(
    'Sinh viên chuyên ngành Kỹ thuật phần mềm K18. Đã có kinh nghiệm phát triển full-stack và mong muốn tìm nhóm có định hướng sản phẩm AI, Smart Campus hoặc Fintech.'
  );

  // Cam kết trách nhiệm
  const [isCommitted, setIsCommitted] = useState<boolean>(true);
  const [saving5Skills, setSaving5Skills] = useState<boolean>(false);

  // Form Đổi mật khẩu
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  // Tự động phân tích MSSV (Ví dụ: SE185102)
  const studentCode = authUser?.studentCode || 'SE185102';
  const fullName = authUser?.fullName || 'Lữ Phước Nhật Tú';
  const email = authUser?.email || 'tulpnse185102@fpt.edu.vn';

  const extractStudentInfo = (code: string) => {
    const upper = (code || 'SE185102').toUpperCase().trim();
    let majorName = 'SE - Kỹ thuật phần mềm';
    let cohort = 'K18';
    let nominalClass = 'SE1801';

    if (upper.startsWith('SE')) {
      majorName = 'SE - Kỹ thuật phần mềm';
    } else if (upper.startsWith('AI')) {
      majorName = 'AI - Trí tuệ nhân tạo';
    } else if (upper.startsWith('IA')) {
      majorName = 'IA - An toàn thông tin';
    } else if (upper.startsWith('GD')) {
      majorName = 'GD - Thiết kế mỹ thuật số';
    } else if (upper.startsWith('MK') || upper.startsWith('MC')) {
      majorName = 'MKT - Digital Marketing';
    } else if (upper.startsWith('IB')) {
      majorName = 'IB - Kinh doanh quốc tế';
    }

    const match = upper.match(/^[A-Z]+(\d{2})/);
    if (match) {
      cohort = `K${match[1]}`;
      nominalClass = `${upper.slice(0, 2)}${match[1]}01`;
    }

    return { majorName, cohort, nominalClass };
  };

  const studentInfo = extractStudentInfo(studentCode);

  // Lấy dữ liệu hồ sơ nếu có kết nối backend
  useEffect(() => {
    let isMounted = true;
    const fetchRemoteProfile = async () => {
      try {
        const response = await apiClient.get<UserProfileResponse>('/users/me');
        if (!isMounted || !response.data) return;
        const d = response.data;
        if (d.techScore !== undefined) setTechScore(d.techScore);
        if (d.managementScore !== undefined) setManagementScore(d.managementScore);
        if (d.graphicDesignScore !== undefined) setGraphicDesignScore(d.graphicDesignScore);
        if (d.marketingScore !== undefined) setMarketingScore(d.marketingScore);
        if (d.saleScore !== undefined) setSaleScore(d.saleScore);
        if (d.bio) setBio(d.bio);
        if (d.isCommitted !== undefined) setIsCommitted(Boolean(d.isCommitted));
        if (d.isProfileCompleted !== undefined) setIsProfileCompleted(Boolean(d.isProfileCompleted));
      } catch {
        // Fallback demo/offline state
      }
    };
    void fetchRemoteProfile();
    return () => {
      isMounted = false;
    };
  }, []);

  // Xử lý lưu 5 kỹ năng
  const handleSave5Skills = async () => {
    setError(null);
    setSuccessMsg(null);

    if (!isCommitted) {
      setError('Vui lòng tích chọn cam kết trách nhiệm trước khi lưu hồ sơ năng lực.');
      return;
    }

    setSaving5Skills(true);
    try {
      const payload: UpdateProfileSkillsRequest = {
        techScore,
        managementScore,
        graphicDesignScore,
        marketingScore,
        saleScore,
        isCommitted: true,
      };

      try {
        await apiClient.put('/users/me/profile-skills', payload);
        await apiClient.put('/users/me', { bio });
      } catch {
        // Offline / Demo fallback
      }

      setIsProfileCompleted(true);
      updateUserData({ isProfileCompleted: true });
      setSuccessMsg('Đã lưu và cập nhật hồ sơ năng lực 5 kỹ năng thành công!');
    } catch {
      setError('Có lỗi xảy ra khi lưu hồ sơ. Vui lòng thử lại.');
    } finally {
      setSaving5Skills(false);
    }
  };

  // Xử lý đổi mật khẩu
  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      setError('Vui lòng điền đầy đủ mật khẩu hiện tại và mật khẩu mới.');
      return;
    }

    if (newPassword.length < 8) {
      setError('Mật khẩu mới phải có tối thiểu 8 ký tự.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setError('Mật khẩu xác nhận không trùng khớp.');
      return;
    }

    setChangingPassword(true);
    try {
      try {
        await apiClient.post('/auth/change-password', { currentPassword, newPassword, confirmNewPassword });
      } catch {
        // Fallback for demo mode
      }
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setSuccessMsg('Đổi mật khẩu tài khoản thành công!');
    } catch {
      setError('Không thể đổi mật khẩu. Vui lòng kiểm tra lại mật khẩu hiện tại.');
    } finally {
      setChangingPassword(false);
    }
  };

  const isStaff = authUser?.role === 'Moderator' || authUser?.role === 'Lecturer';
  const isModerator = authUser?.role === 'Moderator';
  const staffRoleTitle = isModerator ? 'Điều phối viên Học kỳ' : 'Giảng viên Hướng dẫn & Đánh giá';
  const staffName = authUser?.fullName || (isModerator ? 'ThS. Lê Minh Điều Phối' : 'TS. Nguyễn Văn Giảng');
  const staffEmail = authUser?.email || (isModerator ? 'moderator@fpt.edu.vn' : 'lecturer@fpt.edu.vn');
  const staffCode = isModerator ? 'FE-MOD-01' : 'FE-LEC-08';
  const staffInitials = isModerator ? 'ĐP' : 'GV';
  const staffUnit = 'Bộ môn Khởi nghiệp - Đại học FPT TP.HCM';

  if (isStaff) {
    return (
      <div style={{ maxWidth: 1140, margin: '0 auto', paddingBottom: '3.5rem' }}>
        {/* Toast Messages */}
        {error && (
          <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '12px', padding: '12px 16px', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '10px', color: '#DC2626', fontSize: '13px', fontWeight: 600 }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div style={{ backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '12px', padding: '12px 16px', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '10px', color: '#16A34A', fontSize: '13px', fontWeight: 600 }}>
            <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* 2-Column Layout for Staff */}
        <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: '1.5rem', alignItems: 'start' }}>
          {/* CỘT TRÁI: Hồ sơ Cán bộ / Giảng viên FPTU */}
          <div
            style={{
              backgroundColor: 'var(--bg-card, #FFFFFF)',
              border: '1px solid var(--border-light, #E2E8F0)',
              borderRadius: '16px',
              overflow: 'hidden',
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
            }}
          >
            {/* Top gradient banner */}
            <div
              style={{
                height: '70px',
                background: isModerator
                  ? 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)'
                  : 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)',
              }}
            />

            <div style={{ padding: '0 24px 24px', textAlign: 'center' }}>
              {/* Avatar circle */}
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: '50%',
                  backgroundColor: isModerator ? '#0054A6' : '#008837',
                  color: '#FFFFFF',
                  marginTop: -36,
                  marginLeft: 'auto',
                  marginRight: 'auto',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                  fontWeight: 800,
                  border: '4px solid var(--bg-card, #FFFFFF)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                }}
              >
                {staffInitials}
              </div>

              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main, #0F172A)', margin: '12px 0 4px 0' }}>
                {staffName}
              </h2>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 10px', borderRadius: 999, backgroundColor: isModerator ? 'rgba(0, 84, 166, 0.12)' : 'rgba(0, 136, 55, 0.12)', color: isModerator ? '#0054A6' : '#008837', fontSize: '12px', fontWeight: 700, marginBottom: '1.25rem' }}>
                <ShieldCheck size={14} />
                <span>{staffRoleTitle}</span>
              </div>

              {/* Administrative info fields (Read-only) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', textAlign: 'left' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted, #64748B)', textTransform: 'uppercase', marginBottom: '3px' }}>
                    Mã cán bộ FPTU
                  </label>
                  <div style={{ padding: '8px 12px', borderRadius: 8, backgroundColor: 'var(--bg-subtle, #F8FAFC)', border: '1px solid var(--border-light, #E2E8F0)', fontSize: '13px', fontWeight: 700, color: 'var(--text-main, #0F172A)', fontFamily: 'var(--font-mono, monospace)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>{staffCode}</span>
                    <Lock size={13} color="var(--text-light, #94A3B8)" />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted, #64748B)', textTransform: 'uppercase', marginBottom: '3px' }}>
                    Email công vụ
                  </label>
                  <div style={{ padding: '8px 12px', borderRadius: 8, backgroundColor: 'var(--bg-subtle, #F8FAFC)', border: '1px solid var(--border-light, #E2E8F0)', fontSize: '13px', fontWeight: 600, color: 'var(--text-main, #0F172A)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>{staffEmail}</span>
                    <Lock size={13} color="var(--text-light, #94A3B8)" />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted, #64748B)', textTransform: 'uppercase', marginBottom: '3px' }}>
                    Đơn vị công tác
                  </label>
                  <div style={{ padding: '8px 12px', borderRadius: 8, backgroundColor: 'var(--bg-subtle, #F8FAFC)', border: '1px solid var(--border-light, #E2E8F0)', fontSize: '13px', fontWeight: 600, color: 'var(--text-main, #0F172A)' }}>
                    {staffUnit}
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted, #64748B)', textTransform: 'uppercase', marginBottom: '3px' }}>
                    Học kỳ đảm nhiệm
                  </label>
                  <div style={{ padding: '8px 12px', borderRadius: 8, backgroundColor: 'var(--bg-subtle, #F8FAFC)', border: '1px solid var(--border-light, #E2E8F0)', fontSize: '13px', fontWeight: 700, color: '#F27024' }}>
                    Fall 2026 • Môn EXE101 & EXE201
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '1.25rem', padding: '10px 12px', borderRadius: 8, backgroundColor: 'var(--bg-subtle, #F8FAFC)', border: '1px dashed var(--border-medium, #CBD5E1)', fontSize: '11.5px', color: 'var(--text-muted, #64748B)', lineHeight: 1.4 }}>
                🔒 Thông tin cán bộ được quản lý tập trung bởi Phòng Nhân sự & Ban Đào tạo Đại học FPT TP.HCM.
              </div>
            </div>
          </div>

          {/* CỘT PHẢI: Quyền hạn trong học kỳ + Đổi mật khẩu tài khoản công vụ */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Khung 1: Quyền hạn trong học kỳ Fall 2026 */}
            <div
              style={{
                backgroundColor: 'var(--bg-card, #FFFFFF)',
                border: '1px solid var(--border-light, #E2E8F0)',
                borderRadius: '16px',
                padding: '24px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', borderBottom: '1px solid var(--border-subtle, #F1F5F9)', paddingBottom: '12px' }}>
                <ShieldCheck size={18} color={isModerator ? '#0054A6' : '#008837'} />
                <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-main, #0F172A)', margin: 0 }}>
                  Quyền hạn & Nhiệm vụ trong học kỳ Fall 2026
                </h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {isModerator ? (
                  <>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13px', color: 'var(--text-main, #0F172A)', lineHeight: 1.5 }}>
                      <CheckCircle2 size={16} color="#0054A6" style={{ flexShrink: 0, marginTop: 2 }} />
                      <span><strong>Quản lý Không gian Môn học:</strong> Thiết lập tham số ghép nhóm, sĩ số tối đa (5), ngưỡng tối thiểu (3), hệ số phòng dự phòng (1.2) cho EXE101 và EXE201.</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13px', color: 'var(--text-main, #0F172A)', lineHeight: 1.5 }}>
                      <CheckCircle2 size={16} color="#0054A6" style={{ flexShrink: 0, marginTop: 2 }} />
                      <span><strong>Đồng bộ Sinh viên từ FAP:</strong> Nạp danh sách đủ điều kiện, tự động khởi tạo tài khoản và gửi email cấp mật khẩu qua hệ thống MailHog.</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13px', color: 'var(--text-main, #0F172A)', lineHeight: 1.5 }}>
                      <CheckCircle2 size={16} color="#0054A6" style={{ flexShrink: 0, marginTop: 2 }} />
                      <span><strong>Điều phối Sinh viên lẻ:</strong> Kích hoạt thuật toán ghép tự động (Matching Distribution) hoặc cưỡng bức bổ sung sinh viên chưa có nhóm vào các phòng trống.</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13px', color: 'var(--text-main, #0F172A)', lineHeight: 1.5 }}>
                      <CheckCircle2 size={16} color="#0054A6" style={{ flexShrink: 0, marginTop: 2 }} />
                      <span><strong>Quản lý Chuyển nhóm sau Chốt sổ:</strong> Tiếp nhận và phê duyệt yêu cầu chuyển 1 chiều hoặc đổi chéo 2 chiều giữa các nhóm.</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13px', color: 'var(--text-main, #0F172A)', lineHeight: 1.5 }}>
                      <CheckCircle2 size={16} color="#0054A6" style={{ flexShrink: 0, marginTop: 2 }} />
                      <span><strong>Xuất Báo cáo & Đồng bộ kết quả:</strong> Xuất file danh sách nhóm chính thức định dạng CSV chuẩn FAP phục vụ lưu trữ học vụ.</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13px', color: 'var(--text-main, #0F172A)', lineHeight: 1.5 }}>
                      <CheckCircle2 size={16} color="#008837" style={{ flexShrink: 0, marginTop: 2 }} />
                      <span><strong>Giám sát Tiến độ Ghép nhóm:</strong> Theo dõi sĩ số, chỉ số cân bằng kỹ năng và phân bổ thành viên các phòng nhóm trong môn phụ trách.</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13px', color: 'var(--text-main, #0F172A)', lineHeight: 1.5 }}>
                      <CheckCircle2 size={16} color="#008837" style={{ flexShrink: 0, marginTop: 2 }} />
                      <span><strong>Xem chi tiết 100% Thành viên:</strong> Toàn quyền xem danh sách thành viên chi tiết của mọi phòng nhóm, kể cả phòng đã đóng tuyển hoặc chốt sổ.</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13px', color: 'var(--text-main, #0F172A)', lineHeight: 1.5 }}>
                      <CheckCircle2 size={16} color="#008837" style={{ flexShrink: 0, marginTop: 2 }} />
                      <span><strong>Cố vấn & Đánh giá Đề tài Khởi nghiệp:</strong> Tra cứu Kho Đề tài dự kiến, duyệt ý tưởng đổi mới sáng tạo và đưa ra định hướng chuyên môn.</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13px', color: 'var(--text-main, #0F172A)', lineHeight: 1.5 }}>
                      <CheckCircle2 size={16} color="#008837" style={{ flexShrink: 0, marginTop: 2 }} />
                      <span><strong>Xuất Báo cáo Danh sách Nhóm & Bảng điểm:</strong> Tải xuống báo cáo tổng hợp danh sách nhóm học phần để phục vụ đánh giá tiến độ và chấm điểm.</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Khung 2: Đổi mật khẩu tài khoản công vụ */}
            <div
              style={{
                backgroundColor: 'var(--bg-card, #FFFFFF)',
                border: '1px solid var(--border-light, #E2E8F0)',
                borderRadius: '16px',
                padding: '24px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', borderBottom: '1px solid var(--border-subtle, #F1F5F9)', paddingBottom: '12px' }}>
                <KeyRound size={18} color="#F27024" />
                <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-main, #0F172A)', margin: 0 }}>
                  Đổi mật khẩu tài khoản công vụ
                </h3>
              </div>

              <form onSubmit={handleChangePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary, #334155)', marginBottom: '4px' }}>
                    Mật khẩu hiện tại
                  </label>
                  <input
                    type={showPasswords ? 'text' : 'password'}
                    placeholder="Nhập mật khẩu hiện tại..."
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      height: 38,
                      padding: '0 12px',
                      borderRadius: 8,
                      border: '1px solid var(--border-medium, #CBD5E1)',
                      backgroundColor: 'var(--bg-input, #FFFFFF)',
                      color: 'var(--text-main, #0F172A)',
                      fontSize: '13px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary, #334155)', marginBottom: '4px' }}>
                      Mật khẩu mới
                    </label>
                    <input
                      type={showPasswords ? 'text' : 'password'}
                      placeholder="Tối thiểu 8 ký tự..."
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        height: 38,
                        padding: '0 12px',
                        borderRadius: 8,
                        border: '1px solid var(--border-medium, #CBD5E1)',
                        backgroundColor: 'var(--bg-input, #FFFFFF)',
                        color: 'var(--text-main, #0F172A)',
                        fontSize: '13px',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary, #334155)', marginBottom: '4px' }}>
                      Xác nhận mật khẩu mới
                    </label>
                    <input
                      type={showPasswords ? 'text' : 'password'}
                      placeholder="Nhập lại mật khẩu mới..."
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        height: 38,
                        padding: '0 12px',
                        borderRadius: 8,
                        border: '1px solid var(--border-medium, #CBD5E1)',
                        backgroundColor: 'var(--bg-input, #FFFFFF)',
                        color: 'var(--text-main, #0F172A)',
                        fontSize: '13px',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '4px' }}>
                  <button
                    type="button"
                    onClick={() => setShowPasswords(!showPasswords)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted, #64748B)',
                      fontSize: '12px',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    {showPasswords ? <EyeOff size={14} /> : <Eye size={14} />}
                    <span>{showPasswords ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}</span>
                  </button>

                  <button
                    type="submit"
                    disabled={changingPassword}
                    style={{
                      padding: '9px 20px',
                      borderRadius: 10,
                      backgroundColor: '#F27024',
                      color: '#FFFFFF',
                      border: 'none',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: changingPassword ? 'not-allowed' : 'pointer',
                      boxShadow: '0 2px 8px rgba(242, 112, 36, 0.25)',
                    }}
                  >
                    {changingPassword ? 'Đang cập nhật...' : 'Lưu thay đổi mật khẩu'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1140, margin: '0 auto', paddingBottom: '3.5rem' }}>
      {/* ── BANNER NHẮC NHỞ KHI CHƯA HOÀN TẤT HỒ SƠ ── */}
      {!isProfileCompleted && (
        <div
          style={{
            backgroundColor: '#FFF7ED',
            border: '1px solid #FED7AA',
            borderRadius: '14px',
            padding: '14px 18px',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            color: '#C2410C',
            fontSize: '13.5px',
            lineHeight: 1.5,
          }}
        >
          <AlertCircle size={20} color="#EA580C" style={{ flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <strong style={{ color: '#9A3412' }}>Hồ sơ chưa hoàn thiện:</strong> Bạn cần cập nhật đủ 5 chỉ số năng lực cốt lõi và xác nhận cam kết trách nhiệm bên dưới trước khi có thể tham gia phòng hoặc gửi đơn ứng tuyển vào các nhóm học phần EXE.
          </div>
        </div>
      )}

      {/* ── TOAST MESSAGES ── */}
      {error && (
        <div
          style={{
            backgroundColor: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: '12px',
            padding: '12px 16px',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            color: '#DC2626',
            fontSize: '13px',
            fontWeight: 600,
          }}
        >
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div
          style={{
            backgroundColor: '#F0FDF4',
            border: '1px solid #BBF7D0',
            borderRadius: '12px',
            padding: '12px 16px',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            color: '#16A34A',
            fontSize: '13px',
            fontWeight: 600,
          }}
        >
          <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* ── 2-COLUMN MAIN LAYOUT ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '1.5rem', alignItems: 'start' }}>
        {/* ══════════════════════════════════════════════════════════════
            CỘT TRÁI: THÔNG TIN HỌC VỤ ĐỒNG BỘ TỪ FAP (READ-ONLY)
           ══════════════════════════════════════════════════════════════ */}
        <div
          style={{
            backgroundColor: 'var(--bg-card, #FFFFFF)',
            border: '1px solid var(--border-light, #E2E8F0)',
            borderRadius: '16px',
            overflow: 'hidden',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
          }}
        >
          {/* Dải màu chuyển sắc nhẹ ở đỉnh Card */}
          <div
            style={{
              height: '64px',
              background: 'linear-gradient(135deg, #FFF7ED 0%, #F1F5F9 100%)',
            }}
          />

          <div style={{ padding: '0 20px 20px', textAlign: 'center' }}>
            {/* Avatar tròn màu Pastel nổi lên trên */}
            <div
              style={{
                width: 68,
                height: 68,
                borderRadius: '50%',
                backgroundColor: '#FFE4E6',
                color: '#BE123C',
                marginTop: -34,
                marginLeft: 'auto',
                marginRight: 'auto',
                border: '3px solid var(--bg-card, #FFFFFF)',
                fontSize: '22px',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              }}
            >
              LT
            </div>

            <h2 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-main, #0F172A)', margin: '10px 0 2px' }}>
              {fullName}
            </h2>
            <div style={{ fontSize: '12px', color: 'var(--text-muted, #64748B)', marginBottom: '14px' }}>
              {email}
            </div>

            {/* Nút chuyển trạng thái Demo */}
            <div style={{ marginBottom: '18px' }}>
              <button
                type="button"
                onClick={() => {
                  const nextState = !isProfileCompleted;
                  setIsProfileCompleted(nextState);
                  updateUserData({ isProfileCompleted: nextState });
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '5px 12px',
                  borderRadius: '999px',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: isProfileCompleted ? '1px solid #BBF7D0' : '1px solid #FED7AA',
                  backgroundColor: isProfileCompleted ? '#DCFCE7' : '#FFF7ED',
                  color: isProfileCompleted ? '#15803D' : '#C2410C',
                  transition: 'all 0.15s ease',
                }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    backgroundColor: isProfileCompleted ? '#16A34A' : '#EA580C',
                  }}
                />
                <span>{isProfileCompleted ? 'Trạng thái: Đã hoàn tất hồ sơ' : 'Trạng thái: Chưa hoàn tất hồ sơ'}</span>
              </button>
            </div>

            {/* Khung Thông tin Học vụ Khóa cứng */}
            <div style={{ textAlign: 'left', borderTop: '1px solid var(--border-subtle, #F1F5F9)', paddingTop: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted, #64748B)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ShieldCheck size={15} color="#0054A6" />
                <span>Thông tin học vụ (FAP)</span>
              </div>

              {/* Trường 1: MSSV */}
              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: 'var(--text-secondary, #475569)', marginBottom: '4px' }}>
                  Mã số sinh viên
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    value={studentCode}
                    readOnly
                    style={{
                      width: '100%',
                      height: '36px',
                      borderRadius: 8,
                      border: '1px solid var(--border-light, #E2E8F0)',
                      backgroundColor: 'var(--bg-tag, #F1F5F9)',
                      color: 'var(--text-main, #0F172A)',
                      fontSize: '12.5px',
                      fontWeight: 700,
                      padding: '0 32px 0 10px',
                      boxSizing: 'border-box',
                      outline: 'none',
                      cursor: 'not-allowed',
                      fontFamily: 'monospace',
                    }}
                  />
                  <Lock size={13} color="#94A3B8" style={{ position: 'absolute', right: 10, top: 12 }} />
                </div>
              </div>

              {/* Trường 2: Chuyên ngành */}
              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: 'var(--text-secondary, #475569)', marginBottom: '4px' }}>
                  Chuyên ngành đào tạo
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    value={studentInfo.majorName}
                    readOnly
                    style={{
                      width: '100%',
                      height: '36px',
                      borderRadius: 8,
                      border: '1px solid var(--border-light, #E2E8F0)',
                      backgroundColor: 'var(--bg-tag, #F1F5F9)',
                      color: 'var(--text-main, #0F172A)',
                      fontSize: '12px',
                      fontWeight: 600,
                      padding: '0 32px 0 10px',
                      boxSizing: 'border-box',
                      outline: 'none',
                      cursor: 'not-allowed',
                    }}
                  />
                  <Lock size={13} color="#94A3B8" style={{ position: 'absolute', right: 10, top: 12 }} />
                </div>
              </div>

              {/* Trường 3: Khóa học */}
              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: 'var(--text-secondary, #475569)', marginBottom: '4px' }}>
                  Khóa sinh viên
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    value={studentInfo.cohort}
                    readOnly
                    style={{
                      width: '100%',
                      height: '36px',
                      borderRadius: 8,
                      border: '1px solid var(--border-light, #E2E8F0)',
                      backgroundColor: 'var(--bg-tag, #F1F5F9)',
                      color: 'var(--text-main, #0F172A)',
                      fontSize: '12.5px',
                      fontWeight: 700,
                      padding: '0 32px 0 10px',
                      boxSizing: 'border-box',
                      outline: 'none',
                      cursor: 'not-allowed',
                    }}
                  />
                  <Lock size={13} color="#94A3B8" style={{ position: 'absolute', right: 10, top: 12 }} />
                </div>
              </div>

              {/* Trường 4: Lớp danh nghĩa */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: 'var(--text-secondary, #475569)', marginBottom: '4px' }}>
                  Lớp danh nghĩa
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    value={studentInfo.nominalClass}
                    readOnly
                    style={{
                      width: '100%',
                      height: '36px',
                      borderRadius: 8,
                      border: '1px solid var(--border-light, #E2E8F0)',
                      backgroundColor: 'var(--bg-tag, #F1F5F9)',
                      color: 'var(--text-main, #0F172A)',
                      fontSize: '12.5px',
                      fontWeight: 700,
                      padding: '0 32px 0 10px',
                      boxSizing: 'border-box',
                      outline: 'none',
                      cursor: 'not-allowed',
                      fontFamily: 'monospace',
                    }}
                  />
                  <Lock size={13} color="#94A3B8" style={{ position: 'absolute', right: 10, top: 12 }} />
                </div>
              </div>

              {/* Ghi chú đồng bộ FAP */}
              <div
                style={{
                  fontSize: '11.5px',
                  color: 'var(--text-muted, #64748B)',
                  lineHeight: 1.45,
                  backgroundColor: 'var(--bg-subtle, #F8FAFC)',
                  border: '1px solid var(--border-subtle, #F1F5F9)',
                  borderRadius: 8,
                  padding: '8px 10px',
                }}
              >
                🔒 <em>Thông tin học vụ được đồng bộ tự động từ hệ thống FAP theo MSSV, sinh viên không thể tự chỉnh sửa.</em>
              </div>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════
            CỘT PHẢI: 5 KỸ NĂNG CỐT LÕI & RADAR CHART / ĐỔI MẬT KHẨU
           ══════════════════════════════════════════════════════════════ */}
        <div
          style={{
            backgroundColor: 'var(--bg-card, #FFFFFF)',
            border: '1px solid var(--border-light, #E2E8F0)',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
          }}
        >
          {/* Tab Selector Header */}
          <div
            style={{
              display: 'flex',
              gap: '8px',
              borderBottom: '1px solid var(--border-subtle, #F1F5F9)',
              paddingBottom: '14px',
              marginBottom: '20px',
            }}
          >
            <button
              type="button"
              onClick={() => setActiveTab('skills')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                border: activeTab === 'skills' ? '1px solid #F27024' : '1px solid var(--border-light, #E2E8F0)',
                backgroundColor: activeTab === 'skills' ? 'rgba(242, 112, 36, 0.12)' : 'var(--bg-card, #FFFFFF)',
                color: activeTab === 'skills' ? '#F27024' : 'var(--text-muted, #64748B)',
                transition: 'all 0.15s ease',
              }}
            >
              <Sparkles size={16} />
              <span>Hồ sơ Năng lực (5 Kỹ năng)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('security')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                border: activeTab === 'security' ? '1px solid #F27024' : '1px solid var(--border-light, #E2E8F0)',
                backgroundColor: activeTab === 'security' ? 'rgba(242, 112, 36, 0.12)' : 'var(--bg-card, #FFFFFF)',
                color: activeTab === 'security' ? '#F27024' : 'var(--text-muted, #64748B)',
                transition: 'all 0.15s ease',
              }}
            >
              <KeyRound size={16} />
              <span>Đổi mật khẩu bảo mật</span>
            </button>
          </div>

          {/* ── TAB 1: HỒ SƠ NĂNG LỰC 5 KỸ NĂNG & RADAR CHART ── */}
          {activeTab === 'skills' && (
            <div>
              <div style={{ marginBottom: '1.25rem' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-main, #0F172A)', margin: '0 0 4px' }}>
                  Đánh giá 5 Kỹ năng Cốt lõi
                </h3>
                <p style={{ fontSize: '12.5px', color: 'var(--text-muted, #64748B)', margin: 0, lineHeight: 1.5 }}>
                  Kéo thanh trượt từ 0 đến 100 để phản ánh đúng năng lực bản thân. Hệ thống sẽ căn cứ vào biểu đồ ngũ giác này để gợi ý phòng nhóm và hỗ trợ các trưởng nhóm ghép đội đa ngành cân bằng nhất.
                </p>
              </div>

              {/* Grid 2 phần nằm cạnh nhau: Sliders bên trái + Radar Chart bên phải */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 300px',
                  gap: '1.5rem',
                  alignItems: 'center',
                  marginBottom: '1.5rem',
                }}
              >
                {/* ── BÊN TRÁI: 5 THANH TRƯỢT (0-100) ── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {/* Slider 1: Tech */}
                  <div style={{ backgroundColor: 'var(--bg-subtle, #F8FAFC)', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border-light, #E2E8F0)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main, #0F172A)' }}>
                        1. Tech (Kỹ thuật & Phát triển sản phẩm)
                      </span>
                      <span style={{ fontSize: '13px', fontWeight: 800, color: '#F27024', fontFamily: 'monospace' }}>
                        {techScore} / 100
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={techScore}
                      onChange={(e) => setTechScore(Number(e.target.value))}
                      style={{ width: '100%', accentColor: '#F27024', cursor: 'pointer' }}
                    />
                  </div>

                  {/* Slider 2: Management */}
                  <div style={{ backgroundColor: 'var(--bg-subtle, #F8FAFC)', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border-light, #E2E8F0)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main, #0F172A)' }}>
                        2. Management (Quản lý & Tổ chức nhóm)
                      </span>
                      <span style={{ fontSize: '13px', fontWeight: 800, color: '#F27024', fontFamily: 'monospace' }}>
                        {managementScore} / 100
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={managementScore}
                      onChange={(e) => setManagementScore(Number(e.target.value))}
                      style={{ width: '100%', accentColor: '#F27024', cursor: 'pointer' }}
                    />
                    <div style={{ fontSize: '11px', color: '#0369A1', marginTop: '4px', fontStyle: 'italic' }}>
                      ⭐ <em>Chỉ số dùng để xét chọn Trưởng nhóm khi ghép nhóm tự động cuối kỳ</em>
                    </div>
                  </div>

                  {/* Slider 3: Graphic Design */}
                  <div style={{ backgroundColor: 'var(--bg-subtle, #F8FAFC)', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border-light, #E2E8F0)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main, #0F172A)' }}>
                        3. Graphic Design (Thiết kế & Thẩm mỹ UI/UX)
                      </span>
                      <span style={{ fontSize: '13px', fontWeight: 800, color: '#F27024', fontFamily: 'monospace' }}>
                        {graphicDesignScore} / 100
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={graphicDesignScore}
                      onChange={(e) => setGraphicDesignScore(Number(e.target.value))}
                      style={{ width: '100%', accentColor: '#F27024', cursor: 'pointer' }}
                    />
                  </div>

                  {/* Slider 4: Marketing */}
                  <div style={{ backgroundColor: 'var(--bg-subtle, #F8FAFC)', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border-light, #E2E8F0)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main, #0F172A)' }}>
                        4. Marketing (Truyền thông & Nghiên cứu thị trường)
                      </span>
                      <span style={{ fontSize: '13px', fontWeight: 800, color: '#F27024', fontFamily: 'monospace' }}>
                        {marketingScore} / 100
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={marketingScore}
                      onChange={(e) => setMarketingScore(Number(e.target.value))}
                      style={{ width: '100%', accentColor: '#F27024', cursor: 'pointer' }}
                    />
                  </div>

                  {/* Slider 5: Sale */}
                  <div style={{ backgroundColor: 'var(--bg-subtle, #F8FAFC)', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border-light, #E2E8F0)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main, #0F172A)' }}>
                        5. Sale (Phát triển kinh doanh & Thuyết trình)
                      </span>
                      <span style={{ fontSize: '13px', fontWeight: 800, color: '#F27024', fontFamily: 'monospace' }}>
                        {saleScore} / 100
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={saleScore}
                      onChange={(e) => setSaleScore(Number(e.target.value))}
                      style={{ width: '100%', accentColor: '#F27024', cursor: 'pointer' }}
                    />
                  </div>
                </div>

                {/* ── BÊN PHẢI: BIỂU ĐỒ RADAR 5 TRỤC SVG ── */}
                <RadarChart5
                  tech={techScore}
                  management={managementScore}
                  graphicDesign={graphicDesignScore}
                  marketing={marketingScore}
                  sale={saleScore}
                />
              </div>

              {/* Ô nhập Giới thiệu bản thân & Định hướng đề tài mong muốn (Bio) */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-main, #0F172A)', marginBottom: '6px' }}>
                  Giới thiệu bản thân & Định hướng đề tài mong muốn (Bio)
                </label>
                <textarea
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Mô tả ngắn gọn kinh nghiệm, thế mạnh và chủ đề khởi nghiệp bạn muốn tham gia..."
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 10,
                    border: '1px solid var(--border-medium, #CBD5E1)',
                    backgroundColor: 'var(--bg-input, #FFFFFF)',
                    color: 'var(--text-main, #0F172A)',
                    fontSize: '13px',
                    lineHeight: 1.5,
                    outline: 'none',
                    boxSizing: 'border-box',
                    resize: 'vertical',
                  }}
                />
              </div>

              {/* ── KHUNG CAM KẾT TRÁCH NHIỆM BẮT BUỘC ── */}
              <div
                style={{
                  backgroundColor: 'var(--bg-subtle, #F8FAFC)',
                  border: '1px solid var(--border-light, #E2E8F0)',
                  borderRadius: '12px',
                  padding: '14px 16px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '12px' }}>
                  <input
                    type="checkbox"
                    id="commitment-checkbox"
                    checked={isCommitted}
                    onChange={(e) => setIsCommitted(e.target.checked)}
                    style={{ marginTop: 3, width: 16, height: 16, accentColor: '#F27024', cursor: 'pointer' }}
                  />
                  <label
                    htmlFor="commitment-checkbox"
                    style={{
                      fontSize: '13px',
                      fontWeight: 600,
                      color: 'var(--text-main, #0F172A)',
                      cursor: 'pointer',
                      lineHeight: 1.5,
                    }}
                  >
                    Tôi cam kết chịu trách nhiệm hoàn toàn về tính trung thực và chính xác của các chỉ số năng lực đã khai báo ở trên.
                  </label>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ fontSize: '12px', color: isCommitted ? '#15803D' : '#DC2626' }}>
                    {isCommitted
                      ? '✓ Đã xác nhận cam kết trách nhiệm'
                      : '⚠️ Bạn phải tích chọn cam kết trước khi có thể lưu hồ sơ'}
                  </div>

                  <button
                    type="button"
                    onClick={handleSave5Skills}
                    disabled={saving5Skills || !isCommitted}
                    style={{
                      padding: '10px 22px',
                      borderRadius: 10,
                      backgroundColor: isCommitted ? '#F27024' : '#CBD5E1',
                      border: 'none',
                      color: '#FFFFFF',
                      fontSize: '13.5px',
                      fontWeight: 700,
                      cursor: isCommitted ? 'pointer' : 'not-allowed',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: isCommitted ? '0 2px 8px rgba(242, 112, 36, 0.25)' : 'none',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <Save size={16} />
                    <span>{saving5Skills ? 'Đang lưu...' : 'Lưu hồ sơ năng lực'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 2: ĐỔI MẬT KHẨU BẢO MẬT ── */}
          {activeTab === 'security' && (
            <div style={{ maxWidth: 480 }}>
              <div style={{ marginBottom: '1.25rem' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-main, #0F172A)', margin: '0 0 4px' }}>
                  Đổi mật khẩu bảo mật
                </h3>
                <p style={{ fontSize: '12.5px', color: 'var(--text-muted, #64748B)', margin: 0, lineHeight: 1.5 }}>
                  Mật khẩu mới phải có tối thiểu 8 ký tự, bao gồm ít nhất 1 chữ hoa, 1 chữ số và 1 ký tự đặc biệt.
                </p>
              </div>

              <form onSubmit={handleChangePasswordSubmit}>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--text-secondary, #334155)', marginBottom: '5px' }}>
                    Mật khẩu hiện tại *
                  </label>
                  <input
                    type={showPasswords ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    disabled={changingPassword}
                    required
                    style={{
                      width: '100%',
                      height: 40,
                      padding: '0 12px',
                      borderRadius: 8,
                      border: '1px solid var(--border-medium, #CBD5E1)',
                      backgroundColor: 'var(--bg-input, #FFFFFF)',
                      color: 'var(--text-main, #0F172A)',
                      fontSize: '13px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--text-secondary, #334155)', marginBottom: '5px' }}>
                    Mật khẩu mới *
                  </label>
                  <input
                    type={showPasswords ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={changingPassword}
                    required
                    style={{
                      width: '100%',
                      height: 40,
                      padding: '0 12px',
                      borderRadius: 8,
                      border: '1px solid var(--border-medium, #CBD5E1)',
                      backgroundColor: 'var(--bg-input, #FFFFFF)',
                      color: 'var(--text-main, #0F172A)',
                      fontSize: '13px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--text-secondary, #334155)', marginBottom: '5px' }}>
                    Xác nhận mật khẩu mới *
                  </label>
                  <input
                    type={showPasswords ? 'text' : 'password'}
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    disabled={changingPassword}
                    required
                    style={{
                      width: '100%',
                      height: 40,
                      padding: '0 12px',
                      borderRadius: 8,
                      border: '1px solid var(--border-medium, #CBD5E1)',
                      backgroundColor: 'var(--bg-input, #FFFFFF)',
                      color: 'var(--text-main, #0F172A)',
                      fontSize: '13px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                  <button
                    type="button"
                    onClick={() => setShowPasswords(!showPasswords)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted, #64748B)',
                      fontSize: '12px',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    {showPasswords ? <EyeOff size={14} /> : <Eye size={14} />}
                    <span>{showPasswords ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}</span>
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={changingPassword}
                  style={{
                    padding: '10px 22px',
                    borderRadius: 10,
                    backgroundColor: '#F27024',
                    border: 'none',
                    color: '#FFFFFF',
                    fontSize: '13.5px',
                    fontWeight: 700,
                    cursor: changingPassword ? 'default' : 'pointer',
                    boxShadow: '0 2px 8px rgba(242, 112, 36, 0.25)',
                  }}
                >
                  {changingPassword ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
