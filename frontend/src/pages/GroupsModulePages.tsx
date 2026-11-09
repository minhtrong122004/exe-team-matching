import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import { groupsApi } from '../api/groups';
import { spacesApi } from '../api/spaces';
import { useAuth } from '../contexts/AuthContext';
import type { TransferRequestResponse, RoomSummaryResponse } from '../types/space';
import type {
  GroupResponse,
  GroupMemberResponse,
  GroupSummaryResponse,
  UpdateGroupRequest,
  RecruitmentSlotResponse,
  JoinRequestResponse,
  MatchScoreResponse,
  SuggestedGroupResponse,
  RankedCandidateResponse,
  CandidateProfileResponse,
  LeaderElectionResponse,
  ProjectItem,
  Major,
  ProjectDomain,
} from '../types';
import {
  Compass,
  Users,
  Sparkles,
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
  Vote,
  ThumbsUp,
  ThumbsDown,
  Zap,
  Lock,
  Unlock,
  ArrowLeftRight,
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
    if (user?.role === 'Student' && !user?.isProfileCompleted) {
      setError(
        'Bạn chưa hoàn tất hồ sơ 5 kỹ năng cốt lõi (BR-07). Vui lòng cập nhật điểm 5 kỹ năng và tích cam kết trách nhiệm cá nhân tại trang Hồ sơ trước khi nộp đơn xin gia nhập nhóm.'
      );
      setSelectedGroup(null);
      navigate('/profile');
      return;
    }
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

      {/* BR-07 Profile Incomplete Banner for Student */}
      {user?.role === 'Student' && !user?.isProfileCompleted && (
        <div
          className="card"
          style={{
            padding: '1.15rem 1.35rem',
            marginBottom: '1.25rem',
            background: 'rgba(242, 111, 33, 0.06)',
            border: '1.5px solid rgba(242, 111, 33, 0.35)',
            borderRadius: 'var(--radius-lg, 14px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem', maxWidth: 780 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: '10px',
                background: 'rgba(242, 111, 33, 0.12)',
                color: 'var(--fpt-orange, #f26f21)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <AlertCircle size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    padding: '0.15rem 0.5rem',
                    borderRadius: '5px',
                    background: 'var(--fpt-orange, #f26f21)',
                    color: '#ffffff',
                    letterSpacing: '0.04em',
                  }}
                >
                  YÊU CẦU BẮT BUỘC • BR-07
                </span>
                <strong style={{ fontSize: '0.9rem', color: 'var(--text-main, #0f172a)' }}>
                  Hồ sơ 5 kỹ năng cốt lõi chưa hoàn tất
                </strong>
              </div>
              <p style={{ margin: 0, fontSize: '0.825rem', color: 'var(--text-muted, #64748b)', lineHeight: 1.5 }}>
                Bạn cần khai báo 5 kỹ năng cốt lõi và tích cam kết trách nhiệm cá nhân tại trang Hồ sơ để mở khóa quyền vào phòng, nộp đơn ứng tuyển hoặc tạo nhóm.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate('/profile')}
            className="btn btn-primary"
            style={{
              padding: '0.55rem 1.15rem',
              fontSize: '0.825rem',
              fontWeight: 700,
              whiteSpace: 'nowrap',
              flexShrink: 0,
              gap: '0.35rem',
            }}
          >
            <span>Khai báo 5 kỹ năng →</span>
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
              <option value="Closed">Đã đóng tuyển (Closed)</option>
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        {g.roomCode && (
                          <span
                            style={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: '0.78rem',
                              fontWeight: 800,
                              padding: '0.15rem 0.45rem',
                              borderRadius: '6px',
                              background: '#f1f5f9',
                              border: '1px solid #e2e8f0',
                            }}
                          >
                            {g.roomCode}
                          </span>
                        )}
                        <span
                          className="badge"
                          style={{
                            background:
                              g.status === 'Recruiting'
                                ? '#dcfce7'
                                : g.status === 'Forming' || g.status === 'Empty'
                                ? '#dbeafe'
                                : g.status === 'Closed'
                                ? '#fee2e2'
                                : '#f1f5f9',
                            color:
                              g.status === 'Recruiting'
                                ? '#15803d'
                                : g.status === 'Forming' || g.status === 'Empty'
                                ? '#1d4ed8'
                                : g.status === 'Closed'
                                ? '#b91c1c'
                                : '#475569',
                            fontFamily: 'var(--font-mono)',
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          {g.status} ({g.memberCount}/{g.maxMembers})
                        </span>
                      </div>
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
                    <span style={{ color: '#f26f21', fontWeight: 700 }}>
                      {g.memberCount < (g.groupThreshold || Math.floor((g.maxMembers || 5) / 2) + 1)
                        ? '⚡ Vào thẳng / Chi tiết →'
                        : 'Chi tiết & Xin vào →'}
                    </span>
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

                {/* Direct Join or Join Request Form */}
                {user?.role === 'Student' &&
                  !selectedGroup.members.some((m) => m.userId === user.id) &&
                  (() => {
                    const threshold = selectedGroup.groupThreshold || Math.floor((selectedGroup.maxMembers || 5) / 2) + 1;
                    const isUnder = selectedGroup.members.length < threshold;
                    const isDirectJoin = (selectedGroup.status === 'Empty' || selectedGroup.status === 'Forming') && isUnder;

                    if (isDirectJoin) {
                      return (
                        <div
                          style={{
                            borderTop: '1px solid #e2e8f0',
                            paddingTop: '1.15rem',
                            marginTop: '1rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.75rem',
                          }}
                        >
                          <div
                            style={{
                              padding: '0.85rem 1rem',
                              borderRadius: 8,
                              background: 'rgba(0, 84, 166, 0.05)',
                              border: '1px solid rgba(0, 84, 166, 0.2)',
                              fontSize: '0.825rem',
                              color: 'var(--text-main)',
                            }}
                          >
                            ⚡ <strong>Phòng chờ đang dưới ngưỡng ({threshold} SV):</strong> Bạn được tham gia trực tiếp ngay mà không cần gửi đơn xét duyệt. {selectedGroup.members.length === 0 ? 'Vì phòng đang trống, bạn sẽ trở thành Trưởng nhóm (Leader) (BR-15)!' : 'Vào nhóm ngay (BR-14)!'}
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem' }}>
                            <button
                              type="button"
                              className="btn btn-secondary"
                              onClick={() => setSelectedGroup(null)}
                            >
                              Đóng
                            </button>
                            <button
                              type="button"
                              className="btn btn-primary"
                              disabled={joinSubmitting}
                              onClick={async () => {
                                if (user?.role === 'Student' && !user?.isProfileCompleted) {
                                  setError(
                                    'Bạn chưa hoàn tất hồ sơ 5 kỹ năng cốt lõi (BR-07). Vui lòng cập nhật điểm 5 kỹ năng và tích cam kết trách nhiệm cá nhân tại trang Hồ sơ trước khi tham gia Room.'
                                  );
                                  setSelectedGroup(null);
                                  navigate('/profile');
                                  return;
                                }
                                setJoinSubmitting(true);
                                try {
                                  const res = await groupsApi.directJoinRoom(selectedGroup.id);
                                  setFeedback(`Chúc mừng bạn đã vào phòng ${res.roomCode || res.name} thành công! (${res.role === 'Leader' ? 'Bạn là Trưởng nhóm' : 'Thành viên'})`);
                                  setSelectedGroup(null);
                                  navigate('/my-group');
                                } catch (err: any) {
                                  setError(err?.response?.data?.detail || 'Không thể vào phòng trực tiếp.');
                                } finally {
                                  setJoinSubmitting(false);
                                }
                              }}
                            >
                              <Zap size={15} />
                              {joinSubmitting ? 'Đang vào...' : 'Vào phòng trực tiếp (BR-14)'}
                            </button>
                          </div>
                        </div>
                      );
                    }

                    if (selectedGroup.status === 'Recruiting') {
                      return (
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
                      );
                    }

                    return (
                      <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1rem', marginTop: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                        Nhóm hiện tại không nhận thêm thành viên ({selectedGroup.status}).
                      </div>
                    );
                  })()}
              </>
            )}
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

  const [activeTab, setActiveTab] = useState<'members' | 'slots' | 'requests' | 'candidates' | 'transfers'>('members');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Phase 6: Post-lock transfer requests state (BR-36 & BR-37)
  const [myTransfers, setMyTransfers] = useState<TransferRequestResponse[]>([]);
  const [showTransferModal, setShowTransferModal] = useState<boolean>(false);
  const [transferTargetGroupId, setTransferTargetGroupId] = useState<string>('');
  const [transferIsSwap, setTransferIsSwap] = useState<boolean>(false);
  const [transferSwapStudentId, setTransferSwapStudentId] = useState<string>('');
  const [transferReason, setTransferReason] = useState<string>('');
  const [submittingTransfer, setSubmittingTransfer] = useState<boolean>(false);
  const [availableRooms, setAvailableRooms] = useState<RoomSummaryResponse[]>([]);
  const [loadingAvailableRooms, setLoadingAvailableRooms] = useState<boolean>(false);
  const [targetGroupMembers, setTargetGroupMembers] = useState<GroupMemberResponse[]>([]);
  const [loadingTargetMembers, setLoadingTargetMembers] = useState<boolean>(false);
  const [cancellingTransferId, setCancellingTransferId] = useState<string | null>(null);

  const pendingTransfer = useMemo(
    () => myTransfers.find((t) => t.status === 'Pending') || null,
    [myTransfers]
  );

  const approvedTransfer = useMemo(
    () => myTransfers.find((t) => t.status === 'Approved') || null,
    [myTransfers]
  );

  const selectedTargetRoom = useMemo(
    () => availableRooms.find((r) => r.id === transferTargetGroupId) || null,
    [availableRooms, transferTargetGroupId]
  );

  const isTargetFull = useMemo(
    () => (selectedTargetRoom ? selectedTargetRoom.memberCount >= selectedTargetRoom.maxMembers : false),
    [selectedTargetRoom]
  );

  const isSourceAtThreshold = useMemo(
    () => (group?.members ? group.members.length <= (group.groupThreshold || 3) : false),
    [group]
  );

  const isSwapMandatory = isTargetFull || isSourceAtThreshold;

  // Phase 4: Leader election & 24h timer (BR-18, BR-19)
  const [currentElection, setCurrentElection] = useState<LeaderElectionResponse | null>(null);
  const [countdownSeconds, setCountdownSeconds] = useState<number>(0);
  const [showNominateModal, setShowNominateModal] = useState<boolean>(false);
  const [nominatedCandidateId, setNominatedCandidateId] = useState<string>('');
  const [electionSubmitting, setElectionSubmitting] = useState<boolean>(false);
  const [votingElection, setVotingElection] = useState<boolean>(false);

  // Phase 4: Application voting with comments (BR-25)
  const [voteCommentModal, setVoteCommentModal] = useState<{ requestId: string; isUpvote: boolean } | null>(null);
  const [voteComment, setVoteComment] = useState<string>('');
  const [votingApp, setVotingApp] = useState<boolean>(false);

  // Phase 4: Modal Mời ra khỏi nhóm kèm lý do bắt buộc & Audit Log (Phương án 3, BR-05)
  const [kickModal, setKickModal] = useState<{ userId: string; fullName: string } | null>(null);
  const [kickCategory, setKickCategory] = useState<string>('Mất liên lạc / Không phản hồi (>48h)');
  const [kickReason, setKickReason] = useState<string>('');
  const [isSubmittingKick, setIsSubmittingKick] = useState<boolean>(false);

  // Edit Group state
  const [showEditGroup, setShowEditGroup] = useState(false);
  const [editForm, setEditForm] = useState<UpdateGroupRequest>({
    name: '',
    description: '',
  });

  // Add/Edit Slot state
  const [editingSlot, setEditingSlot] = useState<RecruitmentSlotResponse | null>(null);
  const [slotRoleName, setSlotRoleName] = useState('');
  const [slotMajor, setSlotMajor] = useState<string>('SE');
  const [slotSkills, setSlotSkills] = useState('');
  const [slotQty, setSlotQty] = useState(1);

  const isLeader = Boolean(group && user && group.leaderId === user.id);

  const loadMyTransfers = useCallback(async () => {
    try {
      const res = await spacesApi.getMyTransferRequests();
      setMyTransfers(res);
    } catch {
      setMyTransfers([]);
    }
  }, []);

  const openTransferModal = async () => {
    if (!group?.spaceId) return;
    setShowTransferModal(true);
    setLoadingAvailableRooms(true);
    setTransferTargetGroupId('');
    setTransferSwapStudentId('');
    setTransferReason('');
    setTargetGroupMembers([]);

    const atThreshold = (group.members?.length || 0) <= (group.groupThreshold || 3);
    setTransferIsSwap(atThreshold);

    try {
      const roomsRes = await spacesApi.getSpaceRooms(group.spaceId);
      setAvailableRooms(roomsRes.filter((r) => r.id !== group.id));
    } catch {
      setAvailableRooms([]);
    } finally {
      setLoadingAvailableRooms(false);
    }
  };

  const handleTargetGroupChange = async (targetId: string) => {
    setTransferTargetGroupId(targetId);
    setTransferSwapStudentId('');
    if (!targetId) {
      setTargetGroupMembers([]);
      return;
    }

    const targetRoom = availableRooms.find((r) => r.id === targetId);
    const targetFull = targetRoom ? targetRoom.memberCount >= targetRoom.maxMembers : false;
    const sourceThreshold = (group?.members?.length || 0) <= (group?.groupThreshold || 3);

    if (targetFull || sourceThreshold) {
      setTransferIsSwap(true);
    }

    setLoadingTargetMembers(true);
    try {
      const detail = await groupsApi.getGroupById(targetId);
      setTargetGroupMembers(detail.members || []);
    } catch {
      setTargetGroupMembers([]);
    } finally {
      setLoadingTargetMembers(false);
    }
  };

  const handleCreateTransferRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!group?.spaceId) return;
    if (!transferTargetGroupId) {
      setError('Vui lòng chọn nhóm đích muốn chuyển đến.');
      return;
    }
    if (transferIsSwap && !transferSwapStudentId) {
      setError('Vui lòng chọn sinh viên trong nhóm đích để đổi chéo.');
      return;
    }
    if (!transferReason.trim()) {
      setError('Vui lòng nêu rõ lý do xin chuyển nhóm (bắt buộc theo BR-36).');
      return;
    }
    try {
      setSubmittingTransfer(true);
      setError(null);
      await spacesApi.createTransferRequest(group.spaceId, {
        targetGroupId: transferTargetGroupId,
        swapStudentId: transferIsSwap ? transferSwapStudentId : null,
        reason: transferReason.trim(),
      });
      setFeedback('Đã gửi đơn xin chuyển nhóm thành công (BR-36)! Trưởng phòng (Moderator) sẽ xem xét và phê duyệt.');
      setShowTransferModal(false);
      setTransferTargetGroupId('');
      setTransferSwapStudentId('');
      setTransferReason('');
      setTransferIsSwap(false);
      setTargetGroupMembers([]);
      await loadMyTransfers();
      setActiveTab('transfers');
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.response?.data?.title || 'Không thể gửi đơn xin chuyển nhóm.');
    } finally {
      setSubmittingTransfer(false);
    }
  };

  const handleCancelTransferRequest = async (requestId: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn hủy đơn xin chuyển nhóm này?')) return;
    setCancellingTransferId(requestId);
    setError(null);
    try {
      await spacesApi.cancelTransferRequest(requestId);
      setFeedback('Đã hủy yêu cầu xin chuyển nhóm thành công! Bạn có thể tạo đơn mới nếu có nhu cầu.');
      await loadMyTransfers();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Không thể hủy yêu cầu chuyển nhóm.');
    } finally {
      setCancellingTransferId(null);
    }
  };

  const loadMyGroupData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const myGrp = await groupsApi.getMyGroup();
      setGroup(myGrp);
      void loadMyTransfers();
      if (!myGrp) {
        return;
      }

      setEditForm({
        name: myGrp.name,
        description: myGrp.description || '',
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

      // Load join requests for ALL members (BR-25 application voting)
      // Load ranked candidates for leader
      // Load active election for all members (BR-18, BR-19)
      const [reqRes, candRes, electionRes] = await Promise.all([
        groupsApi.getGroupJoinRequests(myGrp.id, { page: 1, pageSize: 30 }).catch(() => null),
        user && myGrp.leaderId === user.id ? groupsApi.getRankedCandidates(myGrp.id, 10).catch(() => []) : Promise.resolve([]),
        groupsApi.getCurrentElection(myGrp.id).catch(() => null),
      ]);

      const reqItems = reqRes?.items || [];
      setJoinRequests(reqItems);
      setCandidates(candRes || []);
      setCurrentElection(electionRes);
      if (electionRes && electionRes.status === 'Active') {
        setCountdownSeconds(Math.max(0, Math.floor(electionRes.secondsRemaining || 0)));
      } else {
        setCountdownSeconds(0);
      }

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
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Không thể tải thông tin nhóm của bạn.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadMyGroupData();
  }, [loadMyGroupData]);

  // Phase 4: 24h Countdown Timer for active leader election
  useEffect(() => {
    if (!currentElection || currentElection.status !== 'Active' || countdownSeconds <= 0) return;
    const interval = setInterval(() => {
      setCountdownSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          void loadMyGroupData();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [currentElection, countdownSeconds, loadMyGroupData]);

  const formatCountdown = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    const hh = h < 10 ? `0${h}` : `${h}`;
    const mm = m < 10 ? `0${m}` : `${m}`;
    const ss = s < 10 ? `0${s}` : `${s}`;
    return `${hh}:${mm}:${ss}`;
  };

  const handleStartElection = async (candidateId: string) => {
    if (!group) return;
    setElectionSubmitting(true);
    setError(null);
    setFeedback(null);
    try {
      await groupsApi.startElection(group.id, candidateId);
      setShowNominateModal(false);
      setFeedback('Đã khởi tạo cuộc bầu chọn Trưởng nhóm mới thành công! Thời hạn bỏ phiếu là 24 giờ (BR-18, BR-19).');
      await loadMyGroupData();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Không thể khởi tạo cuộc bầu cử.');
    } finally {
      setElectionSubmitting(false);
    }
  };

  const handleVoteElection = async (isAgree: boolean) => {
    if (!group || !currentElection) return;
    setVotingElection(true);
    setError(null);
    setFeedback(null);
    try {
      const res = await groupsApi.voteElection(group.id, currentElection.id, isAgree);
      if (res.status === 'Passed') {
        setFeedback('Chúc mừng! Cuộc bầu cử đã thông qua (> 50% tán thành). Quyền Trưởng nhóm đã chuyển giao thành công (BR-19)!');
      } else {
        setFeedback(`Đã ghi nhận phiếu bầu của bạn: ${isAgree ? 'Đồng ý' : 'Không đồng ý'}.`);
      }
      await loadMyGroupData();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Không thể gửi phiếu bầu.');
    } finally {
      setVotingElection(false);
    }
  };

  const handleCloseRecruitment = async () => {
    if (!group) return;
    if (
      !window.confirm(
        'Đóng tuyển sớm sẽ tự động từ chối toàn bộ đơn xin gia nhập còn chờ duyệt (BR-28). Bạn có chắc chắn muốn đóng tuyển sớm?'
      )
    )
      return;
    try {
      await groupsApi.closeRecruitment(group.id);
      setFeedback('Đã đóng tuyển dụng sớm thành công. Toàn bộ đơn đang chờ đã được từ chối (BR-28).');
      await loadMyGroupData();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Không thể đóng tuyển dụng sớm.');
    }
  };

  const handleReopenRecruitment = async () => {
    if (!group) return;
    try {
      await groupsApi.reopenRecruitment(group.id);
      setFeedback('Đã mở lại tuyển dụng thành công.');
      await loadMyGroupData();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Không thể mở lại tuyển dụng.');
    }
  };

  const handleVoteApplication = async (requestId: string, isUpvote: boolean, comment?: string) => {
    setVotingApp(true);
    try {
      await groupsApi.voteApplication(requestId, isUpvote, comment);
      setFeedback(`Đã gửi phiếu ${isUpvote ? 'Ủng hộ' : 'Phản đối'} tham khảo cho ứng viên thành công (BR-25).`);
      setVoteCommentModal(null);
      setVoteComment('');
      await loadMyGroupData();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Không thể bỏ phiếu cho ứng viên này.');
    } finally {
      setVotingApp(false);
    }
  };

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
    if (!group) return;
    if (group.status === 'Locked') {
      setError('Nhóm đã Chốt sổ học kỳ (Locked / BR-33). Theo quy tắc BR-37, bạn không thể tự ý rời nhóm. Vui lòng tạo đơn xin chuyển nhóm (BR-36) để Trưởng phòng phê duyệt.');
      return;
    }
    let msg = 'Bạn có chắc chắn muốn rời khỏi nhóm này?';
    if (isLeader) {
      const otherMembers = (group.members || [])
        .filter((m) => m.userId !== user?.id)
        .sort((a, b) => new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime());
      if (otherMembers.length > 0) {
        const successor = otherMembers[0];
        msg = `Bạn đang là Trưởng nhóm. Nếu bạn rời phòng, quyền Trưởng nhóm sẽ TỰ ĐỘNG chuyển giao cho thành viên vào sớm nhất kế tiếp: "${successor.fullName}" (theo quy định BR-20).\n\nLưu ý: Nếu bạn muốn chỉ định một thành viên cụ thể khác, hãy dùng nút "Nhượng quyền Leader" trước khi rời.\n\nBạn có chắc chắn muốn rời nhóm?`;
      } else {
        msg = 'Bạn là thành viên duy nhất trong phòng. Khi bạn rời, phòng sẽ trở về trạng thái Trống (Empty). Bạn có chắc chắn muốn rời nhóm?';
      }
    }
    if (!window.confirm(msg)) return;
    try {
      await groupsApi.leaveGroup(group.id);
      setGroup(null);
      setFeedback('Bạn đã rời nhóm thành công.');
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Không thể rời nhóm.');
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

  const handleConfirmKick = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!group || !kickModal) return;
    if (kickReason.trim().length < 10) {
      setError('Vui lòng nhập lý do cụ thể tối thiểu 10 ký tự.');
      return;
    }
    setIsSubmittingKick(true);
    setError(null);
    try {
      await groupsApi.removeMember(group.id, kickModal.userId, {
        category: kickCategory,
        reason: kickReason.trim(),
      });
      setFeedback(`Đã mời thành viên ${kickModal.fullName} ra khỏi nhóm và gửi email thông báo thành công.`);
      setKickModal(null);
      await loadMyGroupData();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Không thể mời thành viên ra khỏi nhóm.');
    } finally {
      setIsSubmittingKick(false);
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

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => void loadMyGroupData()}>
              <RefreshCw size={15} /> Làm mới
            </button>
            {isLeader && (
              <>
                {group.status === 'Recruiting' && (
                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ color: '#dc2626', borderColor: '#fca5a5' }}
                    onClick={() => void handleCloseRecruitment()}
                    title="Đóng tuyển sớm khi nhóm đã đạt số lượng mong muốn (BR-28)"
                  >
                    <Lock size={14} /> Đóng tuyển sớm (BR-28)
                  </button>
                )}
                {group.status === 'Closed' && (
                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ color: '#008837', borderColor: '#86efac' }}
                    onClick={() => void handleReopenRecruitment()}
                    title="Mở lại tuyển dụng nếu nhóm chưa đủ sĩ số tối đa"
                  >
                    <Unlock size={14} /> Mở lại tuyển dụng
                  </button>
                )}
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowEditGroup((v) => !v)}
                >
                  <Edit3 size={15} /> Sửa thông tin
                </button>
              </>
            )}
            {!isLeader && (
              <button
                className="btn btn-secondary btn-sm"
                style={{ color: 'var(--fpt-orange)', borderColor: '#fed7aa' }}
                onClick={() => setShowNominateModal(true)}
                title="Đề cử một thành viên khác làm Trưởng nhóm mới (BR-18, BR-19)"
              >
                <Vote size={15} /> Bầu Leader mới (BR-19)
              </button>
            )}
            {group.status !== 'Locked' ? (
              <button
                className="btn btn-secondary btn-sm"
                style={{ color: '#dc2626' }}
                onClick={() => void handleLeaveGroup()}
                title={isLeader ? 'Leader rời nhóm sẽ tự động chuyển giao cho thành viên sớm nhất kế tiếp (BR-20)' : 'Rời nhóm'}
              >
                <LogOut size={15} /> Rời nhóm
              </button>
            ) : pendingTransfer ? (
              <button
                className="btn btn-secondary btn-sm"
                style={{ color: '#d97706', borderColor: '#fcd34d', gap: '0.35rem' }}
                onClick={() => setActiveTab('transfers')}
                title="Bạn đang có đơn xin chuyển nhóm đang chờ duyệt (BR-36)"
              >
                <Clock size={15} /> Đang có đơn chờ duyệt
              </button>
            ) : approvedTransfer ? (
              <span className="badge badge-success" style={{ padding: '0.45rem 0.65rem' }}>
                <CheckCircle2 size={14} /> Đã hoàn tất điều chuyển
              </span>
            ) : (
              <button
                className="btn btn-secondary btn-sm"
                style={{ color: 'var(--fpt-orange)', borderColor: '#fed7aa' }}
                onClick={() => void openTransferModal()}
                title="Tạo đơn xin chuyển nhóm hoặc đổi chéo gửi Trưởng phòng duyệt (BR-36)"
              >
                <ArrowLeftRight size={15} /> Xin chuyển nhóm (BR-36)
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

      {/* Phase 4: Active Leader Election Banner (BR-18, BR-19) */}
      {currentElection && currentElection.status === 'Active' && (
        <div
          className="card"
          style={{
            marginBottom: '1.25rem',
            padding: '1.25rem 1.5rem',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, rgba(10, 25, 47, 0.04) 0%, rgba(242, 111, 33, 0.06) 100%)',
            border: '2px solid #f26f21',
            boxShadow: '0 4px 12px rgba(242, 111, 33, 0.08)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.85rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  background: 'rgba(242, 111, 33, 0.15)',
                  color: '#f26f21',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Vote size={22} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  🗳️ Đang diễn ra cuộc bầu chọn Trưởng nhóm mới (BR-18, BR-19)
                </h3>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.825rem', color: 'var(--text-muted)' }}>
                  Ứng viên được đề cử: <strong style={{ color: 'var(--text-main)' }}>{currentElection.candidateName}</strong> • Người khởi xướng: <strong>{currentElection.initiatedByName}</strong>
                </p>
              </div>
            </div>

            {/* 24-hour Countdown Timer */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.4rem 0.85rem',
                borderRadius: '8px',
                background: '#fff',
                border: '1px solid #fed7aa',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              }}
            >
              <Clock size={16} style={{ color: '#ea580c' }} />
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Thời hạn còn lại:</div>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.95rem',
                  fontWeight: 800,
                  color: '#ea580c',
                  fontVariantNumeric: 'tabular-nums',
                  letterSpacing: '0.04em',
                }}
              >
                {formatCountdown(countdownSeconds)}
              </div>
            </div>
          </div>

          {/* Voting Progress */}
          <div style={{ marginTop: '0.75rem', marginBottom: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.825rem', marginBottom: '0.35rem' }}>
              <span>
                Tiến độ phiếu tán thành: <strong style={{ fontFamily: 'var(--font-mono)', color: '#008837' }}>{currentElection.totalAgreed}</strong> / <strong style={{ fontFamily: 'var(--font-mono)' }}>{currentElection.requiredVotesToPass} phiếu</strong> cần thiết để đắc cử (&gt; 50% tổng số {currentElection.totalMembers} SV)
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-muted)' }}>
                {currentElection.totalVotes} / {currentElection.totalMembers} đã bầu
              </span>
            </div>
            <div style={{ height: 8, width: '100%', background: '#e2e8f0', borderRadius: 9999, overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  background: currentElection.totalAgreed >= currentElection.requiredVotesToPass ? '#10b981' : '#f26f21',
                  width: `${Math.min(100, (currentElection.totalAgreed / (currentElection.totalMembers || 1)) * 100)}%`,
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          </div>

          {/* Voting Actions for User */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', paddingTop: '0.65rem', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
            {(() => {
              const myVote = currentElection.votes?.find((v) => v.voterId === user?.id);
              if (myVote) {
                return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                    <CheckCircle2 size={16} style={{ color: myVote.isAgree ? '#10b981' : '#ef4444' }} />
                    <span>
                      Bạn đã bỏ phiếu: <strong>{myVote.isAgree ? '👍 Tán thành (Đồng ý)' : '👎 Không đồng ý'}</strong>
                    </span>
                  </div>
                );
              }
              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <span style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-main)' }}>
                    Bỏ phiếu của bạn:
                  </span>
                  <button
                    type="button"
                    onClick={() => void handleVoteElection(true)}
                    disabled={votingElection}
                    className="btn btn-primary btn-sm"
                    style={{ background: '#008837', borderColor: '#008837', gap: '0.35rem' }}
                  >
                    <ThumbsUp size={14} />
                    <span>Đồng ý</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleVoteElection(false)}
                    disabled={votingElection}
                    className="btn btn-secondary btn-sm"
                    style={{ color: '#dc2626', gap: '0.35rem' }}
                  >
                    <ThumbsDown size={14} />
                    <span>Không đồng ý</span>
                  </button>
                </div>
              );
            })()}

            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Theo BR-19: Ngay khi số phiếu đồng ý đạt &gt; 50% ({currentElection.requiredVotesToPass} phiếu), quyền Leader chuyển giao lập tức.
            </div>
          </div>
        </div>
      )}

      {/* Phase 6: Post-Lock Alert Banner (BR-33 / BR-36) */}
      {group.status === 'Locked' && (
        <div
          style={{
            padding: '0.85rem 1.25rem',
            background: 'rgba(239, 68, 68, 0.06)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            borderRadius: 'var(--radius-md, 10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            marginBottom: '1.25rem',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '8px',
                background: 'rgba(239, 68, 68, 0.1)',
                color: '#dc2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Lock size={18} />
            </div>
            <div>
              <div style={{ fontWeight: 800, color: '#b91c1c', fontSize: '0.9rem' }}>
                Nhóm đã Khóa cứng sau Chốt sổ học kỳ (Locked / BR-33)
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.15rem' }}>
                Đội ngũ chính thức đã được chốt sổ. Thành viên không thể tự rời nhóm. Nếu cần thay đổi, hãy tạo đơn gửi Trưởng phòng xét duyệt (BR-36).
              </div>
            </div>
          </div>
          {pendingTransfer ? (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setActiveTab('transfers')}
              style={{ flexShrink: 0, gap: '0.4rem', fontWeight: 700, color: '#d97706', borderColor: '#fcd34d' }}
            >
              <Clock size={14} /> Xem đơn đang chờ duyệt
            </button>
          ) : approvedTransfer ? (
            <div style={{ flexShrink: 0, color: '#059669', fontWeight: 700, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <CheckCircle2 size={16} /> Đã hoàn tất điều chuyển
            </div>
          ) : (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => void openTransferModal()}
              style={{ flexShrink: 0, gap: '0.4rem', fontWeight: 700 }}
            >
              <ArrowLeftRight size={14} /> Xin chuyển nhóm / Đổi chéo
            </button>
          )}
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
        <button
          className={activeTab === 'requests' ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'}
          onClick={() => setActiveTab('requests')}
        >
          <Mail size={15} /> Đơn xin vào nhóm ({pendingReqCount} chờ duyệt)
        </button>
        {isLeader && (
          <button
            className={activeTab === 'candidates' ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'}
            onClick={() => setActiveTab('candidates')}
          >
            <Sparkles size={15} /> Gợi ý Ứng viên phù hợp (gRPC)
          </button>
        )}
        <button
          className={activeTab === 'transfers' ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'}
          onClick={() => setActiveTab('transfers')}
          style={{ gap: '0.35rem' }}
        >
          <ArrowLeftRight size={15} /> Đơn chuyển nhóm (BR-36)
          {myTransfers.length > 0 && (
            <span
              style={{
                padding: '0.05rem 0.45rem',
                borderRadius: '9999px',
                fontSize: '0.7rem',
                fontFamily: 'var(--font-mono)',
                background: 'rgba(255, 255, 255, 0.25)',
                fontVariantNumeric: 'tabular-nums',
                fontWeight: 700,
              }}
            >
              {myTransfers.length}
            </span>
          )}
        </button>
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
                        onClick={() => {
                          setKickModal({ userId: m.userId, fullName: m.fullName || 'Thành viên' });
                          setKickCategory('Mất liên lạc / Không phản hồi (>48h)');
                          setKickReason('');
                        }}
                        title="Mời thành viên ra khỏi nhóm kèm lý do và thông báo email (Phương án 3, BR-05)"
                      >
                        <UserMinus size={14} /> Mời rời nhóm
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

      {/* TAB C: INCOMING JOIN REQUESTS (BR-24, BR-25, BR-26, BR-28) */}
      {activeTab === 'requests' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>
                Đơn xin gia nhập nhóm ({joinRequests.length})
              </h3>
              <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', margin: '0.2rem 0 0 0' }}>
                {isLeader
                  ? 'Trưởng nhóm xem xét và quyết định chấp thuận/từ chối. Thành viên nhóm bỏ phiếu tham khảo (BR-25).'
                  : 'Mọi thành viên trong nhóm đều có quyền bỏ phiếu Ủng hộ / Phản đối kèm nhận xét tham khảo (BR-25).'}
              </p>
            </div>
            <span
              style={{
                fontSize: '0.78rem',
                padding: '0.25rem 0.65rem',
                borderRadius: '6px',
                background: 'rgba(0, 84, 166, 0.08)',
                color: 'var(--fpt-blue)',
                fontWeight: 600,
                border: '1px solid rgba(0, 84, 166, 0.2)',
              }}
            >
              Cơ chế bỏ phiếu nội bộ (BR-25)
            </span>
          </div>

          {joinRequests.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', padding: '1rem 0' }}>Chưa có sinh viên nào gửi đơn xin gia nhập nhóm.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {joinRequests.map((req) => {
                const prof = applicantProfiles[req.userId];
                const upvotes = req.upvotes || 0;
                const downvotes = req.downvotes || 0;
                const hasVoted = req.votes?.some((v) => v.voterId === user?.id);

                return (
                  <div
                    key={req.id}
                    style={{
                      padding: '1.15rem',
                      borderRadius: 10,
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.85rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <strong style={{ fontSize: '1rem', color: 'var(--text-main)' }}>
                            {req.studentName || prof?.fullName || `Ứng viên (${req.userId.slice(0, 8)})`}
                          </strong>
                          {prof?.major && <span className="badge badge-domain">Ngành {prof.major}</span>}
                          <span
                            className="badge"
                            style={{
                              background: req.status === 'Accepted' ? '#dcfce7' : req.status === 'Pending' ? '#fff7ed' : '#fee2e2',
                              color: req.status === 'Accepted' ? '#15803d' : req.status === 'Pending' ? '#c2410c' : '#b91c1c',
                              border: `1px solid ${req.status === 'Accepted' ? '#86efac' : req.status === 'Pending' ? '#fed7aa' : '#fca5a5'}`,
                              fontWeight: 700,
                            }}
                          >
                            {req.status === 'Pending' ? 'Đang chờ duyệt' : req.status === 'Accepted' ? 'Đã chấp nhận' : req.status === 'Cancelled' ? 'Tự động hủy (BR-26)' : 'Đã từ chối'}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.875rem', color: '#334155', marginTop: 6, fontStyle: 'italic' }}>
                          &quot;{req.message || 'Mong muốn tham gia cùng nhóm phát triển đề tài.'}&quot;
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 4, fontFamily: 'var(--font-mono)' }}>
                          Gửi lúc: {formatDateTime(req.createdAt)}
                        </div>
                      </div>

                      {/* Vote Score Badges */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            padding: '0.3rem 0.65rem',
                            borderRadius: '6px',
                            background: '#dcfce7',
                            color: '#15803d',
                            border: '1px solid #86efac',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            fontFamily: 'var(--font-mono)',
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          <ThumbsUp size={13} /> {upvotes} Ủng hộ
                        </span>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            padding: '0.3rem 0.65rem',
                            borderRadius: '6px',
                            background: '#fee2e2',
                            color: '#b91c1c',
                            border: '1px solid #fca5a5',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            fontFamily: 'var(--font-mono)',
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          <ThumbsDown size={13} /> {downvotes} Phản đối
                        </span>
                      </div>
                    </div>

                    {/* Member votes and comments breakdown */}
                    {req.votes && req.votes.length > 0 && (
                      <div style={{ padding: '0.75rem 0.85rem', background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#64748b', marginBottom: '0.4rem', textTransform: 'uppercase' }}>
                          Ý kiến tham khảo của thành viên ({req.votes.length}):
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                          {req.votes.map((v, idx) => (
                            <div key={idx} style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'baseline', gap: '0.45rem', flexWrap: 'wrap' }}>
                              <span style={{ fontWeight: 700, color: v.isUpvote ? '#15803d' : '#b91c1c', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                                {v.isUpvote ? <ThumbsUp size={12} /> : <ThumbsDown size={12} />}
                                {v.isUpvote ? 'Ủng hộ' : 'Phản đối'}
                              </span>
                              <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{v.voterName}:</span>
                              <span style={{ color: '#475569' }}>{v.comment || '(Không có nhận xét)'}</span>
                              <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>({formatDateTime(v.votedAt)})</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Actions Row (Member Vote + Leader Decide) */}
                    {req.status === 'Pending' && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', paddingTop: '0.65rem', borderTop: '1px solid #e2e8f0' }}>
                        {/* Member Reference Vote Buttons */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                            {hasVoted ? 'Bạn đã bỏ phiếu tham khảo:' : 'Bỏ phiếu tham khảo (BR-25):'}
                          </span>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '0.25rem 0.6rem', fontSize: '0.76rem', color: '#15803d', borderColor: '#86efac', gap: '0.3rem' }}
                            onClick={() => setVoteCommentModal({ requestId: req.id, isUpvote: true })}
                          >
                            <ThumbsUp size={13} />
                            <span>Ủng hộ</span>
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '0.25rem 0.6rem', fontSize: '0.76rem', color: '#b91c1c', borderColor: '#fca5a5', gap: '0.3rem' }}
                            onClick={() => setVoteCommentModal({ requestId: req.id, isUpvote: false })}
                          >
                            <ThumbsDown size={13} />
                            <span>Phản đối</span>
                          </button>
                        </div>

                        {/* Leader Decision Buttons */}
                        {isLeader && (
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              style={{ background: '#008837', borderColor: '#008837' }}
                              onClick={() => void handleDecideJoinRequest(req.id, true)}
                            >
                              <Check size={14} /> Chấp thuận (Duyệt)
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              style={{ color: '#dc2626' }}
                              onClick={() => void handleDecideJoinRequest(req.id, false)}
                            >
                              <X size={14} /> Từ chối
                            </button>
                          </div>
                        )}
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
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB E: TRANSFER REQUESTS (BR-36) */}
      {activeTab === 'transfers' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.75rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                Đơn xin chuyển nhóm Hậu Chốt sổ của tôi (BR-36)
              </h3>
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Theo dõi tiến độ xét duyệt đơn xin chuyển nhóm hoặc đổi chéo gửi Trưởng phòng (Moderator).
              </p>
            </div>
            {pendingTransfer ? (
              <span className="badge badge-warning" style={{ fontSize: '0.8rem', padding: '0.45rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Clock size={14} /> Đang có đơn chờ xét duyệt
              </span>
            ) : approvedTransfer ? (
              <span className="badge badge-success" style={{ fontSize: '0.8rem', padding: '0.45rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <CheckCircle2 size={14} /> Đã hoàn tất điều chuyển
              </span>
            ) : (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => void openTransferModal()}
                style={{ gap: '0.35rem', fontWeight: 700 }}
              >
                <ArrowLeftRight size={14} /> Tạo đơn mới (BR-36)
              </button>
            )}
          </div>

          {myTransfers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-muted)' }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--bg-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.65rem auto' }}>
                <ArrowLeftRight size={20} />
              </div>
              <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.95rem' }}>
                Bạn chưa gửi đơn xin chuyển nhóm nào
              </div>
              <div style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>
                Nếu có nhu cầu chuyển sang nhóm khác hoặc đổi chéo với thành viên nhóm bạn, hãy bấm "Tạo đơn mới".
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {myTransfers.map((t) => (
                <div
                  key={t.id}
                  style={{
                    padding: '1rem',
                    borderRadius: 8,
                    background: 'var(--bg-main)',
                    border: '1px solid var(--border-light)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
                      <span style={{ fontWeight: 600, color: 'var(--fpt-blue)' }}>{t.fromGroupCode}</span>
                      <span>→</span>
                      <span style={{ fontWeight: 700, color: 'var(--fpt-orange)' }}>{t.targetGroupCode}</span>
                      {t.swapStudentId && (
                        <span className="badge" style={{ fontSize: '0.7rem', background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1' }}>
                          Đổi chéo: {t.swapStudentName} ({t.swapStudentCode})
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {t.status === 'Pending' && (
                        <>
                          <span className="badge badge-warning">Đang chờ duyệt</span>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ color: '#dc2626', borderColor: '#fca5a5', padding: '0.2rem 0.55rem', fontSize: '0.75rem', gap: '0.25rem' }}
                            onClick={() => void handleCancelTransferRequest(t.id)}
                            disabled={cancellingTransferId === t.id}
                            title="Hủy đơn xin chuyển nhóm này"
                          >
                            <X size={13} /> {cancellingTransferId === t.id ? 'Đang hủy...' : 'Hủy đơn'}
                          </button>
                        </>
                      )}
                      {t.status === 'Approved' && <span className="badge badge-success">Đã chấp thuận</span>}
                      {t.status === 'Rejected' && <span className="badge badge-danger">Đã từ chối</span>}
                      {t.status === 'Cancelled' && <span className="badge badge-secondary">Đã hủy</span>}
                    </div>
                  </div>

                  <div style={{ fontSize: '0.825rem', color: 'var(--text-main)' }}>
                    <strong>Lý do của bạn:</strong> {t.reason}
                  </div>

                  {t.decisionReason && (
                    <div style={{ fontSize: '0.8rem', color: t.status === 'Approved' ? '#059669' : '#dc2626', background: 'var(--bg-card)', padding: '0.45rem 0.65rem', borderRadius: 6, border: '1px solid var(--border-light)' }}>
                      <strong>Phản hồi từ Trưởng phòng:</strong> {t.decisionReason}
                    </div>
                  )}

                  <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}>
                    Gửi lúc: {new Date(t.requestedAt).toLocaleString('vi-VN')}
                    {t.decidedAt && ` • Phản hồi lúc: ${new Date(t.decidedAt).toLocaleString('vi-VN')}`}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Phase 4: Modal Đề cử Trưởng nhóm mới (BR-18, BR-19) */}
      {showNominateModal && (
        <div className="modal-overlay" onClick={() => setShowNominateModal(false)}>
          <div
            className="modal-content"
            style={{ maxWidth: 480, width: '92%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '0.85rem', borderBottom: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Vote size={20} style={{ color: 'var(--fpt-orange)' }} />
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>
                  Bầu chọn Trưởng nhóm mới (BR-18, BR-19)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowNominateModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (nominatedCandidateId) void handleStartElection(nominatedCandidateId);
              }}
              style={{ paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}
            >
              <div
                style={{
                  padding: '0.8rem 0.95rem',
                  borderRadius: 8,
                  background: 'rgba(242, 111, 33, 0.06)',
                  border: '1px solid rgba(242, 111, 33, 0.25)',
                  fontSize: '0.825rem',
                  lineHeight: 1.5,
                  color: 'var(--text-main)',
                }}
              >
                <strong>Quy chế bầu cử (BR-18, BR-19):</strong> Cuộc bầu chọn kéo dài tối đa <strong>24 giờ</strong>. Toàn bộ thành viên có quyền bỏ phiếu. Khi số phiếu đồng ý đạt <strong>&gt; 50%</strong> tổng sĩ số nhóm, quyền Trưởng nhóm sẽ được chuyển giao lập tức.
              </div>

              <div>
                <label style={{ fontSize: '0.825rem', fontWeight: 700, marginBottom: '0.45rem', display: 'block' }}>
                  Chọn thành viên bạn muốn đề cử làm Trưởng nhóm mới:
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: 220, overflowY: 'auto' }}>
                  {group.members
                    .filter((m) => m.userId !== user?.id && m.userId !== group.leaderId)
                    .map((m) => {
                      const prof = memberProfiles[m.userId];
                      const isSelected = nominatedCandidateId === m.userId;
                      return (
                        <div
                          key={m.userId}
                          onClick={() => setNominatedCandidateId(m.userId)}
                          style={{
                            padding: '0.65rem 0.85rem',
                            borderRadius: 8,
                            border: isSelected ? '2px solid #f26f21' : '1px solid #e2e8f0',
                            background: isSelected ? 'rgba(242, 111, 33, 0.05)' : '#fff',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-main)' }}>
                              {prof?.fullName || m.userId}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                              Tham gia từ: {formatDateTime(m.joinedAt)}
                            </div>
                          </div>
                          <input
                            type="radio"
                            name="candidateNominee"
                            checked={isSelected}
                            onChange={() => setNominatedCandidateId(m.userId)}
                          />
                        </div>
                      );
                    })}
                </div>
                {group.members.filter((m) => m.userId !== user?.id && m.userId !== group.leaderId).length === 0 && (
                  <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', fontStyle: 'italic', margin: '0.5rem 0 0 0' }}>
                    Không có thành viên nào khác để đề cử (nhóm hiện chỉ có bạn và Trưởng nhóm hiện tại).
                  </p>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid #e2e8f0' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowNominateModal(false)}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={!nominatedCandidateId || electionSubmitting}
                  className="btn btn-primary btn-sm"
                  style={{ gap: '0.35rem', fontWeight: 700 }}
                >
                  <Vote size={14} />
                  <span>{electionSubmitting ? 'Đang khởi tạo...' : 'Bắt đầu cuộc bầu chọn (24h)'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Phase 4: Modal Bỏ phiếu tham khảo ứng viên kèm nhận xét (BR-25) */}
      {voteCommentModal && (
        <div className="modal-overlay" onClick={() => setVoteCommentModal(null)}>
          <div
            className="modal-content"
            style={{ maxWidth: 440, width: '92%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '0.85rem', borderBottom: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                {voteCommentModal.isUpvote ? (
                  <ThumbsUp size={18} style={{ color: '#15803d' }} />
                ) : (
                  <ThumbsDown size={18} style={{ color: '#b91c1c' }} />
                )}
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>
                  Bỏ phiếu {voteCommentModal.isUpvote ? 'Ủng hộ' : 'Phản đối'} (BR-25)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setVoteCommentModal(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleVoteApplication(voteCommentModal.requestId, voteCommentModal.isUpvote, voteComment);
              }}
              style={{ paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}
            >
              <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
                Phiếu vote và nhận xét của bạn sẽ được hiển thị cho toàn đội và Trưởng nhóm tham khảo trước khi ra quyết định duyệt (BR-25).
              </p>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem', display: 'block' }}>
                  Ý kiến / Nhận xét của bạn (không bắt buộc):
                </label>
                <textarea
                  rows={3}
                  className="form-control"
                  placeholder="Ví dụ: Em thấy bạn này rất hợp vai trò Backend, kỹ năng khá tốt..."
                  value={voteComment}
                  onChange={(e) => setVoteComment(e.target.value)}
                  style={{ fontSize: '0.825rem', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid #e2e8f0' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setVoteCommentModal(null)}
                  disabled={votingApp}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={votingApp}
                  className="btn btn-primary btn-sm"
                  style={{
                    background: voteCommentModal.isUpvote ? '#008837' : '#dc2626',
                    borderColor: voteCommentModal.isUpvote ? '#008837' : '#dc2626',
                    gap: '0.35rem',
                    fontWeight: 700,
                  }}
                >
                  {voteCommentModal.isUpvote ? <ThumbsUp size={14} /> : <ThumbsDown size={14} />}
                  <span>{votingApp ? 'Đang gửi...' : 'Xác nhận bỏ phiếu'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Phase 4: Modal Mời ra khỏi nhóm kèm lý do bắt buộc & Audit Log (Phương án 3, BR-05) */}
      {kickModal && (
        <div className="modal-overlay" onClick={() => !isSubmittingKick && setKickModal(null)}>
          <div
            className="modal-content"
            style={{ maxWidth: 480, width: '92%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '0.85rem', borderBottom: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <UserMinus size={18} style={{ color: '#b91c1c' }} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>
                    Mời thành viên ra khỏi nhóm (BR-05)
                  </h3>
                  <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Thành viên: <strong style={{ color: 'var(--text-main)' }}>{kickModal.fullName}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !isSubmittingKick && setKickModal(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={(e) => void handleConfirmKick(e)}
              style={{ paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}
            >
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 12px', fontSize: '0.8rem', color: '#991b1b', lineHeight: 1.5 }}>
                <strong>Lưu ý quan trọng:</strong> Hành động này sẽ được ghi vào <strong>Nhật ký hệ thống (Audit Log)</strong>. Đồng thời một <strong>email thông báo chính thức kèm lý do</strong> sẽ được gửi tự động đến hòm thư sinh viên qua MailHog.
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem', display: 'block' }}>
                  Phân loại lý do <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <select
                  className="form-control"
                  value={kickCategory}
                  onChange={(e) => setKickCategory(e.target.value)}
                  style={{ fontSize: '0.825rem' }}
                >
                  <option value="Mất liên lạc / Không phản hồi (>48h)">Mất liên lạc / Không phản hồi (&gt;48h)</option>
                  <option value="Không hoàn thành nhiệm vụ / Bỏ bê dự án">Không hoàn thành nhiệm vụ / Bỏ bê dự án</option>
                  <option value="Không phù hợp định hướng đề tài / phong cách làm việc">Không phù hợp định hướng đề tài / phong cách làm việc</option>
                  <option value="Lý do cá nhân / Khác">Lý do cá nhân / Khác</option>
                </select>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, margin: 0 }}>
                    Giải trình lý do chi tiết <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <span style={{ fontSize: '0.725rem', color: kickReason.trim().length < 10 ? '#dc2626' : 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                    {kickReason.trim().length}/1000 (tối thiểu 10 ký tự)
                  </span>
                </div>
                <textarea
                  rows={4}
                  className="form-control"
                  placeholder="Nhập giải trình rõ ràng, lịch sự để gửi đến sinh viên (ví dụ: Thành viên không tham gia họp nhóm 3 buổi liên tiếp và không phản hồi tin nhắn phân chia task...)"
                  value={kickReason}
                  onChange={(e) => setKickReason(e.target.value)}
                  style={{ fontSize: '0.825rem', resize: 'vertical' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid #e2e8f0' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setKickModal(null)}
                  disabled={isSubmittingKick}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  style={{ background: '#dc2626', borderColor: '#b91c1c' }}
                  disabled={isSubmittingKick || kickReason.trim().length < 10}
                >
                  {isSubmittingKick ? 'Đang gửi thông báo...' : 'Xác nhận mời ra khỏi nhóm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Phase 6: Modal Tạo đơn xin chuyển nhóm (BR-36) */}
      {showTransferModal && (
        <div className="modal-overlay" onClick={() => setShowTransferModal(false)}>
          <div
            className="modal-content"
            style={{ maxWidth: 500, width: '92%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '0.85rem', borderBottom: '1px solid #e2e8f0', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(242, 111, 33, 0.1)', color: 'var(--fpt-orange)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ArrowLeftRight size={18} />
                </div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>
                  Tạo đơn xin chuyển nhóm (BR-36)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowTransferModal(false)}
                style={{ color: 'var(--text-muted)', padding: '0.25rem' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateTransferRequest} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.85rem' }}>
              <div>
                <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase' }}>
                  1. Chọn Nhóm đích muốn chuyển đến <span style={{ color: '#ef4444' }}>*</span>
                </label>
                {loadingAvailableRooms ? (
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Đang tải danh sách nhóm trong không gian...</div>
                ) : (
                  <select
                    className="form-control"
                    value={transferTargetGroupId}
                    onChange={(e) => handleTargetGroupChange(e.target.value)}
                    required
                    style={{ fontSize: '0.85rem' }}
                  >
                    <option value="">-- Chọn nhóm đích --</option>
                    {availableRooms.map((r) => {
                      const isFull = r.memberCount >= r.maxMembers;
                      return (
                        <option key={r.id} value={r.id}>
                          [{r.roomCode || r.name}] {r.name} ({r.memberCount}/{r.maxMembers} SV){isFull ? ' - ĐÃ ĐỦ (Cần đổi chéo)' : ''}
                        </option>
                      );
                    })}
                  </select>
                )}
              </div>

              {/* Thông tin nhóm đích & Cảnh báo BR-37 */}
              {selectedTargetRoom && (
                <div
                  style={{
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    background: 'var(--bg-main)',
                    border: '1px solid var(--border-light)',
                    fontSize: '0.8rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.35rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Sĩ số nhóm đích:</span>
                    <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', color: isTargetFull ? '#ef4444' : 'var(--fpt-blue)' }}>
                      {selectedTargetRoom.memberCount}/{selectedTargetRoom.maxMembers} SV {isTargetFull ? '(Đã đủ sĩ số)' : '(Còn chỗ)'}
                    </span>
                  </div>
                  {isTargetFull && (
                    <div style={{ color: '#b45309', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', lineHeight: 1.4 }}>
                      <AlertCircle size={14} style={{ flexShrink: 0 }} />
                      <span>Nhóm đích đã đạt sĩ số tối đa ({selectedTargetRoom.maxMembers} SV). Hệ thống tự động kích hoạt Đổi chéo 2 chiều (Swap) theo BR-37.</span>
                    </div>
                  )}
                  {isSourceAtThreshold && (
                    <div style={{ color: '#b91c1c', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', lineHeight: 1.4 }}>
                      <AlertCircle size={14} style={{ flexShrink: 0 }} />
                      <span>Nhóm hiện tại của bạn chỉ có {group?.members.length} SV (ngưỡng tối thiểu). Bắt buộc phải Đổi chéo 2 chiều (Swap) để bảo toàn sĩ số nhóm theo BR-37.</span>
                    </div>
                  )}
                </div>
              )}

              {/* Swap Checkbox & Swap Student */}
              <div
                style={{
                  padding: '0.75rem 0.85rem',
                  borderRadius: '8px',
                  background: 'var(--bg-main)',
                  border: '1px solid var(--border-light)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.65rem',
                }}
              >
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: isSwapMandatory ? 'not-allowed' : 'pointer', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                  <input
                    type="checkbox"
                    checked={transferIsSwap}
                    disabled={isSwapMandatory}
                    onChange={(e) => {
                      if (!isSwapMandatory) {
                        setTransferIsSwap(e.target.checked);
                        setTransferSwapStudentId('');
                      }
                    }}
                    style={{ width: 16, height: 16, accentColor: 'var(--fpt-orange)' }}
                  />
                  <span>Đổi chéo 2 chiều (Swap với 1 bạn ở nhóm đích)</span>
                </label>

                {transferIsSwap && (
                  <div>
                    <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                      Chọn sinh viên nhóm đích để đổi chéo ngược lại <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    {loadingTargetMembers ? (
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', padding: '0.35rem 0' }}>Đang nạp danh sách thành viên nhóm đích...</div>
                    ) : (
                      <select
                        className="form-control"
                        value={transferSwapStudentId}
                        onChange={(e) => setTransferSwapStudentId(e.target.value)}
                        disabled={!transferTargetGroupId || loadingTargetMembers}
                        required={transferIsSwap}
                        style={{ fontSize: '0.85rem' }}
                      >
                        <option value="">-- Chọn sinh viên đổi ngược --</option>
                        {targetGroupMembers.map((m) => (
                          <option key={m.userId} value={m.userId}>
                            {m.fullName} {m.role === 'Leader' ? '(Leader 👑)' : '(Thành viên)'}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase' }}>
                  2. Lý do xin chuyển nhóm (Bắt buộc theo BR-36) <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                  placeholder="Trình bày rõ lý do điều chuyển, thỏa thuận đổi chéo (nếu có) để Trưởng phòng phê duyệt..."
                  required
                  style={{ fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid #e2e8f0' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowTransferModal(false)}
                  disabled={submittingTransfer}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submittingTransfer || !transferTargetGroupId}
                  className="btn btn-primary btn-sm"
                  style={{ gap: '0.35rem', fontWeight: 700 }}
                >
                  <Send size={14} />
                  <span>{submittingTransfer ? 'Đang gửi đơn...' : 'Gửi đơn xin chuyển nhóm'}</span>
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <strong style={{ fontSize: '1.05rem', color: 'var(--text-main)' }}>
                    Nhóm: {r.groupName}
                  </strong>
                  <span
                    className="badge"
                    style={{
                      background:
                        r.status === 'Accepted'
                          ? '#dcfce7'
                          : r.status === 'Pending'
                          ? '#fff7ed'
                          : r.status === 'Cancelled'
                          ? '#f1f5f9'
                          : '#fee2e2',
                      color:
                        r.status === 'Accepted'
                          ? '#15803d'
                          : r.status === 'Pending'
                          ? '#c2410c'
                          : r.status === 'Cancelled'
                          ? '#475569'
                          : '#b91c1c',
                      border: `1px solid ${
                        r.status === 'Accepted'
                          ? '#86efac'
                          : r.status === 'Pending'
                          ? '#fed7aa'
                          : r.status === 'Cancelled'
                          ? '#cbd5e1'
                          : '#fca5a5'
                      }`,
                      fontWeight: 700,
                    }}
                  >
                    {r.status === 'Pending'
                      ? 'Đang chờ duyệt'
                      : r.status === 'Accepted'
                      ? 'Đã chấp nhận'
                      : r.status === 'Cancelled'
                      ? 'Tự động hủy do đã có nhóm (BR-26)'
                      : 'Đã từ chối (BR-28)'}
                  </span>

                  {((r.upvotes || 0) > 0 || (r.downvotes || 0) > 0) && (
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontFamily: 'var(--font-mono)',
                        fontVariantNumeric: 'tabular-nums',
                        color: '#64748b',
                        padding: '0.15rem 0.45rem',
                        borderRadius: 4,
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                      }}
                    >
                      👍 {r.upvotes || 0} • 👎 {r.downvotes || 0}
                    </span>
                  )}
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
