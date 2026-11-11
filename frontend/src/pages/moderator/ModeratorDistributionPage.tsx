import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Users,
  Cpu,
  CheckCircle2,
  Lock,
  Sparkles,
  ArrowRight,
  Layers,
  Send,
  AlertCircle,
} from '../../utils/icons';
import { useSelectedSpace, reloadSpaces } from '../../hooks/useSelectedSpace';
import { workspaceApi, errorMessage, type DistributePreview, type UnmatchedSummary } from '../../api/workspace';
import { StateBox, Button, useConfirm } from '../../components/workspace/ui';

// Giao diện giữ nguyên bản thiết kế của Tú; dữ liệu lấy từ Group Service (unmatched-summary,
// distribute-preview/confirm qua Matching gRPC, finalize) thay cho dữ liệu mẫu.

interface UnassignedStudent {
  id: string;
  name: string;
  studentCode: string;
  major: string;
  classCode: string;
  skills: {
    tech: number;
    management: number;
    graphicDesign: number;
    marketing: number;
    sale: number;
  };
}

interface IncompleteRoom {
  id: string;
  code: string;
  name: string;
  currentCount: number;
  maxCount: number;
  leaderName: string;
  status: 'Incomplete' | 'Empty';
  neededSkills: string[];
}

interface PlannedStudent {
  name: string;
  studentCode: string;
  major: string;
  management: number;
  isLeader: boolean;
}

interface DistributionPlan {
  priority1: {
    student: PlannedStudent;
    targetRoom: string;
    reason: string;
    existingLeader: string;
  }[];
  priority2: {
    targetRoom: string;
    students: PlannedStudent[];
    newLeader: PlannedStudent | null;
    reason: string;
  }[];
}

