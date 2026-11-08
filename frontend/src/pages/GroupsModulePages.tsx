import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import { groupsApi } from '../api/groups';
import { useAuth } from '../contexts/AuthContext';
import type {
  GroupResponse,
  GroupSummaryResponse,
  CreateGroupRequest,
  UpdateGroupRequest,
  CreateSlotRequest,
  RecruitmentSlotResponse,
  JoinRequestResponse,
  InvitationResponse,
  MatchScoreResponse,
  SuggestedGroupResponse,
  RankedCandidateResponse,
  CandidateProfileResponse,
  ProjectItem,
  PagedResult,
  SkillResponse,
  Major,
  ProjectDomain,
} from '../types';
import {
  Compass,
  Users,
  Sparkles,
  Plus,
  Search,
  RefreshCw,
  Check,
  X,
  Crown,
  UserMinus,
  LogOut,
  Trash2,
  Edit3,
  Send,
  Mail,
  AlertCircle,
  CheckCircle2,
  Clock,
  Briefcase,
  Layers,
  Award,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const MAJOR_LIST: { value: Major; label: string }[] = [
  { value: 'SE', label: 'SE - Kỹ thuật phần mềm' },
  { value: 'AI', label: 'AI - Trí tuệ nhân tạo' },
  { value: 'IA', label: 'IA - An toàn thông tin' },
  { value: 'GD', label: 'GD - Thiết kế đồ họa' },
  { value: 'MKT', label: 'MKT - Digital Marketing' },
  { value: 'IB', label: 'IB - Kinh doanh quốc tế' },
  { value: 'Other', label: 'Other - Khác' },
];

const DOMAIN_LIST: { value: ProjectDomain; label: string }[] = [
  { value: 'EdTech', label: 'EdTech (Giáo dục)' },
  { value: 'FinTech', label: 'FinTech (Tài chính)' },
  { value: 'ECommerce', label: 'E-Commerce (Thương mại)' },
  { value: 'FnB', label: 'F&B (Ẩm thực)' },
  { value: 'Health', label: 'HealthTech (Y tế)' },
  { value: 'Tourism', label: 'Tourism (Du lịch)' },
  { value: 'Other', label: 'Other (Khác)' },
];

function formatDateTime(iso?: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function getScoreBadgeStyle(score: number): React.CSSProperties {
  if (score >= 70) {
    return {
      background: '#dcfce7',
      color: '#15803d',
      border: '1px solid #86efac',
      padding: '0.25rem 0.65rem',
      borderRadius: 9999,
      fontWeight: 700,
      fontSize: '0.78rem',
    };
  }
  if (score >= 40) {
    return {
      background: '#fef3c7',
      color: '#b45309',
      border: '1px solid #fcd34d',
      padding: '0.25rem 0.65rem',
      borderRadius: 9999,
      fontWeight: 700,
      fontSize: '0.78rem',
    };
  }
  return {
    background: '#f1f5f9',
    color: '#475569',
    border: '1px solid #cbd5e1',
    padding: '0.25rem 0.65rem',
    borderRadius: 9999,
    fontWeight: 700,
    fontSize: '0.78rem',
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// 1. GROUPS PAGE (/groups) — Khám phá Nhóm + Gợi ý AI/gRPC + Tạo Nhóm
// ══════════════════════════════════════════════════════════════════════════════
export const GroupsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'browse' | 'suggestions'>('browse');
  const [groups, setGroups] = useState<GroupSummaryResponse[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('Recruiting');
  const [domainFilter, setDomainFilter] = useState<string>('');
  const [majorFilter, setMajorFilter] = useState<string>('');

  const [suggestions, setSuggestions] = useState<SuggestedGroupResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Detail modal state
  const [selectedGroup, setSelectedGroup] = useState<GroupResponse | null>(null);
  const [selectedGroupScore, setSelectedGroupScore] = useState<MatchScoreResponse | null>(null);
  const [selectedGroupProject, setSelectedGroupProject] = useState<ProjectItem | null>(null);
  const [memberProfiles, setMemberProfiles] = useState<Record<string, CandidateProfileResponse>>({});
  const [detailLoading, setDetailLoading] = useState(false);

  // Join Request form inside detail modal
  const [joinSlotId, setJoinSlotId] = useState<string>('');
  const [joinMessage, setJoinMessage] = useState<string>('');
  const [joinSubmitting, setJoinSubmitting] = useState(false);

  // Create Group modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [myProjects, setMyProjects] = useState<ProjectItem[]>([]);
  const [systemSkills, setSystemSkills] = useState<SkillResponse[]>([]);
  const [createName, setCreateName] = useState('');
  const [createDesc, setCreateDesc] = useState('');
  const [createProjectId, setCreateProjectId] = useState('');
  const [createMaxMembers, setCreateMaxMembers] = useState(5);
  const [createSlots, setCreateSlots] = useState<CreateSlotRequest[]>([
    { roleName: 'Backend Developer', major: 'SE', requiredSkills: ['C# / .NET'], quantity: 1 },
  ]);
  const [creatingGroup, setCreatingGroup] = useState(false);

  const loadBrowseGroups = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await groupsApi.getGroups({
        search: search.trim() || undefined,
        status: statusFilter || undefined,
        domain: domainFilter || undefined,
        major: majorFilter || undefined,
        page,
        pageSize: 9,
      });
      setGroups(res.items || []);
      setTotalCount(res.totalCount || 0);
      setTotalPages(Math.max(1, res.totalPages || 1));
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Không thể tải danh sách nhóm đề tài.');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, domainFilter, majorFilter, page]);

  const loadSuggestedGroups = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await groupsApi.getSuggestedGroups(10);
      setSuggestions(res || []);
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
          'Không thể tải gợi ý nhóm từ Matching Service (gRPC).'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'browse') {
      void loadBrowseGroups();
    } else {
      void loadSuggestedGroups();
    }
  }, [activeTab, loadBrowseGroups, loadSuggestedGroups]);

  // Open Group Detail modal + fetch Match Score + Member Profiles + Project
  const handleOpenGroupDetail = async (groupId: string) => {
    setDetailLoading(true);
    setSelectedGroup(null);
    setSelectedGroupScore(null);
    setSelectedGroupProject(null);
    setJoinSlotId('');
    setJoinMessage('');
    try {
      const detail = await groupsApi.getGroupById(groupId);
      setSelectedGroup(detail);
      if (detail.slots && detail.slots.length > 0) {
        setJoinSlotId(detail.slots[0].id);
      }

      // Fetch match score if student
      if (user?.role === 'Student') {
        groupsApi
          .getMatchScore(groupId)
          .then((sc) => setSelectedGroupScore(sc))
          .catch(() => null);
      }

      // Fetch project details if linked
      if (detail.projectId) {
        apiClient
          .get<ProjectItem>(`/projects/${detail.projectId}`)
          .then((r) => setSelectedGroupProject(r.data))
          .catch(() => null);
      }

      // Batch fetch member profiles
      const uids = detail.members.map((m) => m.userId);
      if (uids.length > 0) {
        apiClient
          .post<CandidateProfileResponse[]>('/users/batch', { userIds: uids })
          .then((r) => {
            const map: Record<string, CandidateProfileResponse> = {};
            (r.data || []).forEach((p) => {
              map[p.userId] = p;
            });
            setMemberProfiles(map);
          })
          .catch(() => null);
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Không thể tải chi tiết nhóm.');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleSubmitJoinRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroup) return;
    setJoinSubmitting(true);
    setError(null);
    try {
      await groupsApi.createJoinRequest(selectedGroup.id, {
        slotId: joinSlotId || null,
        message: joinMessage.trim() || undefined,
      });
      setFeedback(`Đã gửi đơn xin gia nhập nhóm "${selectedGroup.name}" thành công!`);
      setSelectedGroup(null);
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
          err?.response?.data?.title ||
          'Không thể gửi yêu cầu gia nhập nhóm.'
      );
    } finally {
      setJoinSubmitting(false);
    }
  };

  const handleOpenCreateModal = async () => {
    setShowCreateModal(true);
    try {
      const [projRes, skillRes] = await Promise.all([
        apiClient.get<PagedResult<ProjectItem>>('/projects', {
          params: { ownerId: user?.id, pageSize: 50 },
        }),
        apiClient.get<SkillResponse[]>('/skills'),
      ]);
      setMyProjects(projRes.data?.items || []);
      setSystemSkills(skillRes.data || []);
    } catch {
      // ignore optional preload failure
    }
  };

  const handleCreateGroupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createName.trim()) return;
    setCreatingGroup(true);
    setError(null);
    try {
      const payload: CreateGroupRequest = {
        name: createName.trim(),
        description: createDesc.trim() || undefined,
        projectId: createProjectId || null,
        maxMembers: createMaxMembers,
        slots: createSlots.filter((s) => s.roleName.trim().length > 0),
      };
      await groupsApi.createGroup(payload);
      setShowCreateModal(false);
      navigate('/my-group');
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
          err?.response?.data?.title ||
          'Không thể tạo nhóm mới (Bạn có thể đã thuộc một nhóm khác).'
      );
    } finally {
      setCreatingGroup(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.75rem',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>
            Khám phá Nhóm Đề tài EXE
          </h1>
          <p style={{ color: 'var(--text-muted, #64748b)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Tìm kiếm nhóm đang tuyển thành viên hoặc xem gợi ý nhóm tương thích từ Matching Service (gRPC)
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          <button
            className="btn btn-secondary"
            onClick={() =>
              activeTab === 'browse' ? void loadBrowseGroups() : void loadSuggestedGroups()
            }
          >
            <RefreshCw size={16} />
            Làm mới
          </button>
          {user?.role === 'Student' && (
            <button className="btn btn-primary" onClick={() => void handleOpenCreateModal()}>
              <Plus size={18} />
              Thành lập Nhóm mới
            </button>
          )}
        </div>
      </div>

      {/* Alerts */}
      {feedback && (
        <div
          className="card"
          style={{
            marginBottom: '1.25rem',
            padding: '0.9rem 1.15rem',
            borderLeft: '4px solid #10b981',
            background: '#ecfdf5',
            color: '#065f46',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircle2 size={18} />
            {feedback}
          </span>
          <button onClick={() => setFeedback(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={16} />
          </button>
        </div>
      )}

      {error && (
        <div
          className="card"
          style={{
            marginBottom: '1.25rem',
            padding: '0.9rem 1.15rem',
            borderLeft: '4px solid #ef4444',
            background: '#fef2f2',
            color: '#991b1b',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={18} />
            {error}
          </span>
          <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Mode Tabs */}
      <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '1.25rem' }}>
        <button
          className={activeTab === 'browse' ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'}
          onClick={() => setActiveTab('browse')}
        >
          <Compass size={16} />
          Danh sách Nhóm ({totalCount})
        </button>
        {user?.role === 'Student' && (
          <button
            className={activeTab === 'suggestions' ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'}
            onClick={() => setActiveTab('suggestions')}
          >
            <Sparkles size={16} />
            Gợi ý Nhóm phù hợp (Matching gRPC)
          </button>
        )}
      </div>

      {/* Filters for Browse tab */}
      {activeTab === 'browse' && (
        <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '0.85rem',
            }}
          >
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: '#94a3b8' }} />
              <input
                type="text"
                className="form-control"
                placeholder="Tìm theo tên nhóm, mô tả..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                style={{ paddingLeft: '2.2rem' }}
              />
            </div>

            <select
              className="form-control"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Tất cả trạng thái</option>
              <option value="Recruiting">Đang tuyển (Recruiting)</option>
              <option value="Full">Đã đủ quân số (Full)</option>
              <option value="Locked">Đã khóa (Locked)</option>
            </select>

            <select
              className="form-control"
              value={majorFilter}
              onChange={(e) => {
                setMajorFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Tất cả chuyên ngành cần tuyển</option>
              {MAJOR_LIST.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>

            <select
              className="form-control"
              value={domainFilter}
              onChange={(e) => {
                setDomainFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Tất cả lĩnh vực đề tài</option>
              {DOMAIN_LIST.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          Đang tải dữ liệu nhóm...
        </div>
      ) : activeTab === 'browse' ? (
        groups.length === 0 ? (
          <div className="card" style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Compass size={42} style={{ margin: '0 auto 0.75rem auto', color: '#94a3b8' }} />
            <h3 style={{ color: 'var(--text-main)', fontSize: '1.15rem', fontWeight: 700 }}>
              Không tìm thấy nhóm đề tài nào
            </h3>
            <p style={{ marginTop: '0.35rem' }}>
              Hãy thử đổi bộ lọc hoặc nhấn &quot;Thành lập Nhóm mới&quot; để khởi tạo nhóm đầu tiên!
            </p>
          </div>
        ) : (
          <>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
                gap: '1.25rem',
              }}
            >
              {groups.map((g) => (
                <div
                  key={g.id}
                  className="card"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                  }}
                  onClick={() => void handleOpenGroupDetail(g.id)}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                        {g.name}
                      </h3>
                      <span
                        className="badge"
                        style={{
                          background: g.status === 'Recruiting' ? '#dcfce7' : '#f1f5f9',
                          color: g.status === 'Recruiting' ? '#15803d' : '#475569',
                        }}
                      >
                        {g.status} ({g.memberCount}/{g.maxMembers})
                      </span>
                    </div>

                    <p
                      style={{
                        fontSize: '0.875rem',
                        color: 'var(--text-muted)',
                        marginTop: '0.5rem',
                        marginBottom: '0.85rem',
                      }}
                    >
                      {g.description || 'Nhóm chưa cập nhật mô tả chi tiết.'}
                    </p>

                    {g.slots && g.slots.length > 0 && (
                      <div style={{ marginBottom: '0.85rem' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: '0.35rem' }}>
                          VỊ TRÍ ĐANG TUYỂN ({g.slots.length}):
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                          {g.slots.map((s) => (
                            <span
                              key={s.id}
                              style={{
                                fontSize: '0.75rem',
                                padding: '0.2rem 0.55rem',
                                borderRadius: 6,
                                background: '#fff7ed',
                                color: '#c2410c',
                                border: '1px solid #fed7aa',
                                fontWeight: 600,
                              }}
                            >
                              {s.roleName} ({s.major} • x{s.quantity})
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div
                    style={{
                      borderTop: '1px solid #f1f5f9',
                      paddingTop: '0.75rem',
                      marginTop: '0.5rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '0.8rem',
                      color: '#64748b',
                    }}
                  >
                    <span>Tạo ngày {formatDateTime(g.createdAt)}</span>
                    <span style={{ color: '#f26f21', fontWeight: 700 }}>Chi tiết & Xin vào →</span>
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1.75rem' }}>
                <button
                  className="btn btn-secondary btn-sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft size={15} /> Trước
                </button>
                <span style={{ alignSelf: 'center', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                  Trang {page} / {totalPages}
                </span>
                <button
                  className="btn btn-secondary btn-sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Sau <ChevronRight size={15} />
                </button>
              </div>
            )}
          </>
        )
      ) : suggestions.length === 0 ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <Sparkles size={40} style={{ margin: '0 auto 0.75rem auto', color: '#f26f21' }} />
          <h3 style={{ color: 'var(--text-main)', fontSize: '1.15rem', fontWeight: 700 }}>
            Chưa có gợi ý nhóm phù hợp
          </h3>
          <p style={{ marginTop: '0.35rem' }}>
            Hãy cập nhật Chuyên ngành và Kỹ năng trong Hồ sơ cá nhân của bạn để hệ thống tính điểm tương thích chính xác hơn.
          </p>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
            gap: '1.25rem',
          }}
        >
          {suggestions.map((item) => (
            <div
              key={item.group.id}
              className="card"
              style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
              onClick={() => void handleOpenGroupDetail(item.group.id)}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    {item.group.name}
                  </h3>
                  <span style={getScoreBadgeStyle(item.score)}>
                    Tương thích: {item.score.toFixed(0)}%
                  </span>
                </div>

                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                  {item.group.description || 'Nhóm đang tuyển thành viên.'}
                </p>

                {item.matchedSkills.length > 0 && (
                  <div style={{ marginBottom: '0.5rem', fontSize: '0.78rem' }}>
                    <strong style={{ color: '#15803d' }}>Kỹ năng khớp: </strong>
                    {item.matchedSkills.join(', ')}
                  </div>
                )}
                {item.missingSkills.length > 0 && (
                  <div style={{ marginBottom: '0.5rem', fontSize: '0.78rem' }}>
                    <strong style={{ color: '#b45309' }}>Kỹ năng nhóm cần thêm: </strong>
                    {item.missingSkills.join(', ')}
                  </div>
                )}
              </div>

              <div
                style={{
                  borderTop: '1px solid #f1f5f9',
                  paddingTop: '0.75rem',
                  marginTop: '0.5rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '0.8rem',
                }}
              >
                <span>
                  Thành viên: {item.group.memberCount}/{item.group.maxMembers}
                </span>
                <span style={{ color: '#f26f21', fontWeight: 700 }}>Xem & Ứng tuyển →</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── MODAL CHI TIẾT NHÓM & GỬI JOIN REQUEST ────────────────────────── */}
      {(detailLoading || selectedGroup) && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
          onClick={() => setSelectedGroup(null)}
        >
          <div
            className="card"
            style={{ maxWidth: 680, width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '1.75rem' }}
            onClick={(e) => e.stopPropagation()}
          >
            {detailLoading || !selectedGroup ? (
              <div style={{ padding: '2rem', textAlign: 'center' }}>Đang tải thông tin nhóm...</div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)' }}>
                      {selectedGroup.name}
                    </h2>
                    <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginTop: 4 }}>
                      Trạng thái: <strong>{selectedGroup.status}</strong> • Quân số:{' '}
                      <strong>
                        {selectedGroup.members.length}/{selectedGroup.maxMembers}
                      </strong>
                    </div>
                  </div>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => setSelectedGroup(null)}
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Live gRPC Match Score Banner */}
                {selectedGroupScore && (
                  <div
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: 12,
                      padding: '0.9rem 1.1rem',
                      marginBottom: '1.15rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontWeight: 700, fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Award size={16} color="#f26f21" />
                        Điểm tương thích hồ sơ của bạn (Matching gRPC):
                      </span>
                      <span style={getScoreBadgeStyle(selectedGroupScore.score)}>
                        {selectedGroupScore.score.toFixed(1)}%
                      </span>
                    </div>
                    {selectedGroupScore.matchedSkills.length > 0 && (
                      <div style={{ fontSize: '0.8rem', color: '#15803d' }}>
                        ✓ Kỹ năng phù hợp: {selectedGroupScore.matchedSkills.join(', ')}
                      </div>
                    )}
                    {selectedGroupScore.missingSkills.length > 0 && (
                      <div style={{ fontSize: '0.8rem', color: '#b45309', marginTop: 2 }}>
                        • Kỹ năng còn thiếu: {selectedGroupScore.missingSkills.join(', ')}
                      </div>
                    )}
                  </div>
                )}

                <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: 1.55 }}>
                  {selectedGroup.description || 'Chưa có mô tả chi tiết.'}
                </p>

                {selectedGroupProject && (
                  <div
                    style={{
                      background: '#eff6ff',
                      border: '1px solid #bfdbfe',
                      borderRadius: 10,
                      padding: '0.85rem 1rem',
                      marginBottom: '1.15rem',
                    }}
                  >
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#1d4ed8' }}>
                      ĐỀ TÀI DỰ ÁN LIÊN KẾT ({selectedGroupProject.domain})
                    </div>
                    <div style={{ fontWeight: 700, color: '#0f172a', marginTop: 2 }}>
                      {selectedGroupProject.title}
                    </div>
                    <div style={{ fontSize: '0.82rem', color: '#334155', marginTop: 4 }}>
                      {selectedGroupProject.problem}
                    </div>
                  </div>
                )}

                {/* Members */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                    Thành viên hiện tại ({selectedGroup.members.length}/{selectedGroup.maxMembers})
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                    {selectedGroup.members.map((m) => {
                      const prof = memberProfiles[m.userId];
                      return (
                        <div
                          key={m.id}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '0.55rem 0.85rem',
                            borderRadius: 8,
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            fontSize: '0.85rem',
                          }}
                        >
                          <div>
                            <strong>{prof?.fullName || `Sinh viên (${m.userId.slice(0, 8)})`}</strong>
                            {prof?.major && (
                              <span style={{ marginLeft: 8, color: '#f26f21', fontWeight: 600 }}>
                                [{prof.major}]
                              </span>
                            )}
                          </div>
                          <span className="badge badge-domain">{m.role}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Join Request Form */}
                {user?.role === 'Student' &&
                  selectedGroup.status === 'Recruiting' &&
                  !selectedGroup.members.some((m) => m.userId === user.id) && (
                    <form
                      onSubmit={(e) => void handleSubmitJoinRequest(e)}
                      style={{
                        borderTop: '1px solid #e2e8f0',
                        paddingTop: '1.15rem',
                        marginTop: '1rem',
                      }}
                    >
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.75rem' }}>
                        Ứng tuyển vào nhóm này
                      </h4>

                      {selectedGroup.slots.length > 0 && (
                        <div style={{ marginBottom: '0.75rem' }}>
                          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>
                            Chọn vị trí ứng tuyển:
                          </label>
                          <select
                            className="form-control"
                            value={joinSlotId}
                            onChange={(e) => setJoinSlotId(e.target.value)}
                          >
                            <option value="">-- Ứng tuyển chung vào nhóm --</option>
                            {selectedGroup.slots.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.roleName} — Ngành {s.major} (Cần: {s.requiredSkills.join(', ') || 'Linh hoạt'})
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      <div style={{ marginBottom: '0.85rem' }}>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>
                          Lời nhắn gửi Trưởng nhóm:
                        </label>
                        <textarea
                          className="form-control"
                          rows={3}
                          placeholder="Giới thiệu ngắn gọn kinh nghiệm, kỹ năng và mong muốn đóng góp của bạn..."
                          value={joinMessage}
                          onChange={(e) => setJoinMessage(e.target.value)}
                        />
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem' }}>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => setSelectedGroup(null)}
                        >
                          Đóng
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={joinSubmitting}>
                          <Send size={15} />
                          {joinSubmitting ? 'Đang gửi...' : 'Gửi yêu cầu tham gia'}
                        </button>
                      </div>
                    </form>
                  )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL THÀNH LẬP NHÓM MỚI (POST /api/groups) ────────────────────── */}
      {showCreateModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="card"
            style={{ maxWidth: 640, width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '1.75rem' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800 }}>Thành lập Nhóm Đề tài Mới</h2>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowCreateModal(false)}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={(e) => void handleCreateGroupSubmit(e)}>
              <div style={{ marginBottom: '0.9rem' }}>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, marginBottom: 4 }}>
                  Tên nhóm khởi nghiệp *
                </label>
                <input
                  type="text"
                  className="form-control"
                  required
                  placeholder="VD: EduSpark Team - Nền tảng học tập AI"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.85rem', marginBottom: '0.9rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, marginBottom: 4 }}>
                    Liên kết Ý tưởng Dự án của bạn (Tùy chọn)
                  </label>
                  <select
                    className="form-control"
                    value={createProjectId}
                    onChange={(e) => setCreateProjectId(e.target.value)}
                  >
                    <option value="">-- Chưa chọn đề tài --</option>
                    {myProjects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title} ({p.domain})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, marginBottom: 4 }}>
                    Số thành viên tối đa (4–6)
                  </label>
                  <input
                    type="number"
                    className="form-control"
                    min={4}
                    max={6}
                    value={createMaxMembers}
                    onChange={(e) => setCreateMaxMembers(Number(e.target.value))}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, marginBottom: 4 }}>
                  Mô tả mục tiêu & định hướng của nhóm
                </label>
                <textarea
                  className="form-control"
                  rows={3}
                  placeholder="Mô tả ngắn gọn mục tiêu nhóm, văn hóa làm việc và kỳ vọng môn EXE..."
                  value={createDesc}
                  onChange={(e) => setCreateDesc(e.target.value)}
                />
              </div>

              {/* Recruitment Slots */}
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                    Vị trí cần tuyển (Recruitment Slots — Phục vụ đa ngành BR-04)
                  </label>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() =>
                      setCreateSlots((prev) => [
                        ...prev,
                        { roleName: '', major: 'GD', requiredSkills: [], quantity: 1 },
                      ])
                    }
                  >
                    <Plus size={14} /> Thêm vị trí
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {createSlots.map((slot, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '0.75rem',
                        borderRadius: 10,
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        display: 'grid',
                        gridTemplateColumns: '2fr 1.2fr 1.8fr auto',
                        gap: '0.5rem',
                        alignItems: 'center',
                      }}
                    >
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Tên vị trí (VD: UI/UX Designer)"
                        value={slot.roleName}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCreateSlots((prev) =>
                            prev.map((s, i) => (i === idx ? { ...s, roleName: val } : s))
                          );
                        }}
                      />
                      <select
                        className="form-control"
                        value={slot.major}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCreateSlots((prev) =>
                            prev.map((s, i) => (i === idx ? { ...s, major: val } : s))
                          );
                        }}
                      >
                        {MAJOR_LIST.map((m) => (
                          <option key={m.value} value={m.value}>
                            {m.value}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        className="form-control"
                        list="system-skills-datalist"
                        placeholder="Kỹ năng (phân cách dấu phẩy)"
                        value={(slot.requiredSkills || []).join(', ')}
                        onChange={(e) => {
                          const skills = e.target.value
                            .split(',')
                            .map((x) => x.trim())
                            .filter(Boolean);
                          setCreateSlots((prev) =>
                            prev.map((s, i) => (i === idx ? { ...s, requiredSkills: skills } : s))
                          );
                        }}
                      />
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => setCreateSlots((prev) => prev.filter((_, i) => i !== idx))}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  <datalist id="system-skills-datalist">
                    {systemSkills.map((sk) => (
                      <option key={sk.id} value={sk.name} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowCreateModal(false)}
                >
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary" disabled={creatingGroup}>
                  {creatingGroup ? 'Đang khởi tạo...' : 'Xác nhận Tạo Nhóm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// 2. MY GROUP PAGE (/my-group) — Quản lý Nhóm, Vị trí Tuyển, Duyệt Đơn & Gợi ý Ứng viên gRPC
// ══════════════════════════════════════════════════════════════════════════════
export const MyGroupPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [group, setGroup] = useState<GroupResponse | null>(null);
  const [memberProfiles, setMemberProfiles] = useState<Record<string, CandidateProfileResponse>>({});
  const [joinRequests, setJoinRequests] = useState<JoinRequestResponse[]>([]);
  const [applicantProfiles, setApplicantProfiles] = useState<Record<string, CandidateProfileResponse>>({});
  const [candidates, setCandidates] = useState<RankedCandidateResponse[]>([]);
  const [myProjects, setMyProjects] = useState<ProjectItem[]>([]);

  const [activeTab, setActiveTab] = useState<'members' | 'slots' | 'requests' | 'candidates'>('members');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Edit Group state
  const [showEditGroup, setShowEditGroup] = useState(false);
  const [editForm, setEditForm] = useState<UpdateGroupRequest>({
    name: '',
    description: '',
    projectId: null,
    maxMembers: 5,
    status: 'Recruiting',
  });

  // Add/Edit Slot state
  const [editingSlot, setEditingSlot] = useState<RecruitmentSlotResponse | null>(null);
  const [slotRoleName, setSlotRoleName] = useState('');
  const [slotMajor, setSlotMajor] = useState<string>('SE');
  const [slotSkills, setSlotSkills] = useState('');
  const [slotQty, setSlotQty] = useState(1);

  // Invite message modal
  const [invitingCandidate, setInvitingCandidate] = useState<RankedCandidateResponse | null>(null);
  const [inviteMessage, setInviteMessage] = useState('');

  const isLeader = Boolean(group && user && group.leaderId === user.id);

  const loadMyGroupData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const myGrp = await groupsApi.getMyGroup();
      setGroup(myGrp);
      if (!myGrp) {
        return;
      }

      setEditForm({
        name: myGrp.name,
        description: myGrp.description || '',
        projectId: myGrp.projectId || null,
        maxMembers: myGrp.maxMembers,
        status: myGrp.status,
      });

      // Enrich member profiles
      const memberIds = myGrp.members.map((m) => m.userId);
      if (memberIds.length > 0) {
        apiClient
          .post<CandidateProfileResponse[]>('/users/batch', { userIds: memberIds })
          .then((res) => {
            const map: Record<string, CandidateProfileResponse> = {};
            (res.data || []).forEach((p) => {
              map[p.userId] = p;
            });
            setMemberProfiles(map);
          })
          .catch(() => null);
      }

      // If current user is leader, load join requests, ranked candidates, and projects
      if (user && myGrp.leaderId === user.id) {
        const [reqRes, candRes, projRes] = await Promise.all([
          groupsApi.getGroupJoinRequests(myGrp.id, { page: 1, pageSize: 30 }).catch(() => null),
          groupsApi.getRankedCandidates(myGrp.id, 10).catch(() => []),
          apiClient
            .get<PagedResult<ProjectItem>>('/projects', {
              params: { ownerId: user.id, pageSize: 50 },
            })
            .catch(() => null),
        ]);

        const reqItems = reqRes?.items || [];
        setJoinRequests(reqItems);
        setCandidates(candRes || []);
        setMyProjects(projRes?.data?.items || []);

        const applicantIds = reqItems.map((r) => r.userId);
        if (applicantIds.length > 0) {
          apiClient
            .post<CandidateProfileResponse[]>('/users/batch', { userIds: applicantIds })
            .then((r) => {
              const map: Record<string, CandidateProfileResponse> = {};
              (r.data || []).forEach((p) => {
                map[p.userId] = p;
              });
              setApplicantProfiles(map);
            })
            .catch(() => null);
        }
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Không thể tải thông tin nhóm của bạn.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadMyGroupData();
  }, [loadMyGroupData]);

  const handleUpdateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!group) return;
    try {
      await groupsApi.updateGroup(group.id, editForm);
      setShowEditGroup(false);
      setFeedback('Đã cập nhật thông tin nhóm thành công!');
      await loadMyGroupData();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Không thể cập nhật thông tin nhóm.');
    }
  };

  const handleLeaveGroup = async () => {
    if (!group || !window.confirm('Bạn có chắc chắn muốn rời khỏi nhóm này?')) return;
    try {
      await groupsApi.leaveGroup(group.id);
      setGroup(null);
      setFeedback('Bạn đã rời nhóm thành công.');
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
          'Không thể rời nhóm (Trưởng nhóm cần chuyển quyền Leader trước khi rời nhóm).'
      );
    }
  };

  const handleDisbandGroup = async () => {
    if (!group || !window.confirm(`Giải tán nhóm "${group.name}"? Hành động này không thể hoàn tác.`))
      return;
    try {
      await groupsApi.disbandGroup(group.id);
      setGroup(null);
      setFeedback('Đã giải tán nhóm thành công.');
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Không thể giải tán nhóm.');
    }
  };

  const handleTransferLeader = async (newLeaderId: string) => {
    if (!group || !window.confirm('Chuyển quyền Trưởng nhóm cho thành viên này?')) return;
    try {
      await groupsApi.transferLeadership(group.id, { newLeaderId });
      setFeedback('Đã chuyển quyền Trưởng nhóm thành công!');
      await loadMyGroupData();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Không thể chuyển quyền Trưởng nhóm.');
    }
  };

  const handleRemoveMember = async (memberUserId: string) => {
    if (!group || !window.confirm('Xóa thành viên này khỏi nhóm?')) return;
    try {
      await groupsApi.removeMember(group.id, memberUserId);
      setFeedback('Đã xóa thành viên khỏi nhóm.');
      await loadMyGroupData();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Không thể xóa thành viên.');
    }
  };

  const handleSaveSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!group || !slotRoleName.trim()) return;
    const skills = slotSkills
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    try {
      if (editingSlot) {
        await groupsApi.updateSlot(group.id, editingSlot.id, {
          roleName: slotRoleName.trim(),
          major: slotMajor,
          requiredSkills: skills,
          quantity: slotQty,
        });
        setFeedback('Đã cập nhật vị trí tuyển dụng.');
      } else {
        await groupsApi.addSlot(group.id, {
          roleName: slotRoleName.trim(),
          major: slotMajor,
          requiredSkills: skills,
          quantity: slotQty,
        });
        setFeedback('Đã thêm vị trí tuyển dụng mới.');
      }
      setEditingSlot(null);
      setSlotRoleName('');
      setSlotSkills('');
      setSlotQty(1);
      await loadMyGroupData();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Không thể lưu vị trí tuyển dụng.');
    }
  };

  const handleDeleteSlot = async (slotId: string) => {
    if (!group) return;
    try {
      await groupsApi.deleteSlot(group.id, slotId);
      setFeedback('Đã xóa vị trí tuyển dụng.');
      await loadMyGroupData();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Không thể xóa vị trí tuyển dụng.');
    }
  };

  const handleDecideJoinRequest = async (reqId: string, accept: boolean) => {
    try {
      if (accept) {
        await groupsApi.acceptJoinRequest(reqId);
        setFeedback('Đã chấp nhận thành viên mới vào nhóm!');
      } else {
        await groupsApi.rejectJoinRequest(reqId);
        setFeedback('Đã từ chối đơn xin gia nhập.');
      }
      await loadMyGroupData();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Không thể xử lý đơn xin gia nhập.');
    }
  };

  const handleSendInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!group || !invitingCandidate) return;
    try {
      await groupsApi.createInvitation(group.id, {
        invitedUserId: invitingCandidate.userId,
        message: inviteMessage.trim() || undefined,
      });
      setFeedback(`Đã gửi lời mời tham gia nhóm tới "${invitingCandidate.fullName}"!`);
      setInvitingCandidate(null);
      setInviteMessage('');
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Không thể gửi lời mời cho ứng viên này.');
    }
  };

  if (loading) {
    return (
      <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        Đang tải thông tin nhóm của bạn...
      </div>
    );
  }

  if (!group) {
    return (
      <div>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>
            Nhóm Của Tôi
          </h1>
          <p style={{ color: 'var(--text-muted, #64748b)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Quản lý thành viên, vị trí tuyển dụng, duyệt đơn và mời ứng viên (Group Service)
          </p>
        </div>

        <div className="card" style={{ maxWidth: 800, textAlign: 'center', padding: '3.5rem' }}>
          <Users size={44} style={{ margin: '0 auto 1rem auto', color: '#94a3b8' }} />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            Bạn chưa tham gia nhóm đề tài nào
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: 520, margin: '0 auto 1.5rem auto' }}>
            Mỗi sinh viên chỉ thuộc tối đa 1 nhóm đang hoạt động (BR-01). Hãy khám phá các nhóm đang tuyển hoặc thành lập nhóm mới tại trang Khám phá Nhóm.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
            <button className="btn btn-primary" onClick={() => navigate('/groups')}>
              <Compass size={16} /> Khám phá & Thành lập Nhóm
            </button>
            <button className="btn btn-secondary" onClick={() => navigate('/projects')}>
              <Layers size={16} /> Đề xuất Ý tưởng Dự án
            </button>
          </div>
        </div>
      </div>
    );
  }

  const pendingReqCount = joinRequests.filter((r) => r.status === 'Pending').length;

  return (
    <div>
      {/* Group Banner Header */}
      <div
        className="card"
        style={{
          marginBottom: '1.5rem',
          padding: '1.5rem',
          borderLeft: '5px solid #f26f21',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-main)' }}>
                {group.name}
              </h1>
              <span className="badge badge-recruiting">{group.status}</span>
              <span className="badge badge-domain">
                {group.members.length}/{group.maxMembers} thành viên
              </span>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', marginTop: '0.45rem' }}>
              {group.description || 'Chưa có mô tả chi tiết cho nhóm.'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => void loadMyGroupData()}>
              <RefreshCw size={15} /> Làm mới
            </button>
            {isLeader && (
              <>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowEditGroup((v) => !v)}
                >
                  <Edit3 size={15} /> Sửa thông tin
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  style={{ color: '#dc2626' }}
                  onClick={() => void handleDisbandGroup()}
                >
                  <Trash2 size={15} /> Giải tán nhóm
                </button>
              </>
            )}
            {!isLeader && (
              <button
                className="btn btn-secondary btn-sm"
                style={{ color: '#dc2626' }}
                onClick={() => void handleLeaveGroup()}
              >
                <LogOut size={15} /> Rời nhóm
              </button>
            )}
          </div>
        </div>

        {/* Inline Edit Group Form */}
        {showEditGroup && isLeader && (
          <form
            onSubmit={(e) => void handleUpdateGroup(e)}
            style={{
              marginTop: '1.25rem',
              paddingTop: '1.25rem',
              borderTop: '1px solid #e2e8f0',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '0.85rem',
            }}
          >
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Tên nhóm</label>
              <input
                type="text"
                className="form-control"
                required
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Trạng thái</label>
              <select
                className="form-control"
                value={editForm.status}
                onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
              >
                <option value="Recruiting">Recruiting (Đang tuyển)</option>
                <option value="Full">Full (Đã đủ)</option>
                <option value="Locked">Locked (Đã khóa)</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Sĩ số tối đa (4-6)</label>
              <input
                type="number"
                className="form-control"
                min={4}
                max={6}
                value={editForm.maxMembers}
                onChange={(e) => setEditForm({ ...editForm, maxMembers: Number(e.target.value) })}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Đề tài liên kết</label>
              <select
                className="form-control"
                value={editForm.projectId || ''}
                onChange={(e) =>
                  setEditForm({ ...editForm, projectId: e.target.value || null })
                }
              >
                <option value="">-- Không liên kết --</option>
                {myProjects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Mô tả nhóm</label>
              <input
                type="text"
                className="form-control"
                value={editForm.description || ''}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              />
            </div>
            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setShowEditGroup(false)}
              >
                Hủy
              </button>
              <button type="submit" className="btn btn-primary btn-sm">
                Lưu thay đổi
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Feedback / Error */}
      {feedback && (
        <div
          className="card"
          style={{
            marginBottom: '1rem',
            padding: '0.85rem 1.15rem',
            borderLeft: '4px solid #10b981',
            background: '#ecfdf5',
            color: '#065f46',
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          <span>{feedback}</span>
          <button onClick={() => setFeedback(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={15} />
          </button>
        </div>
      )}
      {error && (
        <div
          className="card"
          style={{
            marginBottom: '1rem',
            padding: '0.85rem 1.15rem',
            borderLeft: '4px solid #ef4444',
            background: '#fef2f2',
            color: '#991b1b',
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          <span>{error}</span>
          <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={15} />
          </button>
        </div>
      )}

      {/* Sub-navigation Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
        <button
          className={activeTab === 'members' ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'}
          onClick={() => setActiveTab('members')}
        >
          <Users size={15} /> Thành viên ({group.members.length}/{group.maxMembers})
        </button>
        <button
          className={activeTab === 'slots' ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'}
          onClick={() => setActiveTab('slots')}
        >
          <Briefcase size={15} /> Vị trí Tuyển dụng ({group.slots.length})
        </button>
        {isLeader && (
          <>
            <button
              className={activeTab === 'requests' ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'}
              onClick={() => setActiveTab('requests')}
            >
              <Mail size={15} /> Đơn xin vào nhóm ({pendingReqCount} chờ duyệt)
            </button>
            <button
              className={activeTab === 'candidates' ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'}
              onClick={() => setActiveTab('candidates')}
            >
              <Sparkles size={15} /> Gợi ý Ứng viên phù hợp (gRPC)
            </button>
          </>
        )}
      </div>

      {/* TAB A: MEMBERS */}
      {activeTab === 'members' && (
        <div className="card">
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '1rem' }}>
            Danh sách Thành viên Nhóm
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {group.members.map((m) => {
              const prof = memberProfiles[m.userId];
              return (
                <div
                  key={m.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '0.75rem',
                    padding: '0.85rem 1rem',
                    borderRadius: 10,
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <strong style={{ fontSize: '0.95rem' }}>
                        {prof?.fullName || `Thành viên (${m.userId.slice(0, 8)})`}
                      </strong>
                      {m.role === 'Leader' ? (
                        <span
                          className="badge"
                          style={{ background: '#fef3c7', color: '#b45309', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                        >
                          <Crown size={12} /> Trưởng nhóm
                        </span>
                      ) : (
                        <span className="badge badge-domain">Thành viên</span>
                      )}
                      {prof?.major && (
                        <span className="badge badge-recruiting">Ngành {prof.major}</span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 4 }}>
                      {prof?.desiredRole || 'Thành viên dự án'} • Gia nhập: {formatDateTime(m.joinedAt)}
                    </div>
                  </div>

                  {isLeader && m.userId !== user?.id && (
                    <div style={{ display: 'flex', gap: '0.45rem' }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => void handleTransferLeader(m.userId)}
                        title="Chuyển quyền Trưởng nhóm"
                      >
                        <Crown size={14} /> Nhượng quyền Leader
                      </button>
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ color: '#dc2626' }}
                        onClick={() => void handleRemoveMember(m.userId)}
                      >
                        <UserMinus size={14} /> Xóa
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB B: RECRUITMENT SLOTS */}
      {activeTab === 'slots' && (
        <div className="card">
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '1rem' }}>
            Vị trí Tuyển dụng của Nhóm
          </h3>

          {group.slots.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Nhóm chưa đăng ký vị trí tuyển dụng nào.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginBottom: '1.5rem' }}>
              {group.slots.map((s) => (
                <div
                  key={s.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.85rem 1rem',
                    borderRadius: 10,
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <div>
                    <strong style={{ fontSize: '0.95rem' }}>{s.roleName}</strong>
                    <span className="badge badge-domain" style={{ marginLeft: 8 }}>
                      Ngành {s.major} • Số lượng: {s.quantity}
                    </span>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 4 }}>
                      Kỹ năng yêu cầu: {s.requiredSkills.length > 0 ? s.requiredSkills.join(', ') : 'Linh hoạt'}
                    </div>
                  </div>
                  {isLeader && (
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                          setEditingSlot(s);
                          setSlotRoleName(s.roleName);
                          setSlotMajor(s.major);
                          setSlotSkills(s.requiredSkills.join(', '));
                          setSlotQty(s.quantity);
                        }}
                      >
                        <Edit3 size={14} /> Sửa
                      </button>
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ color: '#dc2626' }}
                        onClick={() => void handleDeleteSlot(s.id)}
                      >
                        <Trash2 size={14} /> Xóa
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {isLeader && (
            <form
              onSubmit={(e) => void handleSaveSlot(e)}
              style={{
                borderTop: '1px solid #e2e8f0',
                paddingTop: '1rem',
                display: 'grid',
                gridTemplateColumns: '2fr 1fr 2fr 0.8fr auto',
                gap: '0.6rem',
                alignItems: 'end',
              }}
            >
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 600 }}>
                  {editingSlot ? 'Cập nhật tên vị trí' : 'Thêm vị trí mới'}
                </label>
                <input
                  type="text"
                  className="form-control"
                  required
                  placeholder="VD: AI Engineer / Marketer"
                  value={slotRoleName}
                  onChange={(e) => setSlotRoleName(e.target.value)}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 600 }}>Chuyên ngành</label>
                <select
                  className="form-control"
                  value={slotMajor}
                  onChange={(e) => setSlotMajor(e.target.value)}
                >
                  {MAJOR_LIST.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.value}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 600 }}>Kỹ năng (phẩy)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="C# / .NET, React / TypeScript"
                  value={slotSkills}
                  onChange={(e) => setSlotSkills(e.target.value)}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 600 }}>Số lượng</label>
                <input
                  type="number"
                  className="form-control"
                  min={1}
                  max={5}
                  value={slotQty}
                  onChange={(e) => setSlotQty(Number(e.target.value))}
                />
              </div>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <button type="submit" className="btn btn-primary btn-sm">
                  {editingSlot ? 'Lưu' : 'Thêm'}
                </button>
                {editingSlot && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      setEditingSlot(null);
                      setSlotRoleName('');
                      setSlotSkills('');
                    }}
                  >
                    Hủy
                  </button>
                )}
              </div>
            </form>
          )}
        </div>
      )}

      {/* TAB C: INCOMING JOIN REQUESTS */}
      {activeTab === 'requests' && isLeader && (
        <div className="card">
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '1rem' }}>
            Đơn xin gia nhập nhóm ({joinRequests.length})
          </h3>
          {joinRequests.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>Chưa có sinh viên nào gửi đơn xin gia nhập nhóm.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {joinRequests.map((req) => {
                const prof = applicantProfiles[req.userId];
                return (
                  <div
                    key={req.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '0.75rem',
                      padding: '0.9rem 1rem',
                      borderRadius: 10,
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <strong>{prof?.fullName || `Ứng viên (${req.userId.slice(0, 8)})`}</strong>
                        {prof?.major && <span className="badge badge-domain">Ngành {prof.major}</span>}
                        <span className="badge badge-recruiting">{req.status}</span>
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#334155', marginTop: 4 }}>
                        Lời nhắn: &quot;{req.message || 'Mong muốn tham gia cùng nhóm.'}&quot;
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 2 }}>
                        Gửi lúc: {formatDateTime(req.createdAt)}
                      </div>
                    </div>

                    {req.status === 'Pending' && (
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => void handleDecideJoinRequest(req.id, true)}
                        >
                          <Check size={14} /> Chấp nhận
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          style={{ color: '#dc2626' }}
                          onClick={() => void handleDecideJoinRequest(req.id, false)}
                        >
                          <X size={14} /> Từ chối
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB D: RANKED CANDIDATES (gRPC Matching) */}
      {activeTab === 'candidates' && isLeader && (
        <div className="card">
          <div style={{ marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>
              Ứng viên tiềm năng được xếp hạng bởi Matching Service (gRPC)
            </h3>
            <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>
              Xếp hạng dựa trên kỹ năng, chuyên ngành bổ trợ (đa ngành BR-04) và định hướng vị trí của ứng viên đang tìm nhóm.
            </p>
          </div>

          {candidates.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>
              Chưa tìm thấy ứng viên phù hợp hoặc nhóm chưa khai báo vị trí cần tuyển.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {candidates.map((c) => (
                <div
                  key={c.userId}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '0.75rem',
                    padding: '0.95rem 1.1rem',
                    borderRadius: 10,
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <strong style={{ fontSize: '0.95rem' }}>{c.fullName}</strong>
                      {c.major && <span className="badge badge-domain">Ngành {c.major}</span>}
                      {c.desiredRole && (
                        <span style={{ fontSize: '0.8rem', color: '#475569' }}>• {c.desiredRole}</span>
                      )}
                      <span style={getScoreBadgeStyle(c.score)}>
                        Điểm phù hợp: {c.score.toFixed(0)}%
                      </span>
                    </div>
                    {c.matchedSkills.length > 0 && (
                      <div style={{ fontSize: '0.8rem', color: '#15803d', marginTop: 4 }}>
                        ✓ Kỹ năng khớp: {c.matchedSkills.join(', ')}
                      </div>
                    )}
                  </div>

                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => {
                      setInvitingCandidate(c);
                      setInviteMessage(
                        `Chào ${c.fullName}, nhóm ${group.name} thấy hồ sơ của bạn rất phù hợp (${c.score.toFixed(0)}%) nên trân trọng mời bạn tham gia nhóm!`
                      );
                    }}
                  >
                    <Send size={14} /> Mời vào nhóm
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal gửi lời mời */}
      {invitingCandidate && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
          onClick={() => setInvitingCandidate(null)}
        >
          <div
            className="card"
            style={{ maxWidth: 480, width: '100%', padding: '1.5rem' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.75rem' }}>
              Mời {invitingCandidate.fullName} vào nhóm
            </h3>
            <form onSubmit={(e) => void handleSendInvitation(e)}>
              <textarea
                className="form-control"
                rows={3}
                value={inviteMessage}
                onChange={(e) => setInviteMessage(e.target.value)}
                style={{ marginBottom: '1rem' }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setInvitingCandidate(null)}
                >
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  <Send size={14} /> Gửi lời mời
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// 3. JOIN REQUESTS PAGE (/join-requests) — Quản lý Đơn xin gia nhập của Sinh viên
// ══════════════════════════════════════════════════════════════════════════════
export const JoinRequestsPage: React.FC = () => {
  const [requests, setRequests] = useState<JoinRequestResponse[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadMyRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await groupsApi.getMyJoinRequests({
        status: statusFilter || undefined,
        page: 1,
        pageSize: 30,
      });
      setRequests(res.items || []);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Không thể tải danh sách yêu cầu tham gia nhóm.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void loadMyRequests();
  }, [loadMyRequests]);

  const handleCancelRequest = async (id: string) => {
    try {
      await groupsApi.cancelJoinRequest(id);
      setFeedback('Đã hủy yêu cầu xin gia nhập nhóm.');
      await loadMyRequests();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Không thể hủy yêu cầu này.');
    }
  };

  const pendingCount = requests.filter((r) => r.status === 'Pending').length;

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.75rem',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>
            Yêu cầu Tham gia Nhóm ({pendingCount}/5 Pending)
          </h1>
          <p style={{ color: 'var(--text-muted, #64748b)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Theo dõi trạng thái các đơn xin gia nhập nhóm của bạn (Tối đa 5 yêu cầu Pending cùng lúc — BR-03)
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <select
            className="form-control"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ width: 180 }}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="Pending">Đang chờ duyệt (Pending)</option>
            <option value="Accepted">Đã chấp nhận (Accepted)</option>
            <option value="Rejected">Từ chối (Rejected)</option>
            <option value="Cancelled">Đã hủy (Cancelled)</option>
          </select>
          <button className="btn btn-secondary btn-sm" onClick={() => void loadMyRequests()}>
            <RefreshCw size={15} /> Làm mới
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className="card"
          style={{
            marginBottom: '1rem',
            padding: '0.85rem 1.15rem',
            borderLeft: '4px solid #10b981',
            background: '#ecfdf5',
            color: '#065f46',
          }}
        >
          {feedback}
        </div>
      )}
      {error && (
        <div
          className="card"
          style={{
            marginBottom: '1rem',
            padding: '0.85rem 1.15rem',
            borderLeft: '4px solid #ef4444',
            background: '#fef2f2',
            color: '#991b1b',
          }}
        >
          {error}
        </div>
      )}

      {loading ? (
        <div className="card" style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          Đang tải danh sách yêu cầu...
        </div>
      ) : requests.length === 0 ? (
        <div className="card" style={{ maxWidth: 800, textAlign: 'center', padding: '3.5rem', color: 'var(--text-muted)' }}>
          <AlertCircle size={44} style={{ margin: '0 auto 1rem auto', color: '#94a3b8' }} />
          <h3 style={{ color: 'var(--text-main)' }}>Bạn chưa có yêu cầu gia nhập nào</h3>
          <p style={{ marginTop: '0.35rem' }}>
            Hãy khám phá các nhóm đề tài tại mục &quot;Khám phá nhóm&quot; và gửi yêu cầu tham gia phù hợp.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', maxWidth: 900 }}>
          {requests.map((r) => (
            <div
              key={r.id}
              className="card"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <strong style={{ fontSize: '1.05rem', color: 'var(--text-main)' }}>
                    Nhóm: {r.groupName}
                  </strong>
                  <span className="badge badge-domain">{r.status}</span>
                </div>
                {r.message && (
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                    Lời nhắn: &quot;{r.message}&quot;
                  </p>
                )}
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  Gửi lúc: {formatDateTime(r.createdAt)}
                  {r.decidedAt && ` • Phản hồi lúc: ${formatDateTime(r.decidedAt)}`}
                </div>
              </div>

              {r.status === 'Pending' && (
                <button
                  className="btn btn-secondary btn-sm"
                  style={{ color: '#dc2626' }}
                  onClick={() => void handleCancelRequest(r.id)}
                >
                  <X size={15} /> Hủy yêu cầu
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// 4. INVITATIONS PAGE (/invitations) — Quản lý Lời mời Tham gia Nhóm của Sinh viên
// ══════════════════════════════════════════════════════════════════════════════
export const InvitationsPage: React.FC = () => {
  const navigate = useNavigate();
  const [invitations, setInvitations] = useState<InvitationResponse[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadMyInvitations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await groupsApi.getMyInvitations({
        status: statusFilter || undefined,
        page: 1,
        pageSize: 30,
      });
      setInvitations(res.items || []);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Không thể tải danh sách lời mời tham gia nhóm.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void loadMyInvitations();
  }, [loadMyInvitations]);

  const handleDecision = async (invId: string, accept: boolean) => {
    try {
      if (accept) {
        await groupsApi.acceptInvitation(invId);
        setFeedback('Bạn đã chấp nhận lời mời vào nhóm! Đang chuyển tới Nhóm của tôi...');
        setTimeout(() => navigate('/my-group'), 900);
      } else {
        await groupsApi.rejectInvitation(invId);
        setFeedback('Đã từ chối lời mời tham gia nhóm.');
        await loadMyInvitations();
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Không thể xử lý lời mời này.');
    }
  };

  const pendingCount = invitations.filter((i) => i.status === 'Pending').length;

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.75rem',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>
            Lời mời Tham gia Nhóm ({pendingCount} đang chờ)
          </h1>
          <p style={{ color: 'var(--text-muted, #64748b)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Các lời mời từ trưởng nhóm gửi đến bạn (Tự động hết hạn sau 48h — Background Job BR-10)
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <select
            className="form-control"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ width: 180 }}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="Pending">Đang chờ (Pending)</option>
            <option value="Accepted">Đã đồng ý (Accepted)</option>
            <option value="Rejected">Đã từ chối (Rejected)</option>
            <option value="Expired">Đã hết hạn (Expired)</option>
          </select>
          <button className="btn btn-secondary btn-sm" onClick={() => void loadMyInvitations()}>
            <RefreshCw size={15} /> Làm mới
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className="card"
          style={{
            marginBottom: '1rem',
            padding: '0.85rem 1.15rem',
            borderLeft: '4px solid #10b981',
            background: '#ecfdf5',
            color: '#065f46',
          }}
        >
          {feedback}
        </div>
      )}
      {error && (
        <div
          className="card"
          style={{
            marginBottom: '1rem',
            padding: '0.85rem 1.15rem',
            borderLeft: '4px solid #ef4444',
            background: '#fef2f2',
            color: '#991b1b',
          }}
        >
          {error}
        </div>
      )}

      {loading ? (
        <div className="card" style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          Đang tải danh sách lời mời...
        </div>
      ) : invitations.length === 0 ? (
        <div className="card" style={{ maxWidth: 800, textAlign: 'center', padding: '3.5rem', color: 'var(--text-muted)' }}>
          <Mail size={44} style={{ margin: '0 auto 1rem auto', color: '#94a3b8' }} />
          <h3 style={{ color: 'var(--text-main)' }}>Bạn không có lời mời nào đang chờ</h3>
          <p style={{ marginTop: '0.35rem' }}>
            Khi các trưởng nhóm tìm kiếm ứng viên và gửi lời mời đến bạn, chúng sẽ xuất hiện tại đây.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', maxWidth: 900 }}>
          {invitations.map((inv) => (
            <div
              key={inv.id}
              className="card"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <strong style={{ fontSize: '1.05rem', color: 'var(--text-main)' }}>
                    Lời mời từ nhóm: {inv.groupName}
                  </strong>
                  <span className="badge badge-domain">{inv.status}</span>
                </div>
                {inv.message && (
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                    &quot;{inv.message}&quot;
                  </p>
                )}
                <div
                  style={{
                    fontSize: '0.78rem',
                    color: 'var(--text-muted)',
                    marginTop: 4,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                  }}
                >
                  <Clock size={13} />
                  Gửi lúc: {formatDateTime(inv.createdAt)} • Hết hạn: {formatDateTime(inv.expiresAt)}
                </div>
              </div>

              {inv.status === 'Pending' && (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => void handleDecision(inv.id, true)}
                  >
                    <Check size={15} /> Chấp nhận
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ color: '#dc2626' }}
                    onClick={() => void handleDecision(inv.id, false)}
                  >
                    <X size={15} /> Từ chối
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

