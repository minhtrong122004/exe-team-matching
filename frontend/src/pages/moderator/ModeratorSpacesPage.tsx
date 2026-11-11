import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Settings,
  Upload,
  Database,
  ExternalLink,
  CheckCircle2,
  Search,
  Hash,
  Sparkles,
  Calendar,
  ShieldCheck,
  Check,
  Save,
  ChevronLeft,
  ChevronRight,
  Plus,
  Lock,
  AlertCircle,
} from '../../utils/icons';
import { useSelectedSpace, selectSpace, reloadSpaces } from '../../hooks/useSelectedSpace';
import { workspaceApi, errorMessage, SPACE_PHASE, type RoomSummary, type Space } from '../../api/workspace';
import { readFapFile } from '../../utils/fapImport';
import { Modal, Field, fieldStyle, Button, StateBox, useConfirm } from '../../components/workspace/ui';

// Giao diện giữ nguyên bản thiết kế của Tú; dữ liệu lấy từ Group Service thay cho dữ liệu mẫu.

interface FapStudent {
  id: string;
  studentCode: string;
  fullName: string;
  email: string;
  major: string;
  cohort: string;
  classCode: string;
  profileCompleted: boolean;
  accountCreated: boolean;
}

/** ISO (UTC) → giá trị cho ô datetime-local theo giờ máy người dùng. */
const toLocalInput = (iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);

