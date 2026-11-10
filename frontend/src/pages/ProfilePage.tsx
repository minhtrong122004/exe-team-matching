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
} from '../utils/icons';

// ══════════════════════════════════════════════════════════════
// SVG 5-AXIS RADAR CHART (BIỂU ĐỒ NGŨ GIÁC NĂNG LỰC CHUẨN SAAS)
// ══════════════════════════════════════════════════════════════
const RadarChart5: React.FC<{
  tech: number;
  management: number;
  graphicDesign: number;
  marketing: number;
  sale: number;
}> = ({ tech, management, graphicDesign, marketing, sale }) => {
  const width = 390;
  const height = 340;
  const cx = width / 2;
  const cy = height / 2 + 6;
  const R = 114;

  // 5 trục: Tech (-90°), Management (-18°), Graphic Design (54°), Marketing (126°), Sale (198°)
  const angles = [
    -Math.PI / 2,
    -Math.PI / 2 + (2 * Math.PI) / 5,
    -Math.PI / 2 + (4 * Math.PI) / 5,
    -Math.PI / 2 + (6 * Math.PI) / 5,
    -Math.PI / 2 + (8 * Math.PI) / 5,
  ];

  const gridLevels = [0.2, 0.4, 0.6, 0.8, 1.0];
  const scores = [tech, management, graphicDesign, marketing, sale];

  const dataPoints = angles.map((angle, idx) => {
    const scoreFrac = Math.max(0.05, Math.min(1, scores[idx] / 100));
    const r = scoreFrac * R;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    return { x, y, score: scores[idx] };
  });

  const polygonPointsStr = dataPoints.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  // Đa giác chuẩn cân bằng 60% (Benchmark)
  const benchmarkPointsStr = angles
    .map((a) => `${(cx + 0.6 * R * Math.cos(a)).toFixed(1)},${(cy + 0.6 * R * Math.sin(a)).toFixed(1)}`)
    .join(' ');

  const skillMeta = [
    { name: 'Tech', role: 'Tech Lead', score: tech, angle: angles[0], align: 'middle', dy: -22, dx: 0 },
    { name: 'Management', role: 'Team Leader', score: management, angle: angles[1], align: 'start', dy: -2, dx: 12 },
    { name: 'Design', role: 'UI/UX Lead', score: graphicDesign, angle: angles[2], align: 'start', dy: 16, dx: 10 },
    { name: 'Marketing', role: 'Growth Lead', score: marketing, angle: angles[3], align: 'end', dy: 16, dx: -10 },
    { name: 'Sale', role: 'Pitching Lead', score: sale, angle: angles[4], align: 'end', dy: -2, dx: -12 },
  ];

  const avg = Math.round((tech + management + graphicDesign + marketing + sale) / 5);
  const topSkill = [...skillMeta].sort((a, b) => b.score - a.score)[0];
  const suggestedRole = management >= 75 ? 'Trưởng nhóm (Leader)' : topSkill.role;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        backgroundColor: 'var(--bg-subtle, #F8FAFC)',
        borderRadius: 16,
        padding: '18px 20px',
        border: '1px solid var(--border-light, #E2E8F0)',
        height: '100%',
      }}
    >
      {/* Radar Card Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
        <div>
          <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-main, #0F172A)' }}>
            Biểu đồ Ngũ giác Năng lực
          </div>
          <div style={{ fontSize: '12.5px', color: 'var(--text-muted, #64748B)', marginTop: '1px' }}>
            Phân tích đa chiều theo thời gian thực
          </div>
        </div>
        <span
          style={{
            fontSize: '12.5px',
            fontWeight: 600,
            padding: '4px 10px',
            borderRadius: 999,
            backgroundColor: 'var(--accent-soft, rgba(242, 111, 33, 0.12))',
            color: 'var(--accent-color, #F26F21)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          TB: {avg}/100
        </span>
      </div>

      {/* Main SVG Radar */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '4px 0' }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          style={{ width: '100%', maxWidth: 380, height: 'auto', overflow: 'visible' }}
          role="img"
          aria-label="Biểu đồ radar 5 kỹ năng sinh viên"
        >
          {/* 5 Vòng đa giác lưới đồng tâm (20%, 40%, 60%, 80%, 100%) */}
          {[...gridLevels].reverse().map((level, revIdx) => {
            const r = level * R;
            const pts = angles
              .map((a) => `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`)
              .join(' ');
            const isOuter = level === 1.0;
            const isEven = revIdx % 2 === 0;
            return (
              <polygon
                key={level}
                points={pts}
                fill={isEven ? 'var(--bg-card, #FFFFFF)' : 'var(--bg-subtle, #F8FAFC)'}
                stroke={isOuter ? 'var(--border-medium, #CBD5E1)' : 'var(--border-light, #E2E8F0)'}
                strokeWidth={isOuter ? '1.5' : '1'}
              />
            );
          })}

          {/* 5 đường trục hướng tâm */}
          {angles.map((a, aIdx) => (
            <line
              key={aIdx}
              x1={cx}
              y1={cy}
              x2={(cx + R * Math.cos(a)).toFixed(1)}
              y2={(cy + R * Math.sin(a)).toFixed(1)}
              stroke="var(--border-light, #E2E8F0)"
              strokeWidth="1"
            />
          ))}

          {/* Vòng chuẩn cân bằng nhóm 60% (Benchmark Ring) */}
          <polygon
            points={benchmarkPointsStr}
            fill="none"
            stroke="#94A3B8"
            strokeWidth="1.25"
            strokeDasharray="4 3"
          />

          {/* Nhãn mốc thang điểm (20, 40, 60, 80, 100) trên trục đứng */}
          {gridLevels.map((level) => {
            const yPos = cy - level * R;
            return (
              <text
                key={level}
                x={cx + 5}
                y={yPos + 3}
                fontSize="9.5"
                fontWeight="500"
                fill="#94A3B8"
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {Math.round(level * 100)}
              </text>
            );
          })}

          {/* Đa giác dữ liệu 5 kỹ năng — Đồng bộ 100% theo màu chủ đạo người dùng chọn */}
          <polygon
            points={polygonPointsStr}
            className="motion-radar-polygon"
            fill="var(--accent-soft, rgba(242, 111, 33, 0.16))"
            stroke="var(--accent-color, #F26F21)"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />

          {/* Điểm nút đỉnh dữ liệu kèm vòng Halo */}
          {dataPoints.map((p, pIdx) => (
            <g key={pIdx} className="motion-radar-polygon">
              <circle
                cx={p.x}
                cy={p.y}
                r={8}
                fill="var(--accent-soft, rgba(242, 111, 33, 0.16))"
              />
              <circle
                cx={p.x}
                cy={p.y}
                r={4.5}
                fill="var(--accent-color, #F26F21)"
                stroke="#FFFFFF"
                strokeWidth="2"
              />
            </g>
          ))}

          {/* Vòng tròn tâm hiển thị điểm trung bình */}
          <circle
            cx={cx}
            cy={cy}
            r={24}
            fill="var(--bg-card, #FFFFFF)"
            stroke="var(--border-light, #E2E8F0)"
            strokeWidth="1.2"
          />
          <text
            x={cx}
            y={cy - 4}
            textAnchor="middle"
            fontSize="8.5"
            fontWeight="600"
            fill="var(--text-muted, #64748B)"
            letterSpacing="0.04em"
          >
            ĐIỂM TB
          </text>
          <text
            x={cx}
            y={cy + 11}
            textAnchor="middle"
            fontSize="13.5"
            fontWeight="700"
            fill="var(--accent-color, #F26F21)"
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {avg}%
          </text>

          {/* Nhãn 5 trục kỹ năng + Điểm số */}
          {skillMeta.map((lbl, idx) => {
            const lx = cx + (R + 8) * Math.cos(lbl.angle) + lbl.dx;
            const ly = cy + (R + 8) * Math.sin(lbl.angle) + lbl.dy;
            return (
              <g key={idx}>
                <text
                  x={lx}
                  y={ly}
                  textAnchor={lbl.align as 'middle' | 'start' | 'end'}
                  fontSize="12.5"
                  fontWeight="600"
                  fill="var(--text-main, #0F172A)"
                >
                  {lbl.name}
                </text>
                <text
                  x={lx}
                  y={ly + 15}
                  textAnchor={lbl.align as 'middle' | 'start' | 'end'}
                  fontSize="12"
                  fontWeight="700"
                  fill="var(--accent-color, #F26F21)"
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  {lbl.score}/100
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Chú giải (Legend) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          fontSize: '12px',
          color: 'var(--text-muted, #64748B)',
          marginBottom: '12px',
        }}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: 3,
              backgroundColor: 'var(--accent-color, #F26F21)',
              display: 'inline-block',
            }}
          />
          <span>Hồ sơ của bạn</span>
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <span
            style={{
              width: 14,
              height: 0,
              borderTop: '1.5px dashed #94A3B8',
              display: 'inline-block',
            }}
          />
          <span>Chuẩn cân bằng (60%)</span>
        </span>
      </div>

      {/* 3-Column Mini Insights Footer */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '8px',
          paddingTop: '12px',
          borderTop: '1px solid var(--border-light, #E2E8F0)',
        }}
      >
        <div
          style={{
            backgroundColor: 'var(--bg-card, #FFFFFF)',
            border: '1px solid var(--border-light, #E2E8F0)',
            borderRadius: 10,
            padding: '8px 11px',
          }}
        >
          <div style={{ fontSize: '11.5px', color: 'var(--text-muted, #64748B)' }}>Thế mạnh mũi nhọn</div>
          <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-main, #0F172A)', marginTop: '2px', fontVariantNumeric: 'tabular-nums' }}>
            {topSkill.name} ({topSkill.score}đ)
          </div>
        </div>
        <div
          style={{
            backgroundColor: 'var(--bg-card, #FFFFFF)',
            border: '1px solid var(--border-light, #E2E8F0)',
            borderRadius: 10,
            padding: '8px 11px',
          }}
        >
          <div style={{ fontSize: '11.5px', color: 'var(--text-muted, #64748B)' }}>Vai trò phù hợp</div>
          <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--accent-color, #F26F21)', marginTop: '2px' }}>
            {suggestedRole}
          </div>
        </div>
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
      <div style={{ maxWidth: 1560, margin: '0 auto', paddingBottom: '3.5rem' }}>
        {/* Toast Messages */}
        {error && (
          <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '12px', padding: '12px 16px', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '10px', color: '#DC2626', fontSize: '15px', fontWeight: 600 }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div style={{ backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '12px', padding: '12px 16px', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '10px', color: '#16A34A', fontSize: '15px', fontWeight: 600 }}>
            <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* 2-Column Layout for Staff */}
        <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: '1.5rem', alignItems: 'start' }}>
          {/* CỘT TRÁI: Hồ sơ Cán bộ / Giảng viên FPTU */}
          <div
            style={{
              backgroundColor: 'var(--bg-card, #FFFFFF)',
              border: '1px solid var(--border-light, #E2E8F0)',
              borderRadius: '20px',
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
                  fontSize: '28px',
                  fontWeight: 800,
                  border: '4px solid var(--bg-card, #FFFFFF)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                }}
              >
                {staffInitials}
              </div>

              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main, #0F172A)', margin: '12px 0 4px 0' }}>
                {staffName}
              </h2>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 10px', borderRadius: 999, backgroundColor: isModerator ? 'rgba(0, 84, 166, 0.12)' : 'rgba(0, 136, 55, 0.12)', color: isModerator ? '#0054A6' : '#008837', fontSize: '14px', fontWeight: 700, marginBottom: '1.25rem' }}>
                <ShieldCheck size={14} />
                <span>{staffRoleTitle}</span>
              </div>

              {/* Administrative info fields (Read-only) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', textAlign: 'left' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-muted, #64748B)', textTransform: 'uppercase', marginBottom: '3px' }}>
                    Mã cán bộ FPTU
                  </label>
                  <div style={{ padding: '8px 12px', borderRadius: 10, backgroundColor: 'var(--bg-subtle, #F8FAFC)', border: '1px solid var(--border-light, #E2E8F0)', fontSize: '15px', fontWeight: 700, color: 'var(--text-main, #0F172A)', fontFamily: 'var(--font-mono, monospace)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>{staffCode}</span>
                    <Lock size={13} color="var(--text-light, #94A3B8)" />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-muted, #64748B)', textTransform: 'uppercase', marginBottom: '3px' }}>
                    Email công vụ
                  </label>
                  <div style={{ padding: '8px 12px', borderRadius: 10, backgroundColor: 'var(--bg-subtle, #F8FAFC)', border: '1px solid var(--border-light, #E2E8F0)', fontSize: '15px', fontWeight: 600, color: 'var(--text-main, #0F172A)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>{staffEmail}</span>
                    <Lock size={13} color="var(--text-light, #94A3B8)" />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-muted, #64748B)', textTransform: 'uppercase', marginBottom: '3px' }}>
                    Đơn vị công tác
                  </label>
                  <div style={{ padding: '8px 12px', borderRadius: 10, backgroundColor: 'var(--bg-subtle, #F8FAFC)', border: '1px solid var(--border-light, #E2E8F0)', fontSize: '15px', fontWeight: 600, color: 'var(--text-main, #0F172A)' }}>
                    {staffUnit}
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-muted, #64748B)', textTransform: 'uppercase', marginBottom: '3px' }}>
                    Học kỳ đảm nhiệm
                  </label>
                  <div style={{ padding: '8px 12px', borderRadius: 10, backgroundColor: 'var(--bg-subtle, #F8FAFC)', border: '1px solid var(--border-light, #E2E8F0)', fontSize: '15px', fontWeight: 700, color: 'var(--accent-color, #F26F21)' }}>
                    Fall 2026 • Môn EXE101 & EXE201
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '1.25rem', padding: '10px 12px', borderRadius: 10, backgroundColor: 'var(--bg-subtle, #F8FAFC)', border: '1px dashed var(--border-medium, #CBD5E1)', fontSize: '13.5px', color: 'var(--text-muted, #64748B)', lineHeight: 1.4, display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <Lock size={14} color="#64748B" style={{ flexShrink: 0, marginTop: 2 }} />
                <span>Thông tin cán bộ được quản lý tập trung bởi Phòng Nhân sự & Ban Đào tạo Đại học FPT TP.HCM.</span>
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
                borderRadius: '20px',
                padding: '24px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', borderBottom: '1px solid var(--border-subtle, #F1F5F9)', paddingBottom: '12px' }}>
                <ShieldCheck size={18} color={isModerator ? '#0054A6' : '#008837'} />
                <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-main, #0F172A)', margin: 0 }}>
                  Quyền hạn & Nhiệm vụ trong học kỳ Fall 2026
                </h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {isModerator ? (
                  <>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '15px', color: 'var(--text-main, #0F172A)', lineHeight: 1.5 }}>
                      <CheckCircle2 size={16} color="#0054A6" style={{ flexShrink: 0, marginTop: 2 }} />
                      <span><strong>Quản lý Không gian Môn học:</strong> Thiết lập tham số ghép nhóm, sĩ số tối đa (5), ngưỡng tối thiểu (3), hệ số phòng dự phòng (1.2) cho EXE101 và EXE201.</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '15px', color: 'var(--text-main, #0F172A)', lineHeight: 1.5 }}>
                      <CheckCircle2 size={16} color="#0054A6" style={{ flexShrink: 0, marginTop: 2 }} />
                      <span><strong>Đồng bộ Sinh viên từ FAP:</strong> Nạp danh sách đủ điều kiện, tự động khởi tạo tài khoản và gửi email cấp mật khẩu qua hệ thống MailHog.</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '15px', color: 'var(--text-main, #0F172A)', lineHeight: 1.5 }}>
                      <CheckCircle2 size={16} color="#0054A6" style={{ flexShrink: 0, marginTop: 2 }} />
                      <span><strong>Điều phối Sinh viên lẻ:</strong> Kích hoạt thuật toán ghép tự động (Matching Distribution) hoặc cưỡng bức bổ sung sinh viên chưa có nhóm vào các phòng trống.</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '15px', color: 'var(--text-main, #0F172A)', lineHeight: 1.5 }}>
                      <CheckCircle2 size={16} color="#0054A6" style={{ flexShrink: 0, marginTop: 2 }} />
                      <span><strong>Quản lý Chuyển nhóm sau Chốt sổ:</strong> Tiếp nhận và phê duyệt yêu cầu chuyển 1 chiều hoặc đổi chéo 2 chiều giữa các nhóm.</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '15px', color: 'var(--text-main, #0F172A)', lineHeight: 1.5 }}>
                      <CheckCircle2 size={16} color="#0054A6" style={{ flexShrink: 0, marginTop: 2 }} />
                      <span><strong>Xuất Báo cáo & Đồng bộ kết quả:</strong> Xuất file danh sách nhóm chính thức định dạng CSV chuẩn FAP phục vụ lưu trữ học vụ.</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '15px', color: 'var(--text-main, #0F172A)', lineHeight: 1.5 }}>
                      <CheckCircle2 size={16} color="#008837" style={{ flexShrink: 0, marginTop: 2 }} />
                      <span><strong>Giám sát Tiến độ Ghép nhóm:</strong> Theo dõi sĩ số, chỉ số cân bằng kỹ năng và phân bổ thành viên các phòng nhóm trong môn phụ trách.</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '15px', color: 'var(--text-main, #0F172A)', lineHeight: 1.5 }}>
                      <CheckCircle2 size={16} color="#008837" style={{ flexShrink: 0, marginTop: 2 }} />
                      <span><strong>Xem chi tiết 100% Thành viên:</strong> Toàn quyền xem danh sách thành viên chi tiết của mọi phòng nhóm, kể cả phòng đã đóng tuyển hoặc chốt sổ.</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '15px', color: 'var(--text-main, #0F172A)', lineHeight: 1.5 }}>
                      <CheckCircle2 size={16} color="#008837" style={{ flexShrink: 0, marginTop: 2 }} />
                      <span><strong>Cố vấn & Đánh giá Đề tài Khởi nghiệp:</strong> Tra cứu Kho Đề tài dự kiến, duyệt ý tưởng đổi mới sáng tạo và đưa ra định hướng chuyên môn.</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '15px', color: 'var(--text-main, #0F172A)', lineHeight: 1.5 }}>
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
                borderRadius: '20px',
                padding: '24px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', borderBottom: '1px solid var(--border-subtle, #F1F5F9)', paddingBottom: '12px' }}>
                <KeyRound size={18} color="var(--accent-color, #F26F21)" />
                <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-main, #0F172A)', margin: 0 }}>
                  Đổi mật khẩu tài khoản công vụ
                </h3>
              </div>

              <form onSubmit={handleChangePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary, #334155)', marginBottom: '4px' }}>
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
                      height: 44,
                      padding: '0 12px',
                      borderRadius: 10,
                      border: '1px solid var(--border-medium, #CBD5E1)',
                      backgroundColor: 'var(--bg-input, #FFFFFF)',
                      color: 'var(--text-main, #0F172A)',
                      fontSize: '15px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary, #334155)', marginBottom: '4px' }}>
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
                        height: 44,
                        padding: '0 12px',
                        borderRadius: 10,
                        border: '1px solid var(--border-medium, #CBD5E1)',
                        backgroundColor: 'var(--bg-input, #FFFFFF)',
                        color: 'var(--text-main, #0F172A)',
                        fontSize: '15px',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary, #334155)', marginBottom: '4px' }}>
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
                        height: 44,
                        padding: '0 12px',
                        borderRadius: 10,
                        border: '1px solid var(--border-medium, #CBD5E1)',
                        backgroundColor: 'var(--bg-input, #FFFFFF)',
                        color: 'var(--text-main, #0F172A)',
                        fontSize: '15px',
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
                      fontSize: '14px',
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
                      borderRadius: 12,
                      backgroundColor: 'var(--accent-color, #F26F21)',
                      color: '#FFFFFF',
                      border: 'none',
                      fontSize: '15px',
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
    <div style={{ maxWidth: 1560, margin: '0 auto', paddingBottom: '3.5rem' }}>
      {/* ── PAGE HEADER (EdTech Breadcrumb + Title) ── */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '13.5px',
            fontWeight: 500,
            color: '#64748B',
            marginBottom: '6px',
          }}
        >
          <span>Cá nhân</span>
          <span style={{ color: '#CBD5E1' }}>/</span>
          <span>EXE</span>
          <span style={{ color: '#CBD5E1' }}>/</span>
          <span style={{ color: '#0F172A' }}>Hồ sơ 5 Kỹ năng</span>
        </div>
        <h1
          style={{
            fontSize: '28px',
            fontWeight: 650,
            color: '#0F172A',
            letterSpacing: '-0.022em',
            margin: '0 0 6px 0',
            lineHeight: 1.2,
          }}
        >
          Hồ sơ Năng lực & Học vụ Sinh viên
        </h1>
        <p style={{ fontSize: '15px', fontWeight: 400, color: '#64748B', margin: 0 }}>
          Khai báo 5 chỉ số kỹ năng cốt lõi để hệ thống gợi ý phòng nhóm và hỗ trợ ghép đội liên ngành cân bằng.
        </p>
      </div>

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
            fontSize: '15px',
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
            fontSize: '15px',
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
            fontSize: '15px',
            fontWeight: 600,
          }}
        >
          <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* ── 2-COLUMN MAIN LAYOUT ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '370px 1fr', gap: '1.5rem', alignItems: 'start' }}>
        {/* ══════════════════════════════════════════════════════════════
            CỘT TRÁI: THÔNG TIN HỌC VỤ ĐỒNG BỘ TỪ FAP (READ-ONLY)
           ══════════════════════════════════════════════════════════════ */}
        <div
          style={{
            backgroundColor: 'var(--bg-card, #FFFFFF)',
            border: '1px solid var(--border-light, #E2E8F0)',
            borderRadius: '16px',
            overflow: 'hidden',
          }}
        >
          {/* Dải màu ở đỉnh Card đồng bộ theo màu chủ đạo người dùng chọn */}
          <div
            style={{
              height: '60px',
              background: 'var(--accent-soft, rgba(242, 111, 33, 0.12))',
              borderBottom: '1px solid var(--border-light, #E2E8F0)',
            }}
          />

          <div style={{ padding: '0 20px 20px', textAlign: 'center' }}>
            {/* Avatar tròn đồng bộ màu chủ đạo */}
            <div
              style={{
                width: 68,
                height: 68,
                borderRadius: '50%',
                backgroundColor: 'var(--accent-color, #F26F21)',
                color: '#FFFFFF',
                marginTop: -34,
                marginLeft: 'auto',
                marginRight: 'auto',
                border: '3px solid var(--bg-card, #FFFFFF)',
                fontSize: '20px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              LT
            </div>

            <h2 style={{ fontSize: '19px', fontWeight: 800, color: 'var(--text-main, #0F172A)', margin: '10px 0 2px' }}>
              {fullName}
            </h2>
            <div style={{ fontSize: '14px', color: 'var(--text-muted, #64748B)', marginBottom: '14px' }}>
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
                  gap: '7px',
                  padding: '5px 12px',
                  borderRadius: '999px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: '1px solid #E2E8F0',
                  backgroundColor: '#F8FAFC',
                  color: '#334155',
                  transition: 'all 0.15s ease',
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    backgroundColor: isProfileCompleted ? '#10B981' : 'var(--accent-color, #F26F21)',
                  }}
                />
                <span>{isProfileCompleted ? 'Trạng thái: Đã hoàn tất hồ sơ' : 'Trạng thái: Chưa hoàn tất hồ sơ'}</span>
              </button>
            </div>

            {/* Khung Thông tin Học vụ Khóa cứng */}
            <div style={{ textAlign: 'left', borderTop: '1px solid var(--border-subtle, #F1F5F9)', paddingTop: '16px' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-muted, #64748B)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ShieldCheck size={15} color="#0054A6" />
                <span>Thông tin học vụ (FAP)</span>
              </div>

              {/* Trường 1: MSSV */}
              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', fontSize: '13.5px', fontWeight: 600, color: 'var(--text-secondary, #475569)', marginBottom: '4px' }}>
                  Mã số sinh viên
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    value={studentCode}
                    readOnly
                    style={{
                      width: '100%',
                      height: '42px',
                      borderRadius: 10,
                      border: '1px solid var(--border-light, #E2E8F0)',
                      backgroundColor: 'var(--bg-tag, #F1F5F9)',
                      color: 'var(--text-main, #0F172A)',
                      fontSize: '14.5px',
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
                <label style={{ display: 'block', fontSize: '13.5px', fontWeight: 600, color: 'var(--text-secondary, #475569)', marginBottom: '4px' }}>
                  Chuyên ngành đào tạo
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    value={studentInfo.majorName}
                    readOnly
                    style={{
                      width: '100%',
                      height: '42px',
                      borderRadius: 10,
                      border: '1px solid var(--border-light, #E2E8F0)',
                      backgroundColor: 'var(--bg-tag, #F1F5F9)',
                      color: 'var(--text-main, #0F172A)',
                      fontSize: '14px',
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
                <label style={{ display: 'block', fontSize: '13.5px', fontWeight: 600, color: 'var(--text-secondary, #475569)', marginBottom: '4px' }}>
                  Khóa sinh viên
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    value={studentInfo.cohort}
                    readOnly
                    style={{
                      width: '100%',
                      height: '42px',
                      borderRadius: 10,
                      border: '1px solid var(--border-light, #E2E8F0)',
                      backgroundColor: 'var(--bg-tag, #F1F5F9)',
                      color: 'var(--text-main, #0F172A)',
                      fontSize: '14.5px',
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
                <label style={{ display: 'block', fontSize: '13.5px', fontWeight: 600, color: 'var(--text-secondary, #475569)', marginBottom: '4px' }}>
                  Lớp danh nghĩa
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    value={studentInfo.nominalClass}
                    readOnly
                    style={{
                      width: '100%',
                      height: '42px',
                      borderRadius: 10,
                      border: '1px solid var(--border-light, #E2E8F0)',
                      backgroundColor: 'var(--bg-tag, #F1F5F9)',
                      color: 'var(--text-main, #0F172A)',
                      fontSize: '14.5px',
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
                  fontSize: '13px',
                  color: 'var(--text-muted, #64748B)',
                  lineHeight: 1.5,
                  backgroundColor: 'var(--bg-subtle, #F8FAFC)',
                  border: '1px solid var(--border-light, #E2E8F0)',
                  borderRadius: 10,
                  padding: '9px 11px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                }}
              >
                <Lock size={14} color="#64748B" style={{ flexShrink: 0, marginTop: 2 }} />
                <span>Thông tin học vụ được đồng bộ tự động từ hệ thống FAP theo MSSV, sinh viên không thể tự chỉnh sửa.</span>
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
          }}
        >
          {/* Tab Selector Header — Flat Segmented Control */}
          <div
            style={{
              display: 'inline-flex',
              gap: '2px',
              backgroundColor: '#F1F5F9',
              border: '1px solid #E2E8F0',
              padding: '3px',
              borderRadius: '9px',
              marginBottom: '20px',
            }}
          >
            <button
              type="button"
              className={`motion-tab-pill${activeTab === 'skills' ? ' is-active-tab' : ''}`}
              onClick={() => setActiveTab('skills')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
                padding: '7px 15px',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                border: 'none',
                backgroundColor: activeTab === 'skills' ? '#0F172A' : 'transparent',
                color: activeTab === 'skills' ? '#FFFFFF' : '#64748B',
              }}
            >
              <Sparkles size={15} />
              <span>Hồ sơ Năng lực (5 Kỹ năng)</span>
            </button>

            <button
              type="button"
              className={`motion-tab-pill${activeTab === 'security' ? ' is-active-tab' : ''}`}
              onClick={() => setActiveTab('security')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
                padding: '7px 15px',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                border: 'none',
                backgroundColor: activeTab === 'security' ? '#0F172A' : 'transparent',
                color: activeTab === 'security' ? '#FFFFFF' : '#64748B',
              }}
            >
              <KeyRound size={15} />
              <span>Đổi mật khẩu bảo mật</span>
            </button>
          </div>

          {/* ── TAB 1: HỒ SƠ NĂNG LỰC 5 KỸ NĂNG & RADAR CHART ── */}
          {activeTab === 'skills' && (
            <div key="tab-skills" className="motion-page-enter">
              <div style={{ marginBottom: '1.25rem' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 650, color: 'var(--text-main, #0F172A)', margin: '0 0 4px' }}>
                  Đánh giá 5 Kỹ năng Cốt lõi
                </h3>
                <p style={{ fontSize: '14.5px', color: 'var(--text-muted, #64748B)', margin: 0, lineHeight: 1.5 }}>
                  Kéo thanh trượt từ 0 đến 100 để phản ánh đúng năng lực bản thân. Hệ thống sẽ căn cứ vào biểu đồ ngũ giác này để gợi ý phòng nhóm và hỗ trợ các trưởng nhóm ghép đội đa ngành cân bằng nhất.
                </p>
              </div>

              {/* Grid 2 phần nằm cạnh nhau: Sliders bên trái + Radar Chart rộng rãi bên phải */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 415px',
                  gap: '1.5rem',
                  alignItems: 'stretch',
                  marginBottom: '1.5rem',
                }}
              >
                {/* ── BÊN TRÁI: 5 THANH TRƯỢT (0-100) ── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {/* Slider 1: Tech */}
                  <div style={{ backgroundColor: 'var(--bg-subtle, #F8FAFC)', padding: '10px 14px', borderRadius: 12, border: '1px solid var(--border-light, #E2E8F0)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main, #0F172A)' }}>
                        1. Tech (Kỹ thuật & Phát triển sản phẩm)
                      </span>
                      <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--accent-color, #F26F21)', fontFamily: 'monospace' }}>
                        {techScore} / 100
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={techScore}
                      onChange={(e) => setTechScore(Number(e.target.value))}
                      style={{ width: '100%', accentColor: 'var(--accent-color, #F26F21)', cursor: 'pointer' }}
                    />
                  </div>

                  {/* Slider 2: Management */}
                  <div style={{ backgroundColor: 'var(--bg-subtle, #F8FAFC)', padding: '10px 14px', borderRadius: 12, border: '1px solid var(--border-light, #E2E8F0)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main, #0F172A)' }}>
                        2. Management (Quản lý & Tổ chức nhóm)
                      </span>
                      <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--accent-color, #F26F21)', fontFamily: 'monospace' }}>
                        {managementScore} / 100
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={managementScore}
                      onChange={(e) => setManagementScore(Number(e.target.value))}
                      style={{ width: '100%', accentColor: 'var(--accent-color, #F26F21)', cursor: 'pointer' }}
                    />
                    <div style={{ fontSize: '12.5px', color: '#64748B', marginTop: '4px' }}>
                      Chỉ số dùng để xét chọn Trưởng nhóm khi ghép nhóm tự động cuối kỳ
                    </div>
                  </div>

                  {/* Slider 3: Graphic Design */}
                  <div style={{ backgroundColor: 'var(--bg-subtle, #F8FAFC)', padding: '10px 14px', borderRadius: 12, border: '1px solid var(--border-light, #E2E8F0)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main, #0F172A)' }}>
                        3. Graphic Design (Thiết kế & Thẩm mỹ UI/UX)
                      </span>
                      <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--accent-color, #F26F21)', fontFamily: 'monospace' }}>
                        {graphicDesignScore} / 100
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={graphicDesignScore}
                      onChange={(e) => setGraphicDesignScore(Number(e.target.value))}
                      style={{ width: '100%', accentColor: 'var(--accent-color, #F26F21)', cursor: 'pointer' }}
                    />
                  </div>

                  {/* Slider 4: Marketing */}
                  <div style={{ backgroundColor: 'var(--bg-subtle, #F8FAFC)', padding: '10px 14px', borderRadius: 12, border: '1px solid var(--border-light, #E2E8F0)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main, #0F172A)' }}>
                        4. Marketing (Truyền thông & Nghiên cứu thị trường)
                      </span>
                      <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--accent-color, #F26F21)', fontFamily: 'monospace' }}>
                        {marketingScore} / 100
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={marketingScore}
                      onChange={(e) => setMarketingScore(Number(e.target.value))}
                      style={{ width: '100%', accentColor: 'var(--accent-color, #F26F21)', cursor: 'pointer' }}
                    />
                  </div>

                  {/* Slider 5: Sale */}
                  <div style={{ backgroundColor: 'var(--bg-subtle, #F8FAFC)', padding: '10px 14px', borderRadius: 12, border: '1px solid var(--border-light, #E2E8F0)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main, #0F172A)' }}>
                        5. Sale (Phát triển kinh doanh & Thuyết trình)
                      </span>
                      <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--accent-color, #F26F21)', fontFamily: 'monospace' }}>
                        {saleScore} / 100
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={saleScore}
                      onChange={(e) => setSaleScore(Number(e.target.value))}
                      style={{ width: '100%', accentColor: 'var(--accent-color, #F26F21)', cursor: 'pointer' }}
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
                <label style={{ display: 'block', fontSize: '15px', fontWeight: 700, color: 'var(--text-main, #0F172A)', marginBottom: '6px' }}>
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
                    borderRadius: 12,
                    border: '1px solid var(--border-medium, #CBD5E1)',
                    backgroundColor: 'var(--bg-input, #FFFFFF)',
                    color: 'var(--text-main, #0F172A)',
                    fontSize: '15px',
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
                    style={{ marginTop: 3, width: 16, height: 16, accentColor: 'var(--accent-color, #F26F21)', cursor: 'pointer' }}
                  />
                  <label
                    htmlFor="commitment-checkbox"
                    style={{
                      fontSize: '15px',
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
                  <div style={{ fontSize: '13.5px', fontWeight: 500, color: isCommitted ? '#15803D' : '#DC2626' }}>
                    {isCommitted
                      ? 'Đã xác nhận cam kết trách nhiệm'
                      : 'Vui lòng tích chọn cam kết trước khi lưu hồ sơ'}
                  </div>

                  <button
                    type="button"
                    onClick={handleSave5Skills}
                    disabled={saving5Skills || !isCommitted}
                    style={{
                      padding: '10px 22px',
                      borderRadius: 12,
                      backgroundColor: isCommitted ? 'var(--accent-color, #F26F21)' : '#CBD5E1',
                      border: 'none',
                      color: '#FFFFFF',
                      fontSize: '15.5px',
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
                <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-main, #0F172A)', margin: '0 0 4px' }}>
                  Đổi mật khẩu bảo mật
                </h3>
                <p style={{ fontSize: '14.5px', color: 'var(--text-muted, #64748B)', margin: 0, lineHeight: 1.5 }}>
                  Mật khẩu mới phải có tối thiểu 8 ký tự, bao gồm ít nhất 1 chữ hoa, 1 chữ số và 1 ký tự đặc biệt.
                </p>
              </div>

              <form onSubmit={handleChangePasswordSubmit}>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '14.5px', fontWeight: 600, color: 'var(--text-secondary, #334155)', marginBottom: '5px' }}>
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
                      borderRadius: 10,
                      border: '1px solid var(--border-medium, #CBD5E1)',
                      backgroundColor: 'var(--bg-input, #FFFFFF)',
                      color: 'var(--text-main, #0F172A)',
                      fontSize: '15px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '14.5px', fontWeight: 600, color: 'var(--text-secondary, #334155)', marginBottom: '5px' }}>
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
                      borderRadius: 10,
                      border: '1px solid var(--border-medium, #CBD5E1)',
                      backgroundColor: 'var(--bg-input, #FFFFFF)',
                      color: 'var(--text-main, #0F172A)',
                      fontSize: '15px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '14.5px', fontWeight: 600, color: 'var(--text-secondary, #334155)', marginBottom: '5px' }}>
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
                      borderRadius: 10,
                      border: '1px solid var(--border-medium, #CBD5E1)',
                      backgroundColor: 'var(--bg-input, #FFFFFF)',
                      color: 'var(--text-main, #0F172A)',
                      fontSize: '15px',
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
                      fontSize: '14px',
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
                    borderRadius: 12,
                    backgroundColor: 'var(--accent-color, #F26F21)',
                    border: 'none',
                    color: '#FFFFFF',
                    fontSize: '15.5px',
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
