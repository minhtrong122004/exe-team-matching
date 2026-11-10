import React, { useState } from 'react';
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
} from '../../utils/icons';

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

const SAMPLE_FAP_STUDENTS: FapStudent[] = [
  { id: 'st-01', studentCode: 'SE185102', fullName: 'Lữ Phước Nhật Tú', email: 'tulpnse185102@fpt.edu.vn', major: 'Kỹ thuật phần mềm (SE)', cohort: 'K18', classCode: 'SE1801', profileCompleted: true, accountCreated: true },
  { id: 'st-02', studentCode: 'SE180201', fullName: 'Nguyễn Đức Anh', email: 'anhndse180201@fpt.edu.vn', major: 'Kỹ thuật phần mềm (SE)', cohort: 'K18', classCode: 'SE1802', profileCompleted: true, accountCreated: true },
  { id: 'st-03', studentCode: 'MKT180120', fullName: 'Võ Trọng Tín', email: 'tinvtmkt180120@fpt.edu.vn', major: 'Digital Marketing (MKT)', cohort: 'K18', classCode: 'MKT1801', profileCompleted: true, accountCreated: true },
  { id: 'st-04', studentCode: 'GD180215', fullName: 'Lê Hoàng Yến', email: 'yenlhgd180215@fpt.edu.vn', major: 'Thiết kế mỹ thuật số (GD)', cohort: 'K18', classCode: 'GD1802', profileCompleted: true, accountCreated: true },
  { id: 'st-05', studentCode: 'SE180145', fullName: 'Phạm Bảo Trân', email: 'tranpbse180145@fpt.edu.vn', major: 'Trí tuệ nhân tạo (AI)', cohort: 'K18', classCode: 'SE1801', profileCompleted: true, accountCreated: true },
  { id: 'st-06', studentCode: 'SE185108', fullName: 'Trần Minh Quân', email: 'quantmse185108@fpt.edu.vn', major: 'Kỹ thuật phần mềm (SE)', cohort: 'K18', classCode: 'SE1801', profileCompleted: true, accountCreated: true },
  { id: 'st-07', studentCode: 'IB184201', fullName: 'Nguyễn Văn Hoàng', email: 'hoangnvib184201@fpt.edu.vn', major: 'Kinh doanh quốc tế (IB)', cohort: 'K18', classCode: 'IB1801', profileCompleted: true, accountCreated: true },
  { id: 'st-08', studentCode: 'GD180332', fullName: 'Lê Hồng Phong', email: 'phonglhgd180332@fpt.edu.vn', major: 'Thiết kế đồ họa (GD)', cohort: 'K18', classCode: 'GD1801', profileCompleted: true, accountCreated: true },
  { id: 'st-09', studentCode: 'MKT180411', fullName: 'Phạm Thu Hà', email: 'haptmkt180411@fpt.edu.vn', major: 'Digital Marketing (MKT)', cohort: 'K18', classCode: 'MKT1802', profileCompleted: true, accountCreated: true },
  { id: 'st-10', studentCode: 'SE180555', fullName: 'Đỗ Mạnh Tuấn', email: 'tuandmse180555@fpt.edu.vn', major: 'Kỹ thuật phần mềm (SE)', cohort: 'K18', classCode: 'SE1803', profileCompleted: true, accountCreated: true },
  { id: 'st-11', studentCode: 'IB180622', fullName: 'Ngô Phương Thảo', email: 'thaonpib180622@fpt.edu.vn', major: 'Kinh doanh quốc tế (IB)', cohort: 'K18', classCode: 'IB1802', profileCompleted: true, accountCreated: true },
  { id: 'st-12', studentCode: 'SE180709', fullName: 'Bùi Gia Huy', email: 'huybgse180709@fpt.edu.vn', major: 'An toàn thông tin (IA)', cohort: 'K18', classCode: 'SE1802', profileCompleted: true, accountCreated: true },
  { id: 'st-13', studentCode: 'MKT180801', fullName: 'Đặng Mai Linh', email: 'linhdmmkt180801@fpt.edu.vn', major: 'Truyền thông đa phương tiện', cohort: 'K18', classCode: 'MKT1801', profileCompleted: false, accountCreated: true },
  { id: 'st-14', studentCode: 'GD180912', fullName: 'Phan Quốc Việt', email: 'vietpqgd180912@fpt.edu.vn', major: 'Thiết kế mỹ thuật số (GD)', cohort: 'K18', classCode: 'GD1802', profileCompleted: true, accountCreated: true },
  { id: 'st-15', studentCode: 'SE181033', fullName: 'Hoàng Đức Nam', email: 'namhdse181033@fpt.edu.vn', major: 'Kỹ thuật phần mềm (SE)', cohort: 'K18', classCode: 'SE1801', profileCompleted: true, accountCreated: true },
  { id: 'st-16', studentCode: 'MKT181155', fullName: 'Vũ Thùy Linh', email: 'linhvtmkt181155@fpt.edu.vn', major: 'Digital Marketing (MKT)', cohort: 'K18', classCode: 'MKT1803', profileCompleted: true, accountCreated: true },
  { id: 'st-17', studentCode: 'SE181288', fullName: 'Trịnh Thế Bảo', email: 'baottse181288@fpt.edu.vn', major: 'Hệ thống thông tin (IS)', cohort: 'K18', classCode: 'SE1803', profileCompleted: false, accountCreated: true },
  { id: 'st-18', studentCode: 'IB181399', fullName: 'Nguyễn Kiều Oanh', email: 'oanhnkib181399@fpt.edu.vn', major: 'Quản trị kinh doanh (BA)', cohort: 'K18', classCode: 'IB1801', profileCompleted: true, accountCreated: true },
  { id: 'st-19', studentCode: 'GD181402', fullName: 'Trần Cẩm Tú', email: 'tutcgd181402@fpt.edu.vn', major: 'Thiết kế đồ họa (GD)', cohort: 'K18', classCode: 'GD1801', profileCompleted: true, accountCreated: true },
  { id: 'st-20', studentCode: 'SE181511', fullName: 'Phạm Hoàng Khang', email: 'khangphse181511@fpt.edu.vn', major: 'Kỹ thuật phần mềm (SE)', cohort: 'K18', classCode: 'SE1802', profileCompleted: true, accountCreated: true },
];

