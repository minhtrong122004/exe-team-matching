import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Download,
  Users,
  CheckCircle2,
  Search,
  Eye,
  X,
  Sparkles,
  TrendingUp,
  Layers,
} from '../../utils/icons';
import { useSelectedSpace, selectSpace } from '../../hooks/useSelectedSpace';
import { workspaceApi, errorMessage, type SpaceRoster } from '../../api/workspace';
import { StateBox } from '../../components/workspace/ui';

// Giao diện giữ nguyên bản thiết kế của Tú; dữ liệu lấy từ roster thật của Group Service.

interface GroupMember {
  studentCode: string;
  fullName: string;
  email: string;
  major: string;
  classCode: string;
  role: 'Leader' | 'Member';
  skills: {
    tech: number;
    management: number;
    graphicDesign: number;
    marketing: number;
    sale: number;
  };
}

interface LecturerGroup {
  id: string;
  code: string;
  topic: string;
  topicDesc: string;
  memberCount: number;
  maxMembers: number;
  leaderName: string;
  majorsSummary: string;
  balanceScore: number;
  status: 'Locked' | 'Closed' | string;
  members: GroupMember[];
}

// Compute average radar skills of a group
const computeGroupAverageSkills = (members: GroupMember[]) => {
  if (!members.length) return { tech: 0, management: 0, graphicDesign: 0, marketing: 0, sale: 0 };
  const sum = members.reduce(
    (acc, m) => ({
      tech: acc.tech + m.skills.tech,
      management: acc.management + m.skills.management,
      graphicDesign: acc.graphicDesign + m.skills.graphicDesign,
      marketing: acc.marketing + m.skills.marketing,
      sale: acc.sale + m.skills.sale,
    }),
    { tech: 0, management: 0, graphicDesign: 0, marketing: 0, sale: 0 }
  );
  const n = members.length;
  return {
    tech: Math.round(sum.tech / n),
    management: Math.round(sum.management / n),
    graphicDesign: Math.round(sum.graphicDesign / n),
    marketing: Math.round(sum.marketing / n),
    sale: Math.round(sum.sale / n),
  };
};

/** Chỉ số cân bằng: 100 trừ chênh lệch giữa kỹ năng mạnh nhất và yếu nhất (điểm trung bình của nhóm). */
const computeBalanceScore = (members: GroupMember[]) => {
  if (!members.length) return 0;
  const avg = Object.values(computeGroupAverageSkills(members));
  return Math.max(0, Math.min(100, 100 - (Math.max(...avg) - Math.min(...avg))));
};

const toLecturerGroups = (roster: SpaceRoster | null): LecturerGroup[] =>
  (roster?.groups ?? [])
    .filter((g) => g.memberCount > 0)
    .sort((a, b) => a.roomCode.localeCompare(b.roomCode))
    .map((g) => {
      const members: GroupMember[] = g.members.map((m) => ({
        studentCode: m.studentCode,
        fullName: m.fullName,
        email: m.email,
        major: m.major,
        classCode: m.cohort || '—',
        role: m.role === 'Leader' ? 'Leader' : 'Member',
        skills: {
          tech: m.techScore,
          management: m.managementScore,
          graphicDesign: m.graphicDesignScore,
          marketing: m.marketingScore,
          sale: m.saleScore,
        },
      }));
      const majorCounts = new Map<string, number>();
      members.forEach((m) => majorCounts.set(m.major || 'Khác', (majorCounts.get(m.major || 'Khác') ?? 0) + 1));
      return {
        id: g.groupId,
        code: g.roomCode,
        topic: g.projectTitle || g.groupName,
        topicDesc: g.projectTitle ? g.groupName : '',
        memberCount: g.memberCount,
        maxMembers: g.maxMembers,
        leaderName: g.leaderName || '—',
        majorsSummary: [...majorCounts.entries()].map(([k, v]) => `${k} (${v})`).join(', '),
        balanceScore: computeBalanceScore(members),
        status: g.status,
        members,
      };
    });

