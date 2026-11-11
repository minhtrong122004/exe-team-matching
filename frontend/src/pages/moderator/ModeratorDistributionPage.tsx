import React, { useCallback, useEffect, useState } from 'react';
import { Users, Cpu, CheckCircle2, Lock, Sparkles, Layers, Send, RefreshCw, ArrowRight } from '../../utils/icons';
import { useAuth } from '../../contexts/AuthContext';
import { useSelectedSpace, reloadSpaces } from '../../hooks/useSelectedSpace';
import {
  workspaceApi,
  errorMessage,
  SPACE_STATUS_LABEL,
  type DistributePreview,
  type RoomDistributionItem,
  type UnmatchedSummary,
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
  SeatBar,
  SKILL_KEYS,
  useToast,
} from '../../components/workspace/ui';

const StepCard: React.FC<{
  step: number;
  title: string;
  desc: string;
  done?: boolean;
  children: React.ReactNode;
}> = ({ step, title, desc, done, children }) => (
  <div
    style={{
      padding: 18,
      borderRadius: 14,
      border: '1px solid var(--border-light, #E2E8F0)',
      backgroundColor: 'var(--bg-subtle, #F8FAFC)',
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      justifyContent: 'space-between',
    }}
  >
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ fontSize: 15, fontWeight: 750, color: 'var(--text-main, #0F172A)' }}>
          Bước {step}. {title}
        </span>
        {done && <CheckCircle2 size={17} color="#10B981" />}
      </div>
      <p style={{ fontSize: 13.5, color: 'var(--text-muted, #64748B)', margin: '4px 0 0 0', lineHeight: 1.5 }}>{desc}</p>
    </div>
    {children}
  </div>
);

