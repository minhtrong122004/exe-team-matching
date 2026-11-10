import React, { useState } from 'react';
import {
  Users,
  Cpu,
  CheckCircle2,
  Lock,
  Sparkles,
  ArrowRight,
  Layers,
  Send,
} from '../../utils/icons';

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

interface DistributionPlan {
  priority1: {
    student: UnassignedStudent;
    targetRoom: string;
    reason: string;
    existingLeader: string;
  }[];
  priority2: {
    students: UnassignedStudent[];
    targetRoom: string;
    newLeader: UnassignedStudent;
    reason: string;
  };
}

const INITIAL_UNASSIGNED: UnassignedStudent[] = [
  {
    id: 'u-1',
    name: 'Nguyễn Văn Hoàng',
    studentCode: 'IB184201',
    major: 'Kinh doanh quốc tế (IB)',
    classCode: 'IB1801',
    skills: { tech: 35, management: 88, graphicDesign: 40, marketing: 75, sale: 80 },
  },
  {
    id: 'u-2',
    name: 'Lê Hồng Phong',
    studentCode: 'GD180332',
    major: 'Thiết kế mỹ thuật số (GD)',
    classCode: 'GD1801',
    skills: { tech: 45, management: 50, graphicDesign: 92, marketing: 60, sale: 40 },
  },
  {
    id: 'u-3',
    name: 'Phạm Thu Hà',
    studentCode: 'MKT180411',
    major: 'Digital Marketing (MKT)',
    classCode: 'MKT1802',
    skills: { tech: 30, management: 65, graphicDesign: 55, marketing: 90, sale: 85 },
  },
  {
    id: 'u-4',
    name: 'Đỗ Mạnh Tuấn',
    studentCode: 'SE180555',
    major: 'Kỹ thuật phần mềm (SE)',
    classCode: 'SE1803',
    skills: { tech: 95, management: 55, graphicDesign: 35, marketing: 40, sale: 30 },
  },
  {
    id: 'u-5',
    name: 'Ngô Phương Thảo',
    studentCode: 'IB180622',
    major: 'Kinh doanh quốc tế (IB)',
    classCode: 'IB1802',
    skills: { tech: 40, management: 70, graphicDesign: 45, marketing: 65, sale: 90 },
  },
  {
    id: 'u-6',
    name: 'Bùi Gia Huy',
    studentCode: 'SE180709',
    major: 'An toàn thông tin (IA)',
    classCode: 'SE1802',
    skills: { tech: 88, management: 60, graphicDesign: 30, marketing: 45, sale: 50 },
  },
  {
    id: 'u-7',
    name: 'Đặng Mai Linh',
    studentCode: 'MKT180801',
    major: 'Truyền thông đa phương tiện',
    classCode: 'MKT1801',
    skills: { tech: 40, management: 60, graphicDesign: 75, marketing: 85, sale: 65 },
  },
  {
    id: 'u-8',
    name: 'Phan Quốc Việt',
    studentCode: 'GD180912',
    major: 'Thiết kế đồ họa (GD)',
    classCode: 'GD1802',
    skills: { tech: 50, management: 52, graphicDesign: 86, marketing: 50, sale: 45 },
  },
];

