import React, { useState, useEffect, useCallback, useId } from 'react';
import apiClient from '../api/client';
import type {
  CandidateProfileResponse,
  Major,
  UserAvailability,
  SkillResponse,
  PagedResult,
} from '../types';
import {
  Users,
  Search,
  GraduationCap,
  Sparkles,
  MapPin,
  Briefcase,
  X,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Tag,
  RotateCcw,
  UserCheck,
  UserX,
} from 'lucide-react';

const MAJOR_OPTIONS: { value: Major; label: string; color: string; bg: string }[] = [
  { value: 'SE', label: 'SE - Kỹ thuật phần mềm', color: '#0284c7', bg: '#e0f2fe' },
  { value: 'AI', label: 'AI - Trí tuệ nhân tạo', color: '#9333ea', bg: '#f3e8ff' },
  { value: 'IA', label: 'IA - An toàn thông tin', color: '#dc2626', bg: '#fee2e2' },
  { value: 'GD', label: 'GD - Thiết kế đồ họa', color: '#db2777', bg: '#fce7f3' },
  { value: 'MKT', label: 'MKT - Digital Marketing', color: '#d97706', bg: '#fef3c7' },
  { value: 'IB', label: 'IB - Kinh doanh quốc tế', color: '#059669', bg: '#d1fae5' },
  { value: 'Other', label: 'Khác', color: '#475569', bg: '#f1f5f9' },
];

