import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { gsap } from 'gsap';
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
  ShieldCheck,
  Check,
  X,
  Search,
  Clock,
  DoorOpen,  Info,
  RotateCcw,
} from '../../utils/icons';
import { useSelectedSpace, reloadSpaces } from '../../hooks/useSelectedSpace';
import { workspaceApi, errorMessage, type DistributePreview, type UnmatchedSummary } from '../../api/workspace';
import { StateBox } from '../../components/workspace/ui';

// ── TOAST THÔNG BÁO NỔI GÓC PHẢI TRÊN (GSAP SPRING ANIMATION) ─────────────────

interface ToastState {
  id: number;
  type: 'success' | 'error' | 'info';
  message: string;
}

const FloatingToast: React.FC<{
  toast: ToastState | null;
  onClose: () => void;
}> = ({ toast, onClose }) => {
  const toastRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!toast || !toastRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        toastRef.current,
        { opacity: 0, y: -20, scale: 0.92 },
        { opacity: 1, y: 0, scale: 1, duration: 0.25, ease: 'back.out(1.5)' }
      );
    });
    return () => ctx.revert();
  }, [toast]);

  if (!toast) return null;

  const isSuccess = toast.type === 'success';
  const isError = toast.type === 'error';

  return createPortal(
    <div
      ref={toastRef}
      style={{
        position: 'fixed',
        top: 20,
        right: 16,
        zIndex: 10000,
        maxWidth: 'min(520px, calc(100vw - 32px))',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 18px',
        borderRadius: 14,
        backgroundColor: isSuccess ? '#059669' : isError ? '#DC2626' : '#334155',
        color: '#FFFFFF',
        boxShadow: isSuccess
          ? '0 10px 30px rgba(5, 150, 105, 0.32)'
          : isError
          ? '0 10px 30px rgba(220, 38, 38, 0.32)'
          : '0 10px 30px rgba(15, 23, 42, 0.32)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        fontSize: '14px',
        fontWeight: 600,
        lineHeight: 1.4,
      }}
    >
      <div style={{ flexShrink: 0 }}>
        {isSuccess ? <CheckCircle2 size={20} /> : isError ? <AlertCircle size={20} /> : <Info size={20} />}
      </div>
      <div style={{ flex: 1 }}>{toast.message}</div>
      <button
        type="button"
        onClick={onClose}
        style={{
          background: 'transparent',
          border: 'none',
          color: '#FFFFFF',
          padding: '2px',
          cursor: 'pointer',
          borderRadius: 6,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: 0.8,
          flexShrink: 0,
        }}
        aria-label="Đóng thông báo"
      >
        <X size={16} />
      </button>
    </div>,
    document.body
  );
};

// ── DIALOG HOẠT HỌA GSAP DÙNG CHUNG CHO CÁC HÀNH ĐỘNG XÁC NHẬN ────────────────

const AnimatedDialog: React.FC<{
  children: React.ReactNode;
  maxWidth?: number;
  onClose: () => void;
  disabled?: boolean;
}> = ({ children, maxWidth = 480, onClose, disabled }) => {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !disabled) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    let ctx: gsap.Context | null = null;
    if (ref.current && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      ctx = gsap.context(() => {
        gsap.fromTo(
          ref.current,
          { opacity: 0, scale: 0.96, y: 8 },
          { opacity: 1, scale: 1, y: 0, duration: 0.22, ease: 'power2.out', clearProps: 'transform,opacity' }
        );
      });
    }
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      if (ctx) ctx.revert();
    };
  }, [disabled, onClose]);

  return createPortal(
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
        padding: '1rem',
        backdropFilter: 'blur(3px)',
      }}
      onClick={() => !disabled && onClose()}
    >
      <div
        ref={ref}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth,
          maxHeight: '90vh',
          overflowY: 'auto',
          backgroundColor: 'var(--bg-card, #FFFFFF)',
          borderRadius: 20,
          border: '1px solid var(--border-light, #E2E8F0)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        }}
      >
        {children}
      </div>
    </div>,
    document.body
  );
};

// ── DATA INTERFACES ───────────────────────────────────────────────────────────

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

// ── COMPONENT CHÍNH: MODERATOR DISTRIBUTION PAGE ──────────────────────────────

