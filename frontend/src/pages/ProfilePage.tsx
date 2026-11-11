import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import type {
  UserProfileResponse,
  UpdateUserProfileRequest,
  UpdateProfileSkillsRequest,
  SkillResponse,
  UserSkillResponse,
  Major,
  UserAvailability,
  SkillCategory,
} from '../types';
import {
  User,
  Sparkles,
  Edit3,
  Save,
  X,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Plus,
  Star,
  RefreshCw,
  Tag,
  Layers,
  Search,
  ShieldCheck,
  ChevronRight,
  Award,
  Shield,
  FileText,
  Compass,
  Lightbulb,
  Users,
  GraduationCap,
} from '../utils/icons';

const MAJORS: { value: Major; label: string }[] = [
  { value: 'SE', label: 'Kỹ thuật phần mềm (SE)' },
  { value: 'AI', label: 'Trí tuệ nhân tạo (AI)' },
  { value: 'IA', label: 'An toàn thông tin (IA)' },
  { value: 'GD', label: 'Thiết kế đồ họa (GD)' },
  { value: 'MKT', label: 'Digital Marketing (MKT)' },
  { value: 'IB', label: 'Kinh doanh quốc tế (IB)' },
  { value: 'Other', label: 'Chuyên ngành khác (Other)' },
];

const AVAILABILITY_OPTIONS: { value: UserAvailability; label: string; color: string; bg: string }[] = [
  {
    value: 'LookingForTeam',
    label: 'Đang tìm nhóm (Looking for team)',
    color: '#16a34a',
    bg: '#f0fdf4',
  },
  {
    value: 'InTeam',
    label: 'Đã có nhóm (In a team)',
    color: '#2563eb',
    bg: '#eff6ff',
  },
  {
    value: 'NotLooking',
    label: 'Tạm ngưng tìm (Not looking)',
    color: '#64748b',
    bg: '#f8fafc',
  },
];

const CAMPUS_OPTIONS = [
  'TP. Hồ Chí Minh (HCM)',
  'Hà Nội (HN)',
  'Đà Nẵng (DN)',
  'Cần Thơ (CT)',
  'Quy Nhơn (QN)',
];

const SKILL_CATEGORIES: { value: SkillCategory | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'Tất cả nhóm' },
  { value: 'Technical', label: 'Kỹ thuật & Công nghệ' },
  { value: 'Design', label: 'Thiết kế & UI/UX' },
  { value: 'Business', label: 'Kinh doanh & Vận hành' },
  { value: 'Marketing', label: 'Tiếp thị & Tăng trưởng' },
];

const PROFICIENCY_LABELS: Record<number, { text: string; color: string }> = {
  1: { text: '1 - Cơ bản (Beginner)', color: '#94a3b8' },
  2: { text: '2 - Sơ cấp (Elementary)', color: '#60a5fa' },
  3: { text: '3 - Trung cấp (Intermediate)', color: '#3b82f6' },
  4: { text: '4 - Thành thạo (Advanced)', color: '#f59e0b' },
  5: { text: '5 - Chuyên gia (Expert)', color: '#ef4444' },
};

const getScoreTier = (score: number) => {
  if (score >= 80) {
    return { label: 'Xuất sắc / Chuyên sâu', color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' };
  }
  if (score >= 50) {
    return { label: 'Khá / Thành thạo', color: '#0284c7', bg: '#f0f9ff', border: '#bae6fd' };
  }
  if (score >= 25) {
    return { label: 'Trung bình', color: '#f59e0b', bg: '#fffbeb', border: '#fde68a' };
  }
  return { label: 'Cơ bản / Nhập môn', color: '#64748b', bg: '#f8fafc', border: '#e2e8f0' };
};

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

      {/* Gợi ý thế mạnh chỉ hiện khi đã nhập điểm */}
      {topSkill.score > 0 && (
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
      </div>)}
    </div>
  );
};

