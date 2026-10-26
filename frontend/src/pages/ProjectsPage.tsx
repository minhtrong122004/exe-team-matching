import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';

const DOMAINS: ProjectDomain[] = [
  'EdTech',
  'FinTech',
  'ECommerce',
  'FnB',
  'Health',
  'Tourism',
  'Other',
];

const STATUSES: ProjectStatus[] = [
  'Draft',
  'Recruiting',
  'Active',
  'Completed',
  'Cancelled',
];

export const ProjectsPage: React.FC = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);

  // Filters
  const [search, setSearch] = useState('');
  const [domain, setDomain] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [page, setPage] = useState<number>(1);

  // Modal create/edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [title, setTitle] = useState('');
  const [problem, setProblem] = useState('');
  const [solution, setSolution] = useState('');
  const [selectedDomain, setSelectedDomain] = useState<ProjectDomain>('EdTech');
  const [selectedStatus, setSelectedStatus] = useState<ProjectStatus>('Draft');
  const [tagsInput, setTagsInput] = useState('');

  // Detail Modal
  const [selectedProject, setSelectedProject] = useState<ProjectItem | null>(null);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (domain) params.append('domain', domain);
      if (status) params.append('status', status);
      params.append('page', page.toString());
      params.append('pageSize', '6');

      const res = await apiClient.get<PagedResult<ProjectItem>>(`/projects?${params.toString()}`);
      setProjects(res.data.items);
      setTotalCount(res.data.totalCount);
      setTotalPages(res.data.totalPages);
    } catch (err) {
      console.warn('API /projects not accessible or offline:', err);
      setProjects([]);
      setTotalCount(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [search, domain, status, page]);

  const handleOpenCreate = () => {
    setEditingProject(null);
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEdit = (proj: ProjectItem, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingProject(proj);
    setTitle(proj.title);
    setProblem(proj.problem || '');
    setSolution(proj.solution || '');
    setSelectedDomain(proj.domain as ProjectDomain);
    setSelectedStatus(proj.status as ProjectStatus);
    setTagsInput(proj.tags.join(', '));
    setIsModalOpen(true);
  };

  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const tags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      if (editingProject) {
        // UPDATE
        await apiClient.put(`/projects/${editingProject.id}`, {
          title,
          problem,
          solution,
          domain: selectedDomain,
          status: selectedStatus,
          tags,
        });
      } else {
        // CREATE
        await apiClient.post('/projects', {
          title,
          problem,
          solution,
          domain: selectedDomain,
          tags,
        });
      }

      setIsModalOpen(false);
      resetForm();
      fetchProjects();
    } catch (err: any) {
      alert(err.response?.data?.detail || err.response?.data?.title || (editingProject ? 'Không thể cập nhật dự án.' : 'Không thể tạo dự án, vui lòng thử lại.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Bạn có chắc chắn muốn xóa ý tưởng dự án này?')) return;
    try {
      await apiClient.delete(`/projects/${id}`);
      fetchProjects();
    } catch (err: any) {
      alert(err.response?.data?.detail || err.response?.data?.title || 'Lỗi khi xóa dự án.');
    }
  };

  const resetForm = () => {
    setTitle('');
    setProblem('');
    setSolution('');
    setSelectedDomain('EdTech');
    setSelectedStatus('Draft');
    setTagsInput('');
    setEditingProject(null);
  };

  return (
    <div>
      {/* Top Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '2rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
            <span className="fpt-portal-badge">ĐẠI HỌC FPT</span>
            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>CỔNG ĐỀ TÀI KHỞI NGHIỆP</span>
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>
            Ý tưởng Dự án EXE <span style={{ fontSize: '1rem', color: 'var(--text-muted, #64748b)', fontWeight: 500 }}>({totalCount})</span>
          </h1>
          <p style={{ color: 'var(--text-muted, #64748b)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Khám phá, đề xuất và quản lý các ý tưởng dự án khởi nghiệp sinh viên Đại học FPT môn EXE
          </p>
        </div>

        {user?.role === 'Student' && (
          <button
            onClick={handleOpenCreate}
            className="btn btn-primary"
            style={{ padding: '0.65rem 1.25rem' }}
          >
            <Plus size={18} />
            Đề xuất ý tưởng mới
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div
        className="card"
        style={{
          padding: '1.25rem',
          marginBottom: '2rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          alignItems: 'center',
        }}
      >
        <div style={{ position: 'relative' }}>
          <Search
            size={18}
            style={{ position: 'absolute', left: 12, top: 12, color: '#94a3b8' }}
          />
          <input
            type="text"
            className="form-control"
            placeholder="Tìm kiếm theo tiêu đề, vấn đề..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '2.5rem' }}
          />
        </div>

        <div>
          <select
            className="form-control"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
          >
            <option value="">Tất cả lĩnh vực (Domain)</option>
            {DOMAINS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        <div>
          <select
            className="form-control"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">Tất cả trạng thái</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Projects Grid */}
      {loading ? (
        <div style={{ padding: '4rem', textAlign: 'center', color: '#64748b' }}>
          Đang tải danh sách ý tưởng dự án...
        </div>
      ) : projects.length === 0 ? (
        <div
          className="card"
          style={{ padding: '4rem', textAlign: 'center', color: '#64748b' }}
        >
          <Lightbulb size={48} color="#cbd5e1" style={{ margin: '0 auto 1rem auto' }} />
          <h3>Chưa tìm thấy ý tưởng dự án nào</h3>
          <p style={{ marginTop: '0.5rem' }}>Hãy thử điều chỉnh bộ lọc hoặc đề xuất ý tưởng đầu tiên của bạn!</p>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
            gap: '1.5rem',
          }}
        >
          {projects.map((proj) => {
            const isOwner = user?.id === proj.ownerId;
            return (
              <div
                key={proj.id}
                className="card"
                onClick={() => setSelectedProject(proj)}
                style={{
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  height: '100%',
                }}
              >
                <div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '1rem',
                    }}
                  >
                    <span className="badge badge-domain">{proj.domain}</span>
                    <span className={`badge badge-${proj.status.toLowerCase()}`}>
                      {proj.status}
                    </span>
                  </div>

                  <h3
                    style={{
                      fontSize: '1.15rem',
                      fontWeight: 700,
                      color: 'var(--text-main, #0f172a)',
                      marginBottom: '0.75rem',
                      lineHeight: 1.4,
                    }}
                  >
                    {proj.title}
                  </h3>

                  <div style={{ marginBottom: '0.75rem' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f87171', textTransform: 'uppercase', marginBottom: '0.2rem' }}>
                      Vấn đề (Problem)
                    </div>
                    <p
                      style={{
                        fontSize: '0.875rem',
                        color: 'var(--text-secondary, #475569)',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {proj.problem}
                    </p>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#34d399', textTransform: 'uppercase', marginBottom: '0.2rem' }}>
                      Giải pháp (Solution)
                    </div>
                    <p
                      style={{
                        fontSize: '0.875rem',
                        color: 'var(--text-secondary, #475569)',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {proj.solution}
                    </p>
                  </div>
                </div>

                <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-light, #f1f5f9)' }}>
                  {/* Tags */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.75rem' }}>
                    {proj.tags.map((t) => (
                      <span key={t} className="badge badge-tag">
                        #{t}
                      </span>
                    ))}
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '0.75rem',
                      color: 'var(--text-muted, #94a3b8)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Calendar size={14} />
                      {new Date(proj.createdAt).toLocaleDateString('vi-VN')}
                    </div>

                    {isOwner && (
                      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                        <button
                          onClick={(e) => handleOpenEdit(proj, e)}
                          title="Chỉnh sửa ý tưởng"
                          style={{
                            color: '#f26f21',
                            padding: '0.35rem 0.5rem',
                            borderRadius: 6,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            background: 'rgba(242, 111, 33, 0.1)',
                            border: '1px solid rgba(242, 111, 33, 0.25)',
                            cursor: 'pointer',
                          }}
                        >
                          <Edit3 size={13} />
                          Sửa
                        </button>
                        <button
                          onClick={(e) => handleDelete(proj.id, e)}
                          title="Xóa ý tưởng"
                          style={{
                            color: '#ef4444',
                            padding: '0.35rem 0.5rem',
                            borderRadius: 6,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.25)',
                            cursor: 'pointer',
                          }}
                        >
                          <Trash2 size={13} />
                          Xóa
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '2.5rem' }}>
          <button
            className="btn btn-secondary btn-sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Trang trước
          </button>
          <span style={{ alignSelf: 'center', fontSize: '0.875rem', color: '#64748b' }}>
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

      {/* Modal Tạo mới / Chỉnh sửa Ý tưởng */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => { setIsModalOpen(false); resetForm(); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div
              style={{
                padding: '1.5rem',
                borderBottom: '1px solid var(--border-light, #f1f5f9)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>
                {editingProject ? 'Chỉnh sửa Ý tưởng Dự án EXE' : 'Đề xuất Ý tưởng Dự án EXE'}
              </h2>
              <button onClick={() => { setIsModalOpen(false); resetForm(); }} style={{ color: 'var(--text-muted, #94a3b8)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveProject} style={{ padding: '1.5rem' }}>
              <div className="form-group">
                <label className="form-label">Tên ý tưởng dự án *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="VD: EdTech Assistant — Nền tảng hỗ trợ sinh viên..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: editingProject ? '1fr 1fr' : '1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Lĩnh vực (Domain) *</label>
                  <select
                    className="form-control"
                    value={selectedDomain}
                    onChange={(e) => setSelectedDomain(e.target.value as ProjectDomain)}
                  >
                    {DOMAINS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                {editingProject && (
                  <div className="form-group">
                    <label className="form-label">Trạng thái (Status) *</label>
                    <select
                      className="form-control"
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value as ProjectStatus)}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Vấn đề thực tế đang gặp phải (Problem) *</label>
                <textarea
                  className="form-control"
                  rows={3}
                  placeholder="Mô tả cụ thể khó khăn hoặc khoảng trống thị trường mà dự án muốn giải quyết..."
                  value={problem}
                  onChange={(e) => setProblem(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Giải pháp đề xuất (Solution) *</label>
                <textarea
                  className="form-control"
                  rows={3}
                  placeholder="Giải pháp công nghệ/kinh doanh để giải quyết triệt để vấn đề trên..."
                  value={solution}
                  onChange={(e) => setSolution(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Từ khóa / Tags (Phân cách bằng dấu phẩy)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="AI, React, Mobile, FinTech, Marketing"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                />
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '0.75rem',
                  marginTop: '1.5rem',
                  paddingTop: '1rem',
                  borderTop: '1px solid var(--border-light, #f1f5f9)',
                }}
              >
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => { setIsModalOpen(false); resetForm(); }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  {submitting ? 'Đang lưu...' : editingProject ? 'Lưu thay đổi' : 'Công bố ý tưởng'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Chi tiết Dự án */}
      {selectedProject && (
        <div className="modal-overlay" onClick={() => setSelectedProject(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div
              style={{
                padding: '1.5rem',
                borderBottom: '1px solid var(--border-light, #f1f5f9)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <span className="badge badge-domain" style={{ marginRight: '0.5rem' }}>
                  {selectedProject.domain}
                </span>
                <span className={`badge badge-${selectedProject.status.toLowerCase()}`}>
                  {selectedProject.status}
                </span>
              </div>
              <button onClick={() => setSelectedProject(null)} style={{ color: 'var(--text-muted, #94a3b8)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '1.5rem' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main, #0f172a)', marginBottom: '1rem' }}>
                {selectedProject.title}
              </h2>

              <div style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ fontSize: '0.8rem', fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                  Vấn đề thực tế (Problem Statement)
                </h4>
                <div
                  style={{
                    background: 'rgba(239, 68, 68, 0.08)',
                    padding: '1rem',
                    borderRadius: 8,
                    color: 'var(--text-main, #334155)',
                    fontSize: '0.925rem',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    lineHeight: 1.6,
                  }}
                >
                  {selectedProject.problem}
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ fontSize: '0.8rem', fontWeight: 700, color: '#10b981', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                  Giải pháp đề xuất (Solution Statement)
                </h4>
                <div
                  style={{
                    background: 'rgba(16, 185, 129, 0.08)',
                    padding: '1rem',
                    borderRadius: 8,
                    color: 'var(--text-main, #334155)',
                    fontSize: '0.925rem',
                    border: '1px solid rgba(16, 185, 129, 0.25)',
                    lineHeight: 1.6,
                  }}
                >
                  {selectedProject.solution}
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted, #64748b)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                  Tags / Lĩnh vực liên quan
                </h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {selectedProject.tags.map((t) => (
                    <span key={t} className="badge badge-tag" style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem' }}>
                      #{t}
                    </span>
                  ))}
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingTop: '1rem',
                  borderTop: '1px solid var(--border-light, #f1f5f9)',
                  fontSize: '0.8rem',
                  color: 'var(--text-muted, #94a3b8)',
                }}
              >
                <div>Ngày tạo: {new Date(selectedProject.createdAt).toLocaleString('vi-VN')}</div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {user?.id === selectedProject.ownerId && (
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        const proj = selectedProject;
                        setSelectedProject(null);
                        handleOpenEdit(proj);
                      }}
                      style={{ color: '#f26f21', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                    >
                      <Edit3 size={14} />
                      Chỉnh sửa
                    </button>
                  )}
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => {
                      alert('Chức năng liên kết nhóm: Group Service sẽ kết nối tới ý tưởng dự án này!');
                    }}
                  >
                    Tạo nhóm cho dự án này
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
