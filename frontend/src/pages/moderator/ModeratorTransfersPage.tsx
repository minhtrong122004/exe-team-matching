import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeftRight, CheckCircle2, XCircle, UserCheck, Send, RefreshCw, ArrowRight } from '../../utils/icons';
import { useAuth } from '../../contexts/AuthContext';
import { useSelectedSpace } from '../../hooks/useSelectedSpace';
import {
  workspaceApi,
  errorMessage,
  formatDateTime,
  type RosterGroup,
  type TransferRequest,
  type TransferStatus,
} from '../../api/workspace';
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
  Field,
  fieldStyle,
  useToast,
  useConfirm,
  InfoTip,
  ROOM_STATUS_DOT,
} from '../../components/workspace/ui';

const STATUS_LABEL: Record<TransferStatus, string> = {
  Pending: 'Chờ duyệt',
  Approved: 'Đã duyệt',
  Rejected: 'Đã từ chối',
  Cancelled: 'Sinh viên đã hủy',
};

const FILTERS: { value: TransferStatus | 'ALL'; label: string }[] = [
  { value: 'Pending', label: 'Chờ duyệt' },
  { value: 'Approved', label: 'Đã duyệt' },
  { value: 'Rejected', label: 'Đã từ chối' },
  { value: 'ALL', label: 'Tất cả' },
];