export const ProfilePage: React.FC = () => {
  const { user: authUser, updateUserData, acceptTerms } = useAuth();

  // State hồ sơ cơ bản
  const [profile, setProfile] = useState<UserProfileResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [savingProfile, setSavingProfile] = useState<boolean>(false);

  // Form fields cho hồ sơ
  const [fullName, setFullName] = useState('');
  const [studentCode, setStudentCode] = useState('');
  const [campus, setCampus] = useState('');
  const [major, setMajor] = useState<Major | ''>('SE');
  const [bio, setBio] = useState('');
  const [desiredRole, setDesiredRole] = useState('');
  const [availability, setAvailability] = useState<UserAvailability>('LookingForTeam');
  const [interests, setInterests] = useState<string[]>([]);
  const [newInterestInput, setNewInterestInput] = useState('');

  // ══════════════════════════════════════════════════════════════
  // STATE 5 KỸ NĂNG CỐT LÕI (BR-05, BR-06, BR-07)
  // ══════════════════════════════════════════════════════════════
  const [techScore, setTechScore] = useState<number>(0);
  const [managementScore, setManagementScore] = useState<number>(0);
  const [graphicDesignScore, setGraphicDesignScore] = useState<number>(0);
  const [marketingScore, setMarketingScore] = useState<number>(0);
  const [saleScore, setSaleScore] = useState<number>(0);
  const [isCommitted, setIsCommitted] = useState<boolean>(false);
  const [committedAt, setCommittedAt] = useState<string | null>(null);
  const [isProfileCompleted, setIsProfileCompleted] = useState<boolean>(false);
  const [saving5Skills, setSaving5Skills] = useState<boolean>(false);
  const [skills5Changed, setSkills5Changed] = useState<boolean>(false);

  // State danh mục kỹ năng bổ trợ (Catalog Skills)
  const [skillsCatalog, setSkillsCatalog] = useState<SkillResponse[]>([]);
  const [userSkills, setUserSkills] = useState<UserSkillResponse[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<SkillCategory | 'ALL'>('ALL');
  const [skillSearchQuery, setSkillSearchQuery] = useState('');
  const [selectedSkillIdToAdd, setSelectedSkillIdToAdd] = useState<string>('');
  const [selectedSkillLevel, setSelectedSkillLevel] = useState<number>(3);
  const [savingSkills, setSavingSkills] = useState<boolean>(false);
  const [skillsChanged, setSkillsChanged] = useState<boolean>(false);

  const navigate = useNavigate();
  const isModerator = profile?.role === 'Moderator' || authUser?.role === 'Moderator';
  const isLecturer = profile?.role === 'Lecturer' || authUser?.role === 'Lecturer';
  const isStudent = !isModerator && !isLecturer;

  // Active Tab based on Role (BR-01, BR-02, BR-03 Role Separation)
  // - Student: 'info' | 'skills' | 'security'
  // - Moderator: 'mod_info' | 'mod_roles'
  // - Lecturer: 'lec_info' | 'lec_roles'
  const [activeTab, setActiveTab] = useState<string>(() => {
    if (isModerator) return 'mod_info';
    if (isLecturer) return 'lec_info';
    return 'info';
  });

  useEffect(() => {
    if (isModerator && !activeTab.startsWith('mod_')) {
      setActiveTab('mod_info');
    } else if (isLecturer && !activeTab.startsWith('lec_')) {
      setActiveTab('lec_info');
    }
  }, [isModerator, isLecturer]);

  // Tải dữ liệu hồ sơ từ Backend (với fallback Mock Data cho Dev/Offline)
  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get<UserProfileResponse>('/users/me');
      const data = response.data;
      setProfile(data);

      // Điền vào form cơ bản
      setFullName(data.fullName || '');
      setStudentCode(data.studentCode || '');
      setCampus(data.campus || 'TP. Hồ Chí Minh (HCM)');
      setMajor(data.major || 'SE');
      setBio(data.bio || '');
      setDesiredRole(data.desiredRole || '');
      setAvailability(data.availability || 'LookingForTeam');
      setInterests(data.interests ? [...data.interests] : []);
      setUserSkills(data.skills ? [...data.skills] : []);
      // 5 Kỹ năng cốt lõi (BR-05, BR-06, BR-07)
      setTechScore(data.techScore ?? 0);
      setManagementScore(data.managementScore ?? 0);
      setGraphicDesignScore(data.graphicDesignScore ?? 0);
      setMarketingScore(data.marketingScore ?? 0);
      setSaleScore(data.saleScore ?? 0);
      setIsCommitted(Boolean(data.isCommitted));
      setCommittedAt(data.committedAt ?? null);
      setIsProfileCompleted(Boolean(data.isProfileCompleted));
      setSkills5Changed(false);
    } catch (err: any) {
      if (err.response?.status === 404) {
        setError(
          'Hồ sơ của bạn đang được hệ thống khởi tạo tự động. Vui lòng thử lại sau giây lát.'
        );
      } else {
        setError(
          err.response?.data?.message ||
            err.response?.data?.title ||
            'Không thể tải dữ liệu hồ sơ người dùng. Vui lòng kiểm tra lại kết nối mạng.'
        );
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Tải danh mục kỹ năng từ Backend
  const fetchSkillsCatalog = useCallback(async () => {
    try {
      const response = await apiClient.get<SkillResponse[]>('/skills');
      setSkillsCatalog(response.data || []);
    } catch (err) {
      console.warn('Không thể tải danh mục kỹ năng:', err);
    }
  }, []);

  // Tải kỹ năng cá nhân từ Backend
  const fetchUserSkills = useCallback(async () => {
    try {
      const response = await apiClient.get<UserSkillResponse[]>('/users/me/skills');
      setUserSkills(response.data || []);
      setSkillsChanged(false);
    } catch (err) {
      console.warn('Không thể tải danh sách kỹ năng cá nhân:', err);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      fetchProfile();
      fetchSkillsCatalog();
      fetchUserSkills();
    });
  }, [fetchProfile, fetchSkillsCatalog, fetchUserSkills]);

  // Validate form cập nhật hồ sơ
  const validateProfileForm = (): boolean => {
    if (!fullName.trim() || fullName.trim().length < 2) {
      setError('Họ và tên phải có ít nhất 2 ký tự.');
      return false;
    }
    if (fullName.trim().length > 100) {
      setError('Họ và tên không được vượt quá 100 ký tự.');
      return false;
    }
    if (campus && campus.length > 50) {
      setError('Tên cơ sở không được vượt quá 50 ký tự.');
      return false;
    }
    if (bio && bio.length > 1000) {
      setError('Tiểu sử không được vượt quá 1000 ký tự.');
      return false;
    }
    if (desiredRole && desiredRole.length > 100) {
      setError('Vai trò mong muốn không được vượt quá 100 ký tự.');
      return false;
    }
    if (interests.length > 20) {
      setError('Danh sách lĩnh vực quan tâm không được vượt quá 20 mục.');
      return false;
    }
    return true;
  };

  // Lưu hồ sơ cá nhân
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!validateProfileForm()) {
      return;
    }

    setSavingProfile(true);

    const payload: UpdateUserProfileRequest = {
      fullName: fullName.trim(),
      campus: campus.trim() || null,
      bio: bio.trim() || null,
      desiredRole: isStudent ? (desiredRole.trim() || null) : null,
      availability: isStudent ? availability : 'LookingForTeam',
      interests: isStudent && interests.length > 0 ? interests : [],
    };

    try {
      const response = await apiClient.put<UserProfileResponse>('/users/me', payload);
      setProfile(response.data);
      updateUserData({
        fullName: response.data.fullName,
        studentCode: response.data.studentCode || undefined,
        campus: response.data.campus || undefined,
        major: response.data.major || undefined,
      });
      setSuccessMsg('Hồ sơ của bạn đã được cập nhật thành công lên hệ thống!');
      setIsEditing(false);
      // Cập nhật lại thông tin trong form
      setFullName(response.data.fullName);
      setStudentCode(response.data.studentCode || '');
      setCampus(response.data.campus || '');
      setMajor(response.data.major || 'SE');
      setBio(response.data.bio || '');
      setDesiredRole(response.data.desiredRole || '');
      setAvailability(response.data.availability);
      setInterests(response.data.interests ? [...response.data.interests] : []);
    } catch (err: any) {
      if (err.response?.status === 409) {
        setError(
          err.response.data?.detail ||
            err.response.data?.message ||
            'Mã số sinh viên này đã được sử dụng bởi một tài khoản khác.'
        );
      } else if (err.response?.data?.errors) {
        const errorList = Object.values(err.response.data.errors).flat();
        setError(errorList.join(' ') || 'Dữ liệu cập nhật không hợp lệ.');
      } else {
        setError(
          err.response?.data?.detail ||
            err.response?.data?.title ||
            err.response?.data?.message ||
            'Không thể lưu thay đổi. Vui lòng kiểm tra lại kết nối.'
        );
      }
    } finally {
      setSavingProfile(false);
    }
  };

  // Hủy chỉnh sửa hồ sơ
  const handleCancelEdit = () => {
    if (profile) {
      setFullName(profile.fullName || '');
      setStudentCode(profile.studentCode || '');
      setCampus(profile.campus || 'TP. Hồ Chí Minh (HCM)');
      setMajor(profile.major || 'SE');
      setBio(profile.bio || '');
      setDesiredRole(profile.desiredRole || '');
      setAvailability(profile.availability || 'LookingForTeam');
      setInterests(profile.interests ? [...profile.interests] : []);
    }
    setIsEditing(false);
    setError(null);
  };

  // ══════════════════════════════════════════════════════════════
  // LƯU HỒ SƠ 5 KỸ NĂNG CỐT LÕI (BR-05 & BR-06)
  // ══════════════════════════════════════════════════════════════
  const handleSave5Skills = async () => {
    setError(null);
    setSuccessMsg(null);

    if (!isCommitted) {
      setError('Bạn bắt buộc phải tích chọn cam kết trung thực về hồ sơ 5 kỹ năng để lưu.');
      return;
    }

    const hasAnyScore =
      techScore > 0 ||
      managementScore > 0 ||
      graphicDesignScore > 0 ||
      marketingScore > 0 ||
      saleScore > 0;

    if (!hasAnyScore) {
      setError('Vui lòng tự đánh giá ít nhất 1 kỹ năng có điểm lớn hơn 0% để hoàn thiện hồ sơ.');
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

      const res = await apiClient.put<UserProfileResponse>('/users/me/profile-skills', payload);
      setProfile(res.data);
      setTechScore(res.data.techScore);
      setManagementScore(res.data.managementScore);
      setGraphicDesignScore(res.data.graphicDesignScore);
      setMarketingScore(res.data.marketingScore);
      setSaleScore(res.data.saleScore);
      setIsCommitted(res.data.isCommitted);
      setCommittedAt(res.data.committedAt ?? null);
      setIsProfileCompleted(res.data.isProfileCompleted);
      updateUserData({ isProfileCompleted: res.data.isProfileCompleted });
      setSkills5Changed(false);
      setSuccessMsg('Đã lưu hồ sơ 5 kỹ năng cốt lõi và ghi nhận cam kết thành công!');
    } catch (err: any) {
      setError(
        err.response?.data?.detail ||
          err.response?.data?.message ||
          'Không thể lưu hồ sơ 5 kỹ năng. Vui lòng kiểm tra lại.'
      );
    } finally {
      setSaving5Skills(false);
    }
  };

  // Thêm lĩnh vực quan tâm (Interests)
  const handleAddInterest = () => {
    const trimmed = newInterestInput.trim();
    if (!trimmed) return;
    if (trimmed.length > 50) {
      setError('Mỗi lĩnh vực quan tâm không được vượt quá 50 ký tự.');
      return;
    }
    if (interests.length >= 20) {
      setError('Chỉ được thêm tối đa 20 lĩnh vực quan tâm.');
      return;
    }
    if (interests.includes(trimmed)) {
      setNewInterestInput('');
      return;
    }
    setInterests([...interests, trimmed]);
    setNewInterestInput('');
    setError(null);
  };

  // Xóa lĩnh vực quan tâm
  const handleRemoveInterest = (itemToRemove: string) => {
    setInterests(interests.filter((item) => item !== itemToRemove));
  };

  // Thêm kỹ năng vào danh sách cá nhân
  const handleAddSkillToUser = async () => {
    if (!selectedSkillIdToAdd) {
      setError('Vui lòng chọn một kỹ năng từ danh mục hệ thống.');
      return;
    }

    const existing = userSkills.find((s) => s.skillId === selectedSkillIdToAdd);
    if (existing) {
      setError('Kỹ năng này đã có trong hồ sơ của bạn. Bạn có thể điều chỉnh mức độ thành thạo ở bảng bên dưới.');
      return;
    }

    const catalogItem = skillsCatalog.find((s) => s.id === selectedSkillIdToAdd);
    if (!catalogItem) return;

    const newSkill: UserSkillResponse = {
      skillId: catalogItem.id,
      skillName: catalogItem.name,
      category: catalogItem.category,
      level: selectedSkillLevel,
      createdAt: new Date().toISOString(),
    };

    const updated = [...userSkills, newSkill];
    setUserSkills(updated);
    setSelectedSkillIdToAdd('');
    setError(null);
    await persistUserSkills(updated);
  };

  // Lưu danh sách kỹ năng đồng loạt qua PUT /api/users/me/skills (có tự động đồng bộ)
  const persistUserSkills = async (updatedSkills: UserSkillResponse[]) => {
    setSavingSkills(true);
    setError(null);
    setSuccessMsg(null);

    const payload = {
      skills: updatedSkills.map((s) => ({
        skillId: s.skillId,
        level: s.level,
      })),
    };

    try {
      const response = await apiClient.put<UserSkillResponse[]>('/users/me/skills', payload);
      setUserSkills(response.data);
      setSkillsChanged(false);
      setSuccessMsg('Đã lưu kỹ năng bổ trợ vào hồ sơ thành công!');
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          err.response?.data?.title ||
          'Không thể lưu danh mục kỹ năng. Vui lòng thử lại.'
      );
    } finally {
      setSavingSkills(false);
    }
  };

  // Thay đổi mức độ thành thạo của một kỹ năng (tự động cập nhật & lưu)
  const handleSkillLevelChange = async (skillId: string, newLevel: number) => {
    const updated = userSkills.map((s) => (s.skillId === skillId ? { ...s, level: newLevel } : s));
    setUserSkills(updated);
    await persistUserSkills(updated);
  };

  // Xóa kỹ năng khỏi danh sách cá nhân (tự động cập nhật & lưu)
  const handleRemoveSkill = async (skillId: string) => {
    const updated = userSkills.filter((s) => s.skillId !== skillId);
    setUserSkills(updated);
    await persistUserSkills(updated);
  };

  // Nút lưu thủ công
  const handleSaveAllSkills = async () => {
    await persistUserSkills(userSkills);
  };

  // Lọc danh mục kỹ năng
  const filteredCatalogSkills = skillsCatalog.filter((s) => {
    const matchesCategory =
      selectedCategory === 'ALL' || s.category === selectedCategory;
    const matchesSearch =
      !skillSearchQuery ||
      s.name.toLowerCase().includes(skillSearchQuery.toLowerCase()) ||
      (s.description && s.description.toLowerCase().includes(skillSearchQuery.toLowerCase()));
    const notAlreadyAdded = !userSkills.some((us) => us.skillId === s.id);
    return matchesCategory && matchesSearch && notAlreadyAdded;
  });

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            border: '4px solid #fed7aa',
            borderTopColor: '#f26f21',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            marginBottom: '1rem',
          }}
        />
        <div style={{ color: 'var(--text-muted, #64748b)', fontSize: '0.95rem', fontWeight: 500 }}>
          Đang tải dữ liệu hồ sơ cá nhân và kỹ năng...
        </div>
      </div>
    );
  }

  // Khôi phục khi hồ sơ chưa tồn tại hoặc bị lỗi
  if (!profile && error) {
    return (
      <div style={{ maxWidth: 640, margin: '2rem auto', padding: '1rem' }}>
        <div
          className="card"
          style={{
            padding: '2.5rem 2rem',
            textAlign: 'center',
            border: '1px solid var(--border-light)',
            background: 'var(--bg-card)',
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: '#fef2f2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem auto',
              color: '#ef4444',
            }}
          >
            <AlertCircle size={28} />
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
            Không tìm thấy hồ sơ cá nhân
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.75rem', lineHeight: 1.5 }}>
            {error}
          </p>
          <button
            onClick={fetchProfile}
            className="btn btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <RefreshCw size={16} />
            <span>Thử tải lại hồ sơ</span>
          </button>
        </div>
      </div>
    );
  }

  const currentAvailability = AVAILABILITY_OPTIONS.find(
    (a) => a.value === (profile?.availability || availability)
  ) || AVAILABILITY_OPTIONS[0];

  const currentMajorLabel = MAJORS.find((m) => m.value === (profile?.major || major))?.label || profile?.major || 'Chưa cập nhật';

  return (
    <div style={{ maxWidth: 1040, margin: '0 auto', paddingBottom: '3rem' }}>
      {/* ══════════════════════════════════════════════════════════════
          CẢNH BÁO HỒ SƠ 5 KỸ NĂNG CHƯA HOÀN TẤT (BR-07)
         ══════════════════════════════════════════════════════════════ */}
      {isStudent && !profile?.isProfileCompleted && (
        <div
          style={{
            background: 'linear-gradient(90deg, #fff7ed 0%, #ffedd5 100%)',
            border: '1px solid #fed7aa',
            borderRadius: 14,
            padding: '1.1rem 1.35rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap',
            boxShadow: '0 2px 8px rgba(242, 111, 33, 0.08)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flex: 1, minWidth: 280 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: '#f26f21',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: '0 2px 6px rgba(242, 111, 33, 0.3)',
              }}
            >
              <AlertCircle size={24} />
            </div>
            <div>
              <div style={{ fontWeight: 800, color: '#9a3412', fontSize: '0.98rem' }}>
                Hồ sơ 5 kỹ năng chưa hoàn tất
              </div>
              <div style={{ fontSize: '0.86rem', color: '#7c2d12', marginTop: '0.2rem', lineHeight: 1.45 }}>
                Bạn cần hoàn thành tự đánh giá 5 kỹ năng cốt lõi (Tech, Management, Graphic Design, Marketing, Sale) và xác nhận cam kết trung thực để đủ điều kiện tham gia phòng chờ (Room) và đề xuất đề tài khởi nghiệp.
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setActiveTab('skills')}
            className="btn btn-primary"
            style={{
              fontSize: '0.875rem',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              whiteSpace: 'nowrap',
              padding: '0.65rem 1.25rem',
            }}
          >
            <span>Hoàn thiện 5 kỹ năng ngay</span>
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          PAGE HEADER & OVERVIEW BANNER
         ══════════════════════════════════════════════════════════════ */}
      {/* ══════════════════════════════════════════════════════════════
          HEADER BANNER: TAILORED PER ROLE (STUDENT / MODERATOR / LECTURER)
         ══════════════════════════════════════════════════════════════ */}
      <div
        className="card"
        style={{
          background: isModerator
            ? 'linear-gradient(135deg, #0a192f 0%, #0054a6 100%)'
            : isLecturer
            ? 'linear-gradient(135deg, #0054a6 0%, #008837 100%)'
            : 'linear-gradient(135deg, #061325 0%, #0054a6 60%, #f26f21 150%)',
          color: '#ffffff',
          padding: '2rem 2.25rem',
          borderRadius: 16,
          marginBottom: '1.5rem',
          boxShadow: isModerator
            ? '0 10px 25px -5px rgba(10, 25, 47, 0.35)'
            : isLecturer
            ? '0 10px 25px -5px rgba(0, 84, 166, 0.25)'
            : '0 10px 25px -5px rgba(0, 84, 166, 0.25)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            right: '-40px',
            bottom: '-40px',
            width: 220,
            height: 220,
            borderRadius: '50%',
            background: isModerator
              ? 'radial-gradient(circle, rgba(0, 84, 166, 0.3) 0%, transparent 70%)'
              : isLecturer
              ? 'radial-gradient(circle, rgba(0, 136, 55, 0.3) 0%, transparent 70%)'
              : 'radial-gradient(circle, rgba(242, 111, 33, 0.25) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            {/* Avatar Circle */}
            <div
              style={{
                width: 76,
                height: 76,
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.15)',
                backdropFilter: 'blur(10px)',
                border: '2px solid rgba(255, 255, 255, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.85rem',
                fontWeight: 800,
                color: '#ffffff',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              }}
            >
              {isModerator ? 'ĐP' : isLecturer ? 'GV' : (profile?.fullName ? profile.fullName.charAt(0).toUpperCase() : 'SV')}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: '1.65rem', fontWeight: 800, margin: 0, color: '#ffffff' }}>
                  {profile?.fullName || authUser?.fullName}
                </h1>
                <span
                  style={{
                    padding: '0.2rem 0.65rem',
                    borderRadius: 999,
                    fontSize: '0.725rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    background: 'rgba(255, 255, 255, 0.2)',
                    backdropFilter: 'blur(6px)',
                    color: '#ffffff',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                  }}
                >
                  {isModerator
                    ? 'Điều phối viên (Moderator)'
                    : isLecturer
                    ? 'Giảng viên hướng dẫn (Lecturer)'
                    : 'Sinh viên (Student)'}
                </span>

                {/* Cohort Badge for Student */}
                {isStudent && profile?.cohort && (
                  <span
                    style={{
                      padding: '0.2rem 0.65rem',
                      borderRadius: 999,
                      fontSize: '0.725rem',
                      fontWeight: 800,
                      background: '#f26f21',
                      color: '#ffffff',
                      boxShadow: '0 2px 6px rgba(242, 111, 33, 0.4)',
                      fontFamily: 'var(--font-mono, monospace)',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    Khóa {profile.cohort}
                  </span>
                )}
              </div>

              {/* Sub-details tailored per role */}
              <div style={{ fontSize: '0.875rem', color: '#e2e8f0', marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.9rem', flexWrap: 'wrap' }}>
                <span>{profile?.email || authUser?.email}</span>

                {isStudent && profile?.studentCode && (
                  <span>
                    • MSSV: <strong style={{ fontFamily: 'var(--font-mono, monospace)', fontVariantNumeric: 'tabular-nums' }}>{profile.studentCode}</strong>
                  </span>
                )}
                {isStudent && profile?.major && (
                  <span>• Chuyên ngành: <strong>{currentMajorLabel}</strong></span>
                )}

                {isModerator && (
                  <span>• Đơn vị: <strong>Ban Đào tạo & Điều phối Khởi nghiệp FPT</strong></span>
                )}

                {isLecturer && (
                  <span>• Bộ môn: <strong>Khởi nghiệp & Đổi mới sáng tạo (EXE)</strong></span>
                )}

                <span>• Cơ sở: <strong>{profile?.campus || 'TP. Hồ Chí Minh (HCM)'}</strong></span>
              </div>
            </div>
          </div>

          {/* Quick Badges: Role-specific */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
            {isStudent && (
              <>
                <div
                  style={{
                    padding: '0.45rem 0.95rem',
                    borderRadius: 10,
                    background: currentAvailability.bg,
                    color: currentAvailability.color,
                    fontWeight: 700,
                    fontSize: '0.825rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                  }}
                >
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: currentAvailability.color }} />
                  {currentAvailability.label}
                </div>

                {profile?.isProfileCompleted ? (
                  <div
                    style={{
                      padding: '0.35rem 0.85rem',
                      borderRadius: 10,
                      background: 'rgba(240, 253, 244, 0.95)',
                      color: '#15803d',
                      border: '1px solid #bbf7d0',
                      fontWeight: 700,
                      fontSize: '0.775rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                    }}
                  >
                    <CheckCircle2 size={14} color="#16a34a" />
                    <span>5 Kỹ năng: Đã hoàn tất</span>
                  </div>
                ) : (
                  <div
                    style={{
                      padding: '0.35rem 0.85rem',
                      borderRadius: 10,
                      background: 'rgba(254, 242, 242, 0.95)',
                      color: '#b91c1c',
                      border: '1px solid #fecaca',
                      fontWeight: 700,
                      fontSize: '0.775rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                    }}
                  >
                    <AlertCircle size={14} color="#ef4444" />
                    <span>5 Kỹ năng: Chưa hoàn tất</span>
                  </div>
                )}
              </>
            )}

            {isModerator && (
              <>
                <div
                  style={{
                    padding: '0.45rem 0.95rem',
                    borderRadius: 10,
                    background: 'rgba(240, 253, 244, 0.95)',
                    color: '#15803d',
                    fontWeight: 700,
                    fontSize: '0.825rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                  }}
                >
                  <ShieldCheck size={16} color="#16a34a" />
                  <span>Quyền Quản trị Tối cao (Super Admin)</span>
                </div>
                <div
                  style={{
                    padding: '0.35rem 0.85rem',
                    borderRadius: 10,
                    background: 'rgba(255, 255, 255, 0.2)',
                    backdropFilter: 'blur(6px)',
                    color: '#ffffff',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    fontWeight: 700,
                    fontSize: '0.775rem',
                  }}
                >
                  Kỳ học FA26 • Phân bổ & Ghép nhóm
                </div>
              </>
            )}

            {isLecturer && (
              <>
                <div
                  style={{
                    padding: '0.45rem 0.95rem',
                    borderRadius: 10,
                    background: 'rgba(238, 242, 255, 0.95)',
                    color: '#0054a6',
                    fontWeight: 700,
                    fontSize: '0.825rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                  }}
                >
                  <GraduationCap size={16} color="#0054a6" />
                  <span>Cố vấn Học phần (Mentor & Evaluator)</span>
                </div>
                <div
                  style={{
                    padding: '0.35rem 0.85rem',
                    borderRadius: 10,
                    background: 'rgba(255, 255, 255, 0.2)',
                    backdropFilter: 'blur(6px)',
                    color: '#ffffff',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    fontWeight: 700,
                    fontSize: '0.775rem',
                  }}
                >
                  Học phần EXE101 / EXE201
                </div>
              </>
            )}
          </div>
        </div>

      </div>

      {/* ══════════════════════════════════════════════════════════════
          NOTIFICATIONS (SUCCESS & ERROR ALERTS)
         ══════════════════════════════════════════════════════════════ */}
      {successMsg && (
        <div
          style={{
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: 10,
            padding: '0.85rem 1.25rem',
            color: '#15803d',
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1.25rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <CheckCircle2 size={18} />
            <span>{successMsg}</span>
          </div>
          <button
            onClick={() => setSuccessMsg(null)}
            style={{ background: 'transparent', border: 'none', color: '#15803d', cursor: 'pointer' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {error && (
        <div
          style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 10,
            padding: '0.85rem 1.25rem',
            color: '#b91c1c',
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1.25rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            style={{ background: 'transparent', border: 'none', color: '#b91c1c', cursor: 'pointer' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          NAVIGATION TABS: TAILORED PER ROLE
         ══════════════════════════════════════════════════════════════ */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          borderBottom: '1px solid var(--border-light, #e2e8f0)',
          marginBottom: '1.5rem',
        }}
      >
        {/* MODERATOR TABS */}
        {isModerator && (
          <>
            <button
              type="button"
              onClick={() => setActiveTab('mod_info')}
              style={{
                padding: '0.75rem 1.25rem',
                border: 'none',
                background: 'transparent',
                borderBottom: activeTab === 'mod_info' ? '2.5px solid #0054a6' : '2.5px solid transparent',
                color: activeTab === 'mod_info' ? '#0054a6' : 'var(--text-muted, #64748b)',
                fontWeight: 700,
                fontSize: '0.925rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'color 150ms ease, border-color 150ms ease',
              }}
            >
              <User size={18} />
              <span>Thông tin Điều phối viên</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('mod_roles')}
              style={{
                padding: '0.75rem 1.25rem',
                border: 'none',
                background: 'transparent',
                borderBottom: activeTab === 'mod_roles' ? '2.5px solid #0054a6' : '2.5px solid transparent',
                color: activeTab === 'mod_roles' ? '#0054a6' : 'var(--text-muted, #64748b)',
                fontWeight: 700,
                fontSize: '0.925rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'color 150ms ease, border-color 150ms ease',
              }}
            >
              <Shield size={18} />
              <span>Thẩm quyền & Trách nhiệm Điều phối</span>
            </button>
          </>
        )}

        {/* LECTURER TABS */}
        {isLecturer && (
          <>
            <button
              type="button"
              onClick={() => setActiveTab('lec_info')}
              style={{
                padding: '0.75rem 1.25rem',
                border: 'none',
                background: 'transparent',
                borderBottom: activeTab === 'lec_info' ? '2.5px solid #008837' : '2.5px solid transparent',
                color: activeTab === 'lec_info' ? '#008837' : 'var(--text-muted, #64748b)',
                fontWeight: 700,
                fontSize: '0.925rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'color 150ms ease, border-color 150ms ease',
              }}
            >
              <User size={18} />
              <span>Thông tin Giảng viên</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('lec_roles')}
              style={{
                padding: '0.75rem 1.25rem',
                border: 'none',
                background: 'transparent',
                borderBottom: activeTab === 'lec_roles' ? '2.5px solid #008837' : '2.5px solid transparent',
                color: activeTab === 'lec_roles' ? '#008837' : 'var(--text-muted, #64748b)',
                fontWeight: 700,
                fontSize: '0.925rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'color 150ms ease, border-color 150ms ease',
              }}
            >
              <GraduationCap size={18} />
              <span>Nhiệm vụ Giảng dạy & Cố vấn EXE</span>
            </button>
          </>
        )}

        {/* STUDENT TABS */}
        {isStudent && (
          <>

            <button
              type="button"
              onClick={() => setActiveTab('info')}
              style={{
                padding: '0.75rem 1.25rem',
                border: 'none',
                background: 'transparent',
                borderBottom: activeTab === 'info' ? '2.5px solid #f26f21' : '2.5px solid transparent',
                color: activeTab === 'info' ? '#f26f21' : 'var(--text-muted, #64748b)',
                fontWeight: 700,
                fontSize: '0.925rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'color 150ms ease, border-color 150ms ease',
              }}
            >
              <User size={18} />
              <span>Thông tin cá nhân & Học thuật</span>
            </button>


            <button
              type="button"
              onClick={() => setActiveTab('skills')}
              style={{
                padding: '0.75rem 1.25rem',
                border: 'none',
                background: 'transparent',
                borderBottom: activeTab === 'skills' ? '2.5px solid #f26f21' : '2.5px solid transparent',
                color: activeTab === 'skills' ? '#f26f21' : 'var(--text-muted, #64748b)',
                fontWeight: 700,
                fontSize: '0.925rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'color 150ms ease, border-color 150ms ease',
              }}
            >
              <Sparkles size={18} />
              <span>5 Kỹ năng Cốt lõi & Danh mục ({profile?.isProfileCompleted ? 'Đã hoàn tất' : 'Chưa hoàn tất'})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('security')}
              style={{
                padding: '0.75rem 1.25rem',
                border: 'none',
                background: 'transparent',
                borderBottom: activeTab === 'security' ? '2.5px solid #f26f21' : '2.5px solid transparent',
                color: activeTab === 'security' ? '#f26f21' : 'var(--text-muted, #64748b)',
                fontWeight: 700,
                fontSize: '0.925rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'color 150ms ease, border-color 150ms ease',
              }}
            >
              <ShieldCheck size={18} />
              <span>Quy định</span>
            </button>
          </>
        )}
      </div>


      {/* ══════════════════════════════════════════════════════════════
          MODERATOR TAB 1: THÔNG TIN ĐIỀU PHỐI VIÊN
         ══════════════════════════════════════════════════════════════ */}
      {isModerator && activeTab === 'mod_info' && (
        <div className="card" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main, #0f172a)', margin: 0 }}>
                Thông tin Điều phối viên Học kỳ
              </h2>
              <p style={{ color: 'var(--text-muted, #64748b)', fontSize: '0.85rem', marginTop: '0.2rem' }}>
                Thông tin quản trị viên được sử dụng để liên hệ điều phối và quản lý học phần EXE
              </p>
            </div>

            {!isEditing ? (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="btn btn-outline"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.85rem' }}
              >
                <Edit3 size={15} />
                <span>Chỉnh sửa thông tin</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="btn"
                style={{
                  background: '#f1f5f9',
                  color: '#475569',
                  border: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  fontSize: '0.85rem',
                }}
              >
                <X size={15} />
                <span>Hủy bỏ</span>
              </button>
            )}
          </div>

          <form onSubmit={handleSaveProfile}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 600 }}>Họ và tên Điều phối viên *</label>
                <input
                  type="text"
                  className="form-control"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={!isEditing || savingProfile}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>Email quản trị</span>
                  <span style={{ fontSize: '0.72rem', color: '#0054a6', fontWeight: 700 }}>Hệ thống cấp</span>
                </label>
                <input
                  type="email"
                  className="form-control"
                  value={profile?.email || authUser?.email || ''}
                  disabled
                  style={{ background: 'var(--bg-sidebar-hover, #f8fafc)', color: 'var(--text-muted, #64748b)' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 600 }}>Cơ sở quản lý *</label>
                <select
                  className="form-control"
                  value={campus}
                  onChange={(e) => setCampus(e.target.value)}
                  disabled={!isEditing || savingProfile}
                >
                  {CAMPUS_OPTIONS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 600 }}>Đơn vị công tác</label>
                <input
                  type="text"
                  className="form-control"
                  value="Ban Đào tạo & Điều phối Khởi nghiệp EXE - ĐH FPT"
                  disabled
                  style={{ background: 'var(--bg-sidebar-hover, #f8fafc)', color: 'var(--text-muted, #64748b)' }}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label" style={{ fontWeight: 600 }}>Ghi chú công tác điều phối / Thông báo chung</label>
              <textarea
                className="form-control"
                rows={3}
                placeholder="Ghi chú phân công hoặc hướng dẫn dành cho giảng viên và sinh viên..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                disabled={!isEditing || savingProfile}
              />
            </div>

            {isEditing && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="btn"
                  style={{ background: '#f1f5f9', color: '#475569' }}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={savingProfile}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}
                >
                  <Save size={16} />
                  <span>{savingProfile ? 'Đang lưu...' : 'Lưu thông tin điều phối'}</span>
                </button>
              </div>
            )}
          </form>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          MODERATOR TAB 2: THẨM QUYỀN & TRÁCH NHIỆM ĐIỀU PHỐI
         ══════════════════════════════════════════════════════════════ */}
      {isModerator && activeTab === 'mod_roles' && (
        <div>
          <div className="card" style={{ padding: '1.75rem 2rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem' }}>
              <span className="fpt-portal-badge">PHÂN QUYỀN HỆ THỐNG</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted, #64748b)', fontWeight: 600 }}>
                ROLE: MODERATOR (FULL ADMIN)
              </span>
            </div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main, #0f172a)', margin: '0 0 0.4rem 0' }}>
              Thẩm quyền & Trách nhiệm Điều phối Học kỳ
            </h2>
            <p style={{ color: 'var(--text-muted, #64748b)', fontSize: '0.875rem', maxWidth: 800, lineHeight: 1.5, margin: 0 }}>
              Tổng hợp các phân hệ nghiệp vụ và quyền hạn độc quyền của Điều phối viên học kỳ môn EXE trong chuỗi 6 giai đoạn phát triển hệ thống.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
            {/* Card 1 */}
            <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f26f21' }}>
                    <Layers size={20} />
                  </div>
                  <span style={{ padding: '0.2rem 0.55rem', borderRadius: 6, background: '#f0fdf4', color: '#15803d', fontWeight: 700, fontSize: '0.72rem' }}>
                    Giai đoạn 3 • Đã kích hoạt
                  </span>
                </div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 0.4rem 0', color: 'var(--text-main, #0f172a)' }}>
                  Không gian học phần & Phân bổ Room
                </h3>
                <p style={{ fontSize: '0.825rem', color: 'var(--text-muted, #64748b)', lineHeight: 1.5, margin: 0 }}>
                  Tạo Không gian học kỳ, cấu hình công thức phân bổ CEIL(SV ÷ Max × Buffer), sinh Room tự động và giám sát sĩ số học phần.
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/spaces')}
                className="btn btn-outline"
                style={{ marginTop: '1.25rem', width: '100%', fontSize: '0.825rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
              >
                <span>Mở Không gian học phần</span>
                <ChevronRight size={14} />
              </button>
            </div>

            {/* Card 2 */}
            <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0054a6' }}>
                    <Shield size={20} />
                  </div>
                  <span style={{ padding: '0.2rem 0.55rem', borderRadius: 6, background: '#f0fdf4', color: '#15803d', fontWeight: 700, fontSize: '0.72rem' }}>
                    Giai đoạn 1 • Đã kích hoạt
                  </span>
                </div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 0.4rem 0', color: 'var(--text-main, #0f172a)' }}>
                  Quản lý Tài khoản & Đồng bộ FAP
                </h3>
                <p style={{ fontSize: '0.825rem', color: 'var(--text-muted, #64748b)', lineHeight: 1.5, margin: 0 }}>
                  Import danh sách sinh viên đủ điều kiện từ FAP, cấp phát tài khoản tự động, tạo tài khoản Giảng viên và quản lý trạng thái tài khoản.
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/admin/accounts')}
                className="btn btn-outline"
                style={{ marginTop: '1.25rem', width: '100%', fontSize: '0.825rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
              >
                <span>Mở Quản lý TK & FAP</span>
                <ChevronRight size={14} />
              </button>
            </div>

            {/* Card 3 */}
            <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#008837' }}>
                    <FileText size={20} />
                  </div>
                  <span style={{ padding: '0.2rem 0.55rem', borderRadius: 6, background: '#eff6ff', color: '#0054a6', fontWeight: 700, fontSize: '0.72rem' }}>
                    Báo cáo học kỳ
                  </span>
                </div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 0.4rem 0', color: 'var(--text-main, #0f172a)' }}>
                  Báo cáo & Thống kê Ghép nhóm
                </h3>
                <p style={{ fontSize: '0.825rem', color: 'var(--text-muted, #64748b)', lineHeight: 1.5, margin: 0 }}>
                  Theo dõi tiến độ ghép nhóm thời gian thực, số lượng sinh viên chưa có nhóm, danh sách các phòng và xuất báo cáo CSV nộp Phòng Đào tạo.
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/reports')}
                className="btn btn-outline"
                style={{ marginTop: '1.25rem', width: '100%', fontSize: '0.825rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
              >
                <span>Mở Báo cáo & Thống kê</span>
                <ChevronRight size={14} />
              </button>
            </div>

            {/* Card 4 */}
            <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7c3aed' }}>
                    <Compass size={20} />
                  </div>
                  <span style={{ padding: '0.2rem 0.55rem', borderRadius: 6, background: '#eff6ff', color: '#0054a6', fontWeight: 700, fontSize: '0.72rem' }}>
                    Học vụ
                  </span>
                </div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 0.4rem 0', color: 'var(--text-main, #0f172a)' }}>
                  Giám sát Nhóm & Room Học phần
                </h3>
                <p style={{ fontSize: '0.825rem', color: 'var(--text-muted, #64748b)', lineHeight: 1.5, margin: 0 }}>
                  Theo dõi các nhóm đã chốt hoặc đang tuyển quân, kiểm tra cơ cấu thành viên và các đề tài dự án sinh viên đăng ký.
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/groups')}
                className="btn btn-outline"
                style={{ marginTop: '1.25rem', width: '100%', fontSize: '0.825rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
              >
                <span>Xem Giám sát nhóm</span>
                <ChevronRight size={14} />
              </button>
            </div>

            {/* Card 5 */}
            <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ea580c' }}>
                    <Sparkles size={20} />
                  </div>
                  <span style={{ padding: '0.2rem 0.55rem', borderRadius: 6, background: '#fef3c7', color: '#b45309', fontWeight: 700, fontSize: '0.72rem' }}>
                    Giai đoạn 5 • Kế tiếp
                  </span>
                </div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 0.4rem 0', color: 'var(--text-main, #0f172a)' }}>
                  Điều phối Cưỡng chế (gRPC Matching)
                </h3>
                <p style={{ fontSize: '0.825rem', color: 'var(--text-muted, #64748b)', lineHeight: 1.5, margin: 0 }}>
                  Chạy thuật toán Matching tự động phân bổ toàn bộ sinh viên lẻ còn lại vào các Room chưa đủ sĩ số sau khi hết hạn ghép tự do.
                </p>
              </div>
              <div style={{ marginTop: '1.25rem', fontSize: '0.775rem', color: '#b45309', fontWeight: 600 }}>
                • Kích hoạt tự động khi hết hạn ghép tự do
              </div>
            </div>

            {/* Card 6 */}
            <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f0f9ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0284c7' }}>
                    <Users size={20} />
                  </div>
                  <span style={{ padding: '0.2rem 0.55rem', borderRadius: 6, background: '#fef3c7', color: '#b45309', fontWeight: 700, fontSize: '0.72rem' }}>
                    Giai đoạn 6 • Kế tiếp
                  </span>
                </div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 0.4rem 0', color: 'var(--text-main, #0f172a)' }}>
                  Phê duyệt Chuyển nhóm sau Khóa sổ
                </h3>
                <p style={{ fontSize: '0.825rem', color: 'var(--text-muted, #64748b)', lineHeight: 1.5, margin: 0 }}>
                  Tiếp nhận, thẩm định và phê duyệt các yêu cầu hoán đổi hoặc rút/chuyển thành viên sau thời điểm chốt danh sách chính thức (Post-Lock Transfer).
                </p>
              </div>
              <div style={{ marginTop: '1.25rem', fontSize: '0.775rem', color: '#0284c7', fontWeight: 600 }}>
                • Thẩm quyền phê duyệt thuộc về Điều phối viên
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          LECTURER TAB 1: THÔNG TIN GIẢNG VIÊN
         ══════════════════════════════════════════════════════════════ */}
      {isLecturer && activeTab === 'lec_info' && (
        <div className="card" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main, #0f172a)', margin: 0 }}>
                Thông tin Giảng viên Hướng dẫn
              </h2>
              <p style={{ color: 'var(--text-muted, #64748b)', fontSize: '0.85rem', marginTop: '0.2rem' }}>
                Hồ sơ giảng viên cố vấn học phần EXE được hiển thị cho sinh viên và ban điều phối
              </p>
            </div>

            {!isEditing ? (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="btn btn-outline"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.85rem' }}
              >
                <Edit3 size={15} />
                <span>Chỉnh sửa hồ sơ</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="btn"
                style={{
                  background: '#f1f5f9',
                  color: '#475569',
                  border: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  fontSize: '0.85rem',
                }}
              >
                <X size={15} />
                <span>Hủy bỏ</span>
              </button>
            )}
          </div>

          <form onSubmit={handleSaveProfile}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 600 }}>Họ và tên Giảng viên *</label>
                <input
                  type="text"
                  className="form-control"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={!isEditing || savingProfile}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>Email giảng viên</span>
                  <span style={{ fontSize: '0.72rem', color: '#008837', fontWeight: 700 }}>Hệ thống cấp</span>
                </label>
                <input
                  type="email"
                  className="form-control"
                  value={profile?.email || authUser?.email || ''}
                  disabled
                  style={{ background: 'var(--bg-sidebar-hover, #f8fafc)', color: 'var(--text-muted, #64748b)' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 600 }}>Cơ sở giảng dạy *</label>
                <select
                  className="form-control"
                  value={campus}
                  onChange={(e) => setCampus(e.target.value)}
                  disabled={!isEditing || savingProfile}
                >
                  {CAMPUS_OPTIONS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 600 }}>Bộ môn / Khoa</label>
                <input
                  type="text"
                  className="form-control"
                  value="Bộ môn Khởi nghiệp & Đổi mới sáng tạo (EXE) - ĐH FPT"
                  disabled
                  style={{ background: 'var(--bg-sidebar-hover, #f8fafc)', color: 'var(--text-muted, #64748b)' }}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label" style={{ fontWeight: 600 }}>Lĩnh vực chuyên môn & Định hướng cố vấn đề tài</label>
              <textarea
                className="form-control"
                rows={3}
                placeholder="Giới thiệu về hướng nghiên cứu, lĩnh vực thế mạnh (EdTech, FinTech, E-Commerce, AI Applications...) để định hướng các nhóm sinh viên..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                disabled={!isEditing || savingProfile}
              />
            </div>

            {isEditing && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="btn"
                  style={{ background: '#f1f5f9', color: '#475569' }}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={savingProfile}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}
                >
                  <Save size={16} />
                  <span>{savingProfile ? 'Đang lưu...' : 'Lưu thông tin giảng viên'}</span>
                </button>
              </div>
            )}
          </form>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          LECTURER TAB 2: TRÁCH NHIỆM GIẢNG DẠY & CỐ VẤN
         ══════════════════════════════════════════════════════════════ */}
      {isLecturer && activeTab === 'lec_roles' && (
        <div>
          <div className="card" style={{ padding: '1.75rem 2rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem' }}>
              <span className="fpt-portal-badge">HỌC VỤ & CỐ VẤN</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted, #64748b)', fontWeight: 600 }}>
                ROLE: LECTURER (MENTOR & EVALUATOR)
              </span>
            </div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main, #0f172a)', margin: '0 0 0.4rem 0' }}>
              Vai trò Giảng viên & Hướng dẫn môn EXE
            </h2>
            <p style={{ color: 'var(--text-muted, #64748b)', fontSize: '0.875rem', maxWidth: 800, lineHeight: 1.5, margin: 0 }}>
              Các phân hệ và chức năng chính dành cho Giảng viên hướng dẫn trong quá trình sinh viên hình thành nhóm và triển khai dự án khởi nghiệp.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
            {/* Card 1 */}
            <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0054a6' }}>
                    <Layers size={20} />
                  </div>
                  <span style={{ padding: '0.2rem 0.55rem', borderRadius: 6, background: '#eff6ff', color: '#0054a6', fontWeight: 700, fontSize: '0.72rem' }}>
                    Quan sát Room
                  </span>
                </div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 0.4rem 0', color: 'var(--text-main, #0f172a)' }}>
                  Không gian học phần & Giám sát Room
                </h3>
                <p style={{ fontSize: '0.825rem', color: 'var(--text-muted, #64748b)', lineHeight: 1.5, margin: 0 }}>
                  Theo dõi danh sách các phòng học phần mở ghi danh, kiểm tra sĩ số các phòng và danh sách sinh viên ghi danh từ FAP.
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/spaces')}
                className="btn btn-outline"
                style={{ marginTop: '1.25rem', width: '100%', fontSize: '0.825rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
              >
                <span>Xem Không gian học phần</span>
                <ChevronRight size={14} />
              </button>
            </div>

            {/* Card 2 */}
            <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#008837' }}>
                    <FileText size={20} />
                  </div>
                  <span style={{ padding: '0.2rem 0.55rem', borderRadius: 6, background: '#f0fdf4', color: '#15803d', fontWeight: 700, fontSize: '0.72rem' }}>
                    Xuất CSV
                  </span>
                </div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 0.4rem 0', color: 'var(--text-main, #0f172a)' }}>
                  Báo cáo & Danh sách nhóm
                </h3>
                <p style={{ fontSize: '0.825rem', color: 'var(--text-muted, #64748b)', lineHeight: 1.5, margin: 0 }}>
                  Xem báo cáo thống kê tình hình ghép nhóm theo thời gian thực và xuất danh sách nhóm CSV phục vụ quản lý lớp và chấm điểm.
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/reports')}
                className="btn btn-outline"
                style={{ marginTop: '1.25rem', width: '100%', fontSize: '0.825rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
              >
                <span>Xem Báo cáo nhóm</span>
                <ChevronRight size={14} />
              </button>
            </div>

            {/* Card 3 */}
            <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f26f21' }}>
                    <Compass size={20} />
                  </div>
                  <span style={{ padding: '0.2rem 0.55rem', borderRadius: 6, background: '#eff6ff', color: '#0054a6', fontWeight: 700, fontSize: '0.72rem' }}>
                    Đội ngũ
                  </span>
                </div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 0.4rem 0', color: 'var(--text-main, #0f172a)' }}>
                  Khám phá Nhóm Sinh viên
                </h3>
                <p style={{ fontSize: '0.825rem', color: 'var(--text-muted, #64748b)', lineHeight: 1.5, margin: 0 }}>
                  Xem danh sách các nhóm đã thành lập, thành viên nhóm và cơ cấu 5 kỹ năng để hỗ trợ định hướng chuyên môn.
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/groups')}
                className="btn btn-outline"
                style={{ marginTop: '1.25rem', width: '100%', fontSize: '0.825rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
              >
                <span>Xem Danh sách nhóm</span>
                <ChevronRight size={14} />
              </button>
            </div>

            {/* Card 4 */}
            <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: '#fefce8', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ca8a04' }}>
                    <Lightbulb size={20} />
                  </div>
                  <span style={{ padding: '0.2rem 0.55rem', borderRadius: 6, background: '#fef3c7', color: '#b45309', fontWeight: 700, fontSize: '0.72rem' }}>
                    Khởi nghiệp
                  </span>
                </div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 0.4rem 0', color: 'var(--text-main, #0f172a)' }}>
                  Cố vấn Ý tưởng Đề tài EXE
                </h3>
                <p style={{ fontSize: '0.825rem', color: 'var(--text-muted, #64748b)', lineHeight: 1.5, margin: 0 }}>
                  Đọc và góp ý cho các ý tưởng dự án khởi nghiệp sinh viên đề xuất, định hướng tính khả thi thị trường cho nhóm.
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/projects')}
                className="btn btn-outline"
                style={{ marginTop: '1.25rem', width: '100%', fontSize: '0.825rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
              >
                <span>Xem Ý tưởng dự án</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          STUDENT TAB 1: THÔNG TIN HỒ SƠ & HỌC THUẬT (BR-04)
         ══════════════════════════════════════════════════════════════ */}
      {isStudent && activeTab === 'info' && (
        <div className="card" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main, #0f172a)', margin: 0 }}>
                Chi tiết hồ sơ học thuật & Cá nhân
              </h2>
              <p style={{ color: 'var(--text-muted, #64748b)', fontSize: '0.85rem', marginTop: '0.2rem' }}>
                Thông tin học thuật chính quy từ FAP được sử dụng để phân loại khối ngành và điều phối nhóm
              </p>
            </div>

            {!isEditing ? (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="btn btn-outline"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.85rem' }}
              >
                <Edit3 size={15} />
                <span>Chỉnh sửa hồ sơ</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="btn"
                style={{
                  background: '#f1f5f9',
                  color: '#475569',
                  border: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  fontSize: '0.85rem',
                }}
              >
                <X size={15} />
                <span>Hủy bỏ</span>
              </button>
            )}
          </div>

          <form onSubmit={handleSaveProfile}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
              {/* Họ và tên */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 600 }}>Họ và tên *</label>
                <input
                  type="text"
                  className="form-control"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={!isEditing || savingProfile}
                  required
                />
              </div>

              {/* Mã số sinh viên (MSSV) */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>Mã số sinh viên (MSSV)</span>
                  {isStudent && (
                    <span style={{ fontSize: '0.72rem', color: '#0054a6', fontWeight: 700 }}>
                      Cố định từ FAP
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ví dụ: SE180101"
                  value={studentCode}
                  disabled
                  style={{ fontFamily: 'var(--font-mono, monospace)', fontVariantNumeric: 'tabular-nums' }}
                />
              </div>

              {/* Khóa học (Cohort) */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>Khóa học (Cohort)</span>
                  <span style={{ fontSize: '0.72rem', color: '#f26f21', fontWeight: 700 }}>
                    Tự động từ MSSV
                  </span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  value={profile?.cohort ? `Khóa ${profile.cohort}` : 'Chưa xác định'}
                  disabled
                  style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700, fontVariantNumeric: 'tabular-nums', background: '#f8fafc' }}
                />
              </div>

              {/* Chuyên ngành học (Major) */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>Chuyên ngành học (Major)</span>
                  {isStudent && (
                    <span style={{ fontSize: '0.72rem', color: '#0054a6', fontWeight: 700 }}>
                      Cố định từ FAP
                    </span>
                  )}
                </label>
                  <input
                    type="text"
                    className="form-control"
                    value={currentMajorLabel}
                    disabled
                    style={{ background: '#f8fafc', fontWeight: 600 }}
                  />
              </div>

              {/* Cơ sở học tập */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 600 }}>Cơ sở trực thuộc FPT</label>
                {isEditing ? (
                  <select
                    className="form-control"
                    value={campus}
                    onChange={(e) => setCampus(e.target.value)}
                    disabled={savingProfile}
                  >
                    {CAMPUS_OPTIONS.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                ) : (
                  <input type="text" className="form-control" value={campus || 'Chưa cập nhật'} disabled />
                )}
              </div>

              {/* Trạng thái tìm nhóm */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 600 }}>Trạng thái tìm nhóm</label>
                {isEditing ? (
                  <select
                    className="form-control"
                    value={availability}
                    onChange={(e) => setAvailability(e.target.value as UserAvailability)}
                    disabled={savingProfile}
                  >
                    {AVAILABILITY_OPTIONS.map((a) => (
                      <option key={a.value} value={a.value}>{a.label}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    className="form-control"
                    value={currentAvailability.label}
                    disabled
                  />
                )}
              </div>

              {/* Vai trò mong muốn trong nhóm */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 600 }}>Vai trò mong muốn trong nhóm</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ví dụ: Frontend Developer, Tech Lead, UI/UX..."
                  value={desiredRole}
                  onChange={(e) => setDesiredRole(e.target.value)}
                  disabled={!isEditing || savingProfile}
                />
              </div>
            </div>

            {/* Giới thiệu bản thân (Bio) */}
            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label className="form-label" style={{ fontWeight: 600 }}>Giới thiệu bản thân & Mục tiêu khởi nghiệp (Bio)</label>
              <textarea
                className="form-control"
                rows={4}
                placeholder="Chia sẻ kinh nghiệm, điểm mạnh cá nhân và mục tiêu bạn muốn đạt được trong đề tài EXE..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                disabled={!isEditing || savingProfile}
              />
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem', textAlign: 'right' }}>
                {bio.length}/1000 ký tự
              </div>
            </div>

            {/* Lĩnh vực quan tâm (Interests) */}
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label" style={{ fontWeight: 600 }}>
                Lĩnh vực khởi nghiệp quan tâm (Interests)
              </label>

              {isEditing && (
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Ví dụ: EdTech, FinTech, AI, Logistics..."
                    value={newInterestInput}
                    onChange={(e) => setNewInterestInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddInterest();
                      }
                    }}
                    disabled={savingProfile}
                    style={{ maxWidth: 360 }}
                  />
                  <button
                    type="button"
                    onClick={handleAddInterest}
                    className="btn btn-secondary"
                    disabled={savingProfile}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                  >
                    <Plus size={16} />
                    <span>Thêm</span>
                  </button>
                </div>
              )}

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {interests.length === 0 ? (
                  <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic' }}>
                    Chưa có lĩnh vực quan tâm nào được chọn.
                  </span>
                ) : (
                  interests.map((item) => (
                    <span
                      key={item}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        padding: '0.35rem 0.75rem',
                        borderRadius: 999,
                        background: '#eff6ff',
                        color: '#1d4ed8',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        border: '1px solid #bfdbfe',
                      }}
                    >
                      <Tag size={13} />
                      <span>{item}</span>
                      {isEditing && (
                        <button
                          type="button"
                          onClick={() => handleRemoveInterest(item)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#1d4ed8',
                            cursor: 'pointer',
                            padding: 0,
                            display: 'flex',
                          }}
                        >
                          <X size={14} />
                        </button>
                      )}
                    </span>
                  ))
                )}
              </div>
            </div>

            {/* Action Buttons khi đang ở chế độ chỉnh sửa */}
            {isEditing && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid #f1f5f9', paddingTop: '1.25rem' }}>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="btn"
                  disabled={savingProfile}
                  style={{ background: '#f1f5f9', color: '#475569', border: 'none' }}
                >
                  Hủy thay đổi
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={savingProfile}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  <Save size={16} />
                  <span>{savingProfile ? 'Đang lưu...' : 'Lưu hồ sơ cá nhân'}</span>
                </button>
              </div>
            )}
          </form>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          TAB 2: 5 KỸ NĂNG CỐT LÕI & DANH MỤC KỸ NĂNG
         ══════════════════════════════════════════════════════════════ */}
      {isStudent && activeTab === 'skills' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
          {/* ──────────────────────────────────────────────────────────
              PHẦN 1: HỒ SƠ 5 KỸ NĂNG CỐT LÕI & BIỂU ĐỒ RADAR
             ────────────────────────────────────────────────────────── */}
          <div className="card" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <Award size={20} color="#f26f21" />
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main, #0f172a)', margin: 0 }}>
                    Hồ sơ 5 Kỹ năng Cốt lõi & Biểu đồ Radar
                  </h2>
                </div>
                <p style={{ color: 'var(--text-muted, #64748b)', fontSize: '0.86rem', margin: 0 }}>
                  Tự đánh giá thang điểm (0–100%) cho 5 năng lực then chốt của một nhóm khởi nghiệp EXE: Kỹ thuật, Quản trị, Thiết kế, Tiếp thị và Bán hàng.
                </p>
              </div>

              {profile?.isProfileCompleted ? (
                <div
                  style={{
                    padding: '0.4rem 0.85rem',
                    borderRadius: 999,
                    background: '#f0fdf4',
                    color: '#15803d',
                    border: '1px solid #bbf7d0',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                  }}
                >
                  <CheckCircle2 size={16} />
                  <span>Hồ sơ 5 kỹ năng đã hoàn tất</span>
                </div>
              ) : (
                <div
                  style={{
                    padding: '0.4rem 0.85rem',
                    borderRadius: 999,
                    background: '#fff7ed',
                    color: '#c2410c',
                    border: '1px solid #fed7aa',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                  }}
                >
                  <AlertCircle size={16} />
                  <span>Chưa hoàn tất (Cần đánh giá & cam kết)</span>
                </div>
              )}
            </div>

            {/* Grid 2 Cột: Bên trái 5 Thanh trượt, Bên phải Biểu đồ Radar */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                gap: '2rem',
                alignItems: 'center',
                marginBottom: '2rem',
              }}
            >
              {/* CỘT TRÁI: 5 SLIDERS */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* 1. Tech Score */}
                <div
                  style={{
                    padding: '1rem',
                    borderRadius: 12,
                    background: 'var(--bg-main, #f8fafc)',
                    border: '1px solid var(--border-light, #e2e8f0)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.925rem', color: '#0f172a' }}>
                      1. Kỹ thuật & Lập trình (Tech)
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span
                        style={{
                          fontSize: '0.725rem',
                          fontWeight: 700,
                          padding: '0.15rem 0.45rem',
                          borderRadius: 6,
                          background: getScoreTier(techScore).bg,
                          color: getScoreTier(techScore).color,
                          border: `1px solid ${getScoreTier(techScore).border}`,
                        }}
                      >
                        {getScoreTier(techScore).label}
                      </span>
                      <span
                        style={{
                          fontFamily: 'var(--font-mono, monospace)',
                          fontWeight: 800,
                          fontSize: '1rem',
                          color: '#f26f21',
                          fontVariantNumeric: 'tabular-nums',
                          minWidth: 42,
                          textAlign: 'right',
                        }}
                      >
                        {techScore}%
                      </span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={techScore}
                    onChange={(e) => {
                      setTechScore(Number(e.target.value));
                      setSkills5Changed(true);
                    }}
                    style={{ width: '100%', accentColor: '#f26f21', cursor: 'pointer' }}
                  />
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.35rem' }}>
                    Lập trình Backend/Frontend, Mobile, AI/Data, Database, Cloud & DevOps
                  </div>
                </div>

                {/* 2. Management Score */}
                <div
                  style={{
                    padding: '1rem',
                    borderRadius: 12,
                    background: 'var(--bg-main, #f8fafc)',
                    border: '1px solid var(--border-light, #e2e8f0)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.925rem', color: '#0f172a' }}>
                      2. Quản trị & Dự án (Management)
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span
                        style={{
                          fontSize: '0.725rem',
                          fontWeight: 700,
                          padding: '0.15rem 0.45rem',
                          borderRadius: 6,
                          background: getScoreTier(managementScore).bg,
                          color: getScoreTier(managementScore).color,
                          border: `1px solid ${getScoreTier(managementScore).border}`,
                        }}
                      >
                        {getScoreTier(managementScore).label}
                      </span>
                      <span
                        style={{
                          fontFamily: 'var(--font-mono, monospace)',
                          fontWeight: 800,
                          fontSize: '1rem',
                          color: '#f26f21',
                          fontVariantNumeric: 'tabular-nums',
                          minWidth: 42,
                          textAlign: 'right',
                        }}
                      >
                        {managementScore}%
                      </span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={managementScore}
                    onChange={(e) => {
                      setManagementScore(Number(e.target.value));
                      setSkills5Changed(true);
                    }}
                    style={{ width: '100%', accentColor: '#f26f21', cursor: 'pointer' }}
                  />
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.35rem' }}>
                    Lập kế hoạch Scrum/Kanban, phân công công việc, quản lý tiến độ & điều phối thành viên
                  </div>
                </div>

                {/* 3. Graphic Design Score */}
                <div
                  style={{
                    padding: '1rem',
                    borderRadius: 12,
                    background: 'var(--bg-main, #f8fafc)',
                    border: '1px solid var(--border-light, #e2e8f0)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.925rem', color: '#0f172a' }}>
                      3. Thiết kế & UI/UX (Graphic Design)
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span
                        style={{
                          fontSize: '0.725rem',
                          fontWeight: 700,
                          padding: '0.15rem 0.45rem',
                          borderRadius: 6,
                          background: getScoreTier(graphicDesignScore).bg,
                          color: getScoreTier(graphicDesignScore).color,
                          border: `1px solid ${getScoreTier(graphicDesignScore).border}`,
                        }}
                      >
                        {getScoreTier(graphicDesignScore).label}
                      </span>
                      <span
                        style={{
                          fontFamily: 'var(--font-mono, monospace)',
                          fontWeight: 800,
                          fontSize: '1rem',
                          color: '#f26f21',
                          fontVariantNumeric: 'tabular-nums',
                          minWidth: 42,
                          textAlign: 'right',
                        }}
                      >
                        {graphicDesignScore}%
                      </span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={graphicDesignScore}
                    onChange={(e) => {
                      setGraphicDesignScore(Number(e.target.value));
                      setSkills5Changed(true);
                    }}
                    style={{ width: '100%', accentColor: '#f26f21', cursor: 'pointer' }}
                  />
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.35rem' }}>
                    Thiết kế giao diện Figma, trải nghiệm người dùng UI/UX, ấn phẩm truyền thông & Pitch Deck
                  </div>
                </div>

                {/* 4. Marketing Score */}
                <div
                  style={{
                    padding: '1rem',
                    borderRadius: 12,
                    background: 'var(--bg-main, #f8fafc)',
                    border: '1px solid var(--border-light, #e2e8f0)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.925rem', color: '#0f172a' }}>
                      4. Tiếp thị & Tăng trưởng (Marketing)
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span
                        style={{
                          fontSize: '0.725rem',
                          fontWeight: 700,
                          padding: '0.15rem 0.45rem',
                          borderRadius: 6,
                          background: getScoreTier(marketingScore).bg,
                          color: getScoreTier(marketingScore).color,
                          border: `1px solid ${getScoreTier(marketingScore).border}`,
                        }}
                      >
                        {getScoreTier(marketingScore).label}
                      </span>
                      <span
                        style={{
                          fontFamily: 'var(--font-mono, monospace)',
                          fontWeight: 800,
                          fontSize: '1rem',
                          color: '#f26f21',
                          fontVariantNumeric: 'tabular-nums',
                          minWidth: 42,
                          textAlign: 'right',
                        }}
                      >
                        {marketingScore}%
                      </span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={marketingScore}
                    onChange={(e) => {
                      setMarketingScore(Number(e.target.value));
                      setSkills5Changed(true);
                    }}
                    style={{ width: '100%', accentColor: '#f26f21', cursor: 'pointer' }}
                  />
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.35rem' }}>
                    Nghiên cứu thị trường, chiến dịch số, SEO, sáng tạo nội dung truyền thông & thu hút user
                  </div>
                </div>

                {/* 5. Sale Score */}
                <div
                  style={{
                    padding: '1rem',
                    borderRadius: 12,
                    background: 'var(--bg-main, #f8fafc)',
                    border: '1px solid var(--border-light, #e2e8f0)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.925rem', color: '#0f172a' }}>
                      5. Bán hàng & Đàm phán (Sale)
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span
                        style={{
                          fontSize: '0.725rem',
                          fontWeight: 700,
                          padding: '0.15rem 0.45rem',
                          borderRadius: 6,
                          background: getScoreTier(saleScore).bg,
                          color: getScoreTier(saleScore).color,
                          border: `1px solid ${getScoreTier(saleScore).border}`,
                        }}
                      >
                        {getScoreTier(saleScore).label}
                      </span>
                      <span
                        style={{
                          fontFamily: 'var(--font-mono, monospace)',
                          fontWeight: 800,
                          fontSize: '1rem',
                          color: '#f26f21',
                          fontVariantNumeric: 'tabular-nums',
                          minWidth: 42,
                          textAlign: 'right',
                        }}
                      >
                        {saleScore}%
                      </span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={saleScore}
                    onChange={(e) => {
                      setSaleScore(Number(e.target.value));
                      setSkills5Changed(true);
                    }}
                    style={{ width: '100%', accentColor: '#f26f21', cursor: 'pointer' }}
                  />
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.35rem' }}>
                    Thuyết trình Pitching gọi vốn, bán hàng B2B/B2C, đàm phán hợp tác & chốt đơn hàng
                  </div>
                </div>
              </div>

              {/* CỘT PHẢI: BIỂU ĐỒ RADAR TỰ ĐỘNG CẬP NHẬT */}
              <RadarChart5
                tech={techScore}
                management={managementScore}
                graphicDesign={graphicDesignScore}
                marketing={marketingScore}
                sale={saleScore}
              />
            </div>

            {/* ──────────────────────────────────────────────────────────
                CAM KẾT TRUNG THỰC (BR-06) VÀ NÚT LƯU 5 KỸ NĂNG
               ────────────────────────────────────────────────────────── */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 12,
                padding: '1.25rem 1.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
              }}
            >
              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem',
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
              >
                <input
                  type="checkbox"
                  checked={isCommitted}
                  onChange={(e) => {
                    setIsCommitted(e.target.checked);
                    setSkills5Changed(true);
                  }}
                  style={{
                    width: 18,
                    height: 18,
                    marginTop: 3,
                    accentColor: '#f26f21',
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                />
                <div style={{ fontSize: '0.875rem', color: '#1e293b', lineHeight: 1.5 }}>
                  <strong style={{ color: '#0f172a' }}>Cam kết trung thực về năng lực:</strong> Tôi hoàn toàn chịu trách nhiệm về tính xác thực của thang điểm 5 kỹ năng đã tự đánh giá. Tôi hiểu rằng dữ liệu này là cơ sở quan trọng để thuật toán Matching phân bổ và tối ưu hóa cân bằng năng lực thành viên khi ghép nhóm đề tài EXE.
                </div>
              </label>

              {committedAt && (
                <div style={{ fontSize: '0.78rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.4rem', paddingLeft: '2.1rem' }}>
                  <ShieldCheck size={14} color="#16a34a" />
                  <span>
                    Đã xác nhận cam kết lúc: <strong style={{ fontFamily: 'var(--font-mono, monospace)', fontVariantNumeric: 'tabular-nums' }}>{new Date(committedAt).toLocaleString('vi-VN')}</strong>
                  </span>
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div style={{ fontSize: '0.825rem', color: skills5Changed ? '#c2410c' : '#64748b', fontWeight: 600 }}>
                  {skills5Changed ? '• Có thay đổi điểm số chưa được lưu lên hệ thống' : isProfileCompleted ? '• Hồ sơ 5 kỹ năng đã được lưu và có hiệu lực' : '• Vui lòng chọn điểm và lưu hồ sơ'}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {skills5Changed && (
                    <button
                      type="button"
                      onClick={() => {
                        if (profile) {
                          setTechScore(profile.techScore ?? 0);
                          setManagementScore(profile.managementScore ?? 0);
                          setGraphicDesignScore(profile.graphicDesignScore ?? 0);
                          setMarketingScore(profile.marketingScore ?? 0);
                          setSaleScore(profile.saleScore ?? 0);
                          setIsCommitted(Boolean(profile.isCommitted));
                          setSkills5Changed(false);
                        }
                      }}
                      className="btn"
                      style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                    >
                      Khôi phục điểm cũ
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleSave5Skills}
                    className="btn btn-primary"
                    disabled={saving5Skills || !isCommitted}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.65rem 1.5rem',
                      fontSize: '0.9rem',
                      fontWeight: 700,
                    }}
                  >
                    <Save size={16} />
                    <span>{saving5Skills ? 'Đang lưu hồ sơ 5 kỹ năng...' : 'Lưu hồ sơ 5 kỹ năng'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ──────────────────────────────────────────────────────────
              PHẦN 2: DANH MỤC KỸ NĂNG BỔ TRỢ & CHUYÊN MÔN (CATALOG SKILLS)
             ────────────────────────────────────────────────────────── */}
          <div className="card" style={{ padding: '1.75rem' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main, #0f172a)', marginBottom: '0.35rem' }}>
              Danh mục Kỹ năng Bổ trợ & Chuyên sâu
            </h2>
            <p style={{ color: 'var(--text-muted, #64748b)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              Bổ sung các kỹ năng công nghệ hoặc công cụ cụ thể từ danh mục (React, Node, Figma, SEO...) để làm phong phú hồ sơ ứng viên
            </p>

            {/* Search and Filter Categories */}
            <div style={{ position: 'relative', marginBottom: '0.85rem', maxWidth: 360 }}>
              <Search size={16} style={{ position: 'absolute', left: 12, top: 11, color: '#94a3b8' }} />
              <input
                type="text"
                className="form-control"
                placeholder="Tìm kiếm kỹ năng trong danh mục..."
                value={skillSearchQuery}
                onChange={(e) => setSkillSearchQuery(e.target.value)}
                style={{ paddingLeft: '2.25rem', height: 38, fontSize: '0.85rem' }}
              />
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1rem' }}>
              {SKILL_CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setSelectedCategory(cat.value)}
                  style={{
                    padding: '0.4rem 0.85rem',
                    borderRadius: 8,
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 120ms ease',
                    border: selectedCategory === cat.value ? '1px solid var(--primary)' : '1px solid var(--border-light)',
                    background: selectedCategory === cat.value ? 'var(--primary-light)' : 'var(--bg-card)',
                    color: selectedCategory === cat.value ? 'var(--primary)' : 'var(--text-secondary)',
                  }}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Add Skill Controls */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px auto', gap: '0.75rem', alignItems: 'flex-end', marginBottom: '1.5rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.825rem', fontWeight: 600 }}>
                  Chọn kỹ năng ({filteredCatalogSkills.length} kỹ năng khả dụng)
                </label>
                <select
                  className="form-control"
                  value={selectedSkillIdToAdd}
                  onChange={(e) => setSelectedSkillIdToAdd(e.target.value)}
                >
                  <option value="">-- Chọn kỹ năng để thêm --</option>
                  {filteredCatalogSkills.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.category})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.825rem', fontWeight: 600 }}>
                  Mức độ thành thạo (1-5)
                </label>
                <select
                  className="form-control"
                  value={selectedSkillLevel}
                  onChange={(e) => setSelectedSkillLevel(Number(e.target.value))}
                >
                  <option value={1}>1 - Cơ bản (Beginner)</option>
                  <option value={2}>2 - Sơ cấp (Elementary)</option>
                  <option value={3}>3 - Trung cấp (Intermediate)</option>
                  <option value={4}>4 - Thành thạo (Advanced)</option>
                  <option value={5}>5 - Chuyên gia (Expert)</option>
                </select>
              </div>

              <button
                type="button"
                onClick={handleAddSkillToUser}
                className="btn btn-primary"
                disabled={!selectedSkillIdToAdd}
                style={{ height: 42, display: 'inline-flex', alignItems: 'center', gap: '0.45rem', padding: '0 1.25rem' }}
              >
                <Plus size={16} />
                <span>Thêm vào hồ sơ</span>
              </button>
            </div>

            {/* User Skills List */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', borderTop: '1px solid #f1f5f9', paddingTop: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                  Kỹ năng bổ trợ đã lưu ({userSkills.length})
                </h3>
              </div>

              {skillsChanged && (
                <button
                  type="button"
                  onClick={handleSaveAllSkills}
                  className="btn btn-primary"
                  disabled={savingSkills}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.85rem' }}
                >
                  <Save size={15} />
                  <span>{savingSkills ? 'Đang lưu...' : 'Lưu kỹ năng bổ trợ'}</span>
                </button>
              )}
            </div>

            {userSkills.length === 0 ? (
              <div
                style={{
                  padding: '2.5rem 1rem',
                  textAlign: 'center',
                  background: 'var(--bg-subtle)',
                  borderRadius: 12,
                  border: '1px dashed var(--border-medium)',
                }}
              >
                <Layers size={32} style={{ color: 'var(--text-muted, #94a3b8)', margin: '0 auto 0.5rem auto' }} />
                <div style={{ fontWeight: 700, color: 'var(--text-main, #334155)', fontSize: '0.9rem' }}>
                  Chưa có kỹ năng bổ trợ nào được chọn
                </div>
                <div style={{ color: 'var(--text-muted, #64748b)', fontSize: '0.825rem', marginTop: '0.2rem' }}>
                  Bạn có thể bổ sung thêm kỹ năng lập trình, thiết kế hoặc nghiệp vụ từ danh mục phía trên
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {userSkills.map((skill) => {
                  const prof = PROFICIENCY_LABELS[skill.level] || PROFICIENCY_LABELS[3];
                  return (
                    <div
                      key={skill.skillId}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.85rem 1.25rem',
                        borderRadius: 10,
                        background: 'var(--bg-subtle)',
                        border: '1px solid var(--border-light)',
                        boxShadow: 'var(--shadow-sm)',
                        flexWrap: 'wrap',
                        gap: '0.75rem',
                      }}
                    >
                      <div style={{ minWidth: 200 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.925rem', color: 'var(--text-main, #0f172a)' }}>
                          {skill.skillName}
                        </div>
                        <span
                          style={{
                            display: 'inline-block',
                            marginTop: '0.2rem',
                            padding: '0.12rem 0.5rem',
                            borderRadius: 6,
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            background:
                              skill.category === 'Technical'
                                ? '#eff6ff'
                                : skill.category === 'Design'
                                ? '#fdf2f8'
                                : skill.category === 'Business'
                                ? '#f0fdf4'
                                : '#fff7ed',
                            color:
                              skill.category === 'Technical'
                                ? '#1d4ed8'
                                : skill.category === 'Design'
                                ? '#be185d'
                                : skill.category === 'Business'
                                ? '#15803d'
                                : '#c2410c',
                          }}
                        >
                          {skill.category}
                        </span>
                      </div>

                      {/* Interactive Proficiency Level: All 5 stars visible + Interactive select */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                          {[1, 2, 3, 4, 5].map((lvl) => {
                            const isFilled = lvl <= skill.level;
                            return (
                              <button
                                key={lvl}
                                type="button"
                                onClick={() => handleSkillLevelChange(skill.skillId, lvl)}
                                title={PROFICIENCY_LABELS[lvl].text}
                                aria-label={`${skill.skillName} mức ${lvl}`}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  padding: '0.2rem',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  transition: 'transform 120ms ease',
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.25)')}
                                onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                              >
                                <Star
                                  size={18}
                                  weight={isFilled ? 'fill' : 'regular'}
                                  color={isFilled ? '#f59e0b' : '#cbd5e1'}
                                />
                              </button>
                            );
                          })}
                        </div>

                        <select
                          className="form-control"
                          value={skill.level}
                          onChange={(e) => handleSkillLevelChange(skill.skillId, Number(e.target.value))}
                          style={{
                            height: 32,
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            color: prof.color,
                            background: 'var(--bg-card, #ffffff)',
                            border: '1px solid var(--border-light, #e2e8f0)',
                            borderRadius: 8,
                            padding: '0 0.55rem',
                            cursor: 'pointer',
                            minWidth: 155,
                          }}
                        >
                          {[1, 2, 3, 4, 5].map((lvl) => (
                            <option key={lvl} value={lvl}>
                              {PROFICIENCY_LABELS[lvl].text}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Delete button */}
                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(skill.skillId)}
                        title="Xóa kỹ năng này"
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#ef4444',
                          cursor: 'pointer',
                          padding: '0.4rem',
                          borderRadius: 6,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'background 120ms ease',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = '#fef2f2')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          TAB 3: QUY ĐỊNH ĐIỀU PHỐI
         ══════════════════════════════════════════════════════════════ */}
      {isStudent && activeTab === 'security' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Card 1: Trạng thái xác nhận quy định điều phối */}
          <div className="card" style={{ padding: '1.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.9rem' }}>
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 10,
                    background: authUser?.hasAcceptedTerms ? '#f0fdf4' : '#fff7ed',
                    color: authUser?.hasAcceptedTerms ? '#008837' : '#f26f21',
                    border: authUser?.hasAcceptedTerms ? '1px solid #bbf7d0' : '1px solid #fed7aa',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main, #0f172a)', margin: 0 }}>
                    Cam kết Quy định Ghép nhóm & Điều phối Môn EXE
                  </h2>
                  <p style={{ color: 'var(--text-muted, #64748b)', fontSize: '0.86rem', margin: '0.35rem 0 0', lineHeight: 1.55, maxWidth: 680 }}>
                    Moderator có toàn quyền chủ động điều phối sinh viên vào các nhóm khi nhóm chưa đủ số lượng tối đa hoặc sau thời hạn quy định.
                  </p>
                </div>
              </div>

              {authUser?.hasAcceptedTerms ? (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.4rem 0.85rem',
                    borderRadius: 999,
                    background: '#f0fdf4',
                    color: '#008837',
                    border: '1px solid #bbf7d0',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                  }}
                >
                  <CheckCircle2 size={15} />
                  <span>Đã xác nhận đồng ý</span>
                </span>
              ) : (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={async () => {
                    try {
                      const res = await acceptTerms();
                      setSuccessMsg(res.message);
                    } catch {
                      setError('Không thể ghi nhận xác nhận điều khoản.');
                    }
                  }}
                >
                  Xác nhận đồng ý ngay
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