export const ModeratorDistributionPage: React.FC = () => {
  const { space, loading: spacesLoading, error: spacesError } = useSelectedSpace();
  const dialog = useConfirm();
  const [summary, setSummary] = useState<UnmatchedSummary | null>(null);
  const [preview, setPreview] = useState<DistributePreview | null>(null);

  // 3-step state
  const planGenerated = !!preview;
  const [executed, setExecuted] = useState<boolean>(false);
  const isSemesterLocked = space?.status === 'Locked';
  const canDistribute = space?.status === 'ClosedRegistration';
  const [busy, setBusy] = useState(false);

  // Notification Toast
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const flash = (msg: string) => {
    setToastMsg(msg);
    window.setTimeout(() => setToastMsg(null), 4000);
  };
  const flashError = (err: unknown) => {
    setErrorMsg(errorMessage(err));
    window.setTimeout(() => setErrorMsg(null), 6000);
  };

  const spaceId = space?.id;
  const loadSummary = useCallback(async () => {
    if (!spaceId) return;
    try {
      setSummary(await workspaceApi.getUnmatchedSummary(spaceId));
    } catch (err) {
      flashError(err);
    }
  }, [spaceId]);

  useEffect(() => {
    setSummary(null);
    setPreview(null);
    setExecuted(false);
    void loadSummary();
  }, [loadSummary]);

  // Cập nhật danh sách sinh viên lẻ theo thời gian thực khi có người vào/rời phòng
  useEffect(() => {
    const handleRealtime = () => void loadSummary();
    window.addEventListener('realtime:space-updated', handleRealtime);
    window.addEventListener('realtime:member-joined', handleRealtime);
    window.addEventListener('realtime:member-left', handleRealtime);
    return () => {
      window.removeEventListener('realtime:space-updated', handleRealtime);
      window.removeEventListener('realtime:member-joined', handleRealtime);
      window.removeEventListener('realtime:member-left', handleRealtime);
    };
  }, [loadSummary]);

  // Dữ liệu thật → đúng dạng mà giao diện đang hiển thị
  const unassignedList: UnassignedStudent[] = useMemo(
    () =>
      (summary?.unmatchedStudents ?? []).map((s) => ({
        id: s.userId,
        name: s.fullName,
        studentCode: s.studentCode,
        major: s.major,
        classCode: s.cohort || '—',
        skills: {
          tech: s.techScore,
          management: s.managementScore,
          graphicDesign: s.graphicDesignScore,
          marketing: s.marketingScore,
          sale: s.saleScore,
        },
      })),
    [summary]
  );

  const roomsList: IncompleteRoom[] = useMemo(
    () =>
      [...(summary?.incompleteRooms ?? []), ...(summary?.emptyRooms ?? [])].map((r) => ({
        id: r.roomId,
        code: r.roomCode || r.name,
        name: r.name,
        currentCount: r.memberCount,
        maxCount: r.maxMembers,
        leaderName: r.leaderName || '(Chưa có)',
        status: r.memberCount === 0 ? 'Empty' : 'Incomplete',
        neededSkills:
          r.memberCount === 0
            ? ['Đang trống 100%']
            : [`Còn ${r.maxMembers - r.memberCount} chỗ`, ...[...new Set(r.members.map((m) => m.major).filter(Boolean) as string[])].map((m) => `Có ${m}`)],
      })),
    [summary]
  );

  // Generated Plan (từ Matching Service)
  const previewPlan: DistributionPlan = useMemo(() => {
    const plans = preview?.roomPlans ?? [];
    const toPlanned = (s: { fullName: string; studentCode: string; major: string; managementScore: number; isLeader: boolean }): PlannedStudent => ({
      name: s.fullName,
      studentCode: s.studentCode,
      major: s.major,
      management: s.managementScore,
      isLeader: s.isLeader,
    });
    return {
      priority1: plans
        .filter((p) => !p.isNewlyFormed)
        .flatMap((p) =>
          p.addedStudents.map((st) => ({
            student: toPlanned(st),
            targetRoom: p.roomCode || p.name,
            reason: `Lấp đầy phòng từ ${p.memberCountBefore} lên ${p.memberCountAfter} thành viên; chỉ số cân bằng kỹ năng ${Math.round(p.balanceScore)}/100.`,
            existingLeader: `${p.leaderName || '—'} — Giữ nguyên quyền Trưởng nhóm`,
          }))
        ),
      priority2: plans
        .filter((p) => p.isNewlyFormed)
        .map((p) => {
          const students = p.finalMembers.map(toPlanned);
          return {
            targetRoom: p.roomCode || p.name,
            students,
            newLeader: students.find((s) => s.isLeader) ?? null,
            reason: `Gom ${students.length} sinh viên còn lại vào phòng trống ${p.roomCode || p.name} tạo thành nhóm mới (chỉ số cân bằng kỹ năng ${Math.round(p.balanceScore)}/100). Sinh viên có chỉ số Quản lý cao nhất làm Trưởng nhóm.`,
          };
        }),
    };
  }, [preview]);

  // Step 1: Run Algorithm Preview
  const handleRunAlgorithm = async () => {
    if (!space) return;
    setBusy(true);
    try {
      const result = await workspaceApi.previewDistribution(space.id);
      setPreview(result);
      flash(`Đã kết nối gRPC Matching Service và tính phương án: phân bổ ${result.totalDistributed}/${result.totalUnmatched} sinh viên.`);
    } catch (err) {
      flashError(err);
    } finally {
      setBusy(false);
    }
  };

  // Step 2: Confirm Execution
  const handleConfirmExecution = async () => {
    if (!space) return;
    const ok = await dialog.confirm({ title: 'Thực thi phương án phân bổ?', message: 'Sinh viên sẽ được thêm vào phòng và nhận thông báo kết quả.', confirmLabel: 'Thực thi' });
    if (ok === null) return;
    setBusy(true);
    try {
      const result = await workspaceApi.confirmDistribution(space.id);
      setExecuted(true);
      setPreview(null);
      flash(`Đã thực thi phân phối thành công! Đã thêm ${result.totalDistributed} sinh viên vào ${result.updatedRoomsCount} phòng và gửi thông báo kết quả.`);
      await loadSummary();
    } catch (err) {
      flashError(err);
    } finally {
      setBusy(false);
    }
  };

  // Step 3: Lock Semester
  const handleLockSemester = async () => {
    if (!space) return;
    const ok = await dialog.confirm({ title: 'Chốt sổ học kỳ?', message: 'Toàn bộ nhóm bị khóa, các đơn đang chờ tự động bị từ chối. Không thể hoàn tác.', confirmLabel: 'Chốt sổ', danger: true });
    if (ok === null) return;
    setBusy(true);
    try {
      const result = await workspaceApi.finalizeSpace(space.id);
      flash(`Đã chốt sổ và khóa ${result.lockedRoomsCount} nhóm! ${result.rejectedRequestsCount} đơn chờ đã tự động bị từ chối.`);
      reloadSpaces();
      await loadSummary();
    } catch (err) {
      flashError(err);
    } finally {
      setBusy(false);
    }
  };

  const handleCloseRegistration = async () => {
    if (!space) return;
    const ok = await dialog.confirm({ title: 'Đóng đăng ký tự nguyện?', confirmLabel: 'Đóng đăng ký' });
    if (ok === null) return;
    try {
      await workspaceApi.closeRegistration(space.id);
      flash('Đã đóng đăng ký. Có thể chạy thuật toán ghép nhóm.');
      reloadSpaces();
      await loadSummary();
    } catch (err) {
      flashError(err);
    }
  };

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

  const stepsDisabled = !canDistribute || busy;
  const step1Disabled = stepsDisabled || unassignedList.length === 0;
  const step2Disabled = stepsDisabled || !planGenerated || (preview?.totalDistributed ?? 0) === 0;
  const step3Disabled = stepsDisabled;

  return (
    <div style={{ padding: '0 0 3rem 0', maxWidth: 1560, margin: '0 auto' }}>
      {/* Toast */}
      {toastMsg && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 9999,
            backgroundColor: '#059669',
            color: '#FFFFFF',
            padding: '12px 20px',
            borderRadius: 12,
            boxShadow: '0 10px 25px rgba(5, 150, 105, 0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontSize: '16px',
            fontWeight: 600,
          }}
        >
          <CheckCircle2 size={18} />
          <span>{toastMsg}</span>
        </div>
      )}
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
            padding: '12px 20px',
            borderRadius: 12,
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

      {/* Header — Minimal Enterprise Hierarchy */}
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
          <span style={{ color: '#334155', fontWeight: 600 }}>Điều phối sinh viên lẻ & Chốt sổ</span>
        </div>
        <h1 style={{ fontSize: '24px', fontWeight: 650, color: '#0F172A', margin: '0 0 4px 0', letterSpacing: '-0.02em' }}>
          Điều phối Sinh viên lẻ & Chốt sổ Học kỳ
        </h1>
        <p style={{ color: '#64748B', fontSize: '14.5px', margin: 0, lineHeight: 1.5 }}>
          Tự động phân bổ sinh viên chưa có nhóm vào các phòng còn thiếu hoặc tạo nhóm mới tối ưu theo 5 chỉ số năng lực, sau đó chốt sổ học kỳ.
        </p>
      </div>

      {!canDistribute && !isSemesterLocked && (
        <div
          style={{
            padding: '14px 18px',
            borderRadius: 14,
            backgroundColor: '#FFFBEB',
            border: '1px solid #FDE68A',
            color: '#92400E',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
            fontSize: '15px',
            fontWeight: 600,
          }}
        >
          <span>
            {space.status === 'Open'
              ? 'Học kỳ đang mở đăng ký tự nguyện. Cần đóng đăng ký trước khi chạy thuật toán ghép nhóm.'
              : 'Học kỳ chưa mở đăng ký: hãy tải danh sách FAP và tạo phòng ở trang Quản lý Học kỳ & Phòng.'}
          </span>
          {space.status === 'Open' && (
            <Button variant="dark" icon={<Lock size={15} />} onClick={handleCloseRegistration}>
              Đóng đăng ký ngay
            </Button>
          )}
        </div>
      )}

      {/* Semester Locked Banner */}
      {isSemesterLocked && (
        <div
          style={{
            padding: '20px 26px',
            borderRadius: 18,
            backgroundColor: 'rgba(5, 150, 105, 0.1)',
            border: '1px solid rgba(5, 150, 105, 0.3)',
            marginBottom: '1.75rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#059669', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Lock size={20} />
            </div>
            <div>
              <h4 style={{ fontSize: '17px', fontWeight: 800, color: '#059669', margin: 0 }}>
                Học kỳ {space.semesterCode} • {space.subjectCode} đã được Chốt sổ Chính thức
              </h4>
              <p style={{ fontSize: '15px', color: 'var(--text-secondary, #475569)', margin: '2px 0 0 0' }}>
                Toàn bộ sinh viên đã được ghép vào nhóm hợp lệ. Quyền tự ý rời nhóm bị vô hiệu hóa; mọi điều chuyển sau thời điểm này đều phải qua quy trình xét duyệt của Điều phối viên.
              </p>
            </div>
          </div>
          <span style={{ padding: '9px 18px', borderRadius: 999, backgroundColor: '#059669', color: '#FFFFFF', fontWeight: 700, fontSize: '14px' }}>
            ĐÃ KHÓA SỔ
          </span>
        </div>
      )}

      {/* 3-Step Coordination Action Toolbar */}
      <div
        style={{
          backgroundColor: 'var(--bg-card, #FFFFFF)',
          border: '1px solid var(--border-light, #E2E8F0)',
          borderRadius: '20px',
          padding: '26px',
          marginBottom: '1.75rem',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
          <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-main, #0F172A)', margin: 0 }}>
            Quy trình 3 Bước Điều phối Tự động & Khóa sổ
          </h3>
          <span style={{ fontSize: '14px', color: 'var(--text-muted, #64748B)' }}>
            Thực hiện tuần tự các bước sau khi kết thúc thời hạn đăng ký tự nguyện
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
          {/* Nút 1: Chạy thuật toán xem trước */}
          <button
            type="button"
            onClick={handleRunAlgorithm}
            disabled={step1Disabled}
            style={{
              padding: '14px 16px',
              borderRadius: 12,
              border: planGenerated ? '2px solid #0054A6' : '1px solid var(--border-medium, #CBD5E1)',
              backgroundColor: planGenerated ? 'rgba(0, 84, 166, 0.08)' : 'var(--bg-card, #FFFFFF)',
              color: planGenerated ? '#0054A6' : 'var(--text-main, #0F172A)',
              cursor: step1Disabled ? 'not-allowed' : 'pointer',
              opacity: step1Disabled ? 0.6 : 1,
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              transition: 'all 0.15s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '16px', fontWeight: 800 }}>
                Bước 1: Chạy thuật toán Ghép nhóm Tự động
              </span>
              <Cpu size={18} color="#0054A6" />
            </div>
            <span style={{ fontSize: '14px', color: 'var(--text-muted, #64748B)' }}>
              (Xem trước phương án từ gRPC Matching Service)
            </span>
          </button>

          {/* Nút 2: Xác nhận thực thi */}
          <button
            type="button"
            onClick={handleConfirmExecution}
            disabled={step2Disabled}
            style={{
              padding: '14px 16px',
              borderRadius: 12,
              border: executed ? '2px solid #059669' : '1px solid var(--border-medium, #CBD5E1)',
              backgroundColor: executed ? 'rgba(5, 150, 105, 0.08)' : 'var(--bg-card, #FFFFFF)',
              color: executed ? '#059669' : 'var(--text-main, #0F172A)',
              cursor: step2Disabled ? 'not-allowed' : 'pointer',
              opacity: step2Disabled ? 0.6 : 1,
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              transition: 'all 0.15s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '16px', fontWeight: 800 }}>
                Bước 2: Xác nhận Thực thi Phân phối
              </span>
              <Send size={18} color="#059669" />
            </div>
            <span style={{ fontSize: '14px', color: 'var(--text-muted, #64748B)' }}>
              Áp dụng phương án và gửi thông báo kết quả cho sinh viên
            </span>
          </button>

          {/* Nút 3: Chốt sổ & Khóa danh sách */}
          <button
            type="button"
            onClick={handleLockSemester}
            disabled={step3Disabled}
            style={{
              padding: '14px 16px',
              borderRadius: 12,
              border: isSemesterLocked ? '2px solid #D97706' : '1px solid var(--border-medium, #CBD5E1)',
              backgroundColor: isSemesterLocked ? 'rgba(217, 119, 6, 0.08)' : 'var(--bg-card, #FFFFFF)',
              color: isSemesterLocked ? '#D97706' : 'var(--text-main, #0F172A)',
              cursor: step3Disabled ? 'not-allowed' : 'pointer',
              opacity: step3Disabled ? 0.6 : 1,
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              transition: 'all 0.15s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '16px', fontWeight: 800 }}>
                Bước 3: Chốt sổ & Khóa danh sách toàn kỳ
              </span>
              <Lock size={18} color="#D97706" />
            </div>
            <span style={{ fontSize: '14px', color: 'var(--text-muted, #64748B)' }}>
              Khóa tự ý rời nhóm & tự động từ chối mọi đơn ứng tuyển tồn đọng
            </span>
          </button>
        </div>
      </div>

      {/* Hiển thị Bảng Phương án Phân bổ Thông minh (Từ gRPC Matching Service) khi bấm Bước 1 */}
      {planGenerated && (
        <div
          style={{
            backgroundColor: 'var(--bg-card, #FFFFFF)',
            border: '2px solid #0054A6',
            borderRadius: '20px',
            padding: '22px',
            marginBottom: '1.75rem',
            boxShadow: '0 4px 16px rgba(0, 84, 166, 0.08)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <div style={{ width: 34, height: 34, borderRadius: 12, backgroundColor: '#0054A6', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sparkles size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0054A6', margin: 0 }}>
                Phương án Phân bổ Thông minh (Được đề xuất từ gRPC Matching Service)
              </h3>
              <span style={{ fontSize: '15px', color: 'var(--text-muted, #64748B)' }}>
                Thuật toán tối ưu hóa đa mục tiêu: Cân bằng 5 kỹ năng + Đa dạng chuyên ngành + Bảo toàn Trưởng nhóm hiện hữu
              </span>
            </div>
          </div>

          {/* NHÓM ƯU TIÊN 1 */}
          {previewPlan.priority1.length === 0 && previewPlan.priority2.length === 0 && (
            <div style={{ fontSize: '15px', color: 'var(--text-muted, #64748B)' }}>Không có sinh viên nào cần phân bổ.</div>
          )}
          {previewPlan.priority1.length > 0 && (
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: '14px', fontWeight: 800, backgroundColor: 'rgba(0, 84, 166, 0.12)', color: '#0054A6' }}>
                ƯU TIÊN 1
              </span>
              <strong style={{ fontSize: '16px', color: 'var(--text-main, #0F172A)' }}>
                Lấp đầy các phòng đang thiếu người từ 1–4/5 thành viên trước:
              </strong>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {previewPlan.priority1.map((p, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '12px 16px',
                    borderRadius: 12,
                    backgroundColor: 'var(--bg-subtle, #F8FAFC)',
                    border: '1px solid var(--border-light, #E2E8F0)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: 28, height: 28, borderRadius: 999, backgroundColor: '#0054A6', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '14px' }}>
                      {idx + 1}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-main, #0F172A)' }}>
                        {p.student.name} ({p.student.studentCode} • {p.student.major})
                      </div>
                      <div style={{ fontSize: '14px', color: 'var(--text-muted, #64748B)' }}>
                        {p.reason}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <ArrowRight size={16} color="var(--text-light, #94A3B8)" />
                    <span style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 800, fontSize: '15px', color: '#0054A6', backgroundColor: '#EFF6FF', padding: '3px 8px', borderRadius: 6, border: '1px solid #BFDBFE' }}>
                      {p.targetRoom}
                    </span>
                    <span style={{ fontSize: '13px', color: '#059669', fontWeight: 600, backgroundColor: 'rgba(5, 150, 105, 0.1)', padding: '3px 8px', borderRadius: 6 }}>
                      {p.existingLeader}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          )}

          {/* NHÓM ƯU TIÊN 2 */}
          {previewPlan.priority2.length > 0 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: '14px', fontWeight: 800, backgroundColor: 'rgba(242, 112, 36, 0.12)', color: 'var(--accent-color, #F26F21)' }}>
                ƯU TIÊN 2
              </span>
              <strong style={{ fontSize: '16px', color: 'var(--text-main, #0F172A)' }}>
                Tạo nhóm mới từ các phòng trống cho số sinh viên lẻ còn dư:
              </strong>
            </div>

            {previewPlan.priority2.map((group) => (
            <div
              key={group.targetRoom}
              style={{
                padding: '16px',
                borderRadius: 12,
                backgroundColor: 'rgba(242, 112, 36, 0.05)',
                border: '1px solid rgba(242, 112, 36, 0.25)',
                marginBottom: '10px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700, fontSize: '14px', color: '#334155', backgroundColor: '#FFFFFF', padding: '3px 9px', borderRadius: 6, border: '1px solid #E2E8F0' }}>
                    {group.targetRoom}
                  </span>
                  <span style={{ fontSize: '15px', fontWeight: 650, color: '#0F172A' }}>
                    Nhóm khởi nghiệp mới ({group.students.length} thành viên)
                  </span>
                </div>
                {group.newLeader && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', padding: '4px 10px', borderRadius: 8 }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                    Trưởng nhóm đề xuất (Quản lý: {group.newLeader.management}/100): <strong style={{ color: '#0F172A' }}>{group.newLeader.name}</strong> ({group.newLeader.studentCode})
                  </span>
                </div>
                )}
              </div>

              <p style={{ fontSize: '14px', color: 'var(--text-muted, #64748B)', margin: '0 0 12px 0' }}>
                {group.reason}
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px' }}>
                {group.students.map((st) => (
                  <div
                    key={st.studentCode}
                    style={{
                      padding: '8px 10px',
                      borderRadius: 10,
                      backgroundColor: 'var(--bg-card, #FFFFFF)',
                      border: '1px solid var(--border-light, #E2E8F0)',
                      fontSize: '14px',
                    }}
                  >
                    <div style={{ fontWeight: 650, color: 'var(--text-main, #0F172A)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>{st.name}</span>
                      {st.isLeader && (
                        <span style={{ fontSize: '11px', fontWeight: 600, padding: '1px 6px', borderRadius: 5, backgroundColor: '#F1F5F9', border: '1px solid #E2E8F0', color: '#334155' }}>
                          Trưởng nhóm
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted, #64748B)' }}>
                      {st.studentCode} • {st.major}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            ))}
          </div>
          )}
        </div>
      )}

      {/* 2-Column Split: Sinh viên lẻ vs Phòng thiếu */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(460px, 100%), 1fr))', gap: '1.5rem' }}>
        {/* CỘT TRÁI: Sinh viên chưa có nhóm */}
        <div
          style={{
            backgroundColor: 'var(--bg-card, #FFFFFF)',
            border: '1px solid var(--border-light, #E2E8F0)',
            borderRadius: '20px',
            padding: '26px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(239, 68, 68, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#EF4444' }}>
                <Users size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-main, #0F172A)', margin: 0 }}>
                  Sinh viên Chưa có Nhóm ({unassignedList.length} bạn)
                </h3>
                <span style={{ fontSize: '14px', color: 'var(--text-muted, #64748B)' }}>
                  Hết hạn đăng ký nhưng chưa tham gia phòng nào
                </span>
              </div>
            </div>

            <span
              style={{
                padding: '3px 10px',
                borderRadius: 999,
                fontSize: '14px',
                fontWeight: 700,
                backgroundColor: unassignedList.length === 0 ? 'rgba(5, 150, 105, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                color: unassignedList.length === 0 ? '#059669' : '#EF4444',
              }}
            >
              {unassignedList.length === 0 ? 'Đã ghép 100%' : `${unassignedList.length} sinh viên chờ`}
            </span>
          </div>

          {unassignedList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px 20px', color: '#059669' }}>
              <CheckCircle2 size={40} style={{ margin: '0 auto 10px auto' }} />
              <div style={{ fontWeight: 800, fontSize: '17px' }}>Tất cả sinh viên đã được ghép nhóm thành công!</div>
              <p style={{ fontSize: '15px', color: 'var(--text-muted, #64748B)', margin: '4px 0 0 0' }}>
                Không còn sinh viên nào bị lẻ trong học kỳ này.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '520px', overflowY: 'auto' }}>
              {unassignedList.map((st) => (
                <div
                  key={st.id}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 12,
                    backgroundColor: 'var(--bg-subtle, #F8FAFC)',
                    border: '1px solid var(--border-light, #E2E8F0)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <div>
                      <span style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-main, #0F172A)' }}>
                        {st.name}
                      </span>
                      <span style={{ marginLeft: '6px', fontFamily: 'var(--font-mono, monospace)', fontSize: '14px', color: '#475569' }}>
                        {st.studentCode}
                      </span>
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted, #64748B)', backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', padding: '2px 8px', borderRadius: 4 }}>
                      Khóa {st.classCode}
                    </span>
                  </div>

                  <div style={{ fontSize: '14px', color: 'var(--text-secondary, #475569)', marginBottom: '8px' }}>
                    {st.major}
                  </div>

                  {/* 5 Skills Badges */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', fontVariantNumeric: 'tabular-nums' }}>
                    <span style={{ fontSize: '12.5px', padding: '2px 7px', borderRadius: 5, backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', color: '#334155', fontWeight: 600 }}>
                      Tech: <strong style={{ color: '#0F172A' }}>{st.skills.tech}</strong>
                    </span>
                    <span style={{ fontSize: '12.5px', padding: '2px 7px', borderRadius: 5, backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', color: '#334155', fontWeight: 600 }}>
                      Mgt: <strong style={{ color: '#0F172A' }}>{st.skills.management}</strong>
                    </span>
                    <span style={{ fontSize: '12.5px', padding: '2px 7px', borderRadius: 5, backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', color: '#334155', fontWeight: 600 }}>
                      GD: <strong style={{ color: '#0F172A' }}>{st.skills.graphicDesign}</strong>
                    </span>
                    <span style={{ fontSize: '12.5px', padding: '2px 7px', borderRadius: 5, backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', color: '#334155', fontWeight: 600 }}>
                      MKT: <strong style={{ color: '#0F172A' }}>{st.skills.marketing}</strong>
                    </span>
                    <span style={{ fontSize: '12.5px', padding: '2px 7px', borderRadius: 5, backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', color: '#334155', fontWeight: 600 }}>
                      Sale: <strong style={{ color: '#0F172A' }}>{st.skills.sale}</strong>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CỘT PHẢI: Phòng chưa đủ sĩ số & Phòng trống */}
        <div
          style={{
            backgroundColor: 'var(--bg-card, #FFFFFF)',
            border: '1px solid var(--border-light, #E2E8F0)',
            borderRadius: '20px',
            padding: '26px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: '#F1F5F9', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0F172A' }}>
                <Layers size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-main, #0F172A)', margin: 0 }}>
                  Hiện trạng Các Phòng Trong Môn ({roomsList.length} phòng)
                </h3>
                <span style={{ fontSize: '14px', color: 'var(--text-muted, #64748B)' }}>
                  Phòng chưa đủ sĩ số (1-4/5) và các phòng trống (0/5)
                </span>
              </div>
            </div>

            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-muted, #64748B)' }}>
              Cần điều phối
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '520px', overflowY: 'auto' }}>
            {roomsList.map((room) => (
              <div
                key={room.id}
                style={{
                  padding: '12px 14px',
                  borderRadius: 12,
                  backgroundColor: 'var(--bg-subtle, #F8FAFC)',
                  border: '1px solid var(--border-light, #E2E8F0)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '8px',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700, fontSize: '15px', color: '#0F172A' }}>
                      {room.code}
                    </span>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: 999,
                        fontSize: '13px',
                        fontWeight: 600,
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        color: room.currentCount === 0 ? '#64748B' : '#0F172A',
                      }}
                    >
                      {room.currentCount}/{room.maxCount} thành viên
                    </span>
                  </div>

                  <div style={{ fontSize: '14px', color: 'var(--text-muted, #64748B)' }}>
                    Trưởng nhóm: <strong style={{ color: 'var(--text-main, #0F172A)' }}>{room.leaderName}</strong>
                  </div>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {room.neededSkills.map((sk, idx) => (
                    <span
                      key={idx}
                      style={{
                        fontSize: '12.5px',
                        padding: '2px 8px',
                        borderRadius: 999,
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        color: '#334155',
                        fontWeight: 600,
                      }}
                    >
                      {sk}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
export default ModeratorDistributionPage;