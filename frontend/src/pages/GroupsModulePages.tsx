import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSelectedSpace } from '../hooks/useSelectedSpace';
import {
  workspaceApi,
  errorMessage,
  errorCode,
  formatDateTime,
  ROOM_STATUS_LABEL,
  SPACE_STATUS_LABEL,
  type CandidateProfile,
  type GroupDetail,
  type JoinRequest,
  type LeaderElection,
  type MatchScore,
  type RoomSummary,
  type RosterGroup,
  type TransferRequest,
} from '../api/workspace';
import {
  PageShell,
  PageHeader,
  Card,
  CardTitle,
  Button,
  Pill,
  Banner,
  StateBox,
  NoSpaceState,
  Modal,
  Field,
  fieldStyle,
  SeatBar,
  SkillBars,
  SKILL_KEYS,
  averageSkills,
  useToast,
  useConfirm,
  InfoTip,
  ROOM_STATUS_DOT,
} from '../components/workspace/ui';
import {
  Sparkles,
  Search,
  Crown,
  LogOut,
  Edit3,
  Clock,
  Layers,
  Vote,
  ThumbsUp,
  ThumbsDown,
  Lock,
  Unlock,
  ArrowLeftRight,
  Send,
  TrendingUp,
  UserPlus,
  Users,
  Eye,
  RefreshCw,
  UserX,
  CheckCircle2,
  XCircle,
} from '../utils/icons';

const textareaStyle: React.CSSProperties = {
  ...fieldStyle,
  height: 'auto',
  padding: '10px 12px',
  resize: 'vertical',
  fontFamily: 'inherit',
  lineHeight: 1.5,
};

const ProfileHint: React.FC = () => (
  <span>
    {' '}
    <Link to="/profile" style={{ color: 'var(--accent-color, #F26F21)', fontWeight: 700 }}>
      Mở hồ sơ
    </Link>
  </span>
);

// ══════════════════════════════════════════════════════════════════════════════
// 1. DANH SÁCH PHÒNG NHÓM (/groups)
// ══════════════════════════════════════════════════════════════════════════════

/** Tên phòng do hệ thống đặt sẵn (vd. "EXE101 - Phòng 01") — không phải tên đề tài do nhóm đặt. */
const isDefaultRoomName = (name: string) => /phòng\s*\d+\s*$/i.test(name.trim());

const hasCustomName = (room: RoomSummary, detail?: GroupDetail) => !isDefaultRoomName(detail?.name ?? room.name);

const roomTitle = (room: RoomSummary, detail?: GroupDetail) =>
  hasCustomName(room, detail) ? detail?.name ?? room.name : room.roomCode ?? room.name;

const ROOM_TABS = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'Empty', label: 'Phòng trống' },
  { value: 'Forming', label: 'Đang lập nhóm' },
  { value: 'Recruiting', label: 'Đang tuyển' },
  { value: 'Closed', label: 'Đã đóng / khóa' },
];

