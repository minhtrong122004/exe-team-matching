import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Users, CheckCircle2, Search, Eye, Layers, TrendingUp, RefreshCw } from '../../utils/icons';
import { useAuth } from '../../contexts/AuthContext';
import { useSelectedSpace, selectSpace } from '../../hooks/useSelectedSpace';
import {
  workspaceApi,
  errorMessage,
  formatDateTime,
  SPACE_STATUS_LABEL,
  ROOM_STATUS_LABEL,
  spaceLabel,
  type RosterGroup,
  type SpaceRoster,
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
  Modal,
  Table,
  td,
  fieldStyle,
  SkillBars,
  SKILL_KEYS,
  averageSkills,
  useToast,
  ROOM_STATUS_DOT,
  type SkillScores,
} from '../../components/workspace/ui';

/** Biểu đồ radar 5 kỹ năng trung bình của nhóm (SVG thuần, không cần thư viện). */
const SkillRadar: React.FC<{ scores: SkillScores }> = ({ scores }) => {
  const size = 240;
  const c = size / 2;
  const r = 82;
  const point = (i: number, value: number) => {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / SKILL_KEYS.length;
    return [c + Math.cos(angle) * r * (value / 100), c + Math.sin(angle) * r * (value / 100)];
  };
  const polygon = SKILL_KEYS.map(({ key }, i) => point(i, scores[key]).join(',')).join(' ');
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width="100%" style={{ maxWidth: 280 }} role="img" aria-label="Biểu đồ 5 kỹ năng trung bình">
      {[25, 50, 75, 100].map((ring) => (
        <polygon
          key={ring}
          points={SKILL_KEYS.map((_, i) => point(i, ring).join(',')).join(' ')}
          fill="none"
          stroke="var(--border-light, #E2E8F0)"
          strokeWidth={1}
        />
      ))}
      {SKILL_KEYS.map((_, i) => {
        const [x, y] = point(i, 100);
        return <line key={i} x1={c} y1={c} x2={x} y2={y} stroke="var(--border-light, #E2E8F0)" strokeWidth={1} />;
      })}
      <polygon points={polygon} fill="var(--accent-color, #F26F21)" fillOpacity={0.18} stroke="var(--accent-color, #F26F21)" strokeWidth={2} />
      {SKILL_KEYS.map(({ key, label }, i) => {
        const [x, y] = point(i, 122);
        return (
          <text key={key} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize={11} fontWeight={600} fill="var(--text-muted, #64748B)">
            {label} {scores[key]}
          </text>
        );
      })}
    </svg>
  );
};

const majorsSummary = (group: RosterGroup) => {
  const counts = new Map<string, number>();
  group.members.forEach((m) => counts.set(m.major || 'Khác', (counts.get(m.major || 'Khác') ?? 0) + 1));
  return [...counts.entries()].map(([major, n]) => `${major} (${n})`).join(', ') || '—';
};

