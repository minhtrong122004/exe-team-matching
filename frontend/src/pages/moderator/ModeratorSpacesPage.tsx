import React, { useState } from 'react';
import {
  Layers,
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
} from 'lucide-react';

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
    <div style={{ padding: '0 0 3rem 0', maxWidth: 1240, margin: '0 auto' }}>
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
            fontSize: '14px',
            fontWeight: 600,
          }}
        >
          <CheckCircle2 size={18} />
          <span>{savedConfigToast || roomsCreatedToast || fapSyncToast}</span>
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              backgroundColor: 'rgba(242, 112, 36, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#F27024',
            }}
          >
            <Layers size={20} />
          </div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main, #0F172A)', margin: 0 }}>
            Quản lý Không gian Môn học & Đồng bộ FAP
          </h1>
        </div>
        <p style={{ color: 'var(--text-muted, #64748B)', fontSize: '0.9rem', margin: 0, lineHeight: 1.5 }}>
          Thiết lập thông số nhóm học phần EXE, đồng bộ danh sách sinh viên đủ điều kiện từ FAP và khởi tạo số lượng phòng trống tự động cho học kỳ.
        </p>
      </div>

      {/* Course Selector Tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '1.5rem' }}>
        <button
          type="button"
          onClick={() => setActiveCourse('EXE101')}
          style={{
            padding: '8px 18px',
            borderRadius: 10,
            fontSize: '14px',
            fontWeight: 700,
            cursor: 'pointer',
            border: activeCourse === 'EXE101' ? '1px solid #F27024' : '1px solid var(--border-light, #E2E8F0)',
            backgroundColor: activeCourse === 'EXE101' ? 'rgba(242, 112, 36, 0.12)' : 'var(--bg-card, #FFFFFF)',
            color: activeCourse === 'EXE101' ? '#F27024' : 'var(--text-muted, #64748B)',
            transition: 'all 0.15s ease',
          }}
        >
          Học kỳ Fall 2026 • EXE101 (Đổi mới Sáng tạo 1)
        </button>
        <button
          type="button"
          onClick={() => setActiveCourse('EXE201')}
          style={{
            padding: '8px 18px',
            borderRadius: 10,
            fontSize: '14px',
            fontWeight: 700,
            cursor: 'pointer',
            border: activeCourse === 'EXE201' ? '1px solid #F27024' : '1px solid var(--border-light, #E2E8F0)',
            backgroundColor: activeCourse === 'EXE201' ? 'rgba(242, 112, 36, 0.12)' : 'var(--bg-card, #FFFFFF)',
            color: activeCourse === 'EXE201' ? '#F27024' : 'var(--text-muted, #64748B)',
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
          borderRadius: '16px',
          padding: '20px',
          marginBottom: '1.75rem',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main, #0F172A)', margin: 0 }}>
              Tiến trình 4 Giai đoạn Vòng đời Học kỳ
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted, #64748B)', margin: '3px 0 0 0' }}>
              Bấm vào từng giai đoạn để chuyển đổi trạng thái thực tế của không gian môn học:
            </p>
          </div>
          <span
            style={{
              padding: '4px 12px',
              borderRadius: 999,
              fontSize: '12px',
              fontWeight: 700,
              backgroundColor: currentPhase === 2 ? 'rgba(5, 150, 105, 0.12)' : 'rgba(242, 112, 36, 0.12)',
              color: currentPhase === 2 ? '#059669' : '#F27024',
              border: `1px solid ${currentPhase === 2 ? 'rgba(5, 150, 105, 0.3)' : 'rgba(242, 112, 36, 0.3)'}`,
            }}
          >
            {currentPhase === 1 && 'Giai đoạn 1: Bản nháp cấu hình'}
            {currentPhase === 2 && 'Giai đoạn 2: Đang mở đăng ký tự nguyện'}
            {currentPhase === 3 && 'Giai đoạn 3: Đã đóng đăng ký (Chờ điều phối)'}
            {currentPhase === 4 && 'Giai đoạn 4: Đã chốt sổ học kỳ'}
          </span>
        </div>

        {/* Phase Buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
          {[
            { phase: 1, title: '1. Bản nháp cấu hình', desc: 'Thiết lập quy tắc sĩ số & hạn nộp', color: '#64748B' },
            { phase: 2, title: '2. Đang mở đăng ký tự nguyện', desc: 'Sinh viên tự do vào phòng & nộp đơn', color: '#059669' },
            { phase: 3, title: '3. Đã đóng đăng ký', desc: 'Chờ điều phối sinh viên chưa có nhóm', color: '#D97706' },
            { phase: 4, title: '4. Đã chốt sổ học kỳ', desc: 'Khóa cứng danh sách nhóm môn học', color: '#0054A6' },
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
                  border: isActive ? `2px solid ${item.color}` : '1px solid var(--border-light, #E2E8F0)',
                  backgroundColor: isActive ? 'var(--bg-subtle, #F8FAFC)' : 'var(--bg-card, #FFFFFF)',
                  transition: 'all 0.15s ease',
                  position: 'relative',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 800, color: isActive ? item.color : 'var(--text-main, #0F172A)' }}>
                    {item.title}
                  </span>
                  {isPassed ? (
                    <CheckCircle2 size={16} color="#059669" />
                  ) : isActive ? (
                    <div style={{ width: 8, height: 8, borderRadius: 999, backgroundColor: item.color }} />
                  ) : null}
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-muted, #64748B)', margin: 0 }}>
                  {item.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Grid: 2 Columns for Config & Bulk Init */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: '1.5rem', marginBottom: '1.75rem' }}>
        {/* KHUNG 1: Cấu hình Thông số Ghép nhóm */}
        <div
          style={{
            backgroundColor: 'var(--bg-card, #FFFFFF)',
            border: '1px solid var(--border-light, #E2E8F0)',
            borderRadius: '16px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(0, 84, 166, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0054A6' }}>
                <Settings size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main, #0F172A)', margin: 0 }}>
                  Cấu hình Thông số Ghép nhóm ({activeCourse})
                </h3>
                <span style={{ fontSize: '12px', color: 'var(--text-muted, #64748B)' }}>
                  Quy định sĩ số và hạn ngạch nộp đơn trong học kỳ
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Sĩ số tối đa */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-main, #0F172A)', marginBottom: '4px' }}>
                  Sĩ số tối đa mỗi nhóm:
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    type="number"
                    min={3}
                    max={6}
                    value={maxMembers}
                    onChange={(e) => setMaxMembers(Number(e.target.value))}
                    style={{
                      width: 90,
                      height: 38,
                      padding: '0 10px',
                      borderRadius: 8,
                      border: '1px solid var(--border-medium, #CBD5E1)',
                      backgroundColor: 'var(--bg-input, #FFFFFF)',
                      fontSize: '14px',
                      fontWeight: 700,
                      color: 'var(--text-main, #0F172A)',
                      outline: 'none',
                    }}
                  />
                  <span style={{ fontSize: '13px', color: 'var(--text-muted, #64748B)' }}>
                    sinh viên / nhóm (Mặc định: 5)
                  </span>
                </div>
              </div>

              {/* Ngưỡng tối thiểu thành lập nhóm (Tự động tính) */}
              <div style={{ padding: '10px 14px', borderRadius: 10, backgroundColor: 'var(--bg-subtle, #F8FAFC)', border: '1px solid var(--border-subtle, #F1F5F9)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main, #0F172A)' }}>
                    Ngưỡng tối thiểu thành lập nhóm:
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: 800, color: '#059669', backgroundColor: 'rgba(5, 150, 105, 0.12)', padding: '2px 10px', borderRadius: 999 }}>
                    Tự động tính: {minThreshold} thành viên
                  </span>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-muted, #64748B)', margin: '4px 0 0 0' }}>
                  Khi đạt đủ 3 người, phòng tự động khóa cổng vào thẳng và chuyển sang chế độ Nhóm chính thức (chỉ nhận thêm thành viên qua đơn ứng tuyển).
                </p>
              </div>

              {/* Hệ số phòng dự phòng */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-main, #0F172A)', marginBottom: '4px' }}>
                  Hệ số phòng dự phòng:
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
                      width: 90,
                      height: 38,
                      padding: '0 10px',
                      borderRadius: 8,
                      border: '1px solid var(--border-medium, #CBD5E1)',
                      backgroundColor: 'var(--bg-input, #FFFFFF)',
                      fontSize: '14px',
                      fontWeight: 700,
                      color: 'var(--text-main, #0F172A)',
                      outline: 'none',
                    }}
                  />
                  <span style={{ fontSize: '12px', color: 'var(--text-muted, #64748B)' }}>
                    (Mặc định: 1.2 — Nhân với số phòng ước tính để đảm bảo luôn dư phòng trống cho sinh viên lựa chọn)
                  </span>
                </div>
              </div>

              {/* Giới hạn đơn ứng tuyển chờ cùng lúc */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-main, #0F172A)', marginBottom: '4px' }}>
                  Giới hạn đơn ứng tuyển chờ duyệt cùng lúc của 1 sinh viên:
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={maxPendingRequests}
                    onChange={(e) => setMaxPendingRequests(Number(e.target.value))}
                    style={{
                      width: 90,
                      height: 38,
                      padding: '0 10px',
                      borderRadius: 8,
                      border: '1px solid var(--border-medium, #CBD5E1)',
                      backgroundColor: 'var(--bg-input, #FFFFFF)',
                      fontSize: '14px',
                      fontWeight: 700,
                      color: 'var(--text-main, #0F172A)',
                      outline: 'none',
                    }}
                  />
                  <span style={{ fontSize: '12px', color: 'var(--text-muted, #64748B)' }}>
                    đơn tối đa (Mặc định: 3 — thay đổi chỉ áp dụng cho các đơn nộp sau thời điểm cập nhật)
                  </span>
                </div>
              </div>

              {/* Thời hạn đóng đăng ký tự nguyện */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-main, #0F172A)', marginBottom: '4px' }}>
                  Thời hạn đóng đăng ký tự nguyện:
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Calendar size={16} color="var(--text-light, #94A3B8)" />
                  <input
                    type="datetime-local"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    style={{
                      height: 38,
                      padding: '0 12px',
                      borderRadius: 8,
                      border: '1px solid var(--border-medium, #CBD5E1)',
                      backgroundColor: 'var(--bg-input, #FFFFFF)',
                      fontSize: '13px',
                      color: 'var(--text-main, #0F172A)',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '1.25rem', paddingTop: '12px', borderTop: '1px solid var(--border-light, #E2E8F0)' }}>
            <button
              type="button"
              onClick={handleSaveConfig}
              style={{
                width: '100%',
                height: 40,
                borderRadius: 10,
                backgroundColor: '#F27024',
                color: '#FFFFFF',
                border: 'none',
                fontWeight: 700,
                fontSize: '14px',
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
            borderRadius: '16px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(242, 112, 36, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F27024' }}>
                <Hash size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main, #0F172A)', margin: 0 }}>
                  Khởi tạo Phòng trống Hàng loạt
                </h3>
                <span style={{ fontSize: '12px', color: 'var(--text-muted, #64748B)' }}>
                  Tự động tính toán số lượng phòng cần thiết dựa trên sĩ số sinh viên
                </span>
              </div>
            </div>

            {/* Công thức tính toán rõ ràng */}
            <div
              style={{
                padding: '16px',
                borderRadius: 12,
                backgroundColor: 'rgba(0, 84, 166, 0.05)',
                border: '1px solid rgba(0, 84, 166, 0.2)',
                marginBottom: '1rem',
              }}
            >
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#0054A6', marginBottom: '6px', textTransform: 'uppercase' }}>
                Công thức tính số lượng phòng tự động:
              </div>
              <div style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '15px', fontWeight: 800, color: 'var(--text-main, #0F172A)', marginBottom: '8px' }}>
                {totalStudentsCount} SV đủ điều kiện ÷ {maxMembers} người/nhóm × Hệ số {reserveRatio} = {computedRoomsCount} Phòng
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted, #64748B)', margin: 0, lineHeight: 1.4 }}>
                Hệ số dự phòng 1.2 đảm bảo luôn có dư ít nhất 2 phòng trống để sinh viên có thể chủ động lựa chọn môi trường ghép nhóm phù hợp.
              </p>
            </div>

            {/* Nút Khởi tạo 12 phòng */}
            <button
              type="button"
              onClick={handleCreateRooms}
              style={{
                width: '100%',
                height: 42,
                borderRadius: 10,
                backgroundColor: '#0054A6',
                color: '#FFFFFF',
                border: 'none',
                fontWeight: 700,
                fontSize: '14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginBottom: '1rem',
              }}
            >
              <Sparkles size={16} />
              Khởi tạo tự động {computedRoomsCount} Phòng trống (FA26{activeCourse}-01 → FA26{activeCourse}-{computedRoomsCount < 10 ? `0${computedRoomsCount}` : computedRoomsCount})
            </button>

            {/* Danh sách phòng đã tạo */}
            <div>
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted, #64748B)', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                Danh sách phòng hiện có ({createdRooms.length} phòng):
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '8px', maxHeight: '160px', overflowY: 'auto' }}>
                {createdRooms.map((roomCode) => (
                  <div
                    key={roomCode}
                    style={{
                      padding: '8px 10px',
                      borderRadius: 8,
                      border: '1px solid var(--border-light, #E2E8F0)',
                      backgroundColor: 'var(--bg-subtle, #F8FAFC)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '12px',
                    }}
                  >
                    <span style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700, color: 'var(--text-main, #0F172A)' }}>
                      {roomCode}
                    </span>
                    <span style={{ fontSize: '11px', color: '#059669', fontWeight: 600 }}>0/5</span>
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
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(5, 150, 105, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669' }}>
              <Database size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-main, #0F172A)', margin: 0 }}>
                Danh sách Sinh viên Đủ điều kiện Học phần (Đồng bộ từ FAP)
              </h3>
              <span style={{ fontSize: '12.5px', color: 'var(--text-muted, #64748B)' }}>
                Dữ liệu sinh viên đủ điều kiện học kỳ Fall 2026 môn {activeCourse} đồng bộ từ hệ thống đào tạo FAP
              </span>
            </div>
          </div>

          {/* Action buttons: 3 công cụ chuẩn nghiệp vụ FAP */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* Nút 1: Tải lên file CSV / Excel chuẩn FAP */}
            <label
              style={{
                height: 38,
                padding: '0 16px',
                borderRadius: 10,
                border: 'none',
                backgroundColor: '#0F172A',
                color: '#FFFFFF',
                fontSize: '13px',
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
                height: 38,
                padding: '0 16px',
                borderRadius: 10,
                border: 'none',
                backgroundColor: '#F27024',
                color: '#FFFFFF',
                fontSize: '13px',
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
                height: 38,
                padding: '0 15px',
                borderRadius: 10,
                border: '1px solid rgba(0, 84, 166, 0.25)',
                backgroundColor: 'rgba(0, 84, 166, 0.08)',
                color: '#0054A6',
                fontSize: '13px',
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
              borderRadius: 10,
              backgroundColor: 'rgba(5, 150, 105, 0.08)',
              border: '1px solid rgba(5, 150, 105, 0.25)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '1rem',
            }}
          >
            <ShieldCheck size={18} color="#059669" />
            <span style={{ fontSize: '13px', color: '#059669', fontWeight: 600 }}>
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
                height: 38,
                paddingLeft: '2.25rem',
                paddingRight: '12px',
                borderRadius: 10,
                border: '1px solid var(--border-medium, #CBD5E1)',
                backgroundColor: 'var(--bg-subtle, #F8FAFC)',
                color: 'var(--text-main, #0F172A)',
                fontSize: '13px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ fontSize: '13px', color: 'var(--text-muted, #64748B)' }}>
            Hiển thị <strong style={{ color: 'var(--text-main, #0F172A)' }}>{filteredStudents.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} - {Math.min(currentPage * pageSize, filteredStudents.length)}</strong> trong tổng số <strong style={{ color: 'var(--text-main, #0F172A)' }}>{totalStudentsCount}</strong> sinh viên đủ điều kiện FAP
          </div>
        </div>

        {/* Student Table */}
        <div style={{ overflowX: 'auto', border: '1px solid var(--border-light, #E2E8F0)', borderRadius: 12 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
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
                      <span style={{ padding: '3px 8px', borderRadius: 6, fontSize: '12px', fontWeight: 700, backgroundColor: 'var(--bg-subtle, #F8FAFC)', border: '1px solid var(--border-light, #E2E8F0)', color: 'var(--text-main, #0F172A)' }}>
                        {st.classCode}
                      </span>
                    </td>
                    <td style={{ padding: '11px 14px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 9px', borderRadius: 999, fontSize: '11.5px', fontWeight: 700, backgroundColor: 'rgba(5, 150, 105, 0.12)', color: '#059669', border: '1px solid rgba(5, 150, 105, 0.25)' }}>
                        <Check size={13} /> Đã gửi mail khởi tạo
                      </span>
                    </td>
                    <td style={{ padding: '11px 14px' }}>
                      {st.profileCompleted ? (
                        <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: '11.5px', fontWeight: 700, backgroundColor: 'rgba(5, 150, 105, 0.12)', color: '#059669', border: '1px solid rgba(5, 150, 105, 0.25)' }}>
                          Đã hoàn tất
                        </span>
                      ) : (
                        <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: '11.5px', fontWeight: 700, backgroundColor: 'rgba(242, 112, 36, 0.12)', color: '#C2410C', border: '1px solid rgba(242, 112, 36, 0.25)' }}>
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
            <span style={{ fontSize: '13px', color: 'var(--text-muted, #64748B)' }}>
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
                  borderRadius: 8,
                  border: '1px solid var(--border-medium, #CBD5E1)',
                  backgroundColor: 'var(--bg-card, #FFFFFF)',
                  color: currentPage === 1 ? 'var(--text-light, #94A3B8)' : 'var(--text-main, #0F172A)',
                  fontSize: '13px',
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
                  borderRadius: 8,
                  border: '1px solid var(--border-medium, #CBD5E1)',
                  backgroundColor: 'var(--bg-card, #FFFFFF)',
                  color: currentPage === totalPages ? 'var(--text-light, #94A3B8)' : 'var(--text-main, #0F172A)',
                  fontSize: '13px',
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