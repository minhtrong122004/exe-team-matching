import React, { useState } from 'react';
import {
  ArrowLeftRight,
  CheckCircle2,
  XCircle,
  UserCheck,
  Send,
  Users,
} from 'lucide-react';

interface StudentTransferRequest {
  id: string;
  type: 'ONE_WAY' | 'SWAP';
  studentName: string;
  studentCode: string;
  major: string;
  currentRoom: string;
  currentCount: number;
  targetRoom: string;
  targetCount: number;
  swapWithStudent?: {
    name: string;
    studentCode: string;
    major: string;
  };
  reason: string;
  submittedAt: string;
  status: 'Pending' | 'Approved' | 'Rejected';
}

const INITIAL_REQUESTS: StudentTransferRequest[] = [
  {
    id: 'req-01',
    type: 'SWAP',
    studentName: 'Nguyễn Đức Anh',
    studentCode: 'SE180201',
    major: 'Kỹ thuật phần mềm (SE)',
    currentRoom: 'FA26EXE101-03',
    currentCount: 4,
    targetRoom: 'FA26EXE101-06',
    targetCount: 4,
    swapWithStudent: {
      name: 'Trần Quang Huy',
      studentCode: 'SE180302',
      major: 'Trí tuệ nhân tạo (AI)',
    },
    reason: 'Hai sinh viên thỏa thuận đổi chéo để phù hợp hơn với định hướng đề tài Computer Vision tại phòng 03 và IoT tại phòng 06.',
    submittedAt: '09:15 • 09/11/2026',
    status: 'Pending',
  },
  {
    id: 'req-02',
    type: 'ONE_WAY',
    studentName: 'Lê Quốc Bảo',
    studentCode: 'MKT180512',
    major: 'Digital Marketing (MKT)',
    currentRoom: 'FA26EXE101-05',
    currentCount: 5,
    targetRoom: 'FA26EXE101-02',
    targetCount: 4,
    reason: 'Nhóm 05 đã đủ 5 người và bạn có thế mạnh hỗ trợ truyền thông thương mại điện tử phù hợp dự án của nhóm 02 (hiện có 4 người).',
    submittedAt: '10:30 • 09/11/2026',
    status: 'Pending',
  },
  {
    id: 'req-03',
    type: 'SWAP',
    studentName: 'Phạm Mai Anh',
    studentCode: 'GD180399',
    major: 'Thiết kế mỹ thuật số (GD)',
    currentRoom: 'FA26EXE101-01',
    currentCount: 3,
    targetRoom: 'FA26EXE101-04',
    targetCount: 4,
    swapWithStudent: {
      name: 'Vũ Thanh Tùng',
      studentCode: 'GD180410',
      major: 'Thiết kế mỹ thuật số (GD)',
    },
    reason: 'Đổi chéo 1-1 giữa 2 bạn cùng chuyên ngành đồ họa do trùng lịch thực tập doanh nghiệp ngoài giờ học.',
    submittedAt: '11:45 • 09/11/2026',
    status: 'Pending',
  },
];