export const GroupsPage: React.FC = () => {
  const { user } = useAuth();
  const { space, loading: spacesLoading, error: spacesError } = useSelectedSpace();
  const toast = useToast();
  const dialog = useConfirm();
  const isStudent = user?.role === 'Student';

  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [details, setDetails] = useState<Record<string, GroupDetail>>({});
  const [myGroup, setMyGroup] = useState<GroupDetail | null>(null);
  const [myPendingGroupIds, setMyPendingGroupIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState('ALL');
  const [search, setSearch] = useState('');
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [applyRoom, setApplyRoom] = useState<RoomSummary | null>(null);
  const [applyMessage, setApplyMessage] = useState('');
  const [applying, setApplying] = useState(false);
  const [inspectRoom, setInspectRoom] = useState<RoomSummary | null>(null);
  const [matchScores, setMatchScores] = useState<Record<string, MatchScore | 'loading' | 'error'>>({});

  const spaceId = space?.id;

  const load = useCallback(async () => {
    if (!spaceId) return;
    setLoading(true);
    try {
      const list = await workspaceApi.listRooms(spaceId);
      setRooms(list.filter((r) => r.status !== 'Disbanded'));
      // Chi tiết thành viên của các phòng đã có người (API ẩn thành viên của nhóm đã đóng với sinh viên ngoài nhóm).
      const occupied = list.filter((r) => r.memberCount > 0);
      const detailList = await Promise.all(occupied.map((r) => workspaceApi.getGroup(r.id).catch(() => null)));
      const map: Record<string, GroupDetail> = {};
      detailList.forEach((d) => d && (map[d.id] = d));
      setDetails(map);
      if (isStudent) {
        const [mine, requests] = await Promise.all([
          workspaceApi.getMyGroup(spaceId).catch(() => null),
          workspaceApi.listMyJoinRequests().catch(() => [] as JoinRequest[]),
        ]);
        setMyGroup(mine);
        setMyPendingGroupIds(new Set(requests.filter((r) => r.status === 'Pending').map((r) => r.groupId)));
      }
      setError(null);
    } catch (err) {
      setError(errorMessage(err, 'Không tải được danh sách phòng.'));
    } finally {
      setLoading(false);
    }
  }, [spaceId, isStudent]);

  useEffect(() => {
    setRooms([]);
    setDetails({});
    setMyGroup(null);
    setMatchScores({});
    void load();
  }, [load]);

  const showError = (err: unknown) => {
    const message = errorMessage(err);
    toast.show(errorCode(err) === 'PROFILE_INCOMPLETE' ? `${message} Vào trang Hồ sơ cá nhân để hoàn tất.` : message, 'error');
  };

  const handleDirectJoin = async (room: RoomSummary) => {
    const ok = await dialog.confirm({
      title: `Vào phòng ${room.roomCode ?? room.name}?`,
      message: room.memberCount === 0 ? 'Bạn là người đầu tiên nên sẽ làm Trưởng nhóm tạm thời.' : undefined,
      confirmLabel: 'Vào phòng',
    });
    if (ok === null) return;
    setJoiningId(room.id);
    try {
      const res = await workspaceApi.directJoin(room.id);
      toast.show(res.message);
      await load();
    } catch (err) {
      showError(err);
    } finally {
      setJoiningId(null);
    }
  };

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applyRoom) return;
    setApplying(true);
    try {
      await workspaceApi.createJoinRequest(applyRoom.id, applyMessage.trim());
      toast.show(`Đã nộp đơn vào ${applyRoom.roomCode ?? applyRoom.name}. Thành viên nhóm sẽ biểu quyết và Trưởng nhóm quyết định.`);
      setApplyRoom(null);
      setApplyMessage('');
      await load();
    } catch (err) {
      showError(err);
    } finally {
      setApplying(false);
    }
  };

  const loadMatchScore = async (roomId: string) => {
    setMatchScores((prev) => ({ ...prev, [roomId]: 'loading' }));
    try {
      const score = await workspaceApi.getMatchScore(roomId);
      setMatchScores((prev) => ({ ...prev, [roomId]: score }));
    } catch (err) {
      setMatchScores((prev) => ({ ...prev, [roomId]: 'error' }));
      showError(err);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rooms
      .filter((r) => {
        if (tab === 'ALL') return true;
        if (tab === 'Closed') return r.status === 'Closed' || r.status === 'Locked';
        return r.status === tab;
      })
      .filter((r) => {
        if (!q) return true;
        const d = details[r.id];
        return [r.roomCode ?? '', r.name, r.leaderName ?? '', d?.description ?? '', ...(d?.members.map((m) => m.fullName) ?? [])]
          .join(' ')
          .toLowerCase()
          .includes(q);
      })
      .sort((a, b) => (a.roomCode ?? a.name).localeCompare(b.roomCode ?? b.name));
  }, [rooms, details, tab, search]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { ALL: rooms.length, Empty: 0, Forming: 0, Recruiting: 0, Closed: 0 };
    rooms.forEach((r) => {
      if (r.status === 'Locked' || r.status === 'Closed') c.Closed += 1;
      else if (r.status in c) c[r.status] += 1;
    });
    return c;
  }, [rooms]);

  const header = (
    <PageHeader
      title="Phòng nhóm"
      meta={
        isStudent ? (
          <InfoTip text="Phòng trống / đang lập nhóm: vào thẳng (người đầu tiên làm Trưởng nhóm tạm thời). Phòng đủ ngưỡng: chỉ nhận thêm qua đơn ứng tuyển." />
        ) : undefined
      }
      actions={
        space ? (
          <Button variant="ghost" icon={<RefreshCw size={15} />} onClick={() => void load()}>
            Tải lại
          </Button>
        ) : undefined
      }
    />
  );

  if (!space) {
    return (
      <PageShell>
        {header}
        <NoSpaceState loading={spacesLoading} error={spacesError} role={user?.role} />
      </PageShell>
    );
  }

  const registrationOpen = space.status === 'Open';
  const inspectDetail = inspectRoom ? details[inspectRoom.id] : undefined;

  return (
    <PageShell>
      {toast.node}
      {dialog.node}
      {header}

      {isStudent && myGroup && (
        <Banner tone="success">
          Bạn đang ở <b>{myGroup.roomCode ?? myGroup.name}</b>.{' '}
          <Link to="/my-group" style={{ color: 'inherit', fontWeight: 700 }}>
            Xem nhóm →
          </Link>
        </Banner>
      )}
      {isStudent && !registrationOpen && (
        <Banner tone="warning">
          {SPACE_STATUS_LABEL[space.status]}: chưa vào phòng hoặc nộp đơn được.
        </Banner>
      )}
      {isStudent && user && user.isProfileCompleted === false && (
        <Banner tone="info">
          Hoàn tất hồ sơ 5 kỹ năng trước khi vào phòng.
          <ProfileHint />
        </Banner>
      )}
      {error && <Banner tone="error">{error}</Banner>}

      {/* Bộ lọc */}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 12, backgroundColor: 'var(--bg-subtle, #F1F5F9)', border: '1px solid var(--border-light, #E2E8F0)', flexWrap: 'wrap' }}>
          {ROOM_TABS.map((t) => {
            const active = tab === t.value;
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => setTab(t.value)}
                style={{
                  height: 34,
                  padding: '0 14px',
                  borderRadius: 9,
                  border: 'none',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  backgroundColor: active ? 'var(--bg-card, #FFFFFF)' : 'transparent',
                  color: active ? 'var(--text-main, #0F172A)' : 'var(--text-muted, #64748B)',
                  boxShadow: active ? '0 1px 2px rgba(15,23,42,0.08)' : 'none',
                }}
              >
                {t.label} <span style={{ color: 'var(--text-light, #94A3B8)', fontVariantNumeric: 'tabular-nums' }}>{counts[t.value] ?? 0}</span>
              </button>
            );
          })}
        </div>
        <div style={{ position: 'relative', width: 'min(320px, 100%)' }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: 13, color: 'var(--text-light, #94A3B8)' }} />
          <input
            type="text"
            placeholder="Tìm mã phòng, đề tài, thành viên..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ ...fieldStyle, paddingLeft: '2.25rem' }}
          />
        </div>
      </div>

      {loading && rooms.length === 0 ? (
        <StateBox kind="loading" message="Đang tải danh sách phòng..." />
      ) : rooms.length === 0 ? (
        <StateBox kind="empty" title="Chưa có phòng nào" message="Điều phối viên chưa tạo phòng cho môn học này." />
      ) : filtered.length === 0 ? (
        <StateBox kind="empty" message="Không có phòng khớp bộ lọc." />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(290px, 100%), 1fr))', gap: 16 }}>
          {filtered.map((room) => {
            const detail = details[room.id];
            const isMine = myGroup?.id === room.id;
            const hasPending = myPendingGroupIds.has(room.id);
            const canDirectJoin = isStudent && registrationOpen && !myGroup && (room.status === 'Empty' || room.status === 'Forming');
            const canApply =
              isStudent && registrationOpen && !myGroup && !hasPending && room.status === 'Recruiting' && room.memberCount < room.maxMembers && !detail?.isClosedByLeader;
            const score = matchScores[room.id];
            return (
              <div
                key={room.id}
                style={{
                  backgroundColor: 'var(--bg-card, #FFFFFF)',
                  border: isMine ? '2px solid var(--accent-color, #F26F21)' : '1px solid var(--border-light, #E2E8F0)',
                  borderRadius: 18,
                  padding: 18,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ minWidth: 0 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-main, #0F172A)', margin: 0, lineHeight: 1.3 }}>{roomTitle(room, detail)}</h3>
                    {hasCustomName(room, detail) && room.roomCode && (
                      <div style={{ fontSize: 12.5, color: 'var(--text-muted, #64748B)', marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>{room.roomCode}</div>
                    )}
                  </div>
                  <Pill dot={ROOM_STATUS_DOT[room.status]}>{isMine ? 'Của bạn' : ROOM_STATUS_LABEL[room.status] ?? room.status}</Pill>
                </div>
                <div>
                  {detail?.description && (
                    <p style={{ fontSize: 13.5, color: 'var(--text-muted, #64748B)', margin: '4px 0 0 0', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {detail.description}
                    </p>
                  )}
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                    <span style={{ color: 'var(--text-muted, #64748B)' }}>Sĩ số</span>
                    <span style={{ fontWeight: 700, color: 'var(--text-main, #0F172A)', fontVariantNumeric: 'tabular-nums' }}>
                      {room.memberCount}/{room.maxMembers}
                    </span>
                  </div>
                  <SeatBar count={room.memberCount} max={room.maxMembers} />
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {room.memberCount === 0 ? null : detail && detail.members.length > 0 ? (
                    detail.members.map((m) => (
                      <div key={m.userId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, fontSize: 14 }}>
                        <span style={{ color: 'var(--text-main, #0F172A)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.fullName}</span>
                        {m.role === 'Leader' && (
                          <span title="Trưởng nhóm" style={{ color: 'var(--accent-color, #F26F21)', display: 'flex' }}>
                            <Crown size={14} />
                          </span>
                        )}
                      </div>
                    ))
                  ) : (
                    <span style={{ fontSize: 13.5, color: 'var(--text-light, #94A3B8)' }}>
                      Trưởng nhóm: {room.leaderName ?? '—'}
                    </span>
                  )}
                </div>
                {score && score !== 'loading' && score !== 'error' && (
                  <div style={{ padding: '10px 12px', borderRadius: 10, backgroundColor: 'var(--bg-subtle, #F8FAFC)', border: '1px solid var(--border-light, #E2E8F0)', fontSize: 13.5 }}>
                    <div style={{ fontWeight: 750, color: 'var(--text-main, #0F172A)' }}>Độ phù hợp: {score.score}/100</div>
                    {score.matchedSkills.length > 0 && <div style={{ color: '#047857' }}>Khớp: {score.matchedSkills.join(', ')}</div>}
                    {score.missingSkills.length > 0 && <div style={{ color: 'var(--text-muted, #64748B)' }}>Còn thiếu: {score.missingSkills.join(', ')}</div>}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingTop: 10, borderTop: '1px solid var(--border-subtle, #F1F5F9)' }}>
                  {!isStudent ? (
                    <Button variant="outline" block icon={<Eye size={15} />} onClick={() => setInspectRoom(room)}>
                      Xem chi tiết
                    </Button>
                  ) : isMine ? (
                    <Link to="/my-group" style={{ flex: 1, textDecoration: 'none' }}>
                      <Button block icon={<Users size={15} />}>Vào Nhóm của tôi</Button>
                    </Link>
                  ) : (
                    <>
                      {canDirectJoin && (
                        <Button variant={room.status === 'Empty' ? 'outline' : 'primary'} style={{ flex: 1 }} icon={<UserPlus size={15} />} loading={joiningId === room.id} disabled={!!joiningId} onClick={() => void handleDirectJoin(room)}>
                          Vào phòng
                        </Button>
                      )}
                      {canApply && (
                        <Button style={{ flex: 1 }} icon={<Send size={15} />} onClick={() => setApplyRoom(room)}>
                          Nộp đơn
                        </Button>
                      )}
                      {hasPending && <Pill dot="#F59E0B">Đã nộp đơn</Pill>}
                      {room.memberCount > 0 && !myGroup && (
                        <Button variant="outline" style={{ flex: canDirectJoin || canApply ? undefined : 1 }} icon={<TrendingUp size={15} />} loading={score === 'loading'} onClick={() => void loadMatchScore(room.id)}>
                          Độ phù hợp
                        </Button>
                      )}
                      {!canDirectJoin && !canApply && !hasPending && room.memberCount === 0 && (
                        <span style={{ fontSize: 13.5, color: 'var(--text-muted, #64748B)' }}>{myGroup ? 'Bạn đã có nhóm.' : 'Chưa mở đăng ký.'}</span>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Nộp đơn */}
      <Modal open={!!applyRoom} onClose={() => setApplyRoom(null)} title={`Nộp đơn vào ${applyRoom?.roomCode ?? applyRoom?.name ?? ''}`}>
        <form onSubmit={handleApply} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label="Giới thiệu bản thân" hint={`Tối đa ${space.maxConcurrentApplies} đơn chờ cùng lúc.`}>
            <textarea rows={5} required style={textareaStyle} value={applyMessage} onChange={(e) => setApplyMessage(e.target.value)} placeholder="Điểm mạnh, kinh nghiệm, vai trò bạn muốn đảm nhận trong nhóm..." />
          </Field>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <Button variant="outline" onClick={() => setApplyRoom(null)}>
              Hủy
            </Button>
            <Button type="submit" icon={<Send size={15} />} loading={applying}>
              Gửi đơn
            </Button>
          </div>
        </form>
      </Modal>

      {/* Xem chi tiết (Điều phối viên / Giảng viên) */}
      <Modal open={!!inspectRoom} onClose={() => setInspectRoom(null)} width={640} title={inspectRoom?.roomCode ?? inspectRoom?.name ?? ''} subtitle={inspectRoom ? `${ROOM_STATUS_LABEL[inspectRoom.status]} • ${inspectRoom.memberCount}/${inspectRoom.maxMembers} thành viên` : undefined}>
        {inspectRoom && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <div style={{ fontWeight: 750, color: 'var(--text-main, #0F172A)' }}>{inspectDetail?.name ?? inspectRoom.name}</div>
              {inspectDetail?.description && <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted, #64748B)' }}>{inspectDetail.description}</p>}
            </div>
            {!inspectDetail || inspectDetail.members.length === 0 ? (
              <StateBox kind="empty" message="Phòng chưa có thành viên." />
            ) : (
              inspectDetail.members.map((m) => (
                <div key={m.userId} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border-light, #E2E8F0)' }}>
                  <span style={{ fontWeight: 650 }}>{m.fullName}</span>
                  <span style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13.5, color: 'var(--text-muted, #64748B)' }}>
                    {m.role === 'Leader' && <Pill tone="accent">Trưởng nhóm</Pill>}
                    {formatDateTime(m.joinedAt)}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </Modal>
    </PageShell>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// 2. NHÓM CỦA TÔI (/my-group)
// ══════════════════════════════════════════════════════════════════════════════

const formatCountdown = (secs: number) => {
  const s = Math.max(0, Math.floor(secs));
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
};

export const MyGroupPage: React.FC = () => {
  const { user } = useAuth();
  const { space, loading: spacesLoading, error: spacesError } = useSelectedSpace();
  const toast = useToast();
  const dialog = useConfirm();

  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [profiles, setProfiles] = useState<Record<string, CandidateProfile>>({});
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [election, setElection] = useState<LeaderElection | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [myTransfers, setMyTransfers] = useState<TransferRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', description: '' });
  const [leaderModalOpen, setLeaderModalOpen] = useState(false);
  const [electionModalOpen, setElectionModalOpen] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [removeTarget, setRemoveTarget] = useState<{ userId: string; fullName: string } | null>(null);
  const [removeReason, setRemoveReason] = useState('');
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferGroups, setTransferGroups] = useState<RosterGroup[]>([]);
  const [transferForm, setTransferForm] = useState({ targetGroupId: '', swapWithStudentId: '', reason: '' });

  const spaceId = space?.id;

  const load = useCallback(async () => {
    if (!spaceId) return;
    setLoading(true);
    try {
      const mine = await workspaceApi.getMyGroup(spaceId);
      setGroup(mine);
      workspaceApi
        .listMyTransferRequests()
        .then((list) => setMyTransfers(list.filter((t) => t.spaceId === spaceId).sort((a, b) => b.createdAt.localeCompare(a.createdAt))))
        .catch(() => setMyTransfers([]));
      if (!mine) {
        setRequests([]);
        setElection(null);
        setError(null);
        return;
      }
      const [reqs, current] = await Promise.all([
        workspaceApi.listGroupJoinRequests(mine.id).catch(() => [] as JoinRequest[]),
        workspaceApi.getCurrentElection(mine.id).catch(() => null),
      ]);
      setRequests(reqs);
      setElection(current);
      setCountdown(current?.status === 'Active' ? current.secondsRemaining : 0);
      const ids = [...new Set([...mine.members.map((m) => m.userId), ...reqs.map((r) => r.studentId)])];
      const list = await workspaceApi.getProfiles(ids).catch(() => [] as CandidateProfile[]);
      setProfiles(Object.fromEntries(list.map((p) => [p.userId, p])));
      setError(null);
    } catch (err) {
      setError(errorMessage(err, 'Không tải được thông tin nhóm.'));
    } finally {
      setLoading(false);
    }
  }, [spaceId]);

  useEffect(() => {
    setGroup(null);
    void load();
  }, [load]);

  // Đếm ngược thời hạn bầu Trưởng nhóm; hết giờ thì tải lại kết quả.
  useEffect(() => {
    if (!election || election.status !== 'Active') return;
    const timer = window.setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          void load();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [election, load]);

  const voteRequest = async (req: JoinRequest, isUpvote: boolean) => {
    const comment = await dialog.confirm({
      title: isUpvote ? `Ủng hộ ${req.studentName}?` : `Không ủng hộ ${req.studentName}?`,
      confirmLabel: isUpvote ? 'Ủng hộ' : 'Không ủng hộ',
      input: { label: 'Nhận xét' },
    });
    if (comment === null) return;
    await act(`vote-${req.id}`, () => workspaceApi.voteJoinRequest(req.id, isUpvote, comment || undefined), 'Đã ghi nhận biểu quyết.');
  };

  const act = async (key: string, action: () => Promise<unknown>, success: string) => {
    setBusy(key);
    try {
      await action();
      toast.show(success);
      await load();
      return true;
    } catch (err) {
      toast.show(errorMessage(err), 'error');
      return false;
    } finally {
      setBusy(null);
    }
  };

  const header = (
    <PageHeader
      title="Nhóm của tôi"
      actions={
        space ? (
          <Button variant="ghost" icon={<RefreshCw size={15} />} onClick={() => void load()}>
            Tải lại
          </Button>
        ) : undefined
      }
    />
  );

  if (!space) {
    return (
      <PageShell>
        {header}
        <NoSpaceState loading={spacesLoading} error={spacesError} role={user?.role} />
      </PageShell>
    );
  }

  const transferList = myTransfers.length > 0 && (
    <Card style={{ marginTop: '1.5rem' }}>
      <CardTitle icon={<ArrowLeftRight size={18} />} title="Yêu cầu chuyển nhóm của tôi" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {myTransfers.map((t) => (
          <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '12px 14px', borderRadius: 12, border: '1px solid var(--border-light, #E2E8F0)' }}>
            <div style={{ fontSize: 14 }}>
              <b>{t.fromGroupCode}</b> → <b>{t.targetGroupCode}</b>
              {t.swapWithStudentName && <span style={{ color: 'var(--text-muted, #64748B)' }}> (đổi với {t.swapWithStudentName})</span>}
              <div style={{ color: 'var(--text-muted, #64748B)', fontSize: 13 }}>
                {formatDateTime(t.createdAt)}
                {t.decisionReason ? ` • ${t.decisionReason}` : ''}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Pill dot={ROOM_STATUS_DOT[t.status]}>{{ Pending: 'Chờ duyệt', Approved: 'Đã duyệt', Rejected: 'Bị từ chối', Cancelled: 'Đã hủy' }[t.status]}</Pill>
              {t.status === 'Pending' && (
                <Button variant="outline" style={{ height: 34 }} loading={busy === `cancel-transfer-${t.id}`} onClick={() => void act(`cancel-transfer-${t.id}`, () => workspaceApi.cancelTransferRequest(t.id), 'Đã hủy yêu cầu chuyển nhóm.')}>
                  Hủy
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );

  if (!group) {
    return (
      <PageShell>
        {toast.node}
      {dialog.node}
        {header}
        {error && <Banner tone="error">{error}</Banner>}
        {loading ? (
          <StateBox kind="loading" message="Đang tải nhóm của bạn..." />
        ) : (
          <StateBox
            kind="empty"
            title="Bạn chưa có nhóm"
            message={
              space.status === 'Open'
                ? 'Vào thẳng một phòng trống / đang lập nhóm, hoặc nộp đơn vào nhóm đang tuyển.'
                : 'Đăng ký tự nguyện đã đóng. Điều phối viên sẽ phân bổ bạn vào một nhóm.'
            }
            action={
              <Link to="/groups" style={{ textDecoration: 'none' }}>
                <Button icon={<Layers size={15} />}>Xem danh sách phòng</Button>
              </Link>
            }
          />
        )}
        {transferList}
      </PageShell>
    );
  }

  const isLeader = !!user && group.leaderId === user.id;
  const isLocked = group.status === 'Locked' || space.status === 'Locked';
  const isFull = group.memberCount >= group.maxMembers;
  const memberScores = averageSkills(group.members.map((m) => profiles[m.userId]).filter(Boolean) as CandidateProfile[]);
  const otherMembers = group.members.filter((m) => m.userId !== user?.id);
  const myVote = election?.votes.find((v) => v.voterId === user?.id);
  const pendingTransfer = myTransfers.some((t) => t.status === 'Pending');

  const openTransfer = async () => {
    setTransferForm({ targetGroupId: '', swapWithStudentId: '', reason: '' });
    setTransferOpen(true);
    try {
      // Danh sách nhóm đích lấy từ các phòng của môn học; chi tiết thành viên dùng để chọn người đổi chéo.
      const roomList = await workspaceApi.listRooms(space.id);
      const others = roomList.filter((r) => r.id !== group.id && r.memberCount > 0);
      const detailList = await Promise.all(others.map((r) => workspaceApi.getGroup(r.id).catch(() => null)));
      setTransferGroups(
        detailList
          .filter((d): d is GroupDetail => !!d)
          .map((d) => ({
            groupId: d.id,
            roomCode: d.roomCode ?? d.name,
            groupName: d.name,
            status: d.status,
            memberCount: d.memberCount,
            maxMembers: d.maxMembers,
            leaderId: d.leaderId,
            leaderName: d.leaderName,
            members: d.members.map((m) => ({
              studentId: m.userId,
              studentCode: '',
              fullName: m.fullName,
              email: '',
              major: '',
              cohort: '',
              role: m.role,
              techScore: 0,
              managementScore: 0,
              graphicDesignScore: 0,
              marketingScore: 0,
              saleScore: 0,
              joinedAt: m.joinedAt,
            })),
          }))
          .sort((a, b) => a.roomCode.localeCompare(b.roomCode))
      );
    } catch (err) {
      toast.show(errorMessage(err), 'error');
    }
  };
  const transferTarget = transferGroups.find((g) => g.groupId === transferForm.targetGroupId);

  return (
    <PageShell>
      {toast.node}
      {dialog.node}
      {header}

      {isLocked && (
        <Banner tone="info">
          Đã chốt sổ. Muốn đổi nhóm, gửi yêu cầu chuyển nhóm.
        </Banner>
      )}
      {error && <Banner tone="error">{error}</Banner>}

      {/* Tổng quan nhóm */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(440px, 100%), 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <Card>
          <CardTitle
            icon={<Layers size={18} />}
            title={group.roomCode ?? group.name}
            subtitle={`${ROOM_STATUS_LABEL[group.status] ?? group.status} • ${group.memberCount}/${group.maxMembers} thành viên${group.isClosedByLeader ? ' • Trưởng nhóm đã đóng tuyển' : ''}`}
            right={
              isLeader && !isLocked ? (
                <Button
                  variant="outline"
                  style={{ height: 36 }}
                  icon={<Edit3 size={15} />}
                  onClick={() => {
                    setEditForm({ name: group.name, description: group.description ?? '' });
                    setEditOpen(true);
                  }}
                >
                  Sửa đề tài
                </Button>
              ) : undefined
            }
          />
          <div style={{ padding: '14px 16px', borderRadius: 12, backgroundColor: 'var(--bg-subtle, #F8FAFC)', border: '1px solid var(--border-light, #E2E8F0)', marginBottom: 18 }}>
            <div style={{ fontSize: 12, fontWeight: 650, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted, #64748B)', marginBottom: 4 }}>Tên nhóm / Đề tài</div>
            <div style={{ fontSize: 17, fontWeight: 750, color: 'var(--text-main, #0F172A)' }}>{group.name}</div>
            <p style={{ margin: '4px 0 0 0', fontSize: 14.5, color: 'var(--text-muted, #64748B)', lineHeight: 1.5 }}>
              {group.description || (isLeader ? 'Chưa có mô tả đề tài. Bấm "Sửa đề tài" để cập nhật.' : 'Trưởng nhóm chưa cập nhật mô tả đề tài.')}
            </p>
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-main, #0F172A)', marginBottom: 10 }}>Kỹ năng trung bình</div>
          <SkillBars scores={memberScores} />
        </Card>

        <Card>
          <CardTitle icon={<Crown size={18} />} title="Điều hành nhóm" subtitle={isLeader ? 'Bạn là Trưởng nhóm' : `Trưởng nhóm: ${group.leaderName ?? '—'}`} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
            {isLeader && !isLocked && (group.status === 'Recruiting' || group.status === 'Closed') && (
              group.isClosedByLeader ? (
                <Button variant="outline" icon={<Unlock size={15} />} loading={busy === 'reopen'} onClick={() => void act('reopen', () => workspaceApi.reopenRecruitment(group.id), 'Đã mở tuyển lại.')}>
                  Mở tuyển lại
                </Button>
              ) : (
                <Button variant="outline" icon={<Lock size={15} />} loading={busy === 'close'} disabled={isFull} onClick={() => void act('close', () => workspaceApi.closeRecruitment(group.id), 'Đã đóng tuyển sớm.')}>
                  Đóng tuyển sớm
                </Button>
              )
            )}
            {isLeader && !isLocked && otherMembers.length > 0 && (
              <Button variant="outline" icon={<Crown size={15} />} onClick={() => { setSelectedMemberId(''); setLeaderModalOpen(true); }}>
                Chuyển quyền Trưởng nhóm
              </Button>
            )}
            {!isLocked && !election && group.members.length > 1 && (
              <Button variant="outline" icon={<Vote size={15} />} onClick={() => { setSelectedMemberId(''); setElectionModalOpen(true); }}>
                Đề cử bầu Trưởng nhóm
              </Button>
            )}
            {isLocked ? (
              <Button variant="outline" icon={<ArrowLeftRight size={15} />} disabled={pendingTransfer} onClick={() => void openTransfer()}>
                {pendingTransfer ? 'Đang chờ duyệt chuyển nhóm' : 'Yêu cầu chuyển nhóm'}
              </Button>
            ) : (
              <Button
                variant="danger"
                icon={<LogOut size={15} />}
                loading={busy === 'leave'}
                onClick={() => {
                  void (async () => {
                    const ok = await dialog.confirm({
                      title: 'Rời nhóm?',
                      message: isLeader ? 'Quyền Trưởng nhóm sẽ tự chuyển cho thành viên vào sớm nhất.' : undefined,
                      confirmLabel: 'Rời nhóm',
                      danger: true,
                    });
                    if (ok !== null) await act('leave', () => workspaceApi.leaveGroup(group.id), 'Bạn đã rời nhóm.');
                  })();
                }}
              >
                Rời nhóm
              </Button>
            )}
          </div>

          {/* Bầu Trưởng nhóm đang diễn ra */}
          {election && (
            <div style={{ marginTop: 18, padding: 16, borderRadius: 14, border: '1px solid var(--border-light, #E2E8F0)', backgroundColor: 'var(--bg-subtle, #F8FAFC)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                <span style={{ fontWeight: 750, color: 'var(--text-main, #0F172A)' }}>
                  <Vote size={15} /> Bầu <b>{election.candidateName}</b> làm Trưởng nhóm
                </span>
                {election.status === 'Active' ? (
                  <Pill dot="#F59E0B">
                    <Clock size={13} /> {formatCountdown(countdown)}
                  </Pill>
                ) : (
                  <Pill dot={election.status === 'Passed' ? '#10B981' : '#EF4444'}>{election.status}</Pill>
                )}
              </div>
              <div style={{ fontSize: 13.5, color: 'var(--text-muted, #64748B)', marginBottom: 10 }}>
                Đề cử bởi {election.initiatedByName} • Đồng ý {election.totalAgreed} / cần {election.requiredVotesToPass} • Phản đối {election.totalDisagreed} • Đã bỏ phiếu {election.totalVotes}/{election.totalMembers}
              </div>
              <SeatBar count={election.totalAgreed} max={Math.max(election.requiredVotesToPass, 1)} />
              {election.status === 'Active' && (
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  {myVote ? (
                    <span style={{ fontSize: 14, color: 'var(--text-muted, #64748B)' }}>Bạn đã bỏ phiếu: {myVote.isAgree ? 'Đồng ý' : 'Phản đối'}</span>
                  ) : (
                    <>
                      <Button style={{ flex: 1 }} icon={<ThumbsUp size={15} />} loading={busy === 'vote-yes'} disabled={!!busy} onClick={() => void act('vote-yes', () => workspaceApi.voteElection(group.id, election.id, true), 'Đã bỏ phiếu đồng ý.')}>
                        Đồng ý
                      </Button>
                      <Button style={{ flex: 1 }} variant="outline" icon={<ThumbsDown size={15} />} loading={busy === 'vote-no'} disabled={!!busy} onClick={() => void act('vote-no', () => workspaceApi.voteElection(group.id, election.id, false), 'Đã bỏ phiếu phản đối.')}>
                        Phản đối
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* Thành viên */}
      <Card style={{ marginBottom: '1.5rem' }}>
        <CardTitle icon={<Users size={18} />} title={`Thành viên (${group.memberCount}/${group.maxMembers})`} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(300px, 100%), 1fr))', gap: 12 }}>
          {group.members.map((m) => {
            const p = profiles[m.userId];
            return (
              <div key={m.userId} style={{ padding: 14, borderRadius: 14, border: '1px solid var(--border-light, #E2E8F0)', backgroundColor: 'var(--bg-subtle, #F8FAFC)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 750, color: 'var(--text-main, #0F172A)' }}>
                      {m.fullName} {m.userId === user?.id && <span style={{ color: 'var(--text-muted, #64748B)', fontWeight: 500 }}>(bạn)</span>}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted, #64748B)' }}>
                      {p?.major ?? '—'} • Vào nhóm {formatDateTime(m.joinedAt)}
                    </div>
                  </div>
                  {m.role === 'Leader' ? <Pill tone="accent">Trưởng nhóm</Pill> : <Pill>Thành viên</Pill>}
                </div>
                {p && (
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 10 }}>
                    {SKILL_KEYS.map(({ key, label }) => (
                      <Pill key={key}>
                        {label} {p[key]}
                      </Pill>
                    ))}
                  </div>
                )}
                {isLeader && !isLocked && m.userId !== user?.id && (
                  <div style={{ marginTop: 10 }}>
                    <Button variant="ghost" style={{ height: 32, padding: '0 8px', color: '#B91C1C' }} icon={<UserX size={14} />} onClick={() => { setRemoveReason(''); setRemoveTarget({ userId: m.userId, fullName: m.fullName }); }}>
                      Mời ra khỏi nhóm
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Đơn ứng tuyển */}
      {!isLocked && (
        <Card>
          <CardTitle
            icon={<Sparkles size={18} />}
            title={`Đơn ứng tuyển (${requests.length})`}
            right={<InfoTip text="Thành viên biểu quyết ủng hộ / không ủng hộ, Trưởng nhóm quyết định chấp nhận hoặc từ chối." />}
          />
          {requests.length === 0 ? (
            <StateBox kind="empty" message="Chưa có đơn ứng tuyển nào." />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(420px, 100%), 1fr))', gap: 12 }}>
              {requests.map((r) => {
                const p = profiles[r.studentId];
                const voted = r.votes?.find((v) => v.voterId === user?.id);
                return (
                  <div key={r.id} style={{ padding: 16, borderRadius: 14, border: '1px solid var(--border-light, #E2E8F0)', backgroundColor: 'var(--bg-subtle, #F8FAFC)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ fontWeight: 750, color: 'var(--text-main, #0F172A)' }}>{r.studentName}</div>
                        <div style={{ fontSize: 13, color: 'var(--text-muted, #64748B)' }}>
                          {p?.major ?? '—'} • {formatDateTime(r.createdAt)}
                        </div>
                      </div>
                      <Pill>
                        <ThumbsUp size={12} /> {r.upvotes} • <ThumbsDown size={12} /> {r.downvotes}
                      </Pill>
                    </div>
                    {p && (
                      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                        {SKILL_KEYS.map(({ key, label }) => (
                          <Pill key={key}>
                            {label} {p[key]}
                          </Pill>
                        ))}
                      </div>
                    )}
                    {r.message && (
                      <div style={{ fontSize: 14, color: 'var(--text-secondary, #334155)', padding: '10px 12px', borderRadius: 10, backgroundColor: 'var(--bg-card, #FFFFFF)', border: '1px solid var(--border-light, #E2E8F0)' }}>{r.message}</div>
                    )}
                    {r.votes && r.votes.some((v) => v.comment) && (
                      <div style={{ fontSize: 13, color: 'var(--text-muted, #64748B)' }}>
                        {r.votes
                          .filter((v) => v.comment)
                          .map((v) => (
                            <div key={v.voterId}>
                              <b>{v.voterName}</b>: {v.comment}
                            </div>
                          ))}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {voted ? (
                        <span style={{ fontSize: 13.5, color: 'var(--text-muted, #64748B)', alignSelf: 'center' }}>Bạn đã {voted.isUpvote ? 'ủng hộ' : 'không ủng hộ'}</span>
                      ) : (
                        <>
                          <Button variant="outline" style={{ height: 34 }} icon={<ThumbsUp size={14} />} disabled={!!busy} onClick={() => void voteRequest(r, true)}>
                            Ủng hộ
                          </Button>
                          <Button variant="outline" style={{ height: 34 }} icon={<ThumbsDown size={14} />} disabled={!!busy} onClick={() => void voteRequest(r, false)}>
                            Không ủng hộ
                          </Button>
                        </>
                      )}
                      {isLeader && (
                        <>
                          <span style={{ flex: 1 }} />
                          <Button style={{ height: 34 }} icon={<CheckCircle2 size={14} />} loading={busy === `accept-${r.id}`} disabled={!!busy || isFull} onClick={() => void act(`accept-${r.id}`, () => workspaceApi.acceptJoinRequest(r.id), `Đã nhận ${r.studentName} vào nhóm.`)}>
                            Chấp nhận
                          </Button>
                          <Button variant="danger" style={{ height: 34 }} icon={<XCircle size={14} />} loading={busy === `reject-${r.id}`} disabled={!!busy} onClick={() => void act(`reject-${r.id}`, () => workspaceApi.rejectJoinRequest(r.id), 'Đã từ chối đơn.')}>
                            Từ chối
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {transferList}

      {/* Sửa đề tài */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Cập nhật tên nhóm / đề tài">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const ok = await act('edit', () => workspaceApi.updateGroup(group.id, { name: editForm.name.trim(), description: editForm.description.trim() || null }), 'Đã cập nhật đề tài.');
            if (ok) setEditOpen(false);
          }}
          style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
        >
          <Field label="Tên nhóm / tên đề tài">
            <input required style={fieldStyle} value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
          </Field>
          <Field label="Mô tả đề tài">
            <textarea rows={5} style={textareaStyle} value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />
          </Field>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Hủy
            </Button>
            <Button type="submit" loading={busy === 'edit'}>
              Lưu
            </Button>
          </div>
        </form>
      </Modal>

      {/* Chuyển quyền / Đề cử bầu Trưởng nhóm */}
      {[
        {
          open: leaderModalOpen,
          close: () => setLeaderModalOpen(false),
          title: 'Chuyển quyền Trưởng nhóm',
          subtitle: 'Bạn sẽ trở thành thành viên thường.',
          key: 'transfer-leader',
          submit: () => workspaceApi.transferLeader(group.id, selectedMemberId),
          success: 'Đã chuyển quyền Trưởng nhóm.',
          label: 'Chuyển quyền',
          candidates: otherMembers,
        },
        {
          open: electionModalOpen,
          close: () => setElectionModalOpen(false),
          title: 'Đề cử bầu Trưởng nhóm mới',
          subtitle: 'Bỏ phiếu trong 24 giờ, đạt đa số thì thành Trưởng nhóm.',
          key: 'start-election',
          submit: () => workspaceApi.startElection(group.id, selectedMemberId),
          success: 'Đã mở cuộc bầu Trưởng nhóm.',
          label: 'Mở bầu chọn',
          candidates: group.members.filter((m) => m.userId !== group.leaderId),
        },
      ].map((cfg) => (
        <Modal key={cfg.key} open={cfg.open} onClose={cfg.close} title={cfg.title} subtitle={cfg.subtitle}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {cfg.candidates.map((m) => (
              <label key={m.userId} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, cursor: 'pointer', border: selectedMemberId === m.userId ? '1px solid var(--accent-color, #F26F21)' : '1px solid var(--border-light, #E2E8F0)' }}>
                <input type="radio" name={cfg.key} checked={selectedMemberId === m.userId} onChange={() => setSelectedMemberId(m.userId)} />
                <span style={{ fontWeight: 650 }}>{m.fullName}</span>
                <span style={{ fontSize: 13, color: 'var(--text-muted, #64748B)' }}>{profiles[m.userId]?.major ?? ''}</span>
              </label>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
            <Button variant="outline" onClick={cfg.close}>
              Hủy
            </Button>
            <Button
              loading={busy === cfg.key}
              disabled={!selectedMemberId}
              onClick={async () => {
                if (await act(cfg.key, cfg.submit, cfg.success)) cfg.close();
              }}
            >
              {cfg.label}
            </Button>
          </div>
        </Modal>
      ))}

      {/* Mời thành viên ra khỏi nhóm */}
      <Modal open={!!removeTarget} onClose={() => setRemoveTarget(null)} title={`Mời ${removeTarget?.fullName ?? ''} ra khỏi nhóm`}>
        <Field label="Lý do">
          <textarea rows={4} required style={textareaStyle} value={removeReason} onChange={(e) => setRemoveReason(e.target.value)} />
        </Field>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
          <Button variant="outline" onClick={() => setRemoveTarget(null)}>
            Hủy
          </Button>
          <Button
            variant="danger"
            loading={busy === 'remove'}
            disabled={!removeReason.trim()}
            onClick={async () => {
              if (!removeTarget) return;
              if (await act('remove', () => workspaceApi.removeMember(group.id, removeTarget.userId, removeReason.trim()), `Đã mời ${removeTarget.fullName} ra khỏi nhóm.`)) setRemoveTarget(null);
            }}
          >
            Xác nhận
          </Button>
        </div>
      </Modal>

      {/* Yêu cầu chuyển nhóm (sau chốt sổ) */}
      <Modal open={transferOpen} onClose={() => setTransferOpen(false)} title="Yêu cầu chuyển nhóm">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label="Nhóm muốn chuyển đến">
            <select style={fieldStyle} value={transferForm.targetGroupId} onChange={(e) => setTransferForm({ ...transferForm, targetGroupId: e.target.value, swapWithStudentId: '' })}>
              <option value="">— Chọn nhóm —</option>
              {transferGroups.map((g) => (
                <option key={g.groupId} value={g.groupId}>
                  {g.roomCode} — {g.groupName} ({g.memberCount}/{g.maxMembers})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Đổi chéo với" hint="Bắt buộc khi nhóm đích đã đủ người.">
            <select style={fieldStyle} value={transferForm.swapWithStudentId} disabled={!transferTarget} onChange={(e) => setTransferForm({ ...transferForm, swapWithStudentId: e.target.value })}>
              <option value="">— Chuyển một chiều —</option>
              {transferTarget?.members.map((m) => (
                <option key={m.studentId} value={m.studentId}>
                  {m.fullName}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Lý do">
            <textarea rows={4} style={textareaStyle} value={transferForm.reason} onChange={(e) => setTransferForm({ ...transferForm, reason: e.target.value })} />
          </Field>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
          <Button variant="outline" onClick={() => setTransferOpen(false)}>
            Hủy
          </Button>
          <Button
            icon={<Send size={15} />}
            loading={busy === 'transfer'}
            disabled={!transferForm.targetGroupId || !transferForm.reason.trim()}
            onClick={async () => {
              const ok = await act(
                'transfer',
                () =>
                  workspaceApi.createTransferRequest(space.id, {
                    targetGroupId: transferForm.targetGroupId,
                    swapWithStudentId: transferForm.swapWithStudentId || null,
                    reason: transferForm.reason.trim(),
                  }),
                'Đã gửi yêu cầu chuyển nhóm.'
              );
              if (ok) setTransferOpen(false);
            }}
          >
            Gửi yêu cầu
          </Button>
        </div>
      </Modal>
    </PageShell>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// 3. ĐƠN ỨNG TUYỂN CỦA TÔI (/join-requests)
// ══════════════════════════════════════════════════════════════════════════════

const REQUEST_STATUS_LABEL: Record<string, string> = {
  Pending: 'Đang chờ',
  Accepted: 'Được chấp nhận',
  Rejected: 'Bị từ chối',
  Cancelled: 'Đã hủy',
};

export const JoinRequestsPage: React.FC = () => {
  const { space } = useSelectedSpace();
  const toast = useToast();
  const dialog = useConfirm();
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await workspaceApi.listMyJoinRequests();
      setRequests([...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
      setError(null);
    } catch (err) {
      setError(errorMessage(err, 'Không tải được đơn ứng tuyển.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const cancel = async (req: JoinRequest) => {
    if ((await dialog.confirm({ title: `Rút đơn vào ${req.groupName}?`, confirmLabel: 'Rút đơn', danger: true })) === null) return;
    setCancelling(req.id);
    try {
      await workspaceApi.cancelJoinRequest(req.id);
      toast.show('Đã rút đơn.');
      await load();
    } catch (err) {
      toast.show(errorMessage(err), 'error');
    } finally {
      setCancelling(null);
    }
  };

  const pending = requests.filter((r) => r.status === 'Pending').length;
  const limit = space?.maxConcurrentApplies;

  return (
    <PageShell>
      {toast.node}
      {dialog.node}
      <PageHeader
        title="Đơn ứng tuyển"
        meta={<InfoTip text="Khi bạn vào một nhóm, các đơn còn chờ khác tự hủy." />}
        actions={
          <Button variant="ghost" icon={<RefreshCw size={15} />} onClick={() => void load()}>
            Tải lại
          </Button>
        }
      />

      <Card style={{ marginBottom: '1.5rem' }} padding={18}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 13.5, color: 'var(--text-muted, #64748B)', fontWeight: 600 }}>Đơn đang chờ</div>
            <div style={{ fontSize: 26, fontWeight: 750, color: 'var(--text-main, #0F172A)', fontVariantNumeric: 'tabular-nums' }}>
              {pending}
              {limit ? <span style={{ fontSize: 16, color: 'var(--text-muted, #64748B)' }}> / {limit}</span> : null}
            </div>
          </div>
          {limit ? <div style={{ width: 'min(260px, 100%)' }}><SeatBar count={pending} max={limit} /></div> : null}
        </div>
      </Card>

      {error && <Banner tone="error">{error}</Banner>}

      {loading && requests.length === 0 ? (
        <StateBox kind="loading" />
      ) : requests.length === 0 ? (
        <StateBox
          kind="empty"
          title="Bạn chưa nộp đơn nào"
          action={
            <Link to="/groups" style={{ textDecoration: 'none' }}>
              <Button icon={<Layers size={15} />}>Tìm nhóm đang tuyển</Button>
            </Link>
          }
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {requests.map((r) => (
            <Card key={r.id} padding={18}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 750, color: 'var(--text-main, #0F172A)' }}>{r.groupName}</div>
                  <div style={{ fontSize: 13.5, color: 'var(--text-muted, #64748B)', marginTop: 2 }}>
                    Nộp lúc {formatDateTime(r.createdAt)}
                    {r.decidedAt ? ` • Xử lý lúc ${formatDateTime(r.decidedAt)}` : ''} • <ThumbsUp size={12} /> {r.upvotes} <ThumbsDown size={12} /> {r.downvotes}
                  </div>
                  {r.message && <p style={{ margin: '8px 0 0 0', fontSize: 14.5, color: 'var(--text-secondary, #334155)' }}>{r.message}</p>}
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <Pill dot={ROOM_STATUS_DOT[r.status]}>{REQUEST_STATUS_LABEL[r.status] ?? r.status}</Pill>
                  {r.status === 'Pending' && (
                    <Button variant="outline" style={{ height: 34 }} loading={cancelling === r.id} onClick={() => void cancel(r)}>
                      Rút đơn
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </PageShell>
  );
};
