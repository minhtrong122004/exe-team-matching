import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import type {
  UserProfileResponse,
  UpdateUserProfileRequest,
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
} from 'lucide-react';

const MAJORS: { value: Major; label: string }[] = [
  { value: 'SE', label: 'SE — Kỹ thuật phần mềm (Software Engineering)' },
  { value: 'AI', label: 'AI — Trí tuệ nhân tạo (Artificial Intelligence)' },
  { value: 'IA', label: 'IA — An toàn thông tin (Information Assurance)' },
  { value: 'GD', label: 'GD — Thiết kế mỹ thuật số / UI-UX (Graphic Design)' },
  { value: 'MKT', label: 'MKT — Tiếp thị số (Digital Marketing)' },
  { value: 'IB', label: 'IB — Kinh doanh quốc tế (International Business)' },
  { value: 'Other', label: 'Other — Chuyên ngành khác' },
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

export const ProfilePage: React.FC = () => {
  const { user: authUser, updateUserData } = useAuth();

  // State hồ sơ
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

  // State kỹ năng
  const [skillsCatalog, setSkillsCatalog] = useState<SkillResponse[]>([]);
  const [userSkills, setUserSkills] = useState<UserSkillResponse[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<SkillCategory | 'ALL'>('ALL');
  const [skillSearchQuery, setSkillSearchQuery] = useState('');
  const [selectedSkillIdToAdd, setSelectedSkillIdToAdd] = useState<string>('');
  const [selectedSkillLevel, setSelectedSkillLevel] = useState<number>(3);
  const [savingSkills, setSavingSkills] = useState<boolean>(false);
  const [skillsChanged, setSkillsChanged] = useState<boolean>(false);

  // Active Tab: 'info' | 'skills'
  const [activeTab, setActiveTab] = useState<'info' | 'skills'>('info');

  // Tải dữ liệu hồ sơ từ Backend
  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get<UserProfileResponse>('/users/me');
      const data = response.data;
      setProfile(data);

      // Điền vào form
      setFullName(data.fullName || '');
      setStudentCode(data.studentCode || '');
      setCampus(data.campus || 'TP. Hồ Chí Minh (HCM)');
      setMajor(data.major || 'SE');
      setBio(data.bio || '');
      setDesiredRole(data.desiredRole || '');
      setAvailability(data.availability || 'LookingForTeam');
      setInterests(data.interests ? [...data.interests] : []);
      setUserSkills(data.skills ? [...data.skills] : []);
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
    });
  }, [fetchProfile, fetchSkillsCatalog]);

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

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', paddingBottom: '3rem' }}>
      {/* ══════════════════════════════════════════════════════════════
          PAGE HEADER & OVERVIEW BANNER
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
                width: 72,
                height: 72,
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.15)',
                backdropFilter: 'blur(10px)',
                border: '2px solid rgba(255, 255, 255, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.75rem',
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
              </div>

              <div style={{ fontSize: '0.875rem', color: '#e2e8f0', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <span>{profile?.email || authUser?.email}</span>
                {profile?.studentCode && (
                  <span>• MSSV: <strong>{profile.studentCode}</strong></span>
                )}
                {profile?.campus && (
                  <span>• Cơ sở: <strong>{profile.campus}</strong></span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Availability Badge */}
          <div
            style={{
              padding: '0.5rem 0.95rem',
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
            transition: 'all 150ms ease',
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
            transition: 'all 150ms ease',
          }}
        >
          <Sparkles size={18} />
          <span>Kỹ năng & Mức độ thành thạo ({userSkills.length})</span>
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          TAB 1: THÔNG TIN HỒ SƠ & HỌC THUẬT
         ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'info' && (
        <div className="card" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main, #0f172a)', margin: 0 }}>
                Chi tiết hồ sơ thành viên
              </h2>
              <p style={{ color: 'var(--text-muted, #64748b)', fontSize: '0.85rem', marginTop: '0.2rem' }}>
                Thông tin này sẽ được thuật toán Matching sử dụng để đề xuất nhóm khởi nghiệp phù hợp
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

              {/* Mã số sinh viên */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 600 }}>
                  Mã số sinh viên (MSSV)
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ví dụ: SE185102"
                  value={studentCode}
                  onChange={(e) => setStudentCode(e.target.value.toUpperCase())}
                  disabled={!isEditing || savingProfile}
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

              {/* Chuyên ngành */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 600 }}>Chuyên ngành học (Major)</label>
                {isEditing ? (
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
                    value={MAJORS.find((m) => m.value === major)?.label || major || 'Chưa cập nhật'}
                    disabled
                  />
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
          TAB 2: KỸ NĂNG & MỨC ĐỘ THÀNH THẠO
         ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'skills' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Card 1: Chọn và thêm kỹ năng mới từ danh mục */}
          <div className="card" style={{ padding: '1.75rem' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main, #0f172a)', marginBottom: '0.35rem' }}>
              Thêm kỹ năng từ danh mục hệ thống
            </h2>
            <p style={{ color: 'var(--text-muted, #64748b)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              Chọn kỹ năng chuyên môn từ danh mục chính thức của Đại học FPT và thiết lập mức độ thành thạo của bạn
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px auto', gap: '0.75rem', alignItems: 'flex-end' }}>
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
          </div>

          {/* Card 2: Danh sách kỹ năng của sinh viên */}
          <div className="card" style={{ padding: '1.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main, #0f172a)', margin: 0 }}>
                  Danh sách kỹ năng đã chọn ({userSkills.length})
                </h2>
                <p style={{ color: 'var(--text-muted, #64748b)', fontSize: '0.85rem', marginTop: '0.2rem' }}>
                  Điều chỉnh mức độ thành thạo hoặc xóa kỹ năng không còn phù hợp
                </p>
              </div>

              {skillsChanged && (
                <button
                  type="button"
                  onClick={handleSaveAllSkills}
                  className="btn btn-primary"
                  disabled={savingSkills}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.85rem' }}
                >
                  <Save size={16} />
                  <span>{savingSkills ? 'Đang lưu...' : 'Lưu thay đổi kỹ năng'}</span>
                </button>
              )}
            </div>

            {userSkills.length === 0 ? (
              <div
                style={{
                  padding: '3rem 1rem',
                  textAlign: 'center',
                  background: '#f8fafc',
                  borderRadius: 12,
                  border: '1px dashed #cbd5e1',
                }}
              >
                <Layers size={36} style={{ color: '#94a3b8', margin: '0 auto 0.75rem auto' }} />
                <div style={{ fontWeight: 700, color: '#334155', fontSize: '0.95rem' }}>
                  Chưa có kỹ năng nào trong hồ sơ
                </div>
                <div style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                  Hãy chọn kỹ năng từ danh mục phía trên để hoàn thiện hồ sơ ứng viên
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
                        padding: '1rem 1.25rem',
                        borderRadius: 10,
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                        flexWrap: 'wrap',
                        gap: '0.75rem',
                      }}
                    >
                      <div style={{ minWidth: 220 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a' }}>
                          {skill.skillName}
                        </div>
                        <span
                          style={{
                            display: 'inline-block',
                            marginTop: '0.25rem',
                            padding: '0.15rem 0.55rem',
                            borderRadius: 6,
                            fontSize: '0.725rem',
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
                                size={18}
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
                            minWidth: 100,
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

            {/* Bottom Save Bar when skills are modified */}
            {skillsChanged && (
              <div
                style={{
                  marginTop: '1.5rem',
                  paddingTop: '1.25rem',
                  borderTop: '1px solid #f1f5f9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: '#fff7ed',
                  padding: '1rem 1.25rem',
                  borderRadius: 8,
                  border: '1px solid #fed7aa',
                }}
              >
                <div style={{ fontSize: '0.85rem', color: '#c2410c', fontWeight: 600 }}>
                  Bạn có thay đổi kỹ năng chưa được lưu lên hệ thống.
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={fetchUserSkills}
                    className="btn"
                    disabled={savingSkills}
                    style={{ background: '#ffffff', color: '#475569', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveAllSkills}
                    className="btn btn-primary"
                    disabled={savingSkills}
                    style={{ fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                  >
                    <Save size={15} />
                    <span>{savingSkills ? 'Đang lưu...' : 'Lưu thay đổi kỹ năng'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