const INITIAL_ROOMS_STATUS: IncompleteRoom[] = [
  { id: 'r-02', code: 'FA26EXE101-02', name: 'Phòng nhóm khởi nghiệp 02', currentCount: 2, maxCount: 5, leaderName: 'Trần Minh Quân', status: 'Incomplete', neededSkills: ['Graphic Design', 'Marketing'] },
  { id: 'r-04', code: 'FA26EXE101-04', name: 'Phòng nhóm khởi nghiệp 04', currentCount: 3, maxCount: 5, leaderName: 'Hoàng Đức Nam', status: 'Incomplete', neededSkills: ['Tech'] },
  { id: 'r-05', code: 'FA26EXE101-05', name: 'Phòng nhóm khởi nghiệp 05', currentCount: 4, maxCount: 5, leaderName: 'Vũ Thùy Linh', status: 'Incomplete', neededSkills: ['Sale'] },
  { id: 'r-09', code: 'FA26EXE101-09', name: 'Phòng nhóm khởi nghiệp 09', currentCount: 0, maxCount: 5, leaderName: '(Chưa có)', status: 'Empty', neededSkills: ['Đang trống 100%'] },
  { id: 'r-10', code: 'FA26EXE101-10', name: 'Phòng nhóm khởi nghiệp 10', currentCount: 0, maxCount: 5, leaderName: '(Chưa có)', status: 'Empty', neededSkills: ['Đang trống 100%'] },
  { id: 'r-11', code: 'FA26EXE101-11', name: 'Phòng nhóm khởi nghiệp 11', currentCount: 0, maxCount: 5, leaderName: '(Chưa có)', status: 'Empty', neededSkills: ['Đang trống 100%'] },
  { id: 'r-12', code: 'FA26EXE101-12', name: 'Phòng nhóm khởi nghiệp 12', currentCount: 0, maxCount: 5, leaderName: '(Chưa có)', status: 'Empty', neededSkills: ['Đang trống 100%'] },
];

