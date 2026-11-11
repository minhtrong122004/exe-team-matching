import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeftRight,
  CheckCircle2,
  XCircle,
  UserCheck,
  Send,
  Users,
  AlertCircle,
} from '../../utils/icons';
import { useSelectedSpace } from '../../hooks/useSelectedSpace';
import { workspaceApi, errorMessage, formatDateTime, type RosterGroup, type TransferRequest } from '../../api/workspace';
import { StateBox, useConfirm } from '../../components/workspace/ui';

// Giao diện giữ nguyên bản thiết kế của Tú; dữ liệu lấy từ Group Service (transfer-requests, roster, direct-transfer).

interface StudentTransferRequest {
  id: string;
  type: 'ONE_WAY' | 'SWAP';
  studentName: string;
  studentCode: string;
  major: string;
  currentRoom: string;
  currentCount: number;
  currentMax: number;
  targetRoom: string;
  targetCount: number;
  targetMax: number;
  swapWithStudent?: {
    name: string;
    studentCode: string;
    major: string;
  };
  reason: string;
  submittedAt: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';
  raw: TransferRequest;
}

export const ModeratorTransfersPage: React.FC = () => {
  const { space, loading: spacesLoading, error: spacesError } = useSelectedSpace();
  const dialog = useConfirm();
  const [rawRequests, setRawRequests] = useState<TransferRequest[]>([]);
  const [groups, setGroups] = useState<RosterGroup[]>([]);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Direct Transfer Tool State (giá trị là id thật)
  const [sourceRoom, setSourceRoom] = useState<string>('');
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [transferType, setTransferType] = useState<'ONE_WAY' | 'SWAP'>('ONE_WAY');
  const [targetRoom, setTargetRoom] = useState<string>('');
  const [swapTargetStudent, setSwapTargetStudent] = useState<string>('');
  const [directReason, setDirectReason] = useState<string>('');

  const flash = (msg: string) => {
    setToastMsg(msg);
    window.setTimeout(() => setToastMsg(null), 4000);
  };
  const flashError = (err: unknown) => {
    setErrorMsg(errorMessage(err));
    window.setTimeout(() => setErrorMsg(null), 6000);
  };

  const spaceId = space?.id;
  const isLocked = space?.status === 'Locked';
  const threshold = space?.groupThreshold ?? 3;

  const load = useCallback(async () => {
    if (!spaceId) return;
    try {
      const [reqs, roster] = await Promise.all([workspaceApi.listTransferRequests(spaceId), workspaceApi.getRoster(spaceId)]);
      setRawRequests([...reqs].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
      setGroups(roster.groups.filter((g) => g.memberCount > 0).sort((a, b) => a.roomCode.localeCompare(b.roomCode)));
    } catch (err) {
      flashError(err);
    }
  }, [spaceId]);

  useEffect(() => {
    setRawRequests([]);
    setGroups([]);
    setSourceRoom('');
    void load();
  }, [load]);

  // Cập nhật danh sách yêu cầu chuyển nhóm thời gian thực
  useEffect(() => {
    const handleRealtime = () => void load();
    window.addEventListener('realtime:transfer-updated', handleRealtime);
    window.addEventListener('realtime:space-updated', handleRealtime);
    return () => {
      window.removeEventListener('realtime:transfer-updated', handleRealtime);
      window.removeEventListener('realtime:space-updated', handleRealtime);
    };
  }, [load]);

  // Dữ liệu thật → đúng dạng mà giao diện đang hiển thị
  const requests: StudentTransferRequest[] = useMemo(() => {
    const groupById = new Map(groups.map((g) => [g.groupId, g]));
    const memberById = new Map(groups.flatMap((g) => g.members.map((m) => [m.studentId, m] as const)));
    return rawRequests.map((r) => {
      const from = groupById.get(r.fromGroupId);
      const to = groupById.get(r.targetGroupId);
      const swap = r.swapWithStudentId ? memberById.get(r.swapWithStudentId) : undefined;
      return {
        id: r.id,
        type: r.swapWithStudentId ? 'SWAP' : 'ONE_WAY',
        studentName: r.requesterStudentName,
        studentCode: r.requesterStudentCode,
        major: memberById.get(r.requesterStudentId)?.major ?? '',
        currentRoom: r.fromGroupCode,
        currentCount: from?.memberCount ?? 0,
        currentMax: from?.maxMembers ?? space?.maxMembersPerGroup ?? 5,
        targetRoom: r.targetGroupCode,
        targetCount: to?.memberCount ?? 0,
        targetMax: to?.maxMembers ?? space?.maxMembersPerGroup ?? 5,
        swapWithStudent: r.swapWithStudentId
          ? { name: r.swapWithStudentName ?? '', studentCode: r.swapWithStudentCode ?? '', major: swap?.major ?? '' }
          : undefined,
        reason: r.reason,
        submittedAt: formatDateTime(r.createdAt),
        status: r.status,
        raw: r,
      };
    });
  }, [rawRequests, groups, space]);

  const source = groups.find((g) => g.groupId === sourceRoom);
  const target = groups.find((g) => g.groupId === targetRoom);
  const selectedMember = source?.members.find((m) => m.studentId === selectedStudent);

  // Logic constraint: nhóm nguồn ở ngưỡng tối thiểu, hoặc nhóm đích đã đủ người → chỉ đổi chéo
  const isOneWayDisabled = (!!source && source.memberCount <= threshold) || (!!target && target.memberCount >= target.maxMembers);
  useEffect(() => {
    if (isOneWayDisabled) setTransferType('SWAP');
  }, [isOneWayDisabled]);
  useEffect(() => {
    setSelectedStudent('');
    setTargetRoom('');
  }, [sourceRoom]);
  useEffect(() => setSwapTargetStudent(''), [targetRoom]);

  // Handlers for Student Requests
  const decide = async (id: string, approved: boolean) => {
    if (!space) return;
    const req = requests.find((r) => r.id === id);
    const note = await dialog.confirm({
      title: approved ? `Chấp thuận yêu cầu của ${req?.studentName ?? ''}?` : `Từ chối yêu cầu của ${req?.studentName ?? ''}?`,
      confirmLabel: approved ? 'Chấp thuận' : 'Từ chối',
      danger: !approved,
      input: approved ? { label: 'Ghi chú' } : { label: 'Lý do từ chối', required: true },
    });
    if (note === null) return;
    setBusy(true);
    try {
      await workspaceApi.decideTransferRequest(space.id, id, approved, note);
      flash(approved ? 'Đã phê duyệt yêu cầu điều chuyển thành công! Danh sách 2 nhóm đã được cập nhật.' : 'Đã từ chối yêu cầu điều chuyển.');
      await load();
    } catch (err) {
      flashError(err);
    } finally {
      setBusy(false);
    }
  };
  const handleApproveRequest = (id: string) => void decide(id, true);
  const handleRejectRequest = (id: string) => void decide(id, false);

  // Direct Transfer Execution
  const canExecute =
    isLocked && !!selectedStudent && !!targetRoom && (transferType === 'ONE_WAY' || !!swapTargetStudent) && !!directReason.trim() && !busy;
  const handleExecuteDirectTransfer = async () => {
    if (!space || !canExecute) return;
    setBusy(true);
    try {
      await workspaceApi.directTransfer(space.id, {
        studentId: selectedStudent,
        targetGroupId: targetRoom,
        swapWithStudentId: transferType === 'SWAP' ? swapTargetStudent : null,
        reason: directReason.trim(),
      });
      flash(`Đã thực thi điều chuyển trực tiếp ${transferType === 'ONE_WAY' ? '1 chiều' : 'đổi chéo 1-1'} giữa ${source?.roomCode} và ${target?.roomCode} thành công!`);
      setSourceRoom('');
      setDirectReason('');
      await load();
    } catch (err) {
      flashError(err);
    } finally {
      setBusy(false);
    }
  };

  const pendingCount = requests.filter((r) => r.status === 'Pending').length;

  if (!space) {
    return (
      <div style={{ padding: '0 0 3rem 0', maxWidth: 1560, margin: '0 auto' }}>
        <StateBox
          kind={spacesLoading ? 'loading' : spacesError ? 'error' : 'empty'}
          title={spacesLoading ? undefined : 'Chưa có không gian môn học'}
          message={spacesError ?? (spacesLoading ? 'Đang tải...' : 'Tạo không gian môn học ở trang Quản lý Học kỳ & Phòng trước.')}
        />
      </div>
    );
  }

  return (
    <div className="motion-page-enter" style={{ padding: '0 0 3rem 0', maxWidth: 1560, margin: '0 auto' }}>
      {/* Toast */}
      {toastMsg && (
        <div
          className="motion-dropdown-panel"
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 9999,
            backgroundColor: '#0F172A',
            color: '#FFFFFF',
            padding: '12px 18px',
            borderRadius: 10,
            border: '1px solid #334155',
            boxShadow: '0 10px 25px rgba(15, 23, 42, 0.18)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontSize: '14.5px',
            fontWeight: 500,
          }}
        >
          <CheckCircle2 size={17} color="#10B981" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Page Header — Minimal Enterprise Hierarchy */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '13px',
            fontWeight: 500,
            color: '#64748B',
            marginBottom: '6px',
          }}
        >
          <span>Điều phối & Học kỳ</span>
          <span style={{ color: '#CBD5E1' }}>/</span>
          <span style={{ color: '#334155', fontWeight: 600 }}>Quản lý chuyển nhóm</span>
        </div>
        <h1
          style={{
            fontSize: '24px',
            fontWeight: 650,
            color: '#0F172A',
            margin: '0 0 4px 0',
            letterSpacing: '-0.02em',
          }}
        >
          Quản lý Chuyển nhóm & Đổi chéo sau Chốt sổ
        </h1>
        <p style={{ color: '#64748B', fontSize: '14.5px', margin: 0, lineHeight: 1.5 }}>
          Xử lý các đề xuất xin chuyển nhóm của sinh viên và công cụ điều chuyển cưỡng bức của Điều phối viên sau khi học kỳ đã chốt sổ.
        </p>
      </div>

      {errorMsg && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 9999,
            maxWidth: 'min(560px, calc(100vw - 32px))',
            backgroundColor: '#B91C1C',
            color: '#FFFFFF',
            padding: '12px 18px',
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontSize: '15px',
            fontWeight: 600,
          }}
        >
          <AlertCircle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}
      {dialog.node}

      {/* FPT Tricolor Brand Identity Line */}
      <div className="fpt-tricolor-bar" style={{ height: 3.5, borderRadius: 2, marginBottom: '1.25rem' }} />

      {!isLocked && (
        <div style={{ padding: '12px 16px', borderRadius: 10, backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', marginBottom: '1.5rem', fontSize: '14px', color: '#475569' }}>
          Chuyển nhóm chỉ áp dụng sau khi học kỳ {space.semesterCode} • {space.subjectCode} đã <strong style={{ color: '#0F172A' }}>chốt sổ</strong> ở trang Điều phối.
        </div>
      )}

      {/* KHU VỰC 1: Duyệt yêu cầu từ Sinh viên */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '14px',
          padding: '24px',
          marginBottom: '1.5rem',
          boxShadow: '0 1px 2px rgba(15, 23, 42, 0.03)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            marginBottom: '18px',
            paddingBottom: '14px',
            borderBottom: '1px solid #F1F5F9',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 8,
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#475569',
                flexShrink: 0,
              }}
            >
              <Users size={17} />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 650, color: '#0F172A', margin: 0, letterSpacing: '-0.01em' }}>
                Khu vực 1: Danh sách Đơn xin Chuyển nhóm từ Sinh viên
              </h3>
              <span style={{ fontSize: '13.5px', color: '#64748B' }}>
                Các đơn do sinh viên nộp sau thời điểm chốt sổ học kỳ kèm lý do chính đáng
              </span>
            </div>
          </div>

          {/* Neutral Pending Counter Chip */}
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '12.5px',
              fontWeight: 500,
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              color: '#334155',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                backgroundColor: pendingCount > 0 ? '#F59E0B' : '#10B981',
                boxShadow: pendingCount > 0 ? '0 0 0 2px rgba(245, 158, 11, 0.16)' : '0 0 0 2px rgba(16, 185, 129, 0.16)',
              }}
            />
            {pendingCount > 0 ? `${pendingCount} đơn chờ duyệt` : 'Đã xử lý toàn bộ'}
          </span>
        </div>

        {/* Request List Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {requests.length === 0 && (
            <div style={{ padding: '28px', textAlign: 'center', color: '#64748B', fontSize: '14px', border: '1px dashed #CBD5E1', borderRadius: 10 }}>
              Chưa có đơn xin chuyển nhóm nào.
            </div>
          )}
          {requests.map((req) => (
            <div
              key={req.id}
              className="motion-list-row"
              style={{
                padding: '16px 18px',
                borderRadius: 10,
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '16px',
              }}
            >
              <div style={{ flex: 1, minWidth: 320 }}>
                {/* Top metadata row: Neutral Type Badge + Timestamp */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: 6,
                      fontSize: '11.5px',
                      fontWeight: 600,
                      letterSpacing: '0.02em',
                      backgroundColor: '#F1F5F9',
                      border: '1px solid #E2E8F0',
                      color: '#334155',
                    }}
                  >
                    {req.type === 'SWAP' ? 'ĐỔI CHÉO 1-1 (SWAP)' : 'CHUYỂN 1 CHIỀU'}
                  </span>
                  <span style={{ fontSize: '13px', color: '#64748B', fontVariantNumeric: 'tabular-nums' }}>
                    Gửi lúc: {req.submittedAt}
                  </span>
                </div>

                {/* Student Name & Metadata */}
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                  <span style={{ fontWeight: 650, fontSize: '15.5px', color: '#0F172A' }}>
                    {req.studentName}
                  </span>
                  <span style={{ fontSize: '13.5px', color: '#64748B', fontWeight: 500 }}>
                    {req.studentCode}{req.major ? ` • ${req.major}` : ''}
                  </span>
                </div>

                {/* Transfer Route — Unified Neutral Room Chips */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', margin: '8px 0 10px' }}>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono, monospace)',
                      fontSize: '13px',
                      fontWeight: 600,
                      fontVariantNumeric: 'tabular-nums',
                      color: '#334155',
                      backgroundColor: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      padding: '3px 9px',
                      borderRadius: 6,
                    }}
                  >
                    {req.currentRoom} ({req.currentCount}/{req.currentMax})
                  </span>
                  <ArrowLeftRight size={14} color="#64748B" />
                  <span
                    style={{
                      fontFamily: 'var(--font-mono, monospace)',
                      fontSize: '13px',
                      fontWeight: 600,
                      fontVariantNumeric: 'tabular-nums',
                      color: '#0F172A',
                      backgroundColor: '#F8FAFC',
                      border: '1px solid #CBD5E1',
                      padding: '3px 9px',
                      borderRadius: 6,
                    }}
                  >
                    {req.targetRoom} ({req.targetCount}/{req.targetMax})
                  </span>
                  {req.swapWithStudent && (
                    <span style={{ fontSize: '13.5px', color: '#475569' }}>
                      • Đổi với: <strong style={{ color: '#0F172A', fontWeight: 600 }}>{req.swapWithStudent.name}</strong>{' '}
                      <span style={{ color: '#64748B' }}>({req.swapWithStudent.studentCode})</span>
                    </span>
                  )}
                </div>

                {/* Reason Box */}
                <div
                  style={{
                    fontSize: '13.5px',
                    color: '#475569',
                    backgroundColor: '#F8FAFC',
                    padding: '9px 12px',
                    borderRadius: 8,
                    border: '1px solid #F1F5F9',
                    lineHeight: 1.5,
                  }}
                >
                  <span style={{ color: '#64748B', fontWeight: 500 }}>Lý do: </span>
                  “{req.reason}”
                </div>
              </div>

              {/* Status or Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {req.status === 'Pending' ? (
                  <>
                    <button
                      type="button"
                      className="motion-btn"
                      onClick={() => handleApproveRequest(req.id)}
                      disabled={busy}
                      style={{
                        height: 36,
                        padding: '0 14px',
                        borderRadius: 8,
                        backgroundColor: '#059669',
                        color: '#FFFFFF',
                        border: '1px solid #047857',
                        fontSize: '13.5px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <CheckCircle2 size={15} />
                      Chấp thuận
                    </button>
                    <button
                      type="button"
                      className="motion-btn"
                      onClick={() => handleRejectRequest(req.id)}
                      disabled={busy}
                      style={{
                        height: 36,
                        padding: '0 14px',
                        borderRadius: 8,
                        backgroundColor: '#FFFFFF',
                        color: '#DC2626',
                        border: '1px solid #FECACA',
                        fontSize: '13.5px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <XCircle size={15} />
                      Từ chối
                    </button>
                  </>
                ) : req.status === 'Approved' ? (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '5px 11px',
                      borderRadius: 6,
                      backgroundColor: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      color: '#334155',
                      fontWeight: 500,
                      fontSize: '13px',
                    }}
                  >
                    <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#10B981', boxShadow: '0 0 0 2px rgba(16, 185, 129, 0.16)' }} />
                    Đã chấp thuận
                  </span>
                ) : (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '5px 11px',
                      borderRadius: 6,
                      backgroundColor: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      color: '#334155',
                      fontWeight: 500,
                      fontSize: '13px',
                    }}
                  >
                    <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#EF4444', boxShadow: '0 0 0 2px rgba(239, 68, 68, 0.16)' }} />
                    {req.status === 'Cancelled' ? 'Sinh viên đã hủy' : 'Đã từ chối'}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* KHU VỰC 2: Công cụ Điều chuyển Trực tiếp của Điều phối viên */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '14px',
          padding: '24px',
          boxShadow: '0 1px 2px rgba(15, 23, 42, 0.03)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '16px',
            paddingBottom: '14px',
            borderBottom: '1px solid #F1F5F9',
          }}
        >
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#475569',
              flexShrink: 0,
            }}
          >
            <UserCheck size={17} />
          </div>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 650, color: '#0F172A', margin: 0, letterSpacing: '-0.01em' }}>
              Khu vực 2: Công cụ Điều chuyển Cưỡng bức Trực tiếp (Direct Transfer Tool)
            </h3>
            <span style={{ fontSize: '13.5px', color: '#64748B' }}>
              Điều phối viên can thiệp trực tiếp để chuyển hoặc hoán đổi vị trí thành viên giữa 2 nhóm bất kỳ
            </span>
          </div>
        </div>

        {/* Neutral Rules Banner */}
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 10,
            backgroundColor: '#F8FAFC',
            border: '1px solid #E2E8F0',
            marginBottom: '1.25rem',
            fontSize: '13.5px',
            color: '#475569',
            lineHeight: 1.55,
          }}
        >
          <strong style={{ color: '#0F172A', fontWeight: 600 }}>Quy tắc ràng buộc chuyển nhóm:</strong>
          <ul style={{ margin: '4px 0 0 0', paddingLeft: '18px' }}>
            <li>
              Nếu nhóm nguồn chỉ có {threshold} thành viên trở xuống, hoặc nhóm đích đã đủ người, bắt buộc phải chọn <strong style={{ color: '#0F172A', fontWeight: 600 }}>Đổi chéo (Swap 1-1)</strong> để không làm nhóm nguồn bị tụt xuống dưới ngưỡng {threshold} người.
            </li>
            <li>
              Nếu sinh viên được chọn là <strong style={{ color: '#0F172A', fontWeight: 600 }}>Trưởng nhóm</strong> của nhóm nguồn, hệ thống sẽ tự động chỉ định thành viên tham gia sớm nhất kế tiếp lên làm Trưởng nhóm mới.
            </li>
          </ul>
        </div>

        {/* Direct Form Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginBottom: '1.25rem' }}>
          {/* 1. Chọn Nhóm nguồn */}
          <div>
            <label style={{ display: 'block', fontSize: '13.5px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              1. Nhóm nguồn (Source Group)
            </label>
            <select
              value={sourceRoom}
              disabled={!isLocked}
              onChange={(e) => setSourceRoom(e.target.value)}
              style={{
                width: '100%',
                height: 40,
                padding: '0 10px',
                borderRadius: 8,
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
                fontSize: '14px',
                color: '#0F172A',
                outline: 'none',
              }}
            >
              <option value="">— Chọn nhóm nguồn —</option>
              {groups.map((g) => (
                <option key={g.groupId} value={g.groupId}>
                  {g.roomCode} ({g.memberCount}/{g.maxMembers} thành viên{g.memberCount <= threshold ? ' - Chỉ hỗ trợ Swap' : ''})
                </option>
              ))}
            </select>
          </div>

          {/* 2. Chọn Sinh viên cần chuyển */}
          <div>
            <label style={{ display: 'block', fontSize: '13.5px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              2. Sinh viên cần chuyển đi
            </label>
            <select
              value={selectedStudent}
              onChange={(e) => setSelectedStudent(e.target.value)}
              style={{
                width: '100%',
                height: 40,
                padding: '0 10px',
                borderRadius: 8,
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
                fontSize: '14px',
                color: '#0F172A',
                outline: 'none',
              }}
            >
              <option value="">— Chọn sinh viên —</option>
              {source?.members.map((m) => (
                <option key={m.studentId} value={m.studentId}>
                  {m.fullName} ({m.studentCode}) — [{m.role === 'Leader' ? 'Trưởng nhóm' : 'Thành viên'}]
                </option>
              ))}
            </select>
            {selectedMember?.role === 'Leader' && (
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12.5px',
                  color: '#B45309',
                  marginTop: '6px',
                  fontWeight: 500,
                }}
              >
                <span style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: '#F59E0B', flexShrink: 0 }} />
                <span>Sinh viên này là Trưởng nhóm: Thành viên kế tiếp sẽ tự động kế nhiệm.</span>
              </span>
            )}
          </div>

          {/* 3. Loại thao tác điều chuyển — Clean Segmented Control */}
          <div>
            <label style={{ display: 'block', fontSize: '13.5px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              3. Loại hình chuyển
            </label>
            <div
              style={{
                display: 'flex',
                gap: '4px',
                backgroundColor: '#F1F5F9',
                border: '1px solid #E2E8F0',
                padding: '3px',
                borderRadius: 8,
                height: 40,
                boxSizing: 'border-box',
              }}
            >
              <button
                type="button"
                disabled={isOneWayDisabled}
                onClick={() => setTransferType('ONE_WAY')}
                style={{
                  flex: 1,
                  borderRadius: 6,
                  fontSize: '13.5px',
                  fontWeight: transferType === 'ONE_WAY' ? 600 : 500,
                  cursor: isOneWayDisabled ? 'not-allowed' : 'pointer',
                  opacity: isOneWayDisabled ? 0.45 : 1,
                  border: transferType === 'ONE_WAY' ? '1px solid #CBD5E1' : '1px solid transparent',
                  backgroundColor: transferType === 'ONE_WAY' ? '#FFFFFF' : 'transparent',
                  color: transferType === 'ONE_WAY' ? '#0F172A' : '#64748B',
                  boxShadow: transferType === 'ONE_WAY' ? '0 1px 2px rgba(15, 23, 42, 0.06)' : 'none',
                  transition: 'all 150ms ease',
                }}
              >
                Chuyển 1 chiều
              </button>
              <button
                type="button"
                onClick={() => setTransferType('SWAP')}
                style={{
                  flex: 1,
                  borderRadius: 6,
                  fontSize: '13.5px',
                  fontWeight: transferType === 'SWAP' ? 600 : 500,
                  cursor: 'pointer',
                  border: transferType === 'SWAP' ? '1px solid #CBD5E1' : '1px solid transparent',
                  backgroundColor: transferType === 'SWAP' ? '#FFFFFF' : 'transparent',
                  color: transferType === 'SWAP' ? '#0F172A' : '#64748B',
                  boxShadow: transferType === 'SWAP' ? '0 1px 2px rgba(15, 23, 42, 0.06)' : 'none',
                  transition: 'all 150ms ease',
                }}
              >
                Đổi chéo (Swap 1-1)
              </button>
            </div>
            {isOneWayDisabled && (
              <span style={{ fontSize: '12.5px', color: '#DC2626', marginTop: '5px', display: 'block', fontWeight: 500 }}>
                * Nhóm nguồn ở ngưỡng tối thiểu hoặc nhóm đích đã đủ người, khóa chuyển 1 chiều.
              </span>
            )}
          </div>

          {/* 4. Chọn Nhóm đích */}
          <div>
            <label style={{ display: 'block', fontSize: '13.5px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              4. Nhóm đích (Target Group)
            </label>
            <select
              value={targetRoom}
              onChange={(e) => setTargetRoom(e.target.value)}
              style={{
                width: '100%',
                height: 40,
                padding: '0 10px',
                borderRadius: 8,
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
                fontSize: '14px',
                color: '#0F172A',
                outline: 'none',
              }}
            >
              <option value="">— Chọn nhóm đích —</option>
              {groups
                .filter((g) => g.groupId !== sourceRoom)
                .map((g) => (
                  <option key={g.groupId} value={g.groupId}>
                    {g.roomCode} (Hiện có {g.memberCount}/{g.maxMembers}
                    {g.memberCount >= g.maxMembers ? ' - Chỉ hỗ trợ Swap' : ` - Còn ${g.maxMembers - g.memberCount} chỗ trống`})
                  </option>
                ))}
            </select>
          </div>

          {/* 5. Nếu Swap: Chọn sinh viên nhóm đích */}
          {transferType === 'SWAP' && (
            <div>
              <label style={{ display: 'block', fontSize: '13.5px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                5. Sinh viên nhóm đích để đổi chéo
              </label>
              <select
                value={swapTargetStudent}
                onChange={(e) => setSwapTargetStudent(e.target.value)}
                style={{
                  width: '100%',
                  height: 40,
                  padding: '0 10px',
                  borderRadius: 8,
                  border: '1px solid #CBD5E1',
                  backgroundColor: '#FFFFFF',
                  fontSize: '14px',
                  color: '#0F172A',
                  outline: 'none',
                }}
              >
                <option value="">— Chọn sinh viên —</option>
                {target?.members.map((m) => (
                  <option key={m.studentId} value={m.studentId}>
                    {m.fullName} ({m.studentCode}{m.major ? ` • ${m.major}` : ''})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ display: 'block', fontSize: '13.5px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
            Lý do điều chuyển
          </label>
          <textarea
            value={directReason}
            onChange={(e) => setDirectReason(e.target.value)}
            rows={2}
            placeholder="Ví dụ: Cân bằng chuyên ngành giữa hai nhóm theo đề xuất của giảng viên."
            style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', fontSize: '14px', color: '#0F172A', outline: 'none', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }}
          />
        </div>

        {/* Nút thực hiện điều chuyển — Synced with user's chosen accent color */}
        <button
          type="button"
          className="motion-btn"
          onClick={handleExecuteDirectTransfer}
          disabled={!canExecute}
          style={{
            opacity: canExecute ? 1 : 0.5,
            height: 40,
            padding: '0 20px',
            borderRadius: 9,
            background: 'var(--accent-gradient, var(--accent-color, #F26F21))',
            boxShadow: '0 1px 3px var(--accent-shadow, rgba(242, 111, 33, 0.2))',
            color: '#FFFFFF',
            border: 'none',
            fontSize: '14px',
            fontWeight: 600,
            cursor: canExecute ? 'pointer' : 'not-allowed',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Send size={15} />
          Thực hiện Điều chuyển ngay lập tức
        </button>
      </div>
    </div>
  );
};
export default ModeratorTransfersPage;
