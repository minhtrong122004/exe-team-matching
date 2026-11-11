import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import { errorMessage } from '../api/workspace';
import { useAuth } from '../contexts/AuthContext';
import type { ProjectItem, ProjectDomain, ProjectStatus, PagedResult } from '../types';
import {
  Plus,
  Search,
  Lightbulb,
  Calendar,
  Trash2,
  X,
  Edit3,
  Sparkles,
  ArrowRight,
  GraduationCap,
  Coins,
  ShoppingBag,
  Coffee,
  HeartPulse,
  Compass,
  Layers,
  LayoutGrid,
  List,
  CheckCircle2,
  AlertTriangle,
  Users2,
  RefreshCw,
} from '../utils/icons';

// ── Domain Metadata (Visual Identity & Icons) ──
interface DomainMeta {
  domain: ProjectDomain;
  label: string;
  className: string;
  icon: React.ReactNode;
  description: string;
}

const DOMAIN_METAS: DomainMeta[] = [
  {
    domain: 'EdTech',
    label: 'EdTech',
    className: 'domain-edtech',
    icon: <GraduationCap size={14} />,
    description: 'Công nghệ giáo dục, đào tạo và học tập',
  },
  {
    domain: 'FinTech',
    label: 'FinTech',
    className: 'domain-fintech',
    icon: <Coins size={14} />,
    description: 'Tài chính công nghệ, thanh toán & ngân sách',
  },
  {
    domain: 'ECommerce',
    label: 'E-Commerce',
    className: 'domain-ecommerce',
    icon: <ShoppingBag size={14} />,
    description: 'Thương mại điện tử & bán lẻ trực tuyến',
  },
  {
    domain: 'FnB',
    label: 'F&B',
    className: 'domain-fnb',
    icon: <Coffee size={14} />,
    description: 'Ẩm thực, nhà hàng & đồ uống',
  },
  {
    domain: 'Health',
    label: 'Healthcare',
    className: 'domain-health',
    icon: <HeartPulse size={14} />,
    description: 'Y tế, chăm sóc sức khỏe & thể thao',
  },
  {
    domain: 'Tourism',
    label: 'Du lịch',
    className: 'domain-tourism',
    icon: <Compass size={14} />,
    description: 'Du lịch trải nghiệm, khách sạn & lữ hành',
  },
  {
    domain: 'Other',
    label: 'Lĩnh vực khác',
    className: 'domain-other',
    icon: <Layers size={14} />,
    description: 'GreenTech, IoT, AI & các mô hình sáng tạo',
  },
];

const STATUS_OPTIONS: { status: ProjectStatus; label: string; badgeClass: string; dotClass?: string }[] = [
  { status: 'Draft', label: 'Bản nháp', badgeClass: 'badge-draft' },
  { status: 'Recruiting', label: 'Đang tuyển người', badgeClass: 'badge-recruiting', dotClass: 'pulsing-dot-cyan' },
  { status: 'Active', label: 'Đang triển khai', badgeClass: 'badge-active', dotClass: 'pulsing-dot-green' },
  { status: 'Completed', label: 'Hoàn thành', badgeClass: 'badge-completed' },
  { status: 'Cancelled', label: 'Đã hủy', badgeClass: 'badge-cancelled' },
];

const POPULAR_TAGS = ['AI', 'React', '.NET', 'Mobile', 'IoT', 'FinTech', 'Marketing', 'UI/UX', 'Cloud'];

// ── In-App Toast Notification Interface ──
interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

