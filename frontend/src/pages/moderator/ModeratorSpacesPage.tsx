import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { gsap } from 'gsap';
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
  X,
  Users,
  ArrowLeftRight,
  Filter,
  DoorOpen,
  Eye,
  FolderUp,
  LayoutGrid,
  Clock,
  Grid,
  Download,
  FileSpreadsheet,
  FileText,
  RotateCcw,
  Pencil,
  Trash2,
  Globe,
  Calculator,
  Layers,
} from '../../utils/icons';
import { useSelectedSpace, selectSpace, reloadSpaces } from '../../hooks/useSelectedSpace';
import {
  workspaceApi,
  errorMessage,
  SPACE_PHASE,
  type RoomSummary,
  type Space,
  type GroupDetail,
  type CandidateProfile,
  type SpaceStatus,
  type SpaceConfigPayload,
} from '../../api/workspace';
import { readFapFile, parseFapCsv, type ParsedFapCsv } from '../../utils/fapImport';
import { Button, StateBox, useConfirm } from '../../components/workspace/ui';

// ── 5 TRỤ CỘT KỸ NĂNG & THIẾT KẾ ĐẶC TRƯNG FPT ───────────────────────────

const SKILLS = [
  { key: 'techScore', name: 'Tech', color: 'var(--accent-color, #F26F21)' },
  { key: 'managementScore', name: 'Mgt', color: 'var(--accent-color, #F26F21)' },
  { key: 'graphicDesignScore', name: 'Des', color: 'var(--accent-color, #F26F21)' },
  { key: 'marketingScore', name: 'Mkt', color: 'var(--accent-color, #F26F21)' },
  { key: 'saleScore', name: 'Sale', color: 'var(--accent-color, #F26F21)' },
] as const;

type SkillKey = (typeof SKILLS)[number]['key'];

const averageSkills = (profiles: CandidateProfile[]): Record<SkillKey, number> => {
  const result = { techScore: 0, managementScore: 0, graphicDesignScore: 0, marketingScore: 0, saleScore: 0 };
  if (profiles.length === 0) return result;
  for (const { key } of SKILLS) {
    result[key] = Math.round(profiles.reduce((n, p) => n + (p[key] ?? 0), 0) / profiles.length);
  }
  return result;
};

const isDefaultRoomName = (name: string) => /phòng\s*\d+\s*$/i.test(name.trim());

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

interface RoomMemberItem {
  id: string;
  name: string;
  studentCode: string;
  classCode: string;
  major: string;
  role: 'Leader' | 'Member';
  joinedAt: string;
  scores?: {
    techScore: number;
    managementScore: number;
    graphicDesignScore: number;
    marketingScore: number;
    saleScore: number;
  };
}

interface DisplayRoomItem {
  id: string;
  code: string;
  name: string;
  topic?: string;
  topicDesc?: string;
  status: 'Empty' | 'Forming' | 'Recruiting' | 'Closed' | 'Locked';
  currentMembers: number;
  maxMembers: number;
  leaderName?: string | null;
  members: RoomMemberItem[];
  avgSkills?: Record<SkillKey, number>;
}

/** ISO (UTC) → ô datetime-local theo giờ người dùng */
const toLocalInput = (iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const formatDateTime = (iso?: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);

const loadProfiles = async (ids: string[]): Promise<Map<string, CandidateProfile>> => {
  const unique = [...new Set(ids)];
  const chunks: string[][] = [];
  for (let i = 0; i < unique.length; i += 100) chunks.push(unique.slice(i, i + 100));
  const lists = await Promise.all(chunks.map((c) => workspaceApi.getProfiles(c).catch(() => [] as CandidateProfile[])));
  return new Map(lists.flat().map((p) => [p.userId, p]));
};

/** Danh sách lỗi hiện ngay trong modal */
const ModalErrors: React.FC<{ messages: string[] }> = ({ messages }) =>
  messages.length === 0 ? null : (
    <div
      role="alert"
      style={{
        marginBottom: '1rem',
        padding: '0.75rem 1rem',
        borderRadius: '10px',
        background: 'rgba(239, 68, 68, 0.10)',
        border: '1px solid #fecaca',
        color: '#b91c1c',
        fontSize: '0.825rem',
        lineHeight: 1.5,
        overflowWrap: 'anywhere',
      }}
    >
      {messages.slice(0, 5).map((msg, i) => (
        <div key={i}>{msg}</div>
      ))}
      {messages.length > 5 && <div>... và {messages.length - 5} lỗi khác.</div>}
    </div>
  );

// ── POPUP: TẠO KHÔNG GIAN HỌC PHẦN MỚI (CHUẨN NHÁNH CŨ KẾT HỢP FPT IDENTITY) ──

interface CreateSpaceModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (createdSpace: Space, importedCount?: number) => void;
}

