import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
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
} from 'lucide-react';

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

// ── Default Sample Projects (Dùng khi Offline / Kiểm tra giao diện không cần Backend) ──
const DEFAULT_SAMPLE_PROJECTS: ProjectItem[] = [
  {
    id: '22222222-2222-2222-2222-222222222201',
    ownerId: '11111111-1111-1111-1111-111111111101', // Tài khoản của Tú
    title: 'EXE Team Matching Platform',
    domain: 'EdTech',
    status: 'Recruiting',
    problem:
      'Sinh viên Đại học FPT gặp nhiều rào cản khi lập nhóm đa ngành (SE, GD, MKT, IB) cho đồ án khởi nghiệp EXE. Việc ghép nhóm thủ công trên mạng xã hội thiếu minh bạch, khó thẩm định kỹ năng và không đo lường được mức độ phù hợp giữa các thành viên.',
    solution:
      'Nền tảng phân tán ứng dụng thuật toán matching chấm điểm năng lực (gRPC), đề xuất đồng đội tương thích theo chuyên ngành và kỹ năng, kết hợp quản lý quy trình ứng tuyển và tuyển dụng vị trí minh bạch.',
    tags: ['edtech', 'dotnet', 'react', 'grpc', 'team-matching'],
    createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
  {
    id: '22222222-2222-2222-2222-222222222202',
    ownerId: '11111111-1111-1111-1111-111111111102',
    title: 'EcoCampus - Hệ thống phân loại rác thông minh tích hợp AI',
    domain: 'Other',
    status: 'Recruiting',
    problem:
      'Rác thải nhựa và rác sinh hoạt tại các cơ sở trường học ngày càng lớn nhưng việc phân loại rác tại nguồn chưa hiệu quả do thiếu sự khuyến khích và hướng dẫn trực quan cho sinh viên.',
    solution:
      'Thùng rác thông minh tích hợp camera AI nhận diện tự động loại rác thải, tự động mở đúng ngăn và tích điểm thưởng đổi quà tại căn tin cho sinh viên thông qua ứng dụng di động.',
    tags: ['ai', 'iot', 'greentech', 'smart-campus'],
    createdAt: new Date(Date.now() - 8 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: '22222222-2222-2222-2222-222222222203',
    ownerId: '11111111-1111-1111-1111-111111111103',
    title: 'UniFood - Đặt món và thanh toán không tiền mặt tại Căn tin',
    domain: 'FnB',
    status: 'Active',
    problem:
      'Tình trạng ùn tắc kéo dài 15-20 phút tại các quầy căn tin vào giờ cao điểm trưa, khiến sinh viên dễ bị muộn giờ học và gây áp lực lớn cho nhân viên phục vụ.',
    solution:
      'Hệ thống đặt món trước từ xa, thanh toán mã QR tức thì và nhận thông báo khi món ăn sẵn sàng, tối ưu hóa công suất vận hành cho các gian hàng ẩm thực.',
    tags: ['fnb', 'canteen', 'qr-payment', 'mobile'],
    createdAt: new Date(Date.now() - 14 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
  {
    id: '22222222-2222-2222-2222-222222222204',
    ownerId: '11111111-1111-1111-1111-111111111104',
    title: 'FinPocket - Trợ lý quản lý tài chính thông minh cho sinh viên',
    domain: 'FinTech',
    status: 'Completed',
    problem:
      'Đa số sinh viên sống xa nhà chưa có kỹ năng quản lý ngân sách cá nhân, thường xuyên rơi vào cảnh thiếu hụt tài chính trước cuối tháng và khó khăn khi chia tiền phòng trọ.',
    solution:
      'Ứng dụng tài chính áp dụng quy tắc 6 chiếc lọ tự động, liên kết đồng bộ chi tiêu nhóm phòng trọ và đưa ra gợi ý tiết kiệm thông minh theo mức sinh hoạt phí thực tế.',
    tags: ['fintech', 'budgeting', 'personal-finance'],
    createdAt: new Date(Date.now() - 20 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
  {
    id: '22222222-2222-2222-2222-222222222205',
    ownerId: '11111111-1111-1111-1111-111111111101', // Dự án của Tú
    title: 'F-Tour: Cổng trải nghiệm văn hóa và du lịch bản địa cho Gen Z',
    domain: 'Tourism',
    status: 'Draft',
    problem:
      'Giới trẻ ngày nay có xu hướng tìm kiếm các tour du lịch trải nghiệm văn hóa bản địa độc lạ thay vì các tour du lịch truyền thống, nhưng thị trường thiếu nền tảng kết nối trực tiếp với người bản địa.',
    solution:
      'Nền tảng kết nối du khách trẻ với các hướng dẫn viên địa phương và nghệ nhân làng nghề, cung cấp lịch trình cá nhân hóa và cộng đồng đánh giá thực tế.',
    tags: ['tourism', 'genz', 'local-experience'],
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
];

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
  const [localDemoProjects, setLocalDemoProjects] = useState<ProjectItem[]>(() => {
    try {
      const saved = localStorage.getItem('demo_projects_data');
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_SAMPLE_PROJECTS;
  });

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

  // Fetch Projects from API
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
      setProjects(res.data.items || []);
      setTotalCount(res.data.totalCount || 0);
      setTotalPages(Math.max(1, res.data.totalPages || 1));
    } catch {
      // Offline fallback: filter local demo projects
      let filtered = [...localDemoProjects];
      if (search.trim()) {
        const kw = search.trim().toLowerCase();
        filtered = filtered.filter(
          (p) => p.title.toLowerCase().includes(kw) || (p.problem && p.problem.toLowerCase().includes(kw))
        );
      }
      if (domain) {
        filtered = filtered.filter((p) => p.domain === domain);
      }
      if (status) {
        filtered = filtered.filter((p) => p.status === status);
      }
      if (filterMyProjects && user?.id) {
        filtered = filtered.filter((p) => p.ownerId === user.id);
      }

      if (sortBy === 'title') {
        filtered.sort((a, b) => a.title.localeCompare(b.title));
      } else if (sortBy === 'domain') {
        filtered.sort((a, b) => a.domain.localeCompare(b.domain));
      } else {
        filtered.sort((a, b) =>
          sortDir === 'asc' ? a.createdAt.localeCompare(b.createdAt) : b.createdAt.localeCompare(a.createdAt)
        );
      }

      const pageSize = viewMode === 'grid' ? 6 : 10;
      const total = filtered.length;
      const totalP = Math.max(1, Math.ceil(total / pageSize));
      const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

      setProjects(paged);
      setTotalCount(total);
      setTotalPages(totalP);
    } finally {
      setLoading(false);
    }
  }, [search, domain, status, filterMyProjects, sortBy, sortDir, page, viewMode, user, localDemoProjects]);

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
      const found = localDemoProjects.find((p) => p.id === proj.id);
      if (found) setSelectedProject(found);
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
      const found = localDemoProjects.find((p) => p.id === proj.id);
      if (found) full = found;
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
    } catch {
      // Offline fallback: update local demo state
      if (editingProject) {
        setLocalDemoProjects((prev) =>
          prev.map((p) =>
            p.id === editingProject.id
              ? {
                  ...p,
                  title: title.trim(),
                  problem: problem.trim(),
                  solution: solution.trim(),
                  domain: selectedDomain,
                  status: selectedStatus,
                  tags,
                  updatedAt: new Date().toISOString(),
                }
              : p
          )
        );
        showToast('Cập nhật ý tưởng dự án thành công (Chế độ Demo)!', 'success');
      } else {
        const newProj: ProjectItem = {
          id: 'demo-' + Date.now(),
          ownerId: user?.id || '11111111-1111-1111-1111-111111111101',
          title: title.trim(),
          problem: problem.trim(),
          solution: solution.trim(),
          domain: selectedDomain,
          status: 'Draft',
          tags,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setLocalDemoProjects((prev) => [newProj, ...prev]);
        showToast('Đề xuất ý tưởng dự án thành công (Chế độ Demo)!', 'success');
      }

      setIsModalOpen(false);
      resetForm();
      fetchProjects();
    } finally {
      setSubmitting(false);
    }
  };

  // Confirm delete execution
  const executeDelete = async () => {
    if (!confirmDelete) return;
    try {
      await apiClient.delete(`/projects/${confirmDelete.id}`);
      showToast('Đã xóa ý tưởng dự án.', 'success');
      if (selectedProject?.id === confirmDelete.id) {
        setSelectedProject(null);
      }
      setConfirmDelete(null);
      fetchProjects();
    } catch {
      // Offline fallback: remove from local demo state
      setLocalDemoProjects((prev) => prev.filter((p) => p.id !== confirmDelete.id));
      showToast('Đã xóa ý tưởng dự án (Chế độ Demo).', 'success');
      if (selectedProject?.id === confirmDelete.id) {
        setSelectedProject(null);
      }
      setConfirmDelete(null);
      fetchProjects();
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
    <div className="pt-6" style={{ maxWidth: 1280, margin: '0 auto', paddingBottom: '3rem', paddingTop: '1.5rem' }}>
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
          borderRadius: '16px',
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
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
              ĐẠI HỌC FPT • HỌC KỲ KHỞI NGHIỆP
            </div>

            <h1
              style={{
                fontSize: '1.85rem',
                fontWeight: 800,
                color: 'var(--text-main)',
                letterSpacing: '-0.02em',
                lineHeight: 1.35,
                paddingTop: '0.2rem',
              }}
            >
              Thư viện Ý tưởng Dự án EXE
            </h1>

            <p
              style={{
                color: 'var(--text-muted)',
                fontSize: '0.925rem',
                marginTop: '0.45rem',
                maxWidth: 680,
                lineHeight: 1.5,
              }}
            >
              Nơi sinh viên đề xuất sáng kiến khởi nghiệp, tìm kiếm cộng sự tài năng đa ngành (SE, IA, GD, MKT, IB)
              và thành lập nhóm môn Experiential Entrepreneurship.
            </p>
          </div>

          {/* Call to action */}
          {user?.role === 'Student' && (
            <button
              onClick={handleOpenCreate}
              className="btn btn-primary"
              style={{
                padding: '0.75rem 1.45rem',
                fontSize: '0.95rem',
                boxShadow: '0 4px 14px rgba(242, 111, 33, 0.35)',
              }}
            >
              <Plus size={19} />
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
              fontSize: '0.825rem',
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
              fontSize: '0.825rem',
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
              fontSize: '0.825rem',
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
                fontSize: '0.825rem',
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
          <div style={{ position: 'relative', flex: '1 1 320px' }}>
            <Search
              size={18}
              style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}
            />
            <input
              type="text"
              className="form-control"
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
                  padding: 2,
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

          {/* View Mode Toggle */}
          <div
            style={{
              display: 'inline-flex',
              background: 'var(--bg-main)',
              borderRadius: 'var(--radius-md)',
              padding: 3,
              border: '1px solid var(--border-light)',
            }}
          >
            <button
              onClick={() => setViewMode('grid')}
              style={{
                padding: '0.4rem 0.65rem',
                borderRadius: 'var(--radius-sm)',
                background: viewMode === 'grid' ? 'var(--bg-card)' : 'transparent',
                color: viewMode === 'grid' ? 'var(--primary)' : 'var(--text-muted)',
                boxShadow: viewMode === 'grid' ? 'var(--shadow-sm)' : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontSize: '0.8rem',
                fontWeight: 600,
              }}
              title="Dạng lưới"
            >
              <LayoutGrid size={15} />
              Lưới
            </button>
            <button
              onClick={() => setViewMode('list')}
              style={{
                padding: '0.4rem 0.65rem',
                borderRadius: 'var(--radius-sm)',
                background: viewMode === 'list' ? 'var(--bg-card)' : 'transparent',
                color: viewMode === 'list' ? 'var(--primary)' : 'var(--text-muted)',
                boxShadow: viewMode === 'list' ? 'var(--shadow-sm)' : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontSize: '0.8rem',
                fontWeight: 600,
              }}
              title="Dạng danh sách"
            >
              <List size={15} />
              Danh sách
            </button>
          </div>
        </div>

        {/* Row 2: Quick Filter Chips (Pills) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600, marginRight: '0.25rem' }}>
            Lọc nhanh lĩnh vực:
          </span>
          <button
            onClick={() => {
              setDomain('');
              setPage(1);
            }}
            style={
              !domain
                ? { backgroundColor: 'var(--pill-active-bg)', color: 'var(--pill-active-text)', border: '1px solid var(--pill-active-border)', padding: '6px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s ease' }
                : { backgroundColor: 'var(--pill-inactive-bg)', color: 'var(--pill-inactive-text)', border: '1px solid var(--pill-inactive-border)', padding: '6px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s ease' }
            }
          >
            Tất cả
          </button>
          {DOMAIN_METAS.map((d) => {
            const isSelected = domain === d.domain;
            return (
              <button
                key={d.domain}
                onClick={() => {
                  setDomain(isSelected ? '' : d.domain);
                  setPage(1);
                }}
                style={
                  isSelected
                    ? { backgroundColor: 'var(--pill-active-bg)', color: 'var(--pill-active-text)', border: '1px solid var(--pill-active-border)', padding: '6px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s ease' }
                    : { backgroundColor: 'var(--pill-inactive-bg)', color: 'var(--pill-inactive-text)', border: '1px solid var(--pill-inactive-border)', padding: '6px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s ease' }
                }
              >
                {d.label}
              </button>
            );
          })}
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
          <RefreshCw size={32} color="var(--primary)" className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
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
          <p style={{ marginTop: '0.45rem', fontSize: '0.9rem', lineHeight: 1.5 }}>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
          {projects.map((proj) => {
            const isOwner = user?.id === proj.ownerId;
            const domMeta = getDomainMeta(proj.domain);

            // Linear / Minimalist status style mapping without opacity syntax
            const statusConfig = (() => {
              switch (proj.status) {
                case 'Recruiting':
                  return {
                    label: 'Đang tuyển người',
                    badgeClass: 'bg-emerald-50 text-emerald-700',
                    dotClass: 'bg-emerald-500',
                  };
                case 'Active':
                  return {
                    label: 'Đang triển khai',
                    badgeClass: 'bg-blue-50 text-blue-700',
                    dotClass: 'bg-blue-500',
                  };
                case 'Completed':
                  return {
                    label: 'Hoàn thành',
                    badgeClass: 'bg-purple-50 text-purple-700',
                    dotClass: 'bg-purple-500',
                  };
                case 'Cancelled':
                  return {
                    label: 'Đã hủy',
                    badgeClass: 'bg-rose-50 text-rose-700',
                    dotClass: 'bg-rose-500',
                  };
                case 'Draft':
                default:
                  return {
                    label: 'Bản nháp',
                    badgeClass: 'bg-slate-100 text-slate-600',
                    dotClass: 'bg-slate-400',
                  };
              }
            })();

            return (
              <div
                key={proj.id}
                onClick={() => handleOpenDetail(proj)}
                className="rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between cursor-pointer"
                style={{ border: '1px solid var(--border-light)', backgroundColor: 'var(--bg-card)', padding: '22px', borderRadius: '16px' }}
              >
                <div>
                  {/* Hàng 1 (Top Meta) */}
                  <div
                    className="flex items-center justify-between pb-3 mb-3"
                    style={{ borderBottom: '1px solid var(--border-subtle)' }}
                  >
                    <div
                      className="text-xs font-semibold px-2.5 py-1 rounded-md flex items-center gap-1.5"
                      style={{ backgroundColor: 'var(--bg-tag)', color: 'var(--text-secondary)' }}
                    >
                      {domMeta.icon}
                      <span>{domMeta.label}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {isOwner && (
                        <span
                          className="text-xs font-medium px-2 py-0.5 rounded-md"
                          style={{ backgroundColor: 'var(--bg-tag)', color: 'var(--text-muted)', border: '1px solid var(--border-light)' }}
                        >
                          Của bạn
                        </span>
                      )}

                      <span className="text-xs font-medium inline-flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                        <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dotClass}`} />
                        {statusConfig.label}
                      </span>
                    </div>
                  </div>

                  {/* Hàng 2 (Tiêu đề dự án) */}
                  <h3 className="text-lg font-bold leading-snug mb-2 line-clamp-2" style={{ color: 'var(--text-main)' }}>
                    {proj.title}
                  </h3>

                  {/* Hàng 3 (Mô tả Giải pháp) */}
                  <p className="text-sm leading-relaxed line-clamp-3 mb-4" style={{ color: 'var(--text-secondary)' }}>
                    <span className="font-semibold" style={{ color: 'var(--text-main)' }}>Giải pháp: </span>
                    {proj.solution || proj.problem || 'Chưa cập nhật nội dung giải pháp.'}
                  </p>

                  {/* Hàng 4 (Khu vực "Cần tuyển") */}
                  <div
                    className="p-3 rounded-xl mb-4 flex items-center justify-between"
                    style={{ backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', padding: '10px 12px', borderRadius: '10px' }}
                  >
                    <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Cần tuyển:</span>
                    <div className="flex items-center gap-2">
                      {['+1 MKT', '+1 GD'].map((role) => (
                        <span
                          key={role}
                          style={{
                            backgroundColor: 'var(--bg-tag)',
                            color: 'var(--text-secondary)',
                            border: '1px solid var(--border-light)',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: 600,
                            marginLeft: '6px',
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
                  className="flex items-center justify-between pt-3 mt-auto"
                  style={{ borderTop: '1px solid var(--border-subtle)' }}
                >
                  <div className="flex flex-wrap gap-1.5">
                    {proj.tags && proj.tags.length > 0 ? (
                      proj.tags.slice(0, 3).map((t) => (
                        <span
                          key={t}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSearch(t);
                            setPage(1);
                          }}
                          className="text-xs px-2 py-0.5 rounded cursor-pointer transition-colors"
                          style={{ backgroundColor: 'var(--bg-tag)', color: 'var(--text-muted)' }}
                          title={`Tìm kiếm các dự án có tag #${t}`}
                        >
                          #{t}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: 'var(--bg-tag)', color: 'var(--text-muted)' }}>#exe</span>
                    )}
                  </div>

                  <span
                    className="text-xs font-semibold px-2.5 py-1 rounded-full"
                    style={{ backgroundColor: 'var(--bg-tag)', color: 'var(--text-secondary)' }}
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
                        fontSize: '11px',
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
                        fontSize: '12px',
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
                          fontSize: '11px',
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
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
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

                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 0.35rem 0' }}>
                    {proj.title}
                  </h3>

                  <p
                    style={{
                      fontSize: '0.85rem',
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
                          fontSize: '11px',
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

                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
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
          <span style={{ alignSelf: 'center', fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 600 }}>
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
            style={{ maxWidth: 700, backgroundColor: 'var(--bg-card)', borderRadius: '16px', overflow: 'hidden', padding: 0 }}
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
                  <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', margin: 0, letterSpacing: '-0.01em' }}>
                    {editingProject ? 'Chỉnh sửa Ý tưởng Dự án EXE' : 'Đề xuất Ý tưởng Khởi nghiệp EXE'}
                  </h2>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.15rem 0 0 0' }}>
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
                  <span style={{ fontSize: '0.75rem', color: title.length > 180 ? 'var(--danger)' : 'var(--text-muted)' }}>
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
                  <label className="form-label" style={{ fontWeight: 600, color: '#0F172A' }}>
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
                    <label className="form-label" style={{ fontWeight: 600, color: '#0F172A' }}>
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
                  <label className="form-label" style={{ margin: 0, fontWeight: 600, color: '#0F172A' }}>
                    Vấn đề thực tế đang gặp phải (Problem Statement) *
                  </label>
                  <span style={{ fontSize: '0.75rem', color: problem.length > 1800 ? 'var(--danger)' : '#94a3b8' }}>
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
                  <label className="form-label" style={{ margin: 0, fontWeight: 600, color: '#0F172A' }}>
                    Giải pháp đề xuất (Solution Statement) *
                  </label>
                  <span style={{ fontSize: '0.75rem', color: solution.length > 1800 ? 'var(--danger)' : '#94a3b8' }}>
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
                <label className="form-label" style={{ fontWeight: 600, color: '#0F172A' }}>
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
                        border: '1px solid #E2E8F0',
                        color: '#334155',
                        borderRadius: '6px',
                        fontSize: '0.8rem',
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
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Gợi ý nhanh:</span>
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
                          border: '1px solid #E2E8F0',
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
                  borderTop: '1px solid #F1F5F9',
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
                    fontSize: '0.9rem',
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
            style={{ maxWidth: 720, backgroundColor: 'var(--bg-card)', borderRadius: '16px', overflow: 'hidden', padding: 0 }}
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
                    fontSize: '12px',
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
                    fontSize: '12px',
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
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px', marginTop: '12px' }}>
                  Vấn đề thực tế
                </div>
                <p style={{ fontSize: '14px', lineHeight: '1.6', color: 'var(--text-secondary)', margin: 0 }}>
                  {selectedProject.problem || 'Chưa cập nhật mô tả chi tiết vấn đề.'}
                </p>
              </div>

              {/* Section 2: Solution */}
              <div style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '16px' }}>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px', marginTop: '20px' }}>
                  Giải pháp đề xuất
                </div>
                <p style={{ fontSize: '14px', lineHeight: '1.6', color: 'var(--text-secondary)', margin: 0 }}>
                  {selectedProject.solution || 'Chưa cập nhật mô tả chi tiết giải pháp.'}
                </p>
              </div>

              {/* Section 3: Tags */}
              <div style={{ paddingBottom: '8px' }}>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '8px', marginTop: '20px' }}>
                  Từ khóa & Công nghệ
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
                  {selectedProject.tags && selectedProject.tags.length > 0 ? (
                    selectedProject.tags.map((t) => (
                      <span
                        key={t}
                        style={{
                          fontSize: '12px',
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
                    <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Chưa có tag nào</span>
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
                  fontSize: '0.825rem',
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
                      fontSize: '0.85rem',
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
                  fontSize: '0.9rem',
                  color: 'var(--text-main)',
                  textAlign: 'left',
                  lineHeight: 1.5,
                }}
              >
                <div style={{ fontWeight: 700, color: 'var(--primary)', marginBottom: '0.35rem' }}>
                  📌 Quy tắc ghép nhóm môn EXE (BR-11):
                </div>
                <ul style={{ paddingLeft: '1.2rem', margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  <li>Chỉ <strong>chủ ý tưởng dự án</strong> mới có quyền tạo nhóm cho ý tưởng này.</li>
                  <li>Mỗi dự án chỉ gắn liền với <strong>duy nhất 1 nhóm</strong> trong suốt kỳ học.</li>
                  <li>Bạn sẽ tự động trở thành <strong>Team Leader</strong> và thiết lập các vị trí tuyển thành viên.</li>
                </ul>
              </div>

              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
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

              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                Xác nhận xóa ý tưởng dự án?
              </h3>

              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
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