export const ProjectsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Data & State
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);

  // Filters
  const [search, setSearch] = useState('');
  const [domain, setDomain] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [filterMyProjects, setFilterMyProjects] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortDir, setSortDir] = useState<string>('desc');
  const [page, setPage] = useState<number>(1);

  // View switch: Grid vs List
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectItem | null>(null);
  const [selectedProject, setSelectedProject] = useState<ProjectItem | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState<boolean>(false);

  // Form Fields
  const [title, setTitle] = useState('');
  const [problem, setProblem] = useState('');
  const [solution, setSolution] = useState('');
  const [selectedDomain, setSelectedDomain] = useState<ProjectDomain>('EdTech');
  const [selectedStatus, setSelectedStatus] = useState<ProjectStatus>('Draft');
  const [tags, setTags] = useState<string[]>([]);
  const [currentTagInput, setCurrentTagInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Group linking dialog modal
  const [groupLinkModal, setGroupLinkModal] = useState<ProjectItem | null>(null);

  // Toast notifications
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Confirm delete dialog
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; title: string } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  }, []);

  // Fetch Projects from API (không còn dữ liệu mẫu: lỗi thì báo lỗi, rỗng thì hiện trạng thái rỗng)
  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());
      if (domain) params.append('domain', domain);
      if (status) params.append('status', status);
      if (filterMyProjects && user?.id) params.append('ownerId', user.id);
      params.append('sortBy', sortBy);
      params.append('sortDir', sortDir);
      params.append('page', page.toString());
      params.append('pageSize', viewMode === 'grid' ? '6' : '10');

      const res = await apiClient.get<PagedResult<ProjectItem>>(`/projects?${params.toString()}`);
      const items = res.data?.items ?? [];
      setProjects(items);
      setTotalCount(res.data?.totalCount ?? items.length);
      setTotalPages(Math.max(1, res.data?.totalPages || 1));
    } catch (err) {
      setProjects([]);
      setTotalCount(0);
      setTotalPages(1);
      showToast(errorMessage(err, 'Không tải được danh sách dự án.'), 'error');
    } finally {
      setLoading(false);
    }
  }, [search, domain, status, filterMyProjects, sortBy, sortDir, page, viewMode, user, showToast]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProjects();
    }, 200);
    return () => clearTimeout(timer);
  }, [fetchProjects]);

  // Handle open full detail
  const handleOpenDetail = async (proj: ProjectItem) => {
    setSelectedProject(proj);
    setIsDetailLoading(true);
    try {
      // Fetch fresh detail in case summary was partial
      const res = await apiClient.get<ProjectItem>(`/projects/${proj.id}`);
      setSelectedProject(res.data);
    } catch {
      setSelectedProject(proj);
    } finally {
      setIsDetailLoading(false);
    }
  };

  // Tag chip handlers in form
  const handleAddTag = (rawTag: string) => {
    const cleaned = rawTag.trim().toLowerCase().replace(/^#+/, '');
    if (!cleaned) return;
    if (tags.length >= 10) {
      showToast('Tối đa 10 thẻ tag cho một ý tưởng dự án.', 'info');
      return;
    }
    if (!tags.includes(cleaned)) {
      setTags([...tags, cleaned]);
    }
    setCurrentTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleKeyDownTagInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddTag(currentTagInput);
    }
  };

  // Reset Form
  const resetForm = () => {
    setTitle('');
    setProblem('');
    setSolution('');
    setSelectedDomain('EdTech');
    setSelectedStatus('Draft');
    setTags([]);
    setCurrentTagInput('');
    setEditingProject(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEdit = async (proj: ProjectItem, e?: React.MouseEvent) => {
    e?.stopPropagation();
    let full = proj;
    try {
      // Fetch full details before editing
      const res = await apiClient.get<ProjectItem>(`/projects/${proj.id}`);
      full = res.data;
    } catch {
      full = proj;
    }
    setEditingProject(full);
    setTitle(full.title);
    setProblem(full.problem || '');
    setSolution(full.solution || '');
    setSelectedDomain(full.domain);
    setSelectedStatus(full.status);
    setTags(full.tags || []);
    setIsModalOpen(true);
  };

  // Save Project (Create / Update)
  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !problem.trim() || !solution.trim()) {
      showToast('Vui lòng điền đầy đủ Tiêu đề, Vấn đề và Giải pháp.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      if (editingProject) {
        // UPDATE
        await apiClient.put(`/projects/${editingProject.id}`, {
          title: title.trim(),
          problem: problem.trim(),
          solution: solution.trim(),
          domain: selectedDomain,
          status: selectedStatus,
          tags,
        });
        showToast('Cập nhật ý tưởng dự án thành công!', 'success');
      } else {
        // CREATE
        await apiClient.post('/projects', {
          title: title.trim(),
          problem: problem.trim(),
          solution: solution.trim(),
          domain: selectedDomain,
          tags,
        });
        showToast('Đề xuất ý tưởng dự án thành công!', 'success');
      }

      setIsModalOpen(false);
      resetForm();
      fetchProjects();
    } catch (err: any) {
      showToast(
        err.response?.data?.detail ||
          err.response?.data?.title ||
          (editingProject ? 'Không thể cập nhật dự án.' : 'Không thể tạo dự án, vui lòng thử lại.'),
        'error'
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Confirm delete execution
  const executeDelete = async () => {
    if (!confirmDelete) return;
    try {
      await apiClient.delete(`/projects/${confirmDelete.id}`);
      showToast('Đã xóa ý tưởng dự án thành công.', 'success');
      if (selectedProject?.id === confirmDelete.id) {
        setSelectedProject(null);
      }
      setConfirmDelete(null);
      fetchProjects();
    } catch (err: any) {
      showToast(err.response?.data?.detail || err.response?.data?.title || 'Lỗi khi xóa dự án.', 'error');
      setConfirmDelete(null);
    }
  };

  // Helper: Domain meta lookup
  const getDomainMeta = (dom: ProjectDomain): DomainMeta => {
    return DOMAIN_METAS.find((m) => m.domain === dom) || DOMAIN_METAS[6];
  };

  // Helper: Status meta lookup
  const getStatusMeta = (stat: ProjectStatus) => {
    return STATUS_OPTIONS.find((s) => s.status === stat) || STATUS_OPTIONS[0];
  };

  // Statistics calculation for Quick Pills
  const counts = useMemo(() => {
    return {
      total: totalCount,
      recruiting: projects.filter((p) => p.status === 'Recruiting').length,
      active: projects.filter((p) => p.status === 'Active').length,
      myProjects: user?.id ? projects.filter((p) => p.ownerId === user.id).length : 0,
    };
  }, [projects, totalCount, user]);

  return (
    <div className="pt-6" style={{ maxWidth: 1560, margin: '0 auto', paddingBottom: '3rem', paddingTop: '1.5rem' }}>
      {/* ── In-App Toast Container ── */}
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast-item toast-${t.type}`}>
            {t.type === 'success' && <CheckCircle2 size={18} />}
            {t.type === 'error' && <AlertTriangle size={18} />}
            {t.type === 'info' && <Sparkles size={18} />}
            <span>{t.message}</span>
          </div>
        ))}
      </div>

      {/* ── Top Hero & Heading ── */}
      <div
        style={{
          background: 'var(--bg-card)',
          borderRadius: '20px',
          border: '1px solid var(--border-light)',
          padding: '2rem 2.25rem',
          marginBottom: '2rem',
          boxShadow: 'var(--shadow-sm)',
          position: 'relative',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1.5rem',
          }}
        >
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12.5px',
                fontWeight: 450,
                color: 'var(--text-muted, #64748B)',
                marginBottom: '0.45rem',
              }}
            >
              <span>Học phần</span>
              <span style={{ color: 'var(--text-light, #CBD5E1)' }}>/</span>
              <span>EXE</span>
              <span style={{ color: 'var(--text-light, #CBD5E1)' }}>/</span>
              <span style={{ color: 'var(--text-main, #0F172A)', fontWeight: 500 }}>Kho đề tài dự kiến</span>
            </div>

            <h1
              style={{
                fontSize: '1.75rem',
                fontWeight: 650,
                color: 'var(--text-main)',
                letterSpacing: '-0.022em',
                lineHeight: 1.25,
                margin: '0 0 0.35rem 0',
              }}
            >
              Thư viện Ý tưởng Dự án EXE
            </h1>

            <p
              style={{
                color: 'var(--text-muted)',
                fontSize: '0.95rem',
                fontWeight: 400,
                margin: 0,
                maxWidth: 650,
                lineHeight: 1.5,
              }}
            >
              Tham khảo các đề tài khởi nghiệp dự kiến hoặc đề xuất ý tưởng mới cho nhóm của bạn.
            </p>
          </div>

          {/* Call to action */}
          {user?.role === 'Student' && (
            <button
              onClick={handleOpenCreate}
              className="btn btn-primary"
              style={{
                padding: '0.65rem 1.25rem',
                fontSize: '0.875rem',
                fontWeight: 500,
                boxShadow: 'none',
              }}
            >
              <Plus size={16} />
              Đề xuất ý tưởng mới
            </button>
          )}
        </div>

        {/* Quick KPI stats pills */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.75rem',
            marginTop: '1.75rem',
            paddingTop: '1.25rem',
            borderTop: '1px solid var(--border-subtle)',
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.35rem 0.85rem',
              borderRadius: '9999px',
              backgroundColor: 'var(--bg-subtle)',
              border: '1px solid var(--border-light)',
              fontSize: '0.95rem',
              color: 'var(--text-muted)',
            }}
          >
            <span>Tổng cộng:</span>
            <strong style={{ color: 'var(--text-main)', fontWeight: 600 }}>{counts.total} ý tưởng</strong>
          </div>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.35rem 0.85rem',
              borderRadius: '9999px',
              backgroundColor: 'var(--bg-subtle)',
              border: '1px solid var(--border-light)',
              fontSize: '0.95rem',
              color: 'var(--text-muted)',
            }}
          >
            <span>Đang tuyển người:</span>
            <strong style={{ color: 'var(--text-main)', fontWeight: 600 }}>{counts.recruiting}</strong>
          </div>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.35rem 0.85rem',
              borderRadius: '9999px',
              backgroundColor: 'var(--bg-subtle)',
              border: '1px solid var(--border-light)',
              fontSize: '0.95rem',
              color: 'var(--text-muted)',
            }}
          >
            <span>Đang triển khai:</span>
            <strong style={{ color: 'var(--text-main)', fontWeight: 600 }}>{counts.active}</strong>
          </div>

          {user?.id && (
            <div
              onClick={() => {
                setFilterMyProjects((prev) => !prev);
                setPage(1);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.35rem 0.85rem',
                borderRadius: '9999px',
                backgroundColor: filterMyProjects ? 'var(--pill-active-bg)' : 'var(--pill-inactive-bg)',
                border: '1px solid ' + (filterMyProjects ? 'var(--pill-active-border)' : 'var(--pill-inactive-border)'),
                fontSize: '0.95rem',
                color: filterMyProjects ? 'var(--pill-active-text)' : 'var(--pill-inactive-text)',
                cursor: 'pointer',
                transition: 'all 150ms ease',
              }}
            >
              <span>Dự án của bạn:</span>
              <strong style={{ color: filterMyProjects ? 'var(--pill-active-text)' : 'var(--text-main)', fontWeight: 600 }}>
                {counts.myProjects}
              </strong>
            </div>
          )}
        </div>
      </div>

      {/* ── Filter & Search Toolbar ── */}
      <div
        className="card"
        style={{
          padding: '1.25rem 1.5rem',
          marginBottom: '1.75rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}
      >
        {/* Row 1: Search input + View switchers */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            flexWrap: 'wrap',
          }}
        >
          {/* Search Input with Clear Button */}
          <div className="motion-search-wrap" style={{ position: 'relative', flex: '1 1 320px' }}>
            <Search
              size={18}
              className="motion-search-icon"
              style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}
            />
            <input
              type="text"
              className="form-control motion-search-input"
              placeholder="Tìm kiếm theo tiêu đề dự án hoặc mô tả vấn đề..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              style={{ paddingLeft: '2.6rem', paddingRight: search ? '2.4rem' : '1rem', height: 42 }}
            />
            {search && (
              <button
                className="motion-clear-btn"
                onClick={() => {
                  setSearch('');
                  setPage(1);
                }}
                style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#94a3b8',
                  padding: 3,
                }}
                title="Xóa tìm kiếm"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Domain Filter Dropdown */}
          <div style={{ minWidth: 200 }}>
            <select
              className="form-control"
              value={domain}
              onChange={(e) => {
                setDomain(e.target.value);
                setPage(1);
              }}
              style={{ height: 42 }}
            >
              <option value="">Tất cả lĩnh vực (Domain)</option>
              {DOMAIN_METAS.map((d) => (
                <option key={d.domain} value={d.domain}>
                  {d.label} ({d.domain})
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter Dropdown */}
          <div style={{ minWidth: 180 }}>
            <select
              className="form-control"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              style={{ height: 42 }}
            >
              <option value="">Tất cả trạng thái</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s.status} value={s.status}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {/* Sort By */}
          <div style={{ minWidth: 170 }}>
            <select
              className="form-control"
              value={`${sortBy}-${sortDir}`}
              onChange={(e) => {
                const [sb, sd] = e.target.value.split('-');
                setSortBy(sb);
                setSortDir(sd);
                setPage(1);
              }}
              style={{ height: 42 }}
            >
              <option value="createdAt-desc">Mới nhất trước</option>
              <option value="createdAt-asc">Cũ nhất trước</option>
              <option value="title-asc">Tiêu đề (A - Z)</option>
              <option value="domain-asc">Lĩnh vực</option>
            </select>
          </div>

          {/* View Mode Toggle: Flat Segmented Control */}
          <div
            style={{
              display: 'inline-flex',
              gap: '2px',
              backgroundColor: '#F1F5F9',
              borderRadius: '9px',
              padding: '3px',
              border: '1px solid #E2E8F0',
            }}
          >
            <button
              className={`motion-tab-pill${viewMode === 'grid' ? ' is-active-tab' : ''}`}
              onClick={() => setViewMode('grid')}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: 'none',
                background: viewMode === 'grid' ? '#0F172A' : 'transparent',
                color: viewMode === 'grid' ? '#FFFFFF' : '#64748B',
                boxShadow: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
              title="Dạng lưới"
            >
              <LayoutGrid size={14} />
              Lưới
            </button>
            <button
              className={`motion-tab-pill${viewMode === 'list' ? ' is-active-tab' : ''}`}
              onClick={() => setViewMode('list')}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: 'none',
                background: viewMode === 'list' ? '#0F172A' : 'transparent',
                color: viewMode === 'list' ? '#FFFFFF' : '#64748B',
                boxShadow: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
              title="Dạng danh sách"
            >
              <List size={14} />
              Danh sách
            </button>
          </div>
        </div>

        {/* Row 2: Quick Filter Segmented Control */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', paddingTop: '4px' }}>
          <span style={{ fontSize: '13px', color: '#64748B', fontWeight: 500, marginRight: '0.25rem' }}>
            Lĩnh vực:
          </span>
          <div
            style={{
              display: 'inline-flex',
              gap: '2px',
              flexWrap: 'wrap',
              backgroundColor: '#F1F5F9',
              padding: '3px',
              borderRadius: '9px',
              border: '1px solid #E2E8F0',
            }}
          >
            <button
              className={`motion-tab-pill${!domain ? ' is-active-tab' : ''}`}
              onClick={() => {
                setDomain('');
                setPage(1);
              }}
              style={{
                backgroundColor: !domain ? '#0F172A' : 'transparent',
                color: !domain ? '#FFFFFF' : '#64748B',
                border: 'none',
                padding: '6px 13px',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                boxShadow: 'none',
              }}
            >
              Tất cả
            </button>
            {DOMAIN_METAS.map((d) => {
              const isSelected = domain === d.domain;
              return (
                <button
                  key={d.domain}
                  className={`motion-tab-pill${isSelected ? ' is-active-tab' : ''}`}
                  onClick={() => {
                    setDomain(isSelected ? '' : d.domain);
                    setPage(1);
                  }}
                  style={{
                    backgroundColor: isSelected ? '#0F172A' : 'transparent',
                    color: isSelected ? '#FFFFFF' : '#64748B',
                    border: 'none',
                    padding: '6px 13px',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    boxShadow: 'none',
                  }}
                >
                  {d.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Main Content: Grid or List ── */}
      {loading ? (
        <div
          className="card"
          style={{
            padding: '4rem 2rem',
            textAlign: 'center',
            color: 'var(--text-muted)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <RefreshCw size={32} color="var(--primary)" className="spinner-smooth" />
          <div style={{ fontWeight: 600 }}>Đang tải danh sách ý tưởng dự án EXE...</div>
        </div>
      ) : projects.length === 0 ? (
        <div
          className="card"
          style={{
            padding: '4rem 2rem',
            textAlign: 'center',
            color: 'var(--text-muted)',
            maxWidth: 680,
            margin: '0 auto',
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: 'var(--primary-light)',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem auto',
            }}
          >
            <Lightbulb size={32} />
          </div>
          <h3 style={{ color: 'var(--text-main)', fontSize: '1.25rem', fontWeight: 700 }}>
            Không tìm thấy ý tưởng dự án nào
          </h3>
          <p style={{ marginTop: '0.45rem', fontSize: '1.025rem', lineHeight: 1.5 }}>
            {search || domain || status || filterMyProjects
              ? 'Không có kết quả nào phù hợp với bộ lọc hiện tại. Hãy thử xóa hoặc nới lỏng các điều kiện tìm kiếm.'
              : 'Hiện chưa có ý tưởng nào trong hệ thống. Hãy là người tiên phong đề xuất ý tưởng khởi nghiệp đầu tiên!'}
          </p>

          <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
            {(search || domain || status || filterMyProjects) && (
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setSearch('');
                  setDomain('');
                  setStatus('');
                  setFilterMyProjects(false);
                  setPage(1);
                }}
              >
                Đặt lại bộ lọc
              </button>
            )}
            {user?.role === 'Student' && (
              <button className="btn btn-primary btn-sm" onClick={handleOpenCreate}>
                <Plus size={16} />
                Đề xuất ý tưởng ngay
              </button>
            )}
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        /* ── Grid View ── */
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
            gap: '24px',
            marginTop: '24px',
          }}
        >
          {projects.map((proj, idx) => {
            const isOwner = user?.id === proj.ownerId;
            const domMeta = getDomainMeta(proj.domain);

            const statusConfig = (() => {
              switch (proj.status) {
                case 'Recruiting':
                  return {
                    label: 'Đang tuyển người',
                    bg: '#F8FAFC',
                    text: '#334155',
                    border: '#E2E8F0',
                    dot: '#10B981',
                  };
                case 'Active':
                  return {
                    label: 'Đang triển khai',
                    bg: '#F8FAFC',
                    text: '#334155',
                    border: '#E2E8F0',
                    dot: '#0F172A',
                  };
                case 'Completed':
                  return {
                    label: 'Hoàn thành',
                    bg: '#F8FAFC',
                    text: '#475569',
                    border: '#E2E8F0',
                    dot: '#64748B',
                  };
                case 'Cancelled':
                  return {
                    label: 'Đã hủy',
                    bg: '#F8FAFC',
                    text: '#64748B',
                    border: '#E2E8F0',
                    dot: '#94A3B8',
                  };
                case 'Draft':
                default:
                  return {
                    label: 'Bản nháp',
                    bg: '#F8FAFC',
                    text: '#475569',
                    border: '#E2E8F0',
                    dot: '#94A3B8',
                  };
              }
            })();

            return (
              <div
                key={proj.id}
                onClick={() => handleOpenDetail(proj)}
                className="project-card-interactive motion-stagger-item"
                style={
                  {
                    '--stagger-index': Math.min(idx, 7),
                    border: '1px solid var(--border-light, #E2E8F0)',
                    backgroundColor: 'var(--bg-card, #FFFFFF)',
                    padding: '26px',
                    borderRadius: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    boxShadow: '0 2px 10px rgba(15, 23, 42, 0.03)',
                  } as React.CSSProperties
                }
              >
                <div>
                  {/* Hàng 1 (Top Meta) */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingBottom: '14px',
                      marginBottom: '16px',
                      borderBottom: '1px solid var(--border-subtle, #F1F5F9)',
                      gap: '10px',
                    }}
                  >
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '7px',
                        padding: '5px 12px',
                        borderRadius: '8px',
                        fontSize: '13px',
                        fontWeight: 600,
                        backgroundColor: 'var(--bg-tag, #F1F5F9)',
                        color: 'var(--text-secondary, #334155)',
                      }}
                    >
                      {domMeta.icon}
                      <span>{domMeta.label}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {isOwner && (
                        <span
                          style={{
                            fontSize: '12px',
                            fontWeight: 700,
                            padding: '4px 10px',
                            borderRadius: '8px',
                            background: 'var(--accent-gradient, linear-gradient(135deg, #f26f21 0%, #ea580c 100%))',
                            color: '#FFFFFF',
                          }}
                        >
                          Của bạn
                        </span>
                      )}

                      <span
                        style={{
                          fontSize: '12.5px',
                          fontWeight: 500,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '3px 9px',
                          borderRadius: '6px',
                          backgroundColor: statusConfig.bg,
                          color: statusConfig.text,
                          border: `1px solid ${statusConfig.border}`,
                          letterSpacing: '-0.005em',
                        }}
                      >
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            backgroundColor: statusConfig.dot,
                            boxShadow:
                              proj.status === 'Recruiting'
                                ? '0 0 0 2px rgba(16, 185, 129, 0.18)'
                                : proj.status === 'Active'
                                ? '0 0 0 2px rgba(242, 111, 33, 0.18)'
                                : 'none',
                            display: 'inline-block',
                            flexShrink: 0,
                          }}
                        />
                        {statusConfig.label}
                      </span>
                    </div>
                  </div>

                  {/* Hàng 2 (Tiêu đề dự án) */}
                  <h3
                    className="line-clamp-2"
                    style={{
                      fontSize: '1.22rem',
                      fontWeight: 800,
                      lineHeight: 1.42,
                      letterSpacing: '-0.01em',
                      color: 'var(--text-main, #0F172A)',
                      marginBottom: '12px',
                    }}
                  >
                    {proj.title}
                  </h3>

                  {/* Hàng 3 (Mô tả Giải pháp) */}
                  <p
                    className="line-clamp-3"
                    style={{
                      fontSize: '14.5px',
                      lineHeight: 1.62,
                      color: 'var(--text-secondary, #475569)',
                      marginBottom: '18px',
                    }}
                  >
                    <strong style={{ fontWeight: 700, color: 'var(--text-main, #0F172A)' }}>Giải pháp: </strong>
                    {proj.solution || proj.problem || 'Chưa cập nhật nội dung giải pháp.'}
                  </p>

                  {/* Hàng 4 (Khu vực "Cần tuyển") */}
                  <div
                    style={{
                      backgroundColor: 'var(--bg-subtle, #F8FAFC)',
                      border: '1px solid var(--border-light, #E2E8F0)',
                      padding: '12px 16px',
                      borderRadius: '12px',
                      marginBottom: '18px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '10px',
                    }}
                  >
                    <span style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-muted, #64748B)' }}>
                      Cần tuyển:
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      {['+1 MKT', '+1 GD'].map((role) => (
                        <span
                          key={role}
                          style={{
                            backgroundColor: 'var(--bg-card, #FFFFFF)',
                            color: 'var(--text-main, #0F172A)',
                            border: '1px solid var(--border-light, #CBD5E1)',
                            padding: '4px 10px',
                            borderRadius: '8px',
                            fontSize: '13px',
                            fontWeight: 700,
                            boxShadow: '0 1px 2px rgba(15, 23, 42, 0.03)',
                          }}
                        >
                          {role}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Hàng 5 (Footer) */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingTop: '14px',
                    marginTop: 'auto',
                    borderTop: '1px solid var(--border-subtle, #F1F5F9)',
                    gap: '10px',
                  }}
                >
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {proj.tags && proj.tags.length > 0 ? (
                      proj.tags.slice(0, 3).map((t) => (
                        <span
                          key={t}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSearch(t);
                            setPage(1);
                          }}
                          style={{
                            fontSize: '12.5px',
                            fontWeight: 600,
                            padding: '4px 10px',
                            borderRadius: '7px',
                            backgroundColor: 'var(--bg-tag, #F1F5F9)',
                            color: 'var(--text-secondary, #475569)',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                          title={`Tìm kiếm các dự án có tag #${t}`}
                        >
                          #{t}
                        </span>
                      ))
                    ) : (
                      <span
                        style={{
                          fontSize: '12.5px',
                          fontWeight: 600,
                          padding: '4px 10px',
                          borderRadius: '7px',
                          backgroundColor: 'var(--bg-tag, #F1F5F9)',
                          color: 'var(--text-secondary, #475569)',
                        }}
                      >
                        #exe
                      </span>
                    )}
                  </div>

                  <span
                    style={{
                      fontSize: '12.5px',
                      fontWeight: 700,
                      padding: '5px 12px',
                      borderRadius: '999px',
                      backgroundColor: 'var(--bg-tag, #F1F5F9)',
                      color: 'var(--text-secondary, #334155)',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                    }}
                  >
                    3/5 thành viên
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ── List View ── */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {projects.map((proj) => {
            const isOwner = user?.id === proj.ownerId;
            const domMeta = getDomainMeta(proj.domain);
            const statMeta = getStatusMeta(proj.status);

            return (
              <div
                key={proj.id}
                onClick={() => handleOpenDetail(proj)}
                className="rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer"
                style={{
                  border: '1px solid var(--border-light)',
                  backgroundColor: 'var(--bg-card)',
                  borderRadius: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '1.5rem',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ flex: '1 1 420px' }}>
                  {/* Top meta row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.45rem', flexWrap: 'wrap' }}>
                    <span
                      style={{
                        fontSize: '13px',
                        fontWeight: 600,
                        color: 'var(--text-secondary)',
                        backgroundColor: 'var(--bg-tag)',
                        padding: '2px 8px',
                        borderRadius: '6px',
                      }}
                    >
                      {domMeta.label}
                    </span>

                    <span
                      style={{
                        fontSize: '14px',
                        fontWeight: 500,
                        color: 'var(--text-muted)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          backgroundColor:
                            proj.status === 'Recruiting'
                              ? '#10B981'
                              : proj.status === 'Active'
                              ? '#3B82F6'
                              : proj.status === 'Completed'
                              ? '#8B5CF6'
                              : '#94A3B8',
                        }}
                      />
                      {statMeta.label}
                    </span>

                    {isOwner && (
                      <span
                        style={{
                          fontSize: '13px',
                          fontWeight: 500,
                          color: 'var(--text-muted)',
                          backgroundColor: 'var(--bg-tag)',
                          border: '1px solid var(--border-light)',
                          padding: '1px 6px',
                          borderRadius: '4px',
                        }}
                      >
                        Của bạn
                      </span>
                    )}

                    {/* Needs badge */}
                    <span style={{ fontSize: '13px', color: 'var(--text-muted)', marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Cần tuyển:</span>
                      {['+1 MKT', '+1 GD'].map((r) => (
                        <span
                          key={r}
                          style={{
                            backgroundColor: 'var(--bg-tag)',
                            color: 'var(--text-secondary)',
                            border: '1px solid var(--border-light)',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            fontWeight: 600,
                          }}
                        >
                          {r}
                        </span>
                      ))}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 0.35rem 0' }}>
                    {proj.title}
                  </h3>

                  <p
                    style={{
                      fontSize: '0.95rem',
                      color: 'var(--text-secondary)',
                      display: '-webkit-box',
                      WebkitLineClamp: 1,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      margin: 0,
                      lineHeight: 1.5,
                    }}
                  >
                    <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>Giải pháp: </span>
                    {proj.solution || proj.problem}
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexShrink: 0 }}>
                  <div style={{ display: 'flex', gap: '0.35rem', maxWidth: 200, flexWrap: 'wrap' }}>
                    {proj.tags?.slice(0, 3).map((t) => (
                      <span
                        key={t}
                        style={{
                          fontSize: '13px',
                          color: 'var(--text-muted)',
                          backgroundColor: 'var(--bg-tag)',
                          border: '1px solid var(--border-light)',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontFamily: 'monospace',
                        }}
                      >
                        #{t}
                      </span>
                    ))}
                  </div>

                  <div style={{ fontSize: '0.925rem', color: 'var(--text-muted)' }}>
                    {new Date(proj.createdAt).toLocaleDateString('vi-VN')}
                  </div>

                  <div style={{ display: 'flex', gap: '0.45rem', alignItems: 'center' }}>
                    {isOwner && (
                      <>
                        <button
                          onClick={(e) => handleOpenEdit(proj, e)}
                          className="btn btn-secondary btn-sm"
                          title="Sửa"
                          style={{ padding: '0.35rem 0.6rem' }}
                        >
                          <Edit3 size={13} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDelete({ id: proj.id, title: proj.title });
                          }}
                          className="btn btn-danger btn-sm"
                          title="Xóa"
                          style={{ padding: '0.35rem 0.6rem' }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </>
                    )}
                    <button
                      className="btn btn-secondary btn-sm"
                      style={{ color: 'var(--text-main)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      Chi tiết <ArrowRight size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '2.5rem' }}>
          <button
            className="btn btn-secondary btn-sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Trang trước
          </button>
          <span style={{ alignSelf: 'center', fontSize: '0.975rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            Trang {page} / {totalPages}
          </span>
          <button
            className="btn btn-secondary btn-sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Trang sau
          </button>
        </div>
      )}

      {/* ── Modal: Tạo mới / Chỉnh sửa Ý tưởng ── */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 700, backgroundColor: 'var(--bg-card)', borderRadius: '20px', overflow: 'hidden', padding: 0 }}
          >
            <div
              style={{
                padding: '1.25rem 1.75rem',
                borderBottom: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: 'var(--bg-card)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '8px',
                    background: 'var(--bg-tag)',
                    color: 'var(--text-main)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Sparkles size={18} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)', margin: 0, letterSpacing: '-0.01em' }}>
                    {editingProject ? 'Chỉnh sửa Ý tưởng Dự án EXE' : 'Đề xuất Ý tưởng Khởi nghiệp EXE'}
                  </h2>
                  <p style={{ fontSize: '0.925rem', color: 'var(--text-muted)', margin: '0.15rem 0 0 0' }}>
                    {editingProject
                      ? 'Cập nhật lại định hướng giải pháp hoặc trạng thái tuyển thành viên của nhóm.'
                      : 'Chia sẻ vấn đề thực tế và mô hình giải pháp để bắt đầu tìm kiếm cộng sự đa ngành.'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}
                title="Đóng"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveProject} style={{ padding: '1.75rem', backgroundColor: 'var(--bg-card)' }}>
              {/* Tên dự án */}
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                  <label className="form-label" style={{ margin: 0, fontWeight: 600, color: 'var(--text-main)' }}>
                    Tên ý tưởng dự án *
                  </label>
                  <span style={{ fontSize: '0.875rem', color: title.length > 180 ? 'var(--danger)' : 'var(--text-muted)' }}>
                    {title.length}/200
                  </span>
                </div>
                <input
                  type="text"
                  className="form-control"
                  placeholder="VD: EdTech Assistant — Nền tảng hỗ trợ sinh viên ghép nhóm..."
                  value={title}
                  maxLength={200}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              {/* Lĩnh vực & Trạng thái */}
              <div style={{ display: 'grid', gridTemplateColumns: editingProject ? '1fr 1fr' : '1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600, color: 'var(--text-main, #0F172A)' }}>
                    Lĩnh vực (Domain) *
                  </label>
                  <select
                    className="form-control"
                    value={selectedDomain}
                    onChange={(e) => setSelectedDomain(e.target.value as ProjectDomain)}
                  >
                    {DOMAIN_METAS.map((d) => (
                      <option key={d.domain} value={d.domain}>
                        {d.label} — {d.description}
                      </option>
                    ))}
                  </select>
                </div>

                {editingProject && (
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600, color: 'var(--text-main, #0F172A)' }}>
                      Trạng thái (Status) *
                    </label>
                    <select
                      className="form-control"
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value as ProjectStatus)}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s.status} value={s.status}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Vấn đề thực tế */}
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                  <label className="form-label" style={{ margin: 0, fontWeight: 600, color: 'var(--text-main, #0F172A)' }}>
                    Vấn đề thực tế đang gặp phải (Problem Statement) *
                  </label>
                  <span style={{ fontSize: '0.875rem', color: problem.length > 1800 ? 'var(--danger)' : '#94a3b8' }}>
                    {problem.length}/2000
                  </span>
                </div>
                <textarea
                  className="form-control"
                  rows={3}
                  placeholder="Mô tả cụ thể khó khăn, khoảng trống thị trường hoặc nỗi đau của khách hàng mục tiêu..."
                  value={problem}
                  maxLength={2000}
                  onChange={(e) => setProblem(e.target.value)}
                  required
                />
              </div>

              {/* Giải pháp đề xuất */}
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                  <label className="form-label" style={{ margin: 0, fontWeight: 600, color: 'var(--text-main, #0F172A)' }}>
                    Giải pháp đề xuất (Solution Statement) *
                  </label>
                  <span style={{ fontSize: '0.875rem', color: solution.length > 1800 ? 'var(--danger)' : '#94a3b8' }}>
                    {solution.length}/2000
                  </span>
                </div>
                <textarea
                  className="form-control"
                  rows={3}
                  placeholder="Giải pháp công nghệ hoặc mô hình kinh doanh giúp giải quyết triệt để vấn đề trên..."
                  value={solution}
                  maxLength={2000}
                  onChange={(e) => setSolution(e.target.value)}
                  required
                />
              </div>

              {/* Thẻ từ khóa Tags (Interactive Chip Input) */}
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600, color: 'var(--text-main, #0F172A)' }}>
                  Thẻ từ khóa & Công nghệ (Tối đa 10 tag)
                </label>

                {/* Tag Chips list */}
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '0.4rem',
                    marginBottom: '0.5rem',
                    minHeight: tags.length > 0 ? 'auto' : 0,
                  }}
                >
                  {tags.map((t) => (
                    <span
                      key={t}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '0.25rem 0.65rem',
                        background: '#F1F5F9',
                        border: '1px solid var(--border-light, #E2E8F0)',
                        color: 'var(--text-secondary, #334155)',
                        borderRadius: '6px',
                        fontSize: '0.925rem',
                        fontWeight: 600,
                      }}
                    >
                      #{t}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(t)}
                        style={{ color: '#64748b', cursor: 'pointer', padding: 1 }}
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>

                {/* Input box */}
                <input
                  type="text"
                  className="form-control"
                  placeholder="Gõ tên tag rồi nhấn Enter hoặc phẩy (VD: React, AI, FinTech)..."
                  value={currentTagInput}
                  onChange={(e) => setCurrentTagInput(e.target.value)}
                  onKeyDown={handleKeyDownTagInput}
                  onBlur={() => {
                    if (currentTagInput.trim()) handleAddTag(currentTagInput);
                  }}
                />

                {/* Suggested popular tags */}
                <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.875rem', color: '#64748b' }}>Gợi ý nhanh:</span>
                  {POPULAR_TAGS.map((pt) => {
                    const isAdded = tags.includes(pt.toLowerCase());
                    return (
                      <button
                        key={pt}
                        type="button"
                        onClick={() => handleAddTag(pt)}
                        disabled={isAdded}
                        style={{
                          fontSize: '0.72rem',
                          padding: '0.15rem 0.5rem',
                          borderRadius: '6px',
                          background: isAdded ? '#F8FAFC' : '#FFFFFF',
                          border: '1px solid var(--border-light, #E2E8F0)',
                          color: isAdded ? '#94a3b8' : '#475569',
                          cursor: isAdded ? 'default' : 'pointer',
                        }}
                      >
                        +{pt}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Form Actions */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '0.75rem',
                  marginTop: '1.75rem',
                  paddingTop: '1rem',
                  borderTop: '1px solid var(--border-subtle, #F1F5F9)',
                }}
              >
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    backgroundColor: '#0F172A',
                    color: '#FFFFFF',
                    border: '1px solid #0F172A',
                    padding: '0.6rem 1.4rem',
                    borderRadius: '8px',
                    fontSize: '1.025rem',
                    fontWeight: 600,
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    opacity: submitting ? 0.7 : 1,
                  }}
                >
                  {submitting ? 'Đang xử lý...' : editingProject ? 'Lưu thay đổi' : 'Công bố ý tưởng'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Chi tiết Ý tưởng Dự án ── */}
      {selectedProject && (
        <div className="modal-overlay" onClick={() => setSelectedProject(null)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 720, backgroundColor: 'var(--bg-card)', borderRadius: '20px', overflow: 'hidden', padding: 0 }}
          >
            {/* Header */}
            <div
              style={{
                padding: '1.25rem 1.75rem',
                borderBottom: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: 'var(--bg-card)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <span
                  style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                    backgroundColor: 'var(--bg-tag)',
                    padding: '3px 10px',
                    borderRadius: '6px',
                  }}
                >
                  {getDomainMeta(selectedProject.domain).label}
                </span>

                <span
                  style={{
                    fontSize: '14px',
                    fontWeight: 500,
                    color: 'var(--text-muted)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      backgroundColor:
                        selectedProject.status === 'Recruiting'
                          ? '#10B981'
                          : selectedProject.status === 'Active'
                          ? '#3B82F6'
                          : selectedProject.status === 'Completed'
                          ? '#8B5CF6'
                          : '#94A3B8',
                    }}
                  />
                  {getStatusMeta(selectedProject.status).label}
                </span>

                {isDetailLoading && (
                  <RefreshCw
                    size={14}
                    className="animate-spin"
                    style={{ color: 'var(--text-main)', animation: 'spin 1s linear infinite' }}
                  />
                )}
              </div>

              <button
                onClick={() => setSelectedProject(null)}
                style={{ color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}
                title="Đóng"
              >
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '1.75rem', backgroundColor: 'var(--bg-card)' }}>
              <h2
                style={{
                  fontSize: '1.45rem',
                  fontWeight: 800,
                  color: 'var(--text-main)',
                  marginBottom: '1rem',
                  lineHeight: 1.35,
                  letterSpacing: '-0.02em',
                }}
              >
                {selectedProject.title}
              </h2>

              {/* Section 1: Problem */}
              <div style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '16px' }}>
                <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px', marginTop: '12px' }}>
                  Vấn đề thực tế
                </div>
                <p style={{ fontSize: '16px', lineHeight: '1.6', color: 'var(--text-secondary)', margin: 0 }}>
                  {selectedProject.problem || 'Chưa cập nhật mô tả chi tiết vấn đề.'}
                </p>
              </div>

              {/* Section 2: Solution */}
              <div style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '16px' }}>
                <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px', marginTop: '20px' }}>
                  Giải pháp đề xuất
                </div>
                <p style={{ fontSize: '16px', lineHeight: '1.6', color: 'var(--text-secondary)', margin: 0 }}>
                  {selectedProject.solution || 'Chưa cập nhật mô tả chi tiết giải pháp.'}
                </p>
              </div>

              {/* Section 3: Tags */}
              <div style={{ paddingBottom: '8px' }}>
                <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '8px', marginTop: '20px' }}>
                  Từ khóa & Công nghệ
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
                  {selectedProject.tags && selectedProject.tags.length > 0 ? (
                    selectedProject.tags.map((t) => (
                      <span
                        key={t}
                        style={{
                          fontSize: '14px',
                          color: 'var(--text-muted)',
                          backgroundColor: 'var(--bg-tag)',
                          border: '1px solid var(--border-light)',
                          padding: '3px 10px',
                          borderRadius: '6px',
                          fontFamily: 'monospace',
                        }}
                      >
                        #{t}
                      </span>
                    ))
                  ) : (
                    <span style={{ fontSize: '15px', color: 'var(--text-muted)' }}>Chưa có tag nào</span>
                  )}
                </div>
              </div>

              {/* Metadata row */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingTop: '1.25rem',
                  borderTop: '1px solid var(--border-subtle)',
                  fontSize: '0.95rem',
                  color: 'var(--text-muted)',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                  marginTop: '1.25rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Calendar size={14} />
                  <span>Ngày công bố: {new Date(selectedProject.createdAt).toLocaleDateString('vi-VN')}</span>
                  {selectedProject.updatedAt && selectedProject.updatedAt !== selectedProject.createdAt && (
                    <span>• Cập nhật: {new Date(selectedProject.updatedAt).toLocaleDateString('vi-VN')}</span>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                  {user?.id === selectedProject.ownerId && (
                    <>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                          const p = selectedProject;
                          setSelectedProject(null);
                          handleOpenEdit(p);
                        }}
                      >
                        <Edit3 size={14} />
                        Chỉnh sửa
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => {
                          setConfirmDelete({ id: selectedProject.id, title: selectedProject.title });
                        }}
                      >
                        <Trash2 size={14} />
                        Xóa
                      </button>
                    </>
                  )}

                  {/* Create Group for project action in Charcoal Black */}
                  <button
                    onClick={() => setGroupLinkModal(selectedProject)}
                    style={{
                      backgroundColor: '#0F172A',
                      color: '#FFFFFF',
                      border: '1px solid #0F172A',
                      padding: '0.45rem 1rem',
                      borderRadius: '8px',
                      fontSize: '0.95rem',
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      cursor: 'pointer',
                      transition: 'all 150ms ease',
                    }}
                  >
                    <Users2 size={15} />
                    Thành lập nhóm cho dự án này
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Dialog: Hướng dẫn & Liên kết tạo nhóm EXE (Thay thế alert thô sơ) ── */}
      {groupLinkModal && (
        <div className="modal-overlay" onClick={() => setGroupLinkModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 540 }}>
            <div style={{ padding: '1.5rem', textAlign: 'center' }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  background: 'var(--primary-light)',
                  color: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1rem auto',
                }}
              >
                <Users2 size={28} />
              </div>

              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                Thành lập Nhóm Khởi nghiệp
              </h3>

              <div
                style={{
                  background: 'var(--bg-main)',
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '1rem',
                  fontSize: '1.025rem',
                  color: 'var(--text-main)',
                  textAlign: 'left',
                  lineHeight: 1.5,
                }}
              >
                <div style={{ fontWeight: 650, color: '#0F172A', marginBottom: '0.35rem' }}>
                  Quy tắc ghép nhóm học phần EXE:
                </div>
                <ul style={{ paddingLeft: '1.2rem', margin: 0, fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
                  <li>Chỉ <strong>chủ ý tưởng dự án</strong> mới có quyền tạo nhóm cho ý tưởng này.</li>
                  <li>Mỗi dự án chỉ gắn liền với <strong>duy nhất 1 nhóm</strong> trong suốt kỳ học.</li>
                  <li>Bạn sẽ tự động trở thành <strong>Team Leader</strong> và thiết lập các vị trí tuyển thành viên.</li>
                </ul>
              </div>

              <p style={{ fontSize: '0.975rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                Bạn có muốn chuyển đến màn hình Quản lý Nhóm để tiếp tục quy trình này không?
              </p>

              <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
                <button className="btn btn-secondary" onClick={() => setGroupLinkModal(null)}>
                  Đóng
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    setGroupLinkModal(null);
                    setSelectedProject(null);
                    navigate('/groups', {
                      state: {
                        createFromProject: {
                          id: groupLinkModal.id,
                          title: groupLinkModal.title,
                          domain: groupLinkModal.domain,
                        },
                      },
                    });
                  }}
                >
                  Đến trang Nhóm đề tài
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Dialog: Xác nhận Xóa Ý tưởng (Thay thế window.confirm) ── */}
      {confirmDelete && (
        <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460 }}>
            <div style={{ padding: '1.5rem', textAlign: 'center' }}>
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: '50%',
                  background: 'var(--danger-light)',
                  color: 'var(--danger)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1rem auto',
                }}
              >
                <Trash2 size={24} />
              </div>

              <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                Xác nhận xóa ý tưởng dự án?
              </h3>

              <p style={{ fontSize: '0.975rem', color: 'var(--text-muted)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                Bạn có chắc chắn muốn xóa vĩnh viễn ý tưởng <strong>"{confirmDelete.title}"</strong> không? Thao tác này
                không thể hoàn tác.
              </p>

              <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
                <button className="btn btn-secondary" onClick={() => setConfirmDelete(null)}>
                  Hủy bỏ
                </button>
                <button className="btn btn-danger" onClick={executeDelete}>
                  Xác nhận xóa
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