const RoomRow: React.FC<{ room: RoomDistributionItem }> = ({ room }) => (
  <div style={{ padding: '12px 14px', borderRadius: 12, border: '1px solid var(--border-light, #E2E8F0)', backgroundColor: 'var(--bg-card, #FFFFFF)' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
      <span style={{ fontWeight: 750, color: 'var(--text-main, #0F172A)' }}>{room.roomCode || room.name}</span>
      <span style={{ fontSize: 13.5, fontWeight: 650, color: 'var(--text-muted, #64748B)', fontVariantNumeric: 'tabular-nums' }}>
        {room.memberCount}/{room.maxMembers}
      </span>
    </div>
    <SeatBar count={room.memberCount} max={room.maxMembers} />
    <div style={{ fontSize: 13, color: 'var(--text-muted, #64748B)', marginTop: 8 }}>
      {room.leaderName ? (
        <>
          Trưởng nhóm: <b style={{ color: 'var(--text-secondary, #334155)' }}>{room.leaderName}</b>
        </>
      ) : (
        'Chưa có thành viên'
      )}
    </div>
  </div>
);

export const ModeratorDistributionPage: React.FC = () => {
  const { user } = useAuth();
  const { space, loading: spacesLoading, error: spacesError } = useSelectedSpace();
  const toast = useToast();
  const isModerator = user?.role === 'Moderator';

  const [summary, setSummary] = useState<UnmatchedSummary | null>(null);
  const [preview, setPreview] = useState<DistributePreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'close' | 'preview' | 'confirm' | 'finalize' | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const spaceId = space?.id;

  const loadSummary = useCallback(async () => {
    if (!spaceId) return;
    setLoading(true);
    try {
      setSummary(await workspaceApi.getUnmatchedSummary(spaceId));
      setError(null);
    } catch (err) {
      setError(errorMessage(err, 'Không tải được danh sách sinh viên chưa có nhóm.'));
    } finally {
      setLoading(false);
    }
  }, [spaceId]);

  useEffect(() => {
    setSummary(null);
    setPreview(null);
    setConfirmed(false);
    void loadSummary();
  }, [loadSummary]);

  const run = async (kind: NonNullable<typeof busy>, action: () => Promise<void>) => {
    setBusy(kind);
    try {
      await action();
    } catch (err) {
      toast.show(errorMessage(err), 'error');
    } finally {
      setBusy(null);
    }
  };

  const handleClose = () =>
    run('close', async () => {
      if (!space || !window.confirm('Đóng đăng ký tự nguyện để bắt đầu điều phối?')) return;
      await workspaceApi.closeRegistration(space.id);
      toast.show('Đã đóng đăng ký. Có thể chạy thuật toán phân bổ.');
      reloadSpaces();
      await loadSummary();
    });

  const handlePreview = () =>
    run('preview', async () => {
      if (!space) return;
      const result = await workspaceApi.previewDistribution(space.id);
      setPreview(result);
      setConfirmed(false);
      toast.show(`Đã tính phương án: phân bổ ${result.totalDistributed}/${result.totalUnmatched} sinh viên (Matching Service qua gRPC).`);
    });

  const handleConfirm = () =>
    run('confirm', async () => {
      if (!space || !window.confirm('Thực thi phương án phân bổ? Sinh viên sẽ được thêm vào phòng và nhận thông báo.')) return;
      const result = await workspaceApi.confirmDistribution(space.id);
      setConfirmed(true);
      setPreview(null);
      toast.show(`Đã phân bổ ${result.totalDistributed} sinh viên vào ${result.updatedRoomsCount} phòng.`);
      await loadSummary();
    });

  const handleFinalize = () =>
    run('finalize', async () => {
      if (!space || !window.confirm('Chốt sổ học kỳ? Danh sách nhóm sẽ bị khóa, mọi đơn đang chờ bị từ chối. Không thể hoàn tác.')) return;
      const result = await workspaceApi.finalizeSpace(space.id);
      toast.show(`Đã chốt sổ: khóa ${result.lockedRoomsCount} nhóm, từ chối ${result.rejectedRequestsCount} đơn đang chờ.`);
      reloadSpaces();
      await loadSummary();
    });

  const header = (
    <PageHeader
      section="Điều phối & Học kỳ"
      title="Điều phối Sinh viên lẻ & Chốt sổ Học kỳ"
      description="Phân bổ sinh viên chưa có nhóm vào các phòng còn thiếu bằng Matching Service (gRPC), sau đó chốt sổ danh sách nhóm."
      actions={
        space ? (
          <Button variant="ghost" icon={<RefreshCw size={15} />} onClick={() => void loadSummary()}>
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

  const status = space.status;
  const isLocked = status === 'Locked';
  const canDistribute = isModerator && status === 'ClosedRegistration';
  const unmatched = summary?.unmatchedStudents ?? [];
  const openRooms = [...(summary?.incompleteRooms ?? []), ...(summary?.emptyRooms ?? [])];

  return (
    <PageShell>
      {toast.node}
      {header}

      <div style={{ marginBottom: '1rem' }}>
        <Pill dot="var(--accent-color, #F26F21)">
          {space.semesterCode} • {space.subjectCode} — {SPACE_STATUS_LABEL[status]}
        </Pill>
      </div>

      {isLocked && (
        <Banner tone="success">
          Học kỳ đã chốt sổ. Danh sách nhóm đã khóa; mọi thay đổi sau đây đi qua trang Quản lý Chuyển nhóm.
        </Banner>
      )}
      {status === 'Open' && (
        <Banner tone="warning">
          Không gian đang mở đăng ký tự nguyện. Cần đóng đăng ký trước khi chạy thuật toán phân bổ.
          {isModerator && (
            <div style={{ marginTop: 10 }}>
              <Button variant="dark" icon={<Lock size={15} />} loading={busy === 'close'} onClick={handleClose}>
                Đóng đăng ký ngay
              </Button>
            </div>
          )}
        </Banner>
      )}
      {status === 'Draft' && <Banner tone="info">Không gian còn ở bản nháp: hãy tải danh sách FAP và tạo phòng ở trang Quản lý Học kỳ & Phòng.</Banner>}
      {error && <Banner tone="error">{error}</Banner>}

      {/* Số liệu tổng quan */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: '1.5rem' }}>
        {[
          { label: 'Sinh viên trong danh sách', value: summary?.totalEnrolled ?? '—' },
          { label: 'Đã có nhóm', value: summary?.totalMatched ?? '—' },
          { label: 'Chưa có nhóm', value: summary?.totalUnmatched ?? '—' },
          { label: 'Phòng còn thiếu / trống', value: summary ? `${summary.incompleteRooms.length} / ${summary.emptyRooms.length}` : '—' },
        ].map((s) => (
          <Card key={s.label} padding={18}>
            <div style={{ fontSize: 13.5, color: 'var(--text-muted, #64748B)', fontWeight: 600 }}>{s.label}</div>
            <div style={{ fontSize: 26, fontWeight: 750, color: 'var(--text-main, #0F172A)', marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>{s.value}</div>
          </Card>
        ))}
      </div>

      {/* 3 bước điều phối */}
      {isModerator && (
        <Card style={{ marginBottom: '1.5rem' }}>
          <CardTitle icon={<Cpu size={18} />} title="Quy trình Điều phối 3 Bước" subtitle="Xem trước → Thực thi → Chốt sổ" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
            <StepCard step={1} title="Chạy thuật toán xem trước" desc="Matching Service tính phương án lấp phòng thiếu người, gom sinh viên còn lại vào phòng trống." done={!!preview || confirmed}>
              <Button block icon={<Sparkles size={16} />} loading={busy === 'preview'} disabled={!canDistribute || unmatched.length === 0} onClick={handlePreview}>
                Xem trước phương án
              </Button>
            </StepCard>
            <StepCard step={2} title="Xác nhận thực thi" desc="Thêm sinh viên vào phòng theo phương án và gửi thông báo cho từng sinh viên." done={confirmed}>
              <Button block variant="dark" icon={<Send size={16} />} loading={busy === 'confirm'} disabled={!canDistribute || !preview || preview.totalDistributed === 0} onClick={handleConfirm}>
                Thực thi phân bổ
              </Button>
            </StepCard>
            <StepCard step={3} title="Chốt sổ & khóa danh sách" desc="Khóa mọi nhóm, từ chối các đơn còn chờ. Không thể hoàn tác." done={isLocked}>
              <Button block variant="danger" icon={<Lock size={16} />} loading={busy === 'finalize'} disabled={!canDistribute} onClick={handleFinalize}>
                Chốt sổ học kỳ
              </Button>
            </StepCard>
          </div>
        </Card>
      )}

      {/* Phương án xem trước */}
      {preview && (
        <Card style={{ marginBottom: '1.5rem' }}>
          <CardTitle
            icon={<Layers size={18} />}
            title="Phương án Phân bổ (Matching Service)"
            subtitle={`Phân bổ ${preview.totalDistributed}/${preview.totalUnmatched} sinh viên, còn lại ${preview.totalRemaining}`}
          />
          {preview.undersizedRoomCodes && preview.undersizedRoomCodes.length > 0 && (
            <Banner tone="warning">Các phòng vẫn dưới ngưỡng sau phân bổ: {preview.undersizedRoomCodes.join(', ')}</Banner>
          )}
          {preview.roomPlans.length === 0 ? (
            <StateBox kind="empty" message="Không có phòng nào cần thay đổi." />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
              {preview.roomPlans.map((plan) => (
                <div key={plan.roomId} style={{ padding: 16, borderRadius: 14, border: '1px solid var(--border-light, #E2E8F0)', backgroundColor: 'var(--bg-subtle, #F8FAFC)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontWeight: 750, color: 'var(--text-main, #0F172A)' }}>{plan.roomCode || plan.name}</span>
                    {plan.isNewlyFormed ? <Pill tone="accent">Nhóm mới</Pill> : <Pill>Lấp phòng thiếu</Pill>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13.5, color: 'var(--text-muted, #64748B)', marginBottom: 10 }}>
                    {plan.memberCountBefore} <ArrowRight size={13} /> <b style={{ color: 'var(--text-main, #0F172A)' }}>{plan.memberCountAfter}</b> thành viên • Cân bằng kỹ năng{' '}
                    <b style={{ color: 'var(--text-main, #0F172A)' }}>{Math.round(plan.balanceScore)}</b>
                  </div>
                  <div style={{ fontSize: 13.5, color: 'var(--text-secondary, #334155)', marginBottom: 6 }}>
                    Trưởng nhóm: <b>{plan.leaderName || '—'}</b>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {plan.addedStudents.map((st) => (
                      <div key={st.userId} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 14, padding: '7px 10px', borderRadius: 10, backgroundColor: 'var(--bg-card, #FFFFFF)', border: '1px solid var(--border-light, #E2E8F0)' }}>
                        <span>
                          <b>+ {st.fullName}</b> <span style={{ color: 'var(--text-muted, #64748B)' }}>({st.studentCode})</span>
                        </span>
                        <span style={{ color: 'var(--text-muted, #64748B)' }}>
                          {st.major}
                          {st.isLeader ? ' • Trưởng nhóm' : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Sinh viên lẻ & phòng còn chỗ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(460px, 100%), 1fr))', gap: '1.5rem' }}>
        <Card>
          <CardTitle icon={<Users size={18} />} title={`Sinh viên chưa có nhóm (${unmatched.length})`} subtitle="Kèm điểm 5 kỹ năng từ hồ sơ" />
          {loading && !summary ? (
            <StateBox kind="loading" />
          ) : unmatched.length === 0 ? (
            <StateBox kind="empty" message={summary ? 'Mọi sinh viên đều đã có nhóm.' : 'Chưa có dữ liệu.'} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 560, overflowY: 'auto' }}>
              {unmatched.map((st) => (
                <div key={st.userId} style={{ padding: '12px 14px', borderRadius: 12, border: '1px solid var(--border-light, #E2E8F0)', backgroundColor: 'var(--bg-subtle, #F8FAFC)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, color: 'var(--text-main, #0F172A)' }}>{st.fullName}</span>
                    <span style={{ fontSize: 13.5, color: 'var(--text-muted, #64748B)' }}>
                      {st.studentCode} • {st.major}
                      {st.cohort ? ` • ${st.cohort}` : ''}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                    {SKILL_KEYS.map(({ key, label }) => (
                      <Pill key={key}>
                        {label}: {st[key]}
                      </Pill>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <CardTitle icon={<Layers size={18} />} title={`Phòng còn chỗ (${openRooms.length})`} subtitle="Phòng thiếu người trước, phòng trống sau" />
          {loading && !summary ? (
            <StateBox kind="loading" />
          ) : openRooms.length === 0 ? (
            <StateBox kind="empty" message={summary ? 'Không còn phòng trống hoặc thiếu người.' : 'Chưa có dữ liệu.'} />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10, maxHeight: 560, overflowY: 'auto' }}>
              {openRooms.map((room) => (
                <RoomRow key={room.roomId} room={room} />
              ))}
            </div>
          )}
        </Card>
      </div>
    </PageShell>
  );
};

export default ModeratorDistributionPage;