/** Tạo không gian môn học (bản mockup không có, cần để bắt đầu học kỳ thật). */
const CreateSpaceModal: React.FC<{ open: boolean; onClose: () => void; onCreated: (space: Space) => void }> = ({ open, onClose, onCreated }) => {
  const [form, setForm] = useState({
    semesterCode: 'FA26',
    subjectCode: 'EXE101',
    name: '',
    maxMembersPerGroup: 5,
    bufferRatio: 1.2,
    maxConcurrentApplies: 3,
    registrationDeadline: toLocalInput(new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString()),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const subject = form.subjectCode.trim().toUpperCase();
      onCreated(
        await workspaceApi.createSpace({
          ...form,
          semesterCode: form.semesterCode.trim().toUpperCase(),
          subjectCode: subject,
          name: form.name.trim() || subject,
          registrationDeadline: new Date(form.registrationDeadline).toISOString(),
        })
      );
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Tạo không gian môn học">
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {error && <div style={{ color: '#B91C1C', fontSize: 14 }}>{error}</div>}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Học kỳ">
            <input style={fieldStyle} required value={form.semesterCode} onChange={(e) => setForm({ ...form, semesterCode: e.target.value })} />
          </Field>
          <Field label="Mã môn">
            <input style={fieldStyle} required value={form.subjectCode} onChange={(e) => setForm({ ...form, subjectCode: e.target.value })} />
          </Field>
        </div>
        <Field label="Tên môn (không bắt buộc)">
          <input style={fieldStyle} placeholder="Trải nghiệm Khởi nghiệp 1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>
        <Field label="Hạn đóng đăng ký">
          <input type="datetime-local" required style={fieldStyle} value={form.registrationDeadline} onChange={(e) => setForm({ ...form, registrationDeadline: e.target.value })} />
        </Field>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <Button variant="outline" onClick={onClose}>
            Hủy
          </Button>
          <Button type="submit" loading={saving} icon={<Plus size={16} />}>
            Tạo
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export const ModeratorSpacesPage: React.FC = () => {
  const { spaces, space, loading: spacesLoading, error: spacesError } = useSelectedSpace();
  const dialog = useConfirm();
  const [createOpen, setCreateOpen] = useState(false);

  // Course Space state (từ không gian đang chọn)
  const activeCourse = space?.subjectCode ?? '';
  const currentPhase = space ? SPACE_PHASE[space.status] : 1;

  // Configuration params
  const [maxMembers, setMaxMembers] = useState<number>(5);
  const minThreshold = Math.floor(maxMembers / 2) + 1;
  const [reserveRatio, setReserveRatio] = useState<number>(1.2);
  const [maxPendingRequests, setMaxPendingRequests] = useState<number>(3);
  const [deadline, setDeadline] = useState<string>('');
  const [savedConfigToast, setSavedConfigToast] = useState<string | null>(null);
  const [errorToast, setErrorToast] = useState<string | null>(null);

  // FAP Sync state
  const [students, setStudents] = useState<FapStudent[]>([]);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [searchStudent, setSearchStudent] = useState<string>('');
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const totalStudentsCount = students.length;

  // Rooms state
  const computedRoomsCount = totalStudentsCount > 0 ? Math.ceil((totalStudentsCount / maxMembers) * reserveRatio) : 0;
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [roomsCreatedToast, setRoomsCreatedToast] = useState<string | null>(null);
  const [fapSyncToast, setFapSyncToast] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 8;
  const isLocked = space?.status === 'Locked';
  const roomsInUse = rooms.some((r) => r.memberCount > 0);

  const flash = (setter: (v: string | null) => void, msg: string, ms = 4000) => {
    setter(msg);
    window.setTimeout(() => setter(null), ms);
  };
  const showError = (err: unknown, fallback?: string) => flash(setErrorToast, errorMessage(err, fallback), 6000);

  const loadData = useCallback(async () => {
    if (!space) return;
    try {
      const [enrollments, roomList] = await Promise.all([workspaceApi.listEnrollments(space.id), workspaceApi.listRooms(space.id)]);
      setStudents(
        enrollments.map((e) => ({
          id: e.id,
          studentCode: e.studentCode,
          fullName: e.fullName,
          email: e.email,
          major: e.major,
          cohort: e.cohort || '—',
          classCode: e.classCode || '—',
          profileCompleted: e.isProfileCompleted,
          accountCreated: true,
        }))
      );
      setRooms([...roomList].sort((a, b) => (a.roomCode ?? a.name).localeCompare(b.roomCode ?? b.name)));
    } catch (err) {
      showError(err, 'Không tải được danh sách sinh viên và phòng.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [space?.id]);

  useEffect(() => {
    setStudents([]);
    setRooms([]);
    setSyncStatus(null);
    setImportErrors([]);
    setCurrentPage(1);
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (!space) return;
    setMaxMembers(space.maxMembersPerGroup);
    setReserveRatio(Number(space.bufferRatio));
    setMaxPendingRequests(space.maxConcurrentApplies);
    setDeadline(toLocalInput(space.registrationDeadline));
  }, [space]);

  // Handlers
  const handleSaveConfig = async () => {
    if (!space) return;
    try {
      await workspaceApi.updateSpaceConfig(space.id, {
        maxMembersPerGroup: maxMembers,
        bufferRatio: reserveRatio,
        maxConcurrentApplies: maxPendingRequests,
        registrationDeadline: new Date(deadline).toISOString(),
      });
      flash(setSavedConfigToast, `Đã lưu cấu hình thông số ghép nhóm học kỳ ${space.semesterCode} thành công!`, 3500);
      reloadSpaces();
      void loadData();
    } catch (err) {
      showError(err);
    }
  };

  const handleSyncFap = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !space) return;
    setImporting(true);
    setImportErrors([]);
    try {
      const parsed = await readFapFile(file);
      if (parsed.errors.length > 0) {
        setImportErrors(parsed.errors);
        flash(setErrorToast, `File có ${parsed.errors.length} dòng sai, chưa nhập sinh viên nào.`, 6000);
        return;
      }
      const imported = await workspaceApi.importFap(space.id, parsed.students.map((s) => ({ ...s, cohort: s.cohort ?? '' })));
      const msg = `Đã đồng bộ ${imported} sinh viên đủ điều kiện từ file FAP "${file.name}". Tài khoản đăng nhập Google đã được khởi tạo.`;
      setSyncStatus(msg);
      flash(setFapSyncToast, msg, 4500);
      setCurrentPage(1);
      reloadSpaces();
      await loadData();
    } catch (err) {
      showError(err, 'Không đọc được file.');
    } finally {
      setImporting(false);
    }
  };

  const handleCreateRooms = async () => {
    if (!space) return;
    try {
      const res = await workspaceApi.generateRooms(space.id);
      const codes = res.rooms.map((r) => r.roomCode ?? r.name).sort();
      flash(
        setRoomsCreatedToast,
        `Đã khởi tạo thành công ${res.totalRoomsGenerated} phòng trống${codes.length ? ` (${codes[0]} → ${codes[codes.length - 1]})` : ''} sẵn sàng cho sinh viên ghép nhóm!`
      );
      reloadSpaces();
      await loadData();
    } catch (err) {
      showError(err);
    }
  };

  const handleCloseRegistration = async () => {
    if (!space) return;
    const ok = await dialog.confirm({
      title: 'Đóng đăng ký tự nguyện?',
      message: 'Sinh viên sẽ không tự vào phòng được nữa; chuyển sang bước điều phối sinh viên chưa có nhóm.',
      confirmLabel: 'Đóng đăng ký',
    });
    if (ok === null) return;
    try {
      await workspaceApi.closeRegistration(space.id);
      flash(setSavedConfigToast, 'Đã đóng đăng ký tự nguyện. Chuyển sang trang Điều phối sinh viên lẻ.');
      reloadSpaces();
    } catch (err) {
      showError(err);
    }
  };

  const filteredStudents = useMemo(
    () =>
      students.filter(
        (s) =>
          s.fullName.toLowerCase().includes(searchStudent.toLowerCase()) ||
          s.studentCode.toLowerCase().includes(searchStudent.toLowerCase()) ||
          s.major.toLowerCase().includes(searchStudent.toLowerCase()) ||
          s.classCode.toLowerCase().includes(searchStudent.toLowerCase())
      ),
    [students, searchStudent]
  );

  const totalPages = Math.ceil(filteredStudents.length / pageSize) || 1;
  const paginatedStudents = filteredStudents.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const createModal = (
    <CreateSpaceModal
      open={createOpen}
      onClose={() => setCreateOpen(false)}
      onCreated={(created) => {
        setCreateOpen(false);
        selectSpace(created.id);
        reloadSpaces();
        flash(setSavedConfigToast, `Đã tạo không gian ${created.subjectCode} học kỳ ${created.semesterCode}.`);
      }}
    />
  );

  if (!space) {
    return (
      <div style={{ padding: '0 0 3rem 0', maxWidth: 1560, margin: '0 auto' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 650, color: 'var(--text-main, #0F172A)', margin: '0 0 1.5rem 0', letterSpacing: '-0.02em' }}>
          Quản lý Không gian Môn học & Đồng bộ FAP
        </h1>
        <StateBox
          kind={spacesLoading ? 'loading' : spacesError ? 'error' : 'empty'}
          title={spacesLoading ? undefined : spacesError ? 'Không tải được dữ liệu' : 'Chưa có không gian môn học'}
          message={spacesError ?? (spacesLoading ? 'Đang tải...' : 'Tạo không gian môn học đầu tiên, sau đó tải danh sách sinh viên FAP lên.')}
          action={
            !spacesLoading && !spacesError ? (
              <Button icon={<Plus size={16} />} onClick={() => setCreateOpen(true)}>
                Tạo không gian môn học
              </Button>
            ) : undefined
          }
        />
        {createModal}
      </div>
    );
  }

  return (
    <div style={{ padding: '0 0 3rem 0', maxWidth: 1560, margin: '0 auto' }}>
      {/* Toast Notification */}
      {(savedConfigToast || roomsCreatedToast || fapSyncToast) && (
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
          <span>{savedConfigToast || roomsCreatedToast || fapSyncToast}</span>
        </div>
      )}
      {errorToast && (
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
            boxShadow: '0 10px 25px rgba(185, 28, 28, 0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontSize: '15px',
            fontWeight: 600,
          }}
        >
          <AlertCircle size={18} />
          <span>{errorToast}</span>
        </div>
      )}
      {dialog.node}
      {createModal}

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
          <span style={{ color: '#334155', fontWeight: 600 }}>Quản lý không gian môn học & FAP</span>
        </div>
        <h1 style={{ fontSize: '24px', fontWeight: 650, color: '#0F172A', margin: '0 0 4px 0', letterSpacing: '-0.02em' }}>
          Quản lý Không gian Môn học & Đồng bộ FAP
        </h1>
        <p style={{ color: '#64748B', fontSize: '14.5px', margin: 0, lineHeight: 1.5 }}>
          Thiết lập thông số nhóm học phần EXE, đồng bộ danh sách sinh viên đủ điều kiện từ FAP và khởi tạo số lượng phòng trống tự động cho học kỳ.
        </p>
      </div>

      {/* Course Selector Tabs — Synced with user's chosen accent color */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {spaces.map((s) => {
          const active = s.id === space.id;
          return (
            <button
              key={s.id}
              type="button"
              className="motion-btn"
              onClick={() => selectSpace(s.id)}
              style={{
                padding: '9px 18px',
                borderRadius: 10,
                fontSize: '14.5px',
                fontWeight: 600,
                cursor: 'pointer',
                border: active ? '1px solid var(--accent-color, #F26F21)' : '1px solid var(--border-light, #E2E8F0)',
                background: active ? 'var(--accent-gradient, var(--accent-color, #F26F21))' : 'var(--bg-card, #FFFFFF)',
                color: active ? '#FFFFFF' : 'var(--text-muted, #64748B)',
                boxShadow: active ? '0 1px 3px var(--accent-shadow, rgba(242, 111, 33, 0.2))' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              Học kỳ {s.semesterCode} • {s.subjectCode}
              {s.name && s.name !== s.subjectCode ? ` (${s.name})` : ''}
            </button>
          );
        })}
        <button
          type="button"
          className="motion-btn"
          onClick={() => setCreateOpen(true)}
          style={{
            padding: '9px 18px',
            borderRadius: 10,
            fontSize: '14.5px',
            fontWeight: 600,
            cursor: 'pointer',
            border: '1px dashed var(--border-medium, #CBD5E1)',
            background: 'var(--bg-card, #FFFFFF)',
            color: 'var(--text-muted, #64748B)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Plus size={15} /> Tạo không gian mới
        </button>
      </div>

      {/* 4-Phase Progress Timeline */}
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-main, #0F172A)', margin: 0 }}>
              Tiến trình 4 Giai đoạn Vòng đời Học kỳ
            </h3>
            <p style={{ fontSize: '15px', color: 'var(--text-muted, #64748B)', margin: '3px 0 0 0' }}>
              Trạng thái cập nhật theo thao tác thật: tạo phòng để mở đăng ký, đóng đăng ký, rồi chốt sổ ở trang Điều phối.
            </p>
          </div>
          <span
            style={{
              padding: '5px 12px',
              borderRadius: 999,
              fontSize: '13.5px',
              fontWeight: 600,
              backgroundColor: '#F8FAFC',
              color: '#0F172A',
              border: '1px solid #E2E8F0',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: 999, backgroundColor: 'var(--accent-color, #F26F21)' }} />
            {currentPhase === 1 && 'Giai đoạn 1: Bản nháp cấu hình'}
            {currentPhase === 2 && 'Giai đoạn 2: Đang mở đăng ký tự nguyện'}
            {currentPhase === 3 && 'Giai đoạn 3: Đã đóng đăng ký (Chờ điều phối)'}
            {currentPhase === 4 && 'Giai đoạn 4: Đã chốt sổ học kỳ'}
          </span>
        </div>

        {/* Phase Buttons — Clean White Cards with Solid Orange Indicator (No pastel fill) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
          {[
            { phase: 1, title: '1. Bản nháp cấu hình', desc: 'Thiết lập quy tắc sĩ số & hạn nộp' },
            { phase: 2, title: '2. Đang mở đăng ký tự nguyện', desc: 'Sinh viên tự do vào phòng & nộp đơn' },
            { phase: 3, title: '3. Đã đóng đăng ký', desc: 'Chờ điều phối sinh viên chưa có nhóm' },
            { phase: 4, title: '4. Đã chốt sổ học kỳ', desc: 'Khóa cứng danh sách nhóm môn học' },
          ].map((item) => {
            const isActive = currentPhase === item.phase;
            const isPassed = currentPhase > item.phase;
            return (
              <div
                key={item.phase}
                style={{
                  cursor: 'default',
                  padding: '14px 16px',
                  borderRadius: 12,
                  border: isActive ? '2px solid var(--accent-color, #F26F21)' : '1px solid var(--border-light, #E2E8F0)',
                  backgroundColor: isActive ? '#FFFFFF' : 'var(--bg-subtle, #F8FAFC)',
                  boxShadow: isActive ? '0 2px 8px var(--accent-shadow, rgba(242, 111, 33, 0.12))' : 'none',
                  transition: 'all 0.15s ease',
                  position: 'relative',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '15px', fontWeight: 700, color: isActive ? '#0F172A' : 'var(--text-secondary, #334155)' }}>
                    {item.title}
                  </span>
                  {isPassed ? (
                    <CheckCircle2 size={16} color="#10B981" />
                  ) : isActive ? (
                    <div style={{ width: 8, height: 8, borderRadius: 999, backgroundColor: 'var(--accent-color, #F26F21)' }} />
                  ) : null}
                </div>
                <p style={{ fontSize: '14px', color: 'var(--text-muted, #64748B)', margin: 0 }}>
                  {item.desc}
                </p>
              </div>
            );
          })}
        </div>
        {space.status === 'Open' && (
          <div style={{ marginTop: '14px' }}>
            <Button variant="dark" icon={<Lock size={15} />} onClick={handleCloseRegistration}>
              Đóng đăng ký tự nguyện
            </Button>
          </div>
        )}
      </div>

      {/* Grid: 2 Columns for Config & Bulk Init */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(480px, 100%), 1fr))', gap: '1.5rem', marginBottom: '1.75rem' }}>
        {/* KHUNG 1: Cấu hình Thông số Ghép nhóm */}
        <div
          style={{
            backgroundColor: 'var(--bg-card, #FFFFFF)',
            border: '1px solid var(--border-light, #E2E8F0)',
            borderRadius: '20px',
            padding: '26px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-color, #F26F21)', flexShrink: 0 }}>
                <Settings size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-main, #0F172A)', margin: 0, letterSpacing: '-0.01em' }}>
                  Cấu hình Thông số Ghép nhóm ({activeCourse})
                </h3>
                <span style={{ fontSize: '14px', color: 'var(--text-muted, #64748B)' }}>
                  Quy định sĩ số và hạn ngạch nộp đơn trong học kỳ
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Sĩ số tối đa & Hệ số dự phòng trên 2 cột gọn gàng */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div style={{ padding: '12px 14px', borderRadius: 12, backgroundColor: 'var(--bg-subtle, #F8FAFC)', border: '1px solid var(--border-light, #E2E8F0)' }}>
                  <label style={{ display: 'block', fontSize: '13.5px', fontWeight: 700, color: 'var(--text-secondary, #334155)', marginBottom: '8px' }}>
                    Sĩ số tối đa mỗi nhóm
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input
                      type="number"
                      min={4}
                      max={6}
                      value={maxMembers}
                      onChange={(e) => setMaxMembers(Number(e.target.value))}
                      style={{
                        width: 76,
                        height: 40,
                        padding: '0 10px',
                        borderRadius: 10,
                        border: '1px solid var(--border-medium, #CBD5E1)',
                        backgroundColor: 'var(--bg-input, #FFFFFF)',
                        fontSize: '15.5px',
                        fontWeight: 800,
                        color: 'var(--text-main, #0F172A)',
                        fontVariantNumeric: 'tabular-nums',
                        outline: 'none',
                      }}
                    />
                    <span style={{ fontSize: '13.5px', color: 'var(--text-muted, #64748B)', fontWeight: 500, whiteSpace: 'nowrap' }}>
                      SV / nhóm (Mặc định: 5)
                    </span>
                  </div>
                </div>

                <div style={{ padding: '12px 14px', borderRadius: 12, backgroundColor: 'var(--bg-subtle, #F8FAFC)', border: '1px solid var(--border-light, #E2E8F0)' }}>
                  <label style={{ display: 'block', fontSize: '13.5px', fontWeight: 700, color: 'var(--text-secondary, #334155)', marginBottom: '8px' }}>
                    Hệ số phòng dự phòng
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input
                      type="number"
                      step={0.1}
                      min={1.0}
                      max={2}
                      value={reserveRatio}
                      onChange={(e) => setReserveRatio(Number(e.target.value))}
                      style={{
                        width: 76,
                        height: 40,
                        padding: '0 10px',
                        borderRadius: 10,
                        border: '1px solid var(--border-medium, #CBD5E1)',
                        backgroundColor: 'var(--bg-input, #FFFFFF)',
                        fontSize: '15.5px',
                        fontWeight: 800,
                        color: 'var(--text-main, #0F172A)',
                        fontVariantNumeric: 'tabular-nums',
                        outline: 'none',
                      }}
                    />
                    <span style={{ fontSize: '13.5px', color: 'var(--text-muted, #64748B)', fontWeight: 500, whiteSpace: 'nowrap' }}>
                      × ước tính (Mặc định: 1.2)
                    </span>
                  </div>
                </div>
              </div>

              {/* Ngưỡng tối thiểu thành lập nhóm (Tự động tính) */}
              <div style={{ padding: '12px 16px', borderRadius: 12, backgroundColor: 'var(--bg-subtle, #F8FAFC)', border: '1px solid var(--border-light, #E2E8F0)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '14.5px', fontWeight: 700, color: 'var(--text-main, #0F172A)' }}>
                    Ngưỡng tối thiểu thành lập nhóm
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155', backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', padding: '3px 10px', borderRadius: 999, whiteSpace: 'nowrap' }}>
                    Tự động tính: {minThreshold} thành viên
                  </span>
                </div>
                <p style={{ fontSize: '13.5px', color: 'var(--text-muted, #64748B)', margin: 0, lineHeight: 1.5 }}>
                  Khi đạt đủ 3 người, phòng tự động khóa cổng vào thẳng và chuyển sang chế độ Nhóm chính thức (chỉ nhận thêm thành viên qua đơn ứng tuyển).
                </p>
              </div>

              {/* Giới hạn đơn ứng tuyển & Thời hạn đóng đăng ký trên 2 cột */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div style={{ padding: '12px 14px', borderRadius: 12, backgroundColor: 'var(--bg-subtle, #F8FAFC)', border: '1px solid var(--border-light, #E2E8F0)' }}>
                  <label style={{ display: 'block', fontSize: '13.5px', fontWeight: 700, color: 'var(--text-secondary, #334155)', marginBottom: '8px' }}>
                    Giới hạn đơn chờ cùng lúc
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input
                      type="number"
                      min={1}
                      max={5}
                      value={maxPendingRequests}
                      onChange={(e) => setMaxPendingRequests(Number(e.target.value))}
                      style={{
                        width: 76,
                        height: 40,
                        padding: '0 10px',
                        borderRadius: 10,
                        border: '1px solid var(--border-medium, #CBD5E1)',
                        backgroundColor: 'var(--bg-input, #FFFFFF)',
                        fontSize: '15.5px',
                        fontWeight: 800,
                        color: 'var(--text-main, #0F172A)',
                        fontVariantNumeric: 'tabular-nums',
                        outline: 'none',
                      }}
                    />
                    <span style={{ fontSize: '13.5px', color: 'var(--text-muted, #64748B)', fontWeight: 500, whiteSpace: 'nowrap' }}>
                      đơn tối đa / SV
                    </span>
                  </div>
                </div>

                <div style={{ padding: '12px 14px', borderRadius: 12, backgroundColor: 'var(--bg-subtle, #F8FAFC)', border: '1px solid var(--border-light, #E2E8F0)' }}>
                  <label style={{ display: 'block', fontSize: '13.5px', fontWeight: 700, color: 'var(--text-secondary, #334155)', marginBottom: '8px' }}>
                    Hạn đóng đăng ký tự nguyện
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Calendar size={15} color="#64748B" style={{ flexShrink: 0 }} />
                    <input
                      type="datetime-local"
                      value={deadline}
                      onChange={(e) => setDeadline(e.target.value)}
                      style={{
                        width: '100%',
                        height: 40,
                        padding: '0 10px',
                        borderRadius: 10,
                        border: '1px solid var(--border-medium, #CBD5E1)',
                        backgroundColor: 'var(--bg-input, #FFFFFF)',
                        fontSize: '13.5px',
                        fontWeight: 600,
                        color: 'var(--text-main, #0F172A)',
                        fontVariantNumeric: 'tabular-nums',
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '1.25rem', paddingTop: '14px', borderTop: '1px solid var(--border-subtle, #F1F5F9)' }}>
            <button
              type="button"
              onClick={handleSaveConfig}
              style={{
                width: '100%',
                height: 44,
                borderRadius: 12,
                background: 'var(--accent-gradient, linear-gradient(135deg, #f26f21 0%, #ea580c 100%))',
                boxShadow: '0 2px 6px rgba(242, 111, 33, 0.25)',
                color: '#FFFFFF',
                border: 'none',
                fontWeight: 700,
                fontSize: '15px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'opacity 0.15s ease',
              }}
            >
              <Save size={16} />
              Lưu cấu hình thông số
            </button>
          </div>
        </div>

        {/* KHUNG 3: Khởi tạo Phòng trống hàng loạt */}
        <div
          style={{
            backgroundColor: 'var(--bg-card, #FFFFFF)',
            border: '1px solid var(--border-light, #E2E8F0)',
            borderRadius: '20px',
            padding: '26px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-color, #F26F21)', flexShrink: 0 }}>
                <Hash size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-main, #0F172A)', margin: 0, letterSpacing: '-0.01em' }}>
                  Khởi tạo Phòng trống Hàng loạt
                </h3>
                <span style={{ fontSize: '14px', color: 'var(--text-muted, #64748B)' }}>
                  Tự động tính toán số lượng phòng cần thiết dựa trên sĩ số sinh viên
                </span>
              </div>
            </div>

            {/* Công thức tính toán đồng bộ font Sans-Serif + Pill số liệu */}
            <div
              style={{
                padding: '16px 18px',
                borderRadius: 14,
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                marginBottom: '16px',
              }}
            >
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Công thức tính số lượng phòng tự động
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '8px',
                  marginBottom: '10px',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                <span style={{ padding: '5px 11px', borderRadius: 8, backgroundColor: '#FFFFFF', border: '1px solid #CBD5E1', fontSize: '14px', fontWeight: 700, color: '#0F172A', whiteSpace: 'nowrap' }}>
                  {totalStudentsCount} SV đủ điều kiện
                </span>
                <span style={{ fontSize: '15px', fontWeight: 800, color: '#64748B' }}>÷</span>
                <span style={{ padding: '5px 11px', borderRadius: 8, backgroundColor: '#FFFFFF', border: '1px solid #CBD5E1', fontSize: '14px', fontWeight: 700, color: '#0F172A', whiteSpace: 'nowrap' }}>
                  {maxMembers} người/nhóm
                </span>
                <span style={{ fontSize: '15px', fontWeight: 800, color: '#64748B' }}>×</span>
                <span style={{ padding: '5px 11px', borderRadius: 8, backgroundColor: '#FFFFFF', border: '1px solid #CBD5E1', fontSize: '14px', fontWeight: 700, color: '#0F172A', whiteSpace: 'nowrap' }}>
                  Hệ số {reserveRatio}
                </span>
                <span style={{ fontSize: '15px', fontWeight: 800, color: '#64748B' }}>=</span>
                <span style={{ padding: '5px 12px', borderRadius: 8, background: 'var(--accent-gradient, linear-gradient(135deg, #f26f21 0%, #ea580c 100%))', fontSize: '14.5px', fontWeight: 700, color: '#FFFFFF', whiteSpace: 'nowrap' }}>
                  {computedRoomsCount} Phòng trống
                </span>
              </div>

              <p style={{ fontSize: '13.5px', color: 'var(--text-muted, #64748B)', margin: 0, lineHeight: 1.5 }}>
                Hệ số dự phòng {reserveRatio} đảm bảo luôn dư tối thiểu 2 phòng trống để sinh viên chủ động lựa chọn nhóm phù hợp.
              </p>
            </div>

            {/* Nút Khởi tạo 12 phòng */}
            <button
              type="button"
              onClick={handleCreateRooms}
              disabled={isLocked || totalStudentsCount === 0 || roomsInUse}
              title={totalStudentsCount === 0 ? 'Cần tải danh sách sinh viên FAP trước' : roomsInUse ? 'Đã có sinh viên vào phòng nên không tạo lại được' : undefined}
              style={{
                width: '100%',
                height: 44,
                borderRadius: 12,
                backgroundColor: isLocked || totalStudentsCount === 0 || roomsInUse ? 'var(--border-medium, #CBD5E1)' : 'var(--accent-color, #F26F21)',
                color: '#FFFFFF',
                border: 'none',
                fontWeight: 700,
                fontSize: '15px',
                cursor: isLocked || totalStudentsCount === 0 || roomsInUse ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginBottom: '16px',
              }}
            >
              <Sparkles size={16} />
              <span>
                {totalStudentsCount === 0 ? 'Cần tải danh sách sinh viên FAP trước' : `Khởi tạo tự động ${computedRoomsCount} Phòng trống (${space.semesterCode}${activeCourse}-01 → ${space.semesterCode}${activeCourse}-${computedRoomsCount < 10 ? `0${computedRoomsCount}` : computedRoomsCount})`}
              </span>
            </button>

            {/* Danh sách phòng đã tạo (Lưới 3 cột cố định, không bị rớt dòng mã phòng) */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-muted, #64748B)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Danh sách phòng hiện có ({rooms.length} phòng)
                </span>
                <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#64748B' }}>
                  {space.status === 'Draft' ? 'Chưa mở đăng ký' : space.status === 'Open' ? 'Đang mở đăng ký' : 'Đã đóng đăng ký'}
                </span>
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '10px',
                }}
              >
                {rooms.map((room) => (
                  <div
                    key={room.id}
                    title={room.leaderName ? `Trưởng nhóm: ${room.leaderName}` : undefined}
                    style={{
                      padding: '9px 12px',
                      borderRadius: 10,
                      border: '1px solid var(--border-light, #E2E8F0)',
                      backgroundColor: 'var(--bg-subtle, #F8FAFC)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '6px',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '13.5px',
                        fontWeight: 700,
                        color: 'var(--text-main, #0F172A)',
                        whiteSpace: 'nowrap',
                        fontVariantNumeric: 'tabular-nums',
                        letterSpacing: '-0.01em',
                      }}
                    >
                      {room.roomCode ?? room.name}
                    </span>
                    <span
                      style={{
                        fontSize: '12px',
                        color: '#475569',
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        padding: '1px 7px',
                        borderRadius: 999,
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {room.memberCount}/{room.maxMembers}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* KHUNG 2: Danh sách Sinh viên Đủ điều kiện Học phần (Đồng bộ từ FAP) */}
      <div
        style={{
          backgroundColor: 'var(--bg-card, #FFFFFF)',
          border: '1px solid var(--border-light, #E2E8F0)',
          borderRadius: '20px',
          padding: '24px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: '#F1F5F9', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0F172A' }}>
              <Database size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-main, #0F172A)', margin: 0 }}>
                Danh sách Sinh viên Đủ điều kiện Học phần (Đồng bộ từ FAP)
              </h3>
              <span style={{ fontSize: '14.5px', color: 'var(--text-muted, #64748B)' }}>
                Dữ liệu sinh viên đủ điều kiện học kỳ {space.semesterCode} môn {activeCourse} đồng bộ từ hệ thống đào tạo FAP
              </span>
            </div>
          </div>

          {/* Action buttons: 3 công cụ chuẩn nghiệp vụ FAP */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* Nút 1: Tải lên file CSV / Excel chuẩn FAP */}
            <label
              style={{
                height: 44,
                padding: '0 16px',
                borderRadius: 12,
                border: 'none',
                backgroundColor: '#0F172A',
                color: '#FFFFFF',
                fontSize: '15px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '7px',
                boxShadow: '0 2px 6px rgba(15, 23, 42, 0.2)',
                transition: 'opacity 0.15s ease',
              }}
            >
              <Upload size={15} />
              <span>{importing ? 'Đang nhập danh sách...' : 'Tải lên file CSV / Excel chuẩn FAP'}</span>
              <input ref={fileRef} type="file" accept=".csv, .xlsx, .xls" disabled={importing || isLocked} style={{ display: 'none' }} onChange={handleSyncFap} />
            </label>

            {/* Nút 3: Mở hộp thư MailHog (localhost:8025) — chỉ có khi chạy trên máy local */}
            {isLocalhost && <a
              href="http://localhost:8025"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                height: 44,
                padding: '0 15px',
                borderRadius: 12,
                border: '1px solid rgba(0, 84, 166, 0.25)',
                backgroundColor: 'rgba(0, 84, 166, 0.08)',
                color: '#0054A6',
                fontSize: '15px',
                fontWeight: 700,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '7px',
                transition: 'background 0.15s ease',
              }}
            >
              <ExternalLink size={15} />
              <span>Mở hộp thư MailHog (localhost:8025)</span>
            </a>}
          </div>
        </div>

        {importErrors.length > 0 && (
          <div style={{ padding: '12px 16px', borderRadius: 12, backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', fontSize: '14.5px', marginBottom: '1rem' }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>File có {importErrors.length} dòng sai, chưa nhập sinh viên nào:</div>
            <ul style={{ margin: 0, paddingLeft: 18, maxHeight: 160, overflowY: 'auto' }}>
              {importErrors.slice(0, 50).map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Sync Success Box */}
        {syncStatus && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: 12,
              backgroundColor: 'rgba(5, 150, 105, 0.08)',
              border: '1px solid rgba(5, 150, 105, 0.25)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '1rem',
            }}
          >
            <ShieldCheck size={18} color="#059669" />
            <span style={{ fontSize: '15px', color: '#059669', fontWeight: 600 }}>
              {syncStatus}
            </span>
          </div>
        )}

        {/* Search bar inside Table */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ position: 'relative', width: 340 }}>
            <Search size={15} style={{ position: 'absolute', left: 12, top: 11, color: 'var(--text-light, #94A3B8)' }} />
            <input
              type="text"
              placeholder="Tìm theo MSSV, Họ tên, Email hoặc Chuyên ngành..."
              value={searchStudent}
              onChange={(e) => {
                setSearchStudent(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                width: '100%',
                height: 44,
                paddingLeft: '2.25rem',
                paddingRight: '12px',
                borderRadius: 12,
                border: '1px solid var(--border-medium, #CBD5E1)',
                backgroundColor: 'var(--bg-subtle, #F8FAFC)',
                color: 'var(--text-main, #0F172A)',
                fontSize: '15px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ fontSize: '15px', color: 'var(--text-muted, #64748B)' }}>
            Hiển thị <strong style={{ color: 'var(--text-main, #0F172A)' }}>{filteredStudents.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} - {Math.min(currentPage * pageSize, filteredStudents.length)}</strong> trong tổng số <strong style={{ color: 'var(--text-main, #0F172A)' }}>{totalStudentsCount}</strong> sinh viên đủ điều kiện FAP
          </div>
        </div>

        {/* Student Table */}
        <div style={{ overflowX: 'auto', border: '1px solid var(--border-light, #E2E8F0)', borderRadius: 12 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '15px' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-subtle, #F8FAFC)', borderBottom: '1px solid var(--border-light, #E2E8F0)' }}>
                <th style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--text-main, #0F172A)' }}>MSSV</th>
                <th style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--text-main, #0F172A)' }}>Họ và tên</th>
                <th style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--text-main, #0F172A)' }}>Email trường (@fpt.edu.vn)</th>
                <th style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--text-main, #0F172A)' }}>Chuyên ngành (SE, AI, GD, MKT, IB)</th>
                <th style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--text-main, #0F172A)' }}>Khóa (K18)</th>
                <th style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--text-main, #0F172A)' }}>Lớp gốc FAP</th>
                <th style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--text-main, #0F172A)' }}>Trạng thái tài khoản</th>
                <th style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--text-main, #0F172A)' }}>Trạng thái Hồ sơ 5 Kỹ năng</th>
              </tr>
            </thead>
            <tbody>
              {paginatedStudents.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '28px', textAlign: 'center', color: 'var(--text-muted, #64748B)' }}>
                    {totalStudentsCount === 0 ? 'Chưa có sinh viên. Bấm “Tải lên file CSV / Excel chuẩn FAP” để thêm danh sách lớp.' : 'Không tìm thấy sinh viên nào khớp với từ khóa tìm kiếm.'}
                  </td>
                </tr>
              ) : (
                paginatedStudents.map((st) => (
                  <tr key={st.id} style={{ borderBottom: '1px solid var(--border-subtle, #F1F5F9)' }}>
                    <td style={{ padding: '11px 14px', fontFamily: 'var(--font-mono, monospace)', fontWeight: 800, color: '#0054A6' }}>
                      {st.studentCode}
                    </td>
                    <td style={{ padding: '11px 14px', fontWeight: 700, color: 'var(--text-main, #0F172A)' }}>
                      {st.fullName}
                    </td>
                    <td style={{ padding: '11px 14px', color: 'var(--text-muted, #64748B)' }}>
                      {st.email}
                    </td>
                    <td style={{ padding: '11px 14px', color: 'var(--text-main, #0F172A)' }}>
                      {st.major}
                    </td>
                    <td style={{ padding: '11px 14px', color: 'var(--text-muted, #64748B)', fontWeight: 600 }}>
                      {st.cohort}
                    </td>
                    <td style={{ padding: '11px 14px' }}>
                      <span style={{ padding: '3px 8px', borderRadius: 6, fontSize: '14px', fontWeight: 700, backgroundColor: 'var(--bg-subtle, #F8FAFC)', border: '1px solid var(--border-light, #E2E8F0)', color: 'var(--text-main, #0F172A)' }}>
                        {st.classCode}
                      </span>
                    </td>
                    <td style={{ padding: '11px 14px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 9px', borderRadius: 999, fontSize: '13.5px', fontWeight: 600, backgroundColor: '#F8FAFC', color: '#334155', border: '1px solid #E2E8F0' }}>
                        <Check size={13} color="#10B981" /> Đã cấp tài khoản
                      </span>
                    </td>
                    <td style={{ padding: '11px 14px' }}>
                      {st.profileCompleted ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 10px', borderRadius: 999, fontSize: '13.5px', fontWeight: 600, backgroundColor: '#F8FAFC', color: '#334155', border: '1px solid #E2E8F0' }}>
                          <span style={{ width: 6, height: 6, borderRadius: 999, backgroundColor: '#10B981' }} />
                          Đã hoàn tất
                        </span>
                      ) : (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 10px', borderRadius: 999, fontSize: '13.5px', fontWeight: 600, backgroundColor: '#F8FAFC', color: '#64748B', border: '1px solid #E2E8F0' }}>
                          <span style={{ width: 6, height: 6, borderRadius: 999, backgroundColor: '#F59E0B' }} />
                          Chưa hoàn tất
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination bar */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <span style={{ fontSize: '15px', color: 'var(--text-muted, #64748B)' }}>
              Trang <strong style={{ color: 'var(--text-main, #0F172A)' }}>{currentPage}</strong> / {totalPages}
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                style={{
                  height: 34,
                  padding: '0 12px',
                  borderRadius: 10,
                  border: '1px solid var(--border-medium, #CBD5E1)',
                  backgroundColor: 'var(--bg-card, #FFFFFF)',
                  color: currentPage === 1 ? 'var(--text-light, #94A3B8)' : 'var(--text-main, #0F172A)',
                  fontSize: '15px',
                  fontWeight: 600,
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <ChevronLeft size={16} />
                <span>Trang trước</span>
              </button>

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                style={{
                  height: 34,
                  padding: '0 12px',
                  borderRadius: 10,
                  border: '1px solid var(--border-medium, #CBD5E1)',
                  backgroundColor: 'var(--bg-card, #FFFFFF)',
                  color: currentPage === totalPages ? 'var(--text-light, #94A3B8)' : 'var(--text-main, #0F172A)',
                  fontSize: '15px',
                  fontWeight: 600,
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span>Trang sau</span>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
export default ModeratorSpacesPage;