export const CandidateDiscoveryPage: React.FC = () => {
  const searchInputId = useId();
  const majorSelectId = useId();
  const skillSelectId = useId();
  const availabilitySelectId = useId();

  // Danh sách ứng viên & phân trang
  const [candidates, setCandidates] = useState<CandidateProfileResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(9); // 3x3 grid
  const [totalCount, setTotalCount] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);

  // Bộ lọc
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [selectedMajor, setSelectedMajor] = useState<Major | 'ALL'>('ALL');
  const [selectedSkill, setSelectedSkill] = useState<string>('');
  const [onlyLookingForTeam, setOnlyLookingForTeam] = useState<boolean>(true);

  // Danh mục kỹ năng từ API
  const [systemSkills, setSystemSkills] = useState<SkillResponse[]>([]);

  // Modal xem chi tiết ứng viên
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateProfileResponse | null>(null);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Load danh mục kỹ năng hệ thống (GET /api/skills)
  useEffect(() => {
    const fetchSkills = async () => {
      try {
        const res = await apiClient.get<SkillResponse[]>('/skills');
        if (Array.isArray(res.data)) {
          setSystemSkills(res.data);
        }
      } catch (err) {
        console.warn('Không thể tải danh sách kỹ năng hệ thống:', err);
      }
    };
    fetchSkills();
  }, []);

  // Fetch danh sách ứng viên (GET /api/users)
  const fetchCandidates = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params: Record<string, any> = {
        page,
        pageSize,
        sortDir: 'desc',
      };

      if (debouncedSearch) {
        params.search = debouncedSearch;
      }
      if (selectedMajor !== 'ALL') {
        params.major = selectedMajor;
      }
      if (selectedSkill) {
        params.skill = selectedSkill;
      }
      if (onlyLookingForTeam) {
        params.availability = 'LookingForTeam';
      }

      const res = await apiClient.get<PagedResult<CandidateProfileResponse>>('/users', { params });
      const data = res.data;

      setCandidates(data.items || []);
      setTotalCount(data.totalCount || 0);
      setTotalPages(data.totalPages || 1);
    } catch (err: any) {
      console.error('Lỗi khi tải danh sách ứng viên:', err);
      const detail =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        'Không thể tải danh sách ứng viên. Vui lòng thử lại sau.';
      setError(detail);
      setCandidates([]);
      setTotalCount(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, debouncedSearch, selectedMajor, selectedSkill, onlyLookingForTeam]);

  useEffect(() => {
    fetchCandidates();
  }, [fetchCandidates]);

  // Reset filters
  const handleResetFilters = () => {
    setSearchTerm('');
    setDebouncedSearch('');
    setSelectedMajor('ALL');
    setSelectedSkill('');
    setOnlyLookingForTeam(true);
    setPage(1);
  };

  const getInitials = (name: string): string => {
    if (!name) return 'SV';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const getAvatarGradient = (userId: string): string => {
    const gradients = [
      'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
      'linear-gradient(135deg, #f26f21 0%, #c2410c 100%)',
      'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)',
      'linear-gradient(135deg, #059669 0%, #047857 100%)',
      'linear-gradient(135deg, #db2777 0%, #be185d 100%)',
      'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
    ];
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % gradients.length;
    return gradients[index];
  };

  const getMajorMeta = (major?: Major | null) => {
    if (!major) return null;
    return MAJOR_OPTIONS.find((m) => m.value === major) || {
      value: major,
      label: major,
      color: '#475569',
      bg: '#f1f5f9',
    };
  };

  const renderAvailabilityBadge = (availability: UserAvailability) => {
    if (availability === 'LookingForTeam') {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.25rem 0.65rem',
            borderRadius: 9999,
            fontSize: '0.75rem',
            fontWeight: 700,
            background: '#dcfce7',
            color: '#15803d',
            border: '1px solid #bbf7d0',
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: '#16a34a',
              boxShadow: '0 0 0 2px rgba(34, 197, 94, 0.3)',
            }}
          />
          Đang tìm nhóm
        </span>
      );
    }
    if (availability === 'InTeam') {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.25rem 0.65rem',
            borderRadius: 9999,
            fontSize: '0.75rem',
            fontWeight: 600,
            background: '#e0f2fe',
            color: '#0369a1',
            border: '1px solid #bae6fd',
          }}
        >
          <UserCheck size={12} />
          Đã có nhóm
        </span>
      );
    }
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.35rem',
          padding: '0.25rem 0.65rem',
          borderRadius: 9999,
          fontSize: '0.75rem',
          fontWeight: 600,
          background: '#f1f5f9',
          color: '#64748b',
          border: '1px solid #e2e8f0',
        }}
      >
        <UserX size={12} />
        Tạm dừng
      </span>
    );
  };

  const getSkillLevelText = (level: number): string => {
    switch (level) {
      case 1:
        return 'Nhập môn';
      case 2:
        return 'Cơ bản';
      case 3:
        return 'Thành thạo';
      case 4:
        return 'Nâng cao';
      case 5:
        return 'Chuyên gia';
      default:
        return `Level ${level}`;
    }
  };

  return (
    <div style={{ maxWidth: 1240, margin: '0 auto', padding: '1rem 0 3rem' }}>
      {/* ══════════════════════════════════════════════════════════════
          PAGE HEADER
         ══════════════════════════════════════════════════════════════ */}
      <div
        style={{
          background: 'linear-gradient(135deg, #061325 0%, #0c2340 50%, #0054a6 100%)',
          borderRadius: 20,
          padding: '2.5rem',
          color: '#ffffff',
          position: 'relative',
          overflow: 'hidden',
          marginBottom: '2rem',
          boxShadow: '0 10px 25px -5px rgba(0, 84, 166, 0.25)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
            pointerEvents: 'none',
          }}
        />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 780 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.35rem 0.85rem',
              borderRadius: 9999,
              background: 'rgba(242, 111, 33, 0.2)',
              border: '1px solid rgba(242, 111, 33, 0.4)',
              color: '#fba46e',
              fontSize: '0.8rem',
              fontWeight: 700,
              letterSpacing: '0.04em',
              marginBottom: '1rem',
            }}
          >
            <Sparkles size={14} color="#f26f21" />
            HỆ SINH THÁI KẾT NỐI ĐỀ TÀI & NHÓM KHỞI NGHIỆP
          </div>

          <h1
            style={{
              fontSize: '2.1rem',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              lineHeight: 1.25,
              marginBottom: '0.75rem',
            }}
          >
            Danh bạ Ứng viên & Thành viên EXE
          </h1>

          <p style={{ color: '#cbd5e1', fontSize: '1rem', lineHeight: 1.6, margin: 0 }}>
            Tìm kiếm sinh viên đồng hành phù hợp với dự án khởi nghiệp của bạn. Lọc theo chuyên ngành
            (Software Engineering, AI, IA, Graphic Design, Marketing...), kỹ năng công nghệ và trạng thái tìm nhóm.
          </p>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          FILTER CONTROLS BAR
         ══════════════════════════════════════════════════════════════ */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: 16,
          padding: '1.5rem',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.04)',
          marginBottom: '2rem',
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
          {/* Keyword Search */}
          <div>
            <label
              htmlFor={searchInputId}
              style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '0.4rem' }}
            >
              Tìm kiếm theo tên / định hướng
            </label>
            <div style={{ position: 'relative' }}>
              <Search size={17} style={{ position: 'absolute', left: 12, top: 12, color: '#94a3b8' }} />
              <input
                id={searchInputId}
                type="text"
                className="form-control"
                placeholder="Nhập họ tên, vị trí (Frontend, AI...)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ paddingLeft: '2.4rem', height: 40 }}
              />
            </div>
          </div>

          {/* Major Filter */}
          <div>
            <label
              htmlFor={majorSelectId}
              style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '0.4rem' }}
            >
              Chuyên ngành
            </label>
            <div style={{ position: 'relative' }}>
              <GraduationCap size={17} style={{ position: 'absolute', left: 12, top: 12, color: '#94a3b8' }} />
              <select
                id={majorSelectId}
                className="form-control"
                value={selectedMajor}
                onChange={(e) => {
                  setSelectedMajor(e.target.value as Major | 'ALL');
                  setPage(1);
                }}
                style={{ paddingLeft: '2.4rem', height: 40 }}
              >
                <option value="ALL">Tất cả chuyên ngành</option>
                {MAJOR_OPTIONS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Skill Filter */}
          <div>
            <label
              htmlFor={skillSelectId}
              style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '0.4rem' }}
            >
              Kỹ năng công nghệ
            </label>
            <div style={{ position: 'relative' }}>
              <Tag size={17} style={{ position: 'absolute', left: 12, top: 12, color: '#94a3b8' }} />
              <select
                id={skillSelectId}
                className="form-control"
                value={selectedSkill}
                onChange={(e) => {
                  setSelectedSkill(e.target.value);
                  setPage(1);
                }}
                style={{ paddingLeft: '2.4rem', height: 40 }}
              >
                <option value="">Tất cả kỹ năng</option>
                {systemSkills.map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.name} ({s.category})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Availability Filter */}
          <div>
            <label
              htmlFor={availabilitySelectId}
              style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '0.4rem' }}
            >
              Trạng thái ghép nhóm
            </label>
            <div style={{ position: 'relative' }}>
              <Users size={17} style={{ position: 'absolute', left: 12, top: 12, color: '#94a3b8' }} />
              <select
                id={availabilitySelectId}
                className="form-control"
                value={onlyLookingForTeam ? 'LookingForTeam' : 'ALL'}
                onChange={(e) => {
                  setOnlyLookingForTeam(e.target.value === 'LookingForTeam');
                  setPage(1);
                }}
                style={{ paddingLeft: '2.4rem', height: 40 }}
              >
                <option value="LookingForTeam">Chỉ hiện người đang tìm nhóm</option>
                <option value="ALL">Tất cả trạng thái (Đã có nhóm / Tạm dừng)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Quick Filter Pills & Reset */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
            paddingTop: '0.75rem',
            borderTop: '1px solid #f1f5f9',
          }}
        >
          {/* Quick major pill buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Lọc nhanh:</span>
            <button
              type="button"
              onClick={() => {
                setSelectedMajor('ALL');
                setPage(1);
              }}
              style={{
                background: selectedMajor === 'ALL' ? '#f26f21' : '#f1f5f9',
                color: selectedMajor === 'ALL' ? '#ffffff' : '#475569',
                border: 'none',
                borderRadius: 9999,
                padding: '0.25rem 0.75rem',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              Tất cả
            </button>
            {MAJOR_OPTIONS.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => {
                  setSelectedMajor(m.value);
                  setPage(1);
                }}
                style={{
                  background: selectedMajor === m.value ? m.color : m.bg,
                  color: selectedMajor === m.value ? '#ffffff' : m.color,
                  border: `1px solid ${selectedMajor === m.value ? m.color : 'transparent'}`,
                  borderRadius: 9999,
                  padding: '0.25rem 0.75rem',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {m.value}
              </button>
            ))}
          </div>

          {/* Reset button */}
          {(searchTerm || selectedMajor !== 'ALL' || selectedSkill || !onlyLookingForTeam) && (
            <button
              type="button"
              onClick={handleResetFilters}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                background: 'none',
                border: 'none',
                color: '#f26f21',
                fontSize: '0.825rem',
                fontWeight: 600,
                cursor: 'pointer',
                padding: '0.2rem 0.5rem',
              }}
            >
              <RotateCcw size={14} /> Xóa bộ lọc
            </button>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          RESULTS STATUS BAR
         ══════════════════════════════════════════════════════════════ */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.25rem',
          padding: '0 0.5rem',
        }}
      >
        <div style={{ fontSize: '0.95rem', color: '#334155', fontWeight: 600 }}>
          Tìm thấy <span style={{ color: '#f26f21', fontWeight: 800 }}>{totalCount}</span> ứng viên
          {selectedMajor !== 'ALL' && ` ngành ${selectedMajor}`}
          {selectedSkill && ` với kỹ năng "${selectedSkill}"`}
          {onlyLookingForTeam && ' đang tìm nhóm'}
        </div>
        <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
          Trang {page} / {totalPages}
        </div>
      </div>

      {/* Error Notice */}
      {error && (
        <div
          style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#dc2626',
            padding: '1rem',
            borderRadius: 12,
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
          }}
        >
          <X size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          CANDIDATE CARDS GRID
         ══════════════════════════════════════════════════════════════ */}
      {loading ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: '1.5rem',
            minHeight: 300,
          }}
        >
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              style={{
                background: '#ffffff',
                borderRadius: 16,
                padding: '1.5rem',
                border: '1px solid #e2e8f0',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                animation: 'pulse 1.5s infinite ease-in-out',
              }}
            >
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div style={{ width: 54, height: 54, borderRadius: '50%', background: '#e2e8f0' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ width: '60%', height: 16, background: '#e2e8f0', borderRadius: 4, marginBottom: 8 }} />
                  <div style={{ width: '40%', height: 12, background: '#f1f5f9', borderRadius: 4 }} />
                </div>
              </div>
              <div style={{ height: 40, background: '#f8fafc', borderRadius: 8 }} />
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <div style={{ width: 60, height: 22, background: '#e2e8f0', borderRadius: 9999 }} />
                <div style={{ width: 70, height: 22, background: '#e2e8f0', borderRadius: 9999 }} />
              </div>
            </div>
          ))}
        </div>
      ) : candidates.length === 0 ? (
        <div
          style={{
            background: '#ffffff',
            borderRadius: 16,
            padding: '4rem 2rem',
            textAlign: 'center',
            border: '1px solid #e2e8f0',
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: '#f1f5f9',
              color: '#94a3b8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem',
            }}
          >
            <Users size={32} />
          </div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.5rem' }}>
            Không tìm thấy ứng viên phù hợp
          </h3>
          <p style={{ color: '#64748b', fontSize: '0.9rem', maxWidth: 420, margin: '0 auto 1.5rem' }}>
            Thử mở rộng tiêu chí tìm kiếm, chọn &quot;Tất cả chuyên ngành&quot; hoặc tắt điều kiện &quot;Chỉ hiện người đang tìm nhóm&quot;.
          </p>
          <button
            type="button"
            className="btn btn-outline"
            onClick={handleResetFilters}
            style={{ borderRadius: 10, padding: '0.6rem 1.25rem', fontWeight: 600 }}
          >
            Xóa bộ lọc tìm kiếm
          </button>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: '1.5rem',
          }}
        >
          {candidates.map((c) => {
            const majorMeta = getMajorMeta(c.major);

            return (
              <div
                key={c.userId}
                style={{
                  background: '#ffffff',
                  borderRadius: 16,
                  border: '1px solid #e2e8f0',
                  padding: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease',
                  cursor: 'pointer',
                }}
                onClick={() => setSelectedCandidate(c)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-3px)';
                  e.currentTarget.style.boxShadow = '0 10px 20px -5px rgba(0, 84, 166, 0.12)';
                  e.currentTarget.style.borderColor = '#f26f21';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.03)';
                  e.currentTarget.style.borderColor = '#e2e8f0';
                }}
              >
                <div>
                  {/* Top Header: Avatar & Status */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'center' }}>
                      <div
                        style={{
                          width: 52,
                          height: 52,
                          borderRadius: '50%',
                          background: getAvatarGradient(c.userId),
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1.15rem',
                          fontWeight: 800,
                          letterSpacing: '0.03em',
                          flexShrink: 0,
                          boxShadow: '0 4px 10px rgba(0, 0, 0, 0.1)',
                        }}
                      >
                        {getInitials(c.fullName)}
                      </div>
                      <div>
                        <h3
                          style={{
                            fontSize: '1.05rem',
                            fontWeight: 700,
                            color: '#0f172a',
                            margin: 0,
                            lineHeight: 1.3,
                          }}
                        >
                          {c.fullName}
                        </h3>
                        {c.campus && (
                          <div
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              fontSize: '0.775rem',
                              color: '#64748b',
                              marginTop: 2,
                            }}
                          >
                            <MapPin size={12} />
                            <span>Cơ sở {c.campus}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div>{renderAvailabilityBadge(c.availability)}</div>
                  </div>

                  {/* Major Badge & Desired Role */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.85rem' }}>
                    {majorMeta && (
                      <span
                        style={{
                          padding: '0.2rem 0.65rem',
                          borderRadius: 6,
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          background: majorMeta.bg,
                          color: majorMeta.color,
                        }}
                      >
                        {majorMeta.label}
                      </span>
                    )}
                    {c.desiredRole && (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          padding: '0.2rem 0.65rem',
                          borderRadius: 6,
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          background: '#f8fafc',
                          color: '#334155',
                          border: '1px solid #e2e8f0',
                        }}
                      >
                        <Briefcase size={12} color="#f26f21" />
                        {c.desiredRole}
                      </span>
                    )}
                  </div>

                  {/* Bio */}
                  {c.bio ? (
                    <p
                      style={{
                        fontSize: '0.85rem',
                        color: '#64748b',
                        lineHeight: 1.5,
                        margin: '0 0 1rem 0',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {c.bio}
                    </p>
                  ) : (
                    <p style={{ fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic', margin: '0 0 1rem 0' }}>
                      Chưa cập nhật phần giới thiệu bản thân.
                    </p>
                  )}

                  {/* Skills Chips */}
                  {c.skills && c.skills.length > 0 && (
                    <div style={{ marginBottom: '1rem' }}>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, marginBottom: '0.4rem' }}>
                        KỸ NĂNG CHÍNH:
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                        {c.skills.slice(0, 4).map((s) => (
                          <span
                            key={s.skillId}
                            style={{
                              padding: '0.2rem 0.55rem',
                              borderRadius: 6,
                              fontSize: '0.75rem',
                              background: '#f8fafc',
                              border: '1px solid #e2e8f0',
                              color: '#1e293b',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                            }}
                          >
                            <span>{s.skillName}</span>
                            <span style={{ fontSize: '0.7rem', color: '#f26f21', fontWeight: 700 }}>
                              ★{s.level}
                            </span>
                          </span>
                        ))}
                        {c.skills.length > 4 && (
                          <span
                            style={{
                              padding: '0.2rem 0.5rem',
                              borderRadius: 6,
                              fontSize: '0.75rem',
                              background: '#f1f5f9',
                              color: '#64748b',
                              fontWeight: 600,
                            }}
                          >
                            +{c.skills.length - 4}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Interests */}
                  {c.interests && c.interests.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '1rem' }}>
                      {c.interests.slice(0, 3).map((item, idx) => (
                        <span key={idx} style={{ fontSize: '0.75rem', color: '#0284c7', fontWeight: 500 }}>
                          #{item}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Bottom Card Action */}
                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '0.85rem', marginTop: '0.5rem' }}>
                  <button
                    type="button"
                    className="btn btn-outline"
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      fontSize: '0.85rem',
                      borderRadius: 8,
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.4rem',
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedCandidate(c);
                    }}
                  >
                    <span>Xem hồ sơ chi tiết</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          PAGINATION BAR
         ══════════════════════════════════════════════════════════════ */}
      {totalPages > 1 && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '0.5rem',
            marginTop: '2.5rem',
          }}
        >
          <button
            type="button"
            className="btn btn-outline"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            style={{ padding: '0.5rem 0.8rem', borderRadius: 8, fontSize: '0.85rem' }}
          >
            <ChevronLeft size={16} /> Trước
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
            if (p === 1 || p === totalPages || (p >= page - 1 && p <= page + 1)) {
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPage(p)}
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 8,
                    fontSize: '0.875rem',
                    fontWeight: 700,
                    border: p === page ? 'none' : '1px solid #cbd5e1',
                    background: p === page ? '#f26f21' : '#ffffff',
                    color: p === page ? '#ffffff' : '#334155',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {p}
                </button>
              );
            }
            if (p === page - 2 || p === page + 2) {
              return (
                <span key={p} style={{ padding: '0 0.25rem', color: '#94a3b8' }}>
                  ...
                </span>
              );
            }
            return null;
          })}

          <button
            type="button"
            className="btn btn-outline"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            style={{ padding: '0.5rem 0.8rem', borderRadius: 8, fontSize: '0.85rem' }}
          >
            Sau <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          CANDIDATE DETAIL MODAL
         ══════════════════════════════════════════════════════════════ */}
      {selectedCandidate && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
          onClick={() => setSelectedCandidate(null)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 20,
              maxWidth: 600,
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '2rem',
              position: 'relative',
              boxShadow: '0 20px 30px rgba(0, 0, 0, 0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              type="button"
              onClick={() => setSelectedCandidate(null)}
              style={{
                position: 'absolute',
                right: 20,
                top: 20,
                background: '#f1f5f9',
                border: 'none',
                borderRadius: '50%',
                width: 36,
                height: 36,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#64748b',
                cursor: 'pointer',
              }}
            >
              <X size={18} />
            </button>

            {/* Header with Avatar & Meta */}
            <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: '50%',
                  background: getAvatarGradient(selectedCandidate.userId),
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.6rem',
                  fontWeight: 800,
                  flexShrink: 0,
                  boxShadow: '0 6px 14px rgba(0, 0, 0, 0.15)',
                }}
              >
                {getInitials(selectedCandidate.fullName)}
              </div>
              <div>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.25rem 0' }}>
                  {selectedCandidate.fullName}
                </h2>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  {renderAvailabilityBadge(selectedCandidate.availability)}
                  {selectedCandidate.campus && (
                    <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                      <MapPin size={13} />
                      Cơ sở {selectedCandidate.campus}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Specs */}
            <div
              style={{
                background: '#f8fafc',
                borderRadius: 12,
                padding: '1rem',
                border: '1px solid #e2e8f0',
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '0.75rem',
                marginBottom: '1.5rem',
                fontSize: '0.85rem',
              }}
            >
              <div>
                <span style={{ color: '#64748b', display: 'block', marginBottom: 2 }}>Chuyên ngành:</span>
                <strong style={{ color: '#0f172a' }}>
                  {getMajorMeta(selectedCandidate.major)?.label || 'Chưa cập nhật'}
                </strong>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', marginBottom: 2 }}>Vị trí mong muốn:</span>
                <strong style={{ color: '#0f172a' }}>{selectedCandidate.desiredRole || 'Linh hoạt'}</strong>
              </div>
            </div>

            {/* Bio Section */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#334155', marginBottom: '0.5rem' }}>
                Giới thiệu bản thân
              </h4>
              <p
                style={{
                  fontSize: '0.9rem',
                  color: '#475569',
                  lineHeight: 1.6,
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 10,
                  padding: '1rem',
                  margin: 0,
                }}
              >
                {selectedCandidate.bio || 'Ứng viên chưa cung cấp thông tin giới thiệu chi tiết.'}
              </p>
            </div>

            {/* Skills with Proficiency Levels */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#334155', marginBottom: '0.75rem' }}>
                Kỹ năng & Mức độ thành thạo
              </h4>
              {selectedCandidate.skills && selectedCandidate.skills.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {selectedCandidate.skills.map((s) => (
                    <div
                      key={s.skillId}
                      style={{
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: 10,
                        padding: '0.75rem 1rem',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <span style={{ fontWeight: 600, fontSize: '0.875rem', color: '#1e293b' }}>{s.skillName}</span>
                        <span style={{ fontSize: '0.775rem', fontWeight: 700, color: '#f26f21' }}>
                          Level {s.level}/5 • {getSkillLevelText(s.level)}
                        </span>
                      </div>
                      {/* Proficiency bar */}
                      <div style={{ height: 6, background: '#e2e8f0', borderRadius: 9999, overflow: 'hidden' }}>
                        <div
                          style={{
                            height: '100%',
                            width: `${(s.level / 5) * 100}%`,
                            background: 'linear-gradient(90deg, #f26f21 0%, #ea580c 100%)',
                            borderRadius: 9999,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic' }}>
                  Chưa cập nhật kỹ năng công nghệ.
                </div>
              )}
            </div>

            {/* Interests */}
            {selectedCandidate.interests && selectedCandidate.interests.length > 0 && (
              <div style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#334155', marginBottom: '0.5rem' }}>
                  Lĩnh vực quan tâm
                </h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {selectedCandidate.interests.map((it, idx) => (
                    <span
                      key={idx}
                      style={{
                        padding: '0.3rem 0.75rem',
                        borderRadius: 9999,
                        background: '#eff6ff',
                        color: '#1d4ed8',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                      }}
                    >
                      #{it}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Privacy Shield Notice */}
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.6rem',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                padding: '0.75rem 1rem',
                borderRadius: 10,
                fontSize: '0.775rem',
                color: '#64748b',
                lineHeight: 1.5,
                marginBottom: '1.5rem',
              }}
            >
              <ShieldCheck size={18} color="#059669" style={{ flexShrink: 0, marginTop: 1 }} />
              <span>
                Hồ sơ ứng viên công khai tuân thủ chính sách bảo mật sinh viên môn EXE: Địa chỉ Email và Mã số sinh viên
                (MSSV) được ẩn hoàn toàn để bảo vệ quyền riêng tư.
              </span>
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setSelectedCandidate(null)}
                style={{ borderRadius: 10, padding: '0.65rem 1.25rem', fontWeight: 600 }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