export const ModeratorTransfersPage: React.FC = () => {
  const [requests, setRequests] = useState<StudentTransferRequest[]>(INITIAL_REQUESTS);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Direct Transfer Tool State
  const [sourceRoom, setSourceRoom] = useState<string>('FA26EXE101-05');
  const [selectedStudent, setSelectedStudent] = useState<string>('user-leader');
  const [transferType, setTransferType] = useState<'ONE_WAY' | 'SWAP'>('ONE_WAY');
  const [targetRoom, setTargetRoom] = useState<string>('FA26EXE101-02');
  const [swapTargetStudent, setSwapTargetStudent] = useState<string>('target-user-01');

  // Logic constraint: if source room only has 3 members, force swap
  const sourceRoomCount = sourceRoom === 'FA26EXE101-01' ? 3 : 5;
  const isOneWayDisabled = sourceRoomCount <= 3;

  // Handlers for Student Requests
  const handleApproveRequest = (id: string) => {
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: 'Approved' } : r))
    );
    setToastMsg('Đã phê duyệt yêu cầu điều chuyển thành công! Danh sách 2 nhóm đã được cập nhật.');
    setTimeout(() => setToastMsg(null), 3500);
  };

  const handleRejectRequest = (id: string) => {
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: 'Rejected' } : r))
    );
    setToastMsg('Đã từ chối yêu cầu điều chuyển.');
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Direct Transfer Execution
  const handleExecuteDirectTransfer = () => {
    setToastMsg(`Đã thực thi điều chuyển trực tiếp ${transferType === 'ONE_WAY' ? '1 chiều' : 'đổi chéo 1-1'} giữa ${sourceRoom} và ${targetRoom} thành công!`);
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

      {/* Header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 12,
              backgroundColor: 'rgba(242, 112, 36, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#F27024',
            }}
          >
            <ArrowLeftRight size={20} />
          </div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main, #0F172A)', margin: 0 }}>
            Quản lý Chuyển nhóm & Đổi chéo sau Chốt sổ
          </h1>
        </div>
        <p style={{ color: 'var(--text-muted, #64748B)', fontSize: '1.025rem', margin: 0, lineHeight: 1.5 }}>
          Xử lý các đề xuất xin chuyển nhóm của sinh viên và công cụ điều chuyển cưỡng bức của Điều phối viên sau khi học kỳ đã chốt sổ.
        </p>
      </div>

      {/* KHU VỰC 1: Duyệt yêu cầu từ Sinh viên */}
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(0, 84, 166, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0054A6' }}>
              <Users size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-main, #0F172A)', margin: 0 }}>
                Khu vực 1: Danh sách Đơn xin Chuyển nhóm từ Sinh viên ({requests.filter(r => r.status === 'Pending').length} đơn chờ duyệt)
              </h3>
              <span style={{ fontSize: '14px', color: 'var(--text-muted, #64748B)' }}>
                Các đơn do sinh viên nộp sau thời điểm chốt sổ học kỳ kèm lý do chính đáng
              </span>
            </div>
          </div>
        </div>

        {/* Request List Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {requests.map((req) => (
            <div
              key={req.id}
              style={{
                padding: '16px',
                borderRadius: 12,
                backgroundColor: 'var(--bg-subtle, #F8FAFC)',
                border: '1px solid var(--border-light, #E2E8F0)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '16px',
              }}
            >
              <div style={{ flex: 1, minWidth: 320 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span
                    style={{
                      padding: '3px 8px',
                      borderRadius: 6,
                      fontSize: '13px',
                      fontWeight: 800,
                      backgroundColor: req.type === 'SWAP' ? 'rgba(0, 84, 166, 0.12)' : 'rgba(242, 112, 36, 0.12)',
                      color: req.type === 'SWAP' ? '#0054A6' : '#F27024',
                    }}
                  >
                    {req.type === 'SWAP' ? 'ĐỔI CHÉO 1-1 (SWAP)' : 'CHUYỂN 1 CHIỀU'}
                  </span>
                  <span style={{ fontSize: '14px', color: 'var(--text-muted, #64748B)' }}>
                    Gửi lúc: {req.submittedAt}
                  </span>
                </div>

                <div style={{ fontWeight: 700, fontSize: '16px', color: 'var(--text-main, #0F172A)', marginBottom: '4px' }}>
                  {req.studentName} ({req.studentCode} • {req.major})
                </div>

                {/* Transfer route */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', margin: '6px 0' }}>
                  <span style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700, color: '#0054A6', backgroundColor: '#EFF6FF', padding: '2px 6px', borderRadius: 4 }}>
                    {req.currentRoom} ({req.currentCount}/5)
                  </span>
                  <ArrowLeftRight size={14} color="var(--text-light, #94A3B8)" />
                  <span style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700, color: '#059669', backgroundColor: '#ECFDF5', padding: '2px 6px', borderRadius: 4 }}>
                    {req.targetRoom} ({req.targetCount}/5)
                  </span>
                  {req.swapWithStudent && (
                    <span style={{ fontSize: '14px', color: 'var(--text-secondary, #475569)' }}>
                      • Đổi với: <strong>{req.swapWithStudent.name}</strong> ({req.swapWithStudent.studentCode})
                    </span>
                  )}
                </div>

                <div style={{ fontSize: '14px', color: 'var(--text-muted, #64748B)', backgroundColor: 'var(--bg-card, #FFFFFF)', padding: '10px 14px', borderRadius: 6, border: '1px solid var(--border-subtle, #F1F5F9)' }}>
                  Lý do: <em>"{req.reason}"</em>
                </div>
              </div>

              {/* Status or Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {req.status === 'Pending' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => handleApproveRequest(req.id)}
                      style={{
                        height: 36,
                        padding: '0 16px',
                        borderRadius: 10,
                        backgroundColor: '#059669',
                        color: '#FFFFFF',
                        border: 'none',
                        fontSize: '15px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <CheckCircle2 size={16} />
                      Chấp thuận
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRejectRequest(req.id)}
                      style={{
                        height: 36,
                        padding: '0 14px',
                        borderRadius: 10,
                        backgroundColor: 'var(--bg-card, #FFFFFF)',
                        color: '#DC2626',
                        border: '1px solid #FCA5A5',
                        fontSize: '15px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <XCircle size={16} />
                      Từ chối
                    </button>
                  </>
                ) : req.status === 'Approved' ? (
                  <span style={{ padding: '6px 12px', borderRadius: 10, backgroundColor: 'rgba(5, 150, 105, 0.12)', color: '#059669', fontWeight: 700, fontSize: '14px' }}>
                    ✓ Đã chấp thuận
                  </span>
                ) : (
                  <span style={{ padding: '6px 12px', borderRadius: 10, backgroundColor: 'rgba(239, 68, 68, 0.12)', color: '#DC2626', fontWeight: 700, fontSize: '14px' }}>
                    ✕ Đã từ chối
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* KHU VỰC 2: Công cụ Điều chuyển Trực tiếp của Điều phối viên */}
      <div
        style={{
          backgroundColor: 'var(--bg-card, #FFFFFF)',
          border: '1px solid var(--border-light, #E2E8F0)',
          borderRadius: '20px',
          padding: '26px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(242, 112, 36, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F27024' }}>
            <UserCheck size={18} />
          </div>
          <div>
            <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-main, #0F172A)', margin: 0 }}>
              Khu vực 2: Công cụ Điều chuyển Cưỡng bức Trực tiếp (Direct Transfer Tool)
            </h3>
            <span style={{ fontSize: '14px', color: 'var(--text-muted, #64748B)' }}>
              Điều phối viên can thiệp trực tiếp để chuyển hoặc hoán đổi vị trí thành viên giữa 2 nhóm bất kỳ
            </span>
          </div>
        </div>

        {/* Warning & Rules Banner */}
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 12,
            backgroundColor: 'rgba(0, 84, 166, 0.05)',
            border: '1px solid rgba(0, 84, 166, 0.2)',
            marginBottom: '1.25rem',
            fontSize: '14px',
            color: 'var(--text-secondary, #475569)',
            lineHeight: 1.5,
          }}
        >
          <strong>Quy tắc ràng buộc chuyển nhóm:</strong>
          <ul style={{ margin: '4px 0 0 0', paddingLeft: '20px' }}>
            <li>Nếu nhóm nguồn chỉ có đúng 3 thành viên, bắt buộc phải chọn <strong>Đổi chéo (Swap 1-1)</strong> để không làm nhóm nguồn bị tụt xuống dưới ngưỡng 3 người.</li>
            <li>Nếu sinh viên được chọn là <strong>Trưởng nhóm</strong> của nhóm nguồn, hệ thống sẽ tự động chỉ định thành viên tham gia sớm nhất kế tiếp lên làm Trưởng nhóm mới.</li>
          </ul>
        </div>

        {/* Direct Form Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px', marginBottom: '1.25rem' }}>
          {/* 1. Chọn Nhóm nguồn */}
          <div>
            <label style={{ display: 'block', fontSize: '15px', fontWeight: 600, color: 'var(--text-main, #0F172A)', marginBottom: '4px' }}>
              1. Nhóm nguồn (Source Group):
            </label>
            <select
              value={sourceRoom}
              onChange={(e) => setSourceRoom(e.target.value)}
              style={{
                width: '100%',
                height: 44,
                padding: '0 10px',
                borderRadius: 10,
                border: '1px solid var(--border-medium, #CBD5E1)',
                backgroundColor: 'var(--bg-input, #FFFFFF)',
                fontSize: '15px',
                color: 'var(--text-main, #0F172A)',
                outline: 'none',
              }}
            >
              <option value="FA26EXE101-05">FA26EXE101-05 (5/5 thành viên)</option>
              <option value="FA26EXE101-01">FA26EXE101-01 (3/5 thành viên - Chỉ hỗ trợ Swap)</option>
              <option value="FA26EXE101-03">FA26EXE101-03 (4/5 thành viên)</option>
            </select>
          </div>

          {/* 2. Chọn Sinh viên cần chuyển */}
          <div>
            <label style={{ display: 'block', fontSize: '15px', fontWeight: 600, color: 'var(--text-main, #0F172A)', marginBottom: '4px' }}>
              2. Sinh viên cần chuyển đi:
            </label>
            <select
              value={selectedStudent}
              onChange={(e) => setSelectedStudent(e.target.value)}
              style={{
                width: '100%',
                height: 44,
                padding: '0 10px',
                borderRadius: 10,
                border: '1px solid var(--border-medium, #CBD5E1)',
                backgroundColor: 'var(--bg-input, #FFFFFF)',
                fontSize: '15px',
                color: 'var(--text-main, #0F172A)',
                outline: 'none',
              }}
            >
              <option value="user-leader">Vũ Thùy Linh (MKT181155) — [Trưởng nhóm]</option>
              <option value="user-02">Bùi Gia Huy (SE180709) — [Thành viên]</option>
              <option value="user-03">Ngô Phương Thảo (IB180622) — [Thành viên]</option>
            </select>
            {selectedStudent === 'user-leader' && (
              <span style={{ display: 'block', fontSize: '13px', color: '#D97706', marginTop: '4px', fontWeight: 600 }}>
                👑 Sinh viên này là Trưởng nhóm: Bạn kế tiếp sẽ tự động kế nhiệm làm Trưởng nhóm mới.
              </span>
            )}
          </div>

          {/* 3. Loại thao tác điều chuyển */}
          <div>
            <label style={{ display: 'block', fontSize: '15px', fontWeight: 600, color: 'var(--text-main, #0F172A)', marginBottom: '4px' }}>
              3. Loại hình chuyển:
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                disabled={isOneWayDisabled}
                onClick={() => setTransferType('ONE_WAY')}
                style={{
                  flex: 1,
                  height: 44,
                  borderRadius: 10,
                  fontSize: '14px',
                  fontWeight: 700,
                  cursor: isOneWayDisabled ? 'not-allowed' : 'pointer',
                  opacity: isOneWayDisabled ? 0.4 : 1,
                  border: transferType === 'ONE_WAY' ? '2px solid #F27024' : '1px solid var(--border-medium, #CBD5E1)',
                  backgroundColor: transferType === 'ONE_WAY' ? 'rgba(242, 112, 36, 0.12)' : 'var(--bg-card, #FFFFFF)',
                  color: transferType === 'ONE_WAY' ? '#F27024' : 'var(--text-main, #0F172A)',
                }}
              >
                Chuyển 1 chiều
              </button>
              <button
                type="button"
                onClick={() => setTransferType('SWAP')}
                style={{
                  flex: 1,
                  height: 44,
                  borderRadius: 10,
                  fontSize: '14px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: transferType === 'SWAP' ? '2px solid #0054A6' : '1px solid var(--border-medium, #CBD5E1)',
                  backgroundColor: transferType === 'SWAP' ? 'rgba(0, 84, 166, 0.12)' : 'var(--bg-card, #FFFFFF)',
                  color: transferType === 'SWAP' ? '#0054A6' : 'var(--text-main, #0F172A)',
                }}
              >
                Đổi chéo (Swap 1-1)
              </button>
            </div>
            {isOneWayDisabled && (
              <span style={{ fontSize: '13px', color: '#DC2626', marginTop: '4px', display: 'block' }}>
                * Nhóm nguồn có 3 người, khóa chuyển 1 chiều.
              </span>
            )}
          </div>

          {/* 4. Chọn Nhóm đích */}
          <div>
            <label style={{ display: 'block', fontSize: '15px', fontWeight: 600, color: 'var(--text-main, #0F172A)', marginBottom: '4px' }}>
              4. Nhóm đích (Target Group):
            </label>
            <select
              value={targetRoom}
              onChange={(e) => setTargetRoom(e.target.value)}
              style={{
                width: '100%',
                height: 44,
                padding: '0 10px',
                borderRadius: 10,
                border: '1px solid var(--border-medium, #CBD5E1)',
                backgroundColor: 'var(--bg-input, #FFFFFF)',
                fontSize: '15px',
                color: 'var(--text-main, #0F172A)',
                outline: 'none',
              }}
            >
              <option value="FA26EXE101-02">FA26EXE101-02 (Hiện có 4/5 - Còn 1 chỗ trống)</option>
              <option value="FA26EXE101-04">FA26EXE101-04 (Hiện có 4/5 - Còn 1 chỗ trống)</option>
              <option value="FA26EXE101-06">FA26EXE101-06 (Hiện có 5/5 - Chỉ hỗ trợ Swap)</option>
            </select>
          </div>

          {/* 5. Nếu Swap: Chọn sinh viên nhóm đích */}
          {transferType === 'SWAP' && (
            <div>
              <label style={{ display: 'block', fontSize: '15px', fontWeight: 600, color: 'var(--text-main, #0F172A)', marginBottom: '4px' }}>
                5. Sinh viên nhóm đích để đổi chéo:
              </label>
              <select
                value={swapTargetStudent}
                onChange={(e) => setSwapTargetStudent(e.target.value)}
                style={{
                  width: '100%',
                  height: 44,
                  padding: '0 10px',
                  borderRadius: 10,
                  border: '1px solid var(--border-medium, #CBD5E1)',
                  backgroundColor: 'var(--bg-input, #FFFFFF)',
                  fontSize: '15px',
                  color: 'var(--text-main, #0F172A)',
                  outline: 'none',
                }}
              >
                <option value="target-user-01">Lê Hoàng Yến (GD180215 • Thiết kế mỹ thuật số)</option>
                <option value="target-user-02">Trần Minh Quân (SE185108 • Kỹ thuật phần mềm)</option>
              </select>
            </div>
          )}
        </div>

        {/* Nút thực hiện điều chuyển */}
        <button
          type="button"
          onClick={handleExecuteDirectTransfer}
          style={{
            height: 42,
            padding: '0 24px',
            borderRadius: 12,
            backgroundColor: '#F27024',
            color: '#FFFFFF',
            border: 'none',
            fontSize: '16px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Send size={16} />
          Thực hiện Điều chuyển ngay lập tức
        </button>
      </div>
    </div>
  );
};
export default ModeratorTransfersPage;