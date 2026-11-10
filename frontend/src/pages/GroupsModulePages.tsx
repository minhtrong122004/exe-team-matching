import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  Sparkles,
  Search,
  X,
  Crown,
  LogOut,
  Edit3,
  CheckCircle2,
  Clock,
  Layers,
  Vote,
  ThumbsUp,
  ThumbsDown,
  Lock,
  Unlock,
  ArrowLeftRight,
  ShieldAlert,
  Send,
  TrendingUp,
  UserPlus,
  Users,
} from '../utils/icons';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES & MOCK DATA
// ══════════════════════════════════════════════════════════════════════════════

export interface RoomMember {
  id: string;
  name: string;
  studentCode: string;
  classCode: string; // SE1801, GD1802...
  major: string;
  role: 'Leader' | 'Member';
  avatarBg: string;
  avatarText: string;
  joinedAt: string;
}

export interface RoomItem {
  id: string;
  code: string; // FA26EXE101-01 to FA26EXE101-06
  name: string;
  topic?: string;
  topicDesc?: string;
  status: 'Empty' | 'Forming' | 'Recruiting' | 'Closed' | 'Locked';
  currentMembers: number;
  maxMembers: number;
  members: RoomMember[];
  skillBalance?: number;
  neededSkills?: string[];
  isEarlyClosed?: boolean;
}

const INITIAL_ROOMS: RoomItem[] = [
  {
    id: 'room-01',
    code: 'FA26EXE101-01',
    name: 'Phòng nhóm khởi nghiệp 01',
    status: 'Empty',
    currentMembers: 0,
    maxMembers: 5,
    members: [],
  },
  {
    id: 'room-02',
    code: 'FA26EXE101-02',
    name: 'Phòng nhóm khởi nghiệp 02',
    status: 'Forming',
    currentMembers: 2,
    maxMembers: 5,
    members: [
      {
        id: 'user-02a',
        name: 'Trần Minh Quân',
        studentCode: 'SE185108',
        classCode: 'SE1801',
        major: 'Kỹ thuật phần mềm (SE)',
        role: 'Leader',
        avatarBg: '#F1F5F9',
        avatarText: '#334155',
        joinedAt: '08:30 • 08/11/2026',
      },
      {
        id: 'user-02b',
        name: 'Lê Hoàng Yến',
        studentCode: 'GD180215',
        classCode: 'GD1802',
        major: 'Thiết kế mỹ thuật số (GD)',
        role: 'Member',
        avatarBg: '#F1F5F9',
        avatarText: '#334155',
        joinedAt: '14:15 • 08/11/2026',
      },
    ],
  },
  {
    id: 'room-03',
    code: 'FA26EXE101-03',
    name: 'Phòng nhóm khởi nghiệp 03',
    topic: 'EcoCampus - Hệ thống Phân loại Rác Thông minh AI',
    topicDesc: 'Ứng dụng Computer Vision tự động phân loại rác thải tại nguồn cho các khu campus đại học và tòa nhà thông minh.',
    status: 'Recruiting',
    currentMembers: 3,
    maxMembers: 5,
    skillBalance: 94,
    neededSkills: ['Marketing', 'Sale'],
    members: [
      {
        id: 'user-03a',
        name: 'Nguyễn Đức Anh',
        studentCode: 'SE180201',
        classCode: 'SE1802',
        major: 'Kỹ thuật phần mềm (SE)',
        role: 'Leader',
        avatarBg: '#F1F5F9',
        avatarText: '#334155',
        joinedAt: '09:00 • 07/11/2026',
      },
      {
        id: 'user-03b',
        name: 'Phạm Bảo Trân',
        studentCode: 'SE180145',
        classCode: 'SE1801',
        major: 'Trí tuệ nhân tạo (AI)',
        role: 'Member',
        avatarBg: '#F1F5F9',
        avatarText: '#334155',
        joinedAt: '10:30 • 07/11/2026',
      },
      {
        id: 'user-03c',
        name: 'Võ Trọng Tín',
        studentCode: 'MKT18012',
        classCode: 'MKT1801',
        major: 'Digital Marketing (MKT)',
        role: 'Member',
        avatarBg: '#F1F5F9',
        avatarText: '#334155',
        joinedAt: '16:00 • 08/11/2026',
      },
    ],
  },
  {
    id: 'room-04',
    code: 'FA26EXE101-04',
    name: 'Phòng nhóm khởi nghiệp 04',
    topic: 'FinWise - Nền tảng Quản lý Tài chính Sinh viên',
    topicDesc: 'Trợ lý tài chính cá nhân tích hợp AI lập kế hoạch chi tiêu thông minh, hỗ trợ thanh toán học phí và tiết kiệm vi mô.',
    status: 'Recruiting',
    currentMembers: 4,
    maxMembers: 5,
    skillBalance: 88,
    neededSkills: ['Tech (Backend / Cloud)'],
    members: [
      {
        id: 'user-04a',
        name: 'Đặng Gia Huy',
        studentCode: 'IA180104',
        classCode: 'IA1801',
        major: 'An toàn thông tin (IA)',
        role: 'Leader',
        avatarBg: '#F1F5F9',
        avatarText: '#334155',
        joinedAt: '11:00 • 06/11/2026',
      },
      {
        id: 'user-04b',
        name: 'Bùi Phương Thảo',
        studentCode: 'SE180312',
        classCode: 'SE1803',
        major: 'Kỹ thuật phần mềm (SE)',
        role: 'Member',
        avatarBg: '#F1F5F9',
        avatarText: '#334155',
        joinedAt: '13:45 • 06/11/2026',
      },
      {
        id: 'user-04c',
        name: 'Trương Mỹ Linh',
        studentCode: 'IB180220',
        classCode: 'IB1802',
        major: 'Kinh doanh quốc tế (IB)',
        role: 'Member',
        avatarBg: '#F1F5F9',
        avatarText: '#334155',
        joinedAt: '15:20 • 07/11/2026',
      },
      {
        id: 'user-04d',
        name: 'Ngô Quốc Tuấn',
        studentCode: 'GD180155',
        classCode: 'GD1801',
        major: 'Thiết kế mỹ thuật số (GD)',
        role: 'Member',
        avatarBg: '#F1F5F9',
        avatarText: '#334155',
        joinedAt: '18:10 • 08/11/2026',
      },
    ],
  },
  {
    id: 'room-05',
    code: 'FA26EXE101-05',
    name: 'Phòng nhóm khởi nghiệp 05',
    topic: 'SafeRide - Nền tảng Đi chung xe Campus FPTU',
    topicDesc: 'Kết nối sinh viên có xe và sinh viên cần đi nhờ theo tuyến đường cố định đến campus, tối ưu chi phí và bảo đảm an toàn sinh viên.',
    status: 'Closed',
    currentMembers: 5,
    maxMembers: 5,
    members: [
      { id: 'u5a', name: 'Nguyễn Văn A', studentCode: 'SE180111', classCode: 'SE1801', major: 'SE', role: 'Leader', avatarBg: '#F1F5F9', avatarText: '#334155', joinedAt: '05/11/2026' },
      { id: 'u5b', name: 'Trần Thị B', studentCode: 'GD180222', classCode: 'GD1802', major: 'GD', role: 'Member', avatarBg: '#F1F5F9', avatarText: '#334155', joinedAt: '05/11/2026' },
      { id: 'u5c', name: 'Lê Văn C', studentCode: 'MKT18033', classCode: 'MKT1803', major: 'MKT', role: 'Member', avatarBg: '#F1F5F9', avatarText: '#334155', joinedAt: '06/11/2026' },
      { id: 'u5d', name: 'Phạm Thị D', studentCode: 'IB18044', classCode: 'IB1804', major: 'IB', role: 'Member', avatarBg: '#F1F5F9', avatarText: '#334155', joinedAt: '06/11/2026' },
      { id: 'u5e', name: 'Hoàng Văn E', studentCode: 'AI18055', classCode: 'AI1805', major: 'AI', role: 'Member', avatarBg: '#F1F5F9', avatarText: '#334155', joinedAt: '07/11/2026' },
    ],
  },
  {
    id: 'room-06',
    code: 'FA26EXE101-06',
    name: 'Phòng nhóm khởi nghiệp 06',
    topic: 'AgriTrust - Chuỗi cung ứng Nông sản sạch Blockchain',
    topicDesc: 'Giải pháp truy xuất nguồn gốc nông sản an toàn từ trang trại đến bàn ăn thông qua mã QR và hợp đồng thông minh.',
    status: 'Locked',
    currentMembers: 4,
    maxMembers: 5,
    members: [
      { id: 'u6a', name: 'Vũ Đức Thành', studentCode: 'SE180101', classCode: 'SE1801', major: 'SE', role: 'Leader', avatarBg: '#F1F5F9', avatarText: '#334155', joinedAt: '04/11/2026' },
      { id: 'u6b', name: 'Đỗ Thu Hà', studentCode: 'IB180202', classCode: 'IB1802', major: 'IB', role: 'Member', avatarBg: '#F1F5F9', avatarText: '#334155', joinedAt: '04/11/2026' },
      { id: 'u6c', name: 'Phan Minh Khang', studentCode: 'MKT180303', classCode: 'MKT1803', major: 'MKT', role: 'Member', avatarBg: '#F1F5F9', avatarText: '#334155', joinedAt: '05/11/2026' },
      { id: 'u6d', name: 'Lâm Gia Tuệ', studentCode: 'SE180404', classCode: 'SE1804', major: 'SE', role: 'Member', avatarBg: '#F1F5F9', avatarText: '#334155', joinedAt: '05/11/2026' },
    ],
  },
];