export const ModeratorSpacesPage: React.FC = () => {
  // Course Space state
  const [activeCourse, setActiveCourse] = useState<'EXE101' | 'EXE201'>('EXE101');
  const [currentPhase, setCurrentPhase] = useState<number>(2); // 1: Draft, 2: Open, 3: Closed/Matching, 4: Locked

  // Configuration params
  const [maxMembers, setMaxMembers] = useState<number>(5);
  const minThreshold = 3; // Computed threshold
  const [reserveRatio, setReserveRatio] = useState<number>(1.2);
  const [maxPendingRequests, setMaxPendingRequests] = useState<number>(3);
  const [deadline, setDeadline] = useState<string>('2026-11-20T23:59');
  const [savedConfigToast, setSavedConfigToast] = useState<string | null>(null);

  // FAP Sync state
  const [students, setStudents] = useState<FapStudent[]>(SAMPLE_FAP_STUDENTS);
  const [totalStudentsCount, setTotalStudentsCount] = useState<number>(50);
  const [syncStatus, setSyncStatus] = useState<string | null>(
    'Đã đồng bộ 50 sinh viên đủ điều kiện từ FAP. Tài khoản đăng nhập đã được khởi tạo và gửi qua email @fpt.edu.vn.'
  );
  const [searchStudent, setSearchStudent] = useState<string>('');

  // Bulk rooms state
  const computedRoomsCount = Math.ceil((totalStudentsCount / maxMembers) * reserveRatio); // 50 / 5 * 1.2 = 12
  const [createdRooms, setCreatedRooms] = useState<string[]>([
    'FA26EXE101-01',
    'FA26EXE101-02',
    'FA26EXE101-03',
    'FA26EXE101-04',
    'FA26EXE101-05',
    'FA26EXE101-06',
    'FA26EXE101-07',
    'FA26EXE101-08',
    'FA26EXE101-09',
    'FA26EXE101-10',
    'FA26EXE101-11',
    'FA26EXE101-12',
  ]);
  const [roomsCreatedToast, setRoomsCreatedToast] = useState<string | null>(null);
  const [fapSyncToast, setFapSyncToast] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 8;

  // Handlers
  const handleSaveConfig = () => {
    setSavedConfigToast('Đã lưu cấu hình thông số ghép nhóm học kỳ Fall 2026 thành công!');
    setTimeout(() => setSavedConfigToast(null), 3500);
  };

  const handleSyncFap = () => {
    setTotalStudentsCount(50);
    setStudents(SAMPLE_FAP_STUDENTS);
    setCurrentPage(1);
    const msg = 'Đã đồng bộ 50 sinh viên kỳ Fall 2026 và tự động gửi 50 email cấp mật khẩu khởi tạo qua hệ thống MailHog';
    setSyncStatus(msg);
    setFapSyncToast(msg);
    setTimeout(() => setFapSyncToast(null), 4500);
  };

  const handleCreateRooms = () => {
    const newRooms: string[] = [];
    for (let i = 1; i <= computedRoomsCount; i++) {
      const pad = i < 10 ? `0${i}` : `${i}`;
      newRooms.push(`FA26${activeCourse}-${pad}`);
    }
    setCreatedRooms(newRooms);
    setRoomsCreatedToast(`Đã khởi tạo thành công ${computedRoomsCount} phòng trống (${newRooms[0]} → ${newRooms[newRooms.length - 1]}) sẵn sàng cho sinh viên ghép nhóm!`);
    setTimeout(() => setRoomsCreatedToast(null), 4000);
  };

  const filteredStudents = students.filter(
    (s) =>
      s.fullName.toLowerCase().includes(searchStudent.toLowerCase()) ||
      s.studentCode.toLowerCase().includes(searchStudent.toLowerCase()) ||
      s.major.toLowerCase().includes(searchStudent.toLowerCase()) ||
      s.classCode.toLowerCase().includes(searchStudent.toLowerCase())
  );

  const totalPages = Math.ceil(filteredStudents.length / pageSize) || 1;
  const paginatedStudents = filteredStudents.slice((currentPage - 1) * pageSize, currentPage * pageSize);

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
      <div style={{ display: 'flex', gap: '10px', marginBottom: '1.5rem' }}>
        <button
          type="button"
          className="motion-btn"
          onClick={() => setActiveCourse('EXE101')}
          style={{
            padding: '9px 18px',
            borderRadius: 10,
            fontSize: '14.5px',
            fontWeight: 600,
            cursor: 'pointer',
            border: activeCourse === 'EXE101' ? '1px solid var(--accent-color, #F26F21)' : '1px solid var(--border-light, #E2E8F0)',
            background: activeCourse === 'EXE101' ? 'var(--accent-gradient, var(--accent-color, #F26F21))' : 'var(--bg-card, #FFFFFF)',
            color: activeCourse === 'EXE101' ? '#FFFFFF' : 'var(--text-muted, #64748B)',
            boxShadow: activeCourse === 'EXE101' ? '0 1px 3px var(--accent-shadow, rgba(242, 111, 33, 0.2))' : 'none',
            transition: 'all 0.15s ease',
          }}
        >
          Học kỳ Fall 2026 • EXE101 (Đổi mới Sáng tạo 1)
        </button>
        <button
          type="button"
          className="motion-btn"
          onClick={() => setActiveCourse('EXE201')}
          style={{
            padding: '9px 18px',
            borderRadius: 10,
            fontSize: '14.5px',
            fontWeight: 600,
            cursor: 'pointer',
            border: activeCourse === 'EXE201' ? '1px solid var(--accent-color, #F26F21)' : '1px solid var(--border-light, #E2E8F0)',
            background: activeCourse === 'EXE201' ? 'var(--accent-gradient, var(--accent-color, #F26F21))' : 'var(--bg-card, #FFFFFF)',
            color: activeCourse === 'EXE201' ? '#FFFFFF' : 'var(--text-muted, #64748B)',
            boxShadow: activeCourse === 'EXE201' ? '0 1px 3px var(--accent-shadow, rgba(242, 111, 33, 0.2))' : 'none',
            transition: 'all 0.15s ease',
          }}
        >
          Học kỳ Fall 2026 • EXE201 (Thực chiến Khởi nghiệp 2)
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
              Bấm vào từng giai đoạn để chuyển đổi trạng thái thực tế của không gian môn học:
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
                onClick={() => setCurrentPhase(item.phase)}
                style={{
                  cursor: 'pointer',
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
      </div>

      {/* Grid: 2 Columns for Config & Bulk Init */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '1.5rem', marginBottom: '1.75rem' }}>
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
                      min={3}
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
                      max={1.5}
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
              style={{
                width: '100%',
                height: 44,
                borderRadius: 12,
                backgroundColor: 'var(--accent-color, #F26F21)',
                color: '#FFFFFF',
                border: 'none',
                fontWeight: 700,
                fontSize: '15px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginBottom: '16px',
              }}
            >
              <Sparkles size={16} />
              <span>
                Khởi tạo tự động {computedRoomsCount} Phòng trống (FA26{activeCourse}-01 → FA26{activeCourse}-{computedRoomsCount < 10 ? `0${computedRoomsCount}` : computedRoomsCount})
              </span>
            </button>

            {/* Danh sách phòng đã tạo (Lưới 3 cột cố định, không bị rớt dòng mã phòng) */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-muted, #64748B)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Danh sách phòng hiện có ({createdRooms.length} phòng)
                </span>
                <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#64748B' }}>
                  Sẵn sàng mở đăng ký
                </span>
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '10px',
                }}
              >
                {createdRooms.map((roomCode) => (
                  <div
                    key={roomCode}
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
                      {roomCode}
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
                      0/{maxMembers}
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
                Dữ liệu sinh viên đủ điều kiện học kỳ Fall 2026 môn {activeCourse} đồng bộ từ hệ thống đào tạo FAP
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
              <span>Tải lên file CSV / Excel chuẩn FAP</span>
              <input type="file" accept=".csv, .xlsx, .xls" style={{ display: 'none' }} onChange={handleSyncFap} />
            </label>

            {/* Nút 2: Đồng bộ nhanh từ Mock FAP API (50 Sinh viên) */}
            <button
              type="button"
              onClick={handleSyncFap}
              style={{
                height: 44,
                padding: '0 16px',
                borderRadius: 12,
                border: 'none',
                backgroundColor: 'var(--accent-color, #F26F21)',
                color: '#FFFFFF',
                fontSize: '15px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '7px',
                boxShadow: '0 2px 6px rgba(242, 112, 36, 0.25)',
                transition: 'opacity 0.15s ease',
              }}
            >
              <Database size={15} />
              <span>Đồng bộ nhanh từ Mock FAP API (50 Sinh viên)</span>
            </button>

            {/* Nút 3: Mở hộp thư MailHog (localhost:8025) */}
            <a
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
            </a>
          </div>
        </div>

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
                    Không tìm thấy sinh viên nào khớp với từ khóa tìm kiếm.
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
                        <Check size={13} color="#10B981" /> Đã gửi mail khởi tạo
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