import React, { useState, useEffect, useCallback } from 'react';
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
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  ChevronRight,
  Award,
} from 'lucide-react';

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
// COMPONENT BIỂU ĐỒ RADAR 5 TRỤC (5-AXIS RADAR CHART - BR-05)
// ══════════════════════════════════════════════════════════════
const RadarChart5: React.FC<{
  tech: number;
  management: number;
  graphicDesign: number;
  marketing: number;
  sale: number;
}> = ({ tech, management, graphicDesign, marketing, sale }) => {
  const size = 320;
  const cx = size / 2;
  const cy = size / 2;
  const R = 100;

  // 5 trục: Tech (trên cùng), Management (phải trên), Sale (phải dưới), Marketing (trái dưới), Graphic Design (trái trên)
  const angles = [
    -Math.PI / 2, // Tech: -90°
    -Math.PI / 2 + (2 * Math.PI) / 5, // Management: -18°
    -Math.PI / 2 + (4 * Math.PI) / 5, // Sale: 54°
    -Math.PI / 2 + (6 * Math.PI) / 5, // Marketing: 126°
    -Math.PI / 2 + (8 * Math.PI) / 5, // Graphic Design: 198°
  ];

  const gridLevels = [0.2, 0.4, 0.6, 0.8, 1.0];
  const scores = [tech, management, sale, marketing, graphicDesign];

  const dataPoints = angles.map((angle, idx) => {
    const scoreFrac = Math.max(0.04, Math.min(1, scores[idx] / 100));
    const r = scoreFrac * R;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    return { x, y };
  });

  const polygonPointsStr = dataPoints.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  const skillLabels = [
    { name: 'Kỹ thuật (Tech)', score: tech, angle: angles[0], align: 'middle', dy: -14, dx: 0 },
    { name: 'Quản trị (Mgmt)', score: management, angle: angles[1], align: 'start', dy: 4, dx: 14 },
    { name: 'Bán hàng (Sale)', score: sale, angle: angles[2], align: 'start', dy: 14, dx: 10 },
    { name: 'Tiếp thị (Mkt)', score: marketing, angle: angles[3], align: 'end', dy: 14, dx: -10 },
    { name: 'Thiết kế (GD)', score: graphicDesign, angle: angles[4], align: 'end', dy: 4, dx: -14 },
  ];

  const avg = Math.round((tech + management + graphicDesign + marketing + sale) / 5);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        background: 'var(--bg-main, #f8fafc)',
        borderRadius: 14,
        padding: '1.25rem 1rem',
        border: '1px solid var(--border-light, #e2e8f0)',
      }}
    >
      <svg
        viewBox={`0 0 ${size} ${size}`}
        style={{ width: '100%', maxWidth: 330, height: 'auto', overflow: 'visible' }}
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
              fill={lIdx === gridLevels.length - 1 ? 'rgba(255, 255, 255, 0.65)' : 'none'}
              stroke="var(--border-medium, #cbd5e1)"
              strokeWidth={lIdx === gridLevels.length - 1 ? '1.5' : '1'}
              strokeDasharray={lIdx === gridLevels.length - 1 ? undefined : '3 3'}
              opacity={0.8}
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
            stroke="var(--border-light, #e2e8f0)"
            strokeWidth="1.2"
          />
        ))}

        {/* Đa giác dữ liệu 5 kỹ năng */}
        <polygon
          points={polygonPointsStr}
          fill="rgba(242, 111, 33, 0.24)"
          stroke="#f26f21"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />

        {/* Điểm nút đỉnh dữ liệu */}
        {dataPoints.map((p, pIdx) => (
          <circle
            key={pIdx}
            cx={p.x}
            cy={p.y}
            r={4.5}
            fill="#f26f21"
            stroke="#ffffff"
            strokeWidth="2"
          />
        ))}

        {/* Vòng tròn tâm hiển thị điểm trung bình */}
        <circle cx={cx} cy={cy} r={28} fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" />
        <text
          x={cx}
          y={cy - 4}
          textAnchor="middle"
          fontSize="9"
          fontWeight="700"
          fill="var(--text-muted, #64748b)"
          letterSpacing="0.05em"
        >
          ĐIỂM TB
        </text>
        <text
          x={cx}
          y={cy + 15}
          textAnchor="middle"
          fontSize="16"
          fontWeight="800"
          fill="#f26f21"
          fontFamily="var(--font-mono, monospace)"
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          {avg}%
        </text>

        {/* Nhãn 5 trục kỹ năng */}
        {skillLabels.map((lbl, idx) => {
          const lx = cx + (R + 8) * Math.cos(lbl.angle) + lbl.dx;
          const ly = cy + (R + 8) * Math.sin(lbl.angle) + lbl.dy;
          return (
            <g key={idx}>
              <text
                x={lx}
                y={ly}
                textAnchor={lbl.align as any}
                fontSize="11"
                fontWeight="700"
                fill="var(--text-main, #0f172a)"
              >
                {lbl.name}
              </text>
              <text
                x={lx}
                y={ly + 13}
                textAnchor={lbl.align as any}
                fontSize="11.5"
                fontWeight="800"
                fill="#f26f21"
                fontFamily="var(--font-mono, monospace)"
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {lbl.score}%
              </text>
            </g>
          );
        })}
      </svg>

      <div style={{ marginTop: '0.85rem', fontSize: '0.8rem', color: 'var(--text-muted, #64748b)', textAlign: 'center' }}>
        Biểu đồ Ngũ giác Năng lực EXE (Cập nhật thời gian thực theo thanh trượt)
      </div>
    </div>
  );
};

