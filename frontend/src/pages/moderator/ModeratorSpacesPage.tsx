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
  Save,
  ChevronLeft,
  ChevronRight,
  Plus,
  Lock,
  Trash2,
  RefreshCw,
} from '../../utils/icons';
import { useAuth } from '../../contexts/AuthContext';
import { useSelectedSpace, selectSpace, reloadSpaces } from '../../hooks/useSelectedSpace';
import {
  workspaceApi,
  errorMessage,
  SPACE_PHASE,
  SPACE_STATUS_LABEL,
  ROOM_STATUS_LABEL,
  type Enrollment,
  type RoomSummary,
  type Space,
} from '../../api/workspace';
import { readFapFile } from '../../utils/fapImport';
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
  Table,
  td,
  useToast,
  ROOM_STATUS_DOT,
} from '../../components/workspace/ui';

const PAGE_SIZE = 10;

const PHASES = [
  { phase: 1, title: '1. Bản nháp cấu hình', desc: 'Thiết lập sĩ số, tải danh sách FAP' },
  { phase: 2, title: '2. Đang mở đăng ký', desc: 'Sinh viên tự vào phòng & nộp đơn' },
  { phase: 3, title: '3. Đã đóng đăng ký', desc: 'Điều phối sinh viên chưa có nhóm' },
  { phase: 4, title: '4. Đã chốt sổ', desc: 'Khóa danh sách nhóm của học kỳ' },
];

/** ISO (UTC) → giá trị cho ô datetime-local theo giờ máy người dùng. */
const toLocalInput = (iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);

// ── Tạo không gian môn học ──────────────────────────────────────────────────

const CreateSpaceModal: React.FC<{ open: boolean; onClose: () => void; onCreated: (space: Space) => void }> = ({
  open,
  onClose,
  onCreated,
}) => {
  const [form, setForm] = useState({
    semesterCode: 'FA26',
    subjectCode: 'EXE101',
    name: '',
    maxMembersPerGroup: 5,
    bufferRatio: 1.2,
    maxConcurrentApplies: 3,
    registrationDeadline: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const space = await workspaceApi.createSpace({
        ...form,
        semesterCode: form.semesterCode.trim().toUpperCase(),
        subjectCode: form.subjectCode.trim().toUpperCase(),
        name: form.name.trim() || `${form.subjectCode.trim().toUpperCase()} — ${form.semesterCode.trim().toUpperCase()}`,
        registrationDeadline: form.registrationDeadline ? new Date(form.registrationDeadline).toISOString() : null,
      });
      onCreated(space);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Tạo không gian môn học"
      subtitle="Mỗi môn học trong một học kỳ là một không gian riêng, có danh sách sinh viên FAP và phòng nhóm riêng."
    >
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {error && <Banner tone="error">{error}</Banner>}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Mã học kỳ">
            <input style={fieldStyle} value={form.semesterCode} onChange={(e) => setForm({ ...form, semesterCode: e.target.value })} required />
          </Field>
          <Field label="Mã môn học">
            <input style={fieldStyle} value={form.subjectCode} onChange={(e) => setForm({ ...form, subjectCode: e.target.value })} required />
          </Field>
        </div>
        <Field label="Tên hiển thị" hint="Để trống sẽ tự đặt theo mã môn và học kỳ.">
          <input
            style={fieldStyle}
            value={form.name}
            placeholder="EXE101 — Trải nghiệm Khởi nghiệp 1"
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <Field label="Sĩ số tối đa">
            <input type="number" min={4} max={6} style={fieldStyle} value={form.maxMembersPerGroup} onChange={(e) => setForm({ ...form, maxMembersPerGroup: Number(e.target.value) })} />
          </Field>
          <Field label="Hệ số dự phòng">
            <input type="number" min={1} max={2} step={0.1} style={fieldStyle} value={form.bufferRatio} onChange={(e) => setForm({ ...form, bufferRatio: Number(e.target.value) })} />
          </Field>
          <Field label="Đơn chờ tối đa">
            <input type="number" min={1} max={5} style={fieldStyle} value={form.maxConcurrentApplies} onChange={(e) => setForm({ ...form, maxConcurrentApplies: Number(e.target.value) })} />
          </Field>
        </div>
        <Field label="Hạn đóng đăng ký tự nguyện" hint="Có thể đặt sau trong phần cấu hình.">
          <input type="datetime-local" style={fieldStyle} value={form.registrationDeadline} onChange={(e) => setForm({ ...form, registrationDeadline: e.target.value })} />
        </Field>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 6 }}>
          <Button variant="outline" onClick={onClose}>
            Hủy
          </Button>
          <Button type="submit" loading={saving} icon={<Plus size={16} />}>
            Tạo không gian
          </Button>
        </div>
      </form>
    </Modal>
  );
};