const CreateSpaceModal: React.FC<CreateSpaceModalProps> = ({ open, onClose, onCreated }) => {
  const [semesterCode, setSemesterCode] = useState('FA26');
  const [subjectCode, setSubjectCode] = useState('EXE101');
  const [name, setName] = useState('Học kỳ FA26 - EXE101 Khởi nghiệp');
  const [maxMembers, setMaxMembers] = useState(5);
  const [bufferRatio, setBufferRatio] = useState(1.2);
  const [maxApplies, setMaxApplies] = useState(3);
  const [deadline, setDeadline] = useState(() => {
    const d = new Date(Date.now() + 14 * 24 * 3600 * 1000);
    d.setHours(23, 59, 0, 0);
    return toLocalInput(d.toISOString());
  });

  const [rosterFile, setRosterFile] = useState<(ParsedFapCsv & { fileName: string }) | null>(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Tự động gợi ý tên không gian khi mã học kỳ / môn thay đổi
  useEffect(() => {
    if (semesterCode || subjectCode) {
      setName(`Học kỳ ${semesterCode.trim().toUpperCase()} - ${subjectCode.trim().toUpperCase()} Khởi nghiệp`);
    }
  }, [semesterCode, subjectCode]);

  if (!open) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const parsed = await readFapFile(file);
      setRosterFile({ ...parsed, fileName: file.name });
    } catch {
      setErrors(['Không đọc được file. Vui lòng chọn file CSV hoặc Excel hợp lệ.']);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrors([]);

    const sem = semesterCode.trim().toUpperCase();
    const subj = subjectCode.trim().toUpperCase();

    if (!sem) {
      setErrors(['Vui lòng nhập Mã học kỳ (ví dụ FA26)']);
      setSaving(false);
      return;
    }
    if (!subj) {
      setErrors(['Vui lòng nhập Mã môn học (ví dụ EXE101)']);
      setSaving(false);
      return;
    }

    try {
      const newSpace = await workspaceApi.createSpace({
        semesterCode: sem,
        subjectCode: subj,
        name: name.trim() || `${sem} - ${subj}`,
        maxMembersPerGroup: Number(maxMembers),
        bufferRatio: Number(bufferRatio),
        maxConcurrentApplies: Number(maxApplies),
        registrationDeadline: new Date(deadline).toISOString(),
      });

      let imported = 0;
      if (rosterFile && rosterFile.students.length > 0) {
        try {
          imported = await workspaceApi.importFap(
            newSpace.id,
            rosterFile.students.map((s) => ({ ...s, cohort: s.cohort ?? '' }))
          );
        } catch (importErr) {
          console.error('Import FAP error:', importErr);
        }
      }

      onCreated(newSpace, imported);
    } catch (err) {
      setErrors([errorMessage(err, 'Không thể tạo không gian môn học.')]);
    } finally {
      setSaving(false);
    }
  };

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
      onClick={onClose}
    >
      <div
        className="motion-modal-dialog"
        style={{
          backgroundColor: 'var(--bg-card, #FFFFFF)',
          border: '1px solid var(--border-light, #E2E8F0)',
          borderRadius: 20,
          padding: '24px 28px',
          maxWidth: 580,
          width: '100%',
          maxHeight: '92vh',
          overflowY: 'auto',
          boxShadow: '0 20px 45px rgba(0,0,0,0.2)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle, #F1F5F9)', paddingBottom: '14px', marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                backgroundColor: 'rgba(242, 111, 33, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--fpt-orange, #f26f21)',
                flexShrink: 0,
              }}
            >
              <Plus size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-main, #0F172A)' }}>
                Tạo Không gian học phần mới
              </h3>
              <span style={{ fontSize: '13px', color: 'var(--text-muted, #64748B)' }}>
                Thiết lập không gian môn học & cấu hình thuật toán ghép đội
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              border: '1px solid var(--border-light, #E2E8F0)',
              backgroundColor: 'transparent',
              color: 'var(--text-muted, #64748B)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={16} />
          </button>
        </div>

        <ModalErrors messages={[...errors, ...(rosterFile?.errors ?? [])]} />

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Semester & Subject Codes */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary, #334155)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                Mã học kỳ (Semester) <span style={{ color: 'var(--fpt-orange)' }}>*</span>
              </label>
              <input
                type="text"
                value={semesterCode}
                onChange={(e) => setSemesterCode(e.target.value.toUpperCase())}
                placeholder="FA26"
                required
                style={{
                  width: '100%',
                  height: 42,
                  padding: '0 12px',
                  borderRadius: 10,
                  border: '1px solid var(--border-medium, #CBD5E1)',
                  backgroundColor: 'var(--bg-input, #FFFFFF)',
                  color: 'var(--text-main, #0F172A)',
                  fontSize: '14.5px',
                  fontFamily: 'var(--font-mono, monospace)',
                  fontWeight: 700,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary, #334155)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                Mã môn học (Subject) <span style={{ color: 'var(--fpt-orange)' }}>*</span>
              </label>
              <input
                type="text"
                value={subjectCode}
                onChange={(e) => setSubjectCode(e.target.value.toUpperCase())}
                placeholder="EXE101"
                required
                style={{
                  width: '100%',
                  height: 42,
                  padding: '0 12px',
                  borderRadius: 10,
                  border: '1px solid var(--border-medium, #CBD5E1)',
                  backgroundColor: 'var(--bg-input, #FFFFFF)',
                  color: 'var(--text-main, #0F172A)',
                  fontSize: '14.5px',
                  fontFamily: 'var(--font-mono, monospace)',
                  fontWeight: 700,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {/* Space Name */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary, #334155)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              Tên không gian môn học
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Học kỳ FA26 - EXE101 Khởi nghiệp"
              required
              style={{
                width: '100%',
                height: 42,
                padding: '0 12px',
                borderRadius: 10,
                border: '1px solid var(--border-medium, #CBD5E1)',
                backgroundColor: 'var(--bg-input, #FFFFFF)',
                color: 'var(--text-main, #0F172A)',
                fontSize: '14.5px',
                fontWeight: 600,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Config Triad */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(130px, 100%), 1fr))', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: 'var(--text-secondary, #334155)', marginBottom: '6px', textTransform: 'uppercase' }}>
                Max SV/nhóm
              </label>
              <input
                type="number"
                min={4}
                max={6}
                value={maxMembers}
                onChange={(e) => setMaxMembers(Number(e.target.value))}
                required
                style={{
                  width: '100%',
                  height: 40,
                  padding: '0 10px',
                  borderRadius: 10,
                  border: '1px solid var(--border-medium, #CBD5E1)',
                  backgroundColor: 'var(--bg-input, #FFFFFF)',
                  color: 'var(--text-main, #0F172A)',
                  fontSize: '14.5px',
                  fontFamily: 'var(--font-mono, monospace)',
                  fontWeight: 700,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: 'var(--text-secondary, #334155)', marginBottom: '6px', textTransform: 'uppercase' }}>
                Buffer Ratio
              </label>
              <input
                type="number"
                step={0.05}
                min={1.0}
                max={2.0}
                value={bufferRatio}
                onChange={(e) => setBufferRatio(Number(e.target.value))}
                required
                style={{
                  width: '100%',
                  height: 40,
                  padding: '0 10px',
                  borderRadius: 10,
                  border: '1px solid var(--border-medium, #CBD5E1)',
                  backgroundColor: 'var(--bg-input, #FFFFFF)',
                  color: 'var(--text-main, #0F172A)',
                  fontSize: '14.5px',
                  fontFamily: 'var(--font-mono, monospace)',
                  fontWeight: 700,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: 'var(--text-secondary, #334155)', marginBottom: '6px', textTransform: 'uppercase' }}>
                Max Applies
              </label>
              <input
                type="number"
                min={1}
                max={5}
                value={maxApplies}
                onChange={(e) => setMaxApplies(Number(e.target.value))}
                required
                style={{
                  width: '100%',
                  height: 40,
                  padding: '0 10px',
                  borderRadius: 10,
                  border: '1px solid var(--border-medium, #CBD5E1)',
                  backgroundColor: 'var(--bg-input, #FFFFFF)',
                  color: 'var(--text-main, #0F172A)',
                  fontSize: '14.5px',
                  fontFamily: 'var(--font-mono, monospace)',
                  fontWeight: 700,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {/* Registration Deadline */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary, #334155)', marginBottom: '6px', textTransform: 'uppercase' }}>
              <span>Hạn chót đăng ký tự nguyện <strong style={{ color: 'var(--fpt-orange)' }}>*</strong></span>
              <span style={{ fontSize: '12px', color: 'var(--text-muted, #64748B)', textTransform: 'none', fontWeight: 500 }}>
                (Mặc định: 14 ngày tới lúc 23:59)
              </span>
            </label>
            <input
              type="datetime-local"
              value={deadline}
              min={new Date().toISOString().slice(0, 16)}
              onChange={(e) => setDeadline(e.target.value)}
              required
              style={{
                width: '100%',
                height: 42,
                padding: '0 12px',
                borderRadius: 10,
                border: '1px solid var(--border-medium, #CBD5E1)',
                backgroundColor: 'var(--bg-input, #FFFFFF)',
                color: 'var(--text-main, #0F172A)',
                fontSize: '14px',
                fontFamily: 'var(--font-mono, monospace)',
                fontWeight: 600,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: 'var(--text-muted, #64748B)' }}>
              Sau mốc này, hệ thống tự động đóng đăng ký tự do để Moderator tiến hành điều phối sinh viên lẻ qua Matching.
            </p>
          </div>

          {/* FAP CSV Upload Dropzone */}
          <div style={{ padding: '14px', borderRadius: 12, backgroundColor: 'var(--bg-subtle, #F8FAFC)', border: '1px dashed var(--border-medium, #CBD5E1)' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary, #334155)', marginBottom: '8px', textTransform: 'uppercase' }}>
              Danh sách sinh viên FAP (Tùy chọn tải lên ngay)
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls,text/csv"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={saving}
                style={{
                  height: 38,
                  padding: '0 14px',
                  borderRadius: 10,
                  border: '1px solid var(--border-medium, #CBD5E1)',
                  backgroundColor: 'var(--bg-card, #FFFFFF)',
                  color: 'var(--text-main, #0F172A)',
                  fontSize: '13.5px',
                  fontWeight: 650,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <FolderUp size={15} />
                <span>{rosterFile ? 'Chọn file khác' : 'Chọn file FAP (.csv / .xlsx)'}</span>
              </button>

              {rosterFile && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main, #0F172A)' }}>
                    {rosterFile.fileName}
                  </span>
                  <button
                    type="button"
                    onClick={() => setRosterFile(null)}
                    aria-label="Xóa file đã chọn"
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-muted, #64748B)', cursor: 'pointer', padding: 2 }}
                  >
                    <X size={15} />
                  </button>
                </div>
              )}
            </div>

            {rosterFile && (
              <p style={{ margin: '8px 0 0', fontSize: '13px', fontWeight: 650, color: rosterFile.errors.length > 0 ? '#DC2626' : '#059669' }}>
                {rosterFile.errors.length > 0
                  ? `File có ${rosterFile.errors.length} lỗi. Vui lòng sửa hoặc bỏ file để tạo không gian trước.`
                  : `✓ Nhận diện thành công ${rosterFile.students.length} sinh viên đủ điều kiện FAP`}
              </p>
            )}
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', paddingTop: '12px', borderTop: '1px solid var(--border-subtle, #F1F5F9)' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              style={{
                height: 42,
                padding: '0 18px',
                borderRadius: 10,
                border: '1px solid var(--border-medium, #CBD5E1)',
                backgroundColor: 'transparent',
                color: 'var(--text-muted, #64748B)',
                fontSize: '14.5px',
                fontWeight: 650,
                cursor: 'pointer',
              }}
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={saving || (rosterFile?.errors.length ?? 0) > 0}
              style={{
                height: 42,
                padding: '0 20px',
                borderRadius: 10,
                border: 'none',
                background: 'var(--accent-gradient, linear-gradient(135deg, #f26f21 0%, #ea580c 100%))',
                color: '#FFFFFF',
                fontSize: '14.5px',
                fontWeight: 700,
                cursor: saving || (rosterFile?.errors.length ?? 0) > 0 ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.75 : 1,
                boxShadow: '0 2px 8px rgba(242, 111, 33, 0.25)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              {saving ? 'Đang tạo...' : rosterFile && rosterFile.students.length > 0 ? `Tạo và import ${rosterFile.students.length} sinh viên` : 'Tạo Không gian'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

// ── POPUP: XÁC NHẬN KHỞI TẠO ROOM TỰ ĐỘNG (CHUẨN NHÁNH CŨ CÔNG THỨC FPT) ──

interface GenerateRoomsModalProps {
  open: boolean;
  space: Space;
  totalStudents: number;
  computedRooms: number;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

const GenerateRoomsModal: React.FC<GenerateRoomsModalProps> = ({
  open,
  space,
  totalStudents,
  computedRooms,
  onClose,
  onConfirm,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      setError(errorMessage(err, 'Không thể khởi tạo phòng.'));
    } finally {
      setLoading(false);
    }
  };

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
      onClick={onClose}
    >
      <div
        className="motion-modal-dialog"
        style={{
          backgroundColor: 'var(--bg-card, #FFFFFF)',
          border: '1px solid var(--border-light, #E2E8F0)',
          borderRadius: 20,
          padding: '26px',
          maxWidth: 520,
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 20px 45px rgba(0,0,0,0.2)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              backgroundColor: 'var(--bg-tag, #F1F5F9)',
              color: 'var(--text-main, #0F172A)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <LayoutGrid size={22} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-main, #0F172A)' }}>
              Khởi tạo Room tự động ({space.semesterCode}{space.subjectCode})
            </h3>
            <span style={{ fontSize: '13px', color: 'var(--text-muted, #64748B)' }}>
              Áp dụng công thức FPT chuẩn hóa theo sĩ số FAP
            </span>
          </div>
        </div>

        {error && (
          <div style={{ padding: '10px 14px', borderRadius: 10, backgroundColor: 'rgba(239, 68, 68, 0.10)', border: '1px solid #FECACA', color: '#B91C1C', fontSize: '13.5px', marginBottom: '14px' }}>
            {error}
          </div>
        )}

        <div style={{ padding: '14px 16px', borderRadius: 12, backgroundColor: 'var(--bg-subtle, #F8FAFC)', border: '1px solid var(--border-light, #E2E8F0)', marginBottom: '16px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary, #334155)', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '8px' }}>
            Chi tiết tính toán số lượng phòng
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', fontVariantNumeric: 'tabular-nums', marginBottom: '8px' }}>
            <span style={{ padding: '4px 10px', borderRadius: 6, backgroundColor: 'var(--bg-card, #FFFFFF)', border: '1px solid var(--border-medium, #CBD5E1)', fontSize: '13.5px', fontWeight: 700, color: 'var(--text-main, #0F172A)' }}>
              {totalStudents} SV FAP
            </span>
            <span style={{ fontWeight: 700, color: 'var(--text-muted, #64748B)' }}>÷</span>
            <span style={{ padding: '4px 10px', borderRadius: 6, backgroundColor: 'var(--bg-card, #FFFFFF)', border: '1px solid var(--border-medium, #CBD5E1)', fontSize: '13.5px', fontWeight: 700, color: 'var(--text-main, #0F172A)' }}>
              {space.maxMembersPerGroup || 5} Max
            </span>
            <span style={{ fontWeight: 700, color: 'var(--text-muted, #64748B)' }}>×</span>
            <span style={{ padding: '4px 10px', borderRadius: 6, backgroundColor: 'var(--bg-card, #FFFFFF)', border: '1px solid var(--border-medium, #CBD5E1)', fontSize: '13.5px', fontWeight: 700, color: 'var(--text-main, #0F172A)' }}>
              Hệ số {space.bufferRatio || 1.2}
            </span>
            <span style={{ fontWeight: 700, color: 'var(--text-muted, #64748B)' }}>=</span>
            <span style={{ padding: '4px 12px', borderRadius: 6, background: 'var(--accent-gradient, linear-gradient(135deg, #f26f21 0%, #ea580c 100%))', color: '#FFFFFF', fontSize: '14px', fontWeight: 700 }}>
              {computedRooms} Phòng
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted, #64748B)', lineHeight: 1.5 }}>
            Các phòng sẽ được tạo tự động với mã định danh từ <code style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700, color: 'var(--text-main, #0F172A)' }}>{space.semesterCode}{space.subjectCode}-01</code> đến <code style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700, color: 'var(--text-main, #0F172A)' }}>{space.semesterCode}{space.subjectCode}-{computedRooms < 10 ? `0${computedRooms}` : computedRooms}</code>.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px' }}>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            style={{
              height: 40,
              padding: '0 16px',
              borderRadius: 10,
              border: '1px solid var(--border-medium, #CBD5E1)',
              backgroundColor: 'transparent',
              color: 'var(--text-muted, #64748B)',
              fontSize: '14px',
              fontWeight: 650,
              cursor: 'pointer',
            }}
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading}
            style={{
              height: 40,
              padding: '0 18px',
              borderRadius: 10,
              border: 'none',
              background: 'var(--accent-gradient, var(--accent-color, #F26F21))',
              color: '#FFFFFF',
              fontSize: '14px',
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Sparkles size={16} />
            <span>{loading ? 'Đang khởi tạo...' : `Khởi tạo ${computedRooms} phòng ngay`}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

// ── POPUP: XEM CHI TIẾT PHÒNG (INSPECT ROOM MODAL CHO GIÁM SÁT VIÊN) ──────────

interface InspectRoomModalProps {
  room: DisplayRoomItem | null;
  onClose: () => void;
}

const InspectRoomModal: React.FC<InspectRoomModalProps> = ({ room, onClose }) => {
  if (!room) return null;

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
        padding: '1.25rem',
        backdropFilter: 'blur(3px)',
      }}
      onClick={onClose}
    >
      <div
        className="motion-modal-dialog"
        style={{
          backgroundColor: 'var(--bg-card, #FFFFFF)',
          border: '1px solid var(--border-light, #E2E8F0)',
          borderRadius: 20,
          padding: '24px 28px',
          maxWidth: 680,
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 20px 45px rgba(0,0,0,0.2)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid var(--border-subtle, #F1F5F9)', paddingBottom: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700, fontSize: '16px', color: 'var(--text-main, #0F172A)', backgroundColor: 'var(--bg-tag, #F1F5F9)', padding: '2px 10px', borderRadius: 8 }}>
                {room.code}
              </span>
              <span style={{ fontSize: '13.5px', fontWeight: 700, padding: '2px 10px', borderRadius: 999, backgroundColor: 'rgba(5, 150, 105, 0.12)', color: '#059669', fontVariantNumeric: 'tabular-nums' }}>
                Sĩ số: {room.currentMembers}/{room.maxMembers} thành viên
              </span>
            </div>
            <h2 style={{ fontSize: '19px', fontWeight: 700, color: 'var(--text-main, #0F172A)', margin: 0 }}>
              {room.name}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid var(--border-light, #E2E8F0)', backgroundColor: 'transparent', color: 'var(--text-muted, #64748B)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Topic Info */}
        <div style={{ padding: '12px 16px', borderRadius: 12, backgroundColor: 'var(--bg-subtle, #F8FAFC)', border: '1px solid var(--border-light, #E2E8F0)', marginBottom: '16px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted, #64748B)', textTransform: 'uppercase', marginBottom: '4px' }}>
            Đề tài dự án khởi nghiệp:
          </div>
          <div style={{ fontSize: '15.5px', fontWeight: 700, color: 'var(--text-main, #0F172A)' }}>
            {room.topic || 'Chưa đăng ký đề tài chính thức (đang thảo luận tự do)'}
          </div>
          {room.topicDesc && (
            <p style={{ fontSize: '13.5px', color: 'var(--text-muted, #64748B)', margin: '4px 0 0', lineHeight: 1.5 }}>
              {room.topicDesc}
            </p>
          )}
        </div>

        {/* Micro 5-skill bar */}
        {room.avgSkills && (
          <div style={{ padding: '12px 16px', borderRadius: 12, backgroundColor: 'var(--bg-card, #FFFFFF)', border: '1px solid var(--border-light, #E2E8F0)', marginBottom: '16px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary, #334155)', textTransform: 'uppercase', marginBottom: '8px' }}>
              Chỉ số cân bằng 5 Kỹ năng cốt lõi (Trung bình cả nhóm):
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
              {SKILLS.map((sk) => {
                const val = room.avgSkills?.[sk.key] || 0;
                return (
                  <div key={sk.key} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary, #334155)', fontVariantNumeric: 'tabular-nums' }}>
                      <span>{sk.name}</span>
                      <span>{val}%</span>
                    </div>
                    <div style={{ height: 5, borderRadius: 3, backgroundColor: '#E2E8F0', overflow: 'hidden' }}>
                      <div style={{ width: `${val}%`, height: '100%', backgroundColor: sk.color, borderRadius: 3 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Member List */}
        <div>
          <div style={{ fontSize: '14.5px', fontWeight: 700, color: 'var(--text-main, #0F172A)', marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Users size={16} color="var(--accent-color, #F26F21)" />
              Danh sách thành viên ({room.members.length}/{room.maxMembers})
            </span>
            <span style={{ fontSize: '13px', color: '#059669', fontWeight: 600 }}>
              ✓ Toàn quyền điều phối
            </span>
          </div>

          {room.members.length === 0 ? (
            <div style={{ padding: '20px', borderRadius: 12, backgroundColor: 'var(--bg-subtle, #F8FAFC)', border: '1px dashed var(--border-medium, #CBD5E1)', textAlign: 'center', fontSize: '14px', color: 'var(--text-muted, #64748B)' }}>
              Phòng đang trống (0/{room.maxMembers}). Chưa có sinh viên nào ghi danh hoặc chọn phòng này.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {room.members.map((m) => (
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
                        backgroundColor: 'var(--bg-tag, #F1F5F9)',
                        color: 'var(--text-main, #0F172A)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '13px',
                      }}
                    >
                      {m.name.charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontSize: '14.5px', fontWeight: 700, color: 'var(--text-main, #0F172A)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>{m.name}</span>
                        {m.role === 'Leader' && (
                          <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-secondary, #334155)', backgroundColor: 'var(--bg-card, #FFFFFF)', border: '1px solid var(--border-light, #E2E8F0)', padding: '1px 7px', borderRadius: 6 }}>
                            Trưởng nhóm
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--text-muted, #64748B)' }}>
                        MSSV: <strong style={{ color: 'var(--text-main, #0F172A)', fontFamily: 'var(--font-mono, monospace)' }}>{m.studentCode}</strong> • Ngành: {m.major || '—'} • Lớp: {m.classCode || '—'}
                      </div>
                    </div>
                  </div>
                  <span style={{ fontSize: '12.5px', color: 'var(--text-muted, #64748B)' }}>
                    {m.joinedAt}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

// ── POPUP: IMPORT DANH SÁCH FAP (MULTI-TAB: UPLOAD FILE & PASTE TEXT + TẢI FILE MẪU) ──

interface ImportFapModalProps {
  open: boolean;
  space: Space;
  onClose: () => void;
  onImported: (count: number) => void;
}

const ImportFapModal: React.FC<ImportFapModalProps> = ({ open, space, onClose, onImported }) => {
  const [tab, setTab] = useState<'upload' | 'paste'>('upload');
  const [file, setFile] = useState<(ParsedFapCsv & { fileName: string }) | null>(null);
  const [pasteContent, setPasteContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const modalFileInputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const handleDownloadSampleCsv = () => {
    const csvHeader = 'studentCode,email,fullName,major,cohort,classCode\n';
    const sampleRows = [
      'SE180001,anvse180001@fpt.edu.vn,Nguyễn Văn An,SE,K18,EXE101-01',
      'SE180002,binhtse180002@fpt.edu.vn,Trần Văn Bình,SE,K18,EXE101-01',
      'AI180003,chaulptai180003@fpt.edu.vn,Lê Phan Cẩm Châu,AI,K18,EXE101-01',
      'AI180004,dungdtai180004@fpt.edu.vn,Đỗ Thành Dũng,AI,K18,EXE101-01',
      'GD180005,emntgd180005@fpt.edu.vn,Ngô Thị Thảo Em,GD,K18,EXE101-02',
      'GD180006,gianghvgd180006@fpt.edu.vn,Hoàng Văn Giang,GD,K18,EXE101-02',
      'MKT180007,haontmkt180007@fpt.edu.vn,Nguyễn Thu Hảo,MKT,K18,EXE101-02',
      'MKT180008,khoipnmkt180008@fpt.edu.vn,Phan Ngọc Khôi,MKT,K18,EXE101-02',
      'IB180009,linhttib180009@fpt.edu.vn,Trần Thảo Linh,IB,K18,EXE101-03',
      'IB180010,minhnvib180010@fpt.edu.vn,Nguyễn Văn Minh,IB,K18,EXE101-03',
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvHeader + sampleRows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `danh_sach_sinh_vien_fap_${space.semesterCode}_${space.subjectCode}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    setErrors([]);
    try {
      const parsed = await readFapFile(f);
      if (parsed.errors.length > 0) {
        setErrors(parsed.errors);
      }
      setFile({ ...parsed, fileName: f.name });
    } catch {
      setErrors(['Không đọc được file. Vui lòng chọn file CSV hoặc Excel hợp lệ.']);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrors([]);
    try {
      let studentsToImport: { studentCode: string; fullName: string; email: string; major: string; cohort?: string | null; classCode?: string | null }[] = [];
      if (tab === 'upload') {
        if (!file || file.students.length === 0) {
          setErrors(['Vui lòng chọn file danh sách sinh viên FAP hợp lệ.']);
          setSaving(false);
          return;
        }
        studentsToImport = file.students;
      } else {
        if (!pasteContent.trim()) {
          setErrors(['Vui lòng nhập hoặc dán nội dung CSV.']);
          setSaving(false);
          return;
        }
        const parsed = parseFapCsv(pasteContent);
        if (parsed.errors.length > 0) {
          setErrors(parsed.errors);
          setSaving(false);
          return;
        }
        studentsToImport = parsed.students;
      }

      // Nếu không gian đang Locked, tự động mở lại Open với hạn chót mới để cho phép import
      if (space.status === 'Locked') {
        const newDeadline = new Date(Date.now() + 14 * 86400000).toISOString();
        await workspaceApi.updateSpaceConfig(space.id, {
          maxMembersPerGroup: space.maxMembersPerGroup,
          bufferRatio: Number(space.bufferRatio),
          maxConcurrentApplies: space.maxConcurrentApplies,
          registrationDeadline: newDeadline,
          status: 'Open',
        });
      }

      const count = await workspaceApi.importFap(
        space.id,
        studentsToImport.map((s) => ({ ...s, cohort: s.cohort ?? '' }))
      );
      onImported(count);
      onClose();
    } catch (err) {
      setErrors([errorMessage(err, 'Không thể import danh sách FAP.')]);
    } finally {
      setSaving(false);
    }
  };

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
      onClick={onClose}
    >
      <div
        className="motion-modal-dialog"
        style={{
          backgroundColor: 'var(--bg-card, #FFFFFF)',
          border: '1px solid var(--border-light, #E2E8F0)',
          borderRadius: 20,
          padding: '24px 28px',
          maxWidth: 620,
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 20px 45px rgba(0,0,0,0.2)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle, #F1F5F9)', paddingBottom: '14px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                backgroundColor: 'rgba(242, 111, 33, 0.1)',
                color: 'var(--fpt-orange, #f26f21)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-main, #0F172A)' }}>
                Import danh sách sinh viên FAP
              </h3>
              <span style={{ fontSize: '13px', color: 'var(--text-muted, #64748B)' }}>
                Không gian: {space.semesterCode} • {space.subjectCode} ({space.name})
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border-light, #E2E8F0)', backgroundColor: 'transparent', color: 'var(--text-muted, #64748B)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Tab switch */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', padding: '4px', backgroundColor: 'var(--bg-subtle, #F1F5F9)', borderRadius: 10, marginBottom: '16px' }}>
          <button
            type="button"
            onClick={() => setTab('upload')}
            style={{
              padding: '8px',
              fontSize: '13.5px',
              fontWeight: 700,
              borderRadius: 8,
              border: 'none',
              cursor: 'pointer',
              backgroundColor: tab === 'upload' ? 'var(--bg-card, #FFFFFF)' : 'transparent',
              color: tab === 'upload' ? 'var(--fpt-orange, #f26f21)' : 'var(--text-muted, #64748B)',
              boxShadow: tab === 'upload' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            <FolderUp size={15} />
            <span>Tải lên File</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('paste')}
            style={{
              padding: '8px',
              fontSize: '13.5px',
              fontWeight: 700,
              borderRadius: 8,
              border: 'none',
              cursor: 'pointer',
              backgroundColor: tab === 'paste' ? 'var(--bg-card, #FFFFFF)' : 'transparent',
              color: tab === 'paste' ? 'var(--text-main, #0F172A)' : 'var(--text-muted, #64748B)',
              boxShadow: tab === 'paste' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            <FileText size={15} />
            <span>Dán văn bản CSV</span>
          </button>
        </div>

        {space.status === 'Locked' && (
          <div style={{ padding: '10px 14px', borderRadius: 10, backgroundColor: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)', display: 'flex', alignItems: 'center', gap: 8, marginBottom: '14px', fontSize: '13px', color: '#D97706' }}>
            <AlertCircle size={16} color="#D97706" style={{ flexShrink: 0 }} />
            <span>Học kỳ hiện đang ở trạng thái <strong>Đã chốt sổ (Locked)</strong>. Khi xác nhận import, hệ thống sẽ tự động mở lại cổng đăng ký (Open) với hạn chót mới (+14 ngày) để ghi danh thêm sinh viên.</span>
          </div>
        )}

        <ModalErrors messages={errors} />

        {tab === 'upload' && (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Download Template Box */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderRadius: 12, backgroundColor: 'var(--bg-subtle, #F8FAFC)', border: '1px solid var(--border-light, #E2E8F0)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Download size={18} style={{ color: 'var(--text-main, #0F172A)' }} />
                <span style={{ fontSize: '13.5px', color: 'var(--text-main, #0F172A)', fontWeight: 650 }}>
                  Chưa có file mẫu FAP?
                </span>
              </div>
              <button
                type="button"
                onClick={handleDownloadSampleCsv}
                style={{
                  height: 32,
                  padding: '0 12px',
                  borderRadius: 8,
                  border: '1px solid var(--border-medium, #CBD5E1)',
                  backgroundColor: 'var(--bg-card, #FFFFFF)',
                  color: 'var(--text-main, #0F172A)',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                <Download size={14} />
                <span>Tải file mẫu CSV</span>
              </button>
            </div>

            {/* Dropzone */}
            <input
              ref={modalFileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls,text/csv"
              onChange={handleFile}
              style={{ display: 'none' }}
            />

            <div
              onClick={() => modalFileInputRef.current?.click()}
              style={{
                border: file ? '2px solid #10B981' : '2px dashed var(--border-medium, #CBD5E1)',
                borderRadius: 14,
                padding: '28px 18px',
                textAlign: 'center',
                cursor: 'pointer',
                backgroundColor: file ? 'rgba(16, 185, 129, 0.04)' : 'var(--bg-subtle, #F8FAFC)',
                transition: 'all 0.2s ease',
              }}
            >
              {file ? (
                <div>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: '50%',
                      backgroundColor: 'rgba(16, 185, 129, 0.12)',
                      color: '#059669',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 8px',
                    }}
                  >
                    <Check size={24} />
                  </div>
                  <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text-main, #0F172A)' }}>
                    {file.fileName}
                  </h4>
                  {file.students.length > 0 ? (
                    <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#059669', fontWeight: 650 }}>
                      ✓ Đã nhận diện được <span style={{ fontFamily: 'var(--font-mono, monospace)' }}>{file.students.length}</span> sinh viên hợp lệ từ file
                    </p>
                  ) : (
                    <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#DC2626', fontWeight: 650 }}>
                      File chưa có dữ liệu sinh viên hợp lệ.
                    </p>
                  )}
                  <span style={{ display: 'inline-block', marginTop: '10px', fontSize: '12.5px', color: 'var(--text-main, #0F172A)', textDecoration: 'underline' }}>
                    Nhấn để chọn file khác
                  </span>
                </div>
              ) : (
                <div>
                  <FolderUp size={42} style={{ color: 'var(--fpt-orange, #f26f21)', margin: '0 auto 8px', opacity: 0.85 }} />
                  <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text-main, #0F172A)' }}>
                    Nhấn để chọn file .xls, .xlsx hoặc .csv từ máy tính
                  </h4>
                  <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-muted, #64748B)' }}>
                    File FAP xuất trực tiếp hoặc CSV: <code style={{ fontFamily: 'var(--font-mono, monospace)' }}>studentCode, email, fullName, major, cohort, classCode</code>
                  </p>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', paddingTop: '10px', borderTop: '1px solid var(--border-subtle, #F1F5F9)' }}>
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                style={{
                  height: 40,
                  padding: '0 16px',
                  borderRadius: 10,
                  border: '1px solid var(--border-medium, #CBD5E1)',
                  backgroundColor: 'transparent',
                  color: 'var(--text-muted, #64748B)',
                  fontSize: '14px',
                  fontWeight: 650,
                  cursor: 'pointer',
                }}
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={!file || file.students.length === 0 || saving}
                style={{
                  height: 40,
                  padding: '0 18px',
                  borderRadius: 10,
                  border: 'none',
                  background: 'var(--accent-gradient, linear-gradient(135deg, #f26f21 0%, #ea580c 100%))',
                  color: '#FFFFFF',
                  fontSize: '14px',
                  fontWeight: 700,
                  cursor: !file || file.students.length === 0 || saving ? 'not-allowed' : 'pointer',
                  opacity: !file || file.students.length === 0 || saving ? 0.7 : 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 7,
                }}
              >
                <Upload size={15} />
                <span>{saving ? 'Đang import...' : `Xác nhận Import ${file && file.students.length > 0 ? `${file.students.length} sinh viên` : ''}`}</span>
              </button>
            </div>
          </form>
        )}

        {tab === 'paste' && (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted, #64748B)', lineHeight: 1.5 }}>
              Dán nội dung CSV (mỗi sinh viên một dòng theo cấu trúc:{' '}
              <code style={{ color: 'var(--text-main, #0F172A)', fontFamily: 'var(--font-mono, monospace)', fontWeight: 700 }}>
                studentCode,email,fullName,major,cohort,classCode
              </code>
              )
            </p>

            <textarea
              rows={8}
              value={pasteContent}
              onChange={(e) => {
                setPasteContent(e.target.value);
                setErrors([]);
              }}
              placeholder={`SE180001,anvse180001@fpt.edu.vn,Nguyễn Văn An,SE,K18,EXE101-01\nAI180002,binhptai180002@fpt.edu.vn,Phan Thị Bình,AI,K18,EXE101-01\nGD180003,chaulnbgd180003@fpt.edu.vn,Lê Ngọc Bảo Châu,GD,K18,EXE101-02`}
              required
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 10,
                border: '1px solid var(--border-medium, #CBD5E1)',
                backgroundColor: 'var(--bg-input, #FFFFFF)',
                color: 'var(--text-main, #0F172A)',
                fontFamily: 'var(--font-mono, monospace)',
                fontSize: '13px',
                lineHeight: 1.5,
                outline: 'none',
                boxSizing: 'border-box',
                resize: 'vertical',
              }}
            />

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', paddingTop: '10px', borderTop: '1px solid var(--border-subtle, #F1F5F9)' }}>
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                style={{
                  height: 40,
                  padding: '0 16px',
                  borderRadius: 10,
                  border: '1px solid var(--border-medium, #CBD5E1)',
                  backgroundColor: 'transparent',
                  color: 'var(--text-muted, #64748B)',
                  fontSize: '14px',
                  fontWeight: 650,
                  cursor: 'pointer',
                }}
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={!pasteContent.trim() || saving}
                style={{
                  height: 40,
                  padding: '0 18px',
                  borderRadius: 10,
                  border: 'none',
                  background: 'var(--accent-gradient, linear-gradient(135deg, #f26f21 0%, #ea580c 100%))',
                  color: '#FFFFFF',
                  fontSize: '14px',
                  fontWeight: 700,
                  cursor: !pasteContent.trim() || saving ? 'not-allowed' : 'pointer',
                  opacity: !pasteContent.trim() || saving ? 0.7 : 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 7,
                }}
              >
                <Upload size={15} />
                <span>{saving ? 'Đang import...' : 'Xác nhận Import nội dung CSV'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
};

// ── DIALOG HOẠT HỌA GSAP DÙNG CHUNG CHO MODALS ────────────────────────────────

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

// ── BADGE TRẠNG THÁI KHÔNG GIAN HỌC PHẦN (CHUẨN FPT IDENTITY) ──────────────────

const getSpaceStatusBadge = (status: SpaceStatus, compact = false) => {
  const pillStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.35rem',
    padding: compact ? '0.2rem 0.55rem' : '0.24rem 0.68rem',
    borderRadius: '9999px',
    fontSize: compact ? '0.7rem' : '0.74rem',
    fontWeight: 600,
    lineHeight: 1,
    whiteSpace: 'nowrap',
    flexShrink: 0,
    background: 'var(--bg-subtle, #F8FAFC)',
    color: 'var(--text-secondary, #334155)',
    border: '1px solid var(--border-light, #E2E8F0)',
  };

  switch (status) {
    case 'Open':
      return (
        <span style={pillStyle}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981', flexShrink: 0 }} />
          {compact ? 'Đang mở' : 'Đang mở ghi danh (Open)'}
        </span>
      );
    case 'Draft':
      return (
        <span style={pillStyle}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#94A3B8', flexShrink: 0 }} />
          {compact ? 'Bản nháp' : 'Bản nháp (Draft)'}
        </span>
      );
    case 'ClosedRegistration':
      return (
        <span style={pillStyle}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-color, #F26F21)', flexShrink: 0 }} />
          {compact ? 'Đóng đăng ký' : 'Đóng đăng ký tự do'}
        </span>
      );
    case 'Locked':
      return (
        <span style={pillStyle}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#64748B', flexShrink: 0 }} />
          {compact ? 'Đã chốt sổ' : 'Đã khóa chốt sổ (Locked)'}
        </span>
      );
    default:
      return null;
  }
};

// ── MODAL: CHỈNH SỬA THÔNG SỐ KHÔNG GIAN HỌC PHẦN (GSAP ANIMATED) ─────────────

interface EditSpaceModalProps {
  space: Space;
  onClose: () => void;
  onSaved: (updated: Space) => void;
}

const EditSpaceModal: React.FC<EditSpaceModalProps> = ({ space, onClose, onSaved }) => {
  const [name, setName] = useState(space.name || '');
  const [maxMembers, setMaxMembers] = useState(space.maxMembersPerGroup || 5);
  const [bufferRatio, setBufferRatio] = useState(Number(space.bufferRatio) || 1.2);
  const [maxApplies, setMaxApplies] = useState(space.maxConcurrentApplies || 3);
  const [deadline, setDeadline] = useState(toLocalInput(space.registrationDeadline));
  const [status, setStatus] = useState<SpaceStatus>(space.status);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const modalRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    let ctx: gsap.Context | null = null;
    if (modalRef.current && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      ctx = gsap.context(() => {
        gsap.fromTo(
          modalRef.current,
          { opacity: 0, scale: 0.96, y: 10 },
          { opacity: 1, scale: 1, y: 0, duration: 0.22, ease: 'power2.out', clearProps: 'transform,opacity' }
        );
      });
    }
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      if (ctx) ctx.revert();
    };
  }, [onClose, saving]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrors([]);
    try {
      const payload: SpaceConfigPayload = {
        name: name.trim() || undefined,
        maxMembersPerGroup: Number(maxMembers),
        bufferRatio: Number(bufferRatio),
        maxConcurrentApplies: Number(maxApplies),
        registrationDeadline: new Date(deadline).toISOString(),
        status: status,
      };
      const updated = await workspaceApi.updateSpaceConfig(space.id, payload);
      onSaved(updated);
      onClose();
    } catch (err: any) {
      setErrors([errorMessage(err, 'Không thể cập nhật cấu hình Không gian học phần.')]);
    } finally {
      setSaving(false);
    }
  };

  const hasStudents = space.totalStudents > 0;
  const hasRooms = space.totalRooms > 0;
  const canOpen = hasStudents && hasRooms;

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
      onClick={() => !saving && onClose()}
    >
      <div
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 580,
          maxHeight: '90vh',
          overflowY: 'auto',
          backgroundColor: 'var(--bg-card, #FFFFFF)',
          borderRadius: 20,
          border: '1px solid var(--border-light, #E2E8F0)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--border-light, #E2E8F0)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-card, #FFFFFF)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: '10px',
                background: 'var(--bg-tag, #F1F5F9)',
                color: 'var(--text-main, #0F172A)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Pencil size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main, #0F172A)' }}>
                Chỉnh sửa Không gian học phần
              </h3>
              <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted, #64748B)' }}>
                Mã học phần:{' '}
                <span style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700, color: 'var(--text-main, #0F172A)' }}>
                  {space.semesterCode} • {space.subjectCode}
                </span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            style={{
              padding: '0.4rem',
              color: 'var(--text-muted, #64748B)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              borderRadius: '8px',
            }}
            aria-label="Đóng cửa sổ"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
          {errors.length > 0 && <ModalErrors messages={errors} />}

          <div>
            <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary, #334155)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Tên Không gian học phần <strong style={{ color: 'var(--fpt-orange, #f26f21)' }}>*</strong>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Học kỳ FA26 - EXE101 Khởi nghiệp"
              className="form-control"
              required
              style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '10px', border: '1px solid var(--border-light, #E2E8F0)' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(200px, 100%), 1fr))', gap: '1rem' }}>
            <div>
              <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary, #334155)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Sĩ số tối đa / nhóm
              </label>
              <input
                type="number"
                min={4}
                max={6}
                value={maxMembers}
                onChange={(e) => setMaxMembers(Number(e.target.value))}
                className="form-control"
                style={{ width: '100%', fontFamily: 'var(--font-mono, monospace)', padding: '0.65rem 0.85rem', borderRadius: '10px', border: '1px solid var(--border-light, #E2E8F0)' }}
                required
              />
              <p style={{ margin: '0.3rem 0 0 0', fontSize: '0.72rem', color: 'var(--text-muted, #64748B)' }}>
                Ngưỡng lập nhóm: <strong style={{ fontFamily: 'var(--font-mono, monospace)' }}>{Math.floor(maxMembers / 2) + 1}</strong> SV
              </p>
            </div>

            <div>
              <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary, #334155)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Hệ số dự phòng Room
              </label>
              <input
                type="number"
                step="0.05"
                min={1.0}
                max={2.0}
                value={bufferRatio}
                onChange={(e) => setBufferRatio(Number(e.target.value))}
                className="form-control"
                style={{ width: '100%', fontFamily: 'var(--font-mono, monospace)', padding: '0.65rem 0.85rem', borderRadius: '10px', border: '1px solid var(--border-light, #E2E8F0)' }}
                required
              />
              <p style={{ margin: '0.3rem 0 0 0', fontSize: '0.72rem', color: 'var(--text-muted, #64748B)' }}>
                Mặc định: <strong style={{ fontFamily: 'var(--font-mono, monospace)' }}>1.2</strong> (x1.2 số Room)
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(200px, 100%), 1fr))', gap: '1rem' }}>
            <div>
              <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary, #334155)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Đơn nộp đồng thời tối đa
              </label>
              <input
                type="number"
                min={1}
                max={5}
                value={maxApplies}
                onChange={(e) => setMaxApplies(Number(e.target.value))}
                className="form-control"
                style={{ width: '100%', fontFamily: 'var(--font-mono, monospace)', padding: '0.65rem 0.85rem', borderRadius: '10px', border: '1px solid var(--border-light, #E2E8F0)' }}
                required
              />
              <p style={{ margin: '0.3rem 0 0 0', fontSize: '0.72rem', color: 'var(--text-muted, #64748B)' }}>
                Mặc định: 3 đơn/sinh viên
              </p>
            </div>

            <div>
              <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary, #334155)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Trạng thái Không gian
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as SpaceStatus)}
                className="form-control"
                style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '10px', border: '1px solid var(--border-light, #E2E8F0)' }}
              >
                <option value="Draft">Bản nháp (Draft)</option>
                <option value="Open" disabled={!canOpen && space.status === 'Draft'}>
                  Đang mở đăng ký (Open){!canOpen && space.status === 'Draft' ? ' (Cần nạp SV & tạo Room)' : ''}
                </option>
                <option value="ClosedRegistration" disabled={!canOpen && space.status === 'Draft'}>
                  Đóng đăng ký tự do (ClosedRegistration){!canOpen && space.status === 'Draft' ? ' (Cần nạp SV & tạo Room)' : ''}
                </option>
                <option value="Locked" disabled={space.status !== 'Locked'}>
                  Đã khóa chốt sổ toàn bộ (Locked)
                </option>
              </select>
              <p style={{ margin: '0.3rem 0 0 0', fontSize: '0.72rem', color: !canOpen && space.status === 'Draft' ? 'var(--fpt-orange, #f26f21)' : '#64748B' }}>
                {!canOpen && space.status === 'Draft'
                  ? !hasStudents
                    ? 'Chưa nạp SV FAP — cần nạp SV trước khi mở'
                    : 'Chưa khởi tạo Room — cần tạo Room trước khi mở'
                  : status === 'Draft'
                  ? 'Chưa mở cho SV'
                  : status === 'Open'
                  ? 'SV tự do ghép nhóm'
                  : status === 'ClosedRegistration'
                  ? 'Khóa đăng ký, chờ chốt'
                  : 'Đã chốt sổ'}
              </p>
            </div>
          </div>

          <div>
            <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary, #334155)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Hạn chót sinh viên đăng ký & lập nhóm <strong style={{ color: 'var(--fpt-orange, #f26f21)' }}>*</strong>
            </label>
            <input
              type="datetime-local"
              value={deadline}
              onChange={(e) => {
                const val = e.target.value;
                setDeadline(val);
                if (space.status === 'ClosedRegistration' && val) {
                  const dlDate = new Date(val);
                  if (!isNaN(dlDate.getTime()) && dlDate.getTime() > Date.now()) {
                    setStatus('Open');
                  }
                }
              }}
              className="form-control"
              style={{ width: '100%', fontFamily: 'var(--font-mono, monospace)', padding: '0.65rem 0.85rem', borderRadius: '10px', border: '1px solid var(--border-light, #E2E8F0)' }}
              required
            />
            <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-muted, #64748B)', lineHeight: 1.4 }}>
              Hệ thống tự động chuyển sang Đóng đăng ký tự do (ClosedRegistration) khi quá hạn chót.
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-light, #E2E8F0)' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              style={{
                padding: '0.65rem 1.25rem',
                borderRadius: '10px',
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
              type="submit"
              disabled={saving}
              style={{
                padding: '0.65rem 1.35rem',
                borderRadius: '10px',
                border: 'none',
                background: 'var(--accent-gradient, linear-gradient(135deg, #f26f21 0%, #ea580c 100%))',
                color: '#FFFFFF',
                fontWeight: 700,
                cursor: saving ? 'wait' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: '0 2px 8px rgba(242, 111, 33, 0.25)',
              }}
            >
              {saving ? <RotateCcw className="spin" size={16} /> : <Check size={16} />}
              <span>{saving ? 'Đang lưu...' : 'Lưu thay đổi'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

// ── DIALOG XÁC NHẬN XÓA KHÔNG GIAN HỌC PHẦN (GSAP ANIMATED) ───────────────────

interface DeleteSpaceConfirmModalProps {
  space: Space;
  onClose: () => void;
  onDeleted: (deletedSpaceId: string) => void;
}

const DeleteSpaceConfirmModal: React.FC<DeleteSpaceConfirmModalProps> = ({ space, onClose, onDeleted }) => {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setDeleting(true);
    setError(null);
    try {
      await workspaceApi.deleteSpace(space.id);
      onDeleted(space.id);
      onClose();
    } catch (err: any) {
      setError(errorMessage(err, 'Không thể xóa Không gian học phần. Vui lòng thử lại.'));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AnimatedDialog maxWidth={460} onClose={onClose} disabled={deleting}>
      <div style={{ padding: '1.75rem 1.5rem', textAlign: 'center' }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'rgba(239, 68, 68, 0.12)',
            color: '#dc2626',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.15rem auto',
          }}
        >
          <Trash2 size={26} strokeWidth={2} />
        </div>

        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main, #0F172A)', margin: '0 0 0.5rem 0' }}>
          Xác nhận xóa Không gian?
        </h3>

        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted, #64748B)', margin: '0 0 1.25rem 0', lineHeight: 1.5 }}>
          Bạn có chắc chắn muốn xóa vĩnh viễn Không gian học phần{' '}
          <strong style={{ color: 'var(--text-main, #0F172A)' }}>"{space.name}"</strong> (
          {space.semesterCode} - {space.subjectCode}) không?
        </p>

        <div
          style={{
            background: 'rgba(239, 68, 68, 0.10)',
            border: '1px solid #FECACA',
            borderRadius: 10,
            padding: '10px 14px',
            fontSize: '13px',
            color: '#991B1B',
            textAlign: 'left',
            marginBottom: '1.25rem',
            lineHeight: 1.45,
          }}
        >
          <strong>Lưu ý:</strong> Toàn bộ {space.totalRooms} phòng học phần và {space.totalStudents} sinh viên FAP thuộc không gian này sẽ bị xóa khỏi hệ thống. Thao tác không thể hoàn tác.
        </div>

        {error && (
          <div style={{ marginBottom: '1rem', color: '#dc2626', fontSize: '13px' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
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
            Hủy bỏ
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={deleting}
            style={{
              flex: 1,
              padding: '0.65rem 1rem',
              borderRadius: 10,
              border: 'none',
              background: '#DC2626',
              color: '#FFFFFF',
              fontWeight: 700,
              cursor: deleting ? 'wait' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            {deleting ? <RotateCcw className="spin" size={16} /> : <Trash2 size={16} />}
            <span>{deleting ? 'Đang xóa...' : 'Xác nhận xóa'}</span>
          </button>
        </div>
      </div>
    </AnimatedDialog>
  );
};

// ── DIALOG XÁC NHẬN MỞ CỔNG ĐĂNG KÝ HỌC PHẦN (GSAP ANIMATED) ──────────────────

interface PublishSpaceConfirmModalProps {
  space: Space;
  onClose: () => void;
  onPublished: (updated: Space) => void;
}

const PublishSpaceConfirmModal: React.FC<PublishSpaceConfirmModalProps> = ({ space, onClose, onPublished }) => {
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setPublishing(true);
    setError(null);
    try {
      const payload: SpaceConfigPayload = {
        name: space.name,
        maxMembersPerGroup: space.maxMembersPerGroup,
        bufferRatio: Number(space.bufferRatio),
        maxConcurrentApplies: space.maxConcurrentApplies,
        registrationDeadline: space.registrationDeadline,
        status: 'Open',
      };
      const updated = await workspaceApi.updateSpaceConfig(space.id, payload);
      onPublished(updated);
      onClose();
    } catch (err: any) {
      setError(errorMessage(err, 'Không thể mở cổng đăng ký. Vui lòng kiểm tra lại.'));
    } finally {
      setPublishing(false);
    }
  };

  return (
    <AnimatedDialog maxWidth={460} onClose={onClose} disabled={publishing}>
      <div style={{ padding: '1.75rem 1.5rem', textAlign: 'center' }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'rgba(16, 185, 129, 0.12)',
            color: '#059669',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.15rem auto',
          }}
        >
          <Globe size={26} strokeWidth={2} />
        </div>

        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main, #0F172A)', margin: '0 0 0.5rem 0' }}>
          Mở cổng đăng ký tự do?
        </h3>

        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted, #64748B)', margin: '0 0 1.25rem 0', lineHeight: 1.5 }}>
          Không gian <strong style={{ color: 'var(--text-main, #0F172A)' }}>"{space.name}"</strong> sẽ chuyển sang trạng thái <strong>Đang mở (Open)</strong>.
          Sinh viên trong danh sách FAP sẽ bắt đầu thấy {space.totalRooms} phòng học phần và được tự do ghép nhóm đến hạn chót:{' '}
          <strong style={{ color: 'var(--text-main, #0F172A)', fontFamily: 'var(--font-mono, monospace)' }}>
            {formatDateTime(space.registrationDeadline)}
          </strong>.
        </p>

        {error && (
          <div style={{ marginBottom: '1rem', color: '#dc2626', fontSize: '13px' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={onClose}
            disabled={publishing}
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
            Để sau
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={publishing}
            style={{
              flex: 1,
              padding: '0.65rem 1rem',
              borderRadius: 10,
              border: 'none',
              background: 'var(--fpt-green, #008837)',
              color: '#FFFFFF',
              fontWeight: 700,
              cursor: publishing ? 'wait' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            {publishing ? <RotateCcw className="spin" size={16} /> : <Globe size={16} />}
            <span>{publishing ? 'Đang mở...' : 'Xác nhận Mở cổng'}</span>
          </button>
        </div>
      </div>
    </AnimatedDialog>
  );
};

// ── COMPONENT CHÍNH: MODERATOR SPACES PAGE ───────────────────────────────────

export const ModeratorSpacesPage: React.FC = () => {
  const { space, spaces, loading: spacesLoading, error: spacesError } = useSelectedSpace();
  const dialog = useConfirm();

  // Active Sub-Tab: 'rooms' | 'fap' | 'config'
  const [activeSubTab, setActiveSubTab] = useState<'rooms' | 'fap' | 'config'>('rooms');

  // Modals state
  const [createOpen, setCreateOpen] = useState(false);
  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [inspectRoom, setInspectRoom] = useState<DisplayRoomItem | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [spaceToEdit, setSpaceToEdit] = useState<Space | null>(null);
  const [spaceToDelete, setSpaceToDelete] = useState<Space | null>(null);
  const [spaceToPublish, setSpaceToPublish] = useState<Space | null>(null);
  const spacesGridRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!spacesGridRef.current) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const cards = spacesGridRef.current.querySelectorAll('.motion-card');
    if (!cards.length) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        cards,
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.26, stagger: 0.04, ease: 'power2.out', clearProps: 'transform,opacity' }
      );
    });
    return () => ctx.revert();
  }, [spaces.length]);

  // Space config state
  const [maxMembers, setMaxMembers] = useState<number>(5);
  const minThreshold = Math.floor(maxMembers / 2) + 1;
  const [reserveRatio, setReserveRatio] = useState<number>(1.2);
  const [maxPendingRequests, setMaxPendingRequests] = useState<number>(3);
  const [deadline, setDeadline] = useState<string>('');

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorToast, setErrorToast] = useState<string | null>(null);

  // FAP Students state
  const [students, setStudents] = useState<FapStudent[]>([]);
  const [searchStudent, setSearchStudent] = useState<string>('');
  const [selectedMajor, setSelectedMajor] = useState<string>('ALL');
  const [profileStatusFilter, setProfileStatusFilter] = useState<string>('ALL');
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    const anyOpen = createOpen || generateModalOpen || Boolean(inspectRoom) || importModalOpen;
    if (!anyOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (inspectRoom) setInspectRoom(null);
      else if (importModalOpen && !importing) setImportModalOpen(false);
      else if (generateModalOpen) setGenerateModalOpen(false);
      else if (createOpen) setCreateOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [createOpen, generateModalOpen, inspectRoom, importModalOpen, importing]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const totalStudentsCount = students.length;

  // Pagination for FAP list
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 10;

  // Rooms state
  const computedRoomsCount = totalStudentsCount > 0 ? Math.ceil((totalStudentsCount / maxMembers) * reserveRatio) : 0;
  const [rawRooms, setRawRooms] = useState<RoomSummary[]>([]);
  const [displayRooms, setDisplayRooms] = useState<DisplayRoomItem[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [roomSearch, setRoomSearch] = useState<string>('');
  const [roomStatusFilter, setRoomStatusFilter] = useState<string>('ALL');
  const [roomSeatFilter, setRoomSeatFilter] = useState<string>('ALL');

  const isLocked = space?.status === 'Locked';
  const roomsInUse = rawRooms.some((r) => r.memberCount > 0);

  const flash = (msg: string, ms = 4000) => {
    setToastMessage(msg);
    window.setTimeout(() => setToastMessage(null), ms);
  };
  const showError = (err: unknown, fallback?: string) => {
    setErrorToast(errorMessage(err, fallback));
    window.setTimeout(() => setErrorToast(null), 6000);
  };

  // Load Data: Enrollments + Rooms + Group Details
  const loadData = useCallback(async () => {
    if (!space) return;
    setLoadingRooms(true);
    try {
      const [enrollments, roomList] = await Promise.all([
        workspaceApi.listEnrollments(space.id),
        workspaceApi.listRooms(space.id),
      ]);

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

      const sortedRaw = [...roomList].sort((a, b) => (a.roomCode ?? a.name).localeCompare(b.roomCode ?? b.name));
      setRawRooms(sortedRaw);

      // Load group details for rooms with members to calculate 5-skill bars
      const populatedRooms = sortedRaw.filter((r) => r.memberCount > 0);
      const groupDetails = await Promise.all(
        populatedRooms.map((r) => workspaceApi.getGroup(r.id).catch(() => null))
      );
      const detailById = new Map(groupDetails.filter((d): d is GroupDetail => !!d).map((d) => [d.id, d]));

      const allUserIds = [...detailById.values()].flatMap((d) => d.members.map((m) => m.userId));
      const profiles = await loadProfiles(allUserIds);

      const items: DisplayRoomItem[] = sortedRaw.map((r) => {
        const detail = detailById.get(r.id);
        const memberProfiles = (detail?.members ?? []).map((m) => profiles.get(m.userId)).filter(Boolean) as CandidateProfile[];
        const avg = averageSkills(memberProfiles);
        const name = detail?.name ?? r.name;

        const members: RoomMemberItem[] = (detail?.members ?? []).map((m) => {
          const p = profiles.get(m.userId);
          return {
            id: m.userId,
            name: m.fullName,
            studentCode: m.studentCode ?? p?.major ?? '',
            classCode: p?.cohort ?? '',
            major: p?.major ?? '',
            role: m.role === 'Leader' ? 'Leader' : 'Member',
            joinedAt: formatDateTime(m.joinedAt),
            scores: p
              ? {
                  techScore: p.techScore,
                  managementScore: p.managementScore,
                  graphicDesignScore: p.graphicDesignScore,
                  marketingScore: p.marketingScore,
                  saleScore: p.saleScore,
                }
              : undefined,
          };
        });

        let status: DisplayRoomItem['status'] = 'Empty';
        if (r.status === 'Forming' || r.status === 'Recruiting' || r.status === 'Closed' || r.status === 'Locked') {
          status = r.status;
        }

        return {
          id: r.id,
          code: r.roomCode ?? r.name,
          name,
          topic: isDefaultRoomName(name) ? undefined : name,
          topicDesc: detail?.description ?? undefined,
          status,
          currentMembers: r.memberCount,
          maxMembers: r.maxMembers,
          leaderName: r.leaderName,
          members,
          avgSkills: memberProfiles.length > 0 ? avg : undefined,
        };
      });

      setDisplayRooms(items);
    } catch (err) {
      showError(err, 'Không tải được danh sách sinh viên và phòng.');
    } finally {
      setLoadingRooms(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [space?.id]);

  useEffect(() => {
    setStudents([]);
    setRawRooms([]);
    setDisplayRooms([]);
    setSyncStatus(null);
    setImportErrors([]);
    setCurrentPage(1);
    void loadData();
  }, [loadData]);

  // Realtime synchronization
  useEffect(() => {
    const handleRealtime = () => void loadData();
    window.addEventListener('realtime:space-updated', handleRealtime);
    return () => {
      window.removeEventListener('realtime:space-updated', handleRealtime);
    };
  }, [loadData]);

  // Sync state when space changes
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
      flash(`Đã lưu cấu hình học kỳ ${space.semesterCode} thành công!`);
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
        setErrorToast(`File có ${parsed.errors.length} dòng sai, chưa nhập sinh viên nào.`);
        return;
      }
      const imported = await workspaceApi.importFap(
        space.id,
        parsed.students.map((s) => ({ ...s, cohort: s.cohort ?? '' }))
      );
      const msg = `Đã đồng bộ ${imported} sinh viên đủ điều kiện từ file FAP "${file.name}".`;
      setSyncStatus(msg);
      flash(msg);
      setCurrentPage(1);
      reloadSpaces();
      await loadData();
    } catch (err) {
      showError(err, 'Không đọc được file FAP.');
    } finally {
      setImporting(false);
    }
  };

  const handleCreateRoomsAction = async () => {
    if (!space) return;
    const res = await workspaceApi.generateRooms(space.id);
    const codes = res.rooms.map((r) => r.roomCode ?? r.name).sort();
    flash(
      `Đã khởi tạo thành công ${res.totalRoomsGenerated} phòng trống${codes.length ? ` (${codes[0]} → ${codes[codes.length - 1]})` : ''} sẵn sàng cho sinh viên!`
    );
    reloadSpaces();
    await loadData();
    setActiveSubTab('rooms');
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
      flash('Đã đóng đăng ký tự nguyện. Chuyển sang bước Điều phối sinh viên lẻ.');
      reloadSpaces();
    } catch (err) {
      showError(err);
    }
  };

  const handleReopenRegistration = async () => {
    if (!space) return;
    const ok = await dialog.confirm({
      title: 'Mở lại đăng ký tự nguyện cho học kỳ?',
      message: 'Học kỳ sẽ chuyển về trạng thái Đang mở đăng ký (Open) với hạn chót mới (+14 ngày) để sinh viên có thể tiếp tục vào phòng hoặc nạp thêm danh sách FAP.',
      confirmLabel: 'Mở lại đăng ký',
    });
    if (ok === null) return;
    try {
      const newDeadline = new Date(Date.now() + 14 * 86400000).toISOString();
      await workspaceApi.updateSpaceConfig(space.id, {
        maxMembersPerGroup: space.maxMembersPerGroup,
        bufferRatio: Number(space.bufferRatio),
        maxConcurrentApplies: space.maxConcurrentApplies,
        registrationDeadline: newDeadline,
        status: 'Open',
      });
      flash('Đã mở lại đăng ký tự nguyện (Open) thành công cho học kỳ!');
      reloadSpaces();
      void loadData();
    } catch (err) {
      showError(err);
    }
  };

  // Filtered Students for FAP tab
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const matchSearch =
        s.fullName.toLowerCase().includes(searchStudent.toLowerCase()) ||
        s.studentCode.toLowerCase().includes(searchStudent.toLowerCase()) ||
        s.major.toLowerCase().includes(searchStudent.toLowerCase()) ||
        s.classCode.toLowerCase().includes(searchStudent.toLowerCase());
      const matchMajor = selectedMajor === 'ALL' || s.major.toUpperCase().includes(selectedMajor);
      const matchProfile =
        profileStatusFilter === 'ALL' ||
        (profileStatusFilter === 'COMPLETED' && s.profileCompleted) ||
        (profileStatusFilter === 'INCOMPLETE' && !s.profileCompleted);

      return matchSearch && matchMajor && matchProfile;
    });
  }, [students, searchStudent, selectedMajor, profileStatusFilter]);

  const totalPages = Math.ceil(filteredStudents.length / pageSize) || 1;
  const paginatedStudents = filteredStudents.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Filtered Rooms for Rooms tab
  const filteredRooms = useMemo(() => {
    return displayRooms.filter((r) => {
      const matchSearch =
        r.code.toLowerCase().includes(roomSearch.toLowerCase()) ||
        r.name.toLowerCase().includes(roomSearch.toLowerCase()) ||
        (r.topic && r.topic.toLowerCase().includes(roomSearch.toLowerCase()));

      let matchStatus = true;
      if (roomStatusFilter === 'EMPTY') matchStatus = r.status === 'Empty';
      else if (roomStatusFilter === 'FORMING') matchStatus = r.status === 'Forming';
      else if (roomStatusFilter === 'RECRUITING') matchStatus = r.status === 'Recruiting';
      else if (roomStatusFilter === 'CLOSED') matchStatus = r.status === 'Closed';
      else if (roomStatusFilter === 'LOCKED') matchStatus = r.status === 'Locked';

      let matchSeats = true;
      const freeSlots = r.maxMembers - r.currentMembers;
      if (roomSeatFilter === '1') matchSeats = freeSlots >= 1;
      else if (roomSeatFilter === '2') matchSeats = freeSlots >= 2;
      else if (roomSeatFilter === '3') matchSeats = freeSlots >= 3;

      return matchSearch && matchStatus && matchSeats;
    });
  }, [displayRooms, roomSearch, roomStatusFilter, roomSeatFilter]);

  const currentPhase: number = space ? SPACE_PHASE[space.status] : 1;

  if (!space) {
    return (
      <div style={{ padding: '0 0 3rem 0', maxWidth: 1560, margin: '0 auto' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 650, color: 'var(--text-main, #0F172A)', margin: '0 0 1.5rem 0', letterSpacing: '-0.025em', lineHeight: 1.25 }}>
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
        <CreateSpaceModal
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onCreated={(created, imported) => {
            setCreateOpen(false);
            selectSpace(created.id);
            reloadSpaces();
            flash(`Đã tạo không gian ${created.subjectCode} (${created.semesterCode})${imported ? ` và nạp ${imported} sinh viên FAP.` : '.'}`);
          }}
        />
      </div>
    );
  }

  return (
    <div style={{ padding: '0 0 3rem 0', maxWidth: 1560, margin: '0 auto' }}>
      {/* Toast Feedback */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            right: 16,
            zIndex: 9999,
            maxWidth: 'min(560px, calc(100vw - 32px))',
            backgroundColor: '#059669',
            color: '#FFFFFF',
            padding: '12px 20px',
            borderRadius: 12,
            boxShadow: '0 10px 25px rgba(5, 150, 105, 0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontSize: '15px',
            fontWeight: 650,
          }}
        >
          <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
          <span>{toastMessage}</span>
        </div>
      )}
      {errorToast && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            right: 16,
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
            fontWeight: 650,
          }}
        >
          <AlertCircle size={18} />
          <span>{errorToast}</span>
        </div>
      )}

      {dialog.node}

      <CreateSpaceModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(created, imported) => {
          setCreateOpen(false);
          selectSpace(created.id);
          reloadSpaces();
          flash(`Đã tạo không gian ${created.subjectCode} (${created.semesterCode})${imported ? ` và nạp ${imported} sinh viên FAP.` : '.'}`);
        }}
      />

      <GenerateRoomsModal
        open={generateModalOpen}
        space={space}
        totalStudents={totalStudentsCount}
        computedRooms={computedRoomsCount}
        onClose={() => setGenerateModalOpen(false)}
        onConfirm={handleCreateRoomsAction}
      />

      <InspectRoomModal room={inspectRoom} onClose={() => setInspectRoom(null)} />

      <ImportFapModal
        open={importModalOpen}
        space={space}
        onClose={() => setImportModalOpen(false)}
        onImported={(count) => {
          flash(`Đã import thành công ${count} sinh viên đủ điều kiện từ FAP.`);
          setCurrentPage(1);
          reloadSpaces();
          void loadData();
          setActiveSubTab('fap');
        }}
      />

      {/* Modal: Chỉnh sửa thông số Không gian học phần */}
      {spaceToEdit && (
        <EditSpaceModal
          space={spaceToEdit}
          onClose={() => setSpaceToEdit(null)}
          onSaved={(updated) => {
            flash(`Đã cập nhật cấu hình [${updated.semesterCode} • ${updated.subjectCode}] thành công.`);
            reloadSpaces();
            if (updated.id === space?.id) {
              void loadData();
            }
          }}
        />
      )}

      {/* Modal: Xác nhận xóa Không gian học phần */}
      {spaceToDelete && (
        <DeleteSpaceConfirmModal
          space={spaceToDelete}
          onClose={() => setSpaceToDelete(null)}
          onDeleted={(deletedId) => {
            flash('Đã xóa không gian học phần thành công.');
            const remaining = spaces.filter((s) => s.id !== deletedId);
            if (remaining.length > 0) {
              selectSpace(remaining[0].id);
            }
            reloadSpaces();
          }}
        />
      )}

      {/* Modal: Xác nhận mở cổng đăng ký tự do */}
      {spaceToPublish && (
        <PublishSpaceConfirmModal
          space={spaceToPublish}
          onClose={() => setSpaceToPublish(null)}
          onPublished={(updated) => {
            flash(`Đã mở cổng đăng ký tự do cho [${updated.semesterCode} • ${updated.subjectCode}].`);
            reloadSpaces();
            if (updated.id === space?.id) {
              void loadData();
            }
          }}
        />
      )}

      {/* Fallback hidden file input that is always mounted in the DOM */}
      <input
        ref={fileRef}
        type="file"
        accept=".csv, .xlsx, .xls"
        disabled={importing || isLocked}
        style={{ display: 'none' }}
        onChange={handleSyncFap}
      />

      {/* FPT Tricolor Brand Line */}
      <div className="fpt-tricolor-bar" style={{ height: 3.5, borderRadius: 2, marginBottom: '1.25rem' }} />

      {/* Header — Enterprise Hierarchy */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 500, color: 'var(--text-muted, #64748B)', marginBottom: '6px' }}>
            <span>Điều phối & Học kỳ</span>
            <span style={{ color: '#CBD5E1' }}>/</span>
            <span style={{ color: 'var(--text-secondary, #334155)', fontWeight: 600 }}>Quản lý không gian môn học & FAP</span>
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 650, color: 'var(--text-main, #0F172A)', margin: '0 0 4px 0', letterSpacing: '-0.025em', lineHeight: 1.25 }}>
            Quản lý Không gian Môn học & Đồng bộ FAP
          </h1>
          <p style={{ color: 'var(--text-muted, #64748B)', fontSize: '14.5px', margin: 0, lineHeight: 1.5 }}>
            Điều phối học kỳ {space.semesterCode} môn {space.subjectCode}, quản lý danh sách sinh viên FAP và giám sát mạng lưới phòng học phần.
          </p>
        </div>

        {/* Global Action: Tạo không gian mới */}
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          style={{
            height: 42,
            padding: '0 16px',
            borderRadius: 10,
            border: 'none',
            background: 'var(--accent-gradient, linear-gradient(135deg, #f26f21 0%, #ea580c 100%))',
            color: '#FFFFFF',
            fontSize: '14px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            boxShadow: '0 2px 8px rgba(242, 111, 33, 0.25)',
          }}
        >
          <Plus size={16} />
          <span>Tạo không gian học phần mới</span>
        </button>
      </div>

      {/* Course Spaces Grid / Switcher (Chuẩn nhánh cũ kết hợp GSAP Stagger & FPT Identity) */}
      <div style={{ marginBottom: '1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <h2 style={{ fontSize: '15.5px', fontWeight: 700, color: 'var(--text-main, #0F172A)', margin: 0 }}>
              Danh sách Không gian Môn học
            </h2>
            <span
              style={{
                fontFamily: 'var(--font-mono, monospace)',
                fontSize: '12px',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '999px',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                background: 'var(--bg-tag, #F1F5F9)',
                color: 'var(--text-main, #0F172A)',
                border: '1px solid var(--border-light, #E2E8F0)',
              }}
            >
              {spaces.length} Không gian
            </span>
          </div>
          <span style={{ fontSize: '12.5px', color: 'var(--text-muted, #64748B)' }}>
            Bấm vào thẻ không gian để chuyển đổi không gian đang quản lý
          </span>
        </div>

        {spaces.length === 0 ? (
          <div
            style={{
              padding: '2.5rem',
              textAlign: 'center',
              backgroundColor: 'var(--bg-card, #FFFFFF)',
              border: '1px solid var(--border-light, #E2E8F0)',
              borderRadius: 16,
            }}
          >
            <Layers size={40} style={{ color: 'var(--text-light, #94A3B8)', margin: '0 auto 0.75rem auto' }} />
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main, #0F172A)', margin: 0 }}>
              Chưa có Không gian học phần nào
            </h3>
            <p style={{ fontSize: '13.5px', color: 'var(--text-muted, #64748B)', maxWidth: 460, margin: '0.35rem auto 1rem auto' }}>
              Bấm nút "Tạo không gian học phần mới" phía trên để khởi tạo học kỳ môn EXE101 và nạp danh sách FAP.
            </p>
          </div>
        ) : (
          <div
            ref={spacesGridRef}
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(min(340px, 100%), 1fr))',
              gap: '1rem',
            }}
          >
            {spaces.map((s) => {
              const isSelected = s.id === space?.id;
              return (
                <div
                  key={s.id}
                  className="card motion-card"
                  onClick={() => selectSpace(s.id)}
                  style={{
                    padding: '1.15rem 1.25rem',
                    borderRadius: 16,
                    cursor: 'pointer',
                    position: 'relative',
                    border: isSelected
                      ? '1.5px solid var(--accent-color, #f26f21)'
                      : '1px solid var(--border-light, #e2e8f0)',
                    background: 'var(--bg-card, #ffffff)',
                    boxShadow: isSelected
                      ? '0 4px 14px rgba(15, 23, 42, 0.06)'
                      : '0 1px 3px rgba(0,0,0,0.03)',
                    transition: 'border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.borderColor = 'rgba(242, 111, 33, 0.4)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.borderColor = 'var(--border-light, #e2e8f0)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }
                  }}
                >
                  {/* Top Bar: Chips + Status + Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.4rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}>
                      <span
                        style={{
                          fontFamily: 'var(--font-mono, monospace)',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          lineHeight: 1,
                          padding: '0.22rem 0.5rem',
                          borderRadius: '6px',
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                          background: 'var(--bg-main, #f1f5f9)',
                          color: 'var(--text-main, #0f172a)',
                          border: '1px solid var(--border-light, #e2e8f0)',
                        }}
                      >
                        {s.semesterCode}
                      </span>
                      <span
                        style={{
                          fontFamily: 'var(--font-mono, monospace)',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          lineHeight: 1,
                          padding: '0.22rem 0.5rem',
                          borderRadius: '6px',
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                          background: 'var(--bg-tag, #F1F5F9)',
                          color: 'var(--text-main, #0F172A)',
                          border: '1px solid var(--border-light, #E2E8F0)',
                        }}
                      >
                        {s.subjectCode}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}>
                      {getSpaceStatusBadge(s.status, true)}

                      {/* Nút Mở cổng (nếu là Draft và có SV + Room) */}
                      {s.status === 'Draft' && s.totalStudents > 0 && s.totalRooms > 0 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSpaceToPublish(s);
                          }}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            padding: '0.2rem 0.5rem',
                            height: 26,
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            lineHeight: 1,
                            whiteSpace: 'nowrap',
                            flexShrink: 0,
                            background: 'var(--accent-color, #F26F21)',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                          }}
                          title="Mở cổng đăng ký tự do cho sinh viên"
                        >
                          <Globe size={11} strokeWidth={2.2} />
                          <span>Mở cổng</span>
                        </button>
                      )}

                      {/* Nút Chỉnh sửa */}
                      {s.status !== 'Locked' && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSpaceToEdit(s);
                          }}
                          title="Chỉnh sửa thông số Không gian học phần"
                          aria-label={`Chỉnh sửa Không gian học phần ${s.name}`}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 26,
                            height: 26,
                            borderRadius: '6px',
                            color: 'var(--text-secondary, #334155)',
                            background: 'var(--bg-subtle, #F8FAFC)',
                            border: '1px solid var(--border-light, #E2E8F0)',
                            cursor: 'pointer',
                            flexShrink: 0,
                          }}
                        >
                          <Pencil size={13} strokeWidth={2} />
                        </button>
                      )}

                      {/* Nút Xóa */}
                      {s.status !== 'Locked' && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSpaceToDelete(s);
                          }}
                          title="Xóa Không gian học phần"
                          aria-label={`Xóa Không gian học phần ${s.name}`}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 26,
                            height: 26,
                            borderRadius: '6px',
                            color: 'var(--text-muted, #64748B)',
                            background: 'var(--bg-subtle, #F8FAFC)',
                            border: '1px solid var(--border-light, #E2E8F0)',
                            cursor: 'pointer',
                            flexShrink: 0,
                          }}
                        >
                          <Trash2 size={13} strokeWidth={2} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Tên Không gian */}
                  <h3
                    style={{
                      fontSize: '15px',
                      fontWeight: 700,
                      color: 'var(--text-main, #0f172a)',
                      margin: '0 0 0.85rem 0',
                      lineHeight: 1.35,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {s.name}
                  </h3>

                  {/* 4 Chỉ số nhanh (2x2 Grid) */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, 1fr)',
                      gap: '0.55rem',
                      paddingTop: '0.75rem',
                      borderTop: '1px solid var(--border-light, #e2e8f0)',
                      fontSize: '0.8rem',
                      color: 'var(--text-muted, #64748b)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <Users size={14} style={{ color: 'var(--text-muted, #64748B)', flexShrink: 0 }} />
                      <span>SV FAP:</span>
                      <strong style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700, color: 'var(--text-main, #0f172a)', fontVariantNumeric: 'tabular-nums' }}>
                        {s.totalStudents}
                      </strong>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <DoorOpen size={14} style={{ color: 'var(--text-muted, #64748B)', flexShrink: 0 }} />
                      <span>Số Room:</span>
                      <strong style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700, color: 'var(--text-main, #0f172a)', fontVariantNumeric: 'tabular-nums' }}>
                        {s.totalRooms}
                      </strong>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <Hash size={14} style={{ color: 'var(--text-muted, #64748B)', flexShrink: 0 }} />
                      <span>Max/nhóm:</span>
                      <strong style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 650, color: 'var(--text-main, #0f172a)' }}>
                        {s.maxMembersPerGroup} SV
                      </strong>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <Calculator size={14} style={{ color: 'var(--text-muted, #64748B)', flexShrink: 0 }} />
                      <span>Buffer:</span>
                      <strong style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 650, color: 'var(--text-main, #0f172a)' }}>
                        x{s.bufferRatio}
                      </strong>
                    </div>
                  </div>

                  {/* Hạn chót */}
                  {s.registrationDeadline && (
                    <div
                      style={{
                        marginTop: '0.65rem',
                        paddingTop: '0.55rem',
                        borderTop: '1px dashed var(--border-light, #e2e8f0)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.5rem',
                        fontSize: '0.78rem',
                        color: 'var(--text-muted, #64748B)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', minWidth: 0, overflow: 'hidden' }}>
                        <Clock size={13} style={{ color: 'var(--text-muted, #64748B)', flexShrink: 0 }} />
                        <span style={{ whiteSpace: 'nowrap' }}>Hạn chót:</span>
                        <span
                          style={{
                            fontFamily: 'var(--font-mono, monospace)',
                            fontWeight: 700,
                            color: 'var(--text-main, #0f172a)',
                            fontVariantNumeric: 'tabular-nums',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {formatDateTime(s.registrationDeadline)}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Selection Indicator Footer */}
                  <div style={{ marginTop: '0.75rem', paddingTop: '0.55rem', borderTop: '1px solid var(--border-light, #e2e8f0)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    {isSelected ? (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          color: 'var(--fpt-orange, #f26f21)',
                        }}
                      >
                        <CheckCircle2 size={13} strokeWidth={2.5} />
                        <span>Đang chọn điều phối</span>
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-light, #94A3B8)' }}>
                        Bấm để quản lý không gian này
                      </span>
                    )}

                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        color: 'var(--text-light, #94a3b8)',
                      }}
                    >
                      ID: {s.id.slice(0, 8)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4-PHASE PROGRESS TIMELINE (VÒNG ĐỜI HỌC KỲ CAO CẤP) */}
      <div
        style={{
          backgroundColor: 'var(--bg-card, #FFFFFF)',
          border: '1px solid var(--border-light, #E2E8F0)',
          borderRadius: 20,
          padding: '24px',
          marginBottom: '1.5rem',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h3 style={{ fontSize: '16.5px', fontWeight: 700, color: 'var(--text-main, #0F172A)', margin: 0 }}>
              Tiến trình 4 Giai đoạn Vòng đời Học kỳ
            </h3>
            <p style={{ fontSize: '13.5px', color: 'var(--text-muted, #64748B)', margin: '3px 0 0 0' }}>
              Trạng thái tự động cập nhật: Khởi tạo phòng → Đóng đăng ký → Điều phối Matching → Chốt sổ
            </p>
          </div>
          <span
            style={{
              padding: '4px 12px',
              borderRadius: 999,
              fontSize: '13px',
              fontWeight: 700,
              backgroundColor: 'var(--bg-subtle, #F8FAFC)',
              color: 'var(--text-main, #0F172A)',
              border: '1px solid var(--border-light, #E2E8F0)',
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

        {/* 4 Phase Cards with Interactive Polish */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
          {[
            { phase: 1, title: '1. Bản nháp cấu hình', desc: 'Thiết lập sĩ số & nạp danh sách FAP' },
            { phase: 2, title: '2. Đang mở đăng ký', desc: 'Sinh viên tự do vào phòng & lập nhóm' },
            { phase: 3, title: '3. Đã đóng đăng ký', desc: 'Chờ điều phối sinh viên lẻ qua gRPC' },
            { phase: 4, title: '4. Đã chốt sổ học kỳ', desc: 'Khóa cứng danh sách & quản trị đổi chéo' },
          ].map((item) => {
            const isActive = currentPhase === item.phase;
            const isPassed = currentPhase > item.phase;
            return (
              <div
                key={item.phase}
                style={{
                  cursor: 'default',
                  padding: '12px 14px',
                  borderRadius: 12,
                  border: isActive ? '2px solid var(--accent-color, #F26F21)' : '1px solid var(--border-light, #E2E8F0)',
                  backgroundColor: isActive ? 'var(--bg-card, #FFFFFF)' : 'var(--bg-subtle, #F8FAFC)',
                  boxShadow: isActive ? '0 2px 8px rgba(242, 111, 33, 0.12)' : 'none',
                  transition: 'transform 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '14.5px', fontWeight: 700, color: isActive ? 'var(--text-main, #0F172A)' : 'var(--text-secondary, #334155)' }}>
                    {item.title}
                  </span>
                  {isPassed ? (
                    <CheckCircle2 size={16} color="#10B981" />
                  ) : isActive ? (
                    <div style={{ width: 8, height: 8, borderRadius: 999, backgroundColor: 'var(--accent-color, #F26F21)' }} />
                  ) : null}
                </div>
                <p style={{ fontSize: '13px', color: 'var(--text-muted, #64748B)', margin: 0 }}>
                  {item.desc}
                </p>
              </div>
            );
          })}
        </div>

        {/* Phase Contextual Smart Action Bar */}
        <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--border-subtle, #F1F5F9)', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            {space.status === 'Draft' && (
              <>
                {totalStudentsCount === 0 ? (
                  <button
                    type="button"
                    onClick={() => setImportModalOpen(true)}
                    style={{
                      height: 38,
                      padding: '0 14px',
                      borderRadius: 10,
                      backgroundColor: 'var(--fpt-orange, #f26f21)',
                      color: '#FFFFFF',
                      border: 'none',
                      fontSize: '13.5px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <Upload size={15} />
                    <span>Nạp danh sách FAP ngay</span>
                  </button>
                ) : rawRooms.length === 0 ? (
                  <button
                    type="button"
                    onClick={() => setGenerateModalOpen(true)}
                    style={{
                      height: 38,
                      padding: '0 14px',
                      borderRadius: 10,
                      background: 'var(--accent-gradient, var(--accent-color, #F26F21))',
                      color: '#FFFFFF',
                      border: 'none',
                      fontSize: '13.5px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <Sparkles size={15} />
                    <span>Khởi tạo {computedRoomsCount} Room tự động ngay</span>
                  </button>
                ) : null}
              </>
            )}

            {space.status === 'Open' && (
              <button
                type="button"
                onClick={handleCloseRegistration}
                style={{
                  height: 38,
                  padding: '0 14px',
                  borderRadius: 10,
                  backgroundColor: '#1E293B',
                  color: '#FFFFFF',
                  border: '1px solid var(--border-medium, #334155)',
                  fontSize: '13.5px',
                  fontWeight: 650,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Lock size={15} />
                <span>Đóng đăng ký tự nguyện</span>
              </button>
            )}

            {space.status === 'ClosedRegistration' && (
              <Link to="/moderator/distribution" style={{ textDecoration: 'none' }}>
                <button
                  type="button"
                  style={{
                    height: 38,
                    padding: '0 16px',
                    borderRadius: 10,
                    background: 'var(--accent-gradient, linear-gradient(135deg, #f26f21 0%, #ea580c 100%))',
                    color: '#FFFFFF',
                    border: 'none',
                    fontSize: '14px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 7,
                    boxShadow: '0 2px 8px rgba(242, 111, 33, 0.25)',
                  }}
                >
                  <Users size={16} />
                  <span>Mở màn hình Điều phối Sinh viên lẻ (Phase 5) →</span>
                </button>
              </Link>
            )}

            {space.status === 'Locked' && (
              <>
                <Link to="/moderator/transfers" style={{ textDecoration: 'none' }}>
                  <button
                    type="button"
                    style={{
                      height: 38,
                      padding: '0 16px',
                      borderRadius: 10,
                      background: 'var(--accent-gradient, linear-gradient(135deg, #f26f21 0%, #ea580c 100%))',
                      color: '#FFFFFF',
                      border: 'none',
                      fontSize: '14px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 7,
                      boxShadow: '0 2px 8px rgba(242, 111, 33, 0.25)',
                    }}
                  >
                    <ArrowLeftRight size={16} />
                    <span>Mở màn hình Quản lý Chuyển nhóm & Đổi chéo (Phase 6) →</span>
                  </button>
                </Link>

                <button
                  type="button"
                  onClick={handleReopenRegistration}
                  style={{
                    height: 38,
                    padding: '0 14px',
                    borderRadius: 10,
                    border: '1px solid var(--border-medium, #CBD5E1)',
                    backgroundColor: 'var(--bg-card, #FFFFFF)',
                    color: 'var(--text-main, #0F172A)',
                    fontSize: '13.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                  title="Mở lại cổng đăng ký tự do (Open) để test tiếp hoặc nạp thêm sinh viên"
                >
                  <RotateCcw size={15} />
                  <span>Mở lại đăng ký (Reopen)</span>
                </button>
              </>
            )}
          </div>

          {space.registrationDeadline && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '13px', color: 'var(--text-muted, #64748B)' }}>
              <Clock size={15} style={{ color: 'var(--accent-color, #F26F21)' }} />
              <span>Hạn chót tự do: </span>
              <strong style={{ color: 'var(--text-main, #0F172A)', fontFamily: 'var(--font-mono, monospace)' }}>
                {formatDateTime(space.registrationDeadline)}
              </strong>
            </div>
          )}
        </div>
      </div>

      {/* SEGMENTED SUB-TAB SWITCHER (TÁCH BIỆT ROOMS, FAP, CONFIG) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', maxWidth: '100%', backgroundColor: 'var(--bg-card, #FFFFFF)', padding: '5px', borderRadius: 12, border: '1px solid var(--border-light, #E2E8F0)' }}>
          <button
            type="button"
            onClick={() => setActiveSubTab('rooms')}
            style={{
              padding: '8px 14px',
              borderRadius: 9,
              fontSize: '14px',
              fontWeight: 700,
              cursor: 'pointer',
              border: 'none',
              backgroundColor: activeSubTab === 'rooms' ? 'var(--accent-color, #F26F21)' : 'transparent',
              color: activeSubTab === 'rooms' ? '#FFFFFF' : 'var(--text-muted, #64748B)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              transition: 'all 0.15s ease',
            }}
          >
            <Grid size={16} />
            <span>Phòng học phần (Rooms)</span>
            <span
              style={{
                padding: '1px 7px',
                borderRadius: 999,
                fontSize: '12px',
                fontFamily: 'var(--font-mono, monospace)',
                fontVariantNumeric: 'tabular-nums',
                backgroundColor: activeSubTab === 'rooms' ? 'rgba(255, 255, 255, 0.25)' : 'var(--bg-tag, #F1F5F9)',
                color: activeSubTab === 'rooms' ? '#FFFFFF' : 'var(--text-secondary, #334155)',
              }}
            >
              {rawRooms.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('fap')}
            style={{
              padding: '8px 14px',
              borderRadius: 9,
              fontSize: '14px',
              fontWeight: 700,
              cursor: 'pointer',
              border: 'none',
              backgroundColor: activeSubTab === 'fap' ? 'var(--accent-color, #F26F21)' : 'transparent',
              color: activeSubTab === 'fap' ? '#FFFFFF' : 'var(--text-muted, #64748B)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              transition: 'all 0.15s ease',
            }}
          >
            <Users size={16} />
            <span>Danh sách SV hợp lệ (FAP)</span>
            <span
              style={{
                padding: '1px 7px',
                borderRadius: 999,
                fontSize: '12px',
                fontFamily: 'var(--font-mono, monospace)',
                fontVariantNumeric: 'tabular-nums',
                backgroundColor: activeSubTab === 'fap' ? 'rgba(255, 255, 255, 0.25)' : 'var(--bg-tag, #F1F5F9)',
                color: activeSubTab === 'fap' ? '#FFFFFF' : 'var(--text-secondary, #334155)',
              }}
            >
              {totalStudentsCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('config')}
            style={{
              padding: '8px 14px',
              borderRadius: 9,
              fontSize: '14px',
              fontWeight: 700,
              cursor: 'pointer',
              border: 'none',
              backgroundColor: activeSubTab === 'config' ? 'var(--accent-color, #F26F21)' : 'transparent',
              color: activeSubTab === 'config' ? '#FFFFFF' : 'var(--text-muted, #64748B)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              transition: 'all 0.15s ease',
            }}
          >
            <Settings size={16} />
            <span>Cấu hình & Sinh phòng</span>
          </button>
        </div>

        {/* Quick actions for current active tab */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {activeSubTab === 'rooms' && (
            <>
              <button
                type="button"
                onClick={() => setImportModalOpen(true)}
                disabled={importing}
                style={{
                  height: 38,
                  padding: '0 14px',
                  borderRadius: 10,
                  border: '1px solid var(--border-medium, #CBD5E1)',
                  backgroundColor: 'var(--bg-card, #FFFFFF)',
                  color: 'var(--text-main, #0F172A)',
                  fontSize: '13.5px',
                  fontWeight: 650,
                  cursor: importing ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Upload size={14} />
                <span>Import FAP</span>
              </button>

              <button
                type="button"
                onClick={() => setGenerateModalOpen(true)}
                disabled={isLocked || totalStudentsCount === 0 || roomsInUse}
                style={{
                  height: 38,
                  padding: '0 14px',
                  borderRadius: 10,
                  border: 'none',
                  backgroundColor: isLocked || totalStudentsCount === 0 || roomsInUse ? 'var(--border-medium, #CBD5E1)' : 'var(--accent-color, #F26F21)',
                  color: '#FFFFFF',
                  fontSize: '13.5px',
                  fontWeight: 700,
                  cursor: isLocked || totalStudentsCount === 0 || roomsInUse ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <LayoutGrid size={15} />
                <span>Khởi tạo Room ({computedRoomsCount})</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          TAB 1: DANH SÁCH PHÒNG HỌC PHẦN (ROOM CARDS TRỰC TIẾP TRÊN SPACE)
         ══════════════════════════════════════════════════════════════ */}
      {activeSubTab === 'rooms' && (
        <div>
          {/* Room Filter Bar */}
          <div
            style={{
              backgroundColor: 'var(--bg-card, #FFFFFF)',
              border: '1px solid var(--border-light, #E2E8F0)',
              borderRadius: 14,
              padding: '14px 18px',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              flexWrap: 'wrap',
            }}
          >
            <div className="motion-search-wrap" style={{ position: 'relative', width: 'min(100%, 320px)', flex: '1 1 220px' }}>
              <Search className="motion-search-icon" size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light, #94A3B8)', pointerEvents: 'none' }} />
              <input
                type="text"
                className="motion-search-input"
                placeholder="Tìm theo mã phòng (FA26EXE101-01), tên đề tài..."
                value={roomSearch}
                onChange={(e) => setRoomSearch(e.target.value)}
                style={{
                  width: '100%',
                  height: 38,
                  paddingLeft: '2.25rem',
                  paddingRight: roomSearch ? '2.1rem' : '12px',
                  borderRadius: 10,
                  border: '1px solid var(--border-medium, #CBD5E1)',
                  backgroundColor: 'var(--bg-subtle, #F8FAFC)',
                  color: 'var(--text-main, #0F172A)',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              {roomSearch && (
                <button
                  type="button"
                  className="motion-clear-btn"
                  aria-label="Xóa từ khóa tìm phòng"
                  onClick={() => setRoomSearch('')}
                  style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', width: 22, height: 22, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted, #64748B)', background: 'transparent', border: 'none', cursor: 'pointer' }}
                >
                  <X size={13} />
                </button>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <Filter size={15} style={{ color: 'var(--text-muted, #64748B)' }} />
              <select
                value={roomStatusFilter}
                onChange={(e) => setRoomStatusFilter(e.target.value)}
                style={{
                  height: 38,
                  padding: '0 10px',
                  borderRadius: 10,
                  border: '1px solid var(--border-medium, #CBD5E1)',
                  backgroundColor: 'var(--bg-input, #FFFFFF)',
                  fontSize: '13.5px',
                  fontWeight: 600,
                  color: 'var(--text-main, #0F172A)',
                  outline: 'none',
                }}
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="EMPTY">Chưa có người (Empty)</option>
                <option value="FORMING">Đang hình thành (Forming)</option>
                <option value="RECRUITING">Đang tuyển (Recruiting)</option>
                <option value="CLOSED">Đã đóng tuyển (Closed)</option>
                <option value="LOCKED">Đã chốt sổ (Locked)</option>
              </select>

              <select
                value={roomSeatFilter}
                onChange={(e) => setRoomSeatFilter(e.target.value)}
                style={{
                  height: 38,
                  padding: '0 10px',
                  borderRadius: 10,
                  border: '1px solid var(--border-medium, #CBD5E1)',
                  backgroundColor: 'var(--bg-input, #FFFFFF)',
                  fontSize: '13.5px',
                  fontWeight: 600,
                  color: 'var(--text-main, #0F172A)',
                  outline: 'none',
                }}
              >
                <option value="ALL">Mọi số chỗ trống</option>
                <option value="1">Còn từ 1 chỗ trống</option>
                <option value="2">Còn từ 2 chỗ trống</option>
                <option value="3">Còn từ 3 chỗ trống</option>
              </select>
            </div>
          </div>

          {/* Room Cards Grid */}
          {loadingRooms ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(320px, 100%), 1fr))', gap: '14px' }}>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="card" style={{ height: 180, opacity: 0.6 }} />
              ))}
            </div>
          ) : filteredRooms.length === 0 ? (
            <div
              style={{
                backgroundColor: 'var(--bg-card, #FFFFFF)',
                border: '1px solid var(--border-light, #E2E8F0)',
                borderRadius: 20,
                padding: '3rem 1.5rem',
                textAlign: 'center',
              }}
            >
              <DoorOpen size={48} style={{ color: 'var(--text-light, #94A3B8)', margin: '0 auto 12px', opacity: 0.4 }} />
              <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-main, #0F172A)', margin: '0 0 6px' }}>
                {roomSearch || roomStatusFilter !== 'ALL' || roomSeatFilter !== 'ALL'
                  ? 'Không tìm thấy phòng nào khớp với bộ lọc'
                  : 'Chưa có Room nào được khởi tạo trong Không gian này'}
              </h3>
              <p style={{ fontSize: '14px', color: 'var(--text-muted, #64748B)', maxWidth: 520, margin: '0 auto 16px' }}>
                {totalStudentsCount === 0
                  ? 'Chưa có danh sách sinh viên FAP. Vui lòng chuyển qua tab "Danh sách SV hợp lệ (FAP)" để nạp file danh sách lớp.'
                  : rawRooms.length === 0
                  ? 'Hãy bấm "Khởi tạo Room tự động" để hệ thống tự động sinh các Room từ FA26EXE101-01 trở đi theo chuẩn công thức FPT.'
                  : 'Thử xóa từ khóa tìm kiếm hoặc đặt lại các bộ lọc trạng thái để xem đầy đủ các phòng.'}
              </p>
              {totalStudentsCount > 0 && rawRooms.length === 0 && (
                <button
                  type="button"
                  onClick={() => setGenerateModalOpen(true)}
                  style={{
                    height: 42,
                    padding: '0 18px',
                    borderRadius: 10,
                    border: 'none',
                    background: 'var(--accent-gradient, var(--accent-color, #F26F21))',
                    color: '#FFFFFF',
                    fontSize: '14px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <Sparkles size={16} />
                  <span>Khởi tạo {computedRoomsCount} Room tự động ngay</span>
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(320px, 100%), 1fr))', gap: '14px' }}>
              {filteredRooms.map((room) => {
                const remaining = Math.max(0, room.maxMembers - room.currentMembers);
                return (
                  <div
                    key={room.id}
                    className="motion-card-interactive"
                    style={{
                      backgroundColor: 'var(--bg-card, #FFFFFF)',
                      border: '1px solid var(--border-light, #E2E8F0)',
                      borderRadius: 16,
                      padding: '18px 20px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                    }}
                  >
                    <div>
                      {/* Zone 1: Room Code & Status Badge */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <span
                          style={{
                            fontFamily: 'var(--font-mono, monospace)',
                            fontWeight: 700,
                            fontSize: '13.5px',
                            color: 'var(--text-main, #0F172A)',
                            backgroundColor: 'var(--bg-tag, #F1F5F9)',
                            padding: '2px 8px',
                            borderRadius: 6,
                          }}
                        >
                          {room.code}
                        </span>

                        {room.status === 'Forming' && (
                          <span style={{ fontSize: '12px', fontWeight: 650, color: 'var(--text-secondary, #334155)', backgroundColor: 'var(--bg-subtle, #F8FAFC)', border: '1px solid var(--border-light, #E2E8F0)', padding: '2px 8px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#10B981' }} />
                            Đang lập nhóm
                          </span>
                        )}
                        {room.status === 'Recruiting' && (
                          <span style={{ fontSize: '12px', fontWeight: 650, color: 'var(--text-secondary, #334155)', backgroundColor: 'var(--bg-subtle, #F8FAFC)', border: '1px solid var(--border-light, #E2E8F0)', padding: '2px 8px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#F59E0B' }} />
                            Đang tuyển
                          </span>
                        )}
                        {(room.status === 'Empty' || room.status === 'Closed' || room.status === 'Locked') && (
                          <span style={{ fontSize: '12px', fontWeight: 650, color: 'var(--text-muted, #64748B)', backgroundColor: 'var(--bg-subtle, #F8FAFC)', border: '1px solid var(--border-light, #E2E8F0)', padding: '2px 8px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#94A3B8' }} />
                            {room.status === 'Empty' ? 'Phòng trống' : room.status === 'Closed' ? 'Đã đóng tuyển' : 'Đã chốt sổ'}
                          </span>
                        )}
                      </div>

                      {/* Zone 2: Room Name & Topic */}
                      <h4 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main, #0F172A)', margin: '0 0 6px', letterSpacing: '-0.01em' }}>
                        {room.name}
                      </h4>

                      <div style={{ minHeight: 44 }}>
                        {room.topic ? (
                          <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-secondary, #334155)', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                            {room.topic}
                          </div>
                        ) : room.status === 'Empty' ? (
                          <div style={{ fontSize: '13px', color: 'var(--text-light, #94A3B8)' }}>
                            Chưa có thành viên nào ghi danh
                          </div>
                        ) : (
                          <div style={{ fontSize: '13px', color: 'var(--text-muted, #64748B)' }}>
                            Đang thảo luận định hướng đề tài khởi nghiệp
                          </div>
                        )}
                      </div>

                      {/* Micro 5-skill distribution meter */}
                      {room.avgSkills && (
                        <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed var(--border-light, #E2E8F0)' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px' }}>
                            {SKILLS.map((sk) => {
                              const val = room.avgSkills?.[sk.key] || 0;
                              return (
                                <div key={sk.key} title={`${sk.name}: ${val}%`} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                  <div style={{ height: 4, borderRadius: 2, backgroundColor: 'var(--border-light, #E2E8F0)', overflow: 'hidden' }}>
                                    <div style={{ width: `${val}%`, height: '100%', backgroundColor: sk.color, borderRadius: 2 }} />
                                  </div>
                                  <span style={{ fontSize: '11px', color: 'var(--text-muted, #64748B)', textAlign: 'center', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                                    {sk.name} {val}%
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Zone 3: Footer with Member counts + Action button */}
                    <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid var(--border-subtle, #F1F5F9)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main, #0F172A)', fontVariantNumeric: 'tabular-nums' }}>
                          {room.currentMembers}/{room.maxMembers} SV
                        </span>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted, #64748B)' }}>
                          ({remaining} chỗ trống)
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => setInspectRoom(room)}
                        style={{
                          height: 32,
                          padding: '0 12px',
                          borderRadius: 8,
                          border: '1px solid var(--border-medium, #CBD5E1)',
                          backgroundColor: 'var(--bg-card, #FFFFFF)',
                          color: 'var(--text-main, #0F172A)',
                          fontSize: '12.5px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                        }}
                      >
                        <Eye size={13} />
                        <span>Xem chi tiết</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          TAB 2: DANH SÁCH SINH VIÊN HỢP LỆ (FAP ROSTER)
         ══════════════════════════════════════════════════════════════ */}
      {activeSubTab === 'fap' && (
        <div
          style={{
            backgroundColor: 'var(--bg-card, #FFFFFF)',
            border: '1px solid var(--border-light, #E2E8F0)',
            borderRadius: 20,
            padding: '24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
          }}
        >
          {/* Header & Tools */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: 'var(--bg-tag, #F1F5F9)', border: '1px solid var(--border-light, #E2E8F0)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-main, #0F172A)' }}>
                <Database size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '16.5px', fontWeight: 700, color: 'var(--text-main, #0F172A)', margin: 0 }}>
                  Danh sách Sinh viên Đủ điều kiện Học phần (Đồng bộ từ FAP)
                </h3>
                <span style={{ fontSize: '13.5px', color: 'var(--text-muted, #64748B)' }}>
                  Dữ liệu sinh viên đủ điều kiện học kỳ {space.semesterCode} môn {space.subjectCode} đồng bộ từ hệ thống đào tạo FAP
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setImportModalOpen(true)}
                disabled={importing}
                style={{
                  height: 40,
                  padding: '0 16px',
                  borderRadius: 10,
                  border: '1px solid var(--border-medium, #334155)',
                  backgroundColor: '#1E293B',
                  color: '#FFFFFF',
                  fontSize: '14px',
                  fontWeight: 700,
                  cursor: importing ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 7,
                  boxShadow: '0 2px 6px rgba(15, 23, 42, 0.2)',
                }}
              >
                <Upload size={15} />
                <span>{importing ? 'Đang nhập danh sách...' : 'Tải lên file CSV / Excel chuẩn FAP'}</span>
              </button>

              {isLocalhost && (
                <a
                  href="http://localhost:8025"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    height: 40,
                    padding: '0 14px',
                    borderRadius: 10,
                    border: '1px solid var(--border-light, #E2E8F0)',
                    backgroundColor: 'var(--bg-subtle, #F8FAFC)',
                    color: 'var(--text-secondary, #334155)',
                    fontSize: '13.5px',
                    fontWeight: 700,
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <ExternalLink size={15} />
                  <span>MailHog (localhost:8025)</span>
                </a>
              )}
            </div>
          </div>

          {importErrors.length > 0 && (
            <div style={{ padding: '12px 16px', borderRadius: 12, backgroundColor: 'rgba(239, 68, 68, 0.10)', border: '1px solid #FECACA', color: '#B91C1C', fontSize: '13.5px', marginBottom: '1rem' }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>File có {importErrors.length} dòng sai, chưa nhập sinh viên nào:</div>
              <ul style={{ margin: 0, paddingLeft: 18, maxHeight: 140, overflowY: 'auto' }}>
                {importErrors.slice(0, 50).map((m, idx) => (
                  <li key={idx}>{m}</li>
                ))}
              </ul>
            </div>
          )}

          {syncStatus && (
            <div style={{ padding: '10px 14px', borderRadius: 10, backgroundColor: 'var(--bg-subtle, #F8FAFC)', border: '1px solid var(--border-light, #E2E8F0)', display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1rem' }}>
              <ShieldCheck size={18} color="#10B981" />
              <span style={{ fontSize: '13.5px', color: 'var(--text-main, #0F172A)', fontWeight: 600 }}>{syncStatus}</span>
            </div>
          )}

          {/* Search & Filter Bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
            <div className="motion-search-wrap" style={{ position: 'relative', width: 'min(100%, 340px)', flex: '1 1 240px' }}>
              <Search className="motion-search-icon" size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light, #94A3B8)', pointerEvents: 'none' }} />
              <input
                type="text"
                className="motion-search-input"
                placeholder="Tìm theo MSSV, Họ tên, Email, Lớp..."
                value={searchStudent}
                onChange={(e) => {
                  setSearchStudent(e.target.value);
                  setCurrentPage(1);
                }}
                style={{
                  width: '100%',
                  height: 38,
                  paddingLeft: '2.25rem',
                  paddingRight: searchStudent ? '2.1rem' : '12px',
                  borderRadius: 10,
                  border: '1px solid var(--border-medium, #CBD5E1)',
                  backgroundColor: 'var(--bg-subtle, #F8FAFC)',
                  color: 'var(--text-main, #0F172A)',
                  fontSize: '13.5px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              {searchStudent && (
                <button
                  type="button"
                  className="motion-clear-btn"
                  aria-label="Xóa từ khóa tìm sinh viên"
                  onClick={() => {
                    setSearchStudent('');
                    setCurrentPage(1);
                  }}
                  style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', width: 22, height: 22, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted, #64748B)', background: 'transparent', border: 'none', cursor: 'pointer' }}
                >
                  <X size={13} />
                </button>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <select
                value={selectedMajor}
                onChange={(e) => {
                  setSelectedMajor(e.target.value);
                  setCurrentPage(1);
                }}
                style={{
                  height: 38,
                  padding: '0 10px',
                  borderRadius: 10,
                  border: '1px solid var(--border-medium, #CBD5E1)',
                  backgroundColor: 'var(--bg-input, #FFFFFF)',
                  fontSize: '13.5px',
                  fontWeight: 600,
                  color: 'var(--text-main, #0F172A)',
                  outline: 'none',
                }}
              >
                <option value="ALL">Tất cả ngành</option>
                <option value="SE">Kỹ thuật phần mềm (SE)</option>
                <option value="AI">Trí tuệ nhân tạo (AI)</option>
                <option value="GD">Thiết kế đồ họa (GD)</option>
                <option value="MKT">Marketing (MKT)</option>
                <option value="IB">Kinh doanh quốc tế (IB)</option>
              </select>

              <select
                value={profileStatusFilter}
                onChange={(e) => {
                  setProfileStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                style={{
                  height: 38,
                  padding: '0 10px',
                  borderRadius: 10,
                  border: '1px solid var(--border-medium, #CBD5E1)',
                  backgroundColor: 'var(--bg-input, #FFFFFF)',
                  fontSize: '13.5px',
                  fontWeight: 600,
                  color: 'var(--text-main, #0F172A)',
                  outline: 'none',
                }}
              >
                <option value="ALL">Mọi trạng thái hồ sơ</option>
                <option value="COMPLETED">Đã hoàn tất hồ sơ</option>
                <option value="INCOMPLETE">Chưa hoàn tất</option>
              </select>
            </div>
          </div>

          {/* Student Table */}
          <div style={{ overflowX: 'auto', border: '1px solid var(--border-light, #E2E8F0)', borderRadius: 12 }}>
            <table style={{ width: '100%', minWidth: 860, borderCollapse: 'collapse', textAlign: 'left', fontSize: '13.5px' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-subtle, #F8FAFC)', borderBottom: '1px solid var(--border-light, #E2E8F0)' }}>
                  <th style={{ padding: '10px 12px', fontWeight: 700, color: 'var(--text-main, #0F172A)', whiteSpace: 'nowrap' }}>MSSV</th>
                  <th style={{ padding: '10px 12px', fontWeight: 700, color: 'var(--text-main, #0F172A)', whiteSpace: 'nowrap' }}>Họ và tên</th>
                  <th style={{ padding: '10px 12px', fontWeight: 700, color: 'var(--text-main, #0F172A)', whiteSpace: 'nowrap' }}>Email trường (@fpt.edu.vn)</th>
                  <th style={{ padding: '10px 12px', fontWeight: 700, color: 'var(--text-main, #0F172A)', whiteSpace: 'nowrap' }}>Chuyên ngành</th>
                  <th style={{ padding: '10px 12px', fontWeight: 700, color: 'var(--text-main, #0F172A)', whiteSpace: 'nowrap' }}>Khóa</th>
                  <th style={{ padding: '10px 12px', fontWeight: 700, color: 'var(--text-main, #0F172A)', whiteSpace: 'nowrap' }}>Lớp FAP</th>
                  <th style={{ padding: '10px 12px', fontWeight: 700, color: 'var(--text-main, #0F172A)', whiteSpace: 'nowrap' }}>Tài khoản</th>
                  <th style={{ padding: '10px 12px', fontWeight: 700, color: 'var(--text-main, #0F172A)', whiteSpace: 'nowrap' }}>Hồ sơ 5 Kỹ năng</th>
                </tr>
              </thead>
              <tbody>
                {paginatedStudents.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted, #64748B)' }}>
                      {totalStudentsCount === 0 ? 'Chưa có sinh viên. Bấm “Tải lên file CSV / Excel chuẩn FAP” để thêm danh sách lớp.' : 'Không tìm thấy sinh viên nào khớp với từ khóa tìm kiếm.'}
                    </td>
                  </tr>
                ) : (
                  paginatedStudents.map((st) => (
                    <tr key={st.id} style={{ borderBottom: '1px solid var(--border-subtle, #F1F5F9)' }}>
                      <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono, monospace)', fontWeight: 700, color: 'var(--text-main, #0F172A)', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                        {st.studentCode}
                      </td>
                      <td style={{ padding: '8px 12px', fontWeight: 700, color: 'var(--text-main, #0F172A)' }}>
                        {st.fullName}
                      </td>
                      <td style={{ padding: '8px 12px', color: 'var(--text-muted, #64748B)' }}>
                        {st.email}
                      </td>
                      <td style={{ padding: '8px 12px', color: 'var(--text-main, #0F172A)' }}>
                        {st.major}
                      </td>
                      <td style={{ padding: '8px 12px', color: 'var(--text-muted, #64748B)', fontWeight: 600 }}>
                        {st.cohort}
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <span style={{ padding: '2px 7px', borderRadius: 6, fontSize: '12px', fontWeight: 700, backgroundColor: 'var(--bg-subtle, #F8FAFC)', border: '1px solid var(--border-light, #E2E8F0)', color: 'var(--text-main, #0F172A)' }}>
                          {st.classCode}
                        </span>
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: 999, fontSize: '12px', fontWeight: 600, backgroundColor: 'var(--bg-subtle, #F8FAFC)', color: 'var(--text-secondary, #334155)', border: '1px solid var(--border-light, #E2E8F0)' }}>
                          <Check size={12} color="#10B981" /> Đã cấp
                        </span>
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        {st.profileCompleted ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '2px 9px', borderRadius: 999, fontSize: '12px', fontWeight: 600, backgroundColor: 'var(--bg-subtle, #F8FAFC)', color: 'var(--text-secondary, #334155)', border: '1px solid var(--border-light, #E2E8F0)' }}>
                            <span style={{ width: 6, height: 6, borderRadius: 999, backgroundColor: '#10B981', flexShrink: 0 }} />
                            Đã hoàn tất
                          </span>
                        ) : (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '2px 9px', borderRadius: 999, fontSize: '12px', fontWeight: 600, backgroundColor: 'var(--bg-subtle, #F8FAFC)', color: 'var(--text-secondary, #334155)', border: '1px solid var(--border-light, #E2E8F0)' }}>
                            <span style={{ width: 6, height: 6, borderRadius: 999, backgroundColor: '#94A3B8', flexShrink: 0 }} />
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '14px', flexWrap: 'wrap', gap: '10px' }}>
              <span style={{ fontSize: '13.5px', color: 'var(--text-muted, #64748B)' }}>
                Hiển thị {filteredStudents.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} - {Math.min(currentPage * pageSize, filteredStudents.length)} trên tổng {totalStudentsCount} SV FAP (Trang <strong style={{ color: 'var(--text-main, #0F172A)' }}>{currentPage}</strong> / {totalPages})
              </span>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  style={{
                    height: 36,
                    padding: '0 12px',
                    borderRadius: 8,
                    border: '1px solid var(--border-medium, #CBD5E1)',
                    backgroundColor: 'var(--bg-card, #FFFFFF)',
                    color: currentPage === 1 ? 'var(--text-light, #94A3B8)' : 'var(--text-main, #0F172A)',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <ChevronLeft size={14} />
                  <span>Trước</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  style={{
                    height: 36,
                    padding: '0 12px',
                    borderRadius: 8,
                    border: '1px solid var(--border-medium, #CBD5E1)',
                    backgroundColor: 'var(--bg-card, #FFFFFF)',
                    color: currentPage === totalPages ? 'var(--text-light, #94A3B8)' : 'var(--text-main, #0F172A)',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <span>Sau</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          TAB 3: CẤU HÌNH THÔNG SỐ & KHỞI TẠO PHÒNG HÀNG LOẠT
         ══════════════════════════════════════════════════════════════ */}
      {activeSubTab === 'config' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(480px, 100%), 1fr))', gap: '1.5rem' }}>
          {/* Box 1: Cấu hình Thông số Ghép nhóm */}
          <div
            style={{
              backgroundColor: 'var(--bg-card, #FFFFFF)',
              border: '1px solid var(--border-light, #E2E8F0)',
              borderRadius: 20,
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'var(--bg-subtle, #F8FAFC)', border: '1px solid var(--border-light, #E2E8F0)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-color, #F26F21)', flexShrink: 0 }}>
                  <Settings size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '16.5px', fontWeight: 700, color: 'var(--text-main, #0F172A)', margin: 0 }}>
                    Cấu hình Thông số Ghép nhóm ({space.subjectCode})
                  </h3>
                  <span style={{ fontSize: '13.5px', color: 'var(--text-muted, #64748B)' }}>
                    Quy định sĩ số tối đa và hạn ngạch nộp đơn trong học kỳ
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(200px, 100%), 1fr))', gap: '12px' }}>
                  <div style={{ padding: '12px', borderRadius: 12, backgroundColor: 'var(--bg-subtle, #F8FAFC)', border: '1px solid var(--border-light, #E2E8F0)' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary, #334155)', marginBottom: '6px' }}>
                      Sĩ số tối đa mỗi nhóm
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="number"
                        min={4}
                        max={6}
                        value={maxMembers}
                        onChange={(e) => setMaxMembers(Number(e.target.value))}
                        style={{
                          width: 72,
                          height: 38,
                          padding: '0 10px',
                          borderRadius: 8,
                          border: '1px solid var(--border-medium, #CBD5E1)',
                          backgroundColor: 'var(--bg-input, #FFFFFF)',
                          fontSize: '15px',
                          fontWeight: 700,
                          color: 'var(--text-main, #0F172A)',
                          fontVariantNumeric: 'tabular-nums',
                          outline: 'none',
                        }}
                      />
                      <span style={{ fontSize: '13px', color: 'var(--text-muted, #64748B)' }}>SV/nhóm</span>
                    </div>
                  </div>

                  <div style={{ padding: '12px', borderRadius: 12, backgroundColor: 'var(--bg-subtle, #F8FAFC)', border: '1px solid var(--border-light, #E2E8F0)' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary, #334155)', marginBottom: '6px' }}>
                      Hệ số phòng dự phòng
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="number"
                        step={0.1}
                        min={1.0}
                        max={2.0}
                        value={reserveRatio}
                        onChange={(e) => setReserveRatio(Number(e.target.value))}
                        style={{
                          width: 72,
                          height: 38,
                          padding: '0 10px',
                          borderRadius: 8,
                          border: '1px solid var(--border-medium, #CBD5E1)',
                          backgroundColor: 'var(--bg-input, #FFFFFF)',
                          fontSize: '15px',
                          fontWeight: 700,
                          color: 'var(--text-main, #0F172A)',
                          fontVariantNumeric: 'tabular-nums',
                          outline: 'none',
                        }}
                      />
                      <span style={{ fontSize: '13px', color: 'var(--text-muted, #64748B)' }}>× dự phòng</span>
                    </div>
                  </div>
                </div>

                <div style={{ padding: '12px 14px', borderRadius: 12, backgroundColor: 'var(--bg-subtle, #F8FAFC)', border: '1px solid var(--border-light, #E2E8F0)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-main, #0F172A)' }}>
                      Ngưỡng tối thiểu thành lập nhóm
                    </span>
                    <span style={{ fontSize: '12.5px', fontWeight: 650, color: 'var(--text-secondary, #334155)', backgroundColor: 'var(--bg-card, #FFFFFF)', border: '1px solid var(--border-light, #E2E8F0)', padding: '2px 8px', borderRadius: 999 }}>
                      Tự động tính: {minThreshold} thành viên
                    </span>
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted, #64748B)', margin: 0, lineHeight: 1.45 }}>
                    Khi đạt đủ 3 người, phòng tự động khóa vào thẳng và chuyển sang chế độ Nhóm chính thức (chỉ nhận thêm thành viên qua đơn ứng tuyển).
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(200px, 100%), 1fr))', gap: '12px' }}>
                  <div style={{ padding: '12px', borderRadius: 12, backgroundColor: 'var(--bg-subtle, #F8FAFC)', border: '1px solid var(--border-light, #E2E8F0)' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary, #334155)', marginBottom: '6px' }}>
                      Giới hạn đơn chờ cùng lúc
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="number"
                        min={1}
                        max={5}
                        value={maxPendingRequests}
                        onChange={(e) => setMaxPendingRequests(Number(e.target.value))}
                        style={{
                          width: 72,
                          height: 38,
                          padding: '0 10px',
                          borderRadius: 8,
                          border: '1px solid var(--border-medium, #CBD5E1)',
                          backgroundColor: 'var(--bg-input, #FFFFFF)',
                          fontSize: '15px',
                          fontWeight: 700,
                          color: 'var(--text-main, #0F172A)',
                          fontVariantNumeric: 'tabular-nums',
                          outline: 'none',
                        }}
                      />
                      <span style={{ fontSize: '13px', color: 'var(--text-muted, #64748B)' }}>đơn/SV</span>
                    </div>
                  </div>

                  <div style={{ padding: '12px', borderRadius: 12, backgroundColor: 'var(--bg-subtle, #F8FAFC)', border: '1px solid var(--border-light, #E2E8F0)' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary, #334155)', marginBottom: '6px' }}>
                      Hạn đóng đăng ký tự nguyện
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Calendar size={15} color="#64748B" style={{ flexShrink: 0 }} />
                      <input
                        type="datetime-local"
                        value={deadline}
                        onChange={(e) => setDeadline(e.target.value)}
                        style={{
                          width: '100%',
                          height: 38,
                          padding: '0 8px',
                          borderRadius: 8,
                          border: '1px solid var(--border-medium, #CBD5E1)',
                          backgroundColor: 'var(--bg-input, #FFFFFF)',
                          fontSize: '13px',
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

            <div style={{ marginTop: '1.25rem', paddingTop: '12px', borderTop: '1px solid var(--border-subtle, #F1F5F9)' }}>
              <button
                type="button"
                onClick={handleSaveConfig}
                style={{
                  width: '100%',
                  height: 42,
                  borderRadius: 10,
                  background: 'var(--accent-gradient, linear-gradient(135deg, #f26f21 0%, #ea580c 100%))',
                  color: '#FFFFFF',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '14.5px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  boxShadow: '0 2px 6px rgba(242, 111, 33, 0.25)',
                }}
              >
                <Save size={16} />
                <span>Lưu cấu hình thông số</span>
              </button>
            </div>
          </div>

          {/* Box 2: Khởi tạo Phòng trống Hàng loạt */}
          <div
            style={{
              backgroundColor: 'var(--bg-card, #FFFFFF)',
              border: '1px solid var(--border-light, #E2E8F0)',
              borderRadius: 20,
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'var(--bg-subtle, #F8FAFC)', border: '1px solid var(--border-light, #E2E8F0)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-color, #F26F21)', flexShrink: 0 }}>
                  <Hash size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '16.5px', fontWeight: 700, color: 'var(--text-main, #0F172A)', margin: 0 }}>
                    Khởi tạo Phòng trống Hàng loạt
                  </h3>
                  <span style={{ fontSize: '13.5px', color: 'var(--text-muted, #64748B)' }}>
                    Tự động tính toán số lượng phòng cần thiết dựa trên sĩ số FAP
                  </span>
                </div>
              </div>

              {/* FPT Formula Breakdown */}
              <div style={{ padding: '14px 16px', borderRadius: 12, backgroundColor: 'var(--bg-subtle, #F8FAFC)', border: '1px solid var(--border-light, #E2E8F0)', marginBottom: '14px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary, #334155)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  Công thức tính số lượng phòng tự động
                </div>

                <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px', marginBottom: '8px', fontVariantNumeric: 'tabular-nums' }}>
                  <span style={{ padding: '4px 10px', borderRadius: 6, backgroundColor: 'var(--bg-card, #FFFFFF)', border: '1px solid var(--border-medium, #CBD5E1)', fontSize: '13.5px', fontWeight: 700, color: 'var(--text-main, #0F172A)' }}>
                    {totalStudentsCount} SV FAP
                  </span>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-muted, #64748B)' }}>÷</span>
                  <span style={{ padding: '4px 10px', borderRadius: 6, backgroundColor: 'var(--bg-card, #FFFFFF)', border: '1px solid var(--border-medium, #CBD5E1)', fontSize: '13.5px', fontWeight: 700, color: 'var(--text-main, #0F172A)' }}>
                    {maxMembers} người/nhóm
                  </span>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-muted, #64748B)' }}>×</span>
                  <span style={{ padding: '4px 10px', borderRadius: 6, backgroundColor: 'var(--bg-card, #FFFFFF)', border: '1px solid var(--border-medium, #CBD5E1)', fontSize: '13.5px', fontWeight: 700, color: 'var(--text-main, #0F172A)' }}>
                    Hệ số {reserveRatio}
                  </span>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-muted, #64748B)' }}>=</span>
                  <span style={{ padding: '4px 12px', borderRadius: 6, background: 'var(--accent-gradient, linear-gradient(135deg, #f26f21 0%, #ea580c 100%))', fontSize: '14px', fontWeight: 700, color: '#FFFFFF' }}>
                    {computedRoomsCount} Phòng trống
                  </span>
                </div>

                <p style={{ fontSize: '13px', color: 'var(--text-muted, #64748B)', margin: 0, lineHeight: 1.45 }}>
                  Hệ số dự phòng {reserveRatio} đảm bảo dư tối thiểu 2 phòng trống để sinh viên chủ động chọn nhóm phù hợp.
                </p>
              </div>

              {/* Generate Trigger Button */}
              <button
                type="button"
                onClick={() => setGenerateModalOpen(true)}
                disabled={isLocked || totalStudentsCount === 0 || roomsInUse}
                title={totalStudentsCount === 0 ? 'Cần tải danh sách sinh viên FAP trước' : roomsInUse ? 'Đã có sinh viên vào phòng nên không tạo lại được' : undefined}
                style={{
                  width: '100%',
                  height: 42,
                  borderRadius: 10,
                  backgroundColor: isLocked || totalStudentsCount === 0 || roomsInUse ? 'var(--border-medium, #CBD5E1)' : 'var(--accent-color, #F26F21)',
                  color: '#FFFFFF',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '14px',
                  cursor: isLocked || totalStudentsCount === 0 || roomsInUse ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  marginBottom: '14px',
                }}
              >
                <Sparkles size={16} />
                <span>
                  {totalStudentsCount === 0
                    ? 'Cần tải danh sách sinh viên FAP trước'
                    : `Khởi tạo tự động ${computedRoomsCount} Phòng trống (${space.semesterCode}${space.subjectCode}-01 → ...-${computedRoomsCount < 10 ? `0${computedRoomsCount}` : computedRoomsCount})`}
                </span>
              </button>

              {/* Quick Room Overview */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-muted, #64748B)', textTransform: 'uppercase' }}>
                    Phòng hiện có ({rawRooms.length} phòng)
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveSubTab('rooms')}
                    style={{ fontSize: '12.5px', color: 'var(--text-main, #0F172A)', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 700 }}
                  >
                    Xem chi tiết lưới phòng →
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(130px, 100%), 1fr))', gap: '8px', maxHeight: 160, overflowY: 'auto' }}>
                  {rawRooms.slice(0, 18).map((room) => (
                    <div
                      key={room.id}
                      style={{
                        padding: '6px 10px',
                        borderRadius: 8,
                        border: '1px solid var(--border-light, #E2E8F0)',
                        backgroundColor: 'var(--bg-subtle, #F8FAFC)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 4,
                      }}
                    >
                      <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-main, #0F172A)', fontFamily: 'var(--font-mono, monospace)' }}>
                        {room.roomCode ?? room.name}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary, #334155)', backgroundColor: 'var(--bg-card, #FFFFFF)', border: '1px solid var(--border-light, #E2E8F0)', padding: '1px 6px', borderRadius: 999, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                        {room.memberCount}/{room.maxMembers}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