export const ModeratorDistributionPage: React.FC = () => {
  const { space, loading: spacesLoading, error: spacesError } = useSelectedSpace();
  const [summary, setSummary] = useState<UnmatchedSummary | null>(null);
  const [preview, setPreview] = useState<DistributePreview | null>(null);

  // States
  const planGenerated = !!preview;
  const [executed, setExecuted] = useState<boolean>(false);
  const isSemesterLocked = space?.status === 'Locked';
  const canDistribute = space?.status === 'ClosedRegistration';
  const [busy, setBusy] = useState(false);

  // Filter States for 2-Column Board
  const [studentSearch, setStudentSearch] = useState('');
  const [studentMajorFilter, setStudentMajorFilter] = useState('ALL');
  const [roomFilterTab, setRoomFilterTab] = useState<'ALL' | 'INCOMPLETE' | 'EMPTY'>('ALL');
  const [roomSearch, setRoomSearch] = useState('');

  // Confirmation Modals State
  const [confirmRunOpen, setConfirmRunOpen] = useState(false);
  const [confirmDistributeOpen, setConfirmDistributeOpen] = useState(false);
  const [confirmCloseRegOpen, setConfirmCloseRegOpen] = useState(false);
  const [confirmFinalizeOpen, setConfirmFinalizeOpen] = useState(false);

  // Notification Toast State
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastTimeoutRef = useRef<number | null>(null);

  const showToast = useCallback((type: 'success' | 'error' | 'info', message: string, ms = 4500) => {
    if (toastTimeoutRef.current) window.clearTimeout(toastTimeoutRef.current);
    setToast({ id: Date.now(), type, message });
    toastTimeoutRef.current = window.setTimeout(() => {
      setToast(null);
    }, ms);
  }, []);

  const spaceId = space?.id;
  const loadSummary = useCallback(async () => {
    if (!spaceId) return;
    try {
      setSummary(await workspaceApi.getUnmatchedSummary(spaceId));
    } catch (err) {
      showToast('error', errorMessage(err, 'Không tải được danh sách sinh viên lẻ.'));
    }
  }, [spaceId, showToast]);

  useEffect(() => {
    setSummary(null);
    setPreview(null);
    setExecuted(false);
    void loadSummary();
  }, [loadSummary]);

  // Cập nhật sinh viên lẻ theo thời gian thực khi có người vào/rời phòng
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

  // Dữ liệu sinh viên lẻ
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

  // Danh sách các chuyên ngành xuất hiện trong sinh viên lẻ
  const availableMajors = useMemo(() => {
    const majors = new Set<string>();
    unassignedList.forEach((s) => {
      if (s.major) majors.add(s.major);
    });
    return Array.from(majors).sort();
  }, [unassignedList]);

  // Lọc sinh viên lẻ theo ô tìm kiếm và chuyên ngành
  const filteredStudents = useMemo(() => {
    return unassignedList.filter((s) => {
      const matchSearch =
        !studentSearch.trim() ||
        s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
        s.studentCode.toLowerCase().includes(studentSearch.toLowerCase());
      const matchMajor = studentMajorFilter === 'ALL' || s.major === studentMajorFilter;
      return matchSearch && matchMajor;
    });
  }, [unassignedList, studentSearch, studentMajorFilter]);

  // Danh sách phòng cần lấp và phòng trống
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
            : [
                `Còn ${r.maxMembers - r.memberCount} chỗ`,
                ...[...new Set(r.members.map((m) => m.major).filter(Boolean) as string[])].map((m) => `Có ${m}`),
              ],
      })),
    [summary]
  );

  // Lọc danh sách phòng theo tab và ô tìm kiếm
  const filteredRooms = useMemo(() => {
    return roomsList.filter((r) => {
      const matchTab =
        roomFilterTab === 'ALL' ||
        (roomFilterTab === 'INCOMPLETE' && r.status === 'Incomplete') ||
        (roomFilterTab === 'EMPTY' && r.status === 'Empty');
      const matchSearch =
        !roomSearch.trim() ||
        r.code.toLowerCase().includes(roomSearch.toLowerCase()) ||
        r.name.toLowerCase().includes(roomSearch.toLowerCase()) ||
        r.leaderName.toLowerCase().includes(roomSearch.toLowerCase());
      return matchTab && matchSearch;
    });
  }, [roomsList, roomFilterTab, roomSearch]);

  const incompleteCount = useMemo(() => roomsList.filter((r) => r.status === 'Incomplete').length, [roomsList]);
  const emptyCount = useMemo(() => roomsList.filter((r) => r.status === 'Empty').length, [roomsList]);

  // Phương án phân bổ đề xuất từ Matching gRPC
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
            reason: `Lấp đầy phòng từ ${p.memberCountBefore} lên ${p.memberCountAfter} thành viên; điểm cân bằng kỹ năng ${Math.round(p.balanceScore)}/100.`,
            existingLeader: `${p.leaderName || '—'} (Giữ Trưởng nhóm)`,
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
            reason: `Gom ${students.length} sinh viên còn lại vào phòng trống ${p.roomCode || p.name} tạo thành nhóm mới (điểm cân bằng ${Math.round(p.balanceScore)}/100). Sinh viên có điểm Quản lý cao nhất làm Trưởng nhóm.`,
          };
        }),
    };
  }, [preview]);

  // ── XỬ LÝ HÀNH ĐỘNG CÓ MODAL XÁC NHẬN ──────────────────────────────────────

  // Thực thi Bước 1: Gọi gRPC Matching Service
  const handleExecuteRunAlgorithm = async () => {
    if (!space) return;
    setConfirmRunOpen(false);
    setBusy(true);
    try {
      const result = await workspaceApi.previewDistribution(space.id);
      setPreview(result);
      showToast('success', `Đã kết nối gRPC Matching Service: đề xuất phân bổ ${result.totalDistributed}/${result.totalUnmatched} sinh viên.`);
    } catch (err) {
      showToast('error', errorMessage(err, 'Không thể tính toán phương án phân bổ.'));
    } finally {
      setBusy(false);
    }
  };

  // Thực thi Bước 2: Áp dụng phương án vào Database
  const handleExecuteConfirmDistribution = async () => {
    if (!space) return;
    setConfirmDistributeOpen(false);
    setBusy(true);
    try {
      const result = await workspaceApi.confirmDistribution(space.id);
      setExecuted(true);
      setPreview(null);
      showToast('success', `Đã phân phối thành công! Thêm ${result.totalDistributed} sinh viên vào ${result.updatedRoomsCount} phòng và gửi thông báo kết quả.`);
      await loadSummary();
    } catch (err) {
      showToast('error', errorMessage(err, 'Không thể thực thi phân phối vào cơ sở dữ liệu.'));
    } finally {
      setBusy(false);
    }
  };

  // Thực thi Đóng cổng đăng ký tự do
  const handleExecuteCloseRegistration = async () => {
    if (!space) return;
    setConfirmCloseRegOpen(false);
    setBusy(true);
    try {
      await workspaceApi.closeRegistration(space.id);
      showToast('success', 'Đã đóng cổng đăng ký tự do. Học kỳ sẵn sàng cho bước điều phối sinh viên lẻ.');
      reloadSpaces();
      await loadSummary();
    } catch (err) {
      showToast('error', errorMessage(err, 'Không thể đóng cổng đăng ký.'));
    } finally {
      setBusy(false);
    }
  };

  // Thực thi Bước 3: Chốt sổ Học kỳ vĩnh viễn
  const handleExecuteLockSemester = async () => {
    if (!space) return;
    setConfirmFinalizeOpen(false);
    setBusy(true);
    try {
      const result = await workspaceApi.finalizeSpace(space.id);
      showToast('success', `Đã chốt sổ và khóa ${result.lockedRoomsCount} nhóm! ${result.rejectedRequestsCount} đơn chờ đã tự động bị hủy.`);
      reloadSpaces();
      await loadSummary();
    } catch (err) {
      showToast('error', errorMessage(err, 'Không thể chốt sổ học kỳ.'));
    } finally {
      setBusy(false);
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
  const step3Disabled = stepsDisabled || unassignedList.length > 0;

  return (
    <div style={{ padding: '0 0 3rem 0', maxWidth: 1560, margin: '0 auto' }}>
      {/* Toast thông báo góc phải trên */}
      <FloatingToast toast={toast} onClose={() => setToast(null)} />

      {/* ── MODALS XÁC NHẬN ── */}

      {/* 1. Modal Xác nhận Chạy Matching gRPC */}
      {confirmRunOpen && (
        <AnimatedDialog maxWidth={460} onClose={() => setConfirmRunOpen(false)} disabled={busy}>
          <div style={{ padding: '1.75rem 1.5rem', textAlign: 'center' }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: 'var(--bg-subtle, #F8FAFC)',
                border: '1px solid var(--border-light, #E2E8F0)',
                color: 'var(--text-secondary, #334155)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.15rem auto',
              }}
            >
              <Cpu size={26} strokeWidth={2} />
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main, #0F172A)', margin: '0 0 0.5rem 0' }}>
              Chạy thuật toán Ghép nhóm gRPC?
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted, #64748B)', margin: '0 0 1rem 0', lineHeight: 1.5 }}>
              Hệ thống sẽ kết nối đến <strong>Matching Service</strong> để tính toán phương án phân bổ tối ưu cho{' '}
              <strong style={{ color: 'var(--text-main, #0F172A)', fontFamily: 'var(--font-mono, monospace)' }}>
                {unassignedList.length} sinh viên lẻ
              </strong>{' '}
              vào các phòng chưa đủ sĩ số và phòng trống.
            </p>
            <div
              style={{
                backgroundColor: 'var(--bg-subtle, #F8FAFC)',
                border: '1px solid var(--border-light, #E2E8F0)',
                borderRadius: 10,
                padding: '10px 14px',
                fontSize: '13px',
                color: 'var(--text-secondary, #334155)',
                textAlign: 'left',
                marginBottom: '1.25rem',
                lineHeight: 1.45,
              }}
            >
              <div>• <strong>Ưu tiên 1</strong>: Bù đắp kỹ năng còn thiếu cho phòng từ 1–4 SV.</div>
              <div style={{ marginTop: 4 }}>• <strong>Ưu tiên 2</strong>: Gom SV lẻ còn lại lập nhóm mới tại phòng trống.</div>
              <div style={{ marginTop: 4 }}>• <strong>Đề cử Leader</strong>: Sinh viên có điểm Quản lý (Management) cao nhất.</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setConfirmRunOpen(false)}
                disabled={busy}
                style={{
                  flex: 1,
                  padding: '0.65rem 1rem',
                  borderRadius: 10,
                  border: '1px solid var(--border-light, #E2E8F0)',
                  background: 'transparent',
                  color: 'var(--text-muted, #64748B)',
                  fontWeight: 650,
                  cursor: 'pointer',
                }}
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleExecuteRunAlgorithm}
                disabled={busy}
                style={{
                  flex: 1,
                  padding: '0.65rem 1rem',
                  borderRadius: 10,
                  border: 'none',
                  background: 'var(--accent-gradient, var(--accent-color, #F26F21))',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  cursor: busy ? 'wait' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                {busy ? <RotateCcw className="spin" size={16} /> : <Cpu size={16} />}
                <span>{busy ? 'Đang tính toán...' : 'Bắt đầu tính toán'}</span>
              </button>
            </div>
          </div>
        </AnimatedDialog>
      )}

      {/* 2. Modal Xác nhận Phân phối vào Database */}
      {confirmDistributeOpen && (
        <AnimatedDialog maxWidth={460} onClose={() => setConfirmDistributeOpen(false)} disabled={busy}>
          <div style={{ padding: '1.75rem 1.5rem', textAlign: 'center' }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: 'var(--bg-subtle, #F8FAFC)',
                border: '1px solid var(--border-light, #E2E8F0)',
                color: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.15rem auto',
              }}
            >
              <CheckCircle2 size={26} strokeWidth={2} />
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main, #0F172A)', margin: '0 0 0.5rem 0' }}>
              Xác nhận Thực thi Phân phối?
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted, #64748B)', margin: '0 0 1rem 0', lineHeight: 1.5 }}>
              Bạn có chắc chắn muốn áp dụng phương án phân bổ{' '}
              <strong style={{ color: 'var(--text-main, #0F172A)', fontFamily: 'var(--font-mono, monospace)' }}>
                {preview?.totalDistributed} sinh viên lẻ
              </strong>{' '}
              vào{' '}
              <strong style={{ color: 'var(--text-main, #0F172A)', fontFamily: 'var(--font-mono, monospace)' }}>
                {preview?.roomPlans.length} phòng học phần
              </strong>{' '}
              trên Database không?
            </p>
            <div
              style={{
                backgroundColor: 'var(--bg-subtle, #F8FAFC)',
                border: '1px solid var(--border-light, #E2E8F0)',
                borderRadius: 10,
                padding: '10px 14px',
                fontSize: '13px',
                color: 'var(--text-secondary, #334155)',
                textAlign: 'left',
                marginBottom: '1.25rem',
                lineHeight: 1.45,
              }}
            >
              <strong style={{ color: 'var(--text-main, #0F172A)' }}>Lưu ý quan trọng:</strong> Sau khi xác nhận, sinh viên sẽ chính thức được ghi danh vào nhóm và nhận thông báo kết quả.
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setConfirmDistributeOpen(false)}
                disabled={busy}
                style={{
                  flex: 1,
                  padding: '0.65rem 1rem',
                  borderRadius: 10,
                  border: '1px solid var(--border-light, #E2E8F0)',
                  background: 'transparent',
                  color: 'var(--text-muted, #64748B)',
                  fontWeight: 650,
                  cursor: 'pointer',
                }}
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleExecuteConfirmDistribution}
                disabled={busy}
                style={{
                  flex: 1,
                  padding: '0.65rem 1rem',
                  borderRadius: 10,
                  border: 'none',
                  background: '#059669',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  cursor: busy ? 'wait' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                {busy ? <RotateCcw className="spin" size={16} /> : <Check size={16} />}
                <span>{busy ? 'Đang phân phối...' : 'Đồng ý & Phân phối'}</span>
              </button>
            </div>
          </div>
        </AnimatedDialog>
      )}

      {/* 3. Modal Xác nhận Đóng cổng đăng ký tự do */}
      {confirmCloseRegOpen && (
        <AnimatedDialog maxWidth={460} onClose={() => setConfirmCloseRegOpen(false)} disabled={busy}>
          <div style={{ padding: '1.75rem 1.5rem', textAlign: 'center' }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: 'var(--bg-subtle, #F8FAFC)',
                border: '1px solid var(--border-light, #E2E8F0)',
                color: 'var(--text-secondary, #334155)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.15rem auto',
              }}
            >
              <Lock size={26} strokeWidth={2} />
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main, #0F172A)', margin: '0 0 0.5rem 0' }}>
              Đóng cổng đăng ký tự do?
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted, #64748B)', margin: '0 0 1rem 0', lineHeight: 1.5 }}>
              Không gian <strong style={{ color: 'var(--text-main, #0F172A)' }}>"{space.name}"</strong> sẽ chuyển sang trạng thái{' '}
              <strong style={{ color: 'var(--text-main, #0F172A)' }}>Đóng đăng ký (ClosedRegistration)</strong>.
            </p>
            <div
              style={{
                backgroundColor: 'var(--bg-subtle, #F8FAFC)',
                border: '1px solid var(--border-light, #E2E8F0)',
                borderRadius: 10,
                padding: '10px 14px',
                fontSize: '13px',
                color: 'var(--text-secondary, #334155)',
                textAlign: 'left',
                marginBottom: '1.25rem',
                lineHeight: 1.45,
              }}
            >
              Sinh viên không thể tự ý rời nhóm hoặc gửi đơn ứng tuyển mới. Điều phối viên có thể bắt đầu chạy thuật toán ghép nhóm tự động.
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setConfirmCloseRegOpen(false)}
                disabled={busy}
                style={{
                  flex: 1,
                  padding: '0.65rem 1rem',
                  borderRadius: 10,
                  border: '1px solid var(--border-light, #E2E8F0)',
                  background: 'transparent',
                  color: 'var(--text-muted, #64748B)',
                  fontWeight: 650,
                  cursor: 'pointer',
                }}
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleExecuteCloseRegistration}
                disabled={busy}
                style={{
                  flex: 1,
                  padding: '0.65rem 1rem',
                  borderRadius: 10,
                  border: 'none',
                  background: 'var(--accent-gradient, var(--accent-color, #F26F21))',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  cursor: busy ? 'wait' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                {busy ? <RotateCcw className="spin" size={16} /> : <Lock size={16} />}
                <span>{busy ? 'Đang đóng...' : 'Xác nhận Đóng cổng'}</span>
              </button>
            </div>
          </div>
        </AnimatedDialog>
      )}

      {/* 4. Modal Xác nhận Chốt sổ Toàn kỳ */}
      {confirmFinalizeOpen && (
        <AnimatedDialog maxWidth={460} onClose={() => setConfirmFinalizeOpen(false)} disabled={busy}>
          <div style={{ padding: '1.75rem 1.5rem', textAlign: 'center' }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: 'var(--bg-subtle, #F8FAFC)',
                border: '1px solid var(--border-light, #E2E8F0)',
                color: '#DC2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.15rem auto',
              }}
            >
              <ShieldCheck size={26} strokeWidth={2} />
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main, #0F172A)', margin: '0 0 0.5rem 0' }}>
              Chốt sổ & Khóa danh sách toàn kỳ?
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted, #64748B)', margin: '0 0 1rem 0', lineHeight: 1.5 }}>
              Toàn bộ nhóm học phần trong học kỳ{' '}
              <strong style={{ color: 'var(--text-main, #0F172A)' }}>
                {space.semesterCode} • {space.subjectCode}
              </strong>{' '}
              sẽ chuyển sang trạng thái <strong style={{ color: 'var(--text-main, #0F172A)' }}>Khóa chốt sổ (Locked)</strong>.
            </p>
            <div
              style={{
                backgroundColor: 'var(--bg-subtle, #F8FAFC)',
                border: '1px solid var(--border-light, #E2E8F0)',
                borderRadius: 10,
                padding: '10px 14px',
                fontSize: '13px',
                color: 'var(--text-secondary, #334155)',
                textAlign: 'left',
                marginBottom: '1.25rem',
                lineHeight: 1.45,
              }}
            >
              <strong style={{ color: 'var(--text-main, #0F172A)' }}>Lưu ý:</strong> Mọi đơn xin gia nhập tồn đọng sẽ tự động bị từ chối. Sinh viên không thể thay đổi nhóm trừ khi nộp đơn Điều chuyển (Phase 6) được Điều phối viên phê duyệt. Thao tác không thể hoàn tác.
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setConfirmFinalizeOpen(false)}
                disabled={busy}
                style={{
                  flex: 1,
                  padding: '0.65rem 1rem',
                  borderRadius: 10,
                  border: '1px solid var(--border-light, #E2E8F0)',
                  background: 'transparent',
                  color: 'var(--text-muted, #64748B)',
                  fontWeight: 650,
                  cursor: 'pointer',
                }}
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleExecuteLockSemester}
                disabled={busy}
                style={{
                  flex: 1,
                  padding: '0.65rem 1rem',
                  borderRadius: 10,
                  border: 'none',
                  background: '#DC2626',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  cursor: busy ? 'wait' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                {busy ? <RotateCcw className="spin" size={16} /> : <ShieldCheck size={16} />}
                <span>{busy ? 'Đang chốt sổ...' : 'Xác nhận Chốt sổ'}</span>
              </button>
            </div>
          </div>
        </AnimatedDialog>
      )}

      {/* Header — Enterprise Hierarchy */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 500, color: 'var(--text-muted, #64748B)', marginBottom: '6px' }}>
            <span>Điều phối & Học kỳ</span>
            <span style={{ color: 'var(--border-medium, #CBD5E1)' }}>/</span>
            <span style={{ color: 'var(--text-secondary, #334155)', fontWeight: 600 }}>Điều phối sinh viên lẻ & Chốt sổ</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 650, color: 'var(--text-main, #0F172A)', margin: 0, letterSpacing: '-0.025em', lineHeight: 1.25 }}>
              Điều phối Sinh viên lẻ & Chốt sổ Học kỳ
            </h1>
            <span
              style={{
                fontFamily: 'var(--font-mono, monospace)',
                fontSize: '12px',
                fontWeight: 700,
                padding: '3px 10px',
                borderRadius: '999px',
                background: 'var(--bg-tag, #F1F5F9)',
                color: 'var(--text-main, #0F172A)',
                border: '1px solid var(--border-light, #E2E8F0)',
              }}
            >
              {space.semesterCode} • {space.subjectCode}
            </span>
          </div>
          <p style={{ color: 'var(--text-muted, #64748B)', fontSize: '14.5px', margin: '4px 0 0 0', lineHeight: 1.5 }}>
            Tự động phân bổ sinh viên chưa có nhóm vào các phòng còn thiếu hoặc tạo nhóm mới tối ưu theo 5 chỉ số năng lực, sau đó chốt sổ học kỳ.
          </p>
        </div>

        {/* Nút Đóng cổng đăng ký (nếu trạng thái đang là Open) */}
        {space.status === 'Open' && (
          <button
            type="button"
            onClick={() => setConfirmCloseRegOpen(true)}
            disabled={busy}
            style={{
              height: 40,
              padding: '0 16px',
              borderRadius: 10,
              border: 'none',
              background: 'var(--accent-gradient, var(--accent-color, #F26F21))',
              color: '#FFFFFF',
              fontSize: '13.5px',
              fontWeight: 650,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              boxShadow: 'var(--accent-shadow, 0 2px 8px rgba(242, 111, 33, 0.22))',
            }}
            title="Đóng cổng đăng ký tự do để bắt đầu phân phối sinh viên lẻ"
          >
            <Lock size={15} />
            <span>Đóng cổng đăng ký</span>
          </button>
        )}
      </div>

      {/* Cảnh báo trạng thái nếu chưa đóng đăng ký */}
      {space.status === 'Open' && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 12,
            backgroundColor: 'var(--bg-card, #FFFFFF)',
            border: '1px solid var(--border-light, #E2E8F0)',
            color: 'var(--text-secondary, #334155)',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
            fontSize: '13.5px',
            fontWeight: 500,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: 8,
                backgroundColor: 'var(--bg-subtle, #F8FAFC)',
                border: '1px solid var(--border-light, #E2E8F0)',
                color: 'var(--text-secondary, #334155)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Clock size={15} />
            </div>
            <span>
              <strong style={{ color: 'var(--text-main, #0F172A)', fontWeight: 650 }}>Học kỳ đang mở đăng ký tự nguyện.</strong>{' '}
              Cần đóng cổng đăng ký trước khi chạy thuật toán ghép nhóm tự động.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setConfirmCloseRegOpen(true)}
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              border: '1px solid var(--border-medium, #CBD5E1)',
              background: 'var(--bg-subtle, #F8FAFC)',
              color: 'var(--text-main, #0F172A)',
              fontSize: '12.5px',
              fontWeight: 650,
              cursor: 'pointer',
            }}
          >
            Đóng cổng ngay
          </button>
        </div>
      )}

      {/* Banner Đã chốt sổ */}
      {isSemesterLocked && (
        <div
          style={{
            padding: '16px 20px',
            borderRadius: 14,
            backgroundColor: 'var(--bg-card, #FFFFFF)',
            border: '1px solid var(--border-light, #E2E8F0)',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                backgroundColor: 'var(--bg-subtle, #F8FAFC)',
                border: '1px solid var(--border-light, #E2E8F0)',
                color: 'var(--text-secondary, #334155)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <ShieldCheck size={20} />
            </div>
            <div>
              <h4 style={{ fontSize: '15px', fontWeight: 650, color: 'var(--text-main, #0F172A)', margin: 0 }}>
                Học kỳ {space.semesterCode} • {space.subjectCode} đã Chốt sổ Chính thức (Locked)
              </h4>
              <p style={{ fontSize: '13.5px', color: 'var(--text-muted, #64748B)', margin: '2px 0 0 0' }}>
                Toàn bộ nhóm học phần đã được khóa cứng. Mọi sự thay đổi thành viên sau thời điểm này đều phải qua màn hình Quản lý Chuyển nhóm (Phase 6).
              </p>
            </div>
          </div>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '5px 12px',
              borderRadius: 999,
              backgroundColor: 'var(--bg-subtle, #F8FAFC)',
              border: '1px solid var(--border-light, #E2E8F0)',
              color: 'var(--text-secondary, #334155)',
              fontWeight: 600,
              fontSize: '12.5px',
              whiteSpace: 'nowrap',
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981', flexShrink: 0 }} />
            Đã khóa sổ
          </span>
        </div>
      )}

      {/* 5 KPI Stat Cards — Minimal Enterprise Neutral Surface */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '0.85rem', marginBottom: '1.25rem' }}>
        <div
          style={{
            padding: '1rem 1.15rem',
            borderRadius: 12,
            backgroundColor: 'var(--bg-card, #FFFFFF)',
            border: '1px solid var(--border-light, #E2E8F0)',
          }}
        >
          <div style={{ fontSize: '11.5px', textTransform: 'uppercase', color: 'var(--text-muted, #64748B)', fontWeight: 650, letterSpacing: '0.04em' }}>
            Tổng SV FAP Ghi danh
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, fontFamily: 'var(--font-mono, monospace)', color: 'var(--text-main, #0F172A)', marginTop: '6px', fontVariantNumeric: 'tabular-nums' }}>
            {summary?.totalEnrolled ?? 0}
          </div>
        </div>

        <div
          style={{
            padding: '1rem 1.15rem',
            borderRadius: 12,
            backgroundColor: 'var(--bg-card, #FFFFFF)',
            border: '1px solid var(--border-light, #E2E8F0)',
          }}
        >
          <div style={{ fontSize: '11.5px', textTransform: 'uppercase', color: 'var(--text-muted, #64748B)', fontWeight: 650, letterSpacing: '0.04em' }}>
            SV Đã có nhóm
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, fontFamily: 'var(--font-mono, monospace)', color: 'var(--text-main, #0F172A)', marginTop: '6px', fontVariantNumeric: 'tabular-nums' }}>
            {summary?.totalMatched ?? 0}
          </div>
        </div>

        <div
          style={{
            padding: '1rem 1.15rem',
            borderRadius: 12,
            backgroundColor: 'var(--bg-card, #FFFFFF)',
            border: '1px solid var(--border-light, #E2E8F0)',
          }}
        >
          <div style={{ fontSize: '11.5px', textTransform: 'uppercase', color: 'var(--text-muted, #64748B)', fontWeight: 650, letterSpacing: '0.04em' }}>
            SV Chưa có nhóm (Lẻ)
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, fontFamily: 'var(--font-mono, monospace)', color: 'var(--text-main, #0F172A)', marginTop: '6px', fontVariantNumeric: 'tabular-nums' }}>
            {summary?.totalUnmatched ?? 0}
          </div>
        </div>

        <div
          style={{
            padding: '1rem 1.15rem',
            borderRadius: 12,
            backgroundColor: 'var(--bg-card, #FFFFFF)',
            border: '1px solid var(--border-light, #E2E8F0)',
          }}
        >
          <div style={{ fontSize: '11.5px', textTransform: 'uppercase', color: 'var(--text-muted, #64748B)', fontWeight: 650, letterSpacing: '0.04em' }}>
            Phòng cần lấp (1-4 SV)
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, fontFamily: 'var(--font-mono, monospace)', color: 'var(--text-main, #0F172A)', marginTop: '6px', fontVariantNumeric: 'tabular-nums' }}>
            {incompleteCount}
          </div>
        </div>

        <div
          style={{
            padding: '1rem 1.15rem',
            borderRadius: 12,
            backgroundColor: 'var(--bg-card, #FFFFFF)',
            border: '1px solid var(--border-light, #E2E8F0)',
          }}
        >
          <div style={{ fontSize: '11.5px', textTransform: 'uppercase', color: 'var(--text-muted, #64748B)', fontWeight: 650, letterSpacing: '0.04em' }}>
            Phòng trống (0 SV)
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, fontFamily: 'var(--font-mono, monospace)', color: 'var(--text-main, #0F172A)', marginTop: '6px', fontVariantNumeric: 'tabular-nums' }}>
            {emptyCount}
          </div>
        </div>
      </div>

      {/* ── QUY TRÌNH 3 BƯỚC ĐIỀU PHỐI GỌN GÀNG, ĐẲNG CẤP ── */}
      <div
        style={{
          backgroundColor: 'var(--bg-card, #FFFFFF)',
          border: '1px solid var(--border-light, #E2E8F0)',
          borderRadius: 16,
          padding: '18px 20px',
          marginBottom: '1.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 650, color: 'var(--text-main, #0F172A)', margin: 0 }}>
              Quy trình 3 Bước Điều phối Tự động & Khóa sổ
            </h3>
            <span style={{ fontSize: '12.5px', color: 'var(--text-muted, #64748B)' }}>
              Thực hiện tuần tự sau khi đóng cổng đăng ký tự do
            </span>
          </div>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 10px',
              borderRadius: 999,
              fontSize: '12px',
              fontWeight: 600,
              backgroundColor: 'var(--bg-subtle, #F8FAFC)',
              border: '1px solid var(--border-light, #E2E8F0)',
              color: 'var(--text-secondary, #334155)',
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: isSemesterLocked
                  ? '#10B981'
                  : canDistribute
                  ? 'var(--accent-color, #F26F21)'
                  : '#94A3B8',
                flexShrink: 0,
              }}
            />
            {isSemesterLocked
              ? 'Đã hoàn tất vòng đời'
              : canDistribute
              ? 'Sẵn sàng điều phối gRPC'
              : 'Chờ đóng cổng đăng ký'}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
          {/* BƯỚC 1: Chạy thuật toán Ghép nhóm Tự động */}
          <div
            style={{
              padding: '14px 16px',
              borderRadius: 12,
              border: !step1Disabled && !planGenerated ? '1px solid var(--border-medium, #CBD5E1)' : '1px solid var(--border-light, #E2E8F0)',
              backgroundColor: !step1Disabled && !planGenerated ? 'var(--bg-card, #FFFFFF)' : 'var(--bg-subtle, #F8FAFC)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: 10,
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-muted, #64748B)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Bước 1 • Tính toán
                </span>
                {planGenerated && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary, #334155)', background: 'var(--bg-card, #FFFFFF)', border: '1px solid var(--border-light, #E2E8F0)', padding: '2px 7px', borderRadius: 999 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981' }} />
                    Đã có phương án
                  </span>
                )}
              </div>
              <div style={{ fontSize: '14px', fontWeight: 650, color: 'var(--text-main, #0F172A)' }}>
                Chạy gRPC Matching Service
              </div>
              <p style={{ fontSize: '12.5px', color: 'var(--text-muted, #64748B)', margin: '3px 0 0 0', lineHeight: 1.4 }}>
                Xem trước phương án phân bổ 5 kỹ năng vào phòng thiếu và phòng trống.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setConfirmRunOpen(true)}
              disabled={step1Disabled}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 8,
                border: step1Disabled ? '1px solid var(--border-light, #E2E8F0)' : 'none',
                background: step1Disabled ? 'var(--bg-card, #FFFFFF)' : 'var(--accent-gradient, var(--accent-color, #F26F21))',
                color: step1Disabled ? 'var(--text-light, #94A3B8)' : '#FFFFFF',
                fontSize: '13px',
                fontWeight: 650,
                cursor: step1Disabled ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                boxShadow: step1Disabled ? 'none' : 'var(--accent-shadow, 0 2px 6px rgba(242, 111, 33, 0.2))',
              }}
            >
              <Cpu size={14} />
              <span>{planGenerated ? 'Tính toán lại' : 'Chạy thuật toán'}</span>
            </button>
          </div>

          {/* BƯỚC 2: Xác nhận Thực thi Phân phối */}
          <div
            style={{
              padding: '14px 16px',
              borderRadius: 12,
              border: !step2Disabled ? '1px solid var(--border-medium, #CBD5E1)' : '1px solid var(--border-light, #E2E8F0)',
              backgroundColor: !step2Disabled ? 'var(--bg-card, #FFFFFF)' : 'var(--bg-subtle, #F8FAFC)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: 10,
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-muted, #64748B)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Bước 2 • Thực thi
                </span>
                {executed && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary, #334155)', background: 'var(--bg-card, #FFFFFF)', border: '1px solid var(--border-light, #E2E8F0)', padding: '2px 7px', borderRadius: 999 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981' }} />
                    Đã thực thi
                  </span>
                )}
              </div>
              <div style={{ fontSize: '14px', fontWeight: 650, color: 'var(--text-main, #0F172A)' }}>
                Xác nhận Áp dụng Phân phối
              </div>
              <p style={{ fontSize: '12.5px', color: 'var(--text-muted, #64748B)', margin: '3px 0 0 0', lineHeight: 1.4 }}>
                Ghi danh chính thức vào Database và gửi thông báo cho sinh viên.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setConfirmDistributeOpen(true)}
              disabled={step2Disabled}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 8,
                border: step2Disabled ? '1px solid var(--border-light, #E2E8F0)' : 'none',
                background: step2Disabled ? 'var(--bg-card, #FFFFFF)' : 'var(--accent-gradient, var(--accent-color, #F26F21))',
                color: step2Disabled ? 'var(--text-light, #94A3B8)' : '#FFFFFF',
                fontSize: '13px',
                fontWeight: 650,
                cursor: step2Disabled ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                boxShadow: step2Disabled ? 'none' : 'var(--accent-shadow, 0 2px 6px rgba(242, 111, 33, 0.2))',
              }}
            >
              <Send size={14} />
              <span>Xác nhận Phân phối</span>
            </button>
          </div>

          {/* BƯỚC 3: Chốt sổ & Khóa toàn kỳ */}
          <div
            style={{
              padding: '14px 16px',
              borderRadius: 12,
              border: !step3Disabled ? '1px solid var(--border-medium, #CBD5E1)' : '1px solid var(--border-light, #E2E8F0)',
              backgroundColor: !step3Disabled ? 'var(--bg-card, #FFFFFF)' : 'var(--bg-subtle, #F8FAFC)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: 10,
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-muted, #64748B)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Bước 3 • Khóa cứng
                </span>
                {isSemesterLocked && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary, #334155)', background: 'var(--bg-card, #FFFFFF)', border: '1px solid var(--border-light, #E2E8F0)', padding: '2px 7px', borderRadius: 999 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981' }} />
                    Đã khóa sổ
                  </span>
                )}
              </div>
              <div style={{ fontSize: '14px', fontWeight: 650, color: 'var(--text-main, #0F172A)' }}>
                Chốt sổ & Khóa danh sách kỳ
              </div>
              <p style={{ fontSize: '12.5px', color: 'var(--text-muted, #64748B)', margin: '3px 0 0 0', lineHeight: 1.4 }}>
                Khóa tự ý rời nhóm, từ chối đơn chờ và chốt dữ liệu báo cáo.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setConfirmFinalizeOpen(true)}
              disabled={step3Disabled}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 8,
                border: step3Disabled ? '1px solid var(--border-light, #E2E8F0)' : '1px solid var(--border-medium, #CBD5E1)',
                background: step3Disabled ? 'var(--bg-card, #FFFFFF)' : 'var(--text-main, #0F172A)',
                color: step3Disabled ? 'var(--text-light, #94A3B8)' : 'var(--bg-card, #FFFFFF)',
                fontSize: '13px',
                fontWeight: 650,
                cursor: step3Disabled ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
              title={
                unassignedList.length > 0
                  ? `Còn ${unassignedList.length} sinh viên lẻ chưa ghép nhóm. Vui lòng chạy phân phối trước khi chốt sổ.`
                  : 'Khóa cứng các phòng và chốt sổ toàn bộ'
              }
            >
              <ShieldCheck size={14} />
              <span>Chốt sổ Học kỳ</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── BẢNG PHƯƠNG ÁN PHÂN BỔ ĐỀ XUẤT (KHI CÓ KẾT QUẢ PREVIEW) ── */}
      {planGenerated && (
        <div
          style={{
            backgroundColor: 'var(--bg-card, #FFFFFF)',
            border: '1px solid var(--border-medium, #CBD5E1)',
            borderRadius: 16,
            padding: '20px',
            marginBottom: '1.5rem',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  backgroundColor: 'var(--bg-subtle, #F8FAFC)',
                  border: '1px solid var(--border-light, #E2E8F0)',
                  color: 'var(--text-secondary, #334155)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Sparkles size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: '15.5px', fontWeight: 650, color: 'var(--text-main, #0F172A)', margin: 0 }}>
                  Phương án Phân bổ Thông minh (Đề xuất từ gRPC Matching Service)
                </h3>
                <span style={{ fontSize: '13px', color: 'var(--text-muted, #64748B)' }}>
                  Phân bổ{' '}
                  <strong style={{ color: 'var(--text-main, #0F172A)', fontFamily: 'var(--font-mono, monospace)' }}>
                    {preview?.totalDistributed} / {preview?.totalUnmatched} sinh viên lẻ
                  </strong>{' '}
                  vào{' '}
                  <strong style={{ color: 'var(--text-main, #0F172A)', fontFamily: 'var(--font-mono, monospace)' }}>
                    {preview?.roomPlans.length} phòng
                  </strong>{' '}
                  (Còn lại: {preview?.totalRemaining} SV)
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setConfirmDistributeOpen(true)}
              disabled={busy}
              style={{
                height: 36,
                padding: '0 16px',
                borderRadius: 8,
                border: 'none',
                background: 'var(--accent-gradient, var(--accent-color, #F26F21))',
                color: '#FFFFFF',
                fontSize: '13px',
                fontWeight: 650,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: 'var(--accent-shadow, 0 2px 6px rgba(242, 111, 33, 0.2))',
              }}
            >
              <CheckCircle2 size={15} />
              <span>Xác nhận Áp dụng Phương án</span>
            </button>
          </div>

          {/* Nhóm Ưu tiên 1 */}
          {previewPlan.priority1.length > 0 && (
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ padding: '2px 8px', borderRadius: 999, fontSize: '11px', fontWeight: 700, backgroundColor: 'var(--bg-tag, #F1F5F9)', border: '1px solid var(--border-light, #E2E8F0)', color: 'var(--text-secondary, #334155)' }}>
                  ƯU TIÊN 1
                </span>
                <strong style={{ fontSize: '14px', color: 'var(--text-main, #0F172A)' }}>
                  Lấp đầy các phòng đang thiếu người từ 1–4/5 thành viên trước:
                </strong>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {previewPlan.priority1.map((p, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '10px 14px',
                      borderRadius: 10,
                      backgroundColor: 'var(--bg-subtle, #F8FAFC)',
                      border: '1px solid var(--border-light, #E2E8F0)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '10px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 999,
                          backgroundColor: 'var(--bg-card, #FFFFFF)',
                          border: '1px solid var(--border-light, #E2E8F0)',
                          color: 'var(--text-secondary, #334155)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '12px',
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {idx + 1}
                      </div>
                      <div>
                        <div style={{ fontWeight: 650, fontSize: '14px', color: 'var(--text-main, #0F172A)' }}>
                          {p.student.name} ({p.student.studentCode} • {p.student.major})
                        </div>
                        <div style={{ fontSize: '12.5px', color: 'var(--text-muted, #64748B)' }}>{p.reason}</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <ArrowRight size={14} color="var(--text-light, #94A3B8)" />
                      <span
                        style={{
                          fontFamily: 'var(--font-mono, monospace)',
                          fontWeight: 700,
                          fontSize: '13.5px',
                          color: 'var(--text-main, #0F172A)',
                          backgroundColor: 'var(--bg-card, #FFFFFF)',
                          padding: '2px 8px',
                          borderRadius: 6,
                          border: '1px solid var(--border-light, #E2E8F0)',
                        }}
                      >
                        {p.targetRoom}
                      </span>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary, #334155)', fontWeight: 600, backgroundColor: 'var(--bg-card, #FFFFFF)', border: '1px solid var(--border-light, #E2E8F0)', padding: '2px 8px', borderRadius: 6 }}>
                        {p.existingLeader}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Nhóm Ưu tiên 2 */}
          {previewPlan.priority2.length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ padding: '2px 8px', borderRadius: 999, fontSize: '11px', fontWeight: 700, backgroundColor: 'var(--bg-tag, #F1F5F9)', border: '1px solid var(--border-light, #E2E8F0)', color: 'var(--text-secondary, #334155)' }}>
                  ƯU TIÊN 2
                </span>
                <strong style={{ fontSize: '14px', color: 'var(--text-main, #0F172A)' }}>
                  Tạo nhóm mới từ các phòng trống cho số sinh viên lẻ còn dư:
                </strong>
              </div>

              {previewPlan.priority2.map((group) => (
                <div
                  key={group.targetRoom}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 10,
                    backgroundColor: 'var(--bg-subtle, #F8FAFC)',
                    border: '1px solid var(--border-light, #E2E8F0)',
                    marginBottom: '8px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          fontFamily: 'var(--font-mono, monospace)',
                          fontWeight: 700,
                          fontSize: '13.5px',
                          color: 'var(--text-main, #0F172A)',
                          backgroundColor: 'var(--bg-card, #FFFFFF)',
                          padding: '2px 8px',
                          borderRadius: 6,
                          border: '1px solid var(--border-light, #E2E8F0)',
                        }}
                      >
                        {group.targetRoom}
                      </span>
                      <span style={{ fontSize: '13.5px', fontWeight: 650, color: 'var(--text-main, #0F172A)' }}>
                        Nhóm mới thành lập ({group.students.length} thành viên)
                      </span>
                    </div>
                    {group.newLeader && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'var(--bg-card, #FFFFFF)', border: '1px solid var(--border-light, #E2E8F0)', padding: '3px 8px', borderRadius: 6 }}>
                        <ShieldCheck size={13} style={{ color: 'var(--text-secondary, #334155)' }} />
                        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary, #334155)' }}>
                          Trưởng nhóm đề cử (Quản lý: {group.newLeader.management}/100): <strong style={{ color: 'var(--text-main, #0F172A)' }}>{group.newLeader.name}</strong>
                        </span>
                      </div>
                    )}
                  </div>

                  <p style={{ fontSize: '12.5px', color: 'var(--text-muted, #64748B)', margin: '0 0 8px 0' }}>
                    {group.reason}
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '6px' }}>
                    {group.students.map((st) => (
                      <div
                        key={st.studentCode}
                        style={{
                          padding: '6px 8px',
                          borderRadius: 8,
                          backgroundColor: 'var(--bg-card, #FFFFFF)',
                          border: '1px solid var(--border-light, #E2E8F0)',
                          fontSize: '12.5px',
                        }}
                      >
                        <div style={{ fontWeight: 650, color: 'var(--text-main, #0F172A)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>{st.name}</span>
                          {st.isLeader && (
                            <span style={{ fontSize: '11px', fontWeight: 600, padding: '1px 6px', borderRadius: 4, backgroundColor: 'var(--bg-subtle, #F8FAFC)', border: '1px solid var(--border-light, #E2E8F0)', color: 'var(--text-secondary, #334155)' }}>
                              Trưởng nhóm
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '11.5px', color: 'var(--text-muted, #64748B)' }}>
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

      {/* ── BẢNG ĐỐI CHIẾU 2 CỘT CÂN BẰNG, ĐỒNG ĐỀU (SINH VIÊN LẺ VS PHÒNG THIẾU) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(480px, 100%), 1fr))', gap: '1.25rem', alignItems: 'stretch' }}>
        {/* CỘT TRÁI: Sinh viên Chưa có Nhóm */}
        <div
          style={{
            backgroundColor: 'var(--bg-card, #FFFFFF)',
            border: '1px solid var(--border-light, #E2E8F0)',
            borderRadius: 16,
            padding: '20px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
            height: '600px',
          }}
        >
          {/* Header Cột */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  backgroundColor: 'var(--bg-tag, #F1F5F9)',
                  border: '1px solid var(--border-light, #E2E8F0)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-secondary, #334155)',
                  flexShrink: 0,
                }}
              >
                <Users size={17} />
              </div>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 650, color: 'var(--text-main, #0F172A)', margin: 0 }}>
                  Sinh viên Chưa có Nhóm ({unassignedList.length} bạn)
                </h3>
                <span style={{ fontSize: '12.5px', color: 'var(--text-muted, #64748B)' }}>
                  Hết hạn tự do nhưng chưa tham gia phòng nào
                </span>
              </div>
            </div>

            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '3px 10px',
                borderRadius: 999,
                fontSize: '12px',
                fontWeight: 600,
                backgroundColor: 'var(--bg-subtle, #F8FAFC)',
                border: '1px solid var(--border-light, #E2E8F0)',
                color: 'var(--text-secondary, #334155)',
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: unassignedList.length === 0 ? '#10B981' : 'var(--accent-color, #F26F21)',
                  flexShrink: 0,
                }}
              />
              {unassignedList.length === 0 ? 'Đã ghép 100%' : `${unassignedList.length} SV chờ`}
            </span>
          </div>

          {/* Bộ lọc Tìm kiếm & Ngành */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 160 }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light, #94A3B8)', pointerEvents: 'none' }} />
              <input
                type="text"
                placeholder="Tìm tên, MSSV..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: studentSearch ? '6px 28px 6px 30px' : '6px 10px 6px 30px',
                  borderRadius: 8,
                  border: '1px solid var(--border-light, #E2E8F0)',
                  fontSize: '12.5px',
                  backgroundColor: 'var(--bg-subtle, #F8FAFC)',
                  color: 'var(--text-main, #0F172A)',
                }}
              />
              {studentSearch && (
                <button
                  type="button"
                  aria-label="Xóa từ khóa"
                  onClick={() => setStudentSearch('')}
                  style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', width: 20, height: 20, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted, #64748B)', background: 'transparent', border: 'none', cursor: 'pointer' }}
                >
                  <X size={13} />
                </button>
              )}
            </div>
            <select
              value={studentMajorFilter}
              onChange={(e) => setStudentMajorFilter(e.target.value)}
              style={{
                padding: '6px 10px',
                borderRadius: 8,
                border: '1px solid var(--border-light, #E2E8F0)',
                fontSize: '12.5px',
                backgroundColor: 'var(--bg-subtle, #F8FAFC)',
                color: 'var(--text-secondary, #334155)',
                fontWeight: 600,
              }}
            >
              <option value="ALL">Tất cả ngành ({unassignedList.length})</option>
              {availableMajors.map((mj) => (
                <option key={mj} value={mj}>
                  Ngành {mj}
                </option>
              ))}
            </select>
          </div>

          {/* Danh sách Sinh viên Cuộn được */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
            {unassignedList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-main, #0F172A)', margin: 'auto 0' }}>
                <CheckCircle2 size={38} style={{ margin: '0 auto 10px auto', color: '#10B981' }} />
                <div style={{ fontWeight: 650, fontSize: '15px' }}>Tất cả sinh viên đã được ghép nhóm!</div>
                <p style={{ fontSize: '13px', color: 'var(--text-muted, #64748B)', margin: '4px 0 0 0' }}>
                  Không còn sinh viên nào bị lẻ trong học kỳ này.
                </p>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-light, #94A3B8)', margin: 'auto 0' }}>
                <Search size={32} style={{ margin: '0 auto 8px auto', opacity: 0.6 }} />
                <div style={{ fontWeight: 650, fontSize: '14px', color: 'var(--text-secondary, #334155)' }}>Không tìm thấy sinh viên phù hợp</div>
                <p style={{ fontSize: '12.5px', margin: '4px 0 0 0' }}>Thử xóa bộ lọc để xem toàn bộ danh sách.</p>
              </div>
            ) : (
              filteredStudents.map((st) => (
                <div
                  key={st.id}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 10,
                    backgroundColor: 'var(--bg-subtle, #F8FAFC)',
                    border: '1px solid var(--border-light, #E2E8F0)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', gap: '8px' }}>
                    <div style={{ minWidth: 0, overflow: 'hidden' }}>
                      <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-main, #0F172A)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {st.name}
                      </span>
                      <span style={{ marginLeft: '6px', fontFamily: 'var(--font-mono, monospace)', fontSize: '12.5px', color: 'var(--text-main, #0F172A)', fontWeight: 700 }}>
                        {st.studentCode}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          backgroundColor: 'var(--bg-card, #FFFFFF)',
                          border: '1px solid var(--border-light, #E2E8F0)',
                          padding: '1px 6px',
                          borderRadius: 4,
                          color: 'var(--text-secondary, #334155)',
                        }}
                      >
                        {st.major}
                      </span>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          color: 'var(--text-muted, #64748B)',
                          backgroundColor: 'var(--bg-card, #FFFFFF)',
                          border: '1px solid var(--border-light, #E2E8F0)',
                          padding: '1px 6px',
                          borderRadius: 4,
                        }}
                      >
                        {st.classCode}
                      </span>
                    </div>
                  </div>

                  {/* 5 Skills Tabular Pills */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(5, 1fr)',
                      gap: '4px',
                      fontFamily: 'var(--font-mono, monospace)',
                      fontSize: '11.5px',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ padding: '2px 4px', borderRadius: 4, backgroundColor: 'var(--bg-card, #FFFFFF)', border: '1px solid var(--border-light, #E2E8F0)' }}>
                      <span style={{ color: 'var(--text-muted, #64748B)', fontSize: '11px' }}>TEC: </span>
                      <strong style={{ color: 'var(--text-main, #0F172A)', fontVariantNumeric: 'tabular-nums' }}>{st.skills.tech}</strong>
                    </div>
                    <div style={{ padding: '2px 4px', borderRadius: 4, backgroundColor: 'var(--bg-card, #FFFFFF)', border: '1px solid var(--border-light, #E2E8F0)' }} title="Điểm Quản lý (Tiêu chuẩn chỉ định Trưởng nhóm)">
                      <span style={{ color: 'var(--text-muted, #64748B)', fontSize: '11px' }}>MGT: </span>
                      <strong style={{ color: 'var(--text-main, #0F172A)', fontVariantNumeric: 'tabular-nums' }}>{st.skills.management}</strong>
                    </div>
                    <div style={{ padding: '2px 4px', borderRadius: 4, backgroundColor: 'var(--bg-card, #FFFFFF)', border: '1px solid var(--border-light, #E2E8F0)' }}>
                      <span style={{ color: 'var(--text-muted, #64748B)', fontSize: '11px' }}>DES: </span>
                      <strong style={{ color: 'var(--text-main, #0F172A)', fontVariantNumeric: 'tabular-nums' }}>{st.skills.graphicDesign}</strong>
                    </div>
                    <div style={{ padding: '2px 4px', borderRadius: 4, backgroundColor: 'var(--bg-card, #FFFFFF)', border: '1px solid var(--border-light, #E2E8F0)' }}>
                      <span style={{ color: 'var(--text-muted, #64748B)', fontSize: '11px' }}>MKT: </span>
                      <strong style={{ color: 'var(--text-main, #0F172A)', fontVariantNumeric: 'tabular-nums' }}>{st.skills.marketing}</strong>
                    </div>
                    <div style={{ padding: '2px 4px', borderRadius: 4, backgroundColor: 'var(--bg-card, #FFFFFF)', border: '1px solid var(--border-light, #E2E8F0)' }}>
                      <span style={{ color: 'var(--text-muted, #64748B)', fontSize: '11px' }}>SAL: </span>
                      <strong style={{ color: 'var(--text-main, #0F172A)', fontVariantNumeric: 'tabular-nums' }}>{st.skills.sale}</strong>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* CỘT PHẢI: Hiện trạng Các Phòng Trong Môn */}
        <div
          style={{
            backgroundColor: 'var(--bg-card, #FFFFFF)',
            border: '1px solid var(--border-light, #E2E8F0)',
            borderRadius: 16,
            padding: '20px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
            height: '600px',
          }}
        >
          {/* Header Cột */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  backgroundColor: 'var(--bg-tag, #F1F5F9)',
                  border: '1px solid var(--border-light, #E2E8F0)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-secondary, #334155)',
                  flexShrink: 0,
                }}
              >
                <Layers size={17} />
              </div>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 650, color: 'var(--text-main, #0F172A)', margin: 0 }}>
                  Hiện trạng Các Phòng Trong Môn ({roomsList.length} phòng)
                </h3>
                <span style={{ fontSize: '12.5px', color: 'var(--text-muted, #64748B)' }}>
                  Phòng chưa đủ sĩ số (1-4/5) và phòng trống (0/5)
                </span>
              </div>
            </div>

            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--text-secondary, #334155)',
                background: 'var(--bg-subtle, #F8FAFC)',
                border: '1px solid var(--border-light, #E2E8F0)',
                padding: '3px 10px',
                borderRadius: 999,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: roomsList.length === 0 ? '#10B981' : 'var(--accent-color, #F26F21)',
                  flexShrink: 0,
                }}
              />
              {roomsList.length === 0 ? 'Đã đủ sĩ số' : 'Cần điều phối'}
            </span>
          </div>

          {/* Bộ lọc Tab & Tìm kiếm Phòng */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 4, background: 'var(--bg-tag, #F1F5F9)', padding: 3, borderRadius: 8 }}>
              <button
                type="button"
                onClick={() => setRoomFilterTab('ALL')}
                style={{
                  padding: '4px 9px',
                  borderRadius: 6,
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: 650,
                  cursor: 'pointer',
                  backgroundColor: roomFilterTab === 'ALL' ? 'var(--bg-card, #FFFFFF)' : 'transparent',
                  color: roomFilterTab === 'ALL' ? 'var(--text-main, #0F172A)' : 'var(--text-muted, #64748B)',
                  boxShadow: roomFilterTab === 'ALL' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                }}
              >
                Tất cả ({roomsList.length})
              </button>
              <button
                type="button"
                onClick={() => setRoomFilterTab('INCOMPLETE')}
                style={{
                  padding: '4px 9px',
                  borderRadius: 6,
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: 650,
                  cursor: 'pointer',
                  backgroundColor: roomFilterTab === 'INCOMPLETE' ? 'var(--bg-card, #FFFFFF)' : 'transparent',
                  color: roomFilterTab === 'INCOMPLETE' ? 'var(--text-main, #0F172A)' : 'var(--text-muted, #64748B)',
                  boxShadow: roomFilterTab === 'INCOMPLETE' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                }}
              >
                Thiếu ({incompleteCount})
              </button>
              <button
                type="button"
                onClick={() => setRoomFilterTab('EMPTY')}
                style={{
                  padding: '4px 9px',
                  borderRadius: 6,
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: 650,
                  cursor: 'pointer',
                  backgroundColor: roomFilterTab === 'EMPTY' ? 'var(--bg-card, #FFFFFF)' : 'transparent',
                  color: roomFilterTab === 'EMPTY' ? 'var(--text-main, #0F172A)' : 'var(--text-muted, #64748B)',
                  boxShadow: roomFilterTab === 'EMPTY' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                }}
              >
                Trống ({emptyCount})
              </button>
            </div>

            <div style={{ position: 'relative', flex: 1, minWidth: 140 }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light, #94A3B8)', pointerEvents: 'none' }} />
              <input
                type="text"
                placeholder="Tìm mã phòng..."
                value={roomSearch}
                onChange={(e) => setRoomSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: roomSearch ? '6px 28px 6px 30px' : '6px 10px 6px 30px',
                  borderRadius: 8,
                  border: '1px solid var(--border-light, #E2E8F0)',
                  fontSize: '12.5px',
                  backgroundColor: 'var(--bg-subtle, #F8FAFC)',
                  color: 'var(--text-main, #0F172A)',
                }}
              />
              {roomSearch && (
                <button
                  type="button"
                  aria-label="Xóa từ khóa phòng"
                  onClick={() => setRoomSearch('')}
                  style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', width: 20, height: 20, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted, #64748B)', background: 'transparent', border: 'none', cursor: 'pointer' }}
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Danh sách Phòng Cuộn được */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
            {filteredRooms.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-light, #94A3B8)', margin: 'auto 0' }}>
                <DoorOpen size={32} style={{ margin: '0 auto 8px auto', opacity: 0.6 }} />
                <div style={{ fontWeight: 650, fontSize: '14px', color: 'var(--text-secondary, #334155)' }}>
                  {roomsList.length === 0 ? 'Chưa có phòng học phần nào' : 'Không có phòng phù hợp'}
                </div>
                <p style={{ fontSize: '12.5px', margin: '4px 0 0 0', color: 'var(--text-muted, #64748B)' }}>
                  {roomsList.length === 0
                    ? 'Hãy sang mục Không gian & Danh sách FAP để khởi tạo phòng tự động trước khi điều phối.'
                    : 'Toàn bộ phòng đã đủ sĩ số hoặc không khớp bộ lọc hiện tại.'}
                </p>
              </div>
            ) : (
              filteredRooms.map((room) => {
                const max = room.maxCount || 5;
                const current = room.currentCount || 0;
                return (
                  <div
                    key={room.id}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 10,
                      backgroundColor: 'var(--bg-subtle, #F8FAFC)',
                      border: '1px solid var(--border-light, #E2E8F0)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                          style={{
                            fontFamily: 'var(--font-mono, monospace)',
                            fontWeight: 700,
                            fontSize: '13.5px',
                            color: 'var(--text-main, #0F172A)',
                          }}
                        >
                          {room.code}
                        </span>
                        <span
                          style={{
                            padding: '1px 8px',
                            borderRadius: 999,
                            fontSize: '11.5px',
                            fontWeight: 600,
                            fontVariantNumeric: 'tabular-nums',
                            backgroundColor: 'var(--bg-card, #FFFFFF)',
                            border: '1px solid var(--border-light, #E2E8F0)',
                            color: room.currentCount === 0 ? 'var(--text-muted, #64748B)' : 'var(--text-secondary, #334155)',
                          }}
                        >
                          {room.currentCount}/{room.maxCount} thành viên
                        </span>
                      </div>

                      {/* Visual Seat Indicators */}
                      <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
                        {Array.from({ length: max }).map((_, slotIdx) => {
                          const isFilled = slotIdx < current;
                          return (
                            <div
                              key={slotIdx}
                              style={{
                                width: 14,
                                height: 6,
                                borderRadius: 3,
                                backgroundColor: isFilled
                                  ? current >= max
                                    ? '#059669'
                                    : 'var(--accent-color, #f26f21)'
                                  : 'var(--border-light, #E2E8F0)',
                              }}
                              title={isFilled ? `Chỗ ${slotIdx + 1}: Đã có thành viên` : `Chỗ ${slotIdx + 1}: Còn trống`}
                            />
                          );
                        })}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', fontSize: '12px' }}>
                      <div style={{ color: 'var(--text-muted, #64748B)' }}>
                        Trưởng nhóm:{' '}
                        <strong style={{ color: room.leaderName === '(Chưa có)' ? 'var(--text-light, #94A3B8)' : 'var(--text-main, #0F172A)' }}>
                          {room.leaderName}
                        </strong>
                      </div>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', justifyContent: 'flex-end' }}>
                        {room.neededSkills.slice(0, 2).map((sk, idx) => (
                          <span
                            key={idx}
                            style={{
                              fontSize: '11px',
                              padding: '1px 6px',
                              borderRadius: 4,
                              backgroundColor: 'var(--bg-card, #FFFFFF)',
                              border: '1px solid var(--border-light, #E2E8F0)',
                              color: 'var(--text-secondary, #334155)',
                              fontWeight: 600,
                            }}
                          >
                            {sk}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModeratorDistributionPage;
