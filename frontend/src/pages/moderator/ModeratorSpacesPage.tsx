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
  spaceLabel,
  SPACE_PHASE,
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
  InfoTip,
  fieldStyle,
  Table,
  td,
  useToast,
  useConfirm,
  ROOM_STATUS_DOT,
} from '../../components/workspace/ui';

const PAGE_SIZE = 10;
const PHASES = ['Bản nháp', 'Mở đăng ký', 'Đóng đăng ký', 'Chốt sổ'];
const isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);

/** ISO (UTC) → giá trị cho ô datetime-local theo giờ máy người dùng. */
const toLocalInput = (iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

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
    // Backend bắt buộc hạn đăng ký và phải sau thời điểm hiện tại: mặc định 14 ngày tới.
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
      const space = await workspaceApi.createSpace({
        ...form,
        semesterCode: form.semesterCode.trim().toUpperCase(),
        subjectCode: subject,
        name: form.name.trim() || subject,
        registrationDeadline: new Date(form.registrationDeadline).toISOString(),
      });
      onCreated(space);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Tạo không gian môn học">
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {error && <Banner tone="error">{error}</Banner>}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Học kỳ">
            <input style={fieldStyle} value={form.semesterCode} onChange={(e) => setForm({ ...form, semesterCode: e.target.value })} required />
          </Field>
          <Field label="Mã môn">
            <input style={fieldStyle} value={form.subjectCode} onChange={(e) => setForm({ ...form, subjectCode: e.target.value })} required />
          </Field>
        </div>
        <Field label="Tên môn (không bắt buộc)">
          <input style={fieldStyle} value={form.name} placeholder="Trải nghiệm Khởi nghiệp 1" onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <Field label="Sĩ số tối đa">
            <input type="number" min={4} max={6} style={fieldStyle} value={form.maxMembersPerGroup} onChange={(e) => setForm({ ...form, maxMembersPerGroup: Number(e.target.value) })} />
          </Field>
          <Field label="Hệ số dự phòng">
            <input type="number" min={1} max={2} step={0.1} style={fieldStyle} value={form.bufferRatio} onChange={(e) => setForm({ ...form, bufferRatio: Number(e.target.value) })} />
          </Field>
          <Field label="Đơn chờ / SV">
            <input type="number" min={1} max={5} style={fieldStyle} value={form.maxConcurrentApplies} onChange={(e) => setForm({ ...form, maxConcurrentApplies: Number(e.target.value) })} />
          </Field>
        </div>
        <Field label="Hạn đăng ký">
          <input type="datetime-local" required style={fieldStyle} value={form.registrationDeadline} onChange={(e) => setForm({ ...form, registrationDeadline: e.target.value })} />
        </Field>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 6 }}>
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

// ── Trang chính ─────────────────────────────────────────────────────────────