export const ProfilePage: React.FC = () => {
  const { user: authUser, updateUserData, changePassword, acceptTerms } = useAuth();

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

  // Active Tab: 'info' | 'skills' | 'security'
  const [activeTab, setActiveTab] = useState<'info' | 'skills' | 'security'>('info');

  // State đổi mật khẩu & BR-34
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const isStudent = profile?.role === 'Student' || authUser?.role === 'Student';

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      setError('Vui lòng nhập đầy đủ mật khẩu hiện tại và mật khẩu mới.');
      return;
    }
    if (
      newPassword.length < 8 ||
      !/[A-Z]/.test(newPassword) ||
      !/[0-9]/.test(newPassword) ||
      !/[^a-zA-Z0-9]/.test(newPassword)
    ) {
      setError('Mật khẩu mới phải có ít nhất 8 ký tự, gồm ít nhất 1 chữ hoa, 1 chữ số và 1 ký tự đặc biệt.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError('Mật khẩu xác nhận không trùng khớp.');
      return;
    }

    setChangingPassword(true);
    try {
      const res = await changePassword({
        currentPassword,
        newPassword,
        confirmNewPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setSuccessMsg(res.message || 'Đổi mật khẩu thành công!');
    } catch (err: any) {
      setError(
        err.response?.data?.detail ||
          err.response?.data?.title ||
          err.response?.data?.message ||
          'Mật khẩu hiện tại không chính xác hoặc dữ liệu không hợp lệ.'
      );
    } finally {
      setChangingPassword(false);
    }
  };

  // Tải dữ liệu hồ sơ từ Backend
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
    if (studentCode.trim()) {
      if (studentCode.trim().length > 20) {
        setError('Mã số sinh viên không được vượt quá 20 ký tự.');
        return false;
      }
      if (!/^[a-zA-Z0-9]+$/.test(studentCode.trim())) {
        setError('Mã số sinh viên chỉ được chứa các ký tự chữ và số (ví dụ: SE185102).');
        return false;
      }
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
      studentCode: studentCode.trim() || null,
      campus: campus.trim() || null,
      major: (major as Major) || null,
      bio: bio.trim() || null,
      desiredRole: desiredRole.trim() || null,
      availability,
      interests: interests.length > 0 ? interests : [],
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
      setError('Bạn bắt buộc phải tích chọn cam kết trung thực về hồ sơ 5 kỹ năng (Quy chuẩn BR-06) để lưu.');
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
      setSkills5Changed(false);
      setSuccessMsg('Đã lưu hồ sơ 5 kỹ năng cốt lõi và ghi nhận cam kết thành công (BR-05 & BR-06)!');
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
  const handleAddSkillToUser = () => {
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

    setUserSkills([...userSkills, newSkill]);
    setSelectedSkillIdToAdd('');
    setSkillsChanged(true);
    setError(null);
    setSuccessMsg(null);
  };

  // Thay đổi mức độ thành thạo của một kỹ năng
  const handleSkillLevelChange = (skillId: string, newLevel: number) => {
    setUserSkills(
      userSkills.map((s) => (s.skillId === skillId ? { ...s, level: newLevel } : s))
    );
    setSkillsChanged(true);
  };

  // Xóa kỹ năng khỏi danh sách cá nhân
  const handleRemoveSkill = (skillId: string) => {
    setUserSkills(userSkills.filter((s) => s.skillId !== skillId));
    setSkillsChanged(true);
  };

  // Lưu danh sách kỹ năng đồng loạt qua PUT /api/users/me/skills
  const handleSaveAllSkills = async () => {
    setSavingSkills(true);
    setError(null);
    setSuccessMsg(null);

    const payload = {
      skills: userSkills.map((s) => ({
        skillId: s.skillId,
        level: s.level,
      })),
    };

    try {
      const response = await apiClient.put<UserSkillResponse[]>('/users/me/skills', payload);
      setUserSkills(response.data);
      setSkillsChanged(false);
      setSuccessMsg('Đã lưu danh mục kỹ năng của bạn thành công!');
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
            border: '1px solid #fee2e2',
            background: '#ffffff',
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
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem' }}>
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
                Hồ sơ 5 kỹ năng chưa hoàn tất (Quy chuẩn BR-07)
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
          PAGE HEADER & OVERVIEW BANNER (WITH COHORT & BR-07 STATUS)
         ══════════════════════════════════════════════════════════════ */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, #061325 0%, #0054a6 60%, #f26f21 150%)',
          color: '#ffffff',
          padding: '2rem 2.25rem',
          borderRadius: 16,
          marginBottom: '1.5rem',
          boxShadow: '0 10px 25px -5px rgba(0, 84, 166, 0.25)',
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
            background: 'radial-gradient(circle, rgba(242, 111, 33, 0.25) 0%, transparent 70%)',
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
              {profile?.fullName ? profile.fullName.charAt(0).toUpperCase() : 'SV'}
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
                  {profile?.role || authUser?.role}
                </span>

                {/* Cohort Badge (BR-04) */}
                {profile?.cohort && (
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

              <div style={{ fontSize: '0.875rem', color: '#e2e8f0', marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.9rem', flexWrap: 'wrap' }}>
                <span>{profile?.email || authUser?.email}</span>
                {profile?.studentCode && (
                  <span>
                    • MSSV: <strong style={{ fontFamily: 'var(--font-mono, monospace)', fontVariantNumeric: 'tabular-nums' }}>{profile.studentCode}</strong>
                  </span>
                )}
                {profile?.major && (
                  <span>• Chuyên ngành: <strong>{currentMajorLabel}</strong></span>
                )}
                {profile?.campus && (
                  <span>• Cơ sở: <strong>{profile.campus}</strong></span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Badges: Availability & 5-Skills Completion */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
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

            {/* BR-07 Profile Completion Status Badge */}
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
                <span>5 Kỹ năng: Đã hoàn tất (BR-07)</span>
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
                <span>5 Kỹ năng: Chưa hoàn tất (BR-07)</span>
              </div>
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
          NAVIGATION TABS
         ══════════════════════════════════════════════════════════════ */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          borderBottom: '1px solid var(--border-light, #e2e8f0)',
          marginBottom: '1.5rem',
        }}
      >
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
          <KeyRound size={18} />
          <span>Bảo mật & Quy định (BR-34)</span>
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          TAB 1: THÔNG TIN HỒ SƠ & HỌC THUẬT (BR-04)
         ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'info' && (
        <div className="card" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main, #0f172a)', margin: 0 }}>
                Chi tiết hồ sơ học thuật & Cá nhân (BR-04)
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

              {/* Mã số sinh viên (MSSV) - BR-04 */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>Mã số sinh viên (MSSV)</span>
                  {isStudent && (
                    <span style={{ fontSize: '0.72rem', color: '#0054a6', fontWeight: 700 }}>
                      Cố định từ FAP (BR-04)
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ví dụ: SE180101"
                  value={studentCode}
                  onChange={(e) => setStudentCode(e.target.value.toUpperCase())}
                  disabled={!isEditing || savingProfile || isStudent}
                  style={{ fontFamily: 'var(--font-mono, monospace)', fontVariantNumeric: 'tabular-nums' }}
                />
              </div>

              {/* Khóa học (Cohort) - BR-04 */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>Khóa học (Cohort)</span>
                  <span style={{ fontSize: '0.72rem', color: '#f26f21', fontWeight: 700 }}>
                    Tự động từ MSSV (BR-04)
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

              {/* Chuyên ngành học (Major) - BR-04 */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>Chuyên ngành học (Major)</span>
                  {isStudent && (
                    <span style={{ fontSize: '0.72rem', color: '#0054a6', fontWeight: 700 }}>
                      Cố định từ FAP (BR-04)
                    </span>
                  )}
                </label>
                {isEditing && !isStudent ? (
                  <select
                    className="form-control"
                    value={major}
                    onChange={(e) => setMajor(e.target.value as Major)}
                    disabled={savingProfile}
                  >
                    {MAJORS.map((m) => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    className="form-control"
                    value={currentMajorLabel}
                    disabled
                    style={{ background: '#f8fafc', fontWeight: 600 }}
                  />
                )}
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
          TAB 2: 5 KỸ NĂNG CỐT LÕI (BR-05, BR-06, BR-07) & DANH MỤC KỸ NĂNG
         ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'skills' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
          {/* ──────────────────────────────────────────────────────────
              PHẦN 1: HỒ SƠ 5 KỸ NĂNG CỐT LÕI & BIỂU ĐỒ RADAR (BR-05 & BR-06)
             ────────────────────────────────────────────────────────── */}
          <div className="card" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <Award size={20} color="#f26f21" />
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main, #0f172a)', margin: 0 }}>
                    Hồ sơ 5 Kỹ năng Cốt lõi & Biểu đồ Radar (BR-05)
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
                  <span>Hồ sơ 5 kỹ năng đã hoàn tất (BR-07)</span>
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
                  <strong style={{ color: '#0f172a' }}>Cam kết trung thực về năng lực (Quy chuẩn BR-06):</strong> Tôi hoàn toàn chịu trách nhiệm về tính xác thực của thang điểm 5 kỹ năng đã tự đánh giá. Tôi hiểu rằng dữ liệu này là cơ sở quan trọng để thuật toán Matching phân bổ và tối ưu hóa cân bằng năng lực thành viên khi ghép nhóm đề tài EXE.
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
                  {skills5Changed ? '• Có thay đổi điểm số chưa được lưu lên hệ thống' : isProfileCompleted ? '• Hồ sơ 5 kỹ năng đã được lưu và có hiệu lực (BR-07)' : '• Vui lòng chọn điểm và lưu hồ sơ'}
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
                    <span>{saving5Skills ? 'Đang lưu hồ sơ 5 kỹ năng...' : 'Lưu hồ sơ 5 kỹ năng (BR-05 & BR-06)'}</span>
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
                    border: selectedCategory === cat.value ? '1px solid #f26f21' : '1px solid #e2e8f0',
                    background: selectedCategory === cat.value ? '#fff7ed' : '#ffffff',
                    color: selectedCategory === cat.value ? '#c2410c' : '#475569',
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
                  background: '#f8fafc',
                  borderRadius: 12,
                  border: '1px dashed #cbd5e1',
                }}
              >
                <Layers size={32} style={{ color: '#94a3b8', margin: '0 auto 0.5rem auto' }} />
                <div style={{ fontWeight: 700, color: '#334155', fontSize: '0.9rem' }}>
                  Chưa có kỹ năng bổ trợ nào được chọn
                </div>
                <div style={{ color: '#64748b', fontSize: '0.825rem', marginTop: '0.2rem' }}>
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
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                        flexWrap: 'wrap',
                        gap: '0.75rem',
                      }}
                    >
                      <div style={{ minWidth: 200 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.925rem', color: '#0f172a' }}>
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

                      {/* Interactive Proficiency Level */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          {[1, 2, 3, 4, 5].map((lvl) => (
                            <button
                              key={lvl}
                              type="button"
                              onClick={() => handleSkillLevelChange(skill.skillId, lvl)}
                              title={PROFICIENCY_LABELS[lvl].text}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                padding: '0.2rem',
                                cursor: 'pointer',
                                color: lvl <= skill.level ? '#f59e0b' : '#cbd5e1',
                                transition: 'transform 100ms ease',
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.2)')}
                              onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                            >
                              <Star
                                size={17}
                                fill={lvl <= skill.level ? '#f59e0b' : 'none'}
                              />
                            </button>
                          ))}
                        </div>

                        <span
                          style={{
                            fontSize: '0.775rem',
                            fontWeight: 700,
                            color: prof.color,
                            minWidth: 95,
                          }}
                        >
                          {prof.text.split(' - ')[1]}
                        </span>
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
          TAB 3: BẢO MẬT, ĐỔI MẬT KHẨU & QUY ĐỊNH ĐIỀU PHỐI (BR-34)
         ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'security' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Card 1: Trạng thái xác nhận quy định điều phối BR-34 */}
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
                    Cam kết Quy định Ghép nhóm & Điều phối Môn EXE (BR-34)
                  </h2>
                  <p style={{ color: 'var(--text-muted, #64748b)', fontSize: '0.86rem', margin: '0.35rem 0 0', lineHeight: 1.55, maxWidth: 680 }}>
                    Sinh viên tham gia học phần EXE cam kết tuân thủ quy tắc nhóm liên ngành (tối đa 6 thành viên, tối đa 3 SV khối Công nghệ SE/AI/IA) và đồng ý với sự phân bổ điều phối của Moderator / Giảng viên khi hết hạn ghép nhóm tự do.
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
                  <span>Đã xác nhận đồng ý (BR-34)</span>
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

          {/* Card 2: Đổi mật khẩu tài khoản */}
          <div className="card" style={{ padding: '1.75rem' }}>
            <div style={{ marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main, #0f172a)', margin: 0 }}>
                Đổi mật khẩu đăng nhập
              </h2>
              <p style={{ color: 'var(--text-muted, #64748b)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                Nếu bạn vừa nhận mật khẩu khởi tạo từ danh sách FAP qua email trường, hãy đổi sang mật khẩu cá nhân để bảo mật tài khoản.
              </p>
            </div>

            <form onSubmit={handleChangePasswordSubmit} style={{ maxWidth: 520 }}>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label" style={{ fontWeight: 600 }}>
                  Mật khẩu hiện tại *
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} style={{ position: 'absolute', left: 12, top: 12, color: '#94a3b8' }} />
                  <input
                    type={showPasswords ? 'text' : 'password'}
                    className="form-control"
                    placeholder="Nhập mật khẩu đang sử dụng..."
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    disabled={changingPassword}
                    style={{ paddingLeft: '2.35rem', paddingRight: '2.5rem' }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords((v) => !v)}
                    aria-label={showPasswords ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    style={{
                      position: 'absolute',
                      right: 10,
                      top: 10,
                      background: 'transparent',
                      border: 'none',
                      color: '#64748b',
                      cursor: 'pointer',
                    }}
                  >
                    {showPasswords ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label" style={{ fontWeight: 600 }}>
                  Mật khẩu mới *
                </label>
                <input
                  type={showPasswords ? 'text' : 'password'}
                  className="form-control"
                  placeholder="Tối thiểu 8 ký tự, gồm chữ hoa, chữ số và ký tự đặc biệt"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={changingPassword}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1.35rem' }}>
                <label className="form-label" style={{ fontWeight: 600 }}>
                  Xác nhận mật khẩu mới *
                </label>
                <input
                  type={showPasswords ? 'text' : 'password'}
                  className="form-control"
                  placeholder="Nhập lại mật khẩu mới"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  disabled={changingPassword}
                  required
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={changingPassword}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}
              >
                <KeyRound size={16} />
                <span>{changingPassword ? 'Đang cập nhật mật khẩu...' : 'Lưu mật khẩu mới'}</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