export const LecturerDashboardPage: React.FC = () => {
  const { spaces, space, loading: spacesLoading, error: spacesError } = useSelectedSpace();
  const [roster, setRoster] = useState<SpaceRoster | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedGroupModal, setSelectedGroupModal] = useState<LecturerGroup | null>(null);
  const selectedCourse = space?.id ?? '';
  const setSelectedCourse = (id: string) => selectSpace(id);

  const spaceId = space?.id;
  const load = useCallback(async () => {
    if (!spaceId) return;
    try {
      setRoster(await workspaceApi.getRoster(spaceId));
      setLoadError(null);
    } catch (err) {
      setLoadError(errorMessage(err, 'Không tải được danh sách nhóm.'));
    }
  }, [spaceId]);

  useEffect(() => {
    setRoster(null);
    void load();
  }, [load]);

  // Đồng bộ thời gian thực bảng theo dõi tiến độ nhóm của giảng viên
  useEffect(() => {
    const handleRealtime = () => void load();
    window.addEventListener('realtime:space-updated', handleRealtime);
    window.addEventListener('realtime:group-updated', handleRealtime);
    window.addEventListener('realtime:member-transferred', handleRealtime);
    return () => {
      window.removeEventListener('realtime:space-updated', handleRealtime);
      window.removeEventListener('realtime:group-updated', handleRealtime);
      window.removeEventListener('realtime:member-transferred', handleRealtime);
    };
  }, [load]);

  const LECTURER_GROUPS = useMemo(() => toLecturerGroups(roster), [roster]);

  // Số liệu thống kê
  const totalStudents = roster?.totalStudents ?? 0;
  const groupedStudents = LECTURER_GROUPS.reduce((n, g) => n + g.memberCount, 0);
  const groupedPercent = totalStudents > 0 ? Math.round((groupedStudents / totalStudents) * 100) : 0;
  const fullGroups = LECTURER_GROUPS.filter((g) => g.memberCount >= g.maxMembers).length;
  const avgBalance = LECTURER_GROUPS.length
    ? Math.round(LECTURER_GROUPS.reduce((n, g) => n + g.balanceScore, 0) / LECTURER_GROUPS.length)
    : 0;

  // Export CSV Handler (file do backend tạo từ roster thật)
  const handleExportCSV = async () => {
    if (!space) return;
    try {
      const blob = await workspaceApi.exportRosterCsv(space.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Danh_sach_nhom_cham_diem_${space.subjectCode}_${space.semesterCode}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      setLoadError(errorMessage(err, 'Không xuất được file CSV.'));
    }
  };

  const filteredGroups = LECTURER_GROUPS.filter(
    (g) =>
      g.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.leaderName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!space) {
    return (
      <div style={{ padding: '0 0 3rem 0', maxWidth: 1560, margin: '0 auto' }}>
        <StateBox
          kind={spacesLoading ? 'loading' : spacesError ? 'error' : 'empty'}
          title={spacesLoading ? undefined : 'Chưa có không gian môn học'}
          message={spacesError ?? (spacesLoading ? 'Đang tải...' : 'Điều phối viên chưa tạo không gian môn học nào.')}
        />
      </div>
    );
  }

  return (
    <div style={{ padding: '0 0 3rem 0', maxWidth: 1560, margin: '0 auto' }}>
      {/* FPT Tricolor Brand Identity Line */}
      <div className="fpt-tricolor-bar" style={{ height: 3.5, borderRadius: 2, marginBottom: '1.25rem' }} />

      {/* Header */}
      <div style={{ marginBottom: '1.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
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
            <span>Giảng viên & Chấm điểm</span>
            <span style={{ color: '#CBD5E1' }}>/</span>
            <span style={{ color: '#334155', fontWeight: 600 }}>Dashboard giám sát & Xuất báo cáo</span>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 650, color: '#0F172A', margin: '0 0 4px 0', letterSpacing: '-0.02em' }}>
            Dashboard Giảng viên & Xuất Báo cáo Chấm điểm
          </h1>
          <p style={{ color: '#64748B', fontSize: '14.5px', margin: 0, lineHeight: 1.5 }}>
            Theo dõi tiến độ ghép nhóm học phần EXE, giám sát cơ cấu đa ngành và tải danh sách nhóm chính thức phục vụ công tác chấm điểm.
          </p>
        </div>

        {/* Course Select & CSV Export Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <select
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
            style={{
              height: 40,
              padding: '0 12px',
              borderRadius: 12,
              border: '1px solid var(--border-medium, #CBD5E1)',
              backgroundColor: 'var(--bg-card, #FFFFFF)',
              fontSize: '15px',
              fontWeight: 700,
              color: 'var(--text-main, #0F172A)',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            {spaces.map((sp) => (
              <option key={sp.id} value={sp.id}>
                Học kỳ {sp.semesterCode} • {sp.subjectCode}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleExportCSV}
            style={{
              height: 40,
              padding: '0 18px',
              borderRadius: 12,
              backgroundColor: '#15803D',
              color: '#FFFFFF',
              border: 'none',
              fontSize: '15px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 2px 6px rgba(21, 128, 61, 0.25)',
              transition: 'all 0.15s ease',
            }}
          >
            <Download size={16} />
            Xuất danh sách nhóm chấm điểm (.CSV)
          </button>
        </div>
      </div>

      {loadError && (
        <div style={{ padding: '12px 16px', borderRadius: 12, backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', marginBottom: '1.25rem', fontSize: '14.5px', fontWeight: 600 }}>
          {loadError}
        </div>
      )}

      {/* 4 Overview Statistics Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '1.75rem' }}>
        {/* Card 1 */}
        <div
          style={{
            backgroundColor: 'var(--bg-card, #FFFFFF)',
            border: '1px solid var(--border-light, #E2E8F0)',
            borderRadius: '20px',
            padding: '26px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-muted, #64748B)' }}>
              Tổng SV Đủ Điều Kiện
            </span>
            <div style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: '#FFF7ED', border: '1px solid #FED7AA', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-color, #F26F21)' }}>
              <Users size={18} />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-main, #0F172A)', fontVariantNumeric: 'tabular-nums' }}>
            {totalStudents}
          </div>
          <span style={{ fontSize: '14px', color: '#64748B', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
            <CheckCircle2 size={13} color="#10B981" /> Sinh viên có tên trên danh sách FAP
          </span>
        </div>

        {/* Card 2 */}
        <div
          style={{
            backgroundColor: 'var(--bg-card, #FFFFFF)',
            border: '1px solid var(--border-light, #E2E8F0)',
            borderRadius: '20px',
            padding: '26px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-muted, #64748B)' }}>
              Tỷ lệ Đã Ghép Nhóm
            </span>
            <div style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: '#FFF7ED', border: '1px solid #FED7AA', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-color, #F26F21)' }}>
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-main, #0F172A)', fontVariantNumeric: 'tabular-nums' }}>
            {groupedPercent}%
          </div>
          <span style={{ fontSize: '14px', color: 'var(--text-muted, #64748B)', marginTop: '4px', display: 'block' }}>
            {groupedStudents}/{totalStudents} sinh viên đã có nhóm
          </span>
        </div>

        {/* Card 3 */}
        <div
          style={{
            backgroundColor: 'var(--bg-card, #FFFFFF)',
            border: '1px solid var(--border-light, #E2E8F0)',
            borderRadius: '20px',
            padding: '26px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-muted, #64748B)' }}>
              Tổng Số Nhóm Hoàn Chỉnh
            </span>
            <div style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: '#FFF7ED', border: '1px solid #FED7AA', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-color, #F26F21)' }}>
              <Layers size={18} />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-main, #0F172A)', fontVariantNumeric: 'tabular-nums' }}>
            {LECTURER_GROUPS.length} nhóm
          </div>
          <span style={{ fontSize: '14px', color: 'var(--text-muted, #64748B)', marginTop: '4px', display: 'block' }}>
            {fullGroups}/{LECTURER_GROUPS.length} nhóm đạt sĩ số tối đa
          </span>
        </div>

        {/* Card 4 */}
        <div
          style={{
            backgroundColor: 'var(--bg-card, #FFFFFF)',
            border: '1px solid var(--border-light, #E2E8F0)',
            borderRadius: '20px',
            padding: '26px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-muted, #64748B)' }}>
              Cân Bằng Đa Ngành TB
            </span>
            <div style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: '#FFF7ED', border: '1px solid #FED7AA', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-color, #F26F21)' }}>
              <TrendingUp size={18} />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#C2410C', fontVariantNumeric: 'tabular-nums' }}>
            {LECTURER_GROUPS.length ? `${avgBalance}%` : '—'}
          </div>
          <span style={{ fontSize: '14px', color: '#64748B', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
            <Sparkles size={13} color="var(--accent-color, #F26F21)" /> Đạt tiêu chuẩn đánh giá EXE
          </span>
        </div>
      </div>

      {/* Group Table Card */}
      <div
        style={{
          backgroundColor: 'var(--bg-card, #FFFFFF)',
          border: '1px solid var(--border-light, #E2E8F0)',
          borderRadius: '20px',
          padding: '26px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-main, #0F172A)', margin: 0 }}>
              Danh sách Toàn bộ Các Nhóm Trong Môn ({filteredGroups.length} nhóm)
            </h3>
            <span style={{ fontSize: '14px', color: 'var(--text-muted, #64748B)' }}>
              Bấm vào bất kỳ nhóm nào để xem chi tiết danh sách thành viên và biểu đồ ngũ giác 5 kỹ năng
            </span>
          </div>

          {/* Search box */}
          <div style={{ position: 'relative', width: 300 }}>
            <Search size={15} style={{ position: 'absolute', left: 10, top: 11, color: 'var(--text-light, #94A3B8)' }} />
            <input
              type="text"
              placeholder="Tìm theo mã nhóm, tên đề tài hoặc trưởng nhóm..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                height: 36,
                paddingLeft: '2rem',
                paddingRight: '10px',
                borderRadius: 10,
                border: '1px solid var(--border-medium, #CBD5E1)',
                backgroundColor: 'var(--bg-subtle, #F8FAFC)',
                fontSize: '15px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto', border: '1px solid var(--border-light, #E2E8F0)', borderRadius: 12 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '15px' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-subtle, #F8FAFC)', borderBottom: '1px solid var(--border-light, #E2E8F0)' }}>
                <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--text-main, #0F172A)' }}>Mã nhóm</th>
                <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--text-main, #0F172A)' }}>Đề tài dự kiến</th>
                <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--text-main, #0F172A)' }}>Sĩ số</th>
                <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--text-main, #0F172A)' }}>Trưởng nhóm</th>
                <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--text-main, #0F172A)' }}>Cơ cấu chuyên ngành</th>
                <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--text-main, #0F172A)' }}>Cân bằng kỹ năng</th>
                <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--text-main, #0F172A)' }}>Trạng thái</th>
                <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--text-main, #0F172A)', textAlign: 'center' }}>Chi tiết</th>
              </tr>
            </thead>
            <tbody>
              {filteredGroups.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ padding: '28px', textAlign: 'center', color: 'var(--text-muted, #64748B)' }}>
                    {LECTURER_GROUPS.length === 0 ? 'Chưa có nhóm nào có thành viên trong môn học này.' : 'Không có nhóm khớp từ khóa.'}
                  </td>
                </tr>
              )}
              {filteredGroups.map((g) => (
                <tr
                  key={g.id}
                  onClick={() => setSelectedGroupModal(g)}
                  style={{
                    borderBottom: '1px solid var(--border-subtle, #F1F5F9)',
                    cursor: 'pointer',
                    transition: 'background-color 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-subtle, #F8FAFC)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <td style={{ padding: '12px 14px', fontFamily: 'var(--font-mono, monospace)', fontWeight: 700, color: '#C2410C' }}>
                    {g.code}
                  </td>
                  <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-main, #0F172A)', maxWidth: 260 }}>
                    {g.topic}
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{ padding: '2px 8px', borderRadius: 999, fontSize: '13px', fontWeight: 600, backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', color: '#334155', fontVariantNumeric: 'tabular-nums' }}>
                      {g.memberCount}/{g.maxMembers}
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px', color: 'var(--text-main, #0F172A)', fontWeight: 600 }}>
                    {g.leaderName}
                  </td>
                  <td style={{ padding: '12px 14px', color: 'var(--text-muted, #64748B)', fontSize: '14px' }}>
                    {g.majorsSummary}
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: '13.5px', fontWeight: 700, backgroundColor: '#FFF7ED', border: '1px solid #FED7AA', color: '#C2410C', fontVariantNumeric: 'tabular-nums' }}>
                      {g.balanceScore}%
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '2px 9px', borderRadius: 999, fontSize: '13px', fontWeight: 600, backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', color: '#334155' }}>
                      <span style={{ width: 6, height: 6, borderRadius: 999, backgroundColor: '#10B981' }} />
                      Đã chốt sổ
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedGroupModal(g);
                      }}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 6,
                        border: '1px solid var(--border-medium, #CBD5E1)',
                        backgroundColor: 'var(--bg-card, #FFFFFF)',
                        color: 'var(--text-main, #0F172A)',
                        fontSize: '14px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Eye size={13} />
                      Xem
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Group Detail & Radar Chart Modal */}
      {selectedGroupModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '26px',
          }}
          onClick={() => setSelectedGroupModal(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 780,
              maxHeight: '90vh',
              overflowY: 'auto',
              backgroundColor: 'var(--bg-card, #FFFFFF)',
              border: '1px solid var(--border-light, #E2E8F0)',
              borderRadius: '20px',
              padding: '24px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid var(--border-light, #E2E8F0)', paddingBottom: '14px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 800, fontSize: '17px', color: '#0054A6', backgroundColor: '#EFF6FF', padding: '3px 10px', borderRadius: 6, border: '1px solid #BFDBFE' }}>
                    {selectedGroupModal.code}
                  </span>
                  <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: '14px', fontWeight: 700, backgroundColor: 'rgba(5, 150, 105, 0.12)', color: '#059669' }}>
                    Sĩ số: {selectedGroupModal.memberCount}/{selectedGroupModal.maxMembers} thành viên
                  </span>
                  <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: '14px', fontWeight: 800, backgroundColor: 'rgba(124, 58, 237, 0.12)', color: '#7C3AED' }}>
                    Cân bằng: {selectedGroupModal.balanceScore}%
                  </span>
                </div>
                <h2 style={{ fontSize: '19px', fontWeight: 800, color: 'var(--text-main, #0F172A)', margin: '4px 0' }}>
                  {selectedGroupModal.topic}
                </h2>
                <p style={{ fontSize: '15px', color: 'var(--text-muted, #64748B)', margin: 0 }}>
                  {selectedGroupModal.topicDesc}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedGroupModal(null)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  border: '1px solid var(--border-light, #E2E8F0)',
                  backgroundColor: 'var(--bg-subtle, #F8FAFC)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-muted, #64748B)',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Split: Member Table vs Radar Chart */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px', marginBottom: '16px' }}>
              {/* Member List */}
              <div>
                <h4 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main, #0F172A)', marginBottom: '10px' }}>
                  Danh sách Thành viên Chính thức ({selectedGroupModal.members.length} SV)
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {selectedGroupModal.members.map((m) => (
                    <div
                      key={m.studentCode}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 12,
                        backgroundColor: 'var(--bg-subtle, #F8FAFC)',
                        border: '1px solid var(--border-light, #E2E8F0)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                        <span style={{ fontWeight: 650, fontSize: '15px', color: 'var(--text-main, #0F172A)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <span>{m.fullName}</span>
                          {m.role === 'Leader' && (
                            <span style={{ fontSize: '11.5px', fontWeight: 600, padding: '1px 7px', borderRadius: 5, backgroundColor: '#F1F5F9', border: '1px solid #E2E8F0', color: '#334155' }}>
                              Trưởng nhóm
                            </span>
                          )}
                        </span>
                        <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '13.5px', fontWeight: 600, color: '#475569' }}>
                          {m.studentCode}
                        </span>
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--text-muted, #64748B)' }}>
                        {m.major} • Lớp {m.classCode} • {m.email}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 5-Skills Radar Chart */}
              <div>
                <h4 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main, #0F172A)', marginBottom: '10px' }}>
                  Biểu đồ Ngũ giác Năng lực Nhóm (SVG Radar)
                </h4>
                {(() => {
                  const avg = computeGroupAverageSkills(selectedGroupModal.members);
                  // Radar geometry: center at (150, 130), radius = 80
                  const cx = 150;
                  const cy = 130;
                  const r = 75;
                  const angles = [-90, -18, 54, 126, 198].map((deg) => (deg * Math.PI) / 180);
                  const skillValues = [
                    avg.tech,
                    avg.management,
                    avg.graphicDesign,
                    avg.marketing,
                    avg.sale,
                  ];
                  const labels = ['Tech', 'Management', 'Graphic Design', 'Marketing', 'Sale'];

                  // Calculate polygon points
                  const points = angles.map((ang, i) => {
                    const dist = (skillValues[i] / 100) * r;
                    const x = cx + dist * Math.cos(ang);
                    const y = cy + dist * Math.sin(ang);
                    return `${x},${y}`;
                  }).join(' ');

                  // Grid background rings
                  const rings = [0.25, 0.5, 0.75, 1.0];

                  return (
                    <div style={{ textAlign: 'center', backgroundColor: 'var(--bg-subtle, #F8FAFC)', padding: '16px', borderRadius: 12, border: '1px solid var(--border-light, #E2E8F0)' }}>
                      <svg width="300" height="260" viewBox="0 0 300 260" style={{ overflow: 'visible', margin: '0 auto' }}>
                        {/* Rings */}
                        {rings.map((factor, idx) => {
                          const ringPoints = angles.map((ang) => {
                            const x = cx + r * factor * Math.cos(ang);
                            const y = cy + r * factor * Math.sin(ang);
                            return `${x},${y}`;
                          }).join(' ');
                          return (
                            <polygon
                              key={idx}
                              points={ringPoints}
                              fill="none"
                              stroke="var(--border-medium, #CBD5E1)"
                              strokeWidth="1"
                              strokeDasharray={idx < 3 ? '2,2' : undefined}
                            />
                          );
                        })}

                        {/* Axes */}
                        {angles.map((ang, i) => {
                          const x = cx + r * Math.cos(ang);
                          const y = cy + r * Math.sin(ang);
                          return (
                            <line
                              key={i}
                              x1={cx}
                              y1={cy}
                              x2={x}
                              y2={y}
                              stroke="var(--border-medium, #CBD5E1)"
                              strokeWidth="1"
                            />
                          );
                        })}

                        {/* Skill Value Polygon */}
                        <polygon
                          points={points}
                          fill="var(--accent-soft, rgba(242, 111, 33, 0.22))"
                          stroke="var(--accent-color, #F26F21)"
                          strokeWidth="2.5"
                        />

                        {/* Vertex Dots & Labels */}
                        {angles.map((ang, i) => {
                          const dist = (skillValues[i] / 100) * r;
                          const dotX = cx + dist * Math.cos(ang);
                          const dotY = cy + dist * Math.sin(ang);
                          const labelX = cx + (r + 24) * Math.cos(ang);
                          const labelY = cy + (r + 14) * Math.sin(ang);

                          return (
                            <g key={i}>
                              <circle cx={dotX} cy={dotY} r="4" fill="var(--accent-color, #F26F21)" />
                              <text
                                x={labelX}
                                y={labelY}
                                textAnchor="middle"
                                dominantBaseline="central"
                                fontSize="11"
                                fontWeight="700"
                                fill="var(--text-main, #0F172A)"
                              >
                                {labels[i]}: {skillValues[i]}
                              </text>
                            </g>
                          );
                        })}
                      </svg>

                      <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '10px', fontSize: '13px', color: 'var(--text-muted, #64748B)' }}>
                        <span>Tech: <strong>{avg.tech}</strong></span>
                        <span>Mgt: <strong>{avg.management}</strong></span>
                        <span>GD: <strong>{avg.graphicDesign}</strong></span>
                        <span>MKT: <strong>{avg.marketing}</strong></span>
                        <span>Sale: <strong>{avg.sale}</strong></span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Footer close button */}
            <div style={{ textAlign: 'right', borderTop: '1px solid var(--border-light, #E2E8F0)', paddingTop: '12px' }}>
              <button
                type="button"
                onClick={() => setSelectedGroupModal(null)}
                style={{
                  height: 44,
                  padding: '0 20px',
                  borderRadius: 12,
                  backgroundColor: 'var(--bg-subtle, #F8FAFC)',
                  border: '1px solid var(--border-medium, #CBD5E1)',
                  color: 'var(--text-main, #0F172A)',
                  fontWeight: 700,
                  fontSize: '15px',
                  cursor: 'pointer',
                }}
              >
                Đóng chi tiết
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default LecturerDashboardPage;