export const LecturerDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { spaces, space, loading: spacesLoading, error: spacesError } = useSelectedSpace();
  const toast = useToast();

  const [roster, setRoster] = useState<SpaceRoster | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<RosterGroup | null>(null);
  const [exporting, setExporting] = useState(false);

  const spaceId = space?.id;

  const load = useCallback(async () => {
    if (!spaceId) return;
    setLoading(true);
    try {
      setRoster(await workspaceApi.getRoster(spaceId));
      setError(null);
    } catch (err) {
      setError(errorMessage(err, 'Không tải được danh sách nhóm.'));
    } finally {
      setLoading(false);
    }
  }, [spaceId]);

  useEffect(() => {
    setRoster(null);
    setSearch('');
    void load();
  }, [load]);

  const groups = useMemo(() => {
    const list = (roster?.groups ?? []).filter((g) => g.memberCount > 0);
    const q = search.trim().toLowerCase();
    const filtered = q
      ? list.filter((g) =>
          [g.roomCode, g.groupName, g.projectTitle ?? '', g.leaderName ?? '', ...g.members.map((m) => `${m.fullName} ${m.studentCode}`)]
            .join(' ')
            .toLowerCase()
            .includes(q)
        )
      : list;
    return [...filtered].sort((a, b) => a.roomCode.localeCompare(b.roomCode));
  }, [roster, search]);

  const groupedStudents = roster?.groups.reduce((sum, g) => sum + g.memberCount, 0) ?? 0;
  const fullGroups = roster?.groups.filter((g) => g.memberCount > 0 && g.memberCount >= g.maxMembers).length ?? 0;
  const activeGroups = roster?.groups.filter((g) => g.memberCount > 0).length ?? 0;

  const handleExport = async () => {
    if (!space) return;
    setExporting(true);
    try {
      const blob = await workspaceApi.exportRosterCsv(space.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Danh_sach_nhom_${space.subjectCode}_${space.semesterCode}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.show('Đã tải file CSV danh sách nhóm.');
    } catch (err) {
      toast.show(errorMessage(err, 'Không xuất được file CSV.'), 'error');
    } finally {
      setExporting(false);
    }
  };

  const header = (
    <PageHeader
      title="Danh sách nhóm"
      meta={space ? <Pill dot="var(--accent-color, #F26F21)">{SPACE_STATUS_LABEL[space.status]}</Pill> : undefined}
      actions={
        space ? (
          <>
            {spaces.length > 1 && (
              <select style={{ ...fieldStyle, width: 'auto', minWidth: 240 }} value={space.id} onChange={(e) => selectSpace(e.target.value)}>
                {spaces.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.semesterCode} · {spaceLabel(s)}
                  </option>
                ))}
              </select>
            )}
            <Button variant="ghost" icon={<RefreshCw size={15} />} onClick={() => void load()}>
              Tải lại
            </Button>
            <Button icon={<Download size={16} />} loading={exporting} onClick={handleExport}>
              Xuất CSV
            </Button>
          </>
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

  const selectedScores = selected ? averageSkills(selected.members) : null;

  return (
    <PageShell>
      {toast.node}
      {header}

      {error && <Banner tone="error">{error}</Banner>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: '1.5rem' }}>
        {[
          { icon: <Users size={18} />, label: 'Sinh viên', value: roster?.totalStudents ?? '—' },
          { icon: <CheckCircle2 size={18} />, label: 'Đã có nhóm', value: roster ? groupedStudents : '—' },
          { icon: <Layers size={18} />, label: 'Số nhóm', value: roster ? activeGroups : '—' },
          { icon: <TrendingUp size={18} />, label: 'Đủ người / đã khóa', value: roster ? `${fullGroups} / ${roster.lockedGroups}` : '—' },
        ].map((s) => (
          <Card key={s.label} padding={18}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, color: 'var(--text-muted, #64748B)', fontWeight: 600 }}>
              <span style={{ color: 'var(--accent-color, #F26F21)', display: 'flex' }}>{s.icon}</span>
              {s.label}
            </div>
            <div style={{ fontSize: 26, fontWeight: 750, color: 'var(--text-main, #0F172A)', marginTop: 6, fontVariantNumeric: 'tabular-nums' }}>{s.value}</div>
          </Card>
        ))}
      </div>

      <Card>
        <CardTitle
          icon={<Layers size={18} />}
          title={`Nhóm (${groups.length})`}
          right={
            <div style={{ position: 'relative', width: 'min(320px, 100%)' }}>
              <Search size={15} style={{ position: 'absolute', left: 12, top: 13, color: 'var(--text-light, #94A3B8)' }} />
              <input
                type="text"
                placeholder="Tìm nhóm, sinh viên..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ ...fieldStyle, paddingLeft: '2.25rem', backgroundColor: 'var(--bg-subtle, #F8FAFC)' }}
              />
            </div>
          }
        />
        {loading && !roster ? (
          <StateBox kind="loading" />
        ) : groups.length === 0 ? (
          <StateBox kind="empty" message={search ? 'Không có nhóm khớp từ khóa.' : 'Chưa có nhóm nào có thành viên trong môn học này.'} />
        ) : (
          <Table headers={['Phòng', 'Nhóm / Đề tài', 'Trưởng nhóm', 'Sĩ số', 'Ngành', 'Trạng thái', '']}>
            {groups.map((g) => (
              <tr key={g.groupId}>
                <td style={{ ...td, fontWeight: 800, color: '#0054A6', whiteSpace: 'nowrap' }}>{g.roomCode}</td>
                <td style={td}>
                  <div style={{ fontWeight: 700 }}>{g.groupName}</div>
                  {g.projectTitle && <div style={{ fontSize: 13.5, color: 'var(--text-muted, #64748B)' }}>{g.projectTitle}</div>}
                </td>
                <td style={td}>{g.leaderName ?? '—'}</td>
                <td style={{ ...td, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                  {g.memberCount}/{g.maxMembers}
                </td>
                <td style={{ ...td, fontSize: 13.5, color: 'var(--text-muted, #64748B)' }}>{majorsSummary(g)}</td>
                <td style={td}>
                  <Pill dot={ROOM_STATUS_DOT[g.status]}>{ROOM_STATUS_LABEL[g.status] ?? g.status}</Pill>
                </td>
                <td style={td}>
                  <Button variant="outline" style={{ height: 34 }} icon={<Eye size={15} />} onClick={() => setSelected(g)}>
                    Chi tiết
                  </Button>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        width={980}
        title={selected ? `${selected.roomCode} — ${selected.groupName}` : ''}
        subtitle={selected ? `${selected.memberCount}/${selected.maxMembers} thành viên • ${ROOM_STATUS_LABEL[selected.status] ?? selected.status}` : undefined}
      >
        {selected && selectedScores && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(360px, 100%), 1fr))', gap: 20 }}>
            <Table headers={['Thành viên', 'Ngành', 'Vai trò', 'Vào nhóm']} minWidth={480}>
              {selected.members.map((m) => (
                <tr key={m.studentId}>
                  <td style={td}>
                    <div style={{ fontWeight: 700 }}>{m.fullName}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted, #64748B)' }}>
                      {m.studentCode} • {m.email}
                    </div>
                  </td>
                  <td style={td}>{m.major}</td>
                  <td style={td}>{m.role === 'Leader' ? <Pill tone="accent">Trưởng nhóm</Pill> : <Pill>Thành viên</Pill>}</td>
                  <td style={{ ...td, fontSize: 13.5, color: 'var(--text-muted, #64748B)', whiteSpace: 'nowrap' }}>{formatDateTime(m.joinedAt)}</td>
                </tr>
              ))}
            </Table>
            <div>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                <SkillRadar scores={selectedScores} />
              </div>
              <SkillBars scores={selectedScores} />
            </div>
          </div>
        )}
      </Modal>
    </PageShell>
  );
};

export default LecturerDashboardPage;
