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
            whiteSpace: 'nowrap',
            flexShrink: 0,
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
            whiteSpace: 'nowrap',
            flexShrink: 0,
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
          whiteSpace: 'nowrap',
          flexShrink: 0,
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
    <div style={{ padding: '0 0 3rem' }}>
      {/* ── Page Header (Flat directly on background) ── */}
      <div style={{ marginBottom: '1.75rem' }}>
        <h1
          style={{
            fontSize: '24px',
            fontWeight: 700,
            color: 'var(--text-main)',
            letterSpacing: '-0.02em',
            margin: 0,
          }}
        >
          Danh bạ Ứng viên & Thành viên EXE
        </h1>

        <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '4px', maxWidth: 740, lineHeight: 1.5, margin: '4px 0 0 0' }}>
          Tìm kiếm đồng đội phù hợp với dự án khởi nghiệp của bạn. Kết nối sinh viên đa ngành (Kỹ thuật phần mềm, Trí tuệ nhân tạo, An toàn thông tin, Thiết kế đồ họa, Digital Marketing, Kinh doanh quốc tế) và chiêu mộ thành viên.
        </p>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          FILTER CONTROLS BAR
         ══════════════════════════════════════════════════════════════ */}
      <div
        style={{
          background: 'var(--bg-card)',
          borderRadius: 16,
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
            <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600 }}>Lọc nhanh chuyên ngành:</span>
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
                padding: '6px 14px',
                fontSize: '13px',
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
                    padding: '6px 14px',
                    fontSize: '13px',
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
          Tìm thấy <span style={{ color: '#0F172A', fontWeight: 700 }}>{totalCount}</span> ứng viên
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
                background: 'var(--bg-card)',
                borderRadius: 16,
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
              <div style={{ height: 40, background: 'var(--bg-subtle)', borderRadius: 8 }} />
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
            borderRadius: 16,
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
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
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
          {candidates.map((c, idx) => {
            const majorMeta = getMajorMeta(c.major);

            return (
              <div
                key={c.userId}
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
                  cursor: 'pointer',
                }}
                onClick={() => setSelectedCandidate(c)}
              >
                <div>
                  {/* Top Header: Avatar & Status */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px', gap: '10px' }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', minWidth: 0, flex: 1 }}>
                      <div
                        className={`avatar-pastel-${idx % 5}`}
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: '9999px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '15px',
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
                            fontSize: '12px',
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
                          fontSize: '12px',
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
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          background: '#fff7ed',
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
                          fontSize: '12px',
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
                        fontSize: '13px',
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
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic', margin: '0 0 14px 0' }}>
                      Chưa cập nhật phần giới thiệu bản thân.
                    </p>
                  )}

                  {/* Skills Chips */}
                  {c.skills && c.skills.length > 0 && (
                    <div style={{ marginBottom: '14px' }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Kỹ năng chính:
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {c.skills.slice(0, 4).map((s) => (
                          <span
                            key={s.skillId}
                            style={{
                              padding: '2px 8px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              backgroundColor: 'var(--bg-subtle)',
                              border: '1px solid var(--border-light)',
                              color: 'var(--text-secondary)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <span>{s.skillName}</span>
                            <span style={{ fontSize: '11px', color: '#F27024', fontWeight: 700 }}>
                              ★{s.level}
                            </span>
                          </span>
                        ))}
                        {c.skills.length > 4 && (
                          <span
                            style={{
                              padding: '2px 7px',
                              borderRadius: '6px',
                              fontSize: '11px',
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
                        <span key={idx} style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500 }}>
                          #{item}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Bottom Card Action */}
                <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '12px', marginTop: '4px', display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className="btn-card-secondary"
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      fontSize: '12px',
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
                      fontSize: '12px',
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
                    border: p === page ? 'none' : '1px solid var(--border-medium)',
                    background: p === page ? 'var(--primary)' : 'var(--bg-card)',
                    color: p === page ? '#ffffff' : 'var(--text-main)',
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
              background: 'var(--bg-card)',
              borderRadius: 20,
              maxWidth: 600,
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '2rem',
              position: 'relative',
              boxShadow: '0 20px 30px rgba(0, 0, 0, 0.3)',
              border: '1px solid var(--border-light)',
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
            <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div
                className="avatar-pastel-0"
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: '9999px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.4rem',
                  fontWeight: 800,
                  flexShrink: 0,
                }}
              >
                {getInitials(selectedCandidate.fullName)}
              </div>
              <div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 0.25rem 0' }}>
                  {selectedCandidate.fullName}
                </h2>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  {renderAvailabilityBadge(selectedCandidate.availability)}
                  {selectedCandidate.campus && (
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
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
                fontSize: '0.85rem',
              }}
            >
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
                  <span style={{ color: '#15803d', fontWeight: 700 }}>Đã hoàn tất (BR-07)</span>
                ) : (
                  <span style={{ color: '#b91c1c', fontWeight: 700 }}>Chưa hoàn tất (BR-07)</span>
                )}
              </div>
            </div>

            {/* 5 Core Skills Bars (BR-05) */}
            <div style={{ marginBottom: '1.5rem', background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 12, padding: '1.15rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                  Điểm 5 Kỹ năng Cốt lõi (BR-05)
                </h4>
                {selectedCandidate.isProfileCompleted && (
                  <span style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                    <ShieldCheck size={14} /> Đã cam kết trung thực (BR-06)
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
                  <div key={idx} style={{ background: 'var(--bg-subtle)', padding: '0.65rem 0.85rem', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: 4 }}>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{s.name}</span>
                      <span style={{ fontWeight: 800, color: 'var(--primary)', fontFamily: 'var(--font-mono, monospace)', fontVariantNumeric: 'tabular-nums' }}>
                        {s.score}%
                      </span>
                    </div>
                    <div style={{ width: '100%', height: 6, background: 'var(--border-light)', borderRadius: 999, overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${Math.min(100, Math.max(0, s.score))}%`,
                          height: '100%',
                          background: 'linear-gradient(90deg, #f26f21 0%, #ea580c 100%)',
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
                  fontSize: '0.9rem',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.6,
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-light)',
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
                        borderRadius: 10,
                        padding: '0.75rem 1rem',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-main)' }}>{s.skillName}</span>
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
                        fontSize: '0.8rem',
                        fontWeight: 500,
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
                background: 'var(--bg-subtle)',
                border: '1px solid var(--border-subtle)',
                padding: '0.75rem 1rem',
                borderRadius: 10,
                fontSize: '0.775rem',
                color: 'var(--text-muted)',
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

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => {
                  setSelectedCandidate(null);
                }}
                style={{ borderRadius: 10, padding: '0.65rem 1.25rem', fontWeight: 600, border: '1px solid var(--border-light)', color: 'var(--text-secondary)' }}
              >
                Đóng
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  alert(`Đã gửi lời mời tham gia nhóm tới ứng viên ${selectedCandidate.fullName}!`);
                  setSelectedCandidate(null);
                }}
                style={{
                  borderRadius: 10,
                  padding: '0.65rem 1.45rem',
                  fontWeight: 600,
                  boxShadow: '0 4px 14px rgba(242, 111, 33, 0.35)',
                }}
              >
                Mời vào nhóm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