export const ModeratorSpacesPage: React.FC = () => {
  const { user } = useAuth();
  const { spaces, space, loading: spacesLoading, error: spacesError } = useSelectedSpace();
  const toast = useToast();
  const dialog = useConfirm();
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
  const completedProfiles = students.filter((s) => s.isProfileCompleted).length;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) => [s.studentCode, s.fullName, s.email, s.major, s.classCode ?? ''].some((v) => v.toLowerCase().includes(q)));
  }, [students, search]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSaveConfig = async () => {
    if (!space) return;
    if (!config.registrationDeadline) {
      toast.show('Vui lòng chọn hạn đăng ký.', 'error');
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
      toast.show('Đã lưu cấu hình.');
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
    try {
      const parsed = await readFapFile(file);
      if (parsed.errors.length > 0) {
        setImportErrors(parsed.errors);
        toast.show(`File có ${parsed.errors.length} dòng sai, chưa nhập ai.`, 'error');
        return;
      }
      if (parsed.students.length === 0) {
        toast.show('File không có sinh viên nào.', 'error');
        return;
      }
      const imported = await workspaceApi.importFap(space.id, parsed.students.map((s) => ({ ...s, cohort: s.cohort ?? '' })));
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
      toast.show(`Đã tạo ${res.totalRoomsGenerated} phòng. Đăng ký đã mở.`);
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
    const ok = await dialog.confirm({
      title: 'Đóng đăng ký?',
      message: 'Sinh viên sẽ không tự vào phòng được nữa. Sau đó bạn phân bổ sinh viên còn lại ở trang Điều phối.',
      confirmLabel: 'Đóng đăng ký',
    });
    if (ok === null) return;
    setClosing(true);
    try {
      await workspaceApi.closeRegistration(space.id);
      toast.show('Đã đóng đăng ký.');
      reloadSpaces();
    } catch (err) {
      toast.show(errorMessage(err), 'error');
    } finally {
      setClosing(false);
    }
  };

  const handleDelete = async () => {
    if (!space) return;
    const ok = await dialog.confirm({
      title: `Xóa ${spaceLabel(space)}?`,
      message: 'Không gian và danh sách sinh viên đã tải lên sẽ bị xóa.',
      confirmLabel: 'Xóa',
      danger: true,
    });
    if (ok === null) return;
    setDeleting(true);
    try {
      await workspaceApi.deleteSpace(space.id);
      toast.show('Đã xóa không gian.');
      reloadSpaces();
    } catch (err) {
      toast.show(errorMessage(err), 'error');
    } finally {
      setDeleting(false);
    }
  };

  const createModal = (
    <CreateSpaceModal
      open={createOpen}
      onClose={() => setCreateOpen(false)}
      onCreated={(created) => {
        setCreateOpen(false);
        selectSpace(created.id);
        reloadSpaces();
        toast.show(`Đã tạo ${spaceLabel(created)}.`);
      }}
    />
  );

  if (!space) {
    const steps = ['Tạo không gian môn học', 'Tải danh sách sinh viên FAP', 'Tạo phòng để mở đăng ký'];
    return (
      <PageShell>
        {toast.node}
        <PageHeader title="Học kỳ & Phòng" />
        {spacesLoading || spacesError ? (
          <NoSpaceState loading={spacesLoading} error={spacesError} role={user?.role} />
        ) : (
          <StateBox
            kind="empty"
            title="Bắt đầu học kỳ mới"
            message={
              <ol style={{ display: 'inline-flex', flexDirection: 'column', gap: 6, textAlign: 'left', margin: '4px 0 0 0', paddingLeft: 20 }}>
                {steps.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ol>
            }
            action={
              <Button icon={<Plus size={16} />} onClick={() => setCreateOpen(true)}>
                Tạo không gian môn học
              </Button>
            }
          />
        )}
        {createModal}
      </PageShell>
    );
  }

  const phase = SPACE_PHASE[space.status];

  return (
    <PageShell>
      {toast.node}
      {dialog.node}
      <PageHeader
        title="Học kỳ & Phòng"
        actions={
          <>
            <Button variant="ghost" icon={<RefreshCw size={15} />} onClick={() => { reloadSpaces(); void loadData(); }}>
              Tải lại
            </Button>
            <Button variant="outline" icon={<Plus size={16} />} onClick={() => setCreateOpen(true)}>
              Không gian mới
            </Button>
          </>
        }
      />

      {spaces.length > 1 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          {spaces.map((s) => {
            const active = s.id === space.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => selectSpace(s.id)}
                style={{
                  height: 36,
                  padding: '0 14px',
                  borderRadius: 999,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: active ? '1px solid var(--accent-color, #F26F21)' : '1px solid var(--border-light, #E2E8F0)',
                  background: active ? 'var(--accent-color, #F26F21)' : 'var(--bg-card, #FFFFFF)',
                  color: active ? '#FFFFFF' : 'var(--text-muted, #64748B)',
                }}
              >
                {s.semesterCode} · {spaceLabel(s)}
              </button>
            );
          })}
        </div>
      )}

      {/* Tiến trình */}
      <Card style={{ marginBottom: '1.5rem' }} padding={20}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 280, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {PHASES.map((title, i) => {
              const step = i + 1;
              const active = phase === step;
              const passed = phase > step;
              return (
                <div key={title}>
                  <div style={{ height: 4, borderRadius: 999, marginBottom: 8, backgroundColor: passed || active ? 'var(--accent-color, #F26F21)' : 'var(--border-light, #E2E8F0)' }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13.5, fontWeight: active ? 700 : 500, color: active ? 'var(--text-main, #0F172A)' : 'var(--text-muted, #64748B)' }}>
                    {passed && <CheckCircle2 size={14} color="#10B981" />}
                    {step}. {title}
                  </div>
                </div>
              );
            })}
          </div>
          {space.status === 'Open' && (
            <Button variant="dark" icon={<Lock size={15} />} loading={closing} onClick={handleCloseRegistration}>
              Đóng đăng ký
            </Button>
          )}
        </div>
      </Card>

      {dataError && <Banner tone="error">{dataError}</Banner>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(460px, 100%), 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Cấu hình */}
        <Card style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <CardTitle icon={<Settings size={18} />} title="Cấu hình nhóm" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Field label="Sĩ số tối đa">
                <input type="number" min={4} max={6} disabled={isLocked} style={fieldStyle} value={config.maxMembersPerGroup} onChange={(e) => setConfig({ ...config, maxMembersPerGroup: Number(e.target.value) })} />
              </Field>
              <Field label="Hệ số dự phòng">
                <input type="number" min={1} max={2} step={0.1} disabled={isLocked} style={fieldStyle} value={config.bufferRatio} onChange={(e) => setConfig({ ...config, bufferRatio: Number(e.target.value) })} />
              </Field>
              <Field label="Đơn chờ tối đa / SV">
                <input type="number" min={1} max={5} disabled={isLocked} style={fieldStyle} value={config.maxConcurrentApplies} onChange={(e) => setConfig({ ...config, maxConcurrentApplies: Number(e.target.value) })} />
              </Field>
              <Field label="Hạn đăng ký">
                <input type="datetime-local" disabled={isLocked} style={{ ...fieldStyle, fontSize: 14 }} value={config.registrationDeadline} onChange={(e) => setConfig({ ...config, registrationDeadline: e.target.value })} />
              </Field>
            </div>
            <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'var(--text-secondary, #334155)' }}>
              Ngưỡng thành lập nhóm: <b>{threshold} người</b>
              <InfoTip text={`Phòng đủ ${threshold} người thì thành nhóm chính thức, sau đó chỉ nhận thêm thành viên qua đơn ứng tuyển.`} />
            </div>
          </div>
          <div style={{ marginTop: 18 }}>
            <Button block icon={<Save size={16} />} loading={savingConfig} disabled={isLocked} onClick={handleSaveConfig}>
              Lưu cấu hình
            </Button>
          </div>
        </Card>

        {/* Phòng */}
        <Card>
          <CardTitle
            icon={<Hash size={18} />}
            title={`Phòng (${rooms.length})`}
            right={<InfoTip text="Số phòng = số sinh viên ÷ sĩ số tối đa × hệ số dự phòng (làm tròn lên). Tạo phòng xong thì đăng ký tự mở." />}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', fontSize: 14, color: 'var(--text-muted, #64748B)', marginBottom: 14, fontVariantNumeric: 'tabular-nums' }}>
            {totalStudents} SV ÷ {config.maxMembersPerGroup} × {config.bufferRatio} = <Pill tone="accent">{computedRooms} phòng</Pill>
          </div>
          <Button
            block
            icon={<Sparkles size={16} />}
            loading={generating}
            disabled={isLocked || totalStudents === 0 || roomsInUse}
            onClick={handleGenerateRooms}
            style={{ marginBottom: 8 }}
          >
            {rooms.length > 0 ? `Tạo lại ${computedRooms} phòng` : `Tạo ${computedRooms} phòng`}
          </Button>
          {(totalStudents === 0 || roomsInUse) && (
            <div style={{ fontSize: 13, color: 'var(--text-muted, #64748B)', marginBottom: 8 }}>
              {totalStudents === 0 ? 'Cần tải danh sách sinh viên trước.' : 'Đã có sinh viên vào phòng nên không tạo lại được.'}
            </div>
          )}

          {rooms.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8, maxHeight: 300, overflowY: 'auto', marginTop: 12 }}>
              {rooms.map((r) => (
                <div
                  key={r.id}
                  title={`${ROOM_STATUS_LABEL[r.status] ?? r.status}${r.leaderName ? ` • Trưởng nhóm: ${r.leaderName}` : ''}`}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 10,
                    border: '1px solid var(--border-light, #E2E8F0)',
                    backgroundColor: 'var(--bg-subtle, #F8FAFC)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 6,
                    fontSize: 13,
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 650, color: 'var(--text-main, #0F172A)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    <span style={{ width: 6, height: 6, borderRadius: 999, backgroundColor: ROOM_STATUS_DOT[r.status] ?? '#94A3B8', flexShrink: 0 }} />
                    {r.roomCode ?? r.name}
                  </span>
                  <span style={{ color: 'var(--text-muted, #64748B)', fontVariantNumeric: 'tabular-nums' }}>
                    {r.memberCount}/{r.maxMembers}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Sinh viên FAP */}
      <Card>
        <CardTitle
          icon={<Database size={18} />}
          title={`Sinh viên FAP (${totalStudents})`}
          subtitle={totalStudents > 0 ? `${completedProfiles}/${totalStudents} đã hoàn tất hồ sơ` : undefined}
          right={
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <InfoTip text="Nhận file .xlsx / .xls xuất từ FAP (cột Class, RollNumber, Email, FullName) hoặc .csv với tiêu đề studentCode,email,fullName,major,cohort,classCode. Tải lại cùng danh sách không tạo trùng." />
              <input ref={fileRef} type="file" accept=".csv,.xls,.xlsx,.xml" style={{ display: 'none' }} onChange={handleImport} />
              <Button variant="dark" icon={<Upload size={15} />} loading={importing} disabled={isLocked} onClick={() => fileRef.current?.click()}>
                Tải file FAP
              </Button>
              {isLocalhost && (
                <a href="http://localhost:8025" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                  <Button variant="outline" icon={<ExternalLink size={15} />}>
                    MailHog
                  </Button>
                </a>
              )}
            </div>
          }
        />

        {importErrors.length > 0 && (
          <Banner tone="error">
            <div style={{ fontWeight: 700, marginBottom: 4 }}>{importErrors.length} dòng sai, chưa nhập ai:</div>
            <ul style={{ margin: 0, paddingLeft: 18, maxHeight: 160, overflowY: 'auto' }}>
              {importErrors.slice(0, 50).map((msg) => (
                <li key={msg}>{msg}</li>
              ))}
            </ul>
          </Banner>
        )}

        {dataLoading && students.length === 0 ? (
          <StateBox kind="loading" />
        ) : students.length === 0 ? (
          <StateBox kind="empty" message="Chưa có sinh viên. Bấm “Tải file FAP” để thêm." />
        ) : (
          <>
            <div style={{ position: 'relative', width: 'min(320px, 100%)', marginBottom: 12 }}>
              <Search size={15} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-light, #94A3B8)' }} />
              <input
                type="text"
                placeholder="Tìm MSSV, tên, lớp..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                style={{ ...fieldStyle, height: 40, paddingLeft: '2.25rem' }}
              />
            </div>
            <Table headers={['MSSV', 'Họ tên', 'Email', 'Ngành', 'Khóa', 'Lớp', 'Hồ sơ']}>
              {pageItems.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ ...td, textAlign: 'center', color: 'var(--text-muted, #64748B)', padding: 24 }}>
                    Không tìm thấy.
                  </td>
                </tr>
              ) : (
                pageItems.map((s) => (
                  <tr key={s.id}>
                    <td style={{ ...td, fontFamily: 'var(--font-mono, monospace)', fontWeight: 700, color: '#0054A6', whiteSpace: 'nowrap' }}>{s.studentCode}</td>
                    <td style={{ ...td, fontWeight: 600, whiteSpace: 'nowrap' }}>{s.fullName}</td>
                    <td style={{ ...td, color: 'var(--text-muted, #64748B)' }}>{s.email}</td>
                    <td style={td}>{s.major}</td>
                    <td style={{ ...td, color: 'var(--text-muted, #64748B)' }}>{s.cohort || '—'}</td>
                    <td style={{ ...td, whiteSpace: 'nowrap' }}>{s.classCode || '—'}</td>
                    <td style={td}>{s.isProfileCompleted ? <Pill dot="#10B981">Xong</Pill> : <Pill dot="#F59E0B">Chưa</Pill>}</td>
                  </tr>
                ))
              )}
            </Table>
            {totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 14, color: 'var(--text-muted, #64748B)' }}>
                  {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} / {filtered.length}
                </span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <Button variant="outline" style={{ height: 34, padding: '0 10px' }} aria-label="Trang trước" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                    <ChevronLeft size={16} />
                  </Button>
                  <Button variant="outline" style={{ height: 34, padding: '0 10px' }} aria-label="Trang sau" disabled={page === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                    <ChevronRight size={16} />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      {/* Thao tác nguy hiểm để riêng ở cuối trang */}
      {space.status === 'Draft' && (
        <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
          <Button variant="ghost" style={{ color: '#B91C1C' }} icon={<Trash2 size={15} />} loading={deleting} onClick={handleDelete}>
            Xóa không gian này
          </Button>
        </div>
      )}

      {createModal}
    </PageShell>
  );
};

export default ModeratorSpacesPage;