// ── Trang chính ─────────────────────────────────────────────────────────────

export const ModeratorSpacesPage: React.FC = () => {
  const { user } = useAuth();
  const { spaces, space, loading: spacesLoading, error: spacesError } = useSelectedSpace();
  const toast = useToast();
  const [createOpen, setCreateOpen] = useState(false);

  const [students, setStudents] = useState<Enrollment[]>([]);
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);

  const [config, setConfig] = useState({ maxMembersPerGroup: 5, bufferRatio: 1.2, maxConcurrentApplies: 3, registrationDeadline: '' });
  const [savingConfig, setSavingConfig] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [closing, setClosing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importResult, setImportResult] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const fileRef = useRef<HTMLInputElement>(null);

  const spaceId = space?.id;
  const isLocked = space?.status === 'Locked';

  const loadData = useCallback(async () => {
    if (!spaceId) return;
    setDataLoading(true);
    try {
      const [enrollments, roomList] = await Promise.all([workspaceApi.listEnrollments(spaceId), workspaceApi.listRooms(spaceId)]);
      setStudents(enrollments);
      setRooms(roomList);
      setDataError(null);
    } catch (err) {
      setDataError(errorMessage(err, 'Không tải được danh sách sinh viên và phòng.'));
    } finally {
      setDataLoading(false);
    }
  }, [spaceId]);

  useEffect(() => {
    setStudents([]);
    setRooms([]);
    setImportErrors([]);
    setImportResult(null);
    setSearch('');
    setPage(1);
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (!space) return;
    setConfig({
      maxMembersPerGroup: space.maxMembersPerGroup,
      bufferRatio: Number(space.bufferRatio),
      maxConcurrentApplies: space.maxConcurrentApplies,
      registrationDeadline: toLocalInput(space.registrationDeadline),
    });
  }, [space]);

  const threshold = Math.floor(config.maxMembersPerGroup / 2) + 1;
  const totalStudents = students.length;
  const computedRooms = totalStudents > 0 ? Math.ceil((totalStudents / config.maxMembersPerGroup) * config.bufferRatio) : 0;
  const roomsInUse = rooms.some((r) => r.memberCount > 0);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) =>
      [s.studentCode, s.fullName, s.email, s.major, s.classCode ?? ''].some((v) => v.toLowerCase().includes(q))
    );
  }, [students, search]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const completedProfiles = students.filter((s) => s.isProfileCompleted).length;

  const handleSaveConfig = async () => {
    if (!space) return;
    if (!config.registrationDeadline) {
      toast.show('Vui lòng chọn hạn đóng đăng ký.', 'error');
      return;
    }
    setSavingConfig(true);
    try {
      await workspaceApi.updateSpaceConfig(space.id, {
        maxMembersPerGroup: config.maxMembersPerGroup,
        bufferRatio: config.bufferRatio,
        maxConcurrentApplies: config.maxConcurrentApplies,
        registrationDeadline: new Date(config.registrationDeadline).toISOString(),
      });
      toast.show('Đã lưu cấu hình ghép nhóm.');
      reloadSpaces();
      void loadData();
    } catch (err) {
      toast.show(errorMessage(err), 'error');
    } finally {
      setSavingConfig(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !space) return;
    setImporting(true);
    setImportErrors([]);
    setImportResult(null);
    try {
      const parsed = await readFapFile(file);
      if (parsed.errors.length > 0) {
        setImportErrors(parsed.errors);
        toast.show(`File có ${parsed.errors.length} dòng sai. Vui lòng sửa rồi tải lên lại.`, 'error');
        return;
      }
      if (parsed.students.length === 0) {
        toast.show('File không có sinh viên nào.', 'error');
        return;
      }
      const imported = await workspaceApi.importFap(
        space.id,
        parsed.students.map((s) => ({ ...s, cohort: s.cohort ?? '' }))
      );
      setImportResult(
        `Đã nhập ${imported} sinh viên từ file "${file.name}" (${parsed.students.length} dòng hợp lệ). Sinh viên đăng nhập bằng tài khoản Google @fpt.edu.vn có trong danh sách.`
      );
      toast.show(`Đã nhập ${imported} sinh viên.`);
      reloadSpaces();
      await loadData();
    } catch (err) {
      toast.show(errorMessage(err, 'Không đọc được file.'), 'error');
    } finally {
      setImporting(false);
    }
  };

  const handleGenerateRooms = async () => {
    if (!space) return;
    setGenerating(true);
    try {
      const res = await workspaceApi.generateRooms(space.id);
      toast.show(`Đã tạo ${res.totalRoomsGenerated} phòng trống. Không gian chuyển sang trạng thái mở đăng ký.`);
      reloadSpaces();
      await loadData();
    } catch (err) {
      toast.show(errorMessage(err), 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleCloseRegistration = async () => {
    if (!space) return;
    if (!window.confirm('Đóng đăng ký tự nguyện? Sau khi đóng, sinh viên không tự vào phòng được nữa và bạn chuyển sang bước điều phối.')) return;
    setClosing(true);
    try {
      await workspaceApi.closeRegistration(space.id);
      toast.show('Đã đóng đăng ký. Chuyển sang trang Điều phối sinh viên lẻ để phân bổ.');
      reloadSpaces();
    } catch (err) {
      toast.show(errorMessage(err), 'error');
    } finally {
      setClosing(false);
    }
  };

  const handleDelete = async () => {
    if (!space) return;
    if (!window.confirm(`Xóa không gian "${space.name}"? Chỉ xóa được khi còn ở bản nháp.`)) return;
    setDeleting(true);
    try {
      await workspaceApi.deleteSpace(space.id);
      toast.show('Đã xóa không gian môn học.');
      reloadSpaces();
    } catch (err) {
      toast.show(errorMessage(err), 'error');
    } finally {
      setDeleting(false);
    }
  };

  const header = (
    <PageHeader
      section="Điều phối & Học kỳ"
      title="Quản lý Không gian Môn học & Đồng bộ FAP"
      description="Thiết lập thông số nhóm, tải danh sách sinh viên đủ điều kiện từ FAP và khởi tạo phòng trống cho học kỳ."
      actions={
        <Button variant="outline" icon={<Plus size={16} />} onClick={() => setCreateOpen(true)}>
          Tạo không gian mới
        </Button>
      }
    />
  );

  const createModal = (
    <CreateSpaceModal
      open={createOpen}
      onClose={() => setCreateOpen(false)}
      onCreated={(created) => {
        setCreateOpen(false);
        selectSpace(created.id);
        reloadSpaces();
        toast.show(`Đã tạo không gian ${created.name}. Bước tiếp theo: tải danh sách sinh viên FAP.`);
      }}
    />
  );

  if (!space) {
    return (
      <PageShell>
        {toast.node}
        {header}
        <NoSpaceState
          loading={spacesLoading}
          error={spacesError}
          role={user?.role}
          action={
            !spacesLoading && !spacesError ? (
              <Button icon={<Plus size={16} />} onClick={() => setCreateOpen(true)}>
                Tạo không gian môn học
              </Button>
            ) : undefined
          }
        />
        {createModal}
      </PageShell>
    );
  }

  const phase = SPACE_PHASE[space.status];

  return (
    <PageShell>
      {toast.node}
      {header}

      {/* Chọn không gian */}
      {spaces.length > 1 && (
        <div style={{ display: 'flex', gap: 10, marginBottom: '1.5rem', flexWrap: 'wrap' }}>
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
                  fontSize: 14.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: active ? '1px solid var(--accent-color, #F26F21)' : '1px solid var(--border-light, #E2E8F0)',
                  background: active ? 'var(--accent-gradient, var(--accent-color, #F26F21))' : 'var(--bg-card, #FFFFFF)',
                  color: active ? '#FFFFFF' : 'var(--text-muted, #64748B)',
                }}
              >
                {s.semesterCode} • {s.subjectCode} — {s.name}
              </button>
            );
          })}
        </div>
      )}

      {/* Tiến trình 4 giai đoạn (lấy từ trạng thái thật của không gian) */}
      <Card style={{ marginBottom: '1.75rem' }} padding={26}>
        <CardTitle
          title="Tiến trình 4 Giai đoạn Vòng đời Học kỳ"
          subtitle={`${space.semesterCode} • ${space.subjectCode} — ${space.name}`}
          right={<Pill dot="var(--accent-color, #F26F21)">Giai đoạn {phase}: {SPACE_STATUS_LABEL[space.status]}</Pill>}
        />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          {PHASES.map((item) => {
            const active = phase === item.phase;
            const passed = phase > item.phase;
            return (
              <div
                key={item.phase}
                style={{
                  padding: '14px 16px',
                  borderRadius: 12,
                  border: active ? '2px solid var(--accent-color, #F26F21)' : '1px solid var(--border-light, #E2E8F0)',
                  backgroundColor: active ? 'var(--bg-card, #FFFFFF)' : 'var(--bg-subtle, #F8FAFC)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: active ? 'var(--text-main, #0F172A)' : 'var(--text-secondary, #334155)' }}>
                    {item.title}
                  </span>
                  {passed ? (
                    <CheckCircle2 size={16} color="#10B981" />
                  ) : active ? (
                    <span style={{ width: 8, height: 8, borderRadius: 999, backgroundColor: 'var(--accent-color, #F26F21)' }} />
                  ) : null}
                </div>
                <p style={{ fontSize: 14, color: 'var(--text-muted, #64748B)', margin: 0 }}>{item.desc}</p>
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
          {space.status === 'Open' && (
            <Button variant="dark" icon={<Lock size={15} />} loading={closing} onClick={handleCloseRegistration}>
              Đóng đăng ký tự nguyện
            </Button>
          )}
          {space.status === 'Draft' && (
            <Button variant="danger" icon={<Trash2 size={15} />} loading={deleting} onClick={handleDelete}>
              Xóa không gian (bản nháp)
            </Button>
          )}
          <Button variant="ghost" icon={<RefreshCw size={15} />} onClick={() => { reloadSpaces(); void loadData(); }}>
            Tải lại
          </Button>
        </div>
      </Card>

      {dataError && <Banner tone="error">{dataError}</Banner>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(480px, 100%), 1fr))', gap: '1.5rem', marginBottom: '1.75rem' }}>
        {/* Cấu hình */}
        <Card padding={26} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <CardTitle icon={<Settings size={18} />} title={`Cấu hình Thông số Ghép nhóm (${space.subjectCode})`} subtitle="Sĩ số và hạn ngạch nộp đơn trong học kỳ" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Field label="Sĩ số tối đa mỗi nhóm" hint="Từ 4 đến 6 (mặc định 5)">
                <input type="number" min={4} max={6} disabled={isLocked} style={fieldStyle} value={config.maxMembersPerGroup} onChange={(e) => setConfig({ ...config, maxMembersPerGroup: Number(e.target.value) })} />
              </Field>
              <Field label="Hệ số phòng dự phòng" hint="Từ 1.0 đến 2.0 (mặc định 1.2)">
                <input type="number" min={1} max={2} step={0.1} disabled={isLocked} style={fieldStyle} value={config.bufferRatio} onChange={(e) => setConfig({ ...config, bufferRatio: Number(e.target.value) })} />
              </Field>
              <Field label="Giới hạn đơn chờ cùng lúc" hint="Đơn tối đa / sinh viên (1–5)">
                <input type="number" min={1} max={5} disabled={isLocked} style={fieldStyle} value={config.maxConcurrentApplies} onChange={(e) => setConfig({ ...config, maxConcurrentApplies: Number(e.target.value) })} />
              </Field>
              <Field label="Hạn đóng đăng ký tự nguyện">
                <div style={{ position: 'relative' }}>
                  <Calendar size={15} color="#64748B" style={{ position: 'absolute', left: 11, top: 13 }} />
                  <input type="datetime-local" disabled={isLocked} style={{ ...fieldStyle, paddingLeft: 32, fontSize: 14 }} value={config.registrationDeadline} onChange={(e) => setConfig({ ...config, registrationDeadline: e.target.value })} />
                </div>
              </Field>
            </div>
            <div style={{ marginTop: 14, padding: '12px 16px', borderRadius: 12, backgroundColor: 'var(--bg-subtle, #F8FAFC)', border: '1px solid var(--border-light, #E2E8F0)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--text-main, #0F172A)' }}>Ngưỡng tối thiểu thành lập nhóm</span>
                <Pill>Tự động tính: {threshold} thành viên</Pill>
              </div>
              <p style={{ fontSize: 13.5, color: 'var(--text-muted, #64748B)', margin: 0, lineHeight: 1.5 }}>
                Khi đủ {threshold} người, phòng khóa cổng vào thẳng và trở thành Nhóm chính thức (chỉ nhận thêm thành viên qua đơn ứng tuyển).
              </p>
            </div>
          </div>
          <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid var(--border-subtle, #F1F5F9)' }}>
            <Button block icon={<Save size={16} />} loading={savingConfig} disabled={isLocked} onClick={handleSaveConfig}>
              Lưu cấu hình thông số
            </Button>
          </div>
        </Card>

        {/* Phòng */}
        <Card padding={26}>
          <CardTitle icon={<Hash size={18} />} title="Khởi tạo Phòng trống Hàng loạt" subtitle="Số phòng tính theo số sinh viên đã tải lên" />
          <div style={{ padding: '16px 18px', borderRadius: 14, backgroundColor: 'var(--bg-subtle, #F8FAFC)', border: '1px solid var(--border-light, #E2E8F0)', marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted, #475569)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Công thức tính số phòng
            </div>
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, fontVariantNumeric: 'tabular-nums' }}>
              <Pill>{totalStudents} SV đủ điều kiện</Pill>
              <b style={{ color: '#64748B' }}>÷</b>
              <Pill>{config.maxMembersPerGroup} người/nhóm</Pill>
              <b style={{ color: '#64748B' }}>×</b>
              <Pill>Hệ số {config.bufferRatio}</Pill>
              <b style={{ color: '#64748B' }}>=</b>
              <Pill tone="accent">{computedRooms} phòng</Pill>
            </div>
          </div>

          {totalStudents === 0 && <Banner tone="info">Cần tải danh sách sinh viên FAP trước khi tạo phòng.</Banner>}
          {roomsInUse && <Banner tone="info">Đã có sinh viên vào phòng nên không tạo lại phòng được nữa.</Banner>}

          <Button
            block
            icon={<Sparkles size={16} />}
            loading={generating}
            disabled={isLocked || totalStudents === 0 || roomsInUse}
            onClick={handleGenerateRooms}
            style={{ marginBottom: 16 }}
          >
            {rooms.length > 0 ? `Tạo lại ${computedRooms} phòng trống` : `Khởi tạo ${computedRooms} phòng trống`}
          </Button>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-muted, #64748B)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Danh sách phòng hiện có ({rooms.length})
            </span>
          </div>
          {dataLoading && rooms.length === 0 ? (
            <StateBox kind="loading" />
          ) : rooms.length === 0 ? (
            <StateBox kind="empty" message="Chưa có phòng nào." />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10, maxHeight: 320, overflowY: 'auto' }}>
              {rooms.map((r) => (
                <div
                  key={r.id}
                  title={`${ROOM_STATUS_LABEL[r.status] ?? r.status}${r.leaderName ? ` • Trưởng nhóm: ${r.leaderName}` : ''}`}
                  style={{
                    padding: '9px 12px',
                    borderRadius: 10,
                    border: '1px solid var(--border-light, #E2E8F0)',
                    backgroundColor: 'var(--bg-subtle, #F8FAFC)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 6,
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13.5, fontWeight: 700, color: 'var(--text-main, #0F172A)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    <span style={{ width: 6, height: 6, borderRadius: 999, backgroundColor: ROOM_STATUS_DOT[r.status] ?? '#94A3B8', flexShrink: 0 }} />
                    {r.roomCode ?? r.name}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted, #475569)', fontVariantNumeric: 'tabular-nums' }}>
                    {r.memberCount}/{r.maxMembers}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Danh sách sinh viên FAP */}
      <Card>
        <CardTitle
          icon={<Database size={20} />}
          title="Danh sách Sinh viên Đủ điều kiện Học phần (FAP)"
          subtitle={`${space.semesterCode} • ${space.subjectCode} — ${totalStudents} sinh viên, ${completedProfiles} đã hoàn tất hồ sơ`}
          right={
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <input ref={fileRef} type="file" accept=".csv,.xls,.xml" style={{ display: 'none' }} onChange={handleImport} />
              <Button variant="dark" icon={<Upload size={15} />} loading={importing} disabled={isLocked} onClick={() => fileRef.current?.click()}>
                Tải lên file CSV / Excel FAP
              </Button>
              {isLocalhost && (
                <a
                  href="http://localhost:8025"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    height: 42,
                    padding: '0 15px',
                    borderRadius: 12,
                    border: '1px solid rgba(0, 84, 166, 0.25)',
                    backgroundColor: 'rgba(0, 84, 166, 0.08)',
                    color: '#0054A6',
                    fontSize: 14.5,
                    fontWeight: 650,
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 7,
                  }}
                >
                  <ExternalLink size={15} />
                  Hộp thư MailHog
                </a>
              )}
            </div>
          }
        />

        <p style={{ fontSize: 13.5, color: 'var(--text-muted, #64748B)', margin: '-6px 0 14px 0' }}>
          Nhận file <b>.xls</b> xuất từ FAP (cột Class, RollNumber, Email, FullName) hoặc file <b>.csv</b> với tiêu đề{' '}
          <code>studentCode,email,fullName,major,cohort,classCode</code>. Tải lại cùng danh sách sẽ không tạo trùng.
        </p>

        {importResult && <Banner tone="success">{importResult}</Banner>}
        {importErrors.length > 0 && (
          <Banner tone="error">
            <div style={{ fontWeight: 700, marginBottom: 4 }}>File có {importErrors.length} dòng sai, chưa nhập sinh viên nào:</div>
            <ul style={{ margin: 0, paddingLeft: 18, maxHeight: 160, overflowY: 'auto' }}>
              {importErrors.slice(0, 50).map((msg) => (
                <li key={msg}>{msg}</li>
              ))}
            </ul>
          </Banner>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
          <div style={{ position: 'relative', width: 'min(340px, 100%)' }}>
            <Search size={15} style={{ position: 'absolute', left: 12, top: 13, color: 'var(--text-light, #94A3B8)' }} />
            <input
              type="text"
              placeholder="Tìm theo MSSV, họ tên, email, ngành, lớp..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              style={{ ...fieldStyle, paddingLeft: '2.25rem', backgroundColor: 'var(--bg-subtle, #F8FAFC)' }}
            />
          </div>
          <div style={{ fontSize: 14.5, color: 'var(--text-muted, #64748B)' }}>
            Hiển thị <b style={{ color: 'var(--text-main, #0F172A)' }}>{filtered.length ? (page - 1) * PAGE_SIZE + 1 : 0} - {Math.min(page * PAGE_SIZE, filtered.length)}</b> trong{' '}
            <b style={{ color: 'var(--text-main, #0F172A)' }}>{filtered.length}</b> sinh viên
          </div>
        </div>

        {dataLoading && students.length === 0 ? (
          <StateBox kind="loading" />
        ) : students.length === 0 ? (
          <StateBox kind="empty" title="Chưa có sinh viên" message="Tải file danh sách lớp từ FAP lên để thêm sinh viên đủ điều kiện vào không gian này." />
        ) : (
          <Table headers={['MSSV', 'Họ và tên', 'Email trường', 'Ngành', 'Khóa', 'Lớp FAP', 'Hồ sơ 5 kỹ năng']}>
            {pageItems.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ ...td, textAlign: 'center', color: 'var(--text-muted, #64748B)', padding: 28 }}>
                  Không có sinh viên khớp từ khóa tìm kiếm.
                </td>
              </tr>
            ) : (
              pageItems.map((s) => (
                <tr key={s.id}>
                  <td style={{ ...td, fontFamily: 'var(--font-mono, monospace)', fontWeight: 800, color: '#0054A6' }}>{s.studentCode}</td>
                  <td style={{ ...td, fontWeight: 700 }}>{s.fullName}</td>
                  <td style={{ ...td, color: 'var(--text-muted, #64748B)' }}>{s.email}</td>
                  <td style={td}>{s.major}</td>
                  <td style={{ ...td, color: 'var(--text-muted, #64748B)', fontWeight: 600 }}>{s.cohort || '—'}</td>
                  <td style={td}>{s.classCode ? <Pill>{s.classCode}</Pill> : '—'}</td>
                  <td style={td}>
                    {s.isProfileCompleted ? <Pill dot="#10B981">Đã hoàn tất</Pill> : <Pill dot="#F59E0B">Chưa hoàn tất</Pill>}
                  </td>
                </tr>
              ))
            )}
          </Table>
        )}

        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, flexWrap: 'wrap', gap: 10 }}>
            <span style={{ fontSize: 14.5, color: 'var(--text-muted, #64748B)' }}>
              Trang <b style={{ color: 'var(--text-main, #0F172A)' }}>{page}</b> / {totalPages}
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button variant="outline" style={{ height: 34 }} icon={<ChevronLeft size={16} />} disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                Trang trước
              </Button>
              <Button variant="outline" style={{ height: 34 }} disabled={page === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                Trang sau <ChevronRight size={16} />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {createModal}
    </PageShell>
  );
};

export default ModeratorSpacesPage;
