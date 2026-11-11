import React, { useState, useEffect, useCallback, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
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
  MapPin,
  Briefcase,
  X,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Tag,
  RotateCcw,
  UserCheck,
  Eye,
  AlertCircle,
  Sparkles,
} from '../utils/icons';
import { useAuth } from '../contexts/AuthContext';
import gsap from 'gsap';

const MAJOR_OPTIONS: { value: Major; label: string }[] = [
  { value: 'SE', label: 'SE - Kỹ thuật phần mềm' },
  { value: 'AI', label: 'AI - Trí tuệ nhân tạo' },
  { value: 'IA', label: 'IA - An toàn thông tin' },
  { value: 'GD', label: 'GD - Thiết kế đồ họa' },
  { value: 'MKT', label: 'MKT - Digital Marketing' },
  { value: 'IB', label: 'IB - Kinh doanh quốc tế' },
  { value: 'Other', label: 'Khác' },
];

export const CandidateDiscoveryPage: React.FC = () => {
  const { user } = useAuth();
  const isModerator = user?.role === 'Moderator';
  const isLecturer = user?.role === 'Lecturer';
  const isStaff = isModerator || isLecturer;

  const searchInputId = useId();
  const majorSelectId = useId();
  const skillSelectId = useId();
  const availabilitySelectId = useId();

  const gridRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Danh sách ứng viên & phân trang
  const [candidates, setCandidates] = useState<CandidateProfileResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

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

  // Auto dismiss feedback toast
  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  // GSAP animation for grid cards
  useEffect(() => {
    if (!gridRef.current || candidates.length === 0) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        gridRef.current!.children,
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.25, stagger: 0.03, ease: 'power2.out', clearProps: 'transform,opacity' }
      );
    }, gridRef);
    return () => ctx.revert();
  }, [candidates]);

  // GSAP animation + Escape key + body scroll lock for modal popup
  useEffect(() => {
    if (!selectedCandidate) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedCandidate(null);
    };
    window.addEventListener('keydown', handleKeyDown);

    let ctx: gsap.Context | null = null;
    if (modalRef.current && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      ctx = gsap.context(() => {
        gsap.fromTo(
          modalRef.current,
          { opacity: 0, scale: 0.96, y: 10 },
          { opacity: 1, scale: 1, y: 0, duration: 0.22, ease: 'power3.out', clearProps: 'transform,opacity' }
        );
      });
    }

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      if (ctx) ctx.revert();
    };
  }, [selectedCandidate]);
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

  const getMajorMeta = (major?: Major | null) => {
    if (!major) return null;
    return MAJOR_OPTIONS.find((m) => m.value === major) || {
      value: major,
      label: major,
      color: 'var(--text-secondary, #334155)',
      bg: '#f1f5f9',
    };
  };

  const renderAvailabilityBadge = (availability: UserAvailability) => {
    const dotColor =
      availability === 'LookingForTeam'
        ? '#10B981'
        : availability === 'InTeam'
        ? 'var(--accent-color, #F26F21)'
        : '#94A3B8';
    const label =
      availability === 'LookingForTeam'
        ? 'Đang tìm nhóm'
        : availability === 'InTeam'
        ? 'Đã có nhóm'
        : 'Tạm dừng';

    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.4rem',
          padding: '0.24rem 0.65rem',
          borderRadius: 9999,
          fontSize: '0.78rem',
          fontWeight: 600,
          background: 'var(--bg-subtle, #F8FAFC)',
          color: 'var(--text-secondary, #334155)',
          border: '1px solid var(--border-light, #E2E8F0)',
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: dotColor,
            flexShrink: 0,
          }}
        />
        {label}
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

  const lookingCount = candidates.filter((c) => c.availability === 'LookingForTeam').length;
  const inTeamCount = candidates.filter((c) => c.availability === 'InTeam').length;
  const completedSkillsCount = candidates.filter((c) => c.isProfileCompleted).length;
  const completedRate = candidates.length > 0 ? Math.round((completedSkillsCount / candidates.length) * 100) : 0;

  return (
    <div style={{ padding: '0 0 3rem' }}>
      {/* ── Page Header (Flat directly on background) ── */}
      <div style={{ marginBottom: '1.75rem' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12.5px',
            fontWeight: 500,
            color: 'var(--text-muted, #64748B)',
            marginBottom: '0.45rem',
          }}
        >
          <span>{isStaff ? 'Giám sát học vụ' : 'Không gian học phần'}</span>
          <span style={{ color: 'var(--border-medium, #CBD5E1)' }}>/</span>
          <span style={{ color: 'var(--text-secondary, #334155)', fontWeight: 600 }}>
            {isStaff ? 'Danh bạ sinh viên' : 'Tìm bạn ghép đội'}
          </span>
        </div>

        <h1
          style={{
            fontSize: '1.75rem',
            fontWeight: 650,
            color: 'var(--text-main)',
            letterSpacing: '-0.025em',
            lineHeight: 1.25,
            margin: 0,
          }}
        >
          {isStaff ? 'Danh bạ Sinh viên Môn EXE' : 'Tìm bạn ghép đội Khởi nghiệp EXE'}
        </h1>

        <p
          style={{
            fontSize: '0.925rem',
            color: 'var(--text-muted)',
            marginTop: '6px',
            maxWidth: 820,
            lineHeight: 1.55,
            margin: '6px 0 0 0',
          }}
        >
          {isStaff
            ? 'Tra cứu và giám sát danh sách sinh viên học phần EXE101. Theo dõi thông tin chuyên ngành, điểm 5 kỹ năng cốt lõi và hiện trạng ghép nhóm (Đang tìm nhóm, Đã có nhóm) phục vụ công tác điều phối học kỳ.'
            : 'Tìm kiếm đồng đội phù hợp với dự án khởi nghiệp của bạn. Kết nối sinh viên đa ngành (Kỹ thuật phần mềm, Trí tuệ nhân tạo, An toàn thông tin, Thiết kế đồ họa, Digital Marketing, Kinh doanh quốc tế) và chiêu mộ thành viên.'}
        </p>
      </div>

      {/* ── KPI STATS OVERVIEW (Dành cho Moderator & Lecturer) ── */}
      {isStaff && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
            gap: '1rem',
            marginBottom: '1.75rem',
          }}
        >
          <div
            style={{
              background: 'var(--bg-card)',
              borderRadius: '16px',
              padding: '1.15rem 1.25rem',
              border: '1px solid var(--border-light)',
              boxShadow: 'var(--shadow-sm)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.9rem',
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: '12px',
                background: 'var(--bg-tag, #F1F5F9)',
                color: 'var(--text-secondary, #475569)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Users size={22} />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', fontWeight: 600 }}>Tổng ứng viên / SV</div>
              <div
                style={{
                  fontSize: '22px',
                  fontWeight: 700,
                  color: 'var(--text-main)',
                  fontFamily: 'var(--font-mono)',
                  fontVariantNumeric: 'tabular-nums',
                  lineHeight: 1.2,
                }}
              >
                {totalCount}
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Học phần EXE101
              </div>
            </div>
          </div>

          <div
            style={{
              background: 'var(--bg-card)',
              borderRadius: '16px',
              padding: '1.15rem 1.25rem',
              border: '1px solid var(--border-light)',
              boxShadow: 'var(--shadow-sm)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.9rem',
              cursor: 'pointer',
              borderColor: onlyLookingForTeam ? 'var(--border-medium, #CBD5E1)' : 'var(--border-light)',
            }}
            onClick={() => {
              setOnlyLookingForTeam(true);
              setPage(1);
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: '12px',
                background: 'var(--bg-tag, #F1F5F9)',
                color: 'var(--text-secondary, #475569)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Sparkles size={20} />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', fontWeight: 600 }}>Đang tìm nhóm</div>
              <div
                style={{
                  fontSize: '22px',
                  fontWeight: 700,
                  color: 'var(--text-main)',
                  fontFamily: 'var(--font-mono)',
                  fontVariantNumeric: 'tabular-nums',
                  lineHeight: 1.2,
                }}
              >
                {lookingCount}
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Cần ghép đội (LookingForTeam)
              </div>
            </div>
          </div>

          <div
            style={{
              background: 'var(--bg-card)',
              borderRadius: '16px',
              padding: '1.15rem 1.25rem',
              border: '1px solid var(--border-light)',
              boxShadow: 'var(--shadow-sm)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.9rem',
              cursor: 'pointer',
              borderColor: !onlyLookingForTeam ? 'var(--border-medium, #CBD5E1)' : 'var(--border-light)',
            }}
            onClick={() => {
              setOnlyLookingForTeam(false);
              setPage(1);
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: '12px',
                background: 'var(--bg-tag, #F1F5F9)',
                color: 'var(--text-secondary, #475569)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <UserCheck size={20} />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', fontWeight: 600 }}>Đã có nhóm</div>
              <div
                style={{
                  fontSize: '22px',
                  fontWeight: 700,
                  color: 'var(--text-main)',
                  fontFamily: 'var(--font-mono)',
                  fontVariantNumeric: 'tabular-nums',
                  lineHeight: 1.2,
                }}
              >
                {inTeamCount}
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Đã vào phòng / nhóm
              </div>
            </div>
          </div>

          <div
            style={{
              background: 'var(--bg-card)',
              borderRadius: '16px',
              padding: '1.15rem 1.25rem',
              border: '1px solid var(--border-light)',
              boxShadow: 'var(--shadow-sm)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.9rem',
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: '12px',
                background: 'var(--bg-tag, #F1F5F9)',
                color: 'var(--text-secondary, #475569)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <ShieldCheck size={20} />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', fontWeight: 600 }}>Hoàn tất 5 kỹ năng</div>
              <div
                style={{
                  fontSize: '22px',
                  fontWeight: 700,
                  color: 'var(--text-main)',
                  fontFamily: 'var(--font-mono)',
                  fontVariantNumeric: 'tabular-nums',
                  lineHeight: 1.2,
                }}
              >
                {completedRate}%
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                {completedSkillsCount}/{candidates.length} SV đã cam kết
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          FILTER CONTROLS BAR
         ══════════════════════════════════════════════════════════════ */}
      <div
        style={{
          background: 'var(--bg-card)',
          borderRadius: 20,
          padding: '1.5rem',
          border: '1px solid var(--border-light)',
          boxShadow: 'var(--shadow-sm)',
          marginBottom: '2rem',
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
          {/* Keyword Search */}
          <div>
            <label
              htmlFor={searchInputId}
              style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary, #334155)', marginBottom: '0.4rem' }}
            >
              Tìm kiếm theo tên / định hướng
            </label>
            <div className="motion-search-wrap" style={{ position: 'relative' }}>
              <Search className="motion-search-icon" size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light, #94A3B8)', pointerEvents: 'none' }} />
              <input
                id={searchInputId}
                type="text"
                className="form-control motion-search-input"
                placeholder="Nhập họ tên, vị trí (Frontend, AI...)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ paddingLeft: '2.4rem', paddingRight: searchTerm ? '2.2rem' : '0.85rem', height: 40 }}
              />
              {searchTerm && (
                <button
                  type="button"
                  className="motion-clear-btn"
                  aria-label="Xóa từ khóa tìm kiếm"
                  onClick={() => setSearchTerm('')}
                  style={{
                    position: 'absolute',
                    right: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: 24,
                    height: 24,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-muted)',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Major Filter */}
          <div>
            <label
              htmlFor={majorSelectId}
              style={{ display: 'block', fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-secondary, #334155)', marginBottom: '0.4rem' }}
            >
              Chuyên ngành
            </label>
            <div style={{ position: 'relative' }}>
              <GraduationCap size={17} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-light, #94A3B8)' }} />
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
              style={{ display: 'block', fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-secondary, #334155)', marginBottom: '0.4rem' }}
            >
              Kỹ năng công nghệ
            </label>
            <div style={{ position: 'relative' }}>
              <Tag size={17} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-light, #94A3B8)' }} />
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
              style={{ display: 'block', fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-secondary, #334155)', marginBottom: '0.4rem' }}
            >
              Trạng thái ghép nhóm
            </label>
            <div style={{ position: 'relative' }}>
              <Users size={17} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-light, #94A3B8)' }} />
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
            borderTop: '1px solid var(--border-subtle, #F1F5F9)',
          }}
        >
          {/* Quick major pill buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '15px', color: 'var(--text-muted)', fontWeight: 600 }}>Lọc nhanh chuyên ngành:</span>
            <button
              type="button"
              onClick={() => {
                setSelectedMajor('ALL');
                setPage(1);
              }}
              style={{
                backgroundColor: selectedMajor === 'ALL' ? 'var(--pill-active-bg)' : 'var(--pill-inactive-bg)',
                color: selectedMajor === 'ALL' ? 'var(--pill-active-text)' : 'var(--pill-inactive-text)',
                border: '1px solid ' + (selectedMajor === 'ALL' ? 'var(--pill-active-border)' : 'var(--pill-inactive-border)'),
                borderRadius: '8px',
                padding: '9px 18px',
                fontSize: '15px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              Tất cả
            </button>
            {MAJOR_OPTIONS.map((m) => {
              const isSelected = selectedMajor === m.value;
              return (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => {
                    setSelectedMajor(m.value);
                    setPage(1);
                  }}
                  style={{
                    backgroundColor: isSelected ? 'var(--pill-active-bg)' : 'var(--pill-inactive-bg)',
                    color: isSelected ? 'var(--pill-active-text)' : 'var(--pill-inactive-text)',
                    border: '1px solid ' + (isSelected ? 'var(--pill-active-border)' : 'var(--pill-inactive-border)'),
                    borderRadius: '8px',
                    padding: '9px 18px',
                    fontSize: '15px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {m.value}
                </button>
              );
            })}
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
                fontSize: '0.95rem',
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
        <div style={{ fontSize: '0.95rem', color: 'var(--text-secondary, #334155)', fontWeight: 600 }}>
          Tìm thấy <span style={{ color: 'var(--text-main, #0F172A)', fontWeight: 700 }}>{totalCount}</span> ứng viên
          {selectedMajor !== 'ALL' && ` ngành ${selectedMajor}`}
          {selectedSkill && ` với kỹ năng "${selectedSkill}"`}
          {onlyLookingForTeam && ' đang tìm nhóm'}
        </div>
        <div style={{ fontSize: '0.95rem', color: 'var(--text-muted, #64748B)' }}>
          Trang {page} / {totalPages}
        </div>
      </div>

      {/* Feedback / Error Notice */}
      {feedback && (
        <div
          style={{
            background: 'rgba(16, 185, 129, 0.10)',
            border: '1px solid #86efac',
            color: '#065f46',
            padding: '1rem 1.25rem',
            borderRadius: 12,
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.6rem',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
            <UserCheck size={18} style={{ color: '#059669' }} />
            {feedback}
          </span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#065f46' }}
          >
            <X size={18} />
          </button>
        </div>
      )}
      {error && (
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.10)',
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
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(390px, 100%), 1fr))',
            gap: '1.5rem',
            minHeight: 300,
          }}
        >
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              style={{
                background: 'var(--bg-card)',
                borderRadius: 20,
                padding: '1.5rem',
                border: '1px solid var(--border-light)',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                animation: 'pulse 1.5s infinite ease-in-out',
              }}
            >
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div style={{ width: 54, height: 54, borderRadius: '50%', background: 'var(--border-light)' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ width: '60%', height: 16, background: 'var(--border-light)', borderRadius: 4, marginBottom: 8 }} />
                  <div style={{ width: '40%', height: 12, background: 'var(--bg-tag)', borderRadius: 4 }} />
                </div>
              </div>
              <div style={{ height: 40, background: 'var(--bg-subtle)', borderRadius: 10 }} />
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <div style={{ width: 60, height: 22, background: 'var(--border-light)', borderRadius: 9999 }} />
                <div style={{ width: 70, height: 22, background: 'var(--border-light)', borderRadius: 9999 }} />
              </div>
            </div>
          ))}
        </div>
      ) : candidates.length === 0 ? (
        <div
          style={{
            background: 'var(--bg-card)',
            borderRadius: 20,
            padding: '4rem 2rem',
            textAlign: 'center',
            border: '1px solid var(--border-light)',
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: 'var(--bg-tag)',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem',
            }}
          >
            <Users size={32} />
          </div>
          <h3 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
            Không tìm thấy ứng viên phù hợp
          </h3>
          <p style={{ color: 'var(--text-muted, #64748B)', fontSize: '1.025rem', maxWidth: 420, margin: '0 auto 1.5rem' }}>
            Thử mở rộng tiêu chí tìm kiếm, chọn &quot;Tất cả chuyên ngành&quot; hoặc tắt điều kiện &quot;Chỉ hiện người đang tìm nhóm&quot;.
          </p>
          <button
            type="button"
            className="btn btn-outline"
            onClick={handleResetFilters}
            style={{ borderRadius: 12, padding: '0.6rem 1.25rem', fontWeight: 600 }}
          >
            Xóa bộ lọc tìm kiếm
          </button>
        </div>
      ) : (
        <div
          ref={gridRef}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(390px, 100%), 1fr))',
            gap: '1.5rem',
          }}
        >
          {candidates.map((c) => {
            const majorMeta = getMajorMeta(c.major);

            return (
              <div
                key={c.userId}
                className="motion-card-interactive"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  borderRadius: '20px',
                  border: '1px solid var(--border-light)',
                  padding: '22px',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: 'var(--shadow-sm)',
                  cursor: 'pointer',
                }}
                onClick={() => setSelectedCandidate(c)}
              >
                <div>
                  {/* Top Header: Avatar & Status */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px', gap: '10px' }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: '9999px',
                          backgroundColor: 'var(--bg-tag)',
                          color: 'var(--text-secondary)',
                          border: '1px solid var(--border-light)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '16px',
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        {getInitials(c.fullName)}
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <h3
                          style={{
                            fontSize: '16px',
                            fontWeight: 700,
                            color: 'var(--text-main)',
                            margin: 0,
                            lineHeight: 1.3,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {c.fullName}
                        </h3>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '14px',
                            color: 'var(--text-muted)',
                            marginTop: '2px',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {c.studentCode && <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{c.studentCode}</span>}
                          {c.studentCode && c.campus && <span>•</span>}
                          {c.campus && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                              <MapPin size={11} /> {c.campus}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div style={{ flexShrink: 0 }}>{renderAvailabilityBadge(c.availability)}</div>
                  </div>

                  {/* Major Badge, Cohort & Desired Role */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                    {majorMeta && (
                      <span
                        style={{
                          padding: '3px 9px',
                          borderRadius: '6px',
                          fontSize: '14px',
                          fontWeight: 600,
                          backgroundColor: 'var(--bg-tag)',
                          color: 'var(--text-secondary)',
                          border: '1px solid var(--border-light)',
                        }}
                      >
                        {majorMeta.label}
                      </span>
                    )}
                    {c.cohort && (
                      <span
                        style={{
                          padding: '0.2rem 0.6rem',
                          borderRadius: 6,
                          fontSize: '0.875rem',
                          fontWeight: 700,
                          background: 'rgba(242, 111, 33, 0.10)',
                          color: '#c2410c',
                          border: '1px solid #fed7aa',
                          fontFamily: 'var(--font-mono, monospace)',
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        Khóa {c.cohort}
                      </span>
                    )}
                    {c.desiredRole && (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '3px 9px',
                          borderRadius: '6px',
                          fontSize: '14px',
                          fontWeight: 500,
                          backgroundColor: 'var(--bg-subtle)',
                          color: 'var(--text-secondary)',
                          border: '1px solid var(--border-light)',
                        }}
                      >
                        <Briefcase size={12} color="var(--text-muted)" />
                        {c.desiredRole}
                      </span>
                    )}
                  </div>

                  {/* Bio */}
                  {c.bio ? (
                    <p
                      style={{
                        fontSize: '15px',
                        color: 'var(--text-secondary)',
                        lineHeight: 1.55,
                        margin: '0 0 14px 0',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {c.bio}
                    </p>
                  ) : (
                    <p style={{ fontSize: '15px', color: 'var(--text-muted)', fontStyle: 'italic', margin: '0 0 14px 0' }}>
                      Chưa cập nhật phần giới thiệu bản thân.
                    </p>
                  )}

                  {/* Skills Chips */}
                  {c.skills && c.skills.length > 0 && (
                    <div style={{ marginBottom: '14px' }}>
                      <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Kỹ năng chính:
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {c.skills.slice(0, 4).map((s) => (
                          <span
                            key={s.skillId}
                            style={{
                              padding: '2px 8px',
                              borderRadius: '6px',
                              fontSize: '14px',
                              backgroundColor: 'var(--bg-subtle)',
                              border: '1px solid var(--border-light)',
                              color: 'var(--text-secondary)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <span>{s.skillName}</span>
                            <span style={{ fontSize: '12px', color: 'var(--accent-color, #F26F21)', fontWeight: 700, fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}>
                              Lv.{s.level}
                            </span>
                          </span>
                        ))}
                        {c.skills.length > 4 && (
                          <span
                            style={{
                              padding: '2px 7px',
                              borderRadius: '6px',
                              fontSize: '13px',
                              backgroundColor: 'var(--bg-tag)',
                              color: 'var(--text-muted)',
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
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
                      {c.interests.slice(0, 3).map((item, idx) => (
                        <span key={idx} style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500 }}>
                          #{item}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* 5-Core Skills Mini Strip on Card */}
                  {c.isProfileCompleted ? (
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(5, 1fr)',
                        gap: '4px',
                        background: 'var(--bg-subtle)',
                        borderRadius: '8px',
                        padding: '7px 8px',
                        marginBottom: '12px',
                        border: '1px solid var(--border-subtle)',
                        textAlign: 'center',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Tech</div>
                        <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--accent-color, #f26f21)', fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}>
                          {c.techScore ?? 0}%
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Mgmt</div>
                        <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-main)', fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}>
                          {c.managementScore ?? 0}%
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Design</div>
                        <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-main)', fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}>
                          {c.graphicDesignScore ?? 0}%
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Mkt</div>
                        <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-main)', fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}>
                          {c.marketingScore ?? 0}%
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Sale</div>
                        <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-main)', fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}>
                          {c.saleScore ?? 0}%
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div
                      style={{
                        background: 'var(--bg-subtle)',
                        borderRadius: '8px',
                        padding: '6px 10px',
                        marginBottom: '12px',
                        border: '1px dashed var(--border-medium)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '5px',
                        fontSize: '12px',
                        color: 'var(--text-muted)',
                      }}
                    >
                      <AlertCircle size={13} color="#f59e0b" />
                      <span>Chưa hoàn tất khảo sát 5 kỹ năng</span>
                    </div>
                  )}
                </div>

                {/* Bottom Card Action */}
                <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '12px', marginTop: 'auto' }}>
                  {isStaff ? (
                    <button
                      type="button"
                      style={{
                        width: '100%',
                        padding: '9px 14px',
                        fontSize: '14px',
                        fontWeight: 600,
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        background: 'var(--bg-subtle)',
                        border: '1px solid var(--border-medium)',
                        color: 'var(--text-main)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCandidate(c);
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'var(--accent-color, #f26f21)';
                        e.currentTarget.style.color = 'var(--accent-color, #f26f21)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'var(--border-medium)';
                        e.currentTarget.style.color = 'var(--text-main)';
                      }}
                    >
                      <Eye size={16} />
                      <span>Xem chi tiết hồ sơ</span>
                    </button>
                  ) : (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        className="btn-card-secondary"
                        style={{
                          flex: 1,
                          padding: '8px 12px',
                          fontSize: '14px',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px',
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCandidate(c);
                        }}
                      >
                        <span>Xem chi tiết</span>
                      </button>
                      <button
                        type="button"
                        className="btn-card-action"
                        style={{
                          flex: 1,
                          padding: '8px 12px',
                          fontSize: '14px',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px',
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCandidate(c);
                        }}
                      >
                        <span>Mời vào nhóm</span>
                      </button>
                    </div>
                  )}
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
            style={{ padding: '0.5rem 0.8rem', borderRadius: 10, fontSize: '0.95rem' }}
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
                    borderRadius: 10,
                    fontSize: '0.925rem',
                    fontWeight: 700,
                    fontVariantNumeric: 'tabular-nums',
                    border: p === page ? 'none' : '1px solid var(--border-medium)',
                    background: p === page ? 'var(--accent-color, var(--primary))' : 'var(--bg-card)',
                    color: p === page ? '#FFFFFF' : 'var(--text-main)',
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
                <span key={p} style={{ padding: '0 0.25rem', color: 'var(--text-light, #94A3B8)' }}>
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
            style={{ padding: '0.5rem 0.8rem', borderRadius: 10, fontSize: '0.95rem' }}
          >
            Sau <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          CANDIDATE DETAIL MODAL
         ══════════════════════════════════════════════════════════════ */}
      {selectedCandidate && createPortal(
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
          onClick={() => setSelectedCandidate(null)}
        >
          <div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-label={`Chi tiết ứng viên ${selectedCandidate.fullName}`}
            style={{
              background: 'var(--bg-card)',
              borderRadius: 20,
              maxWidth: 600,
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '2rem',
              position: 'relative',
              boxShadow: '0 24px 48px rgba(0, 0, 0, 0.32)',
              border: '1px solid var(--border-light)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              type="button"
              aria-label="Đóng cửa sổ"
              onClick={() => setSelectedCandidate(null)}
              style={{
                position: 'absolute',
                right: 20,
                top: 20,
                background: 'var(--bg-tag)',
                border: 'none',
                borderRadius: '50%',
                width: 36,
                height: 36,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-muted)',
                cursor: 'pointer',
              }}
            >
              <X size={18} />
            </button>

            {/* Header with Avatar & Meta */}
            <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', marginBottom: '1.5rem', paddingRight: '2.5rem' }}>
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: '9999px',
                  backgroundColor: 'var(--bg-tag)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-light)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.35rem',
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {getInitials(selectedCandidate.fullName)}
              </div>
              <div style={{ minWidth: 0 }}>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 0.25rem 0' }}>
                  {selectedCandidate.fullName}
                </h2>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  {renderAvailabilityBadge(selectedCandidate.availability)}
                  {selectedCandidate.campus && (
                    <span style={{ fontSize: '0.925rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
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
                background: 'var(--bg-subtle)',
                borderRadius: 12,
                padding: '1rem',
                border: '1px solid var(--border-subtle)',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '0.75rem',
                marginBottom: '1.25rem',
                fontSize: '0.95rem',
              }}
            >
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>Mã số sinh viên (MSSV):</span>
                <strong style={{ color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
                  {selectedCandidate.studentCode || 'Chưa cập nhật'}
                </strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>Chuyên ngành:</span>
                <strong style={{ color: 'var(--text-main)' }}>
                  {getMajorMeta(selectedCandidate.major)?.label || 'Chưa cập nhật'}
                </strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>Khóa học:</span>
                <strong style={{ color: 'var(--text-main)', fontFamily: 'var(--font-mono, monospace)', fontVariantNumeric: 'tabular-nums' }}>
                  {selectedCandidate.cohort ? `Khóa ${selectedCandidate.cohort}` : 'Chưa cập nhật'}
                </strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>Vị trí mong muốn:</span>
                <strong style={{ color: 'var(--text-main)' }}>{selectedCandidate.desiredRole || 'Linh hoạt'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>Hồ sơ 5 kỹ năng:</span>
                {selectedCandidate.isProfileCompleted ? (
                  <span style={{ color: '#15803d', fontWeight: 700 }}>Đã hoàn tất</span>
                ) : (
                  <span style={{ color: '#b91c1c', fontWeight: 700 }}>Chưa hoàn tất</span>
                )}
              </div>
            </div>

            {/* 5 Core Skills Bars */}
            <div style={{ marginBottom: '1.5rem', background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 12, padding: '1.15rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                  {isStaff ? 'Kết quả Đánh giá 5 Kỹ năng Cốt lõi của Sinh viên' : 'Điểm 5 Kỹ năng Cốt lõi'}
                </h4>
                {selectedCandidate.isProfileCompleted ? (
                  <span style={{ fontSize: '0.875rem', color: '#16a34a', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                    <ShieldCheck size={14} /> Đã cam kết trung thực về năng lực (BR-07)
                  </span>
                ) : (
                  <span style={{ fontSize: '0.85rem', color: '#f59e0b', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                    <AlertCircle size={14} /> Chưa hoàn tất tự đánh giá
                  </span>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                {[
                  { name: 'Kỹ thuật (Tech)', score: selectedCandidate.techScore },
                  { name: 'Quản trị (Management)', score: selectedCandidate.managementScore },
                  { name: 'Thiết kế (Graphic Design)', score: selectedCandidate.graphicDesignScore },
                  { name: 'Tiếp thị (Marketing)', score: selectedCandidate.marketingScore },
                  { name: 'Bán hàng (Sale)', score: selectedCandidate.saleScore },
                ].map((s, idx) => (
                  <div key={idx} style={{ background: 'var(--bg-subtle)', padding: '0.65rem 0.85rem', borderRadius: 10, border: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.925rem', marginBottom: 4 }}>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{s.name}</span>
                      <span style={{ fontWeight: 700, color: 'var(--accent-color, var(--primary))', fontFamily: 'var(--font-mono, monospace)', fontVariantNumeric: 'tabular-nums' }}>
                        {s.score}%
                      </span>
                    </div>
                    <div style={{ width: '100%', height: 6, background: 'var(--border-light)', borderRadius: 999, overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${Math.min(100, Math.max(0, s.score))}%`,
                          height: '100%',
                          background: 'var(--accent-gradient, var(--accent-color, #F26F21))',
                          borderRadius: 999,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bio Section */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                Giới thiệu bản thân
              </h4>
              <p
                style={{
                  fontSize: '1.025rem',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.6,
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-light)',
                  borderRadius: 12,
                  padding: '1rem',
                  margin: 0,
                }}
              >
                {selectedCandidate.bio || 'Ứng viên chưa cung cấp thông tin giới thiệu chi tiết.'}
              </p>
            </div>

            {/* Skills with Proficiency Levels */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.75rem' }}>
                Kỹ năng & Mức độ thành thạo
              </h4>
              {selectedCandidate.skills && selectedCandidate.skills.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {selectedCandidate.skills.map((s) => (
                    <div
                      key={s.skillId}
                      style={{
                        background: 'var(--bg-subtle)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 12,
                        padding: '0.75rem 1rem',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <span style={{ fontWeight: 600, fontSize: '0.975rem', color: 'var(--text-main)' }}>{s.skillName}</span>
                        <span style={{ fontSize: '0.775rem', fontWeight: 700, color: 'var(--primary)' }}>
                          Level {s.level}/5 • {getSkillLevelText(s.level)}
                        </span>
                      </div>
                      {/* Proficiency bar */}
                      <div style={{ height: 6, background: 'var(--border-light)', borderRadius: 9999, overflow: 'hidden' }}>
                        <div
                          style={{
                            height: '100%',
                            width: `${(s.level / 5) * 100}%`,
                            background: 'var(--accent-gradient, var(--accent-color, #F26F21))',
                            borderRadius: 9999,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: '0.95rem', color: 'var(--text-light, #94A3B8)', fontStyle: 'italic' }}>
                  Chưa cập nhật kỹ năng công nghệ.
                </div>
              )}
            </div>

            {/* Interests */}
            {selectedCandidate.interests && selectedCandidate.interests.length > 0 && (
              <div style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                  Lĩnh vực quan tâm
                </h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {selectedCandidate.interests.map((it, idx) => (
                    <span
                      key={idx}
                      style={{
                        padding: '0.25rem 0.65rem',
                        borderRadius: 6,
                        backgroundColor: 'var(--bg-tag)',
                        border: '1px solid var(--border-light)',
                        color: 'var(--text-secondary)',
                        fontSize: '0.925rem',
                        fontWeight: 500,
                      }}
                    >
                      #{it}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Privacy Shield / Staff Notice */}
            {isStaff ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.6rem',
                  background: 'var(--bg-subtle)',
                  border: '1px solid var(--border-light)',
                  padding: '0.8rem 1rem',
                  borderRadius: 12,
                  fontSize: '0.825rem',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.5,
                  marginBottom: '1.5rem',
                }}
              >
                <ShieldCheck size={18} color="var(--accent-color, #F26F21)" style={{ flexShrink: 0, marginTop: 1 }} />
                <span>
                  <strong>Hồ sơ Quản trị & Điều phối Học kỳ:</strong> Dữ liệu sinh viên được đồng bộ từ FAP và hệ thống khảo sát 5 kỹ năng cốt lõi môn EXE101, phục vụ công tác điều phối học kỳ và kiểm tra cân bằng đội hình.
                </span>
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.6rem',
                  background: 'var(--bg-subtle)',
                  border: '1px solid var(--border-subtle)',
                  padding: '0.75rem 1rem',
                  borderRadius: 12,
                  fontSize: '0.825rem',
                  color: 'var(--text-muted)',
                  lineHeight: 1.5,
                  marginBottom: '1.5rem',
                }}
              >
                <ShieldCheck size={18} color="#059669" style={{ flexShrink: 0, marginTop: 1 }} />
                <span>
                  Hồ sơ ứng viên công khai tuân thủ chính sách bảo mật sinh viên môn EXE: Thông tin liên lạc cá nhân được bảo vệ quyền riêng tư.
                </span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => {
                  setSelectedCandidate(null);
                }}
                style={{
                  borderRadius: 12,
                  padding: isStaff ? '0.65rem 1.75rem' : '0.65rem 1.25rem',
                  fontWeight: 600,
                  border: '1px solid var(--border-medium)',
                  color: 'var(--text-main)',
                  background: 'var(--bg-card)',
                  cursor: 'pointer',
                }}
              >
                Đóng
              </button>
              {!isStaff && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    setFeedback(`Đã gửi lời mời tham gia nhóm tới ứng viên ${selectedCandidate.fullName}!`);
                    setSelectedCandidate(null);
                  }}
                  style={{
                    borderRadius: 12,
                    padding: '0.65rem 1.45rem',
                    fontWeight: 600,
                    boxShadow: '0 4px 14px var(--accent-shadow, rgba(242, 111, 33, 0.3))',
                  }}
                >
                  Mời vào nhóm
                </button>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