export const ModeratorTransfersPage: React.FC = () => {
  const { user } = useAuth();
  const { space, loading: spacesLoading, error: spacesError } = useSelectedSpace();
  const toast = useToast();
  const dialog = useConfirm();

  const [requests, setRequests] = useState<TransferRequest[]>([]);
  const [groups, setGroups] = useState<RosterGroup[]>([]);
  const [filter, setFilter] = useState<TransferStatus | 'ALL'>('Pending');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [decidingId, setDecidingId] = useState<string | null>(null);

  // Công cụ điều chuyển trực tiếp
  const [sourceGroupId, setSourceGroupId] = useState('');
  const [studentId, setStudentId] = useState('');
  const [mode, setMode] = useState<'ONE_WAY' | 'SWAP'>('ONE_WAY');
  const [targetGroupId, setTargetGroupId] = useState('');
  const [swapStudentId, setSwapStudentId] = useState('');
  const [reason, setReason] = useState('');
  const [transferring, setTransferring] = useState(false);

  const spaceId = space?.id;
  const isLocked = space?.status === 'Locked';

  const load = useCallback(async () => {
    if (!spaceId) return;
    setLoading(true);
    try {
      const [reqs, roster] = await Promise.all([workspaceApi.listTransferRequests(spaceId), workspaceApi.getRoster(spaceId)]);
      setRequests([...reqs].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
      setGroups(roster.groups.filter((g) => g.memberCount > 0).sort((a, b) => a.roomCode.localeCompare(b.roomCode)));
      setError(null);
    } catch (err) {
      setError(errorMessage(err, 'Không tải được yêu cầu chuyển nhóm.'));
    } finally {
      setLoading(false);
    }
  }, [spaceId]);

  useEffect(() => {
    setRequests([]);
    setGroups([]);
    setSourceGroupId('');
    void load();
  }, [load]);

  const sourceGroup = groups.find((g) => g.groupId === sourceGroupId);
  const targetGroup = groups.find((g) => g.groupId === targetGroupId);
  const threshold = space?.groupThreshold ?? 3;
  // Rời nhóm một chiều khiến nhóm nguồn dưới ngưỡng thì chỉ được đổi chéo (BR-35).
  const oneWayBlocked = !!sourceGroup && sourceGroup.memberCount <= threshold;
  const targetFull = !!targetGroup && targetGroup.memberCount >= targetGroup.maxMembers;
  const effectiveMode = oneWayBlocked || targetFull ? 'SWAP' : mode;

  useEffect(() => {
    setStudentId('');
    setTargetGroupId('');
  }, [sourceGroupId]);
  useEffect(() => setSwapStudentId(''), [targetGroupId]);

  const visible = useMemo(() => (filter === 'ALL' ? requests : requests.filter((r) => r.status === filter)), [requests, filter]);
  const pendingCount = requests.filter((r) => r.status === 'Pending').length;

  const decide = async (req: TransferRequest, approved: boolean) => {
    if (!space) return;
    const note = await dialog.confirm({
      title: approved ? `Duyệt yêu cầu của ${req.requesterStudentName}?` : `Từ chối yêu cầu của ${req.requesterStudentName}?`,
      confirmLabel: approved ? 'Duyệt' : 'Từ chối',
      danger: !approved,
      input: approved ? { label: 'Ghi chú' } : { label: 'Lý do từ chối', required: true },
    });
    if (note === null) return;
    setDecidingId(req.id);
    try {
      await workspaceApi.decideTransferRequest(space.id, req.id, approved, note);
      toast.show(approved ? 'Đã duyệt yêu cầu. Danh sách 2 nhóm đã được cập nhật.' : 'Đã từ chối yêu cầu.');
      await load();
    } catch (err) {
      toast.show(errorMessage(err), 'error');
    } finally {
      setDecidingId(null);
    }
  };

  const executeDirect = async () => {
    if (!space || !studentId || !targetGroupId) return;
    if (effectiveMode === 'SWAP' && !swapStudentId) {
      toast.show('Chọn sinh viên ở nhóm đích để đổi chéo.', 'error');
      return;
    }
    if (!reason.trim()) {
      toast.show('Vui lòng nhập lý do điều chuyển.', 'error');
      return;
    }
    setTransferring(true);
    try {
      await workspaceApi.directTransfer(space.id, {
        studentId,
        targetGroupId,
        swapWithStudentId: effectiveMode === 'SWAP' ? swapStudentId : null,
        reason: reason.trim(),
      });
      toast.show(`Đã điều chuyển ${effectiveMode === 'SWAP' ? 'đổi chéo 1-1' : 'một chiều'} giữa ${sourceGroup?.roomCode} và ${targetGroup?.roomCode}.`);
      setSourceGroupId('');
      setReason('');
      await load();
    } catch (err) {
      toast.show(errorMessage(err), 'error');
    } finally {
      setTransferring(false);
    }
  };

  const header = (
    <PageHeader
      title="Chuyển nhóm"
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

  return (
    <PageShell>
      {toast.node}
      {dialog.node}
      {header}

      {error && <Banner tone="error">{error}</Banner>}
      {!isLocked ? (
        <StateBox kind="empty" title="Chưa chốt sổ" message="Chuyển nhóm dùng sau khi học kỳ đã chốt sổ ở trang Điều phối." />
      ) : (
      <>

      {/* Yêu cầu từ sinh viên */}
      <Card style={{ marginBottom: '1.5rem' }}>
        <CardTitle
          icon={<UserCheck size={18} />}
          title="Yêu cầu từ sinh viên"
          right={<Pill dot={pendingCount ? '#F59E0B' : '#94A3B8'}>{pendingCount} chờ duyệt</Pill>}
        />
        <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
          {FILTERS.map((f) => {
            const active = filter === f.value;
            return (
              <button
                key={f.value}
                type="button"
                onClick={() => setFilter(f.value)}
                style={{
                  height: 34,
                  padding: '0 14px',
                  borderRadius: 999,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: active ? '1px solid #0F172A' : '1px solid var(--border-light, #E2E8F0)',
                  backgroundColor: active ? '#0F172A' : 'var(--bg-card, #FFFFFF)',
                  color: active ? '#FFFFFF' : 'var(--text-muted, #64748B)',
                }}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        {loading && requests.length === 0 ? (
          <StateBox kind="loading" />
        ) : visible.length === 0 ? (
          <StateBox kind="empty" message="Không có yêu cầu nào." />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(420px, 100%), 1fr))', gap: 12 }}>
            {visible.map((r) => {
              const isSwap = !!r.swapWithStudentId;
              return (
                <div key={r.id} style={{ padding: 16, borderRadius: 14, border: '1px solid var(--border-light, #E2E8F0)', backgroundColor: 'var(--bg-subtle, #F8FAFC)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                    <Pill>{isSwap ? 'Đổi chéo 1-1' : 'Chuyển một chiều'}</Pill>
                    <span style={{ fontSize: 13, color: 'var(--text-muted, #64748B)' }}>{formatDateTime(r.createdAt)}</span>
                  </div>
                  <div>
                    <div style={{ fontWeight: 750, color: 'var(--text-main, #0F172A)' }}>{r.requesterStudentName}</div>
                    <div style={{ fontSize: 13.5, color: 'var(--text-muted, #64748B)' }}>{r.requesterStudentCode}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 14 }}>
                    <Pill>{r.fromGroupCode}</Pill>
                    {isSwap ? <ArrowLeftRight size={15} /> : <ArrowRight size={15} />}
                    <Pill>{r.targetGroupCode}</Pill>
                    {isSwap && (
                      <span style={{ color: 'var(--text-muted, #64748B)' }}>
                        đổi với <b style={{ color: 'var(--text-main, #0F172A)' }}>{r.swapWithStudentName}</b> ({r.swapWithStudentCode})
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 14, color: 'var(--text-secondary, #334155)', padding: '10px 12px', borderRadius: 10, backgroundColor: 'var(--bg-card, #FFFFFF)', border: '1px solid var(--border-light, #E2E8F0)' }}>
                    {r.reason}
                  </div>
                  {r.status === 'Pending' ? (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Button style={{ flex: 1 }} icon={<CheckCircle2 size={15} />} loading={decidingId === r.id} disabled={!!decidingId} onClick={() => void decide(r, true)}>
                        Duyệt
                      </Button>
                      <Button style={{ flex: 1 }} variant="outline" icon={<XCircle size={15} />} disabled={!!decidingId} onClick={() => void decide(r, false)}>
                        Từ chối
                      </Button>
                    </div>
                  ) : (
                    <div style={{ fontSize: 13.5, color: 'var(--text-muted, #64748B)' }}>
                      <Pill dot={ROOM_STATUS_DOT[r.status]}>{STATUS_LABEL[r.status]}</Pill>
                      {r.decisionReason && <span style={{ marginLeft: 8 }}>{r.decisionReason}</span>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Điều chuyển trực tiếp */}
      <Card>
        <CardTitle
          icon={<ArrowLeftRight size={18} />}
          title="Điều chuyển trực tiếp"
          right={<InfoTip text={`Nhóm nguồn có ${threshold} người trở xuống, hoặc nhóm đích đã đủ người, thì chỉ đổi chéo 1-1 được.`} />}
        />

        {groups.length === 0 ? (
          <StateBox kind="empty" message={loading ? 'Đang tải danh sách nhóm...' : 'Chưa có nhóm nào có thành viên.'} />
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
              <Field label="Từ nhóm">
                <select style={fieldStyle} value={sourceGroupId} disabled={!isLocked} onChange={(e) => setSourceGroupId(e.target.value)}>
                  <option value="">— Chọn nhóm —</option>
                  {groups.map((g) => (
                    <option key={g.groupId} value={g.groupId}>
                      {g.roomCode} ({g.memberCount}/{g.maxMembers})
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Sinh viên">
                <select style={fieldStyle} value={studentId} disabled={!sourceGroup} onChange={(e) => setStudentId(e.target.value)}>
                  <option value="">— Chọn sinh viên —</option>
                  {sourceGroup?.members.map((m) => (
                    <option key={m.studentId} value={m.studentId}>
                      {m.fullName} ({m.studentCode}){m.role === 'Leader' ? ' • Trưởng nhóm' : ''}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Hình thức">
                <div style={{ display: 'flex', gap: 6 }}>
                  {(['ONE_WAY', 'SWAP'] as const).map((m) => {
                    const disabled = m === 'ONE_WAY' && (oneWayBlocked || targetFull);
                    const active = effectiveMode === m;
                    return (
                      <button
                        key={m}
                        type="button"
                        disabled={disabled}
                        onClick={() => setMode(m)}
                        style={{
                          flex: 1,
                          height: 42,
                          borderRadius: 10,
                          fontSize: 14,
                          fontWeight: 650,
                          cursor: disabled ? 'not-allowed' : 'pointer',
                          opacity: disabled ? 0.5 : 1,
                          border: active ? '1px solid var(--accent-color, #F26F21)' : '1px solid var(--border-medium, #CBD5E1)',
                          backgroundColor: active ? 'var(--accent-color, #F26F21)' : 'var(--bg-card, #FFFFFF)',
                          color: active ? '#FFFFFF' : 'var(--text-main, #0F172A)',
                        }}
                      >
                        {m === 'ONE_WAY' ? 'Một chiều' : 'Đổi chéo 1-1'}
                      </button>
                    );
                  })}
                </div>
              </Field>
              <Field label="Đến nhóm">
                <select style={fieldStyle} value={targetGroupId} disabled={!studentId} onChange={(e) => setTargetGroupId(e.target.value)}>
                  <option value="">— Chọn nhóm —</option>
                  {groups
                    .filter((g) => g.groupId !== sourceGroupId)
                    .map((g) => (
                      <option key={g.groupId} value={g.groupId}>
                        {g.roomCode} ({g.memberCount}/{g.maxMembers})
                      </option>
                    ))}
                </select>
              </Field>
              {effectiveMode === 'SWAP' && (
                <Field label="Đổi với">
                  <select style={fieldStyle} value={swapStudentId} disabled={!targetGroup} onChange={(e) => setSwapStudentId(e.target.value)}>
                    <option value="">— Chọn sinh viên —</option>
                    {targetGroup?.members.map((m) => (
                      <option key={m.studentId} value={m.studentId}>
                        {m.fullName} ({m.studentCode})
                      </option>
                    ))}
                  </select>
                </Field>
              )}
            </div>
            <div style={{ marginTop: 14 }}>
              <Field label="Lý do">
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  placeholder="Ví dụ: cân bằng chuyên ngành giữa hai nhóm"
                  style={{ ...fieldStyle, height: 'auto', padding: '10px 12px', resize: 'vertical', fontFamily: 'inherit' }}
                />
              </Field>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
              <Button icon={<Send size={16} />} loading={transferring} disabled={!isLocked || !studentId || !targetGroupId} onClick={executeDirect}>
                Thực hiện điều chuyển
              </Button>
            </div>
          </>
        )}
      </Card>
      </>
      )}
    </PageShell>
  );
};

export default ModeratorTransfersPage;
