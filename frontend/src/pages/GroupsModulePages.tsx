import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSelectedSpace } from '../hooks/useSelectedSpace';
import {
  workspaceApi,
  errorMessage,
  formatDateTime,
  type CandidateProfile,
  type GroupDetail,
  type JoinRequest,
  type LeaderElection,
  type RoomSummary,
  type TransferRequest,
} from '../api/workspace';
import { StateBox, Modal, Button, useConfirm } from '../components/workspace/ui';
import { AiMentorCard } from '../components/AiMentorCard';
import {
  Sparkles,
  Search,
  X,
  LogOut,
  Edit3,
  CheckCircle2,
  Clock,
  Layers,
  Vote,
  ThumbsUp,
  ThumbsDown,
  Lock,
  Unlock,
  ArrowLeftRight,
  ShieldAlert,
  Send,
  TrendingUp,
  UserPlus,
  Users,
  AlertCircle,
} from '../utils/icons';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES & DỮ LIỆU THẬT
// Giao diện giữ nguyên bản thiết kế của Tú; dữ liệu lấy từ Group Service + User Service.
// ══════════════════════════════════════════════════════════════════════════════

export interface RoomMember {
  id: string;
  name: string;
  studentCode: string;
  classCode: string; // khóa (K18...) — FAP không trả lớp cho sinh viên khác
  major: string;
  role: 'Leader' | 'Member';
  avatarBg: string;
  avatarText: string;
  joinedAt: string;
}

export interface RoomItem {
  id: string;
  code: string;
  name: string;
  topic?: string;
  topicDesc?: string;
  status: 'Empty' | 'Forming' | 'Recruiting' | 'Closed' | 'Locked';
  currentMembers: number;
  maxMembers: number;
  members: RoomMember[];
  skillBalance?: number;
  neededSkills?: string[];
  isEarlyClosed?: boolean;
  avgSkills?: Record<SkillKey, number>;
}

const SKILLS = [
  { key: 'techScore', name: 'Tech', sub: 'Kỹ thuật & Lập trình' },
  { key: 'managementScore', name: 'Management', sub: 'Quản lý dự án & Vận hành' },
  { key: 'graphicDesignScore', name: 'Graphic Design', sub: 'Thiết kế UI/UX & Đồ họa' },
  { key: 'marketingScore', name: 'Marketing', sub: 'Truyền thông & Tăng trưởng' },
  { key: 'saleScore', name: 'Sale', sub: 'Kinh doanh & Bán hàng' },
] as const;

type SkillKey = (typeof SKILLS)[number]['key'];

/** Điểm trung bình từng kỹ năng của các thành viên có hồ sơ. */
const averageSkills = (profiles: CandidateProfile[]): Record<SkillKey, number> => {
  const result = { techScore: 0, managementScore: 0, graphicDesignScore: 0, marketingScore: 0, saleScore: 0 };
  if (profiles.length === 0) return result;
  for (const { key } of SKILLS) result[key] = Math.round(profiles.reduce((n, p) => n + (p[key] ?? 0), 0) / profiles.length);
  return result;
};

/** Tên phòng do hệ thống đặt sẵn ("EXE101 - Phòng 01") không phải đề tài do nhóm đặt. */
const isDefaultRoomName = (name: string) => /phòng\s*\d+\s*$/i.test(name.trim());

const toRoomStatus = (status: string): RoomItem['status'] =>
  status === 'Forming' || status === 'Recruiting' || status === 'Closed' || status === 'Locked' ? status : 'Empty';

const toRoomMember = (m: GroupDetail['members'][number], profile?: CandidateProfile): RoomMember => ({
  id: m.userId,
  name: m.fullName,
  studentCode: m.studentCode ?? '',
  classCode: profile?.cohort ?? '',
  major: profile?.major ?? '',
  role: m.role === 'Leader' ? 'Leader' : 'Member',
  avatarBg: '#F1F5F9',
  avatarText: '#334155',
  joinedAt: formatDateTime(m.joinedAt),
});

const toRoomItem = (room: RoomSummary, detail: GroupDetail | undefined, profiles: Map<string, CandidateProfile>): RoomItem => {
  const memberProfiles = (detail?.members ?? []).map((m) => profiles.get(m.userId)).filter(Boolean) as CandidateProfile[];
  const avg = averageSkills(memberProfiles);
  const values = Object.values(avg);
  const name = detail?.name ?? room.name;
  return {
    id: room.id,
    code: room.roomCode ?? room.name,
    name,
    topic: isDefaultRoomName(name) ? undefined : name,
    topicDesc: detail?.description ?? undefined,
    status: toRoomStatus(room.status),
    currentMembers: room.memberCount,
    maxMembers: room.maxMembers,
    members: (detail?.members ?? []).map((m) => toRoomMember(m, profiles.get(m.userId))),
    skillBalance: memberProfiles.length ? Math.max(0, 100 - (Math.max(...values) - Math.min(...values))) : undefined,
    neededSkills: memberProfiles.length ? SKILLS.filter((s) => avg[s.key] < 50).map((s) => s.name) : undefined,
    isEarlyClosed: detail?.isClosedByLeader,
    avgSkills: memberProfiles.length ? avg : undefined,
  };
};

/** Hồ sơ công khai theo lô (API giới hạn 100 id mỗi lần). */
const loadProfiles = async (ids: string[]): Promise<Map<string, CandidateProfile>> => {
  const unique = [...new Set(ids)];
  const chunks: string[][] = [];
  for (let i = 0; i < unique.length; i += 100) chunks.push(unique.slice(i, i + 100));
  const lists = await Promise.all(chunks.map((c) => workspaceApi.getProfiles(c).catch(() => [] as CandidateProfile[])));
  return new Map(lists.flat().map((p) => [p.userId, p]));
};

const NoSpace: React.FC<{ loading: boolean; error: string | null; student: boolean }> = ({ loading, error, student }) => (
  <div style={{ maxWidth: 1560, margin: '0 auto', paddingBottom: '3.5rem' }}>
    <StateBox
      kind={loading ? 'loading' : error ? 'error' : 'empty'}
      title={loading ? undefined : 'Chưa có không gian môn học'}
      message={
        error ??
        (loading
          ? 'Đang tải...'
          : student
          ? 'Bạn chưa có tên trong danh sách FAP của môn học nào. Vui lòng liên hệ Điều phối viên.'
          : 'Điều phối viên chưa tạo không gian môn học nào.')
      }
    />
  </div>
);