// ══════════════════════════════════════════════════════════════════════════════
// 1. GROUPS PAGE (/groups)
// ══════════════════════════════════════════════════════════════════════════════
export const GroupsPage: React.FC = () => {
  const { user } = useAuth();

  const [rooms, setRooms] = useState<RoomItem[]>(INITIAL_ROOMS);
  const [filterTab, setFilterTab] = useState<string>('ALL');
  const [slotFilter, setSlotFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Apply Modal state
  const [applyModalRoom, setApplyModalRoom] = useState<RoomItem | null>(null);
  const [applyIntro, setApplyIntro] = useState('');

  // Staff Inspection Modal state (Moderator / Lecturer)
  const [inspectRoomModal, setInspectRoomModal] = useState<RoomItem | null>(null);

  const isStaff = user?.role === 'Moderator' || user?.role === 'Lecturer';

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Tương tác trực tiếp: Tham gia ngay (Vào thẳng)
  const handleDirectJoin = (roomCode: string) => {
    setRooms((prev) =>
      prev.map((r) => {
        if (r.code !== roomCode) return r;

        const currentCount = r.members.length;
        const studentName = user?.fullName || 'Lữ Thành Tú';
        const studentCode = user?.studentCode || 'SE185102';
        const classCode = 'SE1801';
        const major = 'Kỹ thuật phần mềm (SE)';

        // Nếu phòng 0/5: làm Leader
        if (currentCount === 0) {
          const newMember: RoomMember = {
            id: 'current-user',
            name: studentName,
            studentCode,
            classCode,
            major,
            role: 'Leader',
            avatarBg: '#F1F5F9',
            avatarText: '#334155',
            joinedAt: 'Vừa xong',
          };
          showToast(`Chúc mừng! Bạn đã vào phòng ${r.code} và trở thành Nhóm trưởng (Leader)!`);
          return {
            ...r,
            currentMembers: 1,
            status: 'Forming',
            members: [newMember],
          };
        }

        // Nếu phòng 2/5 -> vào thẳng lên 3/5 và tự động chuyển sang "Nhóm đang tuyển (3/5)", khóa cổng vào thẳng!
        if (currentCount === 2) {
          const newMember: RoomMember = {
            id: 'current-user',
            name: studentName,
            studentCode,
            classCode,
            major,
            role: 'Member',
            avatarBg: '#F1F5F9',
            avatarText: '#334155',
            joinedAt: 'Vừa xong',
          };
          showToast(`Bạn đã vào phòng ${r.code}! Sĩ số đạt 3/5: Phòng chính thức chuyển sang chế độ "Nhóm đang tuyển" và khóa cổng vào thẳng.`);
          return {
            ...r,
            currentMembers: 3,
            status: 'Recruiting',
            skillBalance: 92,
            neededSkills: ['Marketing', 'Sale'],
            members: [...r.members, newMember],
          };
        }

        // Phòng 1/5 -> lên 2/5
        const newMember: RoomMember = {
          id: 'current-user',
          name: studentName,
          studentCode,
          classCode,
          major,
          role: 'Member',
          avatarBg: '#F1F5F9',
          avatarText: '#334155',
          joinedAt: 'Vừa xong',
        };
        showToast(`Bạn đã tham gia thành công phòng ${r.code}!`);
        return {
          ...r,
          currentMembers: currentCount + 1,
          members: [...r.members, newMember],
        };
      })
    );
  };

  // Nộp đơn ứng tuyển
  const handleConfirmApply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!applyModalRoom) return;
    showToast(`Đã nộp đơn ứng tuyển vào nhóm ${applyModalRoom.code} thành công! Nhóm trưởng và thành viên sẽ tiến hành biểu quyết xét duyệt.`);
    setApplyModalRoom(null);
    setApplyIntro('');
  };

  // Bộ lọc danh sách phòng
  const filteredRooms = rooms.filter((r) => {
    // Tab filter
    if (filterTab === 'EMPTY' && r.status !== 'Empty') return false;
    if (filterTab === 'FORMING' && r.status !== 'Forming') return false;
    if (filterTab === 'RECRUITING' && r.status !== 'Recruiting') return false;
    if (filterTab === 'CLOSED' && r.status !== 'Closed') return false;
    if (filterTab === 'LOCKED' && r.status !== 'Locked') return false;

    // Slot filter
    const remaining = r.maxMembers - r.currentMembers;
    if (slotFilter === '1' && remaining !== 1) return false;
    if (slotFilter === '2-3' && (remaining < 2 || remaining > 3)) return false;
    if (slotFilter === '4-5' && remaining < 4) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchCode = r.code.toLowerCase().includes(q);
      const matchName = r.name.toLowerCase().includes(q);
      const matchTopic = (r.topic || '').toLowerCase().includes(q);
      if (!matchCode && !matchName && !matchTopic) return false;
    }

    return true;
  });

  return (
    <div style={{ maxWidth: 1560, margin: '0 auto', paddingBottom: '3.5rem' }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: 24,
            right: 24,
            zIndex: 9999,
            backgroundColor: '#0F172A',
            color: '#FFFFFF',
            padding: '12px 20px',
            borderRadius: 12,
            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          <CheckCircle2 size={18} color="#22C55E" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* C. Page Header — EdTech Product Structure: Breadcrumb + Large Title + Concise Description */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12.5px',
            fontWeight: 450,
            color: 'var(--text-muted, #64748B)',
            marginBottom: '0.45rem',
          }}
        >
          <span>Học phần</span>
          <span style={{ color: 'var(--text-light, #CBD5E1)' }}>/</span>
          <span>EXE</span>
          <span style={{ color: 'var(--text-light, #CBD5E1)' }}>/</span>
          <span style={{ color: 'var(--text-main, #0F172A)', fontWeight: 500 }}>Phòng nhóm</span>
        </div>

        <h1
          style={{
            fontSize: '1.75rem',
            fontWeight: 650,
            color: 'var(--text-main, #0F172A)',
            margin: '0 0 0.35rem 0',
            letterSpacing: '-0.022em',
            lineHeight: 1.25,
          }}
        >
          Phòng & Nhóm Học Phần EXE
        </h1>
        <p
          style={{
            color: 'var(--text-muted, #64748B)',
            fontSize: '0.95rem',
            fontWeight: 400,
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          Tìm kiếm đồng đội liên ngành, tham gia các phòng khởi nghiệp đang mở hoặc ứng tuyển vào nhóm phù hợp.
        </p>
      </div>

      {/* D. Filter & Search Toolbar — Flat Segmented Control (clear active state, no shadow/gradient) + Secondary Search & Filter */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          flexWrap: 'wrap',
          marginBottom: '1.5rem',
          paddingBottom: '1rem',
          borderBottom: '1px solid var(--border-subtle, #F1F5F9)',
        }}
      >
        {/* 1. Primary Component: Flat Segmented Control with High-Contrast Active State (No shadow, no gradient) */}
        <div
          style={{
            display: 'inline-flex',
            flexWrap: 'wrap',
            gap: '3px',
            padding: '4px',
            borderRadius: 10,
            backgroundColor: '#F1F5F9',
            border: '1px solid #E2E8F0',
          }}
        >
          {[
            { key: 'ALL', label: 'Tất cả', count: rooms.length },
            { key: 'EMPTY', label: 'Phòng trống', count: rooms.filter((r) => r.status === 'Empty').length },
            { key: 'FORMING', label: 'Đang lập nhóm', count: rooms.filter((r) => r.status === 'Forming').length },
            { key: 'RECRUITING', label: 'Đang tuyển', count: rooms.filter((r) => r.status === 'Recruiting').length },
            { key: 'CLOSED', label: 'Đã đóng tuyển', count: rooms.filter((r) => r.status === 'Closed').length },
            { key: 'LOCKED', label: 'Đã chốt sổ', count: rooms.filter((r) => r.status === 'Locked').length },
          ].map((tab) => {
            const active = filterTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                className={`motion-tab-pill${active ? ' is-active-tab' : ''}`}
                onClick={() => setFilterTab(tab.key)}
                style={{
                  padding: '6px 13px',
                  borderRadius: 7,
                  fontSize: '13.5px',
                  fontWeight: active ? 500 : 450,
                  cursor: 'pointer',
                  border: 'none',
                  backgroundColor: active ? '#0F172A' : 'transparent',
                  color: active ? '#FFFFFF' : '#475569',
                  boxShadow: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '7px',
                  whiteSpace: 'nowrap',
                }}
              >
                <span>{tab.label}</span>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 500,
                    padding: '1px 6.5px',
                    borderRadius: 999,
                    backgroundColor: active ? 'rgba(255, 255, 255, 0.2)' : '#E2E8F0',
                    color: active ? '#FFFFFF' : '#64748B',
                    fontVariantNumeric: 'tabular-nums',
                    transition: 'background-color 180ms ease, color 180ms ease',
                  }}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* 2. Secondary Search + 3. Advanced Slot Filter (Aligned on 38px height baseline) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div className="motion-search-wrap" style={{ position: 'relative', width: 256 }}>
            <Search size={15} className="motion-search-icon" style={{ position: 'absolute', left: 12, top: 11.5, color: '#94A3B8' }} />
            <input
              type="text"
              className="motion-search-input"
              placeholder="Tìm mã phòng, tên, đề tài..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                height: 38,
                paddingLeft: '2.15rem',
                paddingRight: '0.85rem',
                borderRadius: 8,
                border: '1px solid #E2E8F0',
                backgroundColor: '#F8FAFC',
                fontSize: '13.5px',
                fontWeight: 400,
                color: '#0F172A',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <select
            value={slotFilter}
            onChange={(e) => setSlotFilter(e.target.value)}
            title="Bộ lọc nâng cao theo số chỗ trống"
            style={{
              height: 38,
              padding: '0 12px',
              borderRadius: 8,
              border: '1px solid #E2E8F0',
              backgroundColor: '#FFFFFF',
              fontSize: '13.5px',
              fontWeight: 450,
              color: '#475569',
              outline: 'none',
              cursor: 'pointer',
              transition: 'border-color 165ms ease, box-shadow 165ms ease',
            }}
          >
            <option value="ALL">Chỗ trống: Tất cả</option>
            <option value="1">Còn 1 vị trí</option>
            <option value="2-3">Còn 2–3 vị trí</option>
            <option value="4-5">Còn 4–5 vị trí</option>
          </select>
        </div>
      </div>

      {/* A. 4-Column Room Cards Grid — Equal Row Height (No Staircase), Balanced Zones & Readable SaaS Scale */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '1.15rem',
          alignItems: 'stretch',
        }}
      >
        {filteredRooms.map((room, idx) => {
          const isDirectJoin = room.status === 'Empty' || room.status === 'Forming';
          const isRecruiting = room.status === 'Recruiting';
          const isClosed = room.status === 'Closed';
          const isLocked = room.status === 'Locked';
          const remainingSlots = Math.max(0, room.maxMembers - room.currentMembers);

          return (
            <div
              key={room.id}
              className="motion-card-interactive motion-stagger-item"
              style={
                {
                  '--stagger-index': Math.min(idx, 7),
                  backgroundColor: 'var(--bg-card, #FFFFFF)',
                  border: '1px solid var(--border-light, #E2E8F0)',
                  borderRadius: '14px',
                  padding: '20px 22px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  height: '100%',
                } as React.CSSProperties
              }
            >
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                {/* ZONE 1: Low-Priority Room Code + Medium-Priority Semantic Status Badge */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span
                    style={{
                      fontVariantNumeric: 'tabular-nums',
                      fontWeight: 400,
                      fontSize: '13px',
                      color: '#64748B',
                    }}
                  >
                    {room.code}
                  </span>

                  {room.status === 'Forming' && (
                    <span
                      style={{
                        fontSize: '12.5px',
                        fontWeight: 500,
                        color: '#334155',
                        backgroundColor: '#F8FAFC',
                        border: '1px solid #E2E8F0',
                        padding: '3px 9px',
                        borderRadius: 6,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        whiteSpace: 'nowrap',
                        letterSpacing: '-0.005em',
                      }}
                    >
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          backgroundColor: '#10B981',
                          boxShadow: '0 0 0 2px rgba(16, 185, 129, 0.18)',
                          flexShrink: 0,
                        }}
                      />
                      Đang lập nhóm
                    </span>
                  )}
                  {room.status === 'Recruiting' && (
                    <span
                      style={{
                        fontSize: '12.5px',
                        fontWeight: 500,
                        color: '#334155',
                        backgroundColor: '#F8FAFC',
                        border: '1px solid #E2E8F0',
                        padding: '3px 9px',
                        borderRadius: 6,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        whiteSpace: 'nowrap',
                        letterSpacing: '-0.005em',
                      }}
                    >
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          backgroundColor: '#F59E0B',
                          boxShadow: '0 0 0 2px rgba(245, 158, 11, 0.2)',
                          flexShrink: 0,
                        }}
                      />
                      Đang tuyển
                    </span>
                  )}
                  {(room.status === 'Empty' || room.status === 'Closed' || room.status === 'Locked') && (
                    <span
                      style={{
                        fontSize: '12.5px',
                        fontWeight: 500,
                        color: '#64748B',
                        backgroundColor: '#F8FAFC',
                        border: '1px solid #E2E8F0',
                        padding: '3px 9px',
                        borderRadius: 6,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        whiteSpace: 'nowrap',
                        letterSpacing: '-0.005em',
                      }}
                    >
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          backgroundColor: '#94A3B8',
                          flexShrink: 0,
                        }}
                      />
                      {room.status === 'Empty'
                        ? 'Phòng trống'
                        : room.status === 'Closed'
                        ? 'Đã đóng tuyển'
                        : 'Đã chốt sổ'}
                    </span>
                  )}
                </div>

                {/* ZONE 2: High-Priority Room Name & Standardized Project Topic Zone (Fixed min-height so divider lines align across row) */}
                <h3
                  style={{
                    fontSize: '17.5px',
                    fontWeight: 600,
                    color: '#0F172A',
                    margin: '0 0 8px 0',
                    letterSpacing: '-0.015em',
                  }}
                >
                  {room.name}
                </h3>

                <div style={{ minHeight: 64, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
                  {room.topic ? (
                    <div>
                      {/* High-Priority Project Topic Title */}
                      <div
                        style={{
                          fontSize: '14.5px',
                          fontWeight: 600,
                          color: '#1E293B',
                          lineHeight: 1.38,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                        title={room.topic}
                      >
                        {room.topic}
                      </div>
                      {/* Low-Priority Secondary Description (1-line clamp to prevent crowding) */}
                      {room.topicDesc && (
                        <div
                          style={{
                            fontSize: '13px',
                            fontWeight: 400,
                            color: '#64748B',
                            marginTop: '3px',
                            lineHeight: 1.4,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                          title={room.topicDesc}
                        >
                          {room.topicDesc}
                        </div>
                      )}
                      {/* Quiet Neutral Metadata for Recruiting Needs */}
                      {isRecruiting && (room.neededSkills?.length || room.skillBalance) && (
                        <div
                          style={{
                            fontSize: '12.5px',
                            fontWeight: 400,
                            color: '#64748B',
                            marginTop: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            flexWrap: 'wrap',
                          }}
                        >
                          {room.neededSkills && room.neededSkills.length > 0 && (
                            <span>
                              Cần thêm: <span style={{ color: '#0F172A', fontWeight: 500 }}>{room.neededSkills.join(', ')}</span>
                            </span>
                          )}
                          {room.skillBalance && (
                            <>
                              <span style={{ color: '#CBD5E1' }}>·</span>
                              <span style={{ fontVariantNumeric: 'tabular-nums' }}>Cân bằng {room.skillBalance}%</span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  ) : room.status === 'Empty' ? (
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 500, color: '#475569', lineHeight: 1.38 }}>
                        Chưa đăng ký đề tài dự án
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: 400, color: '#94A3B8', marginTop: '3px' }}>
                        Mở tự do cho nhóm mới định hướng ý tưởng
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 500, color: '#334155', lineHeight: 1.38 }}>
                        Đang thảo luận ý tưởng khởi nghiệp
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: 400, color: '#64748B', marginTop: '3px' }}>
                        Chốt đề tài chính thức khi đủ 3 thành viên
                      </div>
                    </div>
                  )}
                </div>

                {/* Clear Divider between Project Info and Member Roster */}
                <div
                  style={{
                    height: 1,
                    backgroundColor: '#F1F5F9',
                    margin: '14px 0',
                  }}
                />

                {/* ZONE 3: Member Roster + Controlled Progress Bar (Flex-1 so all cards in a row share equal bottom baseline) */}
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '7px',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '13px',
                        fontWeight: 500,
                        color: '#475569',
                      }}
                    >
                      Thành viên
                    </span>
                    <span
                      style={{
                        fontSize: '13px',
                        fontWeight: 500,
                        color: '#64748B',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {room.currentMembers} / {room.maxMembers}
                    </span>
                  </div>

                  {/* 5-Segment Progress Bar (Synced with user's chosen accent/progress color) */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: `repeat(${room.maxMembers}, 1fr)`,
                      gap: '5px',
                      marginBottom: '14px',
                    }}
                  >
                    {Array.from({ length: room.maxMembers }).map((_, idx) => {
                      const isFilled = idx < room.currentMembers;
                      return (
                        <div
                          key={idx}
                          className={isFilled ? 'motion-progress-fill' : undefined}
                          style={{
                            height: 4,
                            borderRadius: 999,
                            backgroundColor: isFilled
                              ? 'var(--status-progress, #7C3AED)'
                              : '#E2E8F0',
                          }}
                        />
                      );
                    })}
                  </div>

                  {/* Member Rows or Proportional Empty/Privacy State */}
                  {(isClosed || isLocked) && !isStaff ? (
                    <div
                      style={{
                        flex: 1,
                        padding: '14px',
                        borderRadius: 10,
                        backgroundColor: '#F8FAFC',
                        border: '1px solid #F1F5F9',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        gap: '4px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13.5px', fontWeight: 500, color: '#334155' }}>
                        <Lock size={14} color="#64748B" style={{ flexShrink: 0 }} />
                        <span>Danh sách thành viên được bảo mật</span>
                      </div>
                      <div style={{ fontSize: '12.5px', fontWeight: 400, color: '#64748B', paddingLeft: '22px', lineHeight: 1.45 }}>
                        Phòng đã hoàn tất ghép đội hoặc khóa sổ học kỳ.
                      </div>
                    </div>
                  ) : room.members.length === 0 ? (
                    /* Proportional Empty State for Card 01 (Fills roster zone naturally so Card 01 aligns with Row 1) */
                    <div
                      style={{
                        flex: 1,
                        padding: '14px',
                        borderRadius: 10,
                        backgroundColor: '#F8FAFC',
                        border: '1px dashed #E2E8F0',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        gap: '5px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13.5px', fontWeight: 500, color: '#334155' }}>
                        <UserPlus size={15} color="#64748B" style={{ flexShrink: 0 }} />
                        <span>Chưa có thành viên tham gia</span>
                      </div>
                      <div style={{ fontSize: '12.5px', fontWeight: 400, color: '#64748B', paddingLeft: '23px', lineHeight: 1.45 }}>
                        Sinh viên vào đầu tiên giữ vai trò Nhóm trưởng. Cổng vào thẳng mở tự do đến 3/5.
                      </div>
                    </div>
                  ) : (
                    /* Single-line Member Rows + Remaining Open Slots Indicator at Bottom of Roster */
                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flex: 1, gap: '10px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
                        {room.members.map((m) => {
                          const shortMajorMatch = m.major.match(/\(([^)]+)\)/);
                          const shortMajor = shortMajorMatch ? shortMajorMatch[1] : m.major;
                          return (
                            <div
                              key={m.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '8px',
                                minHeight: 26,
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '9px', minWidth: 0 }}>
                                <span
                                  style={{
                                    width: 26,
                                    height: 26,
                                    borderRadius: '50%',
                                    backgroundColor: '#F1F5F9',
                                    color: '#334155',
                                    border: '1px solid #E2E8F0',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '12px',
                                    fontWeight: 500,
                                    flexShrink: 0,
                                  }}
                                >
                                  {m.name.charAt(0)}
                                </span>
                                <span
                                  style={{
                                    fontSize: '14px',
                                    fontWeight: 500,
                                    color: '#0F172A',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                  }}
                                >
                                  {m.name}
                                </span>
                                {m.role === 'Leader' && (
                                  <span
                                    title="Trưởng nhóm"
                                    style={{
                                      fontSize: '11.5px',
                                      fontWeight: 500,
                                      color: '#475569',
                                      backgroundColor: '#F1F5F9',
                                      padding: '1.5px 6px',
                                      borderRadius: 5,
                                      flexShrink: 0,
                                      whiteSpace: 'nowrap',
                                    }}
                                  >
                                    Leader
                                  </span>
                                )}
                              </div>

                              {/* Low-Priority Metadata: Major Code & Class Code (Never bolded) */}
                              <span
                                style={{
                                  fontVariantNumeric: 'tabular-nums',
                                  fontWeight: 400,
                                  fontSize: '12.5px',
                                  color: '#64748B',
                                  flexShrink: 0,
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {shortMajor} · {m.classCode}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      {remainingSlots > 0 && (
                        <div
                          style={{
                            padding: '6px 10px',
                            borderRadius: 7,
                            backgroundColor: '#F8FAFC',
                            fontSize: '12.5px',
                            fontWeight: 400,
                            color: '#64748B',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <span>+ Còn {remainingSlots} vị trí trống</span>
                          <span style={{ color: '#94A3B8' }}>{isDirectJoin ? 'Mở tự do' : 'Xét duyệt'}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* ZONE 4: Card Footer — Pinned at Bottom so all 4 Cards Align Horizontally */}
              <div
                style={{
                  borderTop: '1px solid #F1F5F9',
                  paddingTop: '13px',
                  marginTop: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                }}
              >
                <span
                  style={{
                    fontSize: '13px',
                    fontWeight: 400,
                    color: '#64748B',
                  }}
                >
                  {isDirectJoin && `Còn ${remainingSlots} vị trí · Vào thẳng`}
                  {isRecruiting && `Còn ${remainingSlots} vị trí · Duyệt đơn`}
                  {isClosed && `Đủ ${room.currentMembers}/${room.maxMembers} thành viên`}
                  {isLocked && 'Đã khóa sổ học kỳ'}
                </span>

                {isStaff ? (
                  <button
                    type="button"
                    className="motion-cta-btn"
                    onClick={() => setInspectRoomModal(room)}
                    style={{
                      padding: '6.5px 13px',
                      borderRadius: 8,
                      backgroundColor: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      color: '#0F172A',
                      fontSize: '13px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <span>Xem chi tiết</span>
                    <span className="motion-arrow">→</span>
                  </button>
                ) : (
                  <>
                    {isDirectJoin && (
                      <button
                        type="button"
                        className="motion-cta-btn"
                        onClick={() => handleDirectJoin(room.code)}
                        style={{
                          padding: '6.5px 13px',
                          borderRadius: 8,
                          backgroundColor: '#F8FAFC',
                          border: '1px solid #E2E8F0',
                          color: '#0F172A',
                          fontSize: '13px',
                          fontWeight: 500,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <span>Tham gia</span>
                        <span className="motion-arrow">→</span>
                      </button>
                    )}

                    {isRecruiting && (
                      <button
                        type="button"
                        className="motion-cta-btn"
                        onClick={() => setApplyModalRoom(room)}
                        style={{
                          padding: '6.5px 13px',
                          borderRadius: 8,
                          backgroundColor: '#0F172A',
                          border: '1px solid #0F172A',
                          color: '#FFFFFF',
                          fontSize: '13px',
                          fontWeight: 500,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <span>Ứng tuyển</span>
                        <span className="motion-arrow">→</span>
                      </button>
                    )}

                    {(isClosed || isLocked) && (
                      <span
                        style={{
                          fontSize: '12.5px',
                          fontWeight: 400,
                          color: '#94A3B8',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <Lock size={12} />
                        <span>{isClosed ? 'Đã đóng' : 'Chỉ đổi chéo'}</span>
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Ứng tuyển vào nhóm */}
      {applyModalRoom && (
        <div
          className="motion-modal-backdrop"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 16,
          }}
        >
          <div
            className="motion-modal-dialog"
            style={{
              backgroundColor: 'var(--bg-card, #FFFFFF)',
              border: '1px solid var(--border-light, #E2E8F0)',
              borderRadius: '20px',
              padding: '24px',
              maxWidth: 500,
              width: '100%',
              boxShadow: '0 20px 45px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Send size={18} color="#0054A6" />
                <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-main, #0F172A)', margin: 0 }}>
                  Nộp đơn ứng tuyển — {applyModalRoom.code}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setApplyModalRoom(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted, #64748B)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '15px', color: 'var(--text-muted, #64748B)', lineHeight: 1.5, marginTop: 0, marginBottom: '1.25rem' }}>
              Đơn của bạn sẽ được gửi đến Trưởng nhóm và toàn bộ thành viên phòng <strong>{applyModalRoom.name}</strong> để mở biểu quyết nội bộ.
            </p>

            <form onSubmit={handleConfirmApply}>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 700, color: 'var(--text-secondary, #334155)', marginBottom: '6px' }}>
                  Lời giới thiệu & Kỹ năng bạn có thể đóng góp cho nhóm:
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Ví dụ: Mình học chuyên ngành Kỹ thuật phần mềm, có thế mạnh về React và backend API. Rất mong muốn được tham gia để cùng hoàn thiện dự án..."
                  value={applyIntro}
                  onChange={(e) => setApplyIntro(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 12,
                    border: '1px solid var(--border-medium, #CBD5E1)',
                    fontSize: '15px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setApplyModalRoom(null)}
                  style={{
                    padding: '9px 16px',
                    borderRadius: 12,
                    backgroundColor: 'var(--bg-tag, #F1F5F9)',
                    border: '1px solid var(--border-light, #E2E8F0)',
                    color: 'var(--text-secondary, #475569)',
                    fontSize: '15px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '9px 20px',
                    borderRadius: 12,
                    backgroundColor: '#0054A6',
                    border: 'none',
                    color: '#FFFFFF',
                    fontSize: '15px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Send size={14} />
                  <span>Xác nhận nộp đơn</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL GIÁM SÁT PHÒNG NHÓM (DÀNH CHO MODERATOR & LECTURER) ── */}
      {inspectRoomModal && (
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
          onClick={() => setInspectRoomModal(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'var(--bg-card, #FFFFFF)',
              border: '1px solid var(--border-light, #E2E8F0)',
              borderRadius: '20px',
              padding: '24px',
              maxWidth: 640,
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 45px rgba(0,0,0,0.2)',
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid var(--border-subtle, #F1F5F9)', paddingBottom: '14px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 800, fontSize: '17px', color: '#0054A6', backgroundColor: 'rgba(0, 84, 166, 0.12)', padding: '3px 10px', borderRadius: 10 }}>
                    {inspectRoomModal.code}
                  </span>
                  <span style={{ fontSize: '14px', fontWeight: 700, padding: '3px 10px', borderRadius: 999, backgroundColor: 'rgba(5, 150, 105, 0.12)', color: '#059669' }}>
                    Sĩ số: {inspectRoomModal.currentMembers}/{inspectRoomModal.maxMembers} thành viên
                  </span>
                </div>
                <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-main, #0F172A)', margin: 0 }}>
                  {inspectRoomModal.name}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setInspectRoomModal(null)}
                style={{ width: 34, height: 34, borderRadius: 10, border: '1px solid var(--border-light, #E2E8F0)', backgroundColor: 'var(--bg-card, #FFFFFF)', color: 'var(--text-muted, #64748B)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Topic Info */}
            <div style={{ padding: '14px 16px', borderRadius: 12, backgroundColor: 'var(--bg-subtle, #F8FAFC)', border: '1px solid var(--border-light, #E2E8F0)', marginBottom: '16px' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-muted, #64748B)', textTransform: 'uppercase', marginBottom: '4px' }}>
                Đề tài dự kiến đăng ký:
              </div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main, #0F172A)' }}>
                {inspectRoomModal.topic || 'Chưa đăng ký đề tài chính thức'}
              </div>
              {inspectRoomModal.topicDesc && (
                <p style={{ fontSize: '14.5px', color: 'var(--text-muted, #64748B)', margin: '6px 0 0', lineHeight: 1.5 }}>
                  {inspectRoomModal.topicDesc}
                </p>
              )}
            </div>

            {/* Member List - 100% full view for staff */}
            <div style={{ marginBottom: '18px' }}>
              <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main, #0F172A)', marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Users size={16} color="var(--accent-color, #F26F21)" />
                  Danh sách thành viên chính thức ({inspectRoomModal.members.length}/{inspectRoomModal.maxMembers})
                </span>
                <span style={{ fontSize: '13.5px', color: '#059669', fontWeight: 600 }}>
                  ✓ Toàn quyền giám sát
                </span>
              </div>

              {inspectRoomModal.members.length === 0 ? (
                <div style={{ padding: '16px', borderRadius: 12, backgroundColor: 'var(--bg-subtle, #F8FAFC)', border: '1px dashed var(--border-medium, #CBD5E1)', textAlign: 'center', fontSize: '15px', color: 'var(--text-muted, #64748B)' }}>
                  Phòng đang trống (0/5). Chưa có sinh viên nào tham gia.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {inspectRoomModal.members.map((m) => (
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
                            backgroundColor: m.avatarBg,
                            color: m.avatarText,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: '14px',
                          }}
                        >
                          {m.name.charAt(0)}
                        </div>
                        <div>
                          <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main, #0F172A)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>{m.name}</span>
                            {m.role === 'Leader' && (
                              <span style={{ fontSize: '12px', fontWeight: 600, color: '#334155', backgroundColor: '#F1F5F9', border: '1px solid #E2E8F0', padding: '1px 7px', borderRadius: 6, display: 'inline-flex', alignItems: 'center' }}>
                                Trưởng nhóm
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '13.5px', color: 'var(--text-muted, #64748B)' }}>
                            MSSV: <strong style={{ color: '#0054A6' }}>{m.studentCode}</strong> • Chuyên ngành: {m.major} • Lớp FAP: <strong style={{ color: 'var(--text-main, #0F172A)' }}>{m.classCode}</strong>
                          </div>
                        </div>
                      </div>
                      <div style={{ fontSize: '13.5px', color: 'var(--text-light, #94A3B8)', textAlign: 'right' }}>
                        {m.joinedAt}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Monitoring Action Footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '14px', borderTop: '1px solid var(--border-subtle, #F1F5F9)' }}>
              <button
                type="button"
                onClick={() => setInspectRoomModal(null)}
                style={{
                  padding: '9px 20px',
                  borderRadius: 12,
                  backgroundColor: '#0F172A',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: '15px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Đóng cửa sổ giám sát
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// 2. MY GROUP PAGE (/my-group)
// ══════════════════════════════════════════════════════════════════════════════
export const MyGroupPage: React.FC = () => {

  // Test mode switcher: Đang mở đăng ký vs Đã chốt sổ
  const [isLockedSemester, setIsLockedSemester] = useState<boolean>(false);

  // Group State
  const [isEarlyClosed, setIsEarlyClosed] = useState<boolean>(false);
  const [topic, setTopic] = useState('EcoCampus - Phân loại rác AI');
  const [topicDesc, setTopicDesc] = useState('Hệ thống Computer Vision tự động phân loại rác thải tại các tòa nhà campus.');
  const [showEditTopicModal, setShowEditTopicModal] = useState(false);
  const [editTopicTitle, setEditTopicTitle] = useState(topic);
  const [editTopicDesc, setEditTopicDesc] = useState(topicDesc);

  // Members in my group
  const [members, setMembers] = useState<RoomMember[]>([
    {
      id: 'current-user',
      name: 'Lữ Thành Tú',
      studentCode: 'SE185102',
      classCode: 'SE1801',
      major: 'Kỹ thuật phần mềm (SE)',
      role: 'Leader',
      avatarBg: '#F1F5F9',
      avatarText: '#334155',
      joinedAt: '08:00 • 07/11/2026',
    },
    {
      id: 'member-2',
      name: 'Trần Minh Quân',
      studentCode: 'SE185108',
      classCode: 'SE1801',
      major: 'Kỹ thuật phần mềm (SE)',
      role: 'Member',
      avatarBg: '#F1F5F9',
      avatarText: '#334155',
      joinedAt: '08:30 • 07/11/2026',
    },
    {
      id: 'member-3',
      name: 'Lê Hoàng Yến',
      studentCode: 'GD180215',
      classCode: 'GD1802',
      major: 'Thiết kế mỹ thuật số (GD)',
      role: 'Member',
      avatarBg: '#F1F5F9',
      avatarText: '#334155',
      joinedAt: '14:15 • 07/11/2026',
    },
  ]);

  // Leader Election State
  const [showElectionCard, setShowElectionCard] = useState(false);
  const [electionVotes, setElectionVotes] = useState<number>(2); // 2/3 agree
  const [userVotedElection, setUserVotedElection] = useState(false);

  // Transfer Leader Modal
  const [showTransferLeaderModal, setShowTransferLeaderModal] = useState(false);
  const [selectedNewLeaderId, setSelectedNewLeaderId] = useState('');

  // Transfer / Swap Modal (for Locked Semester)
  const [showTransferSwapModal, setShowTransferSwapModal] = useState(false);
  const [transferType, setTransferType] = useState<'ONE_WAY' | 'SWAP'>('SWAP');
  const [targetRoomCode, setTargetRoomCode] = useState('FA26EXE101-04');
  const [swapStudentName, setSwapStudentName] = useState('Bùi Phương Thảo (SE1803)');
  const [transferReason, setTransferReason] = useState('');

  // Applicants & Voting State
  interface Applicant {
    id: string;
    name: string;
    studentCode: string;
    classCode: string;
    major: string;
    scores: { tech: number; mgt: number; design: number; mkt: number; sale: number };
    intro: string;
    votingOpen: boolean;
    userVote?: 'YES' | 'NO';
    yesVotes: number;
    noVotes: number;
    status: 'Pending' | 'Accepted' | 'Rejected';
  }

  const [applicants, setApplicants] = useState<Applicant[]>([
    {
      id: 'app-01',
      name: 'Phạm Văn Nam',
      studentCode: 'MKT180112',
      classCode: 'MKT1801',
      major: 'Digital Marketing (MKT)',
      scores: { tech: 30, mgt: 60, design: 45, mkt: 90, sale: 85 },
      intro: 'Em có kinh nghiệm quản lý fanpage và chạy ads chiến dịch truyền thông, mong muốn vào nhóm để phụ trách phát triển thị trường.',
      votingOpen: true,
      userVote: 'YES',
      yesVotes: 2,
      noVotes: 1,
      status: 'Pending',
    },
    {
      id: 'app-02',
      name: 'Hoàng Thu Trang',
      studentCode: 'IB180234',
      classCode: 'IB1802',
      major: 'Kinh doanh quốc tế (IB)',
      scores: { tech: 20, mgt: 70, design: 35, mkt: 80, sale: 90 },
      intro: 'Mình có kinh nghiệm pitching gọi vốn các cuộc thi khởi nghiệp và thuyết trình tiếng Anh lưu loát.',
      votingOpen: false,
      yesVotes: 1,
      noVotes: 0,
      status: 'Pending',
    },
  ]);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const isCurrentUserLeader = members.find((m) => m.id === 'current-user')?.role === 'Leader';

  // Toggle Early Close
  const handleToggleEarlyClose = () => {
    if (isEarlyClosed) {
      setIsEarlyClosed(false);
      showToast('Đã mở tuyển lại thành công! Ứng viên có thể tiếp tục nộp đơn vào nhóm.');
    } else {
      setIsEarlyClosed(true);
      // Auto reject pending applicants
      setApplicants((prev) =>
        prev.map((a) => (a.status === 'Pending' ? { ...a, status: 'Rejected' } : a))
      );
      showToast('Đã đóng tuyển sớm! Toàn bộ đơn đang chờ đã được tự động chuyển sang trạng thái Từ chối.');
    }
  };

  // Leave Group
  const handleLeaveGroup = () => {
    if (window.confirm('Bạn có chắc chắn muốn rời nhóm?')) {
      const remaining = members.filter((m) => m.id !== 'current-user');
      // If leader leaves, successor is the next earliest member
      if (isCurrentUserLeader && remaining.length > 0) {
        remaining[0].role = 'Leader';
        showToast(`Bạn đã rời nhóm. Quyền Trưởng nhóm được tự động chuyển giao cho ${remaining[0].name}.`);
      } else {
        showToast('Bạn đã rời nhóm thành công.');
      }
      setMembers(remaining);
      // If capacity drops from 3 to 2, group reverts to Forming
      if (remaining.length <= 2) {
        showToast('Sĩ số nhóm hiện tại dưới 3 thành viên: Nhóm tự động chuyển về trạng thái "Phòng đang lập" và mở lại cổng vào thẳng!');
      }
    }
  };

  // Chuyển quyền Leader
  const handleConfirmTransferLeader = () => {
    if (!selectedNewLeaderId) return;
    const target = members.find((m) => m.id === selectedNewLeaderId);
    if (!target) return;
    setMembers((prev) =>
      prev.map((m) => {
        if (m.id === selectedNewLeaderId) return { ...m, role: 'Leader' };
        if (m.id === 'current-user') return { ...m, role: 'Member' };
        return m;
      })
    );
    setShowTransferLeaderModal(false);
    showToast(`Đã nhượng quyền Trưởng nhóm thành công cho ${target.name}!`);
  };

  // Bầu chọn Trưởng nhóm mới (Election)
  const handleCastElectionVote = () => {
    if (userVotedElection) return;
    const nextVotes = electionVotes + 1;
    setElectionVotes(nextVotes);
    setUserVotedElection(true);

    if (nextVotes >= 2) {
      // Over 50%
      setTimeout(() => {
        setMembers((prev) =>
          prev.map((m) => {
            if (m.id === 'member-2') return { ...m, role: 'Leader' };
            if (m.id === 'current-user') return { ...m, role: 'Member' };
            return m;
          })
        );
        setShowElectionCard(false);
        showToast('Chúc mừng! Cuộc bầu cử đã đạt quá bán (>50%). Bạn Trần Minh Quân chính thức trở thành Trưởng nhóm mới!');
      }, 700);
    }
  };

  // Vote on applicant
  const handleVoteApplicant = (applicantId: string, vote: 'YES' | 'NO') => {
    setApplicants((prev) =>
      prev.map((a) => {
        if (a.id !== applicantId) return a;
        let yes = a.yesVotes;
        let no = a.noVotes;
        if (a.userVote === 'YES') yes--;
        if (a.userVote === 'NO') no--;

        if (vote === 'YES') yes++;
        if (vote === 'NO') no++;

        return { ...a, userVote: vote, yesVotes: yes, noVotes: no };
      })
    );
  };

  // Accept applicant into group
  const handleAcceptApplicant = (app: Applicant) => {
    if (members.length >= 5) {
      alert('Nhóm đã đủ sĩ số tối đa 5 thành viên!');
      return;
    }
    const newMember: RoomMember = {
      id: app.id,
      name: app.name,
      studentCode: app.studentCode,
      classCode: app.classCode,
      major: app.major,
      role: 'Member',
      avatarBg: '#F1F5F9',
      avatarText: '#334155',
      joinedAt: 'Vừa xong',
    };
    setMembers([...members, newMember]);
    setApplicants((prev) => prev.map((a) => (a.id === app.id ? { ...a, status: 'Accepted' } : a)));
    showToast(`Đã chấp nhận ${app.name} vào nhóm thành công! Sĩ số hiện tại: ${members.length + 1}/5.`);
  };

  // Reject applicant
  const handleRejectApplicant = (applicantId: string) => {
    setApplicants((prev) => prev.map((a) => (a.id === applicantId ? { ...a, status: 'Rejected' } : a)));
    showToast('Đã từ chối đơn ứng tuyển.');
  };

  return (
    <div style={{ maxWidth: 1560, margin: '0 auto', paddingBottom: '3.5rem' }}>
      {/* Toast */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: 24,
            right: 24,
            zIndex: 9999,
            backgroundColor: '#0F172A',
            color: '#FFFFFF',
            padding: '12px 20px',
            borderRadius: 12,
            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          <CheckCircle2 size={18} color="#22C55E" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header & Test Mode Switcher */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12.5px',
              fontWeight: 450,
              color: 'var(--text-muted, #64748B)',
              marginBottom: '0.4rem',
            }}
          >
            <span>Học phần</span>
            <span style={{ color: 'var(--text-light, #CBD5E1)' }}>/</span>
            <span>EXE</span>
            <span style={{ color: 'var(--text-light, #CBD5E1)' }}>/</span>
            <span style={{ color: 'var(--text-main, #0F172A)', fontWeight: 500 }}>Nhóm của tôi</span>
            <span style={{ color: 'var(--text-light, #CBD5E1)' }}>·</span>
            <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 400, color: '#94A3B8' }}>
              FA26EXE101-02
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 650, color: 'var(--text-main, #0F172A)', margin: 0, letterSpacing: '-0.022em' }}>
              Nhóm Khởi Nghiệp Của Tôi
            </h1>
            <span
              style={{
                fontSize: '12.5px',
                fontWeight: 500,
                padding: '3px 9px',
                borderRadius: 6,
                backgroundColor: '#F8FAFC',
                color: isLockedSemester || isEarlyClosed ? '#64748B' : '#334155',
                border: '1px solid #E2E8F0',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                whiteSpace: 'nowrap',
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  backgroundColor:
                    isLockedSemester || isEarlyClosed
                      ? '#94A3B8'
                      : '#F59E0B',
                  boxShadow:
                    isLockedSemester || isEarlyClosed
                      ? 'none'
                      : '0 0 0 2px rgba(245, 158, 11, 0.2)',
                  flexShrink: 0,
                }}
              />
              {isLockedSemester
                ? 'Đã chốt sổ học kỳ'
                : isEarlyClosed
                ? 'Đã đóng tuyển sớm'
                : `Đang tuyển (${members.length}/5)`}
            </span>
          </div>
        </div>

        {/* Mode Switcher — Flat Segmented Control (No shadow, no gradient) */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '2px',
            backgroundColor: '#F1F5F9',
            border: '1px solid #E2E8F0',
            padding: '3px',
            borderRadius: 9,
          }}
        >
          <span style={{ fontSize: '12px', fontWeight: 450, color: '#64748B', paddingLeft: 8, paddingRight: 6 }}>
            Chế độ kiểm thử:
          </span>
          <button
            type="button"
            onClick={() => setIsLockedSemester(false)}
            style={{
              padding: '5px 11px',
              borderRadius: 6,
              fontSize: '12.5px',
              fontWeight: !isLockedSemester ? 500 : 450,
              cursor: 'pointer',
              border: 'none',
              backgroundColor: !isLockedSemester ? '#0F172A' : 'transparent',
              color: !isLockedSemester ? '#FFFFFF' : '#475569',
              boxShadow: 'none',
            }}
          >
            Đang mở đăng ký
          </button>
          <button
            type="button"
            onClick={() => setIsLockedSemester(true)}
            style={{
              padding: '5px 11px',
              borderRadius: 6,
              fontSize: '12.5px',
              fontWeight: isLockedSemester ? 500 : 450,
              cursor: 'pointer',
              border: 'none',
              backgroundColor: isLockedSemester ? '#0F172A' : 'transparent',
              color: isLockedSemester ? '#FFFFFF' : '#475569',
              boxShadow: 'none',
            }}
          >
            Đã chốt sổ học kỳ
          </button>
        </div>
      </div>

      {/* Locked Semester Banner */}
      {isLockedSemester && (
        <div
          style={{
            backgroundColor: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: 16,
            padding: '14px 18px',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--accent-gradient, linear-gradient(135deg, #f26f21 0%, #ea580c 100%))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF', flexShrink: 0 }}>
              <Lock size={17} />
            </div>
            <div>
              <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '14.5px' }}>
                Học kỳ đã chốt sổ danh sách (Locked)
              </div>
              <div style={{ fontSize: '13.5px', color: '#475569', marginTop: '2px' }}>
                Cổng đăng ký và kết nạp tự do đã đóng. Mọi điều chỉnh thành viên chỉ được thực hiện qua quy trình nộp đơn xin Chuyển nhóm / Đổi chéo để Điều phối viên phê duyệt.
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowTransferSwapModal(true)}
            style={{
              padding: '9px 16px',
              borderRadius: 10,
              background: 'var(--accent-gradient, linear-gradient(135deg, #f26f21 0%, #ea580c 100%))',
              border: 'none',
              color: '#FFFFFF',
              fontSize: '13.5px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 4px rgba(242, 111, 33, 0.25)',
            }}
          >
            <ArrowLeftRight size={14} />
            <span>Gửi yêu cầu Chuyển nhóm / Đổi chéo</span>
          </button>
        </div>
      )}

      {/* Main Section: 2 Columns */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '1.5rem', marginBottom: '1.75rem' }}>
        {/* Left Column: Project Info & 5 Skills Bar Chart (shadcn Card Architecture) */}
        <div
          className="motion-stagger-item"
          style={
            {
              '--stagger-index': 0,
              backgroundColor: 'var(--bg-card, #FFFFFF)',
              border: '1px solid var(--border-light, #E2E8F0)',
              borderRadius: '20px',
              padding: '28px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: '0 1px 3px rgba(15, 23, 42, 0.03)',
            } as React.CSSProperties
          }
        >
          <div>
            {/* CardHeader: Topic Eyebrow + Action Button */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '14px' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    background: 'var(--accent-gradient, linear-gradient(135deg, #f26f21 0%, #ea580c 100%))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FFFFFF',
                  }}
                >
                  <Sparkles size={14} strokeWidth={2.2} />
                </div>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#64748B',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  Đề tài dự án khởi nghiệp
                </span>
              </div>

              {!isLockedSemester && (
                <button
                  type="button"
                  onClick={() => setShowEditTopicModal(true)}
                  style={{
                    padding: '7px 14px',
                    borderRadius: 9,
                    background: 'var(--accent-gradient, linear-gradient(135deg, #f26f21 0%, #ea580c 100%))',
                    border: 'none',
                    boxShadow: '0 2px 4px rgba(242, 111, 33, 0.25)',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#FFFFFF',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Edit3 size={13.5} color="#FFFFFF" />
                  <span>Cập nhật đề tài</span>
                </button>
              )}
            </div>

            {/* Topic Callout Box (shadcn Muted Surface) */}
            <div
              style={{
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '14px',
                padding: '16px 18px',
                marginBottom: '22px',
              }}
            >
              <h3
                style={{
                  fontSize: '1.25rem',
                  fontWeight: 800,
                  color: '#0F172A',
                  letterSpacing: '-0.02em',
                  margin: '0 0 6px 0',
                  lineHeight: 1.3,
                }}
              >
                {topic}
              </h3>
              <p
                style={{
                  fontSize: '14px',
                  color: '#475569',
                  lineHeight: 1.55,
                  margin: 0,
                }}
              >
                {topicDesc}
              </p>
            </div>

            {/* 5 Core Skills Section Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TrendingUp size={16} color="var(--accent-color, #F26F21)" strokeWidth={2.2} />
                <span style={{ fontSize: '14.5px', fontWeight: 700, color: '#0F172A', letterSpacing: '-0.01em' }}>
                  Năng lực tổng hợp 5 Kỹ năng của cả nhóm
                </span>
              </div>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#FFFFFF',
                  background: 'var(--accent-gradient, linear-gradient(135deg, #f26f21 0%, #ea580c 100%))',
                  padding: '3.5px 10px',
                  borderRadius: 999,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                Trung bình: 62%
              </span>
            </div>

            {/* 5 Core Skills Rows (Synced with user's chosen accent color + Clean Neutral Badges) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
              {[
                { name: 'Tech', sub: 'Kỹ thuật & Lập trình', score: 82, badge: 'Thế mạnh' },
                { name: 'Management', sub: 'Quản lý dự án & Vận hành', score: 75, badge: 'Thế mạnh' },
                { name: 'Graphic Design', sub: 'Thiết kế UI/UX & Đồ họa', score: 68, badge: 'Ổn định' },
                { name: 'Marketing', sub: 'Truyền thông & Tăng trưởng', score: 45, badge: 'Cần bổ sung' },
                { name: 'Sale', sub: 'Kinh doanh & Bán hàng', score: 40, badge: 'Cần bổ sung' },
              ].map((s) => (
                <div
                  key={s.name}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '11px',
                    backgroundColor: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '7px', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A' }}>{s.name}</span>
                      <span style={{ fontSize: '13px', fontWeight: 400, color: '#64748B' }}>· {s.sub}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: 500,
                          padding: '2px 8px',
                          borderRadius: 999,
                          backgroundColor: '#FFFFFF',
                          color: s.score >= 65 ? '#0F172A' : '#64748B',
                          border: '1px solid #E2E8F0',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {s.badge}
                      </span>
                      <span
                        style={{
                          fontSize: '14px',
                          fontWeight: 700,
                          color: s.score >= 65 ? 'var(--accent-color, #F26F21)' : '#0F172A',
                          fontVariantNumeric: 'tabular-nums',
                          minWidth: '38px',
                          textAlign: 'right',
                        }}
                      >
                        {s.score}%
                      </span>
                    </div>
                  </div>

                  {/* Progress bar synced with user's chosen accent color */}
                  <div
                    style={{
                      height: 6,
                      borderRadius: 999,
                      backgroundColor: '#E2E8F0',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      className="motion-progress-fill"
                      style={{
                        width: `${s.score}%`,
                        height: '100%',
                        background: s.score >= 65 ? 'var(--accent-gradient, var(--accent-color, #F26F21))' : '#94A3B8',
                        borderRadius: 999,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Control Buttons & Leader Election */}
        <div
          className="motion-stagger-item"
          style={
            {
              '--stagger-index': 1,
              backgroundColor: 'var(--bg-card, #FFFFFF)',
              border: '1px solid var(--border-light, #E2E8F0)',
              borderRadius: '20px',
              padding: '28px',
              boxShadow: '0 1px 3px rgba(15, 23, 42, 0.03)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            } as React.CSSProperties
          }
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    backgroundColor: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#334155',
                  }}
                >
                  <Layers size={14} strokeWidth={2.2} />
                </div>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#64748B',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  Quản trị & Điều phối nội bộ
                </span>
              </div>
            </div>

            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', margin: '0 0 18px 0' }}>
              Bảng điều khiển & Tác vụ Nhóm
            </h3>

            {/* Action Buttons (Clean Neutral Surface Grid) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '1.25rem' }}>
              {/* Đóng tuyển sớm / Mở tuyển lại */}
              <button
                type="button"
                onClick={handleToggleEarlyClose}
                disabled={isLockedSemester}
                style={{
                  padding: '12px 14px',
                  borderRadius: 11,
                  border: '1px solid #E2E8F0',
                  backgroundColor: '#F8FAFC',
                  color: '#0F172A',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: isLockedSemester ? 'not-allowed' : 'pointer',
                  opacity: isLockedSemester ? 0.5 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                  gap: '10px',
                  transition: 'all 0.15s ease',
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    color: '#334155',
                  }}
                >
                  {isEarlyClosed ? <Unlock size={15} /> : <Lock size={15} />}
                </div>
                <span>{isEarlyClosed ? 'Mở tuyển lại' : 'Đóng tuyển sớm'}</span>
              </button>

              {/* Chuyển quyền Trưởng nhóm */}
              <button
                type="button"
                onClick={() => setShowTransferLeaderModal(true)}
                disabled={isLockedSemester || !isCurrentUserLeader}
                style={{
                  padding: '12px 14px',
                  borderRadius: 11,
                  border: '1px solid #E2E8F0',
                  backgroundColor: '#F8FAFC',
                  color: '#0F172A',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: isLockedSemester || !isCurrentUserLeader ? 'not-allowed' : 'pointer',
                  opacity: isLockedSemester || !isCurrentUserLeader ? 0.5 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                  gap: '10px',
                  transition: 'all 0.15s ease',
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Crown size={15} color="#334155" />
                </div>
                <span>Chuyển quyền Leader</span>
              </button>

              {/* Bầu chọn Trưởng nhóm mới */}
              <button
                type="button"
                onClick={() => setShowElectionCard(true)}
                disabled={isLockedSemester}
                style={{
                  padding: '12px 14px',
                  borderRadius: 11,
                  border: '1px solid #E2E8F0',
                  backgroundColor: '#F8FAFC',
                  color: '#0F172A',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: isLockedSemester ? 'not-allowed' : 'pointer',
                  opacity: isLockedSemester ? 0.5 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                  gap: '10px',
                  transition: 'all 0.15s ease',
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Vote size={15} color="#334155" />
                </div>
                <span>Bầu chọn Leader mới</span>
              </button>

              {/* Rời nhóm */}
              <button
                type="button"
                onClick={handleLeaveGroup}
                disabled={isLockedSemester}
                style={{
                  padding: '12px 14px',
                  borderRadius: 11,
                  border: '1px solid #E2E8F0',
                  backgroundColor: '#F8FAFC',
                  color: '#DC2626',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: isLockedSemester ? 'not-allowed' : 'pointer',
                  opacity: isLockedSemester ? 0.5 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                  gap: '10px',
                  transition: 'all 0.15s ease',
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <LogOut size={15} color="#DC2626" />
                </div>
                <span>Rời nhóm</span>
              </button>
            </div>

            {/* Bầu chọn Trưởng nhóm mới Card (nếu kích hoạt) */}
            {showElectionCard && (
              <div
                style={{
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: 14,
                  padding: '16px',
                  marginBottom: '1rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <div style={{ fontSize: '14.5px', fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Vote size={15} color="#334155" />
                    <span>Bình chọn Leader mới: Trần Minh Quân</span>
                  </div>
                  <span style={{ fontSize: '12px', color: '#475569', backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', padding: '2px 8px', borderRadius: 999, fontWeight: 600 }}>
                    Còn 23 giờ
                  </span>
                </div>
                <div style={{ fontSize: '13.5px', color: '#64748B', marginBottom: '8px' }}>
                  Tiến độ phiếu bầu: <strong style={{ color: '#0F172A' }}>{electionVotes}/3 đồng ý (&gt;50%)</strong>
                </div>
                <div style={{ height: 6, borderRadius: 999, backgroundColor: '#E2E8F0', overflow: 'hidden', marginBottom: '12px' }}>
                  <div style={{ width: `${(electionVotes / 3) * 100}%`, height: '100%', backgroundColor: '#0F172A' }} />
                </div>
                <button
                  type="button"
                  onClick={handleCastElectionVote}
                  disabled={userVotedElection}
                  style={{
                    width: '100%',
                    padding: '9px 14px',
                    borderRadius: 9,
                    backgroundColor: userVotedElection ? '#CBD5E1' : '#0F172A',
                    border: 'none',
                    color: '#FFFFFF',
                    fontSize: '13.5px',
                    fontWeight: 600,
                    cursor: userVotedElection ? 'not-allowed' : 'pointer',
                  }}
                >
                  {userVotedElection ? 'Bạn đã bỏ phiếu đồng ý' : 'Bỏ phiếu Đồng ý bầu Leader mới'}
                </button>
              </div>
            )}
          </div>

          {/* shadcn Alert / Callout Box */}
          <div
            style={{
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '14px',
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
            }}
          >
            <ShieldAlert size={17} color="#64748B" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '13.5px', color: '#475569', lineHeight: 1.55 }}>
              <strong style={{ color: '#0F172A' }}>Quy định chuyển nhóm:</strong> Khi nhóm trưởng rời nhóm, quyền Trưởng nhóm tự động trao cho thành viên vào sớm nhất kế tiếp. Nếu sĩ số giảm từ 3 xuống 2, nhóm quay về trạng thái phòng đang lập và mở lại cổng vào thẳng.
            </div>
          </div>
        </div>
      </div>

      {/* Members Section */}
      <div
        style={{
          backgroundColor: 'var(--bg-card, #FFFFFF)',
          border: '1px solid var(--border-light, #E2E8F0)',
          borderRadius: '20px',
          padding: '26px',
          marginBottom: '1.75rem',
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.03)',
        }}
      >
        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', margin: '0 0 1rem 0', letterSpacing: '-0.015em' }}>
          Danh sách Thành viên Nhóm ({members.length}/5)
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1rem', alignItems: 'stretch' }}>
          {members.map((m) => (
            <div
              key={m.id}
              style={{
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: 12,
                padding: '15px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    background: m.role === 'Leader' ? 'var(--accent-gradient, linear-gradient(135deg, #f26f21 0%, #ea580c 100%))' : '#F1F5F9',
                    color: m.role === 'Leader' ? '#FFFFFF' : '#334155',
                    border: m.role === 'Leader' ? 'none' : '1px solid #E2E8F0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '15px',
                    fontWeight: 600,
                    flexShrink: 0,
                  }}
                >
                  {m.name.charAt(0)}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: '15px', fontWeight: 600, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.name}</span>
                    {m.id === 'current-user' && (
                      <span style={{ fontSize: '12.5px', color: 'var(--accent-color, #F26F21)', fontWeight: 500, whiteSpace: 'nowrap' }}>
                        (Bạn)
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 400, color: '#64748B', marginTop: '3px', lineHeight: 1.4 }}>
                    <span style={{ fontVariantNumeric: 'tabular-nums' }}>{m.studentCode}</span> · {m.major}
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: 400, color: '#94A3B8', marginTop: '2px', fontVariantNumeric: 'tabular-nums' }}>
                    Tham gia: {m.joinedAt}
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-end',
                  justifyContent: 'center',
                  gap: '6px',
                  flexShrink: 0,
                }}
              >
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    fontVariantNumeric: 'tabular-nums',
                    fontWeight: 500,
                    fontSize: '12.5px',
                    backgroundColor: '#FFFFFF',
                    color: '#475569',
                    border: '1px solid #E2E8F0',
                    padding: '2.5px 9px',
                    borderRadius: 6,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {m.classCode}
                </span>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    fontSize: '12.5px',
                    fontWeight: 500,
                    padding: '3px 10px',
                    borderRadius: 999,
                    background: m.role === 'Leader' ? 'var(--accent-gradient, linear-gradient(135deg, #f26f21 0%, #ea580c 100%))' : '#FFFFFF',
                    color: m.role === 'Leader' ? '#FFFFFF' : '#64748B',
                    border: m.role === 'Leader' ? 'none' : '1px solid #E2E8F0',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {m.role === 'Leader' ? 'Trưởng nhóm' : 'Thành viên'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section: Đơn ứng tuyển & Biểu quyết thành viên */}
      <div
        style={{
          backgroundColor: 'var(--bg-card, #FFFFFF)',
          border: '1px solid var(--border-light, #E2E8F0)',
          borderRadius: '20px',
          padding: '26px',
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.03)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '-0.015em' }}>
              Đơn ứng tuyển & Biểu quyết Thành viên ({applicants.filter((a) => a.status === 'Pending').length} đang chờ)
            </h3>
            <p style={{ fontSize: '14px', color: '#64748B', margin: '3px 0 0 0' }}>
              Toàn bộ thành viên có quyền biểu quyết tham khảo cho ứng viên. Trưởng nhóm sẽ là người ra quyết định chấp thuận cuối cùng.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {applicants.map((app) => (
            <div
              key={app.id}
              style={{
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: 16,
                padding: '16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '10px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <h4 style={{ fontSize: '15.5px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                      {app.name}
                    </h4>
                    <span style={{ fontFamily: 'var(--font-sans, Inter, sans-serif)', fontVariantNumeric: 'tabular-nums', fontSize: '13px', fontWeight: 600, color: '#334155', backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', padding: '2px 8px', borderRadius: 6 }}>
                      {app.studentCode} • Lớp {app.classCode}
                    </span>
                    <span style={{ fontSize: '13.5px', color: '#64748B' }}>
                      ({app.major})
                    </span>
                  </div>
                  <div style={{ fontSize: '14px', color: '#475569', marginTop: '6px', fontStyle: 'italic' }}>
                    "{app.intro}"
                  </div>
                </div>

                {app.status === 'Accepted' && (
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', padding: '3.5px 10px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#10B981' }} />
                    Đã chấp nhận vào nhóm
                  </span>
                )}
                {app.status === 'Rejected' && (
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748B', backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', padding: '3.5px 10px', borderRadius: 999 }}>
                    Đã từ chối
                  </span>
                )}
              </div>

              {/* 5 Skills scores pills — Unified Neutral Slate Badges instead of 5 Rainbow Pills */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                {[
                  { label: 'Tech', val: app.scores.tech },
                  { label: 'Mgt', val: app.scores.mgt },
                  { label: 'Design', val: app.scores.design },
                  { label: 'Marketing', val: app.scores.mkt },
                  { label: 'Sale', val: app.scores.sale },
                ].map((sk) => (
                  <span
                    key={sk.label}
                    style={{
                      fontSize: '13px',
                      backgroundColor: '#FFFFFF',
                      color: '#334155',
                      border: '1px solid #E2E8F0',
                      padding: '3px 9px',
                      borderRadius: 6,
                      fontWeight: 600,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {sk.label}: <strong style={{ color: '#0F172A' }}>{sk.val}/100</strong>
                  </span>
                ))}
              </div>

              {/* Voting Bar & Actions */}
              {app.status === 'Pending' && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #E2E8F0', paddingTop: '12px', flexWrap: 'wrap', gap: '10px' }}>
                  {/* Member voting buttons */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '13.5px', fontWeight: 600, color: '#64748B' }}>Biểu quyết của bạn:</span>
                    <button
                      type="button"
                      onClick={() => handleVoteApplicant(app.id, 'YES')}
                      style={{
                        padding: '5px 11px',
                        borderRadius: 7,
                        border: app.userVote === 'YES' ? '1px solid #0F172A' : '1px solid #E2E8F0',
                        backgroundColor: app.userVote === 'YES' ? '#0F172A' : '#FFFFFF',
                        color: app.userVote === 'YES' ? '#FFFFFF' : '#475569',
                        fontSize: '13.5px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                      }}
                    >
                      <ThumbsUp size={13} />
                      <span>Đồng ý</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleVoteApplicant(app.id, 'NO')}
                      style={{
                        padding: '5px 11px',
                        borderRadius: 7,
                        border: app.userVote === 'NO' ? '1px solid #334155' : '1px solid #E2E8F0',
                        backgroundColor: app.userVote === 'NO' ? '#334155' : '#FFFFFF',
                        color: app.userVote === 'NO' ? '#FFFFFF' : '#475569',
                        fontSize: '13.5px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                      }}
                    >
                      <ThumbsDown size={13} />
                      <span>Từ chối</span>
                    </button>

                    <span style={{ fontSize: '13.5px', color: '#64748B', marginLeft: '4px' }}>
                      (Tổng kết: <strong style={{ color: '#0F172A' }}>{app.yesVotes} Đồng ý • {app.noVotes} Từ chối</strong>)
                    </span>
                  </div>

                  {/* Leader Decision Buttons */}
                  {isCurrentUserLeader && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => handleRejectApplicant(app.id)}
                        style={{
                          padding: '7px 13px',
                          borderRadius: 8,
                          backgroundColor: '#FFFFFF',
                          border: '1px solid #E2E8F0',
                          color: '#475569',
                          fontSize: '13.5px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Từ chối
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAcceptApplicant(app)}
                        style={{
                          padding: '7px 16px',
                          borderRadius: 8,
                          backgroundColor: 'var(--accent-color, #F26F21)',
                          border: 'none',
                          color: '#FFFFFF',
                          fontSize: '13.5px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Chấp nhận vào nhóm
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Modal: Cập nhật đề tài */}
      {showEditTopicModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 16 }}>
          <div style={{ backgroundColor: 'var(--bg-card, #FFFFFF)', border: '1px solid var(--border-light, #E2E8F0)', borderRadius: 20, padding: 24, maxWidth: 480, width: '100%' }}>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-main, #0F172A)', margin: '0 0 1rem 0' }}>
              Cập nhật Đề tài Dự án Khởi nghiệp
            </h3>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 700, color: 'var(--text-secondary, #334155)', marginBottom: '4px' }}>Tên đề tài</label>
              <input
                type="text"
                value={editTopicTitle}
                onChange={(e) => setEditTopicTitle(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 10, border: '1px solid var(--border-medium, #CBD5E1)', fontSize: '15px', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 700, color: 'var(--text-secondary, #334155)', marginBottom: '4px' }}>Mô tả ngắn</label>
              <textarea
                rows={3}
                value={editTopicDesc}
                onChange={(e) => setEditTopicDesc(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 10, border: '1px solid var(--border-medium, #CBD5E1)', fontSize: '15px', boxSizing: 'border-box', fontFamily: 'inherit' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button type="button" onClick={() => setShowEditTopicModal(false)} style={{ padding: '8px 14px', borderRadius: 10, backgroundColor: 'var(--bg-tag, #F1F5F9)', border: '1px solid var(--border-light, #E2E8F0)', color: 'var(--text-secondary, #475569)', fontSize: '14.5px', fontWeight: 600 }}>Hủy</button>
              <button
                type="button"
                onClick={() => {
                  setTopic(editTopicTitle);
                  setTopicDesc(editTopicDesc);
                  setShowEditTopicModal(false);
                  showToast('Đã cập nhật đề tài dự án thành công!');
                }}
                style={{ padding: '8px 16px', borderRadius: 10, backgroundColor: 'var(--accent-color, #F26F21)', border: 'none', color: '#FFFFFF', fontSize: '14.5px', fontWeight: 700 }}
              >
                Lưu thay đổi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Chuyển quyền Leader */}
      {showTransferLeaderModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 16 }}>
          <div style={{ backgroundColor: 'var(--bg-card, #FFFFFF)', border: '1px solid var(--border-light, #E2E8F0)', borderRadius: 20, padding: 24, maxWidth: 440, width: '100%' }}>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-main, #0F172A)', margin: '0 0 1rem 0' }}>
              Chuyển quyền Trưởng nhóm
            </h3>
            <p style={{ fontSize: '15px', color: 'var(--text-muted, #64748B)', marginBottom: '1rem' }}>
              Chọn một thành viên trong nhóm để chuyển giao trọng trách Trưởng nhóm:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '1.25rem' }}>
              {members
                .filter((m) => m.id !== 'current-user')
                .map((m) => (
                  <label
                    key={m.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '10px 12px',
                      borderRadius: 12,
                      border: selectedNewLeaderId === m.id ? '1px solid #F27024' : '1px solid #E2E8F0',
                      backgroundColor: selectedNewLeaderId === m.id ? '#FFF7ED' : '#FFFFFF',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="radio"
                      name="newLeader"
                      value={m.id}
                      checked={selectedNewLeaderId === m.id}
                      onChange={() => setSelectedNewLeaderId(m.id)}
                    />
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main, #0F172A)' }}>{m.name}</div>
                      <div style={{ fontSize: '13.5px', color: 'var(--text-muted, #64748B)' }}>{m.studentCode} • {m.major}</div>
                    </div>
                  </label>
                ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button type="button" onClick={() => setShowTransferLeaderModal(false)} style={{ padding: '8px 14px', borderRadius: 10, backgroundColor: 'var(--bg-tag, #F1F5F9)', border: '1px solid var(--border-light, #E2E8F0)', color: 'var(--text-secondary, #475569)', fontSize: '14.5px', fontWeight: 600 }}>Hủy</button>
              <button
                type="button"
                onClick={handleConfirmTransferLeader}
                disabled={!selectedNewLeaderId}
                style={{ padding: '8px 16px', borderRadius: 10, backgroundColor: 'var(--accent-color, #F26F21)', border: 'none', color: '#FFFFFF', fontSize: '14.5px', fontWeight: 700, cursor: selectedNewLeaderId ? 'pointer' : 'not-allowed' }}
              >
                Xác nhận chuyển quyền
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Gửi yêu cầu Chuyển nhóm / Đổi chéo (Hậu chốt sổ) */}
      {showTransferSwapModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 16 }}>
          <div style={{ backgroundColor: 'var(--bg-card, #FFFFFF)', border: '1px solid var(--border-light, #E2E8F0)', borderRadius: 20, padding: 24, maxWidth: 520, width: '100%' }}>
            <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main, #0F172A)', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ArrowLeftRight size={18} color="#0054A6" />
              <span>Đơn xin Chuyển nhóm / Đổi chéo Hậu Chốt sổ</span>
            </h3>
            <p style={{ fontSize: '14.5px', color: 'var(--text-muted, #64748B)', margin: '0 0 1rem 0' }}>
              Quy trình điều phối nhân sự đặc biệt sau khi học kỳ đã khóa danh sách chính thức.
            </p>

            {/* Constraint check: If current members <= 3 */}
            {members.length <= 3 && (
              <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 12, padding: '10px 14px', marginBottom: '1rem', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <ShieldAlert size={18} color="#DC2626" style={{ flexShrink: 0, marginTop: 2 }} />
                <div style={{ fontSize: '14.5px', color: '#991B1B', lineHeight: 1.45 }}>
                  <strong>Quy định bảo toàn sĩ số:</strong> Nhóm hiện tại của bạn chỉ có đúng <strong>{members.length} thành viên</strong> (ngưỡng tối thiểu môn học). Bắt buộc phải chọn hình thức <strong>Đổi chéo 2 sinh viên (Swap 1-1)</strong> để không làm nhóm thiếu người!
                </div>
              </div>
            )}

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 700, color: 'var(--text-secondary, #334155)', marginBottom: '6px' }}>Hình thức chuyển:</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <button
                  type="button"
                  disabled={members.length <= 3}
                  onClick={() => setTransferType('ONE_WAY')}
                  style={{
                    padding: '10px',
                    borderRadius: 12,
                    border: transferType === 'ONE_WAY' ? '1px solid #0054A6' : '1px solid #E2E8F0',
                    backgroundColor: transferType === 'ONE_WAY' ? '#EFF6FF' : '#FFFFFF',
                    color: members.length <= 3 ? '#94A3B8' : transferType === 'ONE_WAY' ? '#0054A6' : '#334155',
                    fontSize: '14.5px',
                    fontWeight: 700,
                    cursor: members.length <= 3 ? 'not-allowed' : 'pointer',
                  }}
                >
                  Chuyển 1 chiều
                </button>
                <button
                  type="button"
                  onClick={() => setTransferType('SWAP')}
                  style={{
                    padding: '10px',
                    borderRadius: 12,
                    border: transferType === 'SWAP' ? '1px solid #0054A6' : '1px solid #E2E8F0',
                    backgroundColor: transferType === 'SWAP' ? '#EFF6FF' : '#FFFFFF',
                    color: transferType === 'SWAP' ? '#0054A6' : '#334155',
                    fontSize: '14.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Đổi chéo 2 sinh viên (Swap)
                </button>
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 700, color: 'var(--text-secondary, #334155)', marginBottom: '4px' }}>Chọn phòng nhóm muốn đến:</label>
              <select
                value={targetRoomCode}
                onChange={(e) => setTargetRoomCode(e.target.value)}
                style={{ width: '100%', height: 44, padding: '0 12px', borderRadius: 10, border: '1px solid var(--border-medium, #CBD5E1)', fontSize: '15px' }}
              >
                <option value="FA26EXE101-03">FA26EXE101-03 (EcoCampus - 3/5 SV)</option>
                <option value="FA26EXE101-04">FA26EXE101-04 (FinWise - 4/5 SV)</option>
                <option value="FA26EXE101-06">FA26EXE101-06 (AgriTrust - 4/5 SV)</option>
              </select>
            </div>

            {transferType === 'SWAP' && (
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 700, color: 'var(--text-secondary, #334155)', marginBottom: '4px' }}>Sinh viên đối tác đồng ý đổi chéo:</label>
                <select
                  value={swapStudentName}
                  onChange={(e) => setSwapStudentName(e.target.value)}
                  style={{ width: '100%', height: 44, padding: '0 12px', borderRadius: 10, border: '1px solid var(--border-medium, #CBD5E1)', fontSize: '15px' }}
                >
                  <option value="Bùi Phương Thảo (SE1803)">Bùi Phương Thảo (SE180312 • Lớp SE1803)</option>
                  <option value="Trương Mỹ Linh (IB1802)">Trương Mỹ Linh (IB180220 • Lớp IB1802)</option>
                  <option value="Đỗ Thu Hà (IB1802)">Đỗ Thu Hà (IB180202 • Lớp IB1802)</option>
                </select>
              </div>
            )}

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 700, color: 'var(--text-secondary, #334155)', marginBottom: '4px' }}>Lý do xin chuyển / đổi chéo (bắt buộc):</label>
              <textarea
                rows={3}
                required
                placeholder="Nêu rõ lý do học vụ, định hướng đề tài hoặc sự phù hợp kỹ năng để Điều phối viên xem xét..."
                value={transferReason}
                onChange={(e) => setTransferReason(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 10, border: '1px solid var(--border-medium, #CBD5E1)', fontSize: '15px', boxSizing: 'border-box', fontFamily: 'inherit' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button type="button" onClick={() => setShowTransferSwapModal(false)} style={{ padding: '8px 14px', borderRadius: 10, backgroundColor: 'var(--bg-tag, #F1F5F9)', border: '1px solid var(--border-light, #E2E8F0)', color: 'var(--text-secondary, #475569)', fontSize: '14.5px', fontWeight: 600 }}>Hủy</button>
              <button
                type="button"
                onClick={() => {
                  if (!transferReason.trim()) {
                    alert('Vui lòng nhập lý do chuyển nhóm!');
                    return;
                  }
                  setShowTransferSwapModal(false);
                  showToast('Đã gửi đơn yêu cầu chuyển nhóm / đổi chéo thành công! Điều phối viên học kỳ sẽ thẩm định và gửi thông báo qua email.');
                }}
                style={{ padding: '8px 18px', borderRadius: 10, backgroundColor: '#0054A6', border: 'none', color: '#FFFFFF', fontSize: '14.5px', fontWeight: 700 }}
              >
                Gửi đơn điều chuyển
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// 3. JOIN REQUESTS PAGE (/join-requests)
// ══════════════════════════════════════════════════════════════════════════════
export const JoinRequestsPage: React.FC = () => {
  interface MyRequest {
    id: string;
    roomCode: string;
    topic: string;
    submittedAt: string;
    status: 'Pending' | 'Cancelled' | 'Rejected' | 'Accepted';
    reason?: string;
  }

  const [requests, setRequests] = useState<MyRequest[]>([
    {
      id: 'req-01',
      roomCode: 'FA26EXE101-03',
      topic: 'EcoCampus - Phân loại rác AI',
      submittedAt: '09:30 • 08/11/2026',
      status: 'Pending',
    },
    {
      id: 'req-02',
      roomCode: 'FA26EXE101-04',
      topic: 'FinWise - Tài chính sinh viên',
      submittedAt: '15:45 • 08/11/2026',
      status: 'Pending',
    },
    {
      id: 'req-03',
      roomCode: 'FA26EXE101-05',
      topic: 'SafeRide - Đi chung xe Campus',
      submittedAt: '11:20 • 07/11/2026',
      status: 'Cancelled',
      reason: 'Nhóm đã đủ thành viên / đóng tuyển',
    },
    {
      id: 'req-04',
      roomCode: 'FA26EXE101-01',
      topic: 'Phòng nhóm 01',
      submittedAt: '10:00 • 06/11/2026',
      status: 'Cancelled',
      reason: 'Tự động hủy do bạn đã tham gia vào nhóm khác',
    },
  ]);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const pendingCount = requests.filter((r) => r.status === 'Pending').length;

  const handleWithdraw = (id: string) => {
    setRequests((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, status: 'Cancelled', reason: 'Sinh viên chủ động rút đơn' } : r
      )
    );
    setToastMessage('Đã rút đơn ứng tuyển thành công!');
    setTimeout(() => setToastMessage(null), 3000);
  };

  return (
    <div style={{ maxWidth: 1560, margin: '0 auto', paddingBottom: '3.5rem' }}>
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: 24,
            right: 24,
            zIndex: 9999,
            backgroundColor: '#0F172A',
            color: '#FFFFFF',
            padding: '12px 20px',
            borderRadius: 12,
            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          <CheckCircle2 size={18} color="#22C55E" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12.5px',
            fontWeight: 450,
            color: 'var(--text-muted, #64748B)',
            marginBottom: '0.45rem',
          }}
        >
          <span>Học phần</span>
          <span style={{ color: 'var(--text-light, #CBD5E1)' }}>/</span>
          <span>EXE</span>
          <span style={{ color: 'var(--text-light, #CBD5E1)' }}>/</span>
          <span style={{ color: 'var(--text-main, #0F172A)', fontWeight: 500 }}>Đơn ứng tuyển</span>
        </div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 650, color: 'var(--text-main, #0F172A)', margin: '0 0 6px 0', letterSpacing: '-0.022em' }}>
          Đơn Ứng Tuyển Của Tôi
        </h1>
        <p style={{ color: 'var(--text-muted, #64748B)', fontSize: '0.95rem', fontWeight: 400, margin: 0 }}>
          Theo dõi trạng thái xét duyệt các đơn ứng tuyển vào nhóm khởi nghiệp của bạn.
        </p>
      </div>

      {/* Counter Limit Box */}
      <div
        style={{
          backgroundColor: 'var(--bg-card, #FFFFFF)',
          border: '1px solid var(--border-light, #E2E8F0)',
          borderRadius: '20px',
          padding: '20px 26px',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.03)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: 34, height: 34, borderRadius: 8, backgroundColor: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569' }}>
            <Clock size={16} />
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A' }}>
              Đơn đang chờ duyệt: <span style={{ fontWeight: 600, color: '#0F172A' }}>{pendingCount} / 3 đơn tối đa</span> cùng lúc
            </div>
            <div style={{ fontSize: '12.5px', fontWeight: 400, color: '#64748B', marginTop: '2px' }}>
              Quy định giới hạn tối đa 3 đơn đồng thời để đảm bảo tính cam kết và tránh gửi đơn trùng lặp.
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '5px' }}>
          {[1, 2, 3].map((slot) => (
            <div
              key={slot}
              style={{
                width: 24,
                height: 4,
                borderRadius: 999,
                backgroundColor: slot <= pendingCount ? 'var(--status-progress, #7C3AED)' : '#E2E8F0',
              }}
            />
          ))}
        </div>
      </div>

      {/* Request List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {requests.map((req, idx) => (
          <div
            key={req.id}
            className="motion-card-interactive motion-stagger-item"
            style={
              {
                '--stagger-index': Math.min(idx, 6),
                backgroundColor: 'var(--bg-card, #FFFFFF)',
                border: '1px solid var(--border-light, #E2E8F0)',
                borderRadius: '12px',
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
              } as React.CSSProperties
            }
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                <span style={{ fontWeight: 600, color: '#0F172A', fontSize: '14.5px' }}>
                  {req.topic}
                </span>
                <span style={{ color: '#CBD5E1' }}>·</span>
                <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 400, fontSize: '12px', color: '#94A3B8' }}>
                  {req.roomCode}
                </span>
              </div>
              <div style={{ fontSize: '12px', fontWeight: 400, color: '#94A3B8' }}>
                Thời điểm nộp đơn: {req.submittedAt}
              </div>
              {req.reason && (
                <div style={{ fontSize: '13px', color: '#475569', marginTop: '4px', fontWeight: 450 }}>
                  Ghi chú: {req.reason}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {req.status === 'Pending' && (
                <>
                  <span
                    style={{
                      fontSize: '12.5px',
                      fontWeight: 500,
                      color: '#334155',
                      backgroundColor: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      padding: '3px 9px',
                      borderRadius: 6,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        backgroundColor: '#F59E0B',
                        boxShadow: '0 0 0 2px rgba(245, 158, 11, 0.2)',
                        flexShrink: 0,
                      }}
                    />
                    Đang chờ duyệt
                  </span>
                  <button
                    type="button"
                    onClick={() => handleWithdraw(req.id)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: 8,
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      color: '#475569',
                      fontSize: '12.5px',
                      fontWeight: 500,
                      cursor: 'pointer',
                    }}
                  >
                    Rút đơn ứng tuyển
                  </button>
                </>
              )}
              {req.status === 'Cancelled' && (
                <span
                  style={{
                    fontSize: '12.5px',
                    fontWeight: 500,
                    color: '#64748B',
                    backgroundColor: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    padding: '3px 9px',
                    borderRadius: 6,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#94A3B8', flexShrink: 0 }} />
                  Đã hủy
                </span>
              )}
              {req.status === 'Accepted' && (
                <span
                  style={{
                    fontSize: '12.5px',
                    fontWeight: 500,
                    color: '#334155',
                    backgroundColor: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    padding: '3px 9px',
                    borderRadius: 6,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      backgroundColor: '#10B981',
                      boxShadow: '0 0 0 2px rgba(16, 185, 129, 0.18)',
                      flexShrink: 0,
                    }}
                  />
                  Đã chấp thuận
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// 4. INVITATIONS PAGE (/invitations)
// ══════════════════════════════════════════════════════════════════════════════
export const InvitationsPage: React.FC = () => {
  return (
    <div style={{ maxWidth: 1560, margin: '0 auto', paddingBottom: '3.5rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-main, #0F172A)', margin: '0 0 6px 0' }}>
          Lời Mời Tham Gia Nhóm
        </h1>
        <p style={{ color: 'var(--text-muted, #64748B)', fontSize: '1.025rem', margin: 0 }}>
          Các lời mời từ Trưởng nhóm gửi trực tiếp đến bạn để kết nạp vào đề tài học kỳ.
        </p>
      </div>

      <div
        style={{
          backgroundColor: 'var(--bg-card, #FFFFFF)',
          border: '1px solid var(--border-light, #E2E8F0)',
          borderRadius: '20px',
          padding: '24px',
          textAlign: 'center',
          color: 'var(--text-muted, #64748B)',
          fontSize: '15px',
        }}
      >
        Hiện tại bạn không có lời mời gia nhập nào đang chờ phản hồi.
      </div>
    </div>
  );
};