export const ModeratorDistributionPage: React.FC = () => {
  const [unassignedList, setUnassignedList] = useState<UnassignedStudent[]>(INITIAL_UNASSIGNED);
  const [roomsList, setRoomsList] = useState<IncompleteRoom[]>(INITIAL_ROOMS_STATUS);

  // 3-step state
  const [planGenerated, setPlanGenerated] = useState<boolean>(false);
  const [executed, setExecuted] = useState<boolean>(false);
  const [isSemesterLocked, setIsSemesterLocked] = useState<boolean>(false);

  // Notification Toast
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Generated Plan
  const previewPlan: DistributionPlan = {
    priority1: [
      {
        student: unassignedList.find((s) => s.studentCode === 'GD180332') || unassignedList[1],
        targetRoom: 'FA26EXE101-02',
        reason: 'Lấp đầy phòng 2/5; Bổ sung chuyên sâu Thiết kế đồ họa (GD: 92/100) để cân bằng kỹ năng.',
        existingLeader: 'Trần Minh Quân (SE185108) — Giữ nguyên quyền Trưởng nhóm',
      },
      {
        student: unassignedList.find((s) => s.studentCode === 'MKT180411') || unassignedList[2],
        targetRoom: 'FA26EXE101-02',
        reason: 'Lấp đầy phòng lên 4/5; Bổ sung chuyên ngành Digital Marketing (MKT: 90/100).',
        existingLeader: 'Trần Minh Quân (SE185108) — Giữ nguyên quyền Trưởng nhóm',
      },
      {
        student: unassignedList.find((s) => s.studentCode === 'SE180555') || unassignedList[3],
        targetRoom: 'FA26EXE101-04',
        reason: 'Lấp đầy phòng 3/5 lên 4/5; Bổ sung năng lực Kỹ thuật cốt lõi (Tech: 95/100).',
        existingLeader: 'Hoàng Đức Nam (SE181033) — Giữ nguyên quyền Trưởng nhóm',
      },
      {
        student: unassignedList.find((s) => s.studentCode === 'IB180622') || unassignedList[4],
        targetRoom: 'FA26EXE101-05',
        reason: 'Lấp đầy phòng 4/5 lên 5/5 (Đạt tối đa); Bổ sung năng lực Kinh doanh & Bán hàng (Sale: 90/100).',
        existingLeader: 'Vũ Thùy Linh (MKT181155) — Giữ nguyên quyền Trưởng nhóm',
      },
    ],
    priority2: {
      targetRoom: 'FA26EXE101-09',
      students: [
        unassignedList.find((s) => s.studentCode === 'IB184201') || unassignedList[0],
        unassignedList.find((s) => s.studentCode === 'SE180709') || unassignedList[5],
        unassignedList.find((s) => s.studentCode === 'MKT180801') || unassignedList[6],
        unassignedList.find((s) => s.studentCode === 'GD180912') || unassignedList[7],
      ],
      newLeader: unassignedList.find((s) => s.studentCode === 'IB184201') || unassignedList[0],
      reason: 'Gom 4 sinh viên còn lại vào phòng trống FA26EXE101-09 tạo thành một nhóm đa ngành hoàn chỉnh (IB + SE + MKT + GD). Tự động chỉ định sinh viên có chỉ số Quản lý cao nhất làm Trưởng nhóm mới.',
    },
  };

  // Step 1: Run Algorithm Preview
  const handleRunAlgorithm = () => {
    setPlanGenerated(true);
    setToastMsg('Đã kết nối gRPC Matching Service và tính toán phương án phân bổ tối ưu nhất!');
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Step 2: Confirm Execution
  const handleConfirmExecution = () => {
    setExecuted(true);
    setUnassignedList([]);
    setRoomsList((prev) =>
      prev.map((r) => {
        if (r.code === 'FA26EXE101-02') return { ...r, currentCount: 4, neededSkills: ['Đã đủ cơ cấu'] };
        if (r.code === 'FA26EXE101-04') return { ...r, currentCount: 4, neededSkills: ['Đã đủ cơ cấu'] };
        if (r.code === 'FA26EXE101-05') return { ...r, currentCount: 5, neededSkills: ['Đã đủ 5/5'] };
        if (r.code === 'FA26EXE101-09') return { ...r, currentCount: 4, leaderName: 'Nguyễn Văn Hoàng', status: 'Incomplete', neededSkills: ['Nhóm mới tạo'] };
        return r;
      })
    );
    setToastMsg('Đã thực thi phân phối thành công! Email thông báo kết quả ghép nhóm đã được gửi tới 8 sinh viên.');
    setTimeout(() => setToastMsg(null), 4000);
  };

  // Step 3: Lock Semester
  const handleLockSemester = () => {
    setIsSemesterLocked(true);
    setToastMsg('Đã chốt sổ và khóa danh sách nhóm toàn học kỳ! Tất cả đơn chờ đã tự động bị từ chối.');
    setTimeout(() => setToastMsg(null), 4000);
  };

  return (
    <div style={{ padding: '0 0 3rem 0', maxWidth: 1560, margin: '0 auto' }}>
      {/* Toast */}
      {toastMsg && (
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
          <span>{toastMsg}</span>
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
          <span style={{ color: '#334155', fontWeight: 600 }}>Điều phối sinh viên lẻ & Chốt sổ</span>
        </div>
        <h1 style={{ fontSize: '24px', fontWeight: 650, color: '#0F172A', margin: '0 0 4px 0', letterSpacing: '-0.02em' }}>
          Điều phối Sinh viên lẻ & Chốt sổ Học kỳ
        </h1>
        <p style={{ color: '#64748B', fontSize: '14.5px', margin: 0, lineHeight: 1.5 }}>
          Tự động phân bổ sinh viên chưa có nhóm vào các phòng còn thiếu hoặc tạo nhóm mới tối ưu theo 5 chỉ số năng lực, sau đó chốt sổ học kỳ.
        </p>
      </div>

      {/* Semester Locked Banner */}
      {isSemesterLocked && (
        <div
          style={{
            padding: '20px 26px',
            borderRadius: 18,
            backgroundColor: 'rgba(5, 150, 105, 0.1)',
            border: '1px solid rgba(5, 150, 105, 0.3)',
            marginBottom: '1.75rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#059669', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Lock size={20} />
            </div>
            <div>
              <h4 style={{ fontSize: '17px', fontWeight: 800, color: '#059669', margin: 0 }}>
                Học kỳ Fall 2026 • EXE101 đã được Chốt sổ Chính thức
              </h4>
              <p style={{ fontSize: '15px', color: 'var(--text-secondary, #475569)', margin: '2px 0 0 0' }}>
                Toàn bộ sinh viên đã được ghép vào nhóm hợp lệ. Quyền tự ý rời nhóm bị vô hiệu hóa; mọi điều chuyển sau thời điểm này đều phải qua quy trình xét duyệt của Điều phối viên.
              </p>
            </div>
          </div>
          <span style={{ padding: '9px 18px', borderRadius: 999, backgroundColor: '#059669', color: '#FFFFFF', fontWeight: 700, fontSize: '14px' }}>
            ĐÃ KHÓA SỔ
          </span>
        </div>
      )}

      {/* 3-Step Coordination Action Toolbar */}
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
          <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-main, #0F172A)', margin: 0 }}>
            Quy trình 3 Bước Điều phối Tự động & Khóa sổ
          </h3>
          <span style={{ fontSize: '14px', color: 'var(--text-muted, #64748B)' }}>
            Thực hiện tuần tự các bước sau khi kết thúc thời hạn đăng ký tự nguyện
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
          {/* Nút 1: Chạy thuật toán xem trước */}
          <button
            type="button"
            onClick={handleRunAlgorithm}
            disabled={executed || isSemesterLocked}
            style={{
              padding: '14px 16px',
              borderRadius: 12,
              border: planGenerated ? '2px solid #0054A6' : '1px solid var(--border-medium, #CBD5E1)',
              backgroundColor: planGenerated ? 'rgba(0, 84, 166, 0.08)' : 'var(--bg-card, #FFFFFF)',
              color: planGenerated ? '#0054A6' : 'var(--text-main, #0F172A)',
              cursor: executed || isSemesterLocked ? 'not-allowed' : 'pointer',
              opacity: executed || isSemesterLocked ? 0.6 : 1,
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              transition: 'all 0.15s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '16px', fontWeight: 800 }}>
                Bước 1: Chạy thuật toán Ghép nhóm Tự động
              </span>
              <Cpu size={18} color="#0054A6" />
            </div>
            <span style={{ fontSize: '14px', color: 'var(--text-muted, #64748B)' }}>
              (Xem trước phương án từ gRPC Matching Service)
            </span>
          </button>

          {/* Nút 2: Xác nhận thực thi */}
          <button
            type="button"
            onClick={handleConfirmExecution}
            disabled={!planGenerated || executed || isSemesterLocked}
            style={{
              padding: '14px 16px',
              borderRadius: 12,
              border: executed ? '2px solid #059669' : '1px solid var(--border-medium, #CBD5E1)',
              backgroundColor: executed ? 'rgba(5, 150, 105, 0.08)' : 'var(--bg-card, #FFFFFF)',
              color: executed ? '#059669' : 'var(--text-main, #0F172A)',
              cursor: !planGenerated || executed || isSemesterLocked ? 'not-allowed' : 'pointer',
              opacity: !planGenerated || executed || isSemesterLocked ? 0.6 : 1,
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              transition: 'all 0.15s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '16px', fontWeight: 800 }}>
                Bước 2: Xác nhận Thực thi Phân phối
              </span>
              <Send size={18} color="#059669" />
            </div>
            <span style={{ fontSize: '14px', color: 'var(--text-muted, #64748B)' }}>
              Áp dụng phương án và gửi thông báo kết quả cho sinh viên
            </span>
          </button>

          {/* Nút 3: Chốt sổ & Khóa danh sách */}
          <button
            type="button"
            onClick={handleLockSemester}
            disabled={!executed || isSemesterLocked}
            style={{
              padding: '14px 16px',
              borderRadius: 12,
              border: isSemesterLocked ? '2px solid #D97706' : '1px solid var(--border-medium, #CBD5E1)',
              backgroundColor: isSemesterLocked ? 'rgba(217, 119, 6, 0.08)' : 'var(--bg-card, #FFFFFF)',
              color: isSemesterLocked ? '#D97706' : 'var(--text-main, #0F172A)',
              cursor: !executed || isSemesterLocked ? 'not-allowed' : 'pointer',
              opacity: !executed || isSemesterLocked ? 0.6 : 1,
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              transition: 'all 0.15s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '16px', fontWeight: 800 }}>
                Bước 3: Chốt sổ & Khóa danh sách toàn kỳ
              </span>
              <Lock size={18} color="#D97706" />
            </div>
            <span style={{ fontSize: '14px', color: 'var(--text-muted, #64748B)' }}>
              Khóa tự ý rời nhóm & tự động từ chối mọi đơn ứng tuyển tồn đọng
            </span>
          </button>
        </div>
      </div>

      {/* Hiển thị Bảng Phương án Phân bổ Thông minh (Từ gRPC Matching Service) khi bấm Bước 1 */}
      {planGenerated && (
        <div
          style={{
            backgroundColor: 'var(--bg-card, #FFFFFF)',
            border: '2px solid #0054A6',
            borderRadius: '20px',
            padding: '22px',
            marginBottom: '1.75rem',
            boxShadow: '0 4px 16px rgba(0, 84, 166, 0.08)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <div style={{ width: 34, height: 34, borderRadius: 12, backgroundColor: '#0054A6', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sparkles size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0054A6', margin: 0 }}>
                Phương án Phân bổ Thông minh (Được đề xuất từ gRPC Matching Service)
              </h3>
              <span style={{ fontSize: '15px', color: 'var(--text-muted, #64748B)' }}>
                Thuật toán tối ưu hóa đa mục tiêu: Cân bằng 5 kỹ năng + Đa dạng chuyên ngành + Bảo toàn Trưởng nhóm hiện hữu
              </span>
            </div>
          </div>

          {/* NHÓM ƯU TIÊN 1 */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: '14px', fontWeight: 800, backgroundColor: 'rgba(0, 84, 166, 0.12)', color: '#0054A6' }}>
                ƯU TIÊN 1
              </span>
              <strong style={{ fontSize: '16px', color: 'var(--text-main, #0F172A)' }}>
                Lấp đầy các phòng đang thiếu người từ 1–4/5 thành viên trước:
              </strong>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {previewPlan.priority1.map((p, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '12px 16px',
                    borderRadius: 12,
                    backgroundColor: 'var(--bg-subtle, #F8FAFC)',
                    border: '1px solid var(--border-light, #E2E8F0)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: 28, height: 28, borderRadius: 999, backgroundColor: '#0054A6', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '14px' }}>
                      {idx + 1}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-main, #0F172A)' }}>
                        {p.student.name} ({p.student.studentCode} • {p.student.major})
                      </div>
                      <div style={{ fontSize: '14px', color: 'var(--text-muted, #64748B)' }}>
                        {p.reason}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <ArrowRight size={16} color="var(--text-light, #94A3B8)" />
                    <span style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 800, fontSize: '15px', color: '#0054A6', backgroundColor: '#EFF6FF', padding: '3px 8px', borderRadius: 6, border: '1px solid #BFDBFE' }}>
                      {p.targetRoom}
                    </span>
                    <span style={{ fontSize: '13px', color: '#059669', fontWeight: 600, backgroundColor: 'rgba(5, 150, 105, 0.1)', padding: '3px 8px', borderRadius: 6 }}>
                      {p.existingLeader}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* NHÓM ƯU TIÊN 2 */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: '14px', fontWeight: 800, backgroundColor: 'rgba(242, 112, 36, 0.12)', color: 'var(--accent-color, #F26F21)' }}>
                ƯU TIÊN 2
              </span>
              <strong style={{ fontSize: '16px', color: 'var(--text-main, #0F172A)' }}>
                Tạo nhóm mới từ các phòng trống cho số sinh viên lẻ còn dư:
              </strong>
            </div>

            <div
              style={{
                padding: '16px',
                borderRadius: 12,
                backgroundColor: 'rgba(242, 112, 36, 0.05)',
                border: '1px solid rgba(242, 112, 36, 0.25)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700, fontSize: '14px', color: '#334155', backgroundColor: '#FFFFFF', padding: '3px 9px', borderRadius: 6, border: '1px solid #E2E8F0' }}>
                    {previewPlan.priority2.targetRoom}
                  </span>
                  <span style={{ fontSize: '15px', fontWeight: 650, color: '#0F172A' }}>
                    Nhóm khởi nghiệp mới (4 thành viên)
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', padding: '4px 10px', borderRadius: 8 }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                    Trưởng nhóm đề xuất (Quản lý: {previewPlan.priority2.newLeader.skills.management}/100): <strong style={{ color: '#0F172A' }}>{previewPlan.priority2.newLeader.name}</strong> ({previewPlan.priority2.newLeader.studentCode})
                  </span>
                </div>
              </div>

              <p style={{ fontSize: '14px', color: 'var(--text-muted, #64748B)', margin: '0 0 12px 0' }}>
                {previewPlan.priority2.reason}
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px' }}>
                {previewPlan.priority2.students.map((st) => (
                  <div
                    key={st.id}
                    style={{
                      padding: '8px 10px',
                      borderRadius: 10,
                      backgroundColor: 'var(--bg-card, #FFFFFF)',
                      border: '1px solid var(--border-light, #E2E8F0)',
                      fontSize: '14px',
                    }}
                  >
                    <div style={{ fontWeight: 650, color: 'var(--text-main, #0F172A)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>{st.name}</span>
                      {st.studentCode === previewPlan.priority2.newLeader.studentCode && (
                        <span style={{ fontSize: '11px', fontWeight: 600, padding: '1px 6px', borderRadius: 5, backgroundColor: '#F1F5F9', border: '1px solid #E2E8F0', color: '#334155' }}>
                          Trưởng nhóm
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted, #64748B)' }}>
                      {st.studentCode} • {st.major}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2-Column Split: Sinh viên lẻ vs Phòng thiếu */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: '1.5rem' }}>
        {/* CỘT TRÁI: Sinh viên chưa có nhóm */}
        <div
          style={{
            backgroundColor: 'var(--bg-card, #FFFFFF)',
            border: '1px solid var(--border-light, #E2E8F0)',
            borderRadius: '20px',
            padding: '26px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(239, 68, 68, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#EF4444' }}>
                <Users size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-main, #0F172A)', margin: 0 }}>
                  Sinh viên Chưa có Nhóm ({unassignedList.length} bạn)
                </h3>
                <span style={{ fontSize: '14px', color: 'var(--text-muted, #64748B)' }}>
                  Hết hạn đăng ký nhưng chưa tham gia phòng nào
                </span>
              </div>
            </div>

            <span
              style={{
                padding: '3px 10px',
                borderRadius: 999,
                fontSize: '14px',
                fontWeight: 700,
                backgroundColor: unassignedList.length === 0 ? 'rgba(5, 150, 105, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                color: unassignedList.length === 0 ? '#059669' : '#EF4444',
              }}
            >
              {unassignedList.length === 0 ? 'Đã ghép 100%' : `${unassignedList.length} sinh viên chờ`}
            </span>
          </div>

          {unassignedList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px 20px', color: '#059669' }}>
              <CheckCircle2 size={40} style={{ margin: '0 auto 10px auto' }} />
              <div style={{ fontWeight: 800, fontSize: '17px' }}>Tất cả sinh viên đã được ghép nhóm thành công!</div>
              <p style={{ fontSize: '15px', color: 'var(--text-muted, #64748B)', margin: '4px 0 0 0' }}>
                Không còn sinh viên nào bị lẻ trong học kỳ này.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '520px', overflowY: 'auto' }}>
              {unassignedList.map((st) => (
                <div
                  key={st.id}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 12,
                    backgroundColor: 'var(--bg-subtle, #F8FAFC)',
                    border: '1px solid var(--border-light, #E2E8F0)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <div>
                      <span style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-main, #0F172A)' }}>
                        {st.name}
                      </span>
                      <span style={{ marginLeft: '6px', fontFamily: 'var(--font-mono, monospace)', fontSize: '14px', color: '#475569' }}>
                        {st.studentCode}
                      </span>
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted, #64748B)', backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', padding: '2px 8px', borderRadius: 4 }}>
                      Lớp {st.classCode}
                    </span>
                  </div>

                  <div style={{ fontSize: '14px', color: 'var(--text-secondary, #475569)', marginBottom: '8px' }}>
                    {st.major}
                  </div>

                  {/* 5 Skills Badges */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', fontVariantNumeric: 'tabular-nums' }}>
                    <span style={{ fontSize: '12.5px', padding: '2px 7px', borderRadius: 5, backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', color: '#334155', fontWeight: 600 }}>
                      Tech: <strong style={{ color: '#0F172A' }}>{st.skills.tech}</strong>
                    </span>
                    <span style={{ fontSize: '12.5px', padding: '2px 7px', borderRadius: 5, backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', color: '#334155', fontWeight: 600 }}>
                      Mgt: <strong style={{ color: '#0F172A' }}>{st.skills.management}</strong>
                    </span>
                    <span style={{ fontSize: '12.5px', padding: '2px 7px', borderRadius: 5, backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', color: '#334155', fontWeight: 600 }}>
                      GD: <strong style={{ color: '#0F172A' }}>{st.skills.graphicDesign}</strong>
                    </span>
                    <span style={{ fontSize: '12.5px', padding: '2px 7px', borderRadius: 5, backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', color: '#334155', fontWeight: 600 }}>
                      MKT: <strong style={{ color: '#0F172A' }}>{st.skills.marketing}</strong>
                    </span>
                    <span style={{ fontSize: '12.5px', padding: '2px 7px', borderRadius: 5, backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', color: '#334155', fontWeight: 600 }}>
                      Sale: <strong style={{ color: '#0F172A' }}>{st.skills.sale}</strong>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CỘT PHẢI: Phòng chưa đủ sĩ số & Phòng trống */}
        <div
          style={{
            backgroundColor: 'var(--bg-card, #FFFFFF)',
            border: '1px solid var(--border-light, #E2E8F0)',
            borderRadius: '20px',
            padding: '26px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: '#F1F5F9', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0F172A' }}>
                <Layers size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-main, #0F172A)', margin: 0 }}>
                  Hiện trạng Các Phòng Trong Môn ({roomsList.length} phòng)
                </h3>
                <span style={{ fontSize: '14px', color: 'var(--text-muted, #64748B)' }}>
                  Phòng chưa đủ sĩ số (1-4/5) và các phòng trống (0/5)
                </span>
              </div>
            </div>

            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-muted, #64748B)' }}>
              Cần điều phối
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '520px', overflowY: 'auto' }}>
            {roomsList.map((room) => (
              <div
                key={room.id}
                style={{
                  padding: '12px 14px',
                  borderRadius: 12,
                  backgroundColor: 'var(--bg-subtle, #F8FAFC)',
                  border: '1px solid var(--border-light, #E2E8F0)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '8px',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700, fontSize: '15px', color: '#0F172A' }}>
                      {room.code}
                    </span>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: 999,
                        fontSize: '13px',
                        fontWeight: 600,
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        color: room.currentCount === 0 ? '#64748B' : '#0F172A',
                      }}
                    >
                      {room.currentCount}/{room.maxCount} thành viên
                    </span>
                  </div>

                  <div style={{ fontSize: '14px', color: 'var(--text-muted, #64748B)' }}>
                    Trưởng nhóm: <strong style={{ color: 'var(--text-main, #0F172A)' }}>{room.leaderName}</strong>
                  </div>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {room.neededSkills.map((sk, idx) => (
                    <span
                      key={idx}
                      style={{
                        fontSize: '12.5px',
                        padding: '2px 8px',
                        borderRadius: 999,
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        color: '#334155',
                        fontWeight: 600,
                      }}
                    >
                      {sk}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
export default ModeratorDistributionPage;