// ══════════════════════════════════════════════════════════════════════════════
// 1. GROUPS PAGE (/groups)
// ══════════════════════════════════════════════════════════════════════════════
export const GroupsPage: React.FC = () => {
  const { user } = useAuth();
  const { space, loading: spacesLoading, error: spacesError } = useSelectedSpace();

  const [rooms, setRooms] = useState<RoomItem[]>([]);
  const [myGroupId, setMyGroupId] = useState<string | null>(null);
  const [filterTab, setFilterTab] = useState<string>('ALL');
  const [slotFilter, setSlotFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Apply Modal state
  const [applyModalRoom, setApplyModalRoom] = useState<RoomItem | null>(null);
  const [applyIntro, setApplyIntro] = useState('');

  // Staff Inspection Modal state (Moderator / Lecturer)
  const [inspectRoomModal, setInspectRoomModal] = useState<RoomItem | null>(null);

  const isStaff = user?.role === 'Moderator' || user?.role === 'Lecturer';

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const spaceId = space?.id;
  const loadRooms = useCallback(async () => {
    if (!spaceId) return;
    try {
      const list = (await workspaceApi.listRooms(spaceId)).filter((r) => r.status !== 'Disbanded');
      const details = await Promise.all(list.filter((r) => r.memberCount > 0).map((r) => workspaceApi.getGroup(r.id).catch(() => null)));
      const detailById = new Map(details.filter((d): d is GroupDetail => !!d).map((d) => [d.id, d]));
      const profiles = await loadProfiles([...detailById.values()].flatMap((d) => d.members.map((m) => m.userId)));
      setRooms(
        list
          .sort((a, b) => (a.roomCode ?? a.name).localeCompare(b.roomCode ?? b.name))
          .map((r) => toRoomItem(r, detailById.get(r.id), profiles))
      );
      if (!isStaff) setMyGroupId((await workspaceApi.getMyGroup(spaceId).catch(() => null))?.id ?? null);
    } catch (err) {
      showToast(errorMessage(err, 'Không tải được danh sách phòng.'));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spaceId, isStaff]);

  useEffect(() => {
    setRooms([]);
    void loadRooms();
  }, [loadRooms]);

  // Cập nhật realtime khi có bất kỳ thay đổi nào về phòng, nhóm, sĩ số
  useEffect(() => {
    const handleRealtime = () => void loadRooms();
    window.addEventListener('realtime:space-updated', handleRealtime);
    window.addEventListener('realtime:group-updated', handleRealtime);
    return () => {
      window.removeEventListener('realtime:space-updated', handleRealtime);
      window.removeEventListener('realtime:group-updated', handleRealtime);
    };
  }, [loadRooms]);

  // Tương tác trực tiếp: Tham gia ngay (Vào thẳng)
  const handleDirectJoin = async (roomCode: string) => {
    const room = rooms.find((r) => r.code === roomCode);
    if (!room) return;
    try {
      const res = await workspaceApi.directJoin(room.id);
      showToast(res.message || `Bạn đã tham gia thành công phòng ${room.code}!`);
      await loadRooms();
    } catch (err) {
      showToast(errorMessage(err));
    }
  };

  // Nộp đơn ứng tuyển
  const handleConfirmApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applyModalRoom) return;
    try {
      await workspaceApi.createJoinRequest(applyModalRoom.id, applyIntro.trim());
      showToast(`Đã nộp đơn ứng tuyển vào nhóm ${applyModalRoom.code} thành công! Nhóm trưởng và thành viên sẽ tiến hành biểu quyết xét duyệt.`);
      setApplyModalRoom(null);
      setApplyIntro('');
    } catch (err) {
      showToast(errorMessage(err));
    }
  };

  // Bộ lọc danh sách phòng
  const filteredRooms = useMemo(
    () =>
      rooms.filter((r) => {
        // Tab filter
        if (filterTab === 'EMPTY' && r.status !== 'Empty') return false;
        if (filterTab === 'FORMING' && r.status !== 'Forming') return false;
        if (filterTab === 'RECRUITING' && r.status !== 'Recruiting') return false;
        if (filterTab === 'CLOSED' && r.status !== 'Closed') return false;
        if (filterTab === 'LOCKED' && r.status !== 'Locked') return false;

        // Slot filter
        const remaining = r.maxMembers - r.currentMembers;
        if (slotFilter === '1' && remaining !== 1) return false;
        if (slotFilter === '2-3' && (remaining < 2 || remaining > 3)) return false;
        if (slotFilter === '4-5' && remaining < 4) return false;

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchCode = r.code.toLowerCase().includes(q);
          const matchName = r.name.toLowerCase().includes(q);
          const matchTopic = (r.topic || '').toLowerCase().includes(q);
          const matchMember = r.members.some((m) => m.name.toLowerCase().includes(q));
          if (!matchCode && !matchName && !matchTopic && !matchMember) return false;
        }

        return true;
      }),
    [rooms, filterTab, slotFilter, searchQuery]
  );

  if (!space) return <NoSpace loading={spacesLoading} error={spacesError} student={!isStaff} />;

  return (
    <div style={{ maxWidth: 1560, margin: '0 auto', paddingBottom: '3.5rem' }}>
      {/* FPT Tricolor Brand Identity Line */}
      <div className="fpt-tricolor-bar" style={{ height: 3.5, borderRadius: 2, marginBottom: '1.25rem' }} />

      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: 24,
            right: 24,
            zIndex: 9999,
            backgroundColor: '#0F172A',
            color: '#FFFFFF',
            padding: '12px 20px',
            borderRadius: 12,
            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          <CheckCircle2 size={18} color="#22C55E" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* BR-07 Profile Incomplete Banner for Student */}
      {user?.role === 'Student' && !user?.isProfileCompleted && (
        <div
          style={{
            padding: '12px 18px',
            borderRadius: 12,
            backgroundColor: 'var(--bg-card, #FFFFFF)',
            border: '1px solid var(--border-light, #E2E8F0)',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, backgroundColor: 'var(--bg-subtle, #F8FAFC)', border: '1px solid var(--border-light, #E2E8F0)', color: 'var(--text-secondary, #334155)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <AlertCircle size={18} />
            </div>
            <div>
              <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-main, #0F172A)' }}>
                Yêu cầu hoàn tất Hồ sơ 5 Kỹ năng cốt lõi (BR-07)
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted, #64748B)', marginTop: 2 }}>
                Vui lòng cập nhật điểm 5 kỹ năng và cam kết trách nhiệm cá nhân để mở khóa quyền vào phòng và nộp đơn ứng tuyển.
              </div>
            </div>
          </div>
          <Link to="/profile" style={{ textDecoration: 'none' }}>
            <button
              type="button"
              style={{
                padding: '7px 15px',
                borderRadius: 8,
                backgroundColor: 'var(--fpt-orange, #F26F21)',
                color: '#FFFFFF',
                border: 'none',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cập nhật ngay →
            </button>
          </Link>
        </div>
      )}

      {/* C. Page Header — EdTech Product Structure: Breadcrumb + Large Title + Concise Description */}
      <div style={{ marginBottom: '1.5rem' }}>
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
          <span style={{ color: 'var(--text-main, #0F172A)', fontWeight: 500 }}>Phòng nhóm</span>
        </div>

        <h1
          style={{
            fontSize: '1.75rem',
            fontWeight: 650,
            color: 'var(--text-main, #0F172A)',
            margin: '0 0 0.35rem 0',
            letterSpacing: '-0.022em',
            lineHeight: 1.25,
          }}
        >
          Phòng & Nhóm Học Phần EXE
        </h1>
        <p
          style={{
            color: 'var(--text-muted, #64748B)',
            fontSize: '0.95rem',
            fontWeight: 400,
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          Tìm kiếm đồng đội liên ngành, tham gia các phòng khởi nghiệp đang mở hoặc ứng tuyển vào nhóm phù hợp.
        </p>
      </div>

      {myGroupId && (
        <div style={{ padding: '12px 16px', borderRadius: 12, backgroundColor: 'var(--bg-card, #FFFFFF)', border: '1px solid var(--border-light, #E2E8F0)', color: 'var(--text-main, #0F172A)', fontSize: '14px', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10B981', flexShrink: 0 }} />
            Bạn đã có nhóm trong học phần này ({rooms.find((r) => r.id === myGroupId)?.code ?? ''}).
          </span>
          <Link to="/my-group" style={{ color: 'var(--accent-color, #F26F21)', textDecoration: 'none', fontWeight: 650 }}>
            Mở Nhóm của tôi →
          </Link>
        </div>
      )}

      {/* D. Filter & Search Toolbar — Flat Segmented Control (clear active state, no shadow/gradient) + Secondary Search & Filter */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          flexWrap: 'wrap',
          marginBottom: '1.5rem',
          paddingBottom: '1rem',
          borderBottom: '1px solid var(--border-subtle, #F1F5F9)',
        }}
      >
        {/* 1. Primary Component: Flat Segmented Control with High-Contrast Active State (No shadow, no gradient) */}
        <div
          style={{
            display: 'inline-flex',
            flexWrap: 'wrap',
            gap: '3px',
            padding: '4px',
            borderRadius: 10,
            backgroundColor: 'var(--bg-tag, #F1F5F9)',
            border: '1px solid var(--border-light, #E2E8F0)',
          }}
        >
          {[
            { key: 'ALL', label: 'Tất cả', count: rooms.length },
            { key: 'EMPTY', label: 'Phòng trống', count: rooms.filter((r) => r.status === 'Empty').length },
            { key: 'FORMING', label: 'Đang lập nhóm', count: rooms.filter((r) => r.status === 'Forming').length },
            { key: 'RECRUITING', label: 'Đang tuyển', count: rooms.filter((r) => r.status === 'Recruiting').length },
            { key: 'CLOSED', label: 'Đã đóng tuyển', count: rooms.filter((r) => r.status === 'Closed').length },
            { key: 'LOCKED', label: 'Đã chốt sổ', count: rooms.filter((r) => r.status === 'Locked').length },
          ].map((tab) => {
            const active = filterTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                className={`motion-tab-pill${active ? ' is-active-tab' : ''}`}
                onClick={() => setFilterTab(tab.key)}
                style={{
                  padding: '6px 13px',
                  borderRadius: 7,
                  fontSize: '13.5px',
                  fontWeight: active ? 500 : 450,
                  cursor: 'pointer',
                  border: 'none',
                  backgroundColor: active ? 'var(--pill-active-bg, #0F172A)' : 'transparent',
                  color: active ? 'var(--pill-active-text, #FFFFFF)' : 'var(--text-secondary, #475569)',
                  boxShadow: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '7px',
                  whiteSpace: 'nowrap',
                }}
              >
                <span>{tab.label}</span>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 500,
                    padding: '1px 6.5px',
                    borderRadius: 999,
                    backgroundColor: active ? 'rgba(255, 255, 255, 0.2)' : 'var(--border-light, #E2E8F0)',
                    color: active ? 'var(--pill-active-text, #FFFFFF)' : 'var(--text-muted, #64748B)',
                    fontVariantNumeric: 'tabular-nums',
                    transition: 'background-color 180ms ease, color 180ms ease',
                  }}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* 2. Secondary Search + 3. Advanced Slot Filter (Aligned on 38px height baseline) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div className="motion-search-wrap" style={{ position: 'relative', width: 'min(100%, 256px)' }}>
            <Search size={15} className="motion-search-icon" style={{ position: 'absolute', left: 12, top: 11.5, color: 'var(--text-light, #94A3B8)', pointerEvents: 'none' }} />
            <input
              type="text"
              className="motion-search-input"
              aria-label="Tìm mã phòng, tên, đề tài hoặc thành viên"
              placeholder="Tìm mã phòng, tên, đề tài..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                height: 38,
                paddingLeft: '2.15rem',
                paddingRight: searchQuery ? '2rem' : '0.85rem',
                borderRadius: 8,
                border: '1px solid var(--border-light, #E2E8F0)',
                backgroundColor: 'var(--bg-subtle, #F8FAFC)',
                fontSize: '13.5px',
                fontWeight: 400,
                color: 'var(--text-main, #0F172A)',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            {searchQuery && (
              <button
                type="button"
                className="motion-clear-btn"
                aria-label="Xóa từ khóa tìm phòng"
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: 7,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: 22,
                  height: 22,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-muted, #64748B)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                <X size={13} />
              </button>
            )}
          </div>

          <select
            value={slotFilter}
            onChange={(e) => setSlotFilter(e.target.value)}
            aria-label="Bộ lọc nâng cao theo số chỗ trống"
            title="Bộ lọc nâng cao theo số chỗ trống"
            style={{
              height: 38,
              padding: '0 12px',
              borderRadius: 8,
              border: '1px solid var(--border-light, #E2E8F0)',
              backgroundColor: 'var(--bg-card, #FFFFFF)',
              fontSize: '13.5px',
              fontWeight: 450,
              color: 'var(--text-secondary, #475569)',
              outline: 'none',
              cursor: 'pointer',
              transition: 'border-color 165ms ease, box-shadow 165ms ease',
            }}
          >
            <option value="ALL">Chỗ trống: Tất cả</option>
            <option value="1">Còn 1 vị trí</option>
            <option value="2-3">Còn 2–3 vị trí</option>
            <option value="4-5">Còn 4–5 vị trí</option>
          </select>
        </div>
      </div>

      {/* A. 4-Column Room Cards Grid — Equal Row Height (No Staircase), Balanced Zones & Readable SaaS Scale */}
      {filteredRooms.length === 0 ? (
        <StateBox
          kind="empty"
          title={rooms.length === 0 ? 'Chưa có phòng nhóm nào trong học phần' : 'Không tìm thấy phòng phù hợp'}
          message={
            rooms.length === 0
              ? 'Điều phối viên chưa khởi tạo danh sách phòng cho không gian học phần này.'
              : 'Thử điều chỉnh từ khóa tìm kiếm hoặc đặt lại bộ lọc trạng thái phòng.'
          }
          action={
            rooms.length > 0 && (filterTab !== 'ALL' || slotFilter !== 'ALL' || searchQuery.trim() !== '') ? (
              <Button
                variant="outline"
                onClick={() => {
                  setFilterTab('ALL');
                  setSlotFilter('ALL');
                  setSearchQuery('');
                }}
              >
                Xóa bộ lọc
              </Button>
            ) : undefined
          }
        />
      ) : (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))',
          gap: '1.15rem',
          alignItems: 'stretch',
        }}
      >
        {filteredRooms.map((room, idx) => {
          const isDirectJoin = room.status === 'Empty' || room.status === 'Forming';
          const isRecruiting = room.status === 'Recruiting';
          const isClosed = room.status === 'Closed';
          const isLocked = room.status === 'Locked';
          const remainingSlots = Math.max(0, room.maxMembers - room.currentMembers);

          return (
            <div
              key={room.id}
              className="motion-card-interactive motion-stagger-item"
              style={
                {
                  '--stagger-index': Math.min(idx, 7),
                  backgroundColor: 'var(--bg-card, #FFFFFF)',
                  border: '1px solid var(--border-light, #E2E8F0)',
                  borderRadius: '14px',
                  padding: '20px 22px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  height: '100%',
                } as React.CSSProperties
              }
            >
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                {/* ZONE 1: Low-Priority Room Code + Medium-Priority Semantic Status Badge */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span
                    style={{
                      fontVariantNumeric: 'tabular-nums',
                      fontWeight: 400,
                      fontSize: '13px',
                      color: 'var(--text-muted, #64748B)',
                    }}
                  >
                    {room.code}
                  </span>

                  {room.status === 'Forming' && (
                    <span
                      style={{
                        fontSize: '12.5px',
                        fontWeight: 500,
                        color: 'var(--text-secondary, #334155)',
                        backgroundColor: 'var(--bg-subtle, #F8FAFC)',
                        border: '1px solid var(--border-light, #E2E8F0)',
                        padding: '3px 9px',
                        borderRadius: 6,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        whiteSpace: 'nowrap',
                        letterSpacing: '-0.005em',
                      }}
                    >
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          backgroundColor: '#10B981',
                          boxShadow: '0 0 0 2px rgba(16, 185, 129, 0.18)',
                          flexShrink: 0,
                        }}
                      />
                      Đang lập nhóm
                    </span>
                  )}
                  {room.status === 'Recruiting' && (
                    <span
                      style={{
                        fontSize: '12.5px',
                        fontWeight: 500,
                        color: 'var(--text-secondary, #334155)',
                        backgroundColor: 'var(--bg-subtle, #F8FAFC)',
                        border: '1px solid var(--border-light, #E2E8F0)',
                        padding: '3px 9px',
                        borderRadius: 6,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        whiteSpace: 'nowrap',
                        letterSpacing: '-0.005em',
                      }}
                    >
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          backgroundColor: 'var(--status-recruiting, #F26F21)',
                          boxShadow: '0 0 0 2px var(--accent-soft, rgba(242, 111, 33, 0.2))',
                          flexShrink: 0,
                        }}
                      />
                      Đang tuyển
                    </span>
                  )}
                  {(room.status === 'Empty' || room.status === 'Closed' || room.status === 'Locked') && (
                    <span
                      style={{
                        fontSize: '12.5px',
                        fontWeight: 500,
                        color: 'var(--text-muted, #64748B)',
                        backgroundColor: 'var(--bg-subtle, #F8FAFC)',
                        border: '1px solid var(--border-light, #E2E8F0)',
                        padding: '3px 9px',
                        borderRadius: 6,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        whiteSpace: 'nowrap',
                        letterSpacing: '-0.005em',
                      }}
                    >
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          backgroundColor: '#94A3B8',
                          flexShrink: 0,
                        }}
                      />
                      {room.status === 'Empty'
                        ? 'Phòng trống'
                        : room.status === 'Closed'
                        ? 'Đã đóng tuyển'
                        : 'Đã chốt sổ'}
                    </span>
                  )}
                </div>

                {/* ZONE 2: High-Priority Room Name & Standardized Project Topic Zone (Fixed min-height so divider lines align across row) */}
                <h3
                  style={{
                    fontSize: '17.5px',
                    fontWeight: 600,
                    color: 'var(--text-main, #0F172A)',
                    margin: '0 0 8px 0',
                    letterSpacing: '-0.015em',
                  }}
                >
                  {room.name}
                </h3>

                <div style={{ minHeight: 64, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
                  {room.topic ? (
                    <div>
                      {/* High-Priority Project Topic Title */}
                      <div
                        style={{
                          fontSize: '14.5px',
                          fontWeight: 600,
                          color: 'var(--text-main, #0F172A)',
                          lineHeight: 1.38,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                        title={room.topic}
                      >
                        {room.topic}
                      </div>
                      {/* Low-Priority Secondary Description (1-line clamp to prevent crowding) */}
                      {room.topicDesc && (
                        <div
                          style={{
                            fontSize: '13px',
                            fontWeight: 400,
                            color: 'var(--text-muted, #64748B)',
                            marginTop: '3px',
                            lineHeight: 1.4,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                          title={room.topicDesc}
                        >
                          {room.topicDesc}
                        </div>
                      )}
                      {/* Quiet Neutral Metadata for Recruiting Needs */}
                      {isRecruiting && (room.neededSkills?.length || room.skillBalance) && (
                        <div
                          style={{
                            fontSize: '12.5px',
                            fontWeight: 400,
                            color: 'var(--text-muted, #64748B)',
                            marginTop: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            flexWrap: 'wrap',
                          }}
                        >
                          {room.neededSkills && room.neededSkills.length > 0 && (
                            <span>
                              Cần thêm: <span style={{ color: 'var(--text-main, #0F172A)', fontWeight: 500 }}>{room.neededSkills.join(', ')}</span>
                            </span>
                          )}
                          {room.skillBalance && (
                            <>
                              <span style={{ color: '#CBD5E1' }}>·</span>
                              <span style={{ fontVariantNumeric: 'tabular-nums' }}>Cân bằng {room.skillBalance}%</span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  ) : room.status === 'Empty' ? (
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-secondary, #475569)', lineHeight: 1.38 }}>
                        Chưa đăng ký đề tài dự án
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: 400, color: '#94A3B8', marginTop: '3px' }}>
                        Mở tự do cho nhóm mới định hướng ý tưởng
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-secondary, #334155)', lineHeight: 1.38 }}>
                        Đang thảo luận ý tưởng khởi nghiệp
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: 400, color: 'var(--text-muted, #64748B)', marginTop: '3px' }}>
                        Chốt đề tài chính thức khi đủ 3 thành viên
                      </div>
                    </div>
                  )}
                </div>

                {/* Micro 5-Skill Distribution Meter */}
                {room.avgSkills && (
                  <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed var(--border-light, #E2E8F0)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '5px' }}>
                      {[
                        { label: 'Tech', val: room.avgSkills.techScore, color: 'var(--accent-color, #F26F21)' },
                        { label: 'Mgt', val: room.avgSkills.managementScore, color: 'var(--accent-color, #F26F21)' },
                        { label: 'Des', val: room.avgSkills.graphicDesignScore, color: 'var(--accent-color, #F26F21)' },
                        { label: 'Mkt', val: room.avgSkills.marketingScore, color: 'var(--accent-color, #F26F21)' },
                        { label: 'Sale', val: room.avgSkills.saleScore, color: 'var(--accent-color, #F26F21)' },
                      ].map((sk) => (
                        <div key={sk.label} title={`${sk.label}: ${sk.val}%`} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <div style={{ height: 4, borderRadius: 2, backgroundColor: 'var(--border-light, #E2E8F0)', overflow: 'hidden' }}>
                            <div style={{ width: `${sk.val}%`, height: '100%', backgroundColor: sk.color, borderRadius: 2 }} />
                          </div>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted, #64748B)', textAlign: 'center', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                            {sk.label} {sk.val}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Clear Divider between Project Info and Member Roster */}
                <div
                  style={{
                    height: 1,
                    backgroundColor: 'var(--bg-tag, #F1F5F9)',
                    margin: '14px 0',
                  }}
                />

                {/* ZONE 3: Member Roster + Controlled Progress Bar (Flex-1 so all cards in a row share equal bottom baseline) */}
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '7px',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '13px',
                        fontWeight: 500,
                        color: 'var(--text-secondary, #475569)',
                      }}
                    >
                      Thành viên
                    </span>
                    <span
                      style={{
                        fontSize: '13px',
                        fontWeight: 500,
                        color: 'var(--text-muted, #64748B)',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {room.currentMembers} / {room.maxMembers}
                    </span>
                  </div>

                  {/* 5-Segment Progress Bar (Synced with user's chosen accent/progress color) */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: `repeat(${room.maxMembers}, 1fr)`,
                      gap: '5px',
                      marginBottom: '14px',
                    }}
                  >
                    {Array.from({ length: room.maxMembers }).map((_, idx) => {
                      const isFilled = idx < room.currentMembers;
                      return (
                        <div
                          key={idx}
                          className={isFilled ? 'motion-progress-fill' : undefined}
                          style={{
                            height: 4,
                            borderRadius: 999,
                            backgroundColor: isFilled
                              ? 'var(--accent-color, #F26F21)'
                              : 'var(--border-light, #E2E8F0)',
                          }}
                        />
                      );
                    })}
                  </div>

                  {/* Member Rows or Proportional Empty/Privacy State */}
                  {(isClosed || isLocked) && !isStaff ? (
                    <div
                      style={{
                        flex: 1,
                        padding: '14px',
                        borderRadius: 10,
                        backgroundColor: 'var(--bg-subtle, #F8FAFC)',
                        border: '1px solid var(--border-subtle, #F1F5F9)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        gap: '4px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13.5px', fontWeight: 500, color: 'var(--text-secondary, #334155)' }}>
                        <Lock size={14} color="#64748B" style={{ flexShrink: 0 }} />
                        <span>Danh sách thành viên được bảo mật</span>
                      </div>
                      <div style={{ fontSize: '12.5px', fontWeight: 400, color: 'var(--text-muted, #64748B)', paddingLeft: '22px', lineHeight: 1.45 }}>
                        Phòng đã hoàn tất ghép đội hoặc khóa sổ học kỳ.
                      </div>
                    </div>
                  ) : room.members.length === 0 ? (
                    /* Proportional Empty State for Card 01 (Fills roster zone naturally so Card 01 aligns with Row 1) */
                    <div
                      style={{
                        flex: 1,
                        padding: '14px',
                        borderRadius: 10,
                        backgroundColor: 'var(--bg-subtle, #F8FAFC)',
                        border: '1px dashed var(--border-light, #E2E8F0)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        gap: '5px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13.5px', fontWeight: 500, color: 'var(--text-secondary, #334155)' }}>
                        <UserPlus size={15} color="#64748B" style={{ flexShrink: 0 }} />
                        <span>Chưa có thành viên tham gia</span>
                      </div>
                      <div style={{ fontSize: '12.5px', fontWeight: 400, color: 'var(--text-muted, #64748B)', paddingLeft: '23px', lineHeight: 1.45 }}>
                        Sinh viên vào đầu tiên giữ vai trò Nhóm trưởng. Cổng vào thẳng mở tự do đến {space.groupThreshold}/{room.maxMembers}.
                      </div>
                    </div>
                  ) : (
                    /* Single-line Member Rows + Remaining Open Slots Indicator at Bottom of Roster */
                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flex: 1, gap: '10px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
                        {room.members.map((m) => {
                          const shortMajorMatch = m.major.match(/\(([^)]+)\)/);
                          const shortMajor = shortMajorMatch ? shortMajorMatch[1] : m.major;
                          return (
                            <div
                              key={m.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '8px',
                                minHeight: 26,
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '9px', minWidth: 0 }}>
                                <span
                                  style={{
                                    width: 26,
                                    height: 26,
                                    borderRadius: '50%',
                                    backgroundColor: 'var(--bg-tag, #F1F5F9)',
                                    color: 'var(--text-secondary, #334155)',
                                    border: '1px solid var(--border-light, #E2E8F0)',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '12px',
                                    fontWeight: 500,
                                    flexShrink: 0,
                                  }}
                                >
                                  {m.name.charAt(0)}
                                </span>
                                <span
                                  style={{
                                    fontSize: '14px',
                                    fontWeight: 500,
                                    color: 'var(--text-main, #0F172A)',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                  }}
                                >
                                  {m.name}
                                </span>
                                {m.role === 'Leader' && (
                                  <span
                                    title="Trưởng nhóm"
                                    style={{
                                      fontSize: '11.5px',
                                      fontWeight: 500,
                                      color: 'var(--text-secondary, #475569)',
                                      backgroundColor: 'var(--bg-tag, #F1F5F9)',
                                      padding: '1.5px 6px',
                                      borderRadius: 5,
                                      flexShrink: 0,
                                      whiteSpace: 'nowrap',
                                    }}
                                  >
                                    Leader
                                  </span>
                                )}
                              </div>

                              {/* Low-Priority Metadata: Major Code & Class Code (Never bolded) */}
                              <span
                                style={{
                                  fontVariantNumeric: 'tabular-nums',
                                  fontWeight: 400,
                                  fontSize: '12.5px',
                                  color: 'var(--text-muted, #64748B)',
                                  flexShrink: 0,
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {[shortMajor, m.classCode].filter(Boolean).join(' · ')}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      {remainingSlots > 0 && (
                        <div
                          style={{
                            padding: '6px 10px',
                            borderRadius: 7,
                            backgroundColor: 'var(--bg-subtle, #F8FAFC)',
                            fontSize: '12.5px',
                            fontWeight: 400,
                            color: 'var(--text-muted, #64748B)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <span>+ Còn {remainingSlots} vị trí trống</span>
                          <span style={{ color: '#94A3B8' }}>{isDirectJoin ? 'Mở tự do' : 'Xét duyệt'}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* ZONE 4: Card Footer — Pinned at Bottom so all 4 Cards Align Horizontally */}
              <div
                style={{
                  borderTop: '1px solid var(--border-subtle, #F1F5F9)',
                  paddingTop: '13px',
                  marginTop: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                }}
              >
                <span
                  style={{
                    fontSize: '13px',
                    fontWeight: 400,
                    color: 'var(--text-muted, #64748B)',
                  }}
                >
                  {isDirectJoin && `Còn ${remainingSlots} vị trí · Vào thẳng`}
                  {isRecruiting && `Còn ${remainingSlots} vị trí · Duyệt đơn`}
                  {isClosed && `Đủ ${room.currentMembers}/${room.maxMembers} thành viên`}
                  {isLocked && 'Đã khóa sổ học kỳ'}
                </span>

                {isStaff ? (
                  <button
                    type="button"
                    className="motion-cta-btn"
                    onClick={() => setInspectRoomModal(room)}
                    style={{
                      padding: '6.5px 13px',
                      borderRadius: 8,
                      backgroundColor: 'var(--bg-subtle, #F8FAFC)',
                      border: '1px solid var(--border-light, #E2E8F0)',
                      color: 'var(--text-main, #0F172A)',
                      fontSize: '13px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <span>Xem chi tiết</span>
                    <span className="motion-arrow">→</span>
                  </button>
                ) : (
                  <>
                    {isDirectJoin && (
                      <button
                        type="button"
                        className="motion-cta-btn"
                        onClick={() => handleDirectJoin(room.code)}
                        style={{
                          padding: '6.5px 13px',
                          borderRadius: 8,
                          backgroundColor: 'var(--bg-subtle, #F8FAFC)',
                          border: '1px solid var(--border-light, #E2E8F0)',
                          color: 'var(--text-main, #0F172A)',
                          fontSize: '13px',
                          fontWeight: 500,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <span>Tham gia</span>
                        <span className="motion-arrow">→</span>
                      </button>
                    )}

                    {isRecruiting && (
                      <button
                        type="button"
                        className="motion-cta-btn"
                        onClick={() => setApplyModalRoom(room)}
                        style={{
                          padding: '6.5px 13px',
                          borderRadius: 8,
                          background: 'var(--accent-gradient, var(--accent-color, #F26F21))',
                          border: 'none',
                          color: '#FFFFFF',
                          fontSize: '13px',
                          fontWeight: 500,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <span>Ứng tuyển</span>
                        <span className="motion-arrow">→</span>
                      </button>
                    )}

                    {(isClosed || isLocked) && (
                      <span
                        style={{
                          fontSize: '12.5px',
                          fontWeight: 400,
                          color: '#94A3B8',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <Lock size={12} />
                        <span>{isClosed ? 'Đã đóng' : 'Chỉ đổi chéo'}</span>
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
      )}

      {/* Modal Ứng tuyển vào nhóm */}
      {applyModalRoom &&
        createPortal(
        <div
          className="motion-modal-backdrop"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 16,
          }}
        >
          <div
            className="motion-modal-dialog"
            style={{
              backgroundColor: 'var(--bg-card, #FFFFFF)',
              border: '1px solid var(--border-light, #E2E8F0)',
              borderRadius: '20px',
              padding: '24px',
              maxWidth: 500,
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 45px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Send size={18} color="var(--accent-color, #F26F21)" />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main, #0F172A)', margin: 0 }}>
                  Nộp đơn ứng tuyển — {applyModalRoom.code}
                </h3>
              </div>
              <button
                type="button"
                aria-label="Đóng hộp thoại ứng tuyển"
                onClick={() => setApplyModalRoom(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted, #64748B)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '15px', color: 'var(--text-muted, #64748B)', lineHeight: 1.5, marginTop: 0, marginBottom: '1.25rem' }}>
              Đơn của bạn sẽ được gửi đến Trưởng nhóm và toàn bộ thành viên phòng <strong>{applyModalRoom.name}</strong> để mở biểu quyết nội bộ.
            </p>

            <form onSubmit={handleConfirmApply}>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary, #334155)', marginBottom: '6px' }}>
                  Lời giới thiệu & Kỹ năng bạn có thể đóng góp cho nhóm:
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Ví dụ: Mình học chuyên ngành Kỹ thuật phần mềm, có thế mạnh về React và backend API. Rất mong muốn được tham gia để cùng hoàn thiện dự án..."
                  value={applyIntro}
                  onChange={(e) => setApplyIntro(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 12,
                    border: '1px solid var(--border-medium, #CBD5E1)',
                    backgroundColor: 'var(--bg-subtle, #F8FAFC)',
                    color: 'var(--text-main, #0F172A)',
                    fontSize: '15px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setApplyModalRoom(null)}
                  style={{
                    padding: '9px 16px',
                    borderRadius: 12,
                    backgroundColor: 'var(--bg-tag, #F1F5F9)',
                    border: '1px solid var(--border-light, #E2E8F0)',
                    color: 'var(--text-secondary, #475569)',
                    fontSize: '14.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '9px 20px',
                    borderRadius: 12,
                    background: 'var(--accent-gradient, var(--accent-color, #F26F21))',
                    border: 'none',
                    color: '#FFFFFF',
                    fontSize: '14.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Send size={14} />
                  <span>Xác nhận nộp đơn</span>
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ── MODAL GIÁM SÁT PHÒNG NHÓM (DÀNH CHO MODERATOR & LECTURER) ── */}
      {inspectRoomModal &&
        createPortal(
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1.25rem',
            backdropFilter: 'blur(3px)',
          }}
          onClick={() => setInspectRoomModal(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'var(--bg-card, #FFFFFF)',
              border: '1px solid var(--border-light, #E2E8F0)',
              borderRadius: '20px',
              padding: '24px',
              maxWidth: 640,
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 45px rgba(0,0,0,0.2)',
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid var(--border-subtle, #F1F5F9)', paddingBottom: '14px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'var(--font-mono, monospace)', fontVariantNumeric: 'tabular-nums', fontWeight: 700, fontSize: '14px', color: 'var(--text-main, #0F172A)', backgroundColor: 'var(--bg-tag, #F1F5F9)', border: '1px solid var(--border-light, #E2E8F0)', padding: '3px 10px', borderRadius: 8 }}>
                    {inspectRoomModal.code}
                  </span>
                  <span style={{ fontSize: '13.5px', fontWeight: 600, fontVariantNumeric: 'tabular-nums', padding: '3px 10px', borderRadius: 999, backgroundColor: 'rgba(16, 185, 129, 0.12)', color: '#059669' }}>
                    Sĩ số: {inspectRoomModal.currentMembers}/{inspectRoomModal.maxMembers} thành viên
                  </span>
                </div>
                <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-main, #0F172A)', margin: 0 }}>
                  {inspectRoomModal.name}
                </h2>
              </div>
              <button
                type="button"
                aria-label="Đóng cửa sổ giám sát"
                onClick={() => setInspectRoomModal(null)}
                style={{ width: 34, height: 34, borderRadius: 10, border: '1px solid var(--border-light, #E2E8F0)', backgroundColor: 'var(--bg-card, #FFFFFF)', color: 'var(--text-muted, #64748B)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Topic Info */}
            <div style={{ padding: '14px 16px', borderRadius: 12, backgroundColor: 'var(--bg-subtle, #F8FAFC)', border: '1px solid var(--border-light, #E2E8F0)', marginBottom: '16px' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-muted, #64748B)', textTransform: 'uppercase', marginBottom: '4px' }}>
                Đề tài dự kiến đăng ký:
              </div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main, #0F172A)' }}>
                {inspectRoomModal.topic || 'Chưa đăng ký đề tài chính thức'}
              </div>
              {inspectRoomModal.topicDesc && (
                <p style={{ fontSize: '14.5px', color: 'var(--text-muted, #64748B)', margin: '6px 0 0', lineHeight: 1.5 }}>
                  {inspectRoomModal.topicDesc}
                </p>
              )}
            </div>

            {/* Member List - 100% full view for staff */}
            <div style={{ marginBottom: '18px' }}>
              <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main, #0F172A)', marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Users size={16} color="var(--accent-color, #F26F21)" />
                  Danh sách thành viên chính thức ({inspectRoomModal.members.length}/{inspectRoomModal.maxMembers})
                </span>
                <span style={{ fontSize: '13.5px', color: '#059669', fontWeight: 600 }}>
                  ✓ Toàn quyền giám sát
                </span>
              </div>

              {inspectRoomModal.members.length === 0 ? (
                <div style={{ padding: '16px', borderRadius: 12, backgroundColor: 'var(--bg-subtle, #F8FAFC)', border: '1px dashed var(--border-medium, #CBD5E1)', textAlign: 'center', fontSize: '15px', color: 'var(--text-muted, #64748B)' }}>
                  Phòng đang trống (0/{inspectRoomModal.maxMembers}). Chưa có sinh viên nào tham gia.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {inspectRoomModal.members.map((m) => (
                    <div
                      key={m.id}
                      style={{
                        padding: '10px 14px',
                        borderRadius: 12,
                        backgroundColor: 'var(--bg-subtle, #F8FAFC)',
                        border: '1px solid var(--border-light, #E2E8F0)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            backgroundColor: m.avatarBg,
                            color: m.avatarText,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '14px',
                          }}
                        >
                          {m.name.charAt(0)}
                        </div>
                        <div>
                          <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main, #0F172A)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>{m.name}</span>
                            {m.role === 'Leader' && (
                              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary, #334155)', backgroundColor: 'var(--bg-tag, #F1F5F9)', border: '1px solid var(--border-light, #E2E8F0)', padding: '1px 7px', borderRadius: 6, display: 'inline-flex', alignItems: 'center' }}>
                                Trưởng nhóm
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '13.5px', color: 'var(--text-muted, #64748B)' }}>
                            MSSV: <strong style={{ color: 'var(--text-main, #0F172A)', fontVariantNumeric: 'tabular-nums' }}>{m.studentCode || '—'}</strong> • Chuyên ngành: {m.major || '—'}{m.classCode ? <> • Khóa: <strong style={{ color: 'var(--text-main, #0F172A)' }}>{m.classCode}</strong></> : null}
                          </div>
                        </div>
                      </div>
                      <div style={{ fontSize: '13.5px', color: 'var(--text-light, #94A3B8)', textAlign: 'right' }}>
                        {m.joinedAt}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Monitoring Action Footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '14px', borderTop: '1px solid var(--border-subtle, #F1F5F9)' }}>
              <button
                type="button"
                onClick={() => setInspectRoomModal(null)}
                style={{
                  padding: '9px 20px',
                  borderRadius: 12,
                  backgroundColor: '#0F172A',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: '15px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Đóng cửa sổ giám sát
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// 2. MY GROUP PAGE (/my-group)
// ══════════════════════════════════════════════════════════════════════════════
interface Applicant {
  id: string;
  name: string;
  studentCode: string;
  classCode: string;
  major: string;
  scores: { tech: number; mgt: number; design: number; mkt: number; sale: number };
  intro: string;
  votingOpen: boolean;
  userVote?: 'YES' | 'NO';
  yesVotes: number;
  noVotes: number;
  status: 'Pending' | 'Accepted' | 'Rejected';
}

interface TransferTarget {
  id: string;
  code: string;
  name: string;
  memberCount: number;
  maxMembers: number;
  members: { id: string; name: string; studentCode: string }[];
}

export const MyGroupPage: React.FC = () => {
  const { user } = useAuth();
  const { space, loading: spacesLoading, error: spacesError } = useSelectedSpace();
  const dialog = useConfirm();
  const currentUserId = user?.id ?? '';

  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [profiles, setProfiles] = useState<Map<string, CandidateProfile>>(new Map());
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [election, setElection] = useState<LeaderElection | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [myTransfers, setMyTransfers] = useState<TransferRequest[]>([]);

  // Trạng thái học kỳ / nhóm (thật)
  const isLockedSemester = space?.status === 'Locked' || group?.status === 'Locked';
  const isEarlyClosed = !!group?.isClosedByLeader;
  const topic = group?.name ?? '';
  const topicDesc = group?.description || 'Nhóm chưa cập nhật mô tả đề tài.';
  const maxMembers = group?.maxMembers ?? space?.maxMembersPerGroup ?? 5;

  const [showEditTopicModal, setShowEditTopicModal] = useState(false);
  const [editTopicTitle, setEditTopicTitle] = useState('');
  const [editTopicDesc, setEditTopicDesc] = useState('');

  // Leader Election State
  const [showElectionCard, setShowElectionCard] = useState(false);
  const [nominateOpen, setNominateOpen] = useState(false);
  const [nomineeId, setNomineeId] = useState('');
  const electionVotes = election?.totalAgreed ?? 0;
  const electionRequired = Math.max(1, election?.requiredVotesToPass ?? 1);
  const userVotedElection = !!election?.votes.some((v) => v.voterId === currentUserId);

  // Transfer Leader Modal
  const [showTransferLeaderModal, setShowTransferLeaderModal] = useState(false);
  const [selectedNewLeaderId, setSelectedNewLeaderId] = useState('');

  // Transfer / Swap Modal (for Locked Semester)
  const [showTransferSwapModal, setShowTransferSwapModal] = useState(false);
  const [transferType, setTransferType] = useState<'ONE_WAY' | 'SWAP'>('SWAP');
  const [targetRoomCode, setTargetRoomCode] = useState('');
  const [swapStudentName, setSwapStudentName] = useState('');
  const [transferReason, setTransferReason] = useState('');
  const [transferTargets, setTransferTargets] = useState<TransferTarget[]>([]);
  const transferTarget = transferTargets.find((t) => t.id === targetRoomCode);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const spaceId = space?.id;
  const load = useCallback(async () => {
    if (!spaceId) return;
    try {
      const mine = await workspaceApi.getMyGroup(spaceId);
      setGroup(mine);
      workspaceApi
        .listMyTransferRequests()
        .then((list) => setMyTransfers(list.filter((t) => t.spaceId === spaceId)))
        .catch(() => setMyTransfers([]));
      if (!mine) return;
      const [reqs, current] = await Promise.all([
        workspaceApi.listGroupJoinRequests(mine.id).catch(() => [] as JoinRequest[]),
        workspaceApi.getCurrentElection(mine.id).catch(() => null),
      ]);
      setJoinRequests(reqs);
      setElection(current?.status === 'Active' ? current : null);
      setShowElectionCard(current?.status === 'Active');
      setSecondsLeft(current?.status === 'Active' ? Math.floor(current.secondsRemaining) : 0);
      setProfiles(await loadProfiles([...mine.members.map((m) => m.userId), ...reqs.map((r) => r.studentId)]));
    } catch (err) {
      showToast(errorMessage(err, 'Không tải được thông tin nhóm.'));
    } finally {
      setLoaded(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spaceId]);

  useEffect(() => {
    setGroup(null);
    setLoaded(false);
    void load();
  }, [load]);

  // Tham gia SignalR group của nhóm mình và lắng nghe sự kiện thời gian thực
  useEffect(() => {
    if (group?.id) {
      window.dispatchEvent(new CustomEvent('realtime:join-group-intent', { detail: group.id }));
    }
  }, [group?.id]);

  useEffect(() => {
    const handleRealtime = () => void load();
    window.addEventListener('realtime:group-updated', handleRealtime);
    window.addEventListener('realtime:space-updated', handleRealtime);
    window.addEventListener('realtime:transfer-updated', handleRealtime);
    return () => {
      window.removeEventListener('realtime:group-updated', handleRealtime);
      window.removeEventListener('realtime:space-updated', handleRealtime);
      window.removeEventListener('realtime:transfer-updated', handleRealtime);
    };
  }, [load]);

  // Đếm ngược thời hạn bầu chọn
  useEffect(() => {
    if (!election) return;
    const t = window.setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearInterval(t);
  }, [election]);

  // Members in my group (dữ liệu thật)
  const members: RoomMember[] = useMemo(
    () => (group?.members ?? []).map((m) => toRoomMember(m, profiles.get(m.userId))),
    [group, profiles]
  );
  const isCurrentUserLeader = !!group && group.leaderId === currentUserId;

  // Năng lực 5 kỹ năng của cả nhóm
  const teamSkills = useMemo(() => {
    const avg = averageSkills((group?.members ?? []).map((m) => profiles.get(m.userId)).filter(Boolean) as CandidateProfile[]);
    return SKILLS.map((s) => ({
      name: s.name,
      sub: s.sub,
      score: avg[s.key],
      badge: avg[s.key] >= 65 ? 'Thế mạnh' : avg[s.key] >= 50 ? 'Ổn định' : 'Cần bổ sung',
    }));
  }, [group, profiles]);
  const teamAverage = teamSkills.length ? Math.round(teamSkills.reduce((n, s) => n + s.score, 0) / teamSkills.length) : 0;

  // Applicants & Voting State (đơn ứng tuyển thật)
  const applicants: Applicant[] = useMemo(
    () =>
      joinRequests.map((r) => {
        const p = profiles.get(r.studentId);
        const mine = r.votes?.find((v) => v.voterId === currentUserId);
        return {
          id: r.id,
          name: r.studentName,
          studentCode: '',
          classCode: p?.cohort ?? '',
          major: p?.major ?? '',
          scores: {
            tech: p?.techScore ?? 0,
            mgt: p?.managementScore ?? 0,
            design: p?.graphicDesignScore ?? 0,
            mkt: p?.marketingScore ?? 0,
            sale: p?.saleScore ?? 0,
          },
          intro: r.message ?? '',
          votingOpen: r.status === 'Pending',
          userVote: mine ? (mine.isUpvote ? 'YES' : 'NO') : undefined,
          yesVotes: r.upvotes,
          noVotes: r.downvotes,
          status: r.status === 'Accepted' ? 'Accepted' : r.status === 'Pending' ? 'Pending' : 'Rejected',
        };
      }),
    [joinRequests, profiles, currentUserId]
  );

  const run = async (action: () => Promise<unknown>, success: string) => {
    try {
      await action();
      showToast(success);
      await load();
      return true;
    } catch (err) {
      showToast(errorMessage(err));
      return false;
    }
  };

  // Toggle Early Close
  const handleToggleEarlyClose = () => {
    if (!group) return;
    void (isEarlyClosed
      ? run(() => workspaceApi.reopenRecruitment(group.id), 'Đã mở tuyển lại thành công! Ứng viên có thể tiếp tục nộp đơn vào nhóm.')
      : run(() => workspaceApi.closeRecruitment(group.id), 'Đã đóng tuyển sớm! Các đơn đang chờ sẽ không được xét tiếp.'));
  };

  // Leave Group
  const handleLeaveGroup = async () => {
    if (!group) return;
    const ok = await dialog.confirm({
      title: 'Bạn có chắc chắn muốn rời nhóm?',
      message: isCurrentUserLeader ? 'Quyền Trưởng nhóm sẽ tự động chuyển cho thành viên tham gia sớm nhất kế tiếp.' : undefined,
      confirmLabel: 'Rời nhóm',
      danger: true,
    });
    if (ok === null) return;
    await run(() => workspaceApi.leaveGroup(group.id), 'Bạn đã rời nhóm thành công.');
  };

  // Chuyển quyền Leader
  const handleConfirmTransferLeader = async () => {
    if (!group || !selectedNewLeaderId) return;
    const target = members.find((m) => m.id === selectedNewLeaderId);
    if (await run(() => workspaceApi.transferLeader(group.id, selectedNewLeaderId), `Đã nhượng quyền Trưởng nhóm thành công cho ${target?.name ?? ''}!`)) {
      setShowTransferLeaderModal(false);
    }
  };

  // Bầu chọn Trưởng nhóm mới: chưa có cuộc bầu thì mở hộp chọn người được đề cử
  const handleOpenElection = () => {
    if (election) setShowElectionCard(true);
    else {
      setNomineeId('');
      setNominateOpen(true);
    }
  };
  const handleStartElection = async () => {
    if (!group || !nomineeId) return;
    if (await run(() => workspaceApi.startElection(group.id, nomineeId), 'Đã mở cuộc bầu chọn Trưởng nhóm mới (thời hạn 24 giờ).')) setNominateOpen(false);
  };
  const handleCastElectionVote = () => {
    if (!group || !election || userVotedElection) return;
    void run(() => workspaceApi.voteElection(group.id, election.id, true), 'Đã bỏ phiếu đồng ý.');
  };

  // Vote on applicant
  const handleVoteApplicant = (applicantId: string, vote: 'YES' | 'NO') => {
    void run(() => workspaceApi.voteJoinRequest(applicantId, vote === 'YES'), 'Đã ghi nhận biểu quyết của bạn.');
  };

  // Accept applicant into group
  const handleAcceptApplicant = (app: Applicant) => {
    void run(() => workspaceApi.acceptJoinRequest(app.id), `Đã chấp nhận ${app.name} vào nhóm thành công!`);
  };

  // Reject applicant
  const handleRejectApplicant = (applicantId: string) => {
    void run(() => workspaceApi.rejectJoinRequest(applicantId), 'Đã từ chối đơn ứng tuyển.');
  };

  // Cập nhật đề tài
  const openEditTopic = () => {
    setEditTopicTitle(group?.name ?? '');
    setEditTopicDesc(group?.description ?? '');
    setShowEditTopicModal(true);
  };
  const handleSaveTopic = async () => {
    if (!group || !editTopicTitle.trim()) return;
    if (await run(() => workspaceApi.updateGroup(group.id, { name: editTopicTitle.trim(), description: editTopicDesc.trim() || null }), 'Đã cập nhật đề tài dự án thành công!')) {
      setShowEditTopicModal(false);
    }
  };

  // Chuyển nhóm sau chốt sổ: danh sách nhóm đích thật
  const openTransferModal = async () => {
    if (!space || !group) return;
    setTargetRoomCode('');
    setSwapStudentName('');
    setTransferReason('');
    setShowTransferSwapModal(true);
    try {
      const rooms = (await workspaceApi.listRooms(space.id)).filter((r) => r.id !== group.id && r.memberCount > 0);
      const details = await Promise.all(rooms.map((r) => workspaceApi.getGroup(r.id).catch(() => null)));
      setTransferTargets(
        details
          .filter((d): d is GroupDetail => !!d)
          .map((d) => ({
            id: d.id,
            code: d.roomCode ?? d.name,
            name: isDefaultRoomName(d.name) ? '' : d.name,
            memberCount: d.memberCount,
            maxMembers: d.maxMembers,
            members: d.members.map((m) => ({ id: m.userId, name: m.fullName, studentCode: m.studentCode ?? '' })),
          }))
          .sort((a, b) => a.code.localeCompare(b.code))
      );
    } catch (err) {
      showToast(errorMessage(err));
    }
  };
  const handleSubmitTransfer = async () => {
    if (!space || !targetRoomCode) return;
    if (!transferReason.trim()) {
      showToast('Vui lòng nhập lý do chuyển nhóm!');
      return;
    }
    const ok = await run(
      () =>
        workspaceApi.createTransferRequest(space.id, {
          targetGroupId: targetRoomCode,
          swapWithStudentId: transferType === 'SWAP' ? swapStudentName || null : null,
          reason: transferReason.trim(),
        }),
      'Đã gửi đơn yêu cầu chuyển nhóm / đổi chéo thành công! Điều phối viên học kỳ sẽ thẩm định và gửi thông báo.'
    );
    if (ok) setShowTransferSwapModal(false);
  };
  const pendingTransfer = myTransfers.find((t) => t.status === 'Pending');

  if (!space) return <NoSpace loading={spacesLoading} error={spacesError} student />;

  if (!group) {
    return (
      <div style={{ maxWidth: 1400, margin: '0 auto', paddingBottom: '3.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 650, color: 'var(--text-main, #0F172A)', margin: '0 0 1.5rem 0', letterSpacing: '-0.022em' }}>
          Nhóm Khởi Nghiệp Của Tôi
        </h1>
        <StateBox
          kind={loaded ? 'empty' : 'loading'}
          title={loaded ? 'Bạn chưa có nhóm' : undefined}
          message={
            loaded
              ? space.status === 'Open'
                ? 'Vào thẳng một phòng trống / đang lập nhóm, hoặc nộp đơn vào nhóm đang tuyển.'
                : 'Đăng ký tự nguyện đã đóng. Điều phối viên sẽ phân bổ bạn vào một nhóm.'
              : 'Đang tải nhóm của bạn...'
          }
          action={
            loaded ? (
              <Link to="/groups" style={{ textDecoration: 'none' }}>
                <Button icon={<Layers size={15} />}>Khám phá Phòng & Nhóm</Button>
              </Link>
            ) : undefined
          }
        />
      </div>
    );
  }

  const formatCountdown = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  };

  return (
    <div style={{ maxWidth: 1560, margin: '0 auto', paddingBottom: '3.5rem' }}>
      {/* FPT Tricolor Brand Identity Line */}
      <div className="fpt-tricolor-bar" style={{ height: 3.5, borderRadius: 2, marginBottom: '1.25rem' }} />

      {/* Toast */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: 24,
            right: 24,
            zIndex: 9999,
            backgroundColor: '#0F172A',
            color: '#FFFFFF',
            padding: '12px 20px',
            borderRadius: 12,
            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          <CheckCircle2 size={18} color="#22C55E" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* BR-07 Profile Incomplete Banner for Student */}
      {user?.role === 'Student' && !user?.isProfileCompleted && (
        <div
          style={{
            padding: '12px 18px',
            borderRadius: 12,
            backgroundColor: 'var(--bg-card, #FFFFFF)',
            border: '1px solid var(--border-light, #E2E8F0)',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, backgroundColor: 'var(--bg-subtle, #F8FAFC)', border: '1px solid var(--border-light, #E2E8F0)', color: 'var(--text-secondary, #334155)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <AlertCircle size={18} />
            </div>
            <div>
              <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-main, #0F172A)' }}>
                Yêu cầu hoàn tất Hồ sơ 5 Kỹ năng cốt lõi (BR-07)
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted, #64748B)', marginTop: 2 }}>
                Vui lòng cập nhật điểm 5 kỹ năng và cam kết trách nhiệm cá nhân để hồ sơ năng lực của nhóm đạt độ chính xác cao nhất.
              </div>
            </div>
          </div>
          <Link to="/profile" style={{ textDecoration: 'none' }}>
            <button
              type="button"
              style={{
                padding: '7px 15px',
                borderRadius: 8,
                backgroundColor: 'var(--fpt-orange, #F26F21)',
                color: '#FFFFFF',
                border: 'none',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cập nhật ngay →
            </button>
          </Link>
        </div>
      )}

      {/* Top Header & Test Mode Switcher */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          gap: '1rem',
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
              marginBottom: '0.4rem',
            }}
          >
            <span>Học phần</span>
            <span style={{ color: 'var(--text-light, #CBD5E1)' }}>/</span>
            <span>EXE</span>
            <span style={{ color: 'var(--text-light, #CBD5E1)' }}>/</span>
            <span style={{ color: 'var(--text-main, #0F172A)', fontWeight: 500 }}>Nhóm của tôi</span>
            <span style={{ color: 'var(--text-light, #CBD5E1)' }}>·</span>
            <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 400, color: '#94A3B8' }}>
              {group.roomCode ?? group.name}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 650, color: 'var(--text-main, #0F172A)', margin: 0, letterSpacing: '-0.022em' }}>
              Nhóm Khởi Nghiệp Của Tôi
            </h1>
            <span
              style={{
                fontSize: '12.5px',
                fontWeight: 500,
                padding: '3px 9px',
                borderRadius: 6,
                backgroundColor: 'var(--bg-subtle, #F8FAFC)',
                color: isLockedSemester || isEarlyClosed ? 'var(--text-muted, #64748B)' : 'var(--text-secondary, #334155)',
                border: '1px solid var(--border-light, #E2E8F0)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                whiteSpace: 'nowrap',
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  backgroundColor:
                    isLockedSemester || isEarlyClosed
                      ? '#94A3B8'
                      : group.status === 'Forming'
                      ? '#10B981'
                      : 'var(--status-recruiting, #F26F21)',
                  boxShadow:
                    isLockedSemester || isEarlyClosed
                      ? 'none'
                      : group.status === 'Forming'
                      ? '0 0 0 2px rgba(16, 185, 129, 0.18)'
                      : '0 0 0 2px var(--accent-soft, rgba(242, 111, 33, 0.2))',
                  flexShrink: 0,
                }}
              />
              {isLockedSemester
                ? 'Đã chốt sổ học kỳ'
                : isEarlyClosed
                ? 'Đã đóng tuyển sớm'
                : group.status === 'Recruiting'
                ? `Đang tuyển (${members.length}/${maxMembers})`
                : `Đang lập nhóm (${members.length}/${maxMembers})`}
            </span>
          </div>
        </div>

      </div>

      {/* Locked Semester Banner */}
      {isLockedSemester && (
        <div
          style={{
            backgroundColor: 'var(--bg-subtle, #F8FAFC)',
            border: '1px solid var(--border-light, #E2E8F0)',
            borderRadius: 16,
            padding: '14px 18px',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--accent-gradient, linear-gradient(135deg, #f26f21 0%, #ea580c 100%))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF', flexShrink: 0 }}>
              <Lock size={17} />
            </div>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--text-main, #0F172A)', fontSize: '14.5px' }}>
                Học kỳ đã chốt sổ danh sách (Locked)
              </div>
              <div style={{ fontSize: '13.5px', color: 'var(--text-secondary, #475569)', marginTop: '2px' }}>
                Cổng đăng ký và kết nạp tự do đã đóng. Mọi điều chỉnh thành viên chỉ được thực hiện qua quy trình nộp đơn xin Chuyển nhóm / Đổi chéo để Điều phối viên phê duyệt.
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void openTransferModal()}
            disabled={!!pendingTransfer}
            style={{
              padding: '9px 16px',
              borderRadius: 10,
              background: 'var(--accent-gradient, linear-gradient(135deg, #f26f21 0%, #ea580c 100%))',
              border: 'none',
              color: '#FFFFFF',
              fontSize: '13.5px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 4px rgba(242, 111, 33, 0.25)',
            }}
          >
            <ArrowLeftRight size={14} />
            <span>{pendingTransfer ? `Đã gửi yêu cầu sang ${pendingTransfer.targetGroupCode} • chờ duyệt` : 'Gửi yêu cầu Chuyển nhóm / Đổi chéo'}</span>
          </button>
        </div>
      )}

      {/* Main Section: 2 Columns */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 400px), 1fr))', gap: '1.5rem', marginBottom: '1.75rem' }}>
        {/* Left Column: Project Info & 5 Skills Bar Chart (shadcn Card Architecture) */}
        <div
          className="motion-stagger-item"
          style={
            {
              '--stagger-index': 0,
              backgroundColor: 'var(--bg-card, #FFFFFF)',
              border: '1px solid var(--border-light, #E2E8F0)',
              borderRadius: '20px',
              padding: '28px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: '0 1px 3px rgba(15, 23, 42, 0.03)',
            } as React.CSSProperties
          }
        >
          <div>
            {/* CardHeader: Topic Eyebrow + Action Button */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '14px' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    background: 'var(--accent-gradient, linear-gradient(135deg, #f26f21 0%, #ea580c 100%))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FFFFFF',
                  }}
                >
                  <Sparkles size={14} strokeWidth={2.2} />
                </div>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: 'var(--text-muted, #64748B)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  Đề tài dự án khởi nghiệp
                </span>
              </div>

              {!isLockedSemester && isCurrentUserLeader && (
                <button
                  type="button"
                  onClick={openEditTopic}
                  style={{
                    padding: '7px 14px',
                    borderRadius: 9,
                    background: 'var(--accent-gradient, linear-gradient(135deg, #f26f21 0%, #ea580c 100%))',
                    border: 'none',
                    boxShadow: '0 2px 4px rgba(242, 111, 33, 0.25)',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#FFFFFF',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Edit3 size={13.5} color="#FFFFFF" />
                  <span>Cập nhật đề tài</span>
                </button>
              )}
            </div>

            {/* Topic Callout Box (shadcn Muted Surface) */}
            <div
              style={{
                backgroundColor: 'var(--bg-subtle, #F8FAFC)',
                border: '1px solid var(--border-light, #E2E8F0)',
                borderRadius: '14px',
                padding: '16px 18px',
                marginBottom: '22px',
              }}
            >
              <h3
                style={{
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  color: 'var(--text-main, #0F172A)',
                  letterSpacing: '-0.02em',
                  margin: '0 0 6px 0',
                  lineHeight: 1.3,
                }}
              >
                {topic}
              </h3>
              <p
                style={{
                  fontSize: '14px',
                  color: 'var(--text-secondary, #475569)',
                  lineHeight: 1.55,
                  margin: 0,
                }}
              >
                {topicDesc}
              </p>
            </div>

            {/* 5 Core Skills Section Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TrendingUp size={16} color="var(--accent-color, #F26F21)" strokeWidth={2.2} />
                <span style={{ fontSize: '14.5px', fontWeight: 700, color: 'var(--text-main, #0F172A)', letterSpacing: '-0.01em' }}>
                  Năng lực tổng hợp 5 Kỹ năng của cả nhóm
                </span>
              </div>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#FFFFFF',
                  background: 'var(--accent-gradient, linear-gradient(135deg, #f26f21 0%, #ea580c 100%))',
                  padding: '3.5px 10px',
                  borderRadius: 999,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                Trung bình: {teamAverage}%
              </span>
            </div>

            {/* 5 Core Skills Rows (Synced with user's chosen accent color + Clean Neutral Badges) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
              {teamSkills.map((s) => {
                const skillColor = 'var(--accent-color, #F26F21)';
                return (
                <div
                  key={s.name}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '11px',
                    backgroundColor: 'var(--bg-subtle, #F8FAFC)',
                    border: '1px solid var(--border-light, #E2E8F0)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '7px', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: skillColor }}>{s.name}</span>
                      <span style={{ fontSize: '13px', fontWeight: 400, color: 'var(--text-muted, #64748B)' }}>· {s.sub}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: 500,
                          padding: '2px 8px',
                          borderRadius: 999,
                          backgroundColor: 'var(--bg-card, #FFFFFF)',
                          color: s.score >= 65 ? 'var(--text-main, #0F172A)' : 'var(--text-muted, #64748B)',
                          border: '1px solid var(--border-light, #E2E8F0)',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {s.badge}
                      </span>
                      <span
                        style={{
                          fontSize: '14px',
                          fontWeight: 700,
                          color: s.score >= 50 ? skillColor : 'var(--text-main, #0F172A)',
                          fontVariantNumeric: 'tabular-nums',
                          minWidth: '38px',
                          textAlign: 'right',
                        }}
                      >
                        {s.score}%
                      </span>
                    </div>
                  </div>

                  {/* Progress bar with dedicated skill color */}
                  <div
                    style={{
                      height: 6,
                      borderRadius: 999,
                      backgroundColor: '#E2E8F0',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      className="motion-progress-fill"
                      style={{
                        width: `${s.score}%`,
                        height: '100%',
                        backgroundColor: s.score >= 50 ? skillColor : '#94A3B8',
                        borderRadius: 999,
                        transition: 'width 250ms ease',
                      }}
                    />
                  </div>
                </div>
              );})}
            </div>
          </div>
        </div>

        {/* Right Column: Control Buttons & Leader Election */}
        <div
          className="motion-stagger-item"
          style={
            {
              '--stagger-index': 1,
              backgroundColor: 'var(--bg-card, #FFFFFF)',
              border: '1px solid var(--border-light, #E2E8F0)',
              borderRadius: '20px',
              padding: '28px',
              boxShadow: '0 1px 3px rgba(15, 23, 42, 0.03)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            } as React.CSSProperties
          }
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    backgroundColor: 'var(--bg-subtle, #F8FAFC)',
                    border: '1px solid var(--border-light, #E2E8F0)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-secondary, #334155)',
                  }}
                >
                  <Layers size={14} strokeWidth={2.2} />
                </div>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: 'var(--text-muted, #64748B)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  Quản trị & Điều phối nội bộ
                </span>
              </div>
            </div>

            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main, #0F172A)', letterSpacing: '-0.02em', margin: '0 0 18px 0' }}>
              Bảng điều khiển & Tác vụ Nhóm
            </h3>

            {/* Action Buttons (Clean Neutral Surface Grid) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '1.25rem' }}>
              {/* Đóng tuyển sớm / Mở tuyển lại */}
              <button
                type="button"
                onClick={handleToggleEarlyClose}
                disabled={isLockedSemester || !isCurrentUserLeader || group.status === 'Forming'}
                style={{
                  padding: '12px 14px',
                  borderRadius: 11,
                  border: '1px solid var(--border-light, #E2E8F0)',
                  backgroundColor: 'var(--bg-subtle, #F8FAFC)',
                  color: 'var(--text-main, #0F172A)',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: isLockedSemester || !isCurrentUserLeader || group.status === 'Forming' ? 'not-allowed' : 'pointer',
                  opacity: isLockedSemester || !isCurrentUserLeader || group.status === 'Forming' ? 0.5 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                  gap: '10px',
                  transition: 'all 0.15s ease',
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    backgroundColor: 'var(--bg-card, #FFFFFF)',
                    border: '1px solid var(--border-light, #E2E8F0)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    color: 'var(--text-secondary, #334155)',
                  }}
                >
                  {isEarlyClosed ? <Unlock size={15} /> : <Lock size={15} />}
                </div>
                <span>{isEarlyClosed ? 'Mở tuyển lại' : 'Đóng tuyển sớm'}</span>
              </button>

              {/* Chuyển quyền Trưởng nhóm */}
              <button
                type="button"
                onClick={() => setShowTransferLeaderModal(true)}
                disabled={isLockedSemester || !isCurrentUserLeader}
                style={{
                  padding: '12px 14px',
                  borderRadius: 11,
                  border: '1px solid var(--border-light, #E2E8F0)',
                  backgroundColor: 'var(--bg-subtle, #F8FAFC)',
                  color: 'var(--text-main, #0F172A)',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: isLockedSemester || !isCurrentUserLeader ? 'not-allowed' : 'pointer',
                  opacity: isLockedSemester || !isCurrentUserLeader ? 0.5 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                  gap: '10px',
                  transition: 'all 0.15s ease',
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    backgroundColor: 'var(--bg-card, #FFFFFF)',
                    border: '1px solid var(--border-light, #E2E8F0)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <UserPlus size={15} color="#334155" />
                </div>
                <span>Chuyển quyền Leader</span>
              </button>

              {/* Bầu chọn Trưởng nhóm mới */}
              <button
                type="button"
                onClick={handleOpenElection}
                disabled={isLockedSemester}
                style={{
                  padding: '12px 14px',
                  borderRadius: 11,
                  border: '1px solid var(--border-light, #E2E8F0)',
                  backgroundColor: 'var(--bg-subtle, #F8FAFC)',
                  color: 'var(--text-main, #0F172A)',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: isLockedSemester ? 'not-allowed' : 'pointer',
                  opacity: isLockedSemester ? 0.5 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                  gap: '10px',
                  transition: 'all 0.15s ease',
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    backgroundColor: 'var(--bg-card, #FFFFFF)',
                    border: '1px solid var(--border-light, #E2E8F0)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Vote size={15} color="#334155" />
                </div>
                <span>Bầu chọn Leader mới</span>
              </button>

              {/* Rời nhóm */}
              <button
                type="button"
                onClick={handleLeaveGroup}
                disabled={isLockedSemester}
                style={{
                  padding: '12px 14px',
                  borderRadius: 11,
                  border: '1px solid var(--border-light, #E2E8F0)',
                  backgroundColor: 'var(--bg-subtle, #F8FAFC)',
                  color: '#DC2626',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: isLockedSemester ? 'not-allowed' : 'pointer',
                  opacity: isLockedSemester ? 0.5 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                  gap: '10px',
                  transition: 'all 0.15s ease',
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    backgroundColor: 'var(--bg-card, #FFFFFF)',
                    border: '1px solid var(--border-light, #E2E8F0)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <LogOut size={15} color="#DC2626" />
                </div>
                <span>Rời nhóm</span>
              </button>
            </div>

            {/* Bầu chọn Trưởng nhóm mới Card (tự động hiện khi có cuộc bầu đang diễn ra) */}
            {(showElectionCard || election?.status === 'Active') && election && (
              <div
                style={{
                  backgroundColor: 'var(--bg-card, #FFFFFF)',
                  border: '1px solid var(--border-medium, #CBD5E1)',
                  borderRadius: 14,
                  padding: '18px',
                  marginBottom: '1rem',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                  <div style={{ fontSize: '15px', fontWeight: 650, color: 'var(--text-main, #0F172A)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Vote size={18} color="var(--accent-color, #F26F21)" />
                    <span>Bầu chọn Trưởng nhóm mới: <strong>{election.candidateName}</strong></span>
                  </div>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary, #334155)', backgroundColor: 'var(--bg-subtle, #F8FAFC)', border: '1px solid var(--border-light, #E2E8F0)', padding: '3px 10px', borderRadius: 999, fontWeight: 600, fontFamily: 'var(--font-mono, monospace)', fontVariantNumeric: 'tabular-nums', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                    <Clock size={13} />
                    <span>Còn {formatCountdown(secondsLeft)}</span>
                  </span>
                </div>
                <div style={{ fontSize: '13.5px', color: 'var(--text-secondary, #334155)', marginBottom: '8px' }}>
                  Tiến độ biểu quyết: <strong style={{ color: 'var(--text-main, #0F172A)' }}>{electionVotes}/{electionRequired} phiếu đồng ý (&gt; 50% quân số nhóm)</strong>
                </div>
                <div style={{ height: 8, borderRadius: 999, backgroundColor: 'var(--bg-tag, #F1F5F9)', overflow: 'hidden', marginBottom: '14px' }}>
                  <div style={{ width: `${Math.min(100, (electionVotes / electionRequired) * 100)}%`, height: '100%', backgroundColor: 'var(--accent-color, #F26F21)', transition: 'width 200ms ease' }} />
                </div>
                <button
                  type="button"
                  onClick={handleCastElectionVote}
                  disabled={userVotedElection}
                  style={{
                    width: '100%',
                    padding: '10px 16px',
                    borderRadius: 10,
                    backgroundColor: userVotedElection ? '#D1D5DB' : 'var(--fpt-orange, #F26F21)',
                    border: 'none',
                    color: '#FFFFFF',
                    fontSize: '14px',
                    fontWeight: 700,
                    cursor: userVotedElection ? 'not-allowed' : 'pointer',
                    boxShadow: userVotedElection ? 'none' : '0 2px 6px rgba(242, 111, 33, 0.3)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {userVotedElection ? '✓ Bạn đã bỏ phiếu đồng ý cho ứng viên này' : 'Bỏ phiếu Đồng ý đề cử Leader mới'}
                </button>
              </div>
            )}
          </div>

          {/* shadcn Alert / Callout Box */}
          <div
            style={{
              backgroundColor: 'var(--bg-subtle, #F8FAFC)',
              border: '1px solid var(--border-light, #E2E8F0)',
              borderRadius: '14px',
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
            }}
          >
            <ShieldAlert size={17} color="#64748B" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '13.5px', color: 'var(--text-secondary, #475569)', lineHeight: 1.55 }}>
              <strong style={{ color: 'var(--text-main, #0F172A)' }}>Quy định chuyển nhóm:</strong> Khi nhóm trưởng rời nhóm, quyền Trưởng nhóm tự động trao cho thành viên vào sớm nhất kế tiếp. Nếu sĩ số giảm từ 3 xuống 2, nhóm quay về trạng thái phòng đang lập và mở lại cổng vào thẳng.
            </div>
          </div>
        </div>
      </div>

      {/* AI Mentor: phân tích nhóm, gợi ý đề tài và lộ trình */}
      <div style={{ marginBottom: '1.75rem' }}>
        <AiMentorCard groupId={group.id} groupName={group.name} />
      </div>

      <Modal open={nominateOpen} onClose={() => setNominateOpen(false)} title="Đề cử bầu Trưởng nhóm mới" subtitle="Các thành viên có 24 giờ để bỏ phiếu; đạt đa số thì người được đề cử trở thành Trưởng nhóm.">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {members
            .filter((m) => m.role !== 'Leader')
            .map((m) => (
              <label key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, cursor: 'pointer', border: nomineeId === m.id ? '1px solid var(--accent-color, #F26F21)' : '1px solid var(--border-light, #E2E8F0)', backgroundColor: nomineeId === m.id ? 'var(--accent-soft, #FFF7ED)' : 'var(--bg-card, #FFFFFF)' }}>
                <input type="radio" name="nominee" checked={nomineeId === m.id} onChange={() => setNomineeId(m.id)} style={{ accentColor: 'var(--accent-color, #F26F21)' }} />
                <span style={{ fontWeight: 600, color: 'var(--text-main, #0F172A)' }}>{m.name}</span>
                <span style={{ fontSize: 13, color: 'var(--text-muted, #64748B)' }}>{m.major}</span>
              </label>
            ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
          <Button variant="outline" onClick={() => setNominateOpen(false)}>
            Hủy
          </Button>
          <Button disabled={!nomineeId} onClick={() => void handleStartElection()}>
            Mở bầu chọn
          </Button>
        </div>
      </Modal>
      {dialog.node}

      {/* Members Section */}
      <div
        style={{
          backgroundColor: 'var(--bg-card, #FFFFFF)',
          border: '1px solid var(--border-light, #E2E8F0)',
          borderRadius: '20px',
          padding: '26px',
          marginBottom: '1.75rem',
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.03)',
        }}
      >
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main, #0F172A)', margin: '0 0 1rem 0', letterSpacing: '-0.015em' }}>
          Danh sách Thành viên Nhóm ({members.length}/{maxMembers})
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 340px), 1fr))', gap: '1rem', alignItems: 'stretch' }}>
          {members.map((m) => (
            <div
              key={m.id}
              style={{
                backgroundColor: 'var(--bg-subtle, #F8FAFC)',
                border: '1px solid var(--border-light, #E2E8F0)',
                borderRadius: 12,
                padding: '15px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    background: m.role === 'Leader' ? 'var(--accent-gradient, linear-gradient(135deg, #f26f21 0%, #ea580c 100%))' : 'var(--bg-tag, #F1F5F9)',
                    color: m.role === 'Leader' ? '#FFFFFF' : 'var(--text-secondary, #334155)',
                    border: m.role === 'Leader' ? 'none' : '1px solid var(--border-light, #E2E8F0)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '15px',
                    fontWeight: 600,
                    flexShrink: 0,
                  }}
                >
                  {m.name.charAt(0)}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-main, #0F172A)', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.name}</span>
                    {m.id === currentUserId && (
                      <span style={{ fontSize: '12.5px', color: 'var(--accent-color, #F26F21)', fontWeight: 500, whiteSpace: 'nowrap' }}>
                        (Bạn)
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 400, color: 'var(--text-muted, #64748B)', marginTop: '3px', lineHeight: 1.4, fontVariantNumeric: 'tabular-nums' }}>
                    {[m.studentCode, m.major].filter(Boolean).join(' · ') || 'Chưa cập nhật ngành'}
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: 400, color: '#94A3B8', marginTop: '2px', fontVariantNumeric: 'tabular-nums' }}>
                    Tham gia: {m.joinedAt}
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-end',
                  justifyContent: 'center',
                  gap: '6px',
                  flexShrink: 0,
                }}
              >
                {m.classCode && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      fontVariantNumeric: 'tabular-nums',
                      fontWeight: 500,
                      fontSize: '12.5px',
                      backgroundColor: 'var(--bg-card, #FFFFFF)',
                      color: 'var(--text-secondary, #475569)',
                      border: '1px solid var(--border-light, #E2E8F0)',
                      padding: '2.5px 9px',
                      borderRadius: 6,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {m.classCode}
                  </span>
                )}
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    fontSize: '12.5px',
                    fontWeight: 500,
                    padding: '3px 10px',
                    borderRadius: 999,
                    background: m.role === 'Leader' ? 'var(--accent-gradient, linear-gradient(135deg, #f26f21 0%, #ea580c 100%))' : 'var(--bg-card, #FFFFFF)',
                    color: m.role === 'Leader' ? '#FFFFFF' : 'var(--text-muted, #64748B)',
                    border: m.role === 'Leader' ? 'none' : '1px solid var(--border-light, #E2E8F0)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {m.role === 'Leader' ? 'Trưởng nhóm' : 'Thành viên'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section: Đơn ứng tuyển & Biểu quyết thành viên */}
      <div
        style={{
          backgroundColor: 'var(--bg-card, #FFFFFF)',
          border: '1px solid var(--border-light, #E2E8F0)',
          borderRadius: '20px',
          padding: '26px',
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.03)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main, #0F172A)', margin: 0, letterSpacing: '-0.015em' }}>
              Đơn ứng tuyển & Biểu quyết Thành viên ({applicants.filter((a) => a.status === 'Pending').length} đang chờ)
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--text-muted, #64748B)', margin: '3px 0 0 0' }}>
              Toàn bộ thành viên có quyền biểu quyết tham khảo cho ứng viên. Trưởng nhóm sẽ là người ra quyết định chấp thuận cuối cùng.
            </p>
          </div>
        </div>

        {applicants.length === 0 ? (
          <div
            style={{
              padding: '24px 18px',
              borderRadius: 14,
              backgroundColor: 'var(--bg-subtle, #F8FAFC)',
              border: '1px dashed var(--border-light, #E2E8F0)',
              textAlign: 'center',
              color: 'var(--text-muted, #64748B)',
              fontSize: '14px',
            }}
          >
            Hiện chưa có đơn ứng tuyển nào gửi đến nhóm của bạn.
          </div>
        ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {applicants.map((app) => (
            <div
              key={app.id}
              style={{
                backgroundColor: 'var(--bg-subtle, #F8FAFC)',
                border: '1px solid var(--border-light, #E2E8F0)',
                borderRadius: 16,
                padding: '16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '10px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <h4 style={{ fontSize: '15.5px', fontWeight: 700, color: 'var(--text-main, #0F172A)', margin: 0 }}>
                      {app.name}
                    </h4>
                    {(app.major || app.classCode) && (
                      <span style={{ fontFamily: 'var(--font-sans, Inter, sans-serif)', fontVariantNumeric: 'tabular-nums', fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary, #334155)', backgroundColor: 'var(--bg-card, #FFFFFF)', border: '1px solid var(--border-light, #E2E8F0)', padding: '2px 8px', borderRadius: 6 }}>
                        {[app.major, app.classCode ? `Khóa ${app.classCode}` : ''].filter(Boolean).join(' • ')}
                      </span>
                    )}
                  </div>
                  {app.intro && (
                    <div style={{ fontSize: '14px', color: 'var(--text-secondary, #475569)', marginTop: '6px', fontStyle: 'italic' }}>
                      "{app.intro}"
                    </div>
                  )}
                </div>

                {app.status === 'Accepted' && (
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main, #0F172A)', backgroundColor: 'var(--bg-card, #FFFFFF)', border: '1px solid var(--border-light, #E2E8F0)', padding: '3.5px 10px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#10B981' }} />
                    Đã chấp nhận vào nhóm
                  </span>
                )}
                {app.status === 'Rejected' && (
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted, #64748B)', backgroundColor: 'var(--bg-card, #FFFFFF)', border: '1px solid var(--border-light, #E2E8F0)', padding: '3.5px 10px', borderRadius: 999 }}>
                    Đã từ chối
                  </span>
                )}
              </div>

              {/* 5 Skills scores pills — Unified Neutral Slate Badges instead of 5 Rainbow Pills */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                {[
                  { label: 'Tech', val: app.scores.tech },
                  { label: 'Mgt', val: app.scores.mgt },
                  { label: 'Design', val: app.scores.design },
                  { label: 'Marketing', val: app.scores.mkt },
                  { label: 'Sale', val: app.scores.sale },
                ].map((sk) => (
                  <span
                    key={sk.label}
                    style={{
                      fontSize: '13px',
                      backgroundColor: 'var(--bg-card, #FFFFFF)',
                      color: 'var(--text-secondary, #334155)',
                      border: '1px solid var(--border-light, #E2E8F0)',
                      padding: '3px 9px',
                      borderRadius: 6,
                      fontWeight: 600,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {sk.label}: <strong style={{ color: 'var(--text-main, #0F172A)' }}>{sk.val}/100</strong>
                  </span>
                ))}
              </div>

              {/* Voting Bar & Actions */}
              {app.status === 'Pending' && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-light, #E2E8F0)', paddingTop: '12px', flexWrap: 'wrap', gap: '10px' }}>
                  {/* Member voting buttons */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-muted, #64748B)' }}>Biểu quyết của bạn:</span>
                    <button
                      type="button"
                      onClick={() => handleVoteApplicant(app.id, 'YES')}
                      style={{
                        padding: '5px 11px',
                        borderRadius: 7,
                        border: app.userVote === 'YES' ? '1px solid var(--accent-color, #F26F21)' : '1px solid var(--border-light, #E2E8F0)',
                        backgroundColor: app.userVote === 'YES' ? 'var(--accent-color, #F26F21)' : 'var(--bg-card, #FFFFFF)',
                        color: app.userVote === 'YES' ? '#FFFFFF' : 'var(--text-secondary, #475569)',
                        fontSize: '13.5px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                      }}
                    >
                      <ThumbsUp size={13} />
                      <span>Đồng ý</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleVoteApplicant(app.id, 'NO')}
                      style={{
                        padding: '5px 11px',
                        borderRadius: 7,
                        border: app.userVote === 'NO' ? '1px solid #475569' : '1px solid var(--border-light, #E2E8F0)',
                        backgroundColor: app.userVote === 'NO' ? '#475569' : 'var(--bg-card, #FFFFFF)',
                        color: app.userVote === 'NO' ? '#FFFFFF' : 'var(--text-secondary, #475569)',
                        fontSize: '13.5px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                      }}
                    >
                      <ThumbsDown size={13} />
                      <span>Từ chối</span>
                    </button>

                    <span style={{ fontSize: '13.5px', color: 'var(--text-muted, #64748B)', marginLeft: '4px' }}>
                      (Tổng kết: <strong style={{ color: 'var(--text-main, #0F172A)' }}>{app.yesVotes} Đồng ý • {app.noVotes} Từ chối</strong>)
                    </span>
                  </div>

                  {/* Leader Decision Buttons */}
                  {isCurrentUserLeader && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => handleRejectApplicant(app.id)}
                        style={{
                          padding: '7px 13px',
                          borderRadius: 8,
                          backgroundColor: 'var(--bg-card, #FFFFFF)',
                          border: '1px solid var(--border-light, #E2E8F0)',
                          color: 'var(--text-secondary, #475569)',
                          fontSize: '13.5px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Từ chối
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAcceptApplicant(app)}
                        style={{
                          padding: '7px 16px',
                          borderRadius: 8,
                          backgroundColor: 'var(--accent-color, #F26F21)',
                          border: 'none',
                          color: '#FFFFFF',
                          fontSize: '13.5px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Chấp nhận vào nhóm
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
        )}
      </div>

      {/* Modal: Cập nhật đề tài */}
      {showEditTopicModal &&
        createPortal(
          <div role="dialog" aria-modal="true" onClick={() => setShowEditTopicModal(false)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 16 }}>
            <div onClick={(e) => e.stopPropagation()} style={{ backgroundColor: 'var(--bg-card, #FFFFFF)', border: '1px solid var(--border-light, #E2E8F0)', borderRadius: 20, padding: 24, maxWidth: 480, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main, #0F172A)', margin: '0 0 1rem 0' }}>
              Cập nhật Đề tài Dự án Khởi nghiệp
            </h3>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary, #334155)', marginBottom: '4px' }}>Tên đề tài</label>
              <input
                type="text"
                value={editTopicTitle}
                onChange={(e) => setEditTopicTitle(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 10, border: '1px solid var(--border-medium, #CBD5E1)', backgroundColor: 'var(--bg-subtle, #F8FAFC)', color: 'var(--text-main, #0F172A)', fontSize: '15px', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary, #334155)', marginBottom: '4px' }}>Mô tả ngắn</label>
              <textarea
                rows={3}
                value={editTopicDesc}
                onChange={(e) => setEditTopicDesc(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 10, border: '1px solid var(--border-medium, #CBD5E1)', backgroundColor: 'var(--bg-subtle, #F8FAFC)', color: 'var(--text-main, #0F172A)', fontSize: '15px', boxSizing: 'border-box', fontFamily: 'inherit' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button type="button" onClick={() => setShowEditTopicModal(false)} style={{ padding: '8px 14px', borderRadius: 10, backgroundColor: 'var(--bg-tag, #F1F5F9)', border: '1px solid var(--border-light, #E2E8F0)', color: 'var(--text-secondary, #475569)', fontSize: '14.5px', fontWeight: 600, cursor: 'pointer' }}>Hủy</button>
              <button
                type="button"
                onClick={() => void handleSaveTopic()}
                style={{ padding: '8px 16px', borderRadius: 10, backgroundColor: 'var(--accent-color, #F26F21)', border: 'none', color: '#FFFFFF', fontSize: '14.5px', fontWeight: 600, cursor: 'pointer' }}
              >
                Lưu thay đổi
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal: Chuyển quyền Leader */}
      {showTransferLeaderModal &&
        createPortal(
          <div role="dialog" aria-modal="true" onClick={() => setShowTransferLeaderModal(false)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 16 }}>
            <div onClick={(e) => e.stopPropagation()} style={{ backgroundColor: 'var(--bg-card, #FFFFFF)', border: '1px solid var(--border-light, #E2E8F0)', borderRadius: 20, padding: 24, maxWidth: 440, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main, #0F172A)', margin: '0 0 1rem 0' }}>
              Chuyển quyền Trưởng nhóm
            </h3>
            <p style={{ fontSize: '14.5px', color: 'var(--text-muted, #64748B)', marginBottom: '1rem' }}>
              Chọn một thành viên trong nhóm để chuyển giao trọng trách Trưởng nhóm:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '1.25rem' }}>
              {members
                .filter((m) => m.id !== currentUserId)
                .map((m) => (
                  <label
                    key={m.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '10px 12px',
                      borderRadius: 12,
                      border: selectedNewLeaderId === m.id ? '1px solid var(--accent-color, #F26F21)' : '1px solid var(--border-light, #E2E8F0)',
                      backgroundColor: selectedNewLeaderId === m.id ? 'var(--accent-soft, #FFF7ED)' : 'var(--bg-card, #FFFFFF)',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="radio"
                      name="newLeader"
                      value={m.id}
                      checked={selectedNewLeaderId === m.id}
                      onChange={() => setSelectedNewLeaderId(m.id)}
                      style={{ accentColor: 'var(--accent-color, #F26F21)' }}
                    />
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-main, #0F172A)' }}>{m.name}</div>
                      <div style={{ fontSize: '13.5px', color: 'var(--text-muted, #64748B)' }}>{[m.studentCode, m.major].filter(Boolean).join(' • ')}</div>
                    </div>
                  </label>
                ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button type="button" onClick={() => setShowTransferLeaderModal(false)} style={{ padding: '8px 14px', borderRadius: 10, backgroundColor: 'var(--bg-tag, #F1F5F9)', border: '1px solid var(--border-light, #E2E8F0)', color: 'var(--text-secondary, #475569)', fontSize: '14.5px', fontWeight: 600, cursor: 'pointer' }}>Hủy</button>
              <button
                type="button"
                onClick={handleConfirmTransferLeader}
                disabled={!selectedNewLeaderId}
                style={{ padding: '8px 16px', borderRadius: 10, backgroundColor: 'var(--accent-color, #F26F21)', border: 'none', color: '#FFFFFF', fontSize: '14.5px', fontWeight: 600, cursor: selectedNewLeaderId ? 'pointer' : 'not-allowed', opacity: selectedNewLeaderId ? 1 : 0.6 }}
              >
                Xác nhận chuyển quyền
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal: Gửi yêu cầu Chuyển nhóm / Đổi chéo (Hậu chốt sổ) */}
      {showTransferSwapModal &&
        createPortal(
          <div role="dialog" aria-modal="true" onClick={() => setShowTransferSwapModal(false)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 16 }}>
            <div onClick={(e) => e.stopPropagation()} style={{ backgroundColor: 'var(--bg-card, #FFFFFF)', border: '1px solid var(--border-light, #E2E8F0)', borderRadius: 20, padding: 24, maxWidth: 520, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main, #0F172A)', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ArrowLeftRight size={18} color="var(--accent-color, #F26F21)" />
              <span>Đơn xin Chuyển nhóm / Đổi chéo Hậu Chốt sổ</span>
            </h3>
            <p style={{ fontSize: '14.5px', color: 'var(--text-muted, #64748B)', margin: '0 0 1rem 0' }}>
              Quy trình điều phối nhân sự đặc biệt sau khi học kỳ đã khóa danh sách chính thức.
            </p>

            {/* Constraint check: If current members <= 3 */}
            {members.length <= space.groupThreshold && (
              <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.28)', borderRadius: 12, padding: '10px 14px', marginBottom: '1rem', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <ShieldAlert size={18} color="#DC2626" style={{ flexShrink: 0, marginTop: 2 }} />
                <div style={{ fontSize: '14px', color: 'var(--text-main, #991B1B)', lineHeight: 1.45 }}>
                  <strong>Quy định bảo toàn sĩ số:</strong> Nhóm hiện tại của bạn chỉ có đúng <strong>{members.length} thành viên</strong> (ngưỡng tối thiểu môn học). Bắt buộc phải chọn hình thức <strong>Đổi chéo 2 sinh viên (Swap 1-1)</strong> để không làm nhóm thiếu người!
                </div>
              </div>
            )}

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary, #334155)', marginBottom: '6px' }}>Hình thức chuyển:</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <button
                  type="button"
                  disabled={members.length <= space.groupThreshold}
                  onClick={() => setTransferType('ONE_WAY')}
                  style={{
                    padding: '10px',
                    borderRadius: 12,
                    border: transferType === 'ONE_WAY' ? '1px solid var(--accent-color, #F26F21)' : '1px solid var(--border-light, #E2E8F0)',
                    backgroundColor: transferType === 'ONE_WAY' ? 'var(--accent-soft, rgba(242, 111, 33, 0.1))' : 'var(--bg-card, #FFFFFF)',
                    color: members.length <= space.groupThreshold ? 'var(--text-light, #94A3B8)' : transferType === 'ONE_WAY' ? 'var(--accent-color, #F26F21)' : 'var(--text-secondary, #334155)',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: members.length <= space.groupThreshold ? 'not-allowed' : 'pointer',
                  }}
                >
                  Chuyển 1 chiều
                </button>
                <button
                  type="button"
                  onClick={() => setTransferType('SWAP')}
                  style={{
                    padding: '10px',
                    borderRadius: 12,
                    border: transferType === 'SWAP' ? '1px solid var(--accent-color, #F26F21)' : '1px solid var(--border-light, #E2E8F0)',
                    backgroundColor: transferType === 'SWAP' ? 'var(--accent-soft, rgba(242, 111, 33, 0.1))' : 'var(--bg-card, #FFFFFF)',
                    color: transferType === 'SWAP' ? 'var(--accent-color, #F26F21)' : 'var(--text-secondary, #334155)',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Đổi chéo 2 sinh viên (Swap)
                </button>
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary, #334155)', marginBottom: '4px' }}>Chọn phòng nhóm muốn đến:</label>
              <select
                value={targetRoomCode}
                onChange={(e) => {
                  setTargetRoomCode(e.target.value);
                  setSwapStudentName('');
                }}
                style={{ width: '100%', height: 44, padding: '0 12px', borderRadius: 10, border: '1px solid var(--border-medium, #CBD5E1)', backgroundColor: 'var(--bg-subtle, #F8FAFC)', color: 'var(--text-main, #0F172A)', fontSize: '15px' }}
              >
                <option value="">— Chọn phòng nhóm —</option>
                {transferTargets.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.code}{t.name ? ` — ${t.name}` : ''} ({t.memberCount}/{t.maxMembers} SV)
                  </option>
                ))}
              </select>
            </div>

            {transferType === 'SWAP' && (
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary, #334155)', marginBottom: '4px' }}>Sinh viên đối tác đồng ý đổi chéo:</label>
                <select
                  value={swapStudentName}
                  onChange={(e) => setSwapStudentName(e.target.value)}
                  style={{ width: '100%', height: 44, padding: '0 12px', borderRadius: 10, border: '1px solid var(--border-medium, #CBD5E1)', backgroundColor: 'var(--bg-subtle, #F8FAFC)', color: 'var(--text-main, #0F172A)', fontSize: '15px' }}
                >
                  <option value="">— Chọn sinh viên —</option>
                  {transferTarget?.members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}{m.studentCode ? ` (${m.studentCode})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary, #334155)', marginBottom: '4px' }}>Lý do xin chuyển / đổi chéo (bắt buộc):</label>
              <textarea
                rows={3}
                required
                placeholder="Nêu rõ lý do học vụ, định hướng đề tài hoặc sự phù hợp kỹ năng để Điều phối viên xem xét..."
                value={transferReason}
                onChange={(e) => setTransferReason(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 10, border: '1px solid var(--border-medium, #CBD5E1)', backgroundColor: 'var(--bg-subtle, #F8FAFC)', color: 'var(--text-main, #0F172A)', fontSize: '15px', boxSizing: 'border-box', fontFamily: 'inherit' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button type="button" onClick={() => setShowTransferSwapModal(false)} style={{ padding: '8px 14px', borderRadius: 10, backgroundColor: 'var(--bg-tag, #F1F5F9)', border: '1px solid var(--border-light, #E2E8F0)', color: 'var(--text-secondary, #475569)', fontSize: '14.5px', fontWeight: 600, cursor: 'pointer' }}>Hủy</button>
              <button
                type="button"
                onClick={() => void handleSubmitTransfer()}
                disabled={!targetRoomCode || (transferType === 'SWAP' && !swapStudentName)}
                style={{ padding: '8px 18px', borderRadius: 10, background: 'var(--accent-gradient, var(--accent-color, #F26F21))', border: 'none', color: '#FFFFFF', fontSize: '14.5px', fontWeight: 600, cursor: !targetRoomCode || (transferType === 'SWAP' && !swapStudentName) ? 'not-allowed' : 'pointer', opacity: !targetRoomCode || (transferType === 'SWAP' && !swapStudentName) ? 0.6 : 1 }}
              >
                Gửi đơn điều chuyển
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// 3. JOIN REQUESTS PAGE (/join-requests)
// ══════════════════════════════════════════════════════════════════════════════
export const JoinRequestsPage: React.FC = () => {
  interface MyRequest {
    id: string;
    roomCode: string;
    topic: string;
    submittedAt: string;
    status: 'Pending' | 'Cancelled' | 'Rejected' | 'Accepted';
    reason?: string;
  }
  const { space } = useSelectedSpace();
  const dialog = useConfirm();
  const [raw, setRaw] = useState<JoinRequest[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const maxPending = space?.maxConcurrentApplies ?? 3;

  const load = useCallback(async () => {
    try {
      setRaw(await workspaceApi.listMyJoinRequests());
    } catch (err) {
      setToastMessage(errorMessage(err, 'Không tải được đơn ứng tuyển.'));
      setTimeout(() => setToastMessage(null), 4000);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Lắng nghe sự kiện duyệt / từ chối đơn apply thời gian thực
  useEffect(() => {
    const handleRealtime = () => void load();
    window.addEventListener('realtime:join-request-decided', handleRealtime);
    window.addEventListener('realtime:group-updated', handleRealtime);
    return () => {
      window.removeEventListener('realtime:join-request-decided', handleRealtime);
      window.removeEventListener('realtime:group-updated', handleRealtime);
    };
  }, [load]);

  const requests: MyRequest[] = useMemo(
    () =>
      [...raw]
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map((r) => ({
          id: r.id,
          roomCode: r.groupName,
          topic: r.message ? `“${r.message}”` : 'Không có lời giới thiệu',
          submittedAt: formatDateTime(r.createdAt),
          status: r.status,
          reason:
            r.status === 'Cancelled'
              ? 'Đơn đã hủy (bạn rút đơn, đã vào nhóm khác hoặc nhóm đóng tuyển)'
              : r.status === 'Rejected'
              ? 'Trưởng nhóm đã từ chối đơn'
              : r.status === 'Accepted'
              ? 'Đã được nhận vào nhóm'
              : undefined,
        })),
    [raw]
  );
  const pendingCount = requests.filter((r) => r.status === 'Pending').length;

  const handleWithdraw = async (id: string) => {
    const ok = await dialog.confirm({ title: 'Rút đơn ứng tuyển này?', confirmLabel: 'Rút đơn', danger: true });
    if (ok === null) return;
    try {
      await workspaceApi.cancelJoinRequest(id);
      setToastMessage('Đã rút đơn ứng tuyển thành công!');
      await load();
    } catch (err) {
      setToastMessage(errorMessage(err));
    }
    setTimeout(() => setToastMessage(null), 3000);
  };

  return (
    <div style={{ maxWidth: 1560, margin: '0 auto', paddingBottom: '3.5rem' }}>
      {dialog.node}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: 24,
            right: 24,
            zIndex: 9999,
            backgroundColor: '#0F172A',
            color: '#FFFFFF',
            padding: '12px 20px',
            borderRadius: 12,
            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          <CheckCircle2 size={18} color="#22C55E" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
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
          <span style={{ color: 'var(--text-main, #0F172A)', fontWeight: 500 }}>Đơn ứng tuyển</span>
        </div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 650, color: 'var(--text-main, #0F172A)', margin: '0 0 6px 0', letterSpacing: '-0.022em' }}>
          Đơn Ứng Tuyển Của Tôi
        </h1>
        <p style={{ color: 'var(--text-muted, #64748B)', fontSize: '0.95rem', fontWeight: 400, margin: 0 }}>
          Theo dõi trạng thái xét duyệt các đơn ứng tuyển vào nhóm khởi nghiệp của bạn.
        </p>
      </div>

      {/* Counter Limit Box */}
      <div
        style={{
          backgroundColor: 'var(--bg-card, #FFFFFF)',
          border: '1px solid var(--border-light, #E2E8F0)',
          borderRadius: '20px',
          padding: '20px 26px',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.03)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: 34, height: 34, borderRadius: 8, backgroundColor: 'var(--bg-tag, #F1F5F9)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary, #475569)' }}>
            <Clock size={16} />
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main, #0F172A)' }}>
              Đơn đang chờ duyệt: <span style={{ fontWeight: 600, color: 'var(--text-main, #0F172A)' }}>{pendingCount} / {maxPending} đơn tối đa</span> cùng lúc
            </div>
            <div style={{ fontSize: '12.5px', fontWeight: 400, color: 'var(--text-muted, #64748B)', marginTop: '2px' }}>
              Quy định giới hạn tối đa 3 đơn đồng thời để đảm bảo tính cam kết và tránh gửi đơn trùng lặp.
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '5px' }}>
          {Array.from({ length: maxPending }, (_, idx) => idx + 1).map((slot) => (
            <div
              key={slot}
              style={{
                width: 24,
                height: 4,
                borderRadius: 999,
                backgroundColor: slot <= pendingCount ? 'var(--accent-color, #F26F21)' : 'var(--border-light, #E2E8F0)',
              }}
            />
          ))}
        </div>
      </div>

      {/* Request List */}
      {requests.length === 0 ? (
        <StateBox
          kind="empty"
          title="Chưa có đơn ứng tuyển nào"
          message="Bạn chưa gửi đơn ứng tuyển vào nhóm nào. Hãy khám phá danh sách Phòng & Nhóm để tìm đội ngũ phù hợp."
          action={
            <Link to="/groups" style={{ textDecoration: 'none' }}>
              <Button icon={<Layers size={15} />}>Khám phá Phòng & Nhóm</Button>
            </Link>
          }
        />
      ) : (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {requests.map((req, idx) => (
          <div
            key={req.id}
            className="motion-card-interactive motion-stagger-item"
            style={
              {
                '--stagger-index': Math.min(idx, 6),
                backgroundColor: 'var(--bg-card, #FFFFFF)',
                border: '1px solid var(--border-light, #E2E8F0)',
                borderRadius: '12px',
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
              } as React.CSSProperties
            }
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px', flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-main, #0F172A)', fontSize: '14.5px' }}>
                  {req.topic}
                </span>
                <span style={{ color: '#CBD5E1' }}>·</span>
                <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 400, fontSize: '12px', color: '#94A3B8' }}>
                  {req.roomCode}
                </span>
              </div>
              <div style={{ fontSize: '12px', fontWeight: 400, color: '#94A3B8', fontVariantNumeric: 'tabular-nums' }}>
                Thời điểm nộp đơn: {req.submittedAt}
              </div>
              {req.reason && (
                <div style={{ fontSize: '13px', color: 'var(--text-secondary, #475569)', marginTop: '4px', fontWeight: 450 }}>
                  Ghi chú: {req.reason}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              {req.status === 'Pending' && (
                <>
                  <span
                    style={{
                      fontSize: '12.5px',
                      fontWeight: 500,
                      color: 'var(--text-secondary, #334155)',
                      backgroundColor: 'var(--bg-subtle, #F8FAFC)',
                      border: '1px solid var(--border-light, #E2E8F0)',
                      padding: '3px 9px',
                      borderRadius: 6,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        backgroundColor: 'var(--status-recruiting, #F26F21)',
                        boxShadow: '0 0 0 2px var(--accent-soft, rgba(242, 111, 33, 0.2))',
                        flexShrink: 0,
                      }}
                    />
                    Đang chờ duyệt
                  </span>
                  <button
                    type="button"
                    onClick={() => void handleWithdraw(req.id)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: 8,
                      backgroundColor: 'var(--bg-card, #FFFFFF)',
                      border: '1px solid var(--border-light, #E2E8F0)',
                      color: 'var(--text-secondary, #475569)',
                      fontSize: '12.5px',
                      fontWeight: 500,
                      cursor: 'pointer',
                    }}
                  >
                    Rút đơn ứng tuyển
                  </button>
                </>
              )}
              {req.status === 'Rejected' && (
                <span
                  style={{
                    fontSize: '12.5px',
                    fontWeight: 500,
                    color: '#DC2626',
                    backgroundColor: 'var(--bg-subtle, #F8FAFC)',
                    border: '1px solid var(--border-light, #E2E8F0)',
                    padding: '3px 9px',
                    borderRadius: 6,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#EF4444', flexShrink: 0 }} />
                  Đã từ chối
                </span>
              )}
              {req.status === 'Cancelled' && (
                <span
                  style={{
                    fontSize: '12.5px',
                    fontWeight: 500,
                    color: 'var(--text-muted, #64748B)',
                    backgroundColor: 'var(--bg-subtle, #F8FAFC)',
                    border: '1px solid var(--border-light, #E2E8F0)',
                    padding: '3px 9px',
                    borderRadius: 6,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#94A3B8', flexShrink: 0 }} />
                  Đã hủy
                </span>
              )}
              {req.status === 'Accepted' && (
                <span
                  style={{
                    fontSize: '12.5px',
                    fontWeight: 500,
                    color: 'var(--text-secondary, #334155)',
                    backgroundColor: 'var(--bg-subtle, #F8FAFC)',
                    border: '1px solid var(--border-light, #E2E8F0)',
                    padding: '3px 9px',
                    borderRadius: 6,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      backgroundColor: '#10B981',
                      boxShadow: '0 0 0 2px rgba(16, 185, 129, 0.18)',
                      flexShrink: 0,
                    }}
                  />
                  Đã chấp thuận
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
      )}
    </div>
  );
};
