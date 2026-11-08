import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { spacesApi } from '../api/spaces';
import { groupsApi } from '../api/groups';
import type { GroupResponse } from '../types/group';
import type {
  CourseSpaceResponse,
  CourseSpaceStatus,
  SpaceEnrollmentResponse,
  RoomSummaryResponse,
  CreateCourseSpaceRequest,
  UpdateSpaceConfigRequest,
  FapStudentItem,
} from '../types/space';
import {
  Layers,
  Plus,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Users,
  Grid,
  Settings,
  Hash,
  Sparkles,
  Calculator,
  ShieldCheck,
  DoorOpen,
  X,
  FileSpreadsheet,
  Upload,
  Download,
  FileText,
  FolderUp,
  Check,
  Zap,
  Crown,
  ArrowRight,
  Lock,
  Send,
  Info,
} from 'lucide-react';

export const CourseSpacesPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isModerator = user?.role === 'Moderator';
  const isLecturer = user?.role === 'Lecturer';
  const isStudent = user?.role === 'Student';

  // Base state
  const [spaces, setSpaces] = useState<CourseSpaceResponse[]>([]);
  const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(null);
  const [loadingSpaces, setLoadingSpaces] = useState<boolean>(true);
  const [spacesError, setSpacesError] = useState<string | null>(null);

  // Phase 4: Student group state & actions
  const [myGroup, setMyGroup] = useState<GroupResponse | null>(null);
  const [joiningRoomId, setJoiningRoomId] = useState<string | null>(null);
  const [applyingRoom, setApplyingRoom] = useState<RoomSummaryResponse | null>(null);
  const [applyMessage, setApplyMessage] = useState<string>('');
  const [submittingApply, setSubmittingApply] = useState<boolean>(false);
  const [selectedRoomDetail, setSelectedRoomDetail] = useState<GroupResponse | null>(null);
  const [loadingRoomDetail, setLoadingRoomDetail] = useState<boolean>(false);
  const [showRoomDetailModal, setShowRoomDetailModal] = useState<boolean>(false);

  // Active space details
  const [activeTab, setActiveTab] = useState<'rooms' | 'enrollments' | 'config'>('rooms');
  const [rooms, setRooms] = useState<RoomSummaryResponse[]>([]);
  const [loadingRooms, setLoadingRooms] = useState<boolean>(false);
  const [roomStatusFilter, setRoomStatusFilter] = useState<string>('ALL');

  const [enrollments, setEnrollments] = useState<SpaceEnrollmentResponse[]>([]);
  const [loadingEnrollments, setLoadingEnrollments] = useState<boolean>(false);
  const [enrollmentSearch, setEnrollmentSearch] = useState<string>('');
  const [majorFilter, setMajorFilter] = useState<string>('ALL');

  // Action status feedback
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  // Modal: Create Course Space
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [newSemesterCode, setNewSemesterCode] = useState<string>('FA26');
  const [newSubjectCode, setNewSubjectCode] = useState<string>('EXE101');
  const [newName, setNewName] = useState<string>('Học kỳ FA26 - EXE101 Khởi nghiệp');
  const [newMaxMembers, setNewMaxMembers] = useState<number>(5);
  const [newBufferRatio, setNewBufferRatio] = useState<number>(1.2);
  const [newMaxApplies, setNewMaxApplies] = useState<number>(3);
  const [newDeadline, setNewDeadline] = useState<string>('');

  // Modal: Generate Rooms Confirmation
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState<boolean>(false);

  // Modal: Config Space
  const [editMaxMembers, setEditMaxMembers] = useState<number>(5);
  const [editBufferRatio, setEditBufferRatio] = useState<number>(1.2);
  const [editMaxApplies, setEditMaxApplies] = useState<number>(3);
  const [editDeadline, setEditDeadline] = useState<string>('');
  const [editStatus, setEditStatus] = useState<CourseSpaceStatus>('Draft');

  // Modal: CSV FAP Import (Multi-Tab)
  const [isCsvModalOpen, setIsCsvModalOpen] = useState<boolean>(false);
  const [csvModalTab, setCsvModalTab] = useState<'quick' | 'upload' | 'paste'>('quick');
  const [csvContent, setCsvContent] = useState<string>('');
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [parsedStudentsCount, setParsedStudentsCount] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const selectedSpace = useMemo(
    () => spaces.find((s) => s.id === selectedSpaceId) || null,
    [spaces, selectedSpaceId]
  );

  const getTotalStudents = (space?: CourseSpaceResponse | null) => {
    if (!space) return 0;
    return space.totalStudents ?? space.totalEligibleStudents ?? 0;
  };

  const getTotalRooms = (space?: CourseSpaceResponse | null) => {
    if (!space) return 0;
    return space.totalRooms ?? space.totalRoomsGenerated ?? 0;
  };

  // Unique majors for enrollment filter
  const availableMajors = useMemo(() => {
    const set = new Set<string>();
    enrollments.forEach((e) => {
      if (e.major) set.add(e.major);
    });
    return Array.from(set).sort();
  }, [enrollments]);

  // Filtered enrollments
  const filteredEnrollments = useMemo(() => {
    return enrollments.filter((item) => {
      const matchSearch =
        !enrollmentSearch.trim() ||
        item.studentCode.toLowerCase().includes(enrollmentSearch.toLowerCase()) ||
        item.fullName.toLowerCase().includes(enrollmentSearch.toLowerCase()) ||
        item.email.toLowerCase().includes(enrollmentSearch.toLowerCase()) ||
        (item.classCode && item.classCode.toLowerCase().includes(enrollmentSearch.toLowerCase()));
      const matchMajor = majorFilter === 'ALL' || item.major === majorFilter;
      return matchSearch && matchMajor;
    });
  }, [enrollments, enrollmentSearch, majorFilter]);

  // Filtered rooms
  const filteredRooms = useMemo(() => {
    return rooms.filter((r) => {
      if (roomStatusFilter === 'ALL') return true;
      return (r.status || '').toUpperCase() === roomStatusFilter.toUpperCase();
    });
  }, [rooms, roomStatusFilter]);

  // Safe Date Formatter (Anti-NaN, Anti-Invalid Date)
  const formatDate = (dateString?: string | null) => {
    if (!dateString) return '—';
    try {
      const d = new Date(dateString);
      if (isNaN(d.getTime())) return '—';
      return d.toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
    } catch {
      return '—';
    }
  };

  // Load Spaces on Mount
  const loadSpaces = useCallback(async () => {
    setLoadingSpaces(true);
    setSpacesError(null);
    try {
      let data: CourseSpaceResponse[] = [];
      if (isStudent) {
        data = await spacesApi.getMySpaces();
      } else {
        data = await spacesApi.getAllSpaces();
      }
      setSpaces(data);
      if (data.length > 0) {
        setSelectedSpaceId((prev) => (prev && data.some((s) => s.id === prev) ? prev : data[0].id));
      } else {
        setSelectedSpaceId(null);
      }
    } catch (err: any) {
      setSpacesError(
        err.response?.data?.detail ||
          err.response?.data?.title ||
          'Không thể tải danh sách Không gian học phần. Vui lòng thử lại.'
      );
    } finally {
      setLoadingSpaces(false);
    }
  }, [isStudent]);

  useEffect(() => {
    loadSpaces();
  }, [loadSpaces]);

  // Phase 4: Load current student's active group
  const loadMyGroup = useCallback(async () => {
    if (!isStudent) return;
    try {
      const grp = await groupsApi.getMyGroup();
      setMyGroup(grp);
    } catch {
      setMyGroup(null);
    }
  }, [isStudent]);

  useEffect(() => {
    if (isStudent) {
      void loadMyGroup();
    }
  }, [isStudent, loadMyGroup]);

  // Load rooms and enrollments when selected space changes
  const loadSpaceDetails = useCallback(async (spaceId: string) => {
    setLoadingRooms(true);
    setLoadingEnrollments(true);
    setActionError(null);
    try {
      const [roomsData, enrollmentsData] = await Promise.all([
        spacesApi.getSpaceRooms(spaceId),
        !isStudent ? spacesApi.getSpaceEnrollments(spaceId) : Promise.resolve([]),
      ]);
      setRooms(roomsData);
      setEnrollments(enrollmentsData);
      if (isStudent) {
        await loadMyGroup();
      }
    } catch (err: any) {
      setActionError(
        err.response?.data?.detail ||
          err.response?.data?.title ||
          'Không thể tải thông tin chi tiết phòng và danh sách ghi danh.'
      );
    } finally {
      setLoadingRooms(false);
      setLoadingEnrollments(false);
    }
  }, [isStudent, loadMyGroup]);

  useEffect(() => {
    if (selectedSpaceId) {
      loadSpaceDetails(selectedSpaceId);
      const current = spaces.find((s) => s.id === selectedSpaceId);
      if (current) {
        setEditMaxMembers(current.maxMembersPerGroup || 5);
        setEditBufferRatio(Number(current.bufferRatio) || 1.2);
        setEditMaxApplies(current.maxConcurrentApplies || 3);
        setEditDeadline(current.registrationDeadline ? current.registrationDeadline.substring(0, 16) : '');
        setEditStatus(current.status);
      }
    } else {
      setRooms([]);
      setEnrollments([]);
    }
  }, [selectedSpaceId, spaces, loadSpaceDetails]);

  // Formula calculation preview (BR-09, BR-11)
  const previewRoomsCount = useMemo(() => {
    if (!selectedSpace) return 0;
    const students = getTotalStudents(selectedSpace);
    const max = Number(selectedSpace.maxMembersPerGroup) || 5;
    const buffer = Number(selectedSpace.bufferRatio) || 1.2;
    if (students <= 0 || max <= 0) return 0;
    return Math.max(1, Math.ceil((students / max) * buffer));
  }, [selectedSpace]);

  // Download Sample CSV template
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
      'IA180011,namdhia180011@fpt.edu.vn,Đặng Hoàng Nam,IA,K18,EXE101-03',
      'IA180012,oanhttia180012@fpt.edu.vn,Trương Thu Oanh,IA,K18,EXE101-03',
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvHeader + sampleRows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `danh_sach_sinh_vien_fap_${selectedSpace?.semesterCode || 'FA26'}_${selectedSpace?.subjectCode || 'EXE101'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // File Upload Handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = (event.target?.result as string) || '';
      setCsvContent(text);
      const lines = text.trim().split('\n');
      let count = 0;
      for (let i = 0; i < lines.length; i++) {
        const trimmed = lines[i].trim();
        if (trimmed && !trimmed.startsWith('#')) {
          if (i === 0 && trimmed.toLowerCase().startsWith('studentcode')) continue;
          const parts = trimmed.split(',');
          if (parts.length >= 4) count++;
        }
      }
      setParsedStudentsCount(count);
    };
    reader.readAsText(file);
  };

  // Actions
  const handleCreateSpace = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setActionError(null);
    try {
      const payload: CreateCourseSpaceRequest = {
        semesterCode: newSemesterCode.trim().toUpperCase(),
        subjectCode: newSubjectCode.trim().toUpperCase(),
        name: newName.trim(),
        maxMembersPerGroup: Number(newMaxMembers),
        bufferRatio: Number(newBufferRatio),
        maxConcurrentApplies: Number(newMaxApplies),
        registrationDeadline: newDeadline ? new Date(newDeadline).toISOString() : null,
      };
      const created = await spacesApi.createSpace(payload);
      setActionSuccess(`Đã tạo thành công không gian học phần [${created.semesterCode} - ${created.subjectCode}].`);
      setIsCreateModalOpen(false);
      await loadSpaces();
      setSelectedSpaceId(created.id);
    } catch (err: any) {
      setActionError(
        err.response?.data?.detail ||
          err.response?.data?.title ||
          'Không thể tạo Không gian học phần. Vui lòng kiểm tra lại thông tin.'
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSpaceId) return;
    setActionLoading(true);
    setActionError(null);
    try {
      const payload: UpdateSpaceConfigRequest = {
        maxMembersPerGroup: Number(editMaxMembers),
        bufferRatio: Number(editBufferRatio),
        maxConcurrentApplies: Number(editMaxApplies),
        registrationDeadline: editDeadline ? new Date(editDeadline).toISOString() : null,
        status: editStatus,
      };
      const updated = await spacesApi.updateSpaceConfig(selectedSpaceId, payload);
      setActionSuccess(`Đã cập nhật cấu hình [${updated.semesterCode} - ${updated.subjectCode}] thành công.`);
      setSpaces((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    } catch (err: any) {
      setActionError(
        err.response?.data?.detail ||
          err.response?.data?.title ||
          'Không thể lưu cấu hình Space. Vui lòng kiểm tra lại.'
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleSyncMockFap = async () => {
    if (!selectedSpaceId) return;
    setActionLoading(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const count = await spacesApi.syncMockFapStudents(selectedSpaceId);
      setActionSuccess(`Đã đồng bộ thành công ${count} sinh viên hợp lệ từ dữ liệu FAP vào không gian.`);
      setIsCsvModalOpen(false);
      await loadSpaces();
      await loadSpaceDetails(selectedSpaceId);
    } catch (err: any) {
      setActionError(
        err.response?.data?.detail ||
          err.response?.data?.title ||
          'Đồng bộ Mock FAP thất bại. Vui lòng thử lại.'
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleImportCsv = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSpaceId || !csvContent.trim()) return;
    setActionLoading(true);
    setActionError(null);
    try {
      const lines = csvContent.trim().split('\n');
      const students: FapStudentItem[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line || line.startsWith('#')) continue;
        if (i === 0 && line.toLowerCase().startsWith('studentcode')) continue;
        const parts = line.split(',').map((p) => p.trim());
        if (parts.length >= 4) {
          students.push({
            studentCode: parts[0],
            email: parts[1],
            fullName: parts[2],
            major: parts[3],
            cohort: parts[4] || null,
            classCode: parts[5] || null,
          });
        }
      }

      if (students.length === 0) {
        setActionError('Dữ liệu CSV không đúng định dạng: studentCode,email,fullName,major,cohort,classCode');
        setActionLoading(false);
        return;
      }

      const count = await spacesApi.importFapStudents(selectedSpaceId, { students });
      setActionSuccess(`Đã import thành công ${count} sinh viên hợp lệ từ file CSV vào không gian học phần.`);
      setIsCsvModalOpen(false);
      setCsvContent('');
      setSelectedFileName(null);
      setParsedStudentsCount(0);
      await loadSpaces();
      await loadSpaceDetails(selectedSpaceId);
    } catch (err: any) {
      setActionError(
        err.response?.data?.detail ||
          err.response?.data?.title ||
          'Import danh sách FAP thất bại. Vui lòng kiểm tra lại định dạng file.'
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleGenerateRooms = async () => {
    if (!selectedSpaceId) return;
    setActionLoading(true);
    setActionError(null);
    try {
      const res = await spacesApi.generateRooms(selectedSpaceId);
      const createdCount = res.totalRoomsGenerated ?? res.roomsCreated ?? res.rooms?.length ?? 0;
      const firstRoom = res.rooms?.[0]?.roomCode || (res.roomCodes ? res.roomCodes[0] : '');
      const lastRoom = res.rooms?.[res.rooms.length - 1]?.roomCode || (res.roomCodes ? res.roomCodes[res.roomCodes.length - 1] : '');
      setActionSuccess(
        `Đã khởi tạo thành công ${createdCount} Room tự động ${firstRoom ? `(${firstRoom} - ${lastRoom})` : ''}.`
      );
      setIsGenerateModalOpen(false);
      await loadSpaces();
      await loadSpaceDetails(selectedSpaceId);
      setActiveTab('rooms');
    } catch (err: any) {
      setActionError(
        err.response?.data?.detail ||
          err.response?.data?.title ||
          'Không thể khởi tạo Room tự động. Vui lòng kiểm tra lại trạng thái Space và danh sách sinh viên.'
      );
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: CourseSpaceStatus) => {
    switch (status) {
      case 'Open':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.25rem 0.65rem',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: 700,
              background: 'rgba(16, 185, 129, 0.12)',
              color: '#059669',
              border: '1px solid rgba(16, 185, 129, 0.3)',
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />
            Đang mở ghi danh (Open)
          </span>
        );
      case 'Draft':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '0.25rem 0.65rem',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: 700,
              background: 'rgba(245, 158, 11, 0.12)',
              color: '#d97706',
              border: '1px solid rgba(245, 158, 11, 0.3)',
            }}
          >
            Bản nháp (Draft)
          </span>
        );
      case 'ClosedRegistration':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '0.25rem 0.65rem',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: 700,
              background: 'rgba(37, 99, 235, 0.12)',
              color: '#2563eb',
              border: '1px solid rgba(37, 99, 235, 0.3)',
            }}
          >
            Đóng ghi danh
          </span>
        );
      case 'Locked':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '0.25rem 0.65rem',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: 700,
              background: 'rgba(100, 116, 139, 0.15)',
              color: '#64748b',
              border: '1px solid rgba(100, 116, 139, 0.3)',
            }}
          >
            Đã khóa chốt sổ (Locked)
          </span>
        );
      default:
        return null;
    }
  };

  const getRoomStatusBadge = (status: string) => {
    const s = (status || '').toUpperCase();
    if (s === 'EMPTY') {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.3rem',
            padding: '0.2rem 0.55rem',
            fontSize: '0.75rem',
            fontWeight: 600,
            borderRadius: '6px',
            background: 'var(--bg-main, #f1f5f9)',
            color: 'var(--text-muted, #64748b)',
            border: '1px solid var(--border-light, #e2e8f0)',
          }}
        >
          <DoorOpen size={13} />
          Phòng trống • Vào thẳng
        </span>
      );
    }
    if (s === 'FORMING') {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.3rem',
            padding: '0.2rem 0.55rem',
            fontSize: '0.75rem',
            fontWeight: 600,
            borderRadius: '6px',
            background: 'rgba(37, 99, 235, 0.12)',
            color: '#2563eb',
            border: '1px solid rgba(37, 99, 235, 0.25)',
          }}
        >
          <Zap size={13} />
          Đang lập đội • Vào thẳng
        </span>
      );
    }
    if (s === 'RECRUITING') {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.3rem',
            padding: '0.2rem 0.55rem',
            fontSize: '0.75rem',
            fontWeight: 600,
            borderRadius: '6px',
            background: 'rgba(242, 111, 33, 0.12)',
            color: '#c2410c',
            border: '1px solid rgba(242, 111, 33, 0.25)',
          }}
        >
          <Users size={13} />
          Đang tuyển • Nộp đơn Apply
        </span>
      );
    }
    if (s === 'CLOSED') {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.3rem',
            padding: '0.2rem 0.55rem',
            fontSize: '0.75rem',
            fontWeight: 600,
            borderRadius: '6px',
            background: 'rgba(239, 68, 68, 0.12)',
            color: '#dc2626',
            border: '1px solid rgba(239, 68, 68, 0.25)',
          }}
        >
          <Lock size={13} />
          Đã đóng tuyển sớm
        </span>
      );
    }
    if (s === 'FULL') {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.3rem',
            padding: '0.2rem 0.55rem',
            fontSize: '0.75rem',
            fontWeight: 600,
            borderRadius: '6px',
            background: 'rgba(16, 185, 129, 0.12)',
            color: '#059669',
            border: '1px solid rgba(16, 185, 129, 0.25)',
          }}
        >
          <CheckCircle2 size={13} />
          Đã đủ sĩ số (Full)
        </span>
      );
    }
    if (s === 'LOCKED') {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.3rem',
            padding: '0.2rem 0.55rem',
            fontSize: '0.75rem',
            fontWeight: 600,
            borderRadius: '6px',
            background: 'rgba(124, 58, 237, 0.12)',
            color: '#7c3aed',
            border: '1px solid rgba(124, 58, 237, 0.25)',
          }}
        >
          <Lock size={13} />
          Đã chốt nhóm (Locked)
        </span>
      );
    }
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '0.2rem 0.55rem',
          fontSize: '0.75rem',
          fontWeight: 600,
          borderRadius: '6px',
          background: 'var(--bg-main, #f1f5f9)',
          color: 'var(--text-muted, #64748b)',
          border: '1px solid var(--border-light, #e2e8f0)',
        }}
      >
        {status}
      </span>
    );
  };

  // Phase 4 Handlers for Student direct join, apply, and view room detail
  const handleDirectJoin = async (room: RoomSummaryResponse) => {
    if (isStudent && !user?.isProfileCompleted) {
      setActionError(
        'Bạn chưa hoàn tất hồ sơ 5 kỹ năng cốt lõi (BR-07). Vui lòng khai báo điểm 5 kỹ năng và tích cam kết trách nhiệm cá nhân tại trang Hồ sơ trước khi tham gia Room.'
      );
      navigate('/profile');
      return;
    }

    if (!window.confirm(`Bạn có chắc chắn muốn tham gia trực tiếp vào phòng "${room.roomCode || room.name}"?`)) {
      return;
    }
    setJoiningRoomId(room.id);
    setActionError(null);
    setActionSuccess(null);
    try {
      const res = await groupsApi.directJoinRoom(room.id);
      setActionSuccess(
        `Chúc mừng bạn đã vào phòng ${res.roomCode || res.name} thành công! (${
          res.role === 'Leader' ? 'Bạn là Trưởng nhóm (Leader) - BR-15' : 'Thành viên mới'
        })`
      );
      await Promise.all([
        loadMyGroup(),
        selectedSpaceId ? loadSpaceDetails(selectedSpaceId) : Promise.resolve(),
      ]);
    } catch (err: any) {
      setActionError(err?.response?.data?.detail || err?.response?.data?.title || 'Không thể vào phòng trực tiếp.');
    } finally {
      setJoiningRoomId(null);
    }
  };

  const handleOpenApplyModal = (room: RoomSummaryResponse) => {
    if (isStudent && !user?.isProfileCompleted) {
      setActionError(
        'Bạn chưa hoàn tất hồ sơ 5 kỹ năng cốt lõi (BR-07). Vui lòng khai báo điểm 5 kỹ năng và tích cam kết trách nhiệm cá nhân tại trang Hồ sơ trước khi nộp đơn ứng tuyển.'
      );
      navigate('/profile');
      return;
    }
    setApplyingRoom(room);
    setApplyMessage('');
  };

  const handleSubmitApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applyingRoom) return;
    if (isStudent && !user?.isProfileCompleted) {
      setActionError(
        'Bạn chưa hoàn tất hồ sơ 5 kỹ năng cốt lõi (BR-07). Vui lòng khai báo điểm 5 kỹ năng và tích cam kết trách nhiệm cá nhân tại trang Hồ sơ trước khi nộp đơn ứng tuyển.'
      );
      setApplyingRoom(null);
      navigate('/profile');
      return;
    }
    setSubmittingApply(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      await groupsApi.createJoinRequest(applyingRoom.id, {
        message: applyMessage.trim() || undefined,
      });
      setActionSuccess(`Đã nộp đơn ứng tuyển vào nhóm "${applyingRoom.roomCode || applyingRoom.name}" thành công! Vui lòng chờ Trưởng nhóm duyệt.`);
      setApplyingRoom(null);
      setApplyMessage('');
    } catch (err: any) {
      setActionError(err?.response?.data?.detail || err?.response?.data?.title || 'Không thể nộp đơn ứng tuyển.');
    } finally {
      setSubmittingApply(false);
    }
  };

  const handleOpenRoomDetail = async (room: RoomSummaryResponse) => {
    setShowRoomDetailModal(true);
    setLoadingRoomDetail(true);
    setSelectedRoomDetail(null);
    try {
      const detail = await groupsApi.getGroupById(room.id);
      setSelectedRoomDetail(detail);
    } catch (err: any) {
      setActionError(err?.response?.data?.detail || 'Không thể tải thông tin chi tiết phòng.');
    } finally {
      setLoadingRoomDetail(false);
    }
  };

  const getMajorColor = (major: string) => {
    const m = (major || '').toUpperCase();
    if (m === 'SE') return { bg: 'rgba(0, 84, 166, 0.12)', color: '#0054a6', border: 'rgba(0, 84, 166, 0.25)' };
    if (m === 'AI') return { bg: 'rgba(124, 58, 237, 0.12)', color: '#7c3aed', border: 'rgba(124, 58, 237, 0.25)' };
    if (m === 'IA') return { bg: 'rgba(220, 38, 38, 0.12)', color: '#dc2626', border: 'rgba(220, 38, 38, 0.25)' };
    if (m === 'GD') return { bg: 'rgba(242, 111, 33, 0.12)', color: '#c2410c', border: 'rgba(242, 111, 33, 0.25)' };
    if (m === 'MKT') return { bg: 'rgba(5, 150, 105, 0.12)', color: '#059669', border: 'rgba(5, 150, 105, 0.25)' };
    if (m === 'IB') return { bg: 'rgba(8, 145, 178, 0.12)', color: '#0891b2', border: 'rgba(8, 145, 178, 0.25)' };
    return { bg: 'var(--bg-main, #f1f5f9)', color: 'var(--text-main, #0f172a)', border: 'var(--border-light, #e2e8f0)' };
  };

  return (
    <div style={{ maxWidth: 1240, margin: '0 auto', paddingBottom: '3rem' }}>
      {/* ── TOP HEADER BANNER ────────────────────────────────────────── */}
      <div
        className="card"
        style={{
          padding: '1.5rem',
          marginBottom: '1.5rem',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1.25rem',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0 }}>
          <div className="fpt-tricolor-bar" />
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.4rem', marginTop: '0.35rem' }}>
            <span className="fpt-portal-badge">
              {isModerator
                ? 'ĐIỀU PHỐI VIÊN • QUẢN TRỊ FAP'
                : isLecturer
                ? 'GIẢNG VIÊN • QUAN SÁT & CỐ VẤN'
                : 'SINH VIÊN EXE • CHỌN PHÒNG & GHÉP ĐỘI'}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted, #64748b)', fontWeight: 600 }}>
              {isModerator
                ? 'CỔNG QUẢN TRỊ PHÂN BỔ ROOM & KHÔNG GIAN HỌC PHẦN'
                : isLecturer
                ? 'GIÁM SÁT TIẾN ĐỘ ROOM & SĨ SỐ HỌC KỲ'
                : 'KHÔNG GIAN HỌC PHẦN ĐÃ GHI DANH TỪ FAP'}
            </span>
          </div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-main, #0f172a)', margin: 0 }}>
            {isModerator
              ? 'Quản trị Không gian học phần & Phân bổ Room'
              : isLecturer
              ? 'Không gian học phần & Giám sát Room'
              : 'Không gian học phần của tôi'}
          </h1>
          <p style={{ color: 'var(--text-muted, #64748b)', fontSize: '0.9rem', marginTop: '0.35rem', maxWidth: 750, lineHeight: 1.5 }}>
            {isModerator && (
              <>
                Quản lý học kỳ, danh sách sinh viên hợp lệ từ FAP và thuật toán tính toán phân bổ Room tự động
                theo chỉ tiêu <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--fpt-orange, #f26f21)' }}>BR-08, BR-09, BR-11</span>.
              </>
            )}
            {isLecturer && (
              <>
                Theo dõi tiến độ phân bổ Room, sĩ số học phần và danh sách sinh viên ghi danh để chuẩn bị phân công đề tài cố vấn và hướng dẫn môn EXE.
              </>
            )}
            {isStudent && (
              <>
                Không gian học phần bạn đã được ghi danh từ FAP. Chọn Room mở để tham gia hoặc nộp đơn ứng tuyển ghép đội khởi nghiệp đa ngành.
              </>
            )}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => {
              void loadSpaces();
              if (selectedSpaceId) void loadSpaceDetails(selectedSpaceId);
            }}
            disabled={loadingSpaces}
            className="btn btn-secondary"
            style={{ padding: '0.6rem 1rem' }}
            title="Tải lại dữ liệu"
          >
            <RefreshCw size={16} className={loadingSpaces ? 'animate-spin' : ''} />
            <span>Làm mới</span>
          </button>

          {isModerator && (
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="btn btn-primary"
              style={{ padding: '0.6rem 1.25rem' }}
            >
              <Plus size={17} strokeWidth={2.5} />
              <span>Tạo không gian mới</span>
            </button>
          )}
        </div>
      </div>

      {/* ── NOTIFICATION FEEDBACK ────────────────────────────────────── */}
      {spacesError && (
        <div
          style={{
            padding: '0.9rem 1.25rem',
            borderRadius: 'var(--radius-md, 10px)',
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            color: '#b91c1c',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
            marginBottom: '1.25rem',
            fontSize: '0.875rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <AlertCircle size={18} style={{ color: '#dc2626', flexShrink: 0 }} />
            <span style={{ fontWeight: 600 }}>{spacesError}</span>
          </div>
          <button onClick={() => setSpacesError(null)} style={{ color: '#dc2626', padding: '0.2rem' }}>
            <X size={16} />
          </button>
        </div>
      )}

      {actionSuccess && (
        <div
          style={{
            padding: '0.9rem 1.25rem',
            borderRadius: 'var(--radius-md, 10px)',
            background: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            color: '#047857',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
            marginBottom: '1.25rem',
            fontSize: '0.875rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <CheckCircle2 size={18} style={{ color: '#059669', flexShrink: 0 }} />
            <span style={{ fontWeight: 600 }}>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} style={{ color: '#059669', padding: '0.2rem' }}>
            <X size={16} />
          </button>
        </div>
      )}

      {actionError && (
        <div
          style={{
            padding: '0.9rem 1.25rem',
            borderRadius: 'var(--radius-md, 10px)',
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            color: '#b91c1c',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
            marginBottom: '1.25rem',
            fontSize: '0.875rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <AlertCircle size={18} style={{ color: '#dc2626', flexShrink: 0 }} />
            <span style={{ fontWeight: 600 }}>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} style={{ color: '#dc2626', padding: '0.2rem' }}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* ── BR-07 SKILL PROFILE COMPLETION BANNER (STUDENT) ────────── */}
      {isStudent && !user?.isProfileCompleted && (
        <div
          className="card"
          style={{
            padding: '1.25rem 1.5rem',
            marginBottom: '1.25rem',
            background: 'rgba(242, 111, 33, 0.06)',
            border: '1.5px solid rgba(242, 111, 33, 0.35)',
            borderRadius: 'var(--radius-lg, 14px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1.25rem',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.9rem', maxWidth: 820 }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: '10px',
                background: 'rgba(242, 111, 33, 0.12)',
                color: 'var(--fpt-orange, #f26f21)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <AlertCircle size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    padding: '0.2rem 0.55rem',
                    borderRadius: '6px',
                    background: 'var(--fpt-orange, #f26f21)',
                    color: '#ffffff',
                    letterSpacing: '0.04em',
                  }}
                >
                  YÊU CẦU BẮT BUỘC • BR-07
                </span>
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>
                  Hồ sơ 5 kỹ năng cốt lõi chưa hoàn tất
                </h4>
              </div>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted, #64748b)', lineHeight: 1.55 }}>
                Theo quy chế ghép nhóm môn Khởi nghiệp EXE, bạn bắt buộc phải tự đánh giá <strong>5 kỹ năng cốt lõi</strong> (Technical, Management, Graphic Design, Marketing, Sale từ 0–100%) và tích chọn <strong>cam kết chịu trách nhiệm cá nhân</strong> tại trang Hồ sơ cá nhân trước khi được phép Vào phòng trực tiếp hoặc Nộp đơn ứng tuyển (Apply).
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate('/profile')}
            className="btn btn-primary"
            style={{
              padding: '0.65rem 1.25rem',
              fontSize: '0.85rem',
              fontWeight: 700,
              whiteSpace: 'nowrap',
              flexShrink: 0,
              gap: '0.4rem',
            }}
          >
            <span>Khai báo 5 kỹ năng ngay</span>
            <ArrowRight size={16} />
          </button>
        </div>
      )}

      {/* ── STUDENT ELIGIBILITY BANNER (BR-01, BR-03) ────────────────── */}
      {isStudent && (
        <div style={{ marginBottom: '1.5rem' }}>
          {spaces.length > 0 ? (
            <div
              style={{
                padding: '1.25rem',
                borderRadius: 'var(--radius-lg, 16px)',
                background: 'rgba(0, 84, 166, 0.06)',
                border: '1px solid rgba(0, 84, 166, 0.25)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.85rem',
              }}
            >
              <ShieldCheck size={22} style={{ color: 'var(--fpt-blue, #0054a6)', flexShrink: 0, marginTop: 2 }} />
              <div>
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--fpt-blue, #0054a6)' }}>
                  Xác nhận tư cách sinh viên hợp lệ FAP ({selectedSpace?.semesterCode || 'FA26'} - {selectedSpace?.subjectCode || 'EXE101'})
                </h4>
                <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.875rem', color: 'var(--text-muted, #64748b)', lineHeight: 1.5 }}>
                  Bạn đã được ghi danh hợp lệ vào Không gian học phần này. Bạn có thể chọn phòng trống để vào hoặc xem các phòng đang tuyển thành viên phù hợp với chuyên môn của bạn.
                </p>
              </div>
            </div>
          ) : (
            <div
              style={{
                padding: '1.25rem',
                borderRadius: 'var(--radius-lg, 16px)',
                background: 'rgba(245, 158, 11, 0.08)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.85rem',
              }}
            >
              <AlertCircle size={22} style={{ color: '#d97706', flexShrink: 0, marginTop: 2 }} />
              <div>
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#b45309' }}>
                  Chưa tìm thấy thông tin ghi danh FAP kỳ học này (BR-01, BR-03)
                </h4>
                <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.875rem', color: '#92400e', lineHeight: 1.5 }}>
                  Tài khoản của bạn chưa có tên trong danh sách lớp FAP hợp lệ cho môn Khởi nghiệp. Vui lòng liên hệ Giảng viên
                  hoặc Điều phối viên (Moderator) để được rà soát và đồng bộ dữ liệu vào hệ thống.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── SPACE CARDS SELECTOR ─────────────────────────────────────── */}
      <div style={{ marginBottom: '1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main, #0f172a)', margin: 0 }}>
            Học kỳ & Không gian học phần
          </h2>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted, #64748b)', fontWeight: 600 }}>
            {spaces.length} Không gian
          </span>
        </div>

        {loadingSpaces ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
            {[1, 2].map((i) => (
              <div key={i} className="card" style={{ height: 130, opacity: 0.6 }} />
            ))}
          </div>
        ) : spaces.length === 0 ? (
          <div className="card" style={{ padding: '2.5rem', textAlign: 'center' }}>
            <Layers size={42} style={{ color: 'var(--text-muted, #64748b)', margin: '0 auto 0.75rem auto', opacity: 0.5 }} />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>Chưa có Không gian học phần nào</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', maxWidth: 450, margin: '0.35rem auto 1rem auto' }}>
              Hệ thống chưa tạo Không gian môn học. Điều phối viên có thể bấm "Tạo không gian mới" để khởi tạo học kỳ.
            </p>
            {isModerator && (
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="btn btn-primary"
              >
                <Plus size={16} />
                <span>Tạo không gian FA26 - EXE101</span>
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1rem' }}>
            {spaces.map((sp) => {
              const isSelected = sp.id === selectedSpaceId;
              const totalStu = getTotalStudents(sp);
              const totalRm = getTotalRooms(sp);
              return (
                <div
                  key={sp.id}
                  onClick={() => setSelectedSpaceId(sp.id)}
                  className="card"
                  style={{
                    padding: '1.25rem',
                    cursor: 'pointer',
                    borderColor: isSelected ? 'var(--fpt-orange, #f26f21)' : 'var(--border-light)',
                    boxShadow: isSelected ? '0 4px 14px rgba(242, 111, 33, 0.2)' : 'var(--shadow-sm)',
                    background: isSelected ? 'var(--bg-card)' : 'var(--bg-card)',
                    position: 'relative',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          padding: '0.2rem 0.55rem',
                          borderRadius: '6px',
                          background: 'var(--bg-main, #f1f5f9)',
                          color: 'var(--text-main, #0f172a)',
                          border: '1px solid var(--border-light, #e2e8f0)',
                        }}
                      >
                        {sp.semesterCode}
                      </span>
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          padding: '0.2rem 0.55rem',
                          borderRadius: '6px',
                          background: 'rgba(0, 84, 166, 0.1)',
                          color: 'var(--fpt-blue, #0054a6)',
                          border: '1px solid rgba(0, 84, 166, 0.25)',
                        }}
                      >
                        {sp.subjectCode}
                      </span>
                    </div>
                    {getStatusBadge(sp.status)}
                  </div>

                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 0.85rem 0' }}>
                    {sp.name}
                  </h3>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, 1fr)',
                      gap: '0.65rem',
                      paddingTop: '0.75rem',
                      borderTop: '1px solid var(--border-light)',
                      fontSize: '0.8rem',
                      color: 'var(--text-muted)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <Users size={14} style={{ color: 'var(--text-muted)' }} />
                      <span>SV FAP:</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-main)', fontVariantNumeric: 'tabular-nums' }}>
                        {totalStu}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <DoorOpen size={14} style={{ color: 'var(--fpt-orange)' }} />
                      <span>Số Room:</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--fpt-orange)', fontVariantNumeric: 'tabular-nums' }}>
                        {totalRm}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <Hash size={14} style={{ color: 'var(--text-muted)' }} />
                      <span>Max/nhóm:</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-main)', fontVariantNumeric: 'tabular-nums' }}>
                        {sp.maxMembersPerGroup} SV
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <Calculator size={14} style={{ color: 'var(--text-muted)' }} />
                      <span>Buffer:</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-main)', fontVariantNumeric: 'tabular-nums' }}>
                        x{sp.bufferRatio}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── ACTIVE SPACE DETAILS TABS & CONTENT ──────────────────────── */}
      {selectedSpace && (
        <div>
          {/* Navigation Tab Bar */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              borderBottom: '1px solid var(--border-light)',
              paddingBottom: '0.75rem',
              marginBottom: '1.25rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setActiveTab('rooms')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.55rem 1.15rem',
                  borderRadius: 'var(--radius-md, 10px)',
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  transition: 'all 0.15s ease',
                  background: activeTab === 'rooms' ? 'var(--fpt-orange, #f26f21)' : 'transparent',
                  color: activeTab === 'rooms' ? '#ffffff' : 'var(--text-muted, #64748b)',
                  border: activeTab === 'rooms' ? 'none' : '1px solid transparent',
                  boxShadow: activeTab === 'rooms' ? '0 2px 6px rgba(242, 111, 33, 0.3)' : 'none',
                }}
              >
                <Grid size={16} />
                <span>Danh sách Room phân bổ</span>
                <span
                  style={{
                    padding: '0.1rem 0.5rem',
                    borderRadius: '9999px',
                    fontSize: '0.75rem',
                    fontFamily: 'var(--font-mono)',
                    fontVariantNumeric: 'tabular-nums',
                    background: activeTab === 'rooms' ? 'rgba(255, 255, 255, 0.25)' : 'var(--bg-main, #e2e8f0)',
                    color: activeTab === 'rooms' ? '#ffffff' : 'var(--text-main, #0f172a)',
                  }}
                >
                  {rooms.length}
                </span>
              </button>

              {!isStudent && (
                <button
                  type="button"
                  onClick={() => setActiveTab('enrollments')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.55rem 1.15rem',
                    borderRadius: 'var(--radius-md, 10px)',
                    fontSize: '0.875rem',
                    fontWeight: 700,
                    transition: 'all 0.15s ease',
                    background: activeTab === 'enrollments' ? 'var(--fpt-orange, #f26f21)' : 'transparent',
                    color: activeTab === 'enrollments' ? '#ffffff' : 'var(--text-muted, #64748b)',
                    border: activeTab === 'enrollments' ? 'none' : '1px solid transparent',
                    boxShadow: activeTab === 'enrollments' ? '0 2px 6px rgba(242, 111, 33, 0.3)' : 'none',
                  }}
                >
                  <Users size={16} />
                  <span>Danh sách SV hợp lệ (FAP)</span>
                  <span
                    style={{
                      padding: '0.1rem 0.5rem',
                      borderRadius: '9999px',
                      fontSize: '0.75rem',
                      fontFamily: 'var(--font-mono)',
                      fontVariantNumeric: 'tabular-nums',
                      background: activeTab === 'enrollments' ? 'rgba(255, 255, 255, 0.25)' : 'var(--bg-main, #e2e8f0)',
                      color: activeTab === 'enrollments' ? '#ffffff' : 'var(--text-main, #0f172a)',
                    }}
                  >
                    {getTotalStudents(selectedSpace)}
                  </span>
                </button>
              )}

              {isModerator && (
                <button
                  type="button"
                  onClick={() => setActiveTab('config')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.55rem 1.15rem',
                    borderRadius: 'var(--radius-md, 10px)',
                    fontSize: '0.875rem',
                    fontWeight: 700,
                    transition: 'all 0.15s ease',
                    background: activeTab === 'config' ? 'var(--fpt-orange, #f26f21)' : 'transparent',
                    color: activeTab === 'config' ? '#ffffff' : 'var(--text-muted, #64748b)',
                    border: activeTab === 'config' ? 'none' : '1px solid transparent',
                    boxShadow: activeTab === 'config' ? '0 2px 6px rgba(242, 111, 33, 0.3)' : 'none',
                  }}
                >
                  <Settings size={16} />
                  <span>Cấu hình & Chỉ số sinh Room</span>
                </button>
              )}
            </div>

            {/* Quick Actions for Moderator on Tabs */}
            {isModerator && activeTab === 'rooms' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    setCsvModalTab('quick');
                    setIsCsvModalOpen(true);
                  }}
                  className="btn btn-secondary"
                  style={{ padding: '0.55rem 0.95rem', fontSize: '0.825rem' }}
                >
                  <Upload size={14} />
                  <span>Đồng bộ FAP / CSV</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsGenerateModalOpen(true)}
                  disabled={getTotalStudents(selectedSpace) <= 0 || actionLoading}
                  className="btn btn-primary"
                  style={{ padding: '0.55rem 1rem', fontSize: '0.825rem' }}
                >
                  <Sparkles size={15} />
                  <span>Khởi tạo Room tự động</span>
                </button>
              </div>
            )}
          </div>

          {/* ══════════════════════════════════════════════════════════════
              TAB 1: ROOMS GRID VIEW
             ══════════════════════════════════════════════════════════════ */}
          {activeTab === 'rooms' && (
            <div>
              {/* ── WORKFLOW STEPPER BANNER FOR MODERATOR (SUPERB UX) ───── */}
              {isModerator && getTotalStudents(selectedSpace) === 0 && (
                <div
                  className="card"
                  style={{
                    padding: '1.35rem 1.5rem',
                    marginBottom: '1.35rem',
                    background: 'rgba(0, 84, 166, 0.04)',
                    border: '1.5px solid rgba(0, 84, 166, 0.25)',
                    borderRadius: 'var(--radius-lg, 14px)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1.25rem', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.9rem' }}>
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: '12px',
                          background: 'rgba(0, 84, 166, 0.1)',
                          color: 'var(--fpt-blue, #0054a6)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <Sparkles size={22} />
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem' }}>
                          <span
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              padding: '0.2rem 0.6rem',
                              borderRadius: '6px',
                              background: 'var(--fpt-blue, #0054a6)',
                              color: '#ffffff',
                              letterSpacing: '0.04em',
                            }}
                          >
                            BƯỚC 1 / 2 • NẠP DANH SÁCH SINH VIÊN
                          </span>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                            Không gian học phần đang có 0 sinh viên
                          </span>
                        </div>
                        <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)' }}>
                          Bắt đầu bằng việc nạp danh sách sinh viên hợp lệ từ FAP
                        </h4>
                        <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: 680, lineHeight: 1.55 }}>
                          Để thuật toán có thể tính toán số lượng Room theo công thức FPT <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--fpt-blue)', fontWeight: 700 }}>CEIL(Tổng SV ÷ Max × Buffer)</code> (BR-09),
                          hãy chọn một trong hai cách dưới đây:
                        </p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={handleSyncMockFap}
                        disabled={actionLoading}
                        className="btn btn-primary"
                        style={{ padding: '0.65rem 1.25rem', fontWeight: 700 }}
                        title="Đồng bộ nhanh 50 sinh viên mẫu đa ngành SE, AI, IA, GD, MKT, IB"
                      >
                        <Sparkles size={16} />
                        <span>⚡ Đồng bộ nhanh 50 SV FAP mẫu (1-Click)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setCsvModalTab('upload');
                          setIsCsvModalOpen(true);
                        }}
                        className="btn btn-secondary"
                        style={{ padding: '0.65rem 1.15rem' }}
                      >
                        <Upload size={16} />
                        <span>📁 Tải lên file CSV từ máy</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Ready to generate banner */}
              {isModerator && getTotalStudents(selectedSpace) > 0 && rooms.length === 0 && (
                <div
                  className="card"
                  style={{
                    padding: '1.35rem 1.5rem',
                    marginBottom: '1.35rem',
                    background: 'rgba(242, 111, 33, 0.05)',
                    border: '1.5px solid rgba(242, 111, 33, 0.3)',
                    borderRadius: 'var(--radius-lg, 14px)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1.25rem', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.9rem' }}>
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: '12px',
                          background: 'rgba(242, 111, 33, 0.1)',
                          color: 'var(--fpt-orange, #f26f21)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <CheckCircle2 size={22} />
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem' }}>
                          <span
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              padding: '0.2rem 0.6rem',
                              borderRadius: '6px',
                              background: 'var(--fpt-orange, #f26f21)',
                              color: '#ffffff',
                              letterSpacing: '0.04em',
                            }}
                          >
                            BƯỚC 2 / 2 • KHỞI TẠO ROOMS
                          </span>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                            Đã có {getTotalStudents(selectedSpace)} sinh viên FAP
                          </span>
                        </div>
                        <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)' }}>
                          Sẵn sàng khởi tạo {previewRoomsCount} Room tự động theo công thức FPT
                        </h4>
                        <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: 680, lineHeight: 1.55 }}>
                          Công thức BR-09:{' '}
                          <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--fpt-orange)', fontWeight: 700 }}>
                            CEIL({getTotalStudents(selectedSpace)} SV ÷ {selectedSpace.maxMembersPerGroup || 5} Max × {selectedSpace.bufferRatio || 1.2} Buffer) = {previewRoomsCount} Rooms
                          </code>
                          . Các Room sẽ được đánh số chuẩn hóa từ <code style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{selectedSpace.semesterCode}{selectedSpace.subjectCode}-01</code>.
                        </p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <button
                        type="button"
                        onClick={() => setIsGenerateModalOpen(true)}
                        disabled={actionLoading}
                        className="btn btn-primary"
                        style={{ padding: '0.65rem 1.35rem', fontWeight: 800 }}
                      >
                        <Sparkles size={17} />
                        <span>Khởi tạo {previewRoomsCount} Room tự động ngay</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Formula Callout Banner */}
              <div
                className="card"
                style={{
                  padding: '1.25rem',
                  marginBottom: '1.25rem',
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  background: 'var(--bg-card)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 'var(--radius-md, 10px)',
                      background: 'rgba(242, 111, 33, 0.1)',
                      border: '1px solid rgba(242, 111, 33, 0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--fpt-orange)',
                      flexShrink: 0,
                    }}
                  >
                    <Calculator size={22} />
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '0.925rem', fontWeight: 700, color: 'var(--text-main)' }}>
                      Quy tắc sinh Room tự động (BR-09, BR-11):
                    </h4>
                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.825rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      CEIL({getTotalStudents(selectedSpace)} SV ÷ {selectedSpace.maxMembersPerGroup || 5} Max × {selectedSpace.bufferRatio || 1.2} Buffer) ={' '}
                      <span style={{ fontWeight: 800, color: 'var(--fpt-orange)', fontVariantNumeric: 'tabular-nums' }}>
                        {previewRoomsCount} Rooms
                      </span>
                      {' '}(Mã chuẩn hóa: <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{selectedSpace.semesterCode}{selectedSpace.subjectCode}-01...{selectedSpace.semesterCode}{selectedSpace.subjectCode}-{previewRoomsCount < 10 ? `0${previewRoomsCount}` : previewRoomsCount}</span>)
                    </p>
                  </div>
                </div>

                {/* Filter Room Status */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Filter size={15} style={{ color: 'var(--text-muted)' }} />
                  <select
                    value={roomStatusFilter}
                    onChange={(e) => setRoomStatusFilter(e.target.value)}
                    className="form-control"
                    style={{ width: 'auto', padding: '0.4rem 0.85rem', fontSize: '0.825rem' }}
                  >
                    <option value="ALL">Tất cả trạng thái</option>
                    <option value="EMPTY">Chưa có người (Empty)</option>
                    <option value="FORMING">Đang hình thành</option>
                    <option value="RECRUITING">Đang tuyển (Recruiting)</option>
                    <option value="FULL">Đã đủ sĩ số (Full)</option>
                    <option value="LOCKED">Đã chốt sổ (Locked)</option>
                  </select>
                </div>
              </div>

              {/* Student Team Status Banner (Phase 4 BR-21) */}
              {isStudent && (
                <div
                  className="card"
                  style={{
                    marginBottom: '1.25rem',
                    padding: '1rem 1.25rem',
                    borderRadius: 'var(--radius-md, 10px)',
                    background: myGroup ? 'rgba(0, 136, 55, 0.04)' : 'rgba(0, 84, 166, 0.04)',
                    border: myGroup ? '1px solid rgba(0, 136, 55, 0.25)' : '1px solid rgba(0, 84, 166, 0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '0.85rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: '50%',
                        background: myGroup ? 'rgba(0, 136, 55, 0.12)' : 'rgba(0, 84, 166, 0.12)',
                        color: myGroup ? '#008837' : '#0054a6',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {myGroup ? <Crown size={20} /> : <Info size={20} />}
                    </div>
                    <div>
                      {myGroup ? (
                        <>
                          <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)' }}>
                            Bạn đang tham gia nhóm: <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--fpt-orange)' }}>{myGroup.roomCode || myGroup.name}</span>
                            <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', padding: '0.15rem 0.5rem', borderRadius: 9999, background: '#dcfce7', color: '#15803d', fontWeight: 700 }}>
                              {myGroup.leaderId === user?.id ? 'Trưởng nhóm (Leader)' : 'Thành viên'}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                            Trạng thái: <strong>{myGroup.status}</strong> • Sĩ số: <strong style={{ fontFamily: 'var(--font-mono)' }}>{myGroup.members.length}/{myGroup.maxMembers}</strong>. Mỗi sinh viên chỉ thuộc tối đa 1 nhóm hoạt động (BR-21).
                          </div>
                        </>
                      ) : (
                        <>
                          <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)' }}>
                            ⚡ Bạn chưa có nhóm đề tài trong học kỳ này
                          </div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                            Phòng dưới ngưỡng (<strong style={{ fontFamily: 'var(--font-mono)' }}>&lt; {selectedSpace?.groupThreshold || Math.floor((selectedSpace?.maxMembersPerGroup || 5) / 2) + 1} SV</strong>): Được vào thẳng trực tiếp, người đầu tiên là Leader (BR-14, BR-15).
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {myGroup && (
                    <button
                      type="button"
                      onClick={() => navigate('/my-group')}
                      className="btn btn-primary"
                      style={{ padding: '0.45rem 1rem', fontSize: '0.825rem', gap: '0.35rem' }}
                    >
                      <span>Vào quản lý Nhóm của tôi</span>
                      <ArrowRight size={14} />
                    </button>
                  )}
                </div>
              )}

              {/* Room Cards Grid */}
              {loadingRooms ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="card" style={{ height: 160, opacity: 0.6 }} />
                  ))}
                </div>
              ) : filteredRooms.length === 0 ? (
                <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
                  <DoorOpen size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 0.75rem auto', opacity: 0.4 }} />
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    {roomStatusFilter !== 'ALL'
                      ? 'Không có Room nào khớp với bộ lọc trạng thái'
                      : 'Chưa có Room nào được khởi tạo trong Không gian này'}
                  </h3>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', maxWidth: 460, margin: '0.35rem auto 1.25rem auto' }}>
                    {isModerator
                      ? 'Bấm nút "Khởi tạo Room tự động" bên trên để hệ thống tự động sinh các Room từ FA26EXE101-01 trở đi theo danh sách sinh viên hợp lệ FAP.'
                      : 'Hiện chưa có Room nào được mở trong học kỳ này. Vui lòng quay lại sau.'}
                  </p>
                  {isModerator && getTotalStudents(selectedSpace) > 0 && (
                    <button
                      type="button"
                      onClick={() => setIsGenerateModalOpen(true)}
                      className="btn btn-primary"
                    >
                      <Sparkles size={16} />
                      <span>Khởi tạo {previewRoomsCount} Room tự động ngay</span>
                    </button>
                  )}
                  {isModerator && getTotalStudents(selectedSpace) === 0 && (
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
                      <button
                        type="button"
                        onClick={handleSyncMockFap}
                        className="btn btn-primary"
                      >
                        <Sparkles size={16} />
                        <span>⚡ Đồng bộ nhanh 50 SV FAP mẫu</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCsvModalTab('upload');
                          setIsCsvModalOpen(true);
                        }}
                        className="btn btn-secondary"
                      >
                        <Upload size={16} />
                        <span>📁 Tải lên file CSV</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.15rem' }}>
                  {filteredRooms.map((room) => {
                    const memberRatio = Math.min(100, (room.memberCount / room.maxMembers) * 100);
                    const threshold = selectedSpace?.groupThreshold || Math.floor((room.maxMembers || 5) / 2) + 1;
                    const isUnderThreshold = room.memberCount < threshold;
                    const isDirectJoinAllowed = (room.status === 'Empty' || room.status === 'Forming') && isUnderThreshold;
                    const isRecruiting = room.status === 'Recruiting';
                    const isClosed = room.status === 'Closed' || room.status === 'Full' || room.status === 'Locked';
                    const isInThisRoom = myGroup?.id === room.id;
                    const hasOtherGroup = myGroup !== null && myGroup.id !== room.id;
                    const isJoiningThis = joiningRoomId === room.id;

                    return (
                      <div
                        key={room.id}
                        className="card"
                        style={{
                          padding: '1.25rem',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          gap: '0.85rem',
                          transition: 'all 0.2s ease',
                          border: isInThisRoom ? '2px solid #008837' : '1px solid var(--border-light)',
                          background: isInThisRoom ? 'rgba(0, 136, 55, 0.02)' : 'var(--bg-card)',
                        }}
                      >
                        <div>
                          {/* Room Header: Code + Badge */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.65rem' }}>
                            <span
                              style={{
                                fontFamily: 'var(--font-mono)',
                                fontSize: '0.875rem',
                                fontWeight: 800,
                                letterSpacing: '0.03em',
                                padding: '0.25rem 0.65rem',
                                borderRadius: '6px',
                                background: 'var(--bg-main, #f1f5f9)',
                                color: 'var(--text-main, #0f172a)',
                                border: '1px solid var(--border-light, #e2e8f0)',
                              }}
                            >
                              {room.roomCode || 'ROOM-??'}
                            </span>
                            {getRoomStatusBadge(room.status)}
                          </div>

                          <div>
                            <h4 style={{ margin: 0, fontSize: '0.975rem', fontWeight: 700, color: 'var(--text-main)' }}>
                              {room.name}
                            </h4>
                            <p style={{ margin: '0.3rem 0 0 0', fontSize: '0.825rem', color: 'var(--text-muted)' }}>
                              {room.leaderName ? (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                                  <Crown size={13} style={{ color: '#f26f21' }} />
                                  Trưởng nhóm: <strong>{room.leaderName}</strong>
                                </span>
                              ) : (
                                'Chưa có thành viên (Phòng chờ mở)'
                              )}
                            </p>
                          </div>

                          {/* Member Progress Bar */}
                          <div style={{ marginTop: '0.75rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.35rem' }}>
                              <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                <Users size={13} />
                                Sĩ số thành viên:
                              </span>
                              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-main)', fontVariantNumeric: 'tabular-nums' }}>
                                {room.memberCount} / {room.maxMembers}
                              </span>
                            </div>
                            <div
                              style={{
                                height: 6,
                                width: '100%',
                                background: 'var(--bg-main, #e2e8f0)',
                                borderRadius: '9999px',
                                overflow: 'hidden',
                                border: '1px solid var(--border-light, #e2e8f0)',
                              }}
                            >
                              <div
                                style={{
                                  height: '100%',
                                  background: isUnderThreshold
                                    ? 'linear-gradient(90deg, #0054a6 0%, #2563eb 100%)'
                                    : 'linear-gradient(90deg, #f26f21 0%, #ea580c 100%)',
                                  borderRadius: '9999px',
                                  transform: `scaleX(${memberRatio / 100})`,
                                  transformOrigin: 'left',
                                  transition: 'transform 0.3s cubic-bezier(0.23, 1, 0.32, 1)',
                                }}
                              />
                            </div>
                          </div>

                          {/* Threshold hint */}
                          <div
                            style={{
                              marginTop: '0.55rem',
                              fontSize: '0.76rem',
                              padding: '0.35rem 0.55rem',
                              borderRadius: '6px',
                              background: isUnderThreshold ? 'rgba(0, 84, 166, 0.05)' : 'rgba(242, 111, 33, 0.06)',
                              color: isUnderThreshold ? '#0054a6' : '#c2410c',
                              border: isUnderThreshold ? '1px solid rgba(0, 84, 166, 0.15)' : '1px solid rgba(242, 111, 33, 0.2)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                            }}
                          >
                            <Info size={13} style={{ flexShrink: 0 }} />
                            <span>
                              {isUnderThreshold ? (
                                <>
                                  Ngưỡng Group: <strong>{threshold} SV</strong> (còn {threshold - room.memberCount} chỗ vào thẳng)
                                </>
                              ) : (
                                <>
                                  Đã đạt ngưỡng <strong>{threshold} SV</strong>: Khóa vào thẳng, chuyển tuyển chọn
                                </>
                              )}
                            </span>
                          </div>
                        </div>

                        {/* Card Actions Footer */}
                        <div
                          style={{
                            paddingTop: '0.75rem',
                            borderTop: '1px solid var(--border-light)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '0.5rem',
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => handleOpenRoomDetail(room)}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '0.35rem 0.65rem', fontSize: '0.78rem' }}
                          >
                            Chi tiết
                          </button>

                          {/* Student Actions */}
                          {isStudent && (
                            <div>
                              {isInThisRoom ? (
                                <button
                                  type="button"
                                  onClick={() => navigate('/my-group')}
                                  className="btn btn-primary btn-sm"
                                  style={{
                                    padding: '0.35rem 0.75rem',
                                    fontSize: '0.78rem',
                                    background: '#008837',
                                    borderColor: '#008837',
                                    fontWeight: 700,
                                  }}
                                >
                                  <span>Nhóm của bạn →</span>
                                </button>
                              ) : hasOtherGroup ? (
                                <button
                                  type="button"
                                  disabled
                                  className="btn btn-secondary btn-sm"
                                  title={`Bạn đã là thành viên của nhóm ${myGroup?.roomCode || myGroup?.name}`}
                                  style={{
                                    padding: '0.35rem 0.75rem',
                                    fontSize: '0.78rem',
                                    opacity: 0.6,
                                    cursor: 'not-allowed',
                                  }}
                                >
                                  Đã có nhóm
                                </button>
                              ) : isDirectJoinAllowed ? (
                                <button
                                  type="button"
                                  onClick={() => handleDirectJoin(room)}
                                  disabled={isJoiningThis}
                                  className="btn btn-primary btn-sm"
                                  style={{
                                    padding: '0.35rem 0.75rem',
                                    fontSize: '0.78rem',
                                    fontWeight: 700,
                                    gap: '0.3rem',
                                  }}
                                  title={room.memberCount === 0 ? 'Phòng trống: Bạn sẽ là Trưởng nhóm (Leader) - BR-15' : 'Vào nhóm ngay không cần duyệt - BR-14'}
                                >
                                  <Zap size={13} />
                                  <span>{isJoiningThis ? 'Đang vào...' : 'Vào thẳng'}</span>
                                </button>
                              ) : isRecruiting ? (
                                <button
                                  type="button"
                                  onClick={() => handleOpenApplyModal(room)}
                                  className="btn btn-secondary btn-sm"
                                  style={{
                                    padding: '0.35rem 0.75rem',
                                    fontSize: '0.78rem',
                                    color: 'var(--fpt-orange)',
                                    fontWeight: 700,
                                    borderColor: 'var(--fpt-orange)',
                                    gap: '0.3rem',
                                  }}
                                >
                                  <Send size={13} />
                                  <span>Nộp đơn</span>
                                </button>
                              ) : isClosed ? (
                                <button
                                  type="button"
                                  disabled
                                  className="btn btn-secondary btn-sm"
                                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem', opacity: 0.5, cursor: 'not-allowed' }}
                                >
                                  {room.status === 'Closed' ? 'Đóng tuyển' : 'Đã khóa'}
                                </button>
                              ) : null}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              TAB 2: FAP ENROLLMENTS TABLE VIEW
             ══════════════════════════════════════════════════════════════ */}
          {activeTab === 'enrollments' && !isStudent && (
            <div>
              {/* Actions & Filters Header */}
              <div
                className="card"
                style={{
                  padding: '1.25rem',
                  marginBottom: '1.25rem',
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '1rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', flex: 1 }}>
                  <div style={{ position: 'relative', minWidth: 260, flex: 1 }}>
                    <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
                    <input
                      type="text"
                      placeholder="Tìm theo MSSV, Họ tên, Email, Lớp..."
                      value={enrollmentSearch}
                      onChange={(e) => setEnrollmentSearch(e.target.value)}
                      className="form-control"
                      style={{ paddingLeft: '2.4rem', fontSize: '0.85rem' }}
                    />
                  </div>

                  <select
                    value={majorFilter}
                    onChange={(e) => setMajorFilter(e.target.value)}
                    className="form-control"
                    style={{ width: 'auto', fontSize: '0.85rem' }}
                  >
                    <option value="ALL">Tất cả chuyên ngành</option>
                    {availableMajors.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                {isModerator && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={handleSyncMockFap}
                      disabled={actionLoading}
                      className="btn btn-secondary"
                      style={{ padding: '0.55rem 0.95rem', fontSize: '0.825rem' }}
                      title="Tự động đồng bộ 50 sinh viên FAP mẫu đủ các ngành SE, AI, IA, GD, MKT, IB"
                    >
                      <Sparkles size={14} />
                      <span>⚡ Đồng bộ Mock FAP (50 SV)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setCsvModalTab('upload');
                        setIsCsvModalOpen(true);
                      }}
                      className="btn btn-primary"
                      style={{ padding: '0.55rem 1rem', fontSize: '0.825rem' }}
                    >
                      <Upload size={14} />
                      <span>Import FAP CSV</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Enrollments Table */}
              {loadingEnrollments ? (
                <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
                  <RefreshCw size={24} className="animate-spin" style={{ color: 'var(--fpt-orange)', margin: '0 auto 0.5rem auto' }} />
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Đang tải danh sách sinh viên hợp lệ từ FAP...</p>
                </div>
              ) : filteredEnrollments.length === 0 ? (
                <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
                  <Users size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 0.75rem auto', opacity: 0.4 }} />
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    Chưa có sinh viên nào trong danh sách FAP
                  </h3>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', maxWidth: 460, margin: '0.35rem auto 1.25rem auto' }}>
                    Điều phối viên có thể bấm "Đồng bộ Mock FAP (50 SV)" để nạp nhanh danh sách kiểm thử, hoặc Tải lên file CSV từ máy tính.
                  </p>
                  {isModerator && (
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={handleSyncMockFap}
                        disabled={actionLoading}
                        className="btn btn-primary"
                      >
                        <Sparkles size={16} />
                        <span>Nạp danh sách 50 sinh viên FAP mẫu</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCsvModalTab('upload');
                          setIsCsvModalOpen(true);
                        }}
                        className="btn btn-secondary"
                      >
                        <Upload size={16} />
                        <span>Tải file CSV lên</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                      <thead>
                        <tr
                          style={{
                            borderBottom: '1px solid var(--border-light)',
                            background: 'var(--bg-main, #f8fafc)',
                            color: 'var(--text-muted, #64748b)',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                          }}
                        >
                          <th style={{ padding: '0.85rem 1rem' }}>MSSV</th>
                          <th style={{ padding: '0.85rem 1rem' }}>Họ và tên</th>
                          <th style={{ padding: '0.85rem 1rem' }}>Email FPT</th>
                          <th style={{ padding: '0.85rem 1rem' }}>Chuyên ngành</th>
                          <th style={{ padding: '0.85rem 1rem' }}>Khóa</th>
                          <th style={{ padding: '0.85rem 1rem' }}>Lớp FAP</th>
                          <th style={{ padding: '0.85rem 1rem' }}>Ngày ghi danh</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredEnrollments.map((enr) => {
                          const tagStyle = getMajorColor(enr.major);
                          return (
                            <tr
                              key={enr.id}
                              style={{
                                borderBottom: '1px solid var(--border-light)',
                                transition: 'background-color 0.15s ease',
                              }}
                            >
                              <td
                                style={{
                                  padding: '0.85rem 1rem',
                                  fontFamily: 'var(--font-mono)',
                                  fontWeight: 700,
                                  color: 'var(--fpt-blue, #0054a6)',
                                  fontVariantNumeric: 'tabular-nums',
                                }}
                              >
                                {enr.studentCode}
                              </td>
                              <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: 'var(--text-main)', whiteSpace: 'nowrap' }}>
                                {enr.fullName}
                              </td>
                              <td
                                style={{
                                  padding: '0.85rem 1rem',
                                  fontFamily: 'var(--font-mono)',
                                  fontSize: '0.8rem',
                                  color: 'var(--text-muted)',
                                }}
                              >
                                {enr.email}
                              </td>
                              <td style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap' }}>
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    padding: '0.2rem 0.55rem',
                                    borderRadius: '6px',
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    background: tagStyle.bg,
                                    color: tagStyle.color,
                                    border: `1px solid ${tagStyle.border}`,
                                  }}
                                >
                                  {enr.major}
                                </span>
                              </td>
                              <td style={{ padding: '0.85rem 1rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                                {enr.cohort || 'K18'}
                              </td>
                              <td style={{ padding: '0.85rem 1rem', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-main)', fontVariantNumeric: 'tabular-nums' }}>
                                {enr.classCode || 'EXE101-01'}
                              </td>
                              <td style={{ padding: '0.85rem 1rem', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                                {formatDate(enr.enrolledAt)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              TAB 3: CONFIG & FORMULA CALCULATOR (MODERATOR ONLY)
             ══════════════════════════════════════════════════════════════ */}
          {activeTab === 'config' && isModerator && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>
              {/* Form Cấu hình Space */}
              <div className="card" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.85rem', marginBottom: '1.25rem' }}>
                  <Settings size={18} style={{ color: 'var(--fpt-orange)' }} />
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    Cấu hình chỉ số Không gian học phần
                  </h3>
                </div>

                <form onSubmit={handleUpdateConfig} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Sĩ số tối đa một nhóm (BR-02: 4 - 6 thành viên)
                    </label>
                    <input
                      type="number"
                      min={4}
                      max={6}
                      value={editMaxMembers}
                      onChange={(e) => setEditMaxMembers(Number(e.target.value))}
                      className="form-control"
                      style={{ fontFamily: 'var(--font-mono)' }}
                      required
                    />
                    <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Ngưỡng tối thiểu thành lập nhóm: <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-main)' }}>{Math.floor(editMaxMembers / 2) + 1}</span> thành viên (BR-10).
                    </p>
                  </div>

                  <div>
                    <label className="form-label" style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Hệ số dự phòng phân bổ Room (Buffer Ratio: 1.0 - 2.0, mặc định 1.2)
                    </label>
                    <input
                      type="number"
                      step="0.05"
                      min={1.0}
                      max={2.0}
                      value={editBufferRatio}
                      onChange={(e) => setEditBufferRatio(Number(e.target.value))}
                      className="form-control"
                      style={{ fontFamily: 'var(--font-mono)' }}
                      required
                    />
                    <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      BR-09: Nhân thêm 20% (1.2) số Room để đảm bảo sinh viên có dư không gian ghép nhóm trước khi chốt sổ.
                    </p>
                  </div>

                  <div>
                    <label className="form-label" style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Số đơn ứng tuyển tối đa cùng lúc (BR-12: 1 - 5 đơn)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={5}
                      value={editMaxApplies}
                      onChange={(e) => setEditMaxApplies(Number(e.target.value))}
                      className="form-control"
                      style={{ fontFamily: 'var(--font-mono)' }}
                      required
                    />
                  </div>

                  <div>
                    <label className="form-label" style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Hạn chót sinh viên tự do lập nhóm & ứng tuyển
                    </label>
                    <input
                      type="datetime-local"
                      value={editDeadline}
                      onChange={(e) => setEditDeadline(e.target.value)}
                      className="form-control"
                      style={{ fontFamily: 'var(--font-mono)' }}
                    />
                  </div>

                  <div>
                    <label className="form-label" style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Trạng thái Không gian học phần
                    </label>
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value as CourseSpaceStatus)}
                      className="form-control"
                    >
                      <option value="Draft">Bản nháp (Draft)</option>
                      <option value="Open">Đang mở đăng ký (Open)</option>
                      <option value="ClosedRegistration">Đóng đăng ký tự do (ClosedRegistration)</option>
                      <option value="Locked">Đã khóa chốt sổ toàn bộ (Locked)</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="btn btn-primary"
                    style={{ width: '100%', marginTop: '0.5rem', padding: '0.75rem' }}
                  >
                    {actionLoading ? 'Đang lưu cấu hình...' : 'Lưu cấu hình Không gian'}
                  </button>
                </form>
              </div>

              {/* Trực quan hóa công thức và preview sinh Room */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className="card" style={{ padding: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.85rem', marginBottom: '1.25rem' }}>
                    <Calculator size={18} style={{ color: 'var(--fpt-blue, #0054a6)' }} />
                    <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>
                      Mô phỏng Công thức sinh Room (BR-09, BR-11)
                    </h3>
                  </div>

                  <div
                    style={{
                      padding: '1.15rem',
                      borderRadius: 'var(--radius-md, 10px)',
                      background: 'var(--bg-main, #f8fafc)',
                      border: '1px solid var(--border-light, #e2e8f0)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.825rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.65rem',
                      marginBottom: '1.25rem',
                    }}
                  >
                    <div style={{ color: 'var(--text-muted)', fontWeight: 700 }}>CÔNG THỨC TOÁN HỌC:</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--fpt-blue, #0054a6)' }}>
                      TotalRooms = CEIL( TotalStudents ÷ MaxMembers × BufferRatio )
                    </div>
                    <div style={{ color: 'var(--text-muted)', paddingTop: '0.5rem', borderTop: '1px solid var(--border-light)' }}>
                      ÁP DỤNG THÔNG SỐ HIỆN TẠI:
                    </div>
                    <div style={{ color: 'var(--text-main)' }}>
                      = CEIL( <span style={{ fontWeight: 800, color: 'var(--fpt-orange)' }}>{getTotalStudents(selectedSpace)}</span> ÷ <span style={{ fontWeight: 700 }}>{editMaxMembers}</span> × <span style={{ fontWeight: 700 }}>{editBufferRatio}</span> )
                    </div>
                    <div style={{ color: 'var(--text-main)' }}>
                      = CEIL( {((getTotalStudents(selectedSpace) / (editMaxMembers || 5)) * (editBufferRatio || 1.2)).toFixed(2)} )
                    </div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#059669', paddingTop: '0.25rem' }}>
                      ➔ KẾT QUẢ DỰ KIẾN: {Math.max(1, Math.ceil((getTotalStudents(selectedSpace) / (editMaxMembers || 5)) * (editBufferRatio || 1.2)))} ROOMS
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <CheckCircle2 size={15} style={{ color: '#059669', flexShrink: 0 }} />
                      <span>Định danh Room chuẩn hóa: <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-main)', fontWeight: 600 }}>{selectedSpace.semesterCode}{selectedSpace.subjectCode}-01</code> ... <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-main)', fontWeight: 600 }}>{selectedSpace.semesterCode}{selectedSpace.subjectCode}-N</code></span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <CheckCircle2 size={15} style={{ color: '#059669', flexShrink: 0 }} />
                      <span>Mỗi Room khởi tạo ở trạng thái <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-main)', fontWeight: 600 }}>Empty</code> (sĩ số 0/5, chưa có trưởng nhóm)</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <CheckCircle2 size={15} style={{ color: '#059669', flexShrink: 0 }} />
                      <span>Bảo lưu các Room đã có thành viên khi chạy lại lệnh sinh room</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsGenerateModalOpen(true)}
                    disabled={getTotalStudents(selectedSpace) <= 0 || actionLoading}
                    className="btn btn-primary"
                    style={{ width: '100%', padding: '0.75rem', fontWeight: 800 }}
                  >
                    <Sparkles size={16} />
                    <span>Khởi tạo {Math.max(1, Math.ceil((getTotalStudents(selectedSpace) / (editMaxMembers || 5)) * (editBufferRatio || 1.2)))} Room ngay</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── MODAL: TẠO KHÔNG GIAN MỚI ───────────────────────────────── */}
      {isCreateModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ padding: '1.75rem', maxWidth: 540 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.85rem', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: '8px',
                    background: 'rgba(242, 111, 33, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--fpt-orange)',
                  }}
                >
                  <Plus size={18} />
                </div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  Tạo Không gian học phần mới
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                style={{ color: 'var(--text-muted)', padding: '0.25rem' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSpace} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.85rem' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '0.8rem', textTransform: 'uppercase' }}>
                    Mã học kỳ (Semester)
                  </label>
                  <input
                    type="text"
                    value={newSemesterCode}
                    onChange={(e) => setNewSemesterCode(e.target.value)}
                    placeholder="FA26"
                    className="form-control"
                    style={{ fontFamily: 'var(--font-mono)' }}
                    required
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.8rem', textTransform: 'uppercase' }}>
                    Mã môn học (Subject)
                  </label>
                  <input
                    type="text"
                    value={newSubjectCode}
                    onChange={(e) => setNewSubjectCode(e.target.value)}
                    placeholder="EXE101"
                    className="form-control"
                    style={{ fontFamily: 'var(--font-mono)' }}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '0.8rem', textTransform: 'uppercase' }}>
                  Tên không gian môn học
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Học kỳ FA26 - EXE101 Khởi nghiệp"
                  className="form-control"
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.85rem' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '0.8rem', textTransform: 'uppercase' }}>
                    Max SV/nhóm
                  </label>
                  <input
                    type="number"
                    min={4}
                    max={6}
                    value={newMaxMembers}
                    onChange={(e) => setNewMaxMembers(Number(e.target.value))}
                    className="form-control"
                    style={{ fontFamily: 'var(--font-mono)' }}
                    required
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.8rem', textTransform: 'uppercase' }}>
                    Buffer Ratio
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    min={1.0}
                    max={2.0}
                    value={newBufferRatio}
                    onChange={(e) => setNewBufferRatio(Number(e.target.value))}
                    className="form-control"
                    style={{ fontFamily: 'var(--font-mono)' }}
                    required
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.8rem', textTransform: 'uppercase' }}>
                    Max Applies
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={newMaxApplies}
                    onChange={(e) => setNewMaxApplies(Number(e.target.value))}
                    className="form-control"
                    style={{ fontFamily: 'var(--font-mono)' }}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '0.8rem', textTransform: 'uppercase' }}>
                  Hạn chót đăng ký (tùy chọn)
                </label>
                <input
                  type="datetime-local"
                  value={newDeadline}
                  onChange={(e) => setNewDeadline(e.target.value)}
                  className="form-control"
                  style={{ fontFamily: 'var(--font-mono)' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.65rem', paddingTop: '0.85rem', borderTop: '1px solid var(--border-light)' }}>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="btn btn-secondary"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="btn btn-primary"
                >
                  {actionLoading ? 'Đang tạo...' : 'Tạo Không gian'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: KHỞI TẠO ROOM TỰ ĐỘNG CONFIRMATION ─────────────────── */}
      {isGenerateModalOpen && selectedSpace && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ padding: '1.75rem', maxWidth: 480 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '1.15rem' }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 'var(--radius-md, 10px)',
                  background: 'rgba(242, 111, 33, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--fpt-orange)',
                  flexShrink: 0,
                }}
              >
                <Sparkles size={24} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  Khởi tạo Room tự động
                </h3>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Thuật toán phân bổ Room chuẩn hóa FPT (BR-09, BR-11)
                </p>
              </div>
            </div>

            <div
              style={{
                padding: '1rem',
                borderRadius: 'var(--radius-md, 10px)',
                background: 'var(--bg-main, #f8fafc)',
                border: '1px solid var(--border-light, #e2e8f0)',
                fontSize: '0.85rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.55rem',
                marginBottom: '1rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Tổng sinh viên FAP:</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-main)', fontVariantNumeric: 'tabular-nums' }}>
                  {getTotalStudents(selectedSpace)} SV
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Sĩ số tối đa/nhóm:</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-main)', fontVariantNumeric: 'tabular-nums' }}>
                  {selectedSpace.maxMembersPerGroup || 5} SV
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Hệ số dự phòng:</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-main)', fontVariantNumeric: 'tabular-nums' }}>
                  x{selectedSpace.bufferRatio || 1.2}
                </span>
              </div>
              <div style={{ paddingTop: '0.55rem', borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem' }}>
                <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>Số Room sẽ được sinh:</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 900, color: 'var(--fpt-orange)', fontVariantNumeric: 'tabular-nums' }}>
                  {previewRoomsCount} Rooms
                </span>
              </div>
            </div>

            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '1.25rem' }}>
              Mỗi phòng sẽ được đặt mã định danh từ <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-main)', fontWeight: 700 }}>{selectedSpace.semesterCode}{selectedSpace.subjectCode}-01</code> đến <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-main)', fontWeight: 700 }}>{selectedSpace.semesterCode}{selectedSpace.subjectCode}-{previewRoomsCount < 10 ? `0${previewRoomsCount}` : previewRoomsCount}</code>.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.65rem' }}>
              <button
                type="button"
                onClick={() => setIsGenerateModalOpen(false)}
                className="btn btn-secondary"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleGenerateRooms}
                disabled={actionLoading}
                className="btn btn-primary"
              >
                {actionLoading ? 'Đang khởi tạo...' : `Xác nhận tạo ${previewRoomsCount} Room`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: ĐA NĂNG ĐỒNG BỘ FAP & IMPORT CSV ──────────────────── */}
      {isCsvModalOpen && selectedSpace && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ padding: '1.75rem', maxWidth: 640 }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.85rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '8px',
                    background: 'rgba(242, 111, 33, 0.1)',
                    color: 'var(--fpt-orange)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <FileSpreadsheet size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)' }}>
                    Đồng bộ & Import danh sách FAP
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Không gian: {selectedSpace.semesterCode} • {selectedSpace.subjectCode} ({selectedSpace.name})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCsvModalOpen(false)}
                style={{ color: 'var(--text-muted)', padding: '0.25rem' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Internal Tabs */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '0.45rem',
                padding: '0.3rem',
                background: 'var(--bg-main, #f1f5f9)',
                borderRadius: 'var(--radius-md, 10px)',
                marginBottom: '1.25rem',
              }}
            >
              <button
                type="button"
                onClick={() => setCsvModalTab('quick')}
                style={{
                  padding: '0.55rem 0.5rem',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.35rem',
                  background: csvModalTab === 'quick' ? '#ffffff' : 'transparent',
                  color: csvModalTab === 'quick' ? 'var(--fpt-blue, #0054a6)' : 'var(--text-muted, #64748b)',
                  boxShadow: csvModalTab === 'quick' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                <Sparkles size={14} />
                <span>⚡ Đồng bộ mẫu (1-Click)</span>
              </button>

              <button
                type="button"
                onClick={() => setCsvModalTab('upload')}
                style={{
                  padding: '0.55rem 0.5rem',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.35rem',
                  background: csvModalTab === 'upload' ? '#ffffff' : 'transparent',
                  color: csvModalTab === 'upload' ? 'var(--fpt-orange, #f26f21)' : 'var(--text-muted, #64748b)',
                  boxShadow: csvModalTab === 'upload' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                <FolderUp size={14} />
                <span>📁 Tải lên File CSV</span>
              </button>

              <button
                type="button"
                onClick={() => setCsvModalTab('paste')}
                style={{
                  padding: '0.55rem 0.5rem',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.35rem',
                  background: csvModalTab === 'paste' ? '#ffffff' : 'transparent',
                  color: csvModalTab === 'paste' ? 'var(--text-main, #0f172a)' : 'var(--text-muted, #64748b)',
                  boxShadow: csvModalTab === 'paste' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                <FileText size={14} />
                <span>📝 Dán văn bản CSV</span>
              </button>
            </div>

            {/* TAB CONTENT 1: QUICK 1-CLICK MOCK SYNC */}
            {csvModalTab === 'quick' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div
                  style={{
                    padding: '1.15rem',
                    borderRadius: 'var(--radius-md, 10px)',
                    background: 'rgba(0, 84, 166, 0.05)',
                    border: '1px solid rgba(0, 84, 166, 0.2)',
                  }}
                >
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--fpt-blue, #0054a6)', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <Sparkles size={16} />
                    Khuyên dùng cho buổi Demo & Kiểm thử tính năng
                  </h4>
                  <p style={{ margin: '0.45rem 0 0 0', fontSize: '0.825rem', color: 'var(--text-muted)', lineHeight: 1.55 }}>
                    Hệ thống sẽ nạp trực tiếp <strong>50 sinh viên mẫu chuẩn FAP</strong> được phân bổ cân đối vào 3 lớp học
                    (<code style={{ fontFamily: 'var(--font-mono)' }}>EXE101-01</code>, <code style={{ fontFamily: 'var(--font-mono)' }}>02</code>, <code style={{ fontFamily: 'var(--font-mono)' }}>03</code>)
                    với đầy đủ 6 chuyên ngành:
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginTop: '0.75rem', fontSize: '0.78rem' }}>
                    <div style={{ padding: '0.35rem 0.5rem', background: '#fff', borderRadius: '6px', border: '1px solid var(--border-light)' }}>
                      <strong>SE (Kỹ thuật phần mềm)</strong>: 20 SV
                    </div>
                    <div style={{ padding: '0.35rem 0.5rem', background: '#fff', borderRadius: '6px', border: '1px solid var(--border-light)' }}>
                      <strong>AI (Trí tuệ nhân tạo)</strong>: 8 SV
                    </div>
                    <div style={{ padding: '0.35rem 0.5rem', background: '#fff', borderRadius: '6px', border: '1px solid var(--border-light)' }}>
                      <strong>GD (Thiết kế đồ họa)</strong>: 8 SV
                    </div>
                    <div style={{ padding: '0.35rem 0.5rem', background: '#fff', borderRadius: '6px', border: '1px solid var(--border-light)' }}>
                      <strong>MKT (Marketing)</strong>: 6 SV
                    </div>
                    <div style={{ padding: '0.35rem 0.5rem', background: '#fff', borderRadius: '6px', border: '1px solid var(--border-light)' }}>
                      <strong>IB (Kinh doanh QT)</strong>: 4 SV
                    </div>
                    <div style={{ padding: '0.35rem 0.5rem', background: '#fff', borderRadius: '6px', border: '1px solid var(--border-light)' }}>
                      <strong>IA (An toàn thông tin)</strong>: 4 SV
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.65rem', paddingTop: '0.85rem', borderTop: '1px solid var(--border-light)' }}>
                  <button
                    type="button"
                    onClick={() => setIsCsvModalOpen(false)}
                    className="btn btn-secondary"
                  >
                    Đóng
                  </button>
                  <button
                    type="button"
                    onClick={handleSyncMockFap}
                    disabled={actionLoading}
                    className="btn btn-primary"
                    style={{ padding: '0.65rem 1.25rem', fontWeight: 800 }}
                  >
                    <Sparkles size={16} />
                    <span>{actionLoading ? 'Đang nạp dữ liệu...' : '⚡ Nạp ngay 50 SV FAP mẫu (1-Click)'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB CONTENT 2: FILE UPLOAD ZONE & DOWNLOAD TEMPLATE */}
            {csvModalTab === 'upload' && (
              <form onSubmit={handleImportCsv} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
                {/* Download Sample Button */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.85rem 1rem',
                    borderRadius: 'var(--radius-md, 10px)',
                    background: 'var(--bg-main, #f8fafc)',
                    border: '1px solid var(--border-light, #e2e8f0)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                    <Download size={18} style={{ color: 'var(--fpt-blue, #0054a6)' }} />
                    <span style={{ fontSize: '0.825rem', color: 'var(--text-main)', fontWeight: 600 }}>
                      Chưa có file mẫu chuẩn FPT?
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleDownloadSampleCsv}
                    className="btn btn-secondary"
                    style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem', color: 'var(--fpt-blue)' }}
                  >
                    <Download size={14} />
                    <span>📥 Tải file mẫu CSV chuẩn</span>
                  </button>
                </div>

                {/* Dropzone File Picker */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />

                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: selectedFileName ? '2px solid #10b981' : '2px dashed var(--border-medium, #cbd5e1)',
                    borderRadius: 'var(--radius-md, 12px)',
                    padding: '2rem 1.5rem',
                    textAlign: 'center',
                    cursor: 'pointer',
                    background: selectedFileName ? 'rgba(16, 185, 129, 0.04)' : 'var(--bg-card, #ffffff)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {selectedFileName ? (
                    <div>
                      <div
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: '50%',
                          background: 'rgba(16, 185, 129, 0.12)',
                          color: '#059669',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          margin: '0 auto 0.75rem auto',
                        }}
                      >
                        <Check size={26} strokeWidth={2.5} />
                      </div>
                      <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>
                        {selectedFileName}
                      </h4>
                      <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.825rem', color: '#059669', fontWeight: 600 }}>
                        ✓ Đã nhận diện được <span style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}>{parsedStudentsCount}</span> sinh viên hợp lệ từ file
                      </p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          fileInputRef.current?.click();
                        }}
                        style={{
                          marginTop: '0.75rem',
                          fontSize: '0.75rem',
                          color: 'var(--text-muted)',
                          textDecoration: 'underline',
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        Chọn file khác
                      </button>
                    </div>
                  ) : (
                    <div>
                      <FolderUp size={44} style={{ color: 'var(--fpt-orange)', margin: '0 auto 0.75rem auto', opacity: 0.8 }} />
                      <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>
                        Nhấn để chọn file CSV từ máy tính
                      </h4>
                      <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Định dạng: <code style={{ fontFamily: 'var(--font-mono)' }}>studentCode, email, fullName, major, cohort, classCode</code>
                      </p>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.65rem', paddingTop: '0.85rem', borderTop: '1px solid var(--border-light)' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCsvModalOpen(false);
                      setSelectedFileName(null);
                    }}
                    className="btn btn-secondary"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={!selectedFileName || parsedStudentsCount === 0 || actionLoading}
                    className="btn btn-primary"
                    style={{ padding: '0.65rem 1.25rem', fontWeight: 700 }}
                  >
                    {actionLoading ? 'Đang import...' : `Xác nhận Import ${parsedStudentsCount > 0 ? `${parsedStudentsCount} sinh viên` : ''}`}
                  </button>
                </div>
              </form>
            )}

            {/* TAB CONTENT 3: RAW TEXTAREA PASTE */}
            {csvModalTab === 'paste' && (
              <form onSubmit={handleImportCsv} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
                  Dán nội dung CSV (mỗi sinh viên một dòng theo cấu trúc:{' '}
                  <code style={{ color: 'var(--fpt-blue)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                    studentCode,email,fullName,major,cohort,classCode
                  </code>
                  )
                </p>

                <textarea
                  rows={8}
                  value={csvContent}
                  onChange={(e) => setCsvContent(e.target.value)}
                  placeholder={`SE180001,anvse180001@fpt.edu.vn,Nguyễn Văn An,SE,K18,EXE101-01\nAI180002,binhptai180002@fpt.edu.vn,Phan Thị Bình,AI,K18,EXE101-01\nGD180003,chaulnbgd180003@fpt.edu.vn,Lê Ngọc Bảo Châu,GD,K18,EXE101-02`}
                  className="form-control"
                  style={{ fontFamily: 'var(--font-mono)', fontSize: '0.825rem', resize: 'vertical' }}
                  required
                />

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.65rem', paddingTop: '0.85rem', borderTop: '1px solid var(--border-light)' }}>
                  <button
                    type="button"
                    onClick={() => setIsCsvModalOpen(false)}
                    className="btn btn-secondary"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={!csvContent.trim() || actionLoading}
                    className="btn btn-primary"
                  >
                    {actionLoading ? 'Đang import...' : 'Import danh sách'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          MODAL 4: PHASE 4 — ROOM DETAIL & MEMBER LIST
         ══════════════════════════════════════════════════════════════ */}
      {showRoomDetailModal && (
        <div className="modal-overlay" onClick={() => setShowRoomDetailModal(false)}>
          <div
            className="modal-content"
            style={{ maxWidth: 620, width: '92%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '1rem', borderBottom: '1px solid var(--border-light)' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 800,
                      padding: '0.2rem 0.55rem',
                      borderRadius: '6px',
                      background: 'var(--bg-main)',
                      border: '1px solid var(--border-light)',
                      fontSize: '0.85rem',
                    }}
                  >
                    {selectedRoomDetail?.roomCode || 'ROOM'}
                  </span>
                  {selectedRoomDetail && getRoomStatusBadge(selectedRoomDetail.status)}
                </div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  {selectedRoomDetail?.name || 'Chi tiết phòng học phần'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowRoomDetailModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '1.25rem 0' }}>
              {loadingRoomDetail ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Đang tải thông tin thành viên...
                </div>
              ) : selectedRoomDetail ? (
                <div>
                  {/* Summary Grid */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                      gap: '0.75rem',
                      marginBottom: '1.25rem',
                    }}
                  >
                    <div style={{ padding: '0.75rem', borderRadius: '8px', background: 'var(--bg-main)', border: '1px solid var(--border-light)' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Sĩ số</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 800, fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', color: 'var(--text-main)', marginTop: '0.2rem' }}>
                        {selectedRoomDetail.members.length} / {selectedRoomDetail.maxMembers}
                      </div>
                    </div>
                    <div style={{ padding: '0.75rem', borderRadius: '8px', background: 'var(--bg-main)', border: '1px solid var(--border-light)' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Ngưỡng chuyển Group</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 800, fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', color: 'var(--fpt-orange)', marginTop: '0.2rem' }}>
                        {selectedSpace?.groupThreshold || Math.floor((selectedRoomDetail.maxMembers || 5) / 2) + 1} SV
                      </div>
                    </div>
                    <div style={{ padding: '0.75rem', borderRadius: '8px', background: 'var(--bg-main)', border: '1px solid var(--border-light)' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Trưởng nhóm</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '0.35rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {selectedRoomDetail.members.find((m) => m.role === 'Leader')?.fullName ||
                          selectedRoomDetail.members.find((m) => m.userId === selectedRoomDetail.leaderId)?.fullName ||
                          (selectedRoomDetail.members.length === 0 ? 'Chưa có' : 'Đang cập nhật')}
                      </div>
                    </div>
                  </div>

                  {/* Members List */}
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.65rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Users size={16} />
                    Danh sách thành viên hiện tại ({selectedRoomDetail.members.length})
                  </h4>

                  {selectedRoomDetail.members.length === 0 ? (
                    <div style={{ padding: '1.5rem', textAlign: 'center', background: 'var(--bg-main)', borderRadius: '8px', border: '1px solid var(--border-light)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      Phòng hiện chưa có thành viên nào. Sinh viên đầu tiên vào phòng sẽ tự động trở thành <strong>Trưởng nhóm (Leader)</strong> (BR-15).
                    </div>
                  ) : (
                    <div style={{ border: '1px solid var(--border-light)', borderRadius: '8px', overflow: 'hidden' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                        <thead>
                          <tr style={{ background: 'var(--bg-main)', borderBottom: '1px solid var(--border-light)', textAlign: 'left' }}>
                            <th style={{ padding: '0.55rem 0.75rem', fontWeight: 700 }}>Thành viên</th>
                            <th style={{ padding: '0.55rem 0.75rem', fontWeight: 700 }}>Vai trò</th>
                            <th style={{ padding: '0.55rem 0.75rem', fontWeight: 700 }}>Ngày tham gia</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedRoomDetail.members.map((m, idx) => (
                            <tr key={m.id || idx} style={{ borderBottom: '1px solid var(--border-light)' }}>
                              <td style={{ padding: '0.65rem 0.75rem' }}>
                                <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                                  {m.fullName || m.userId}
                                </div>
                                {m.studentCode && (
                                  <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                                    {m.studentCode}
                                  </div>
                                )}
                              </td>
                              <td style={{ padding: '0.65rem 0.75rem' }}>
                                {m.role === 'Leader' || m.userId === selectedRoomDetail.leaderId ? (
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.15rem 0.5rem', borderRadius: 9999, background: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa', fontWeight: 700, fontSize: '0.75rem' }}>
                                    <Crown size={12} /> Trưởng nhóm
                                  </span>
                                ) : (
                                  <span style={{ padding: '0.15rem 0.5rem', borderRadius: 9999, background: '#f1f5f9', color: '#475569', fontWeight: 600, fontSize: '0.75rem' }}>
                                    Thành viên
                                  </span>
                                )}
                              </td>
                              <td style={{ padding: '0.65rem 0.75rem', fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                {formatDate(m.joinedAt)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.65rem', paddingTop: '0.85rem', borderTop: '1px solid var(--border-light)' }}>
              <button
                type="button"
                onClick={() => setShowRoomDetailModal(false)}
                className="btn btn-secondary"
              >
                Đóng
              </button>
              {isStudent && selectedRoomDetail && (
                <>
                  {myGroup?.id === selectedRoomDetail.id ? (
                    <button
                      type="button"
                      onClick={() => {
                        setShowRoomDetailModal(false);
                        navigate('/my-group');
                      }}
                      className="btn btn-primary"
                    >
                      <span>Vào quản lý Nhóm của tôi →</span>
                    </button>
                  ) : !myGroup && (selectedRoomDetail.status === 'Empty' || selectedRoomDetail.status === 'Forming') ? (
                    <button
                      type="button"
                      onClick={() => {
                        setShowRoomDetailModal(false);
                        const matchedRoom = rooms.find((r) => r.id === selectedRoomDetail.id);
                        if (matchedRoom) void handleDirectJoin(matchedRoom);
                      }}
                      className="btn btn-primary"
                      style={{ gap: '0.35rem' }}
                    >
                      <Zap size={15} />
                      <span>Vào phòng trực tiếp (BR-14)</span>
                    </button>
                  ) : !myGroup && selectedRoomDetail.status === 'Recruiting' ? (
                    <button
                      type="button"
                      onClick={() => {
                        setShowRoomDetailModal(false);
                        const matchedRoom = rooms.find((r) => r.id === selectedRoomDetail.id);
                        if (matchedRoom) handleOpenApplyModal(matchedRoom);
                      }}
                      className="btn btn-primary"
                      style={{ gap: '0.35rem' }}
                    >
                      <Send size={15} />
                      <span>Nộp đơn ứng tuyển (BR-22)</span>
                    </button>
                  ) : null}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          MODAL 5: PHASE 4 — APPLY TO RECRUITING GROUP (BR-22)
         ══════════════════════════════════════════════════════════════ */}
      {applyingRoom && (
        <div className="modal-overlay" onClick={() => setApplyingRoom(null)}>
          <div
            className="modal-content"
            style={{ maxWidth: 500, width: '92%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '1rem', borderBottom: '1px solid var(--border-light)' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  Nộp đơn ứng tuyển vào nhóm
                </h3>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Gửi đơn tới: <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--fpt-orange)' }}>{applyingRoom.roomCode || applyingRoom.name}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setApplyingRoom(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitApply} style={{ padding: '1.25rem 0', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Quota alert (BR-22) */}
              <div
                style={{
                  padding: '0.85rem 1rem',
                  borderRadius: '8px',
                  background: 'rgba(0, 84, 166, 0.05)',
                  border: '1px solid rgba(0, 84, 166, 0.2)',
                  fontSize: '0.825rem',
                  color: 'var(--text-main)',
                  lineHeight: 1.5,
                }}
              >
                <strong>Hạn mức ứng tuyển đồng thời:</strong> Bạn có thể nộp tối đa{' '}
                <strong style={{ color: 'var(--fpt-blue)', fontFamily: 'var(--font-mono)' }}>
                  {selectedSpace?.maxConcurrentApplies || 3} đơn
                </strong>{' '}
                cùng lúc (BR-22). Khi bạn được chấp thuận vào một nhóm, các đơn còn lại sẽ tự động hủy (BR-26).
              </div>

              <div>
                <label className="form-label" style={{ fontWeight: 700, fontSize: '0.85rem' }}>
                  Lời giới thiệu / Lý do muốn gia nhập nhóm:
                </label>
                <textarea
                  rows={4}
                  className="form-control"
                  required
                  placeholder="Ví dụ: Em có thế mạnh về Backend C#/.NET và làm việc nhóm tích cực, mong muốn gia nhập nhóm cùng phát triển đề tài..."
                  value={applyMessage}
                  onChange={(e) => setApplyMessage(e.target.value)}
                  style={{ resize: 'vertical', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.65rem', paddingTop: '0.85rem', borderTop: '1px solid var(--border-light)' }}>
                <button
                  type="button"
                  onClick={() => setApplyingRoom(null)}
                  className="btn btn-secondary"
                  disabled={submittingApply}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submittingApply}
                  className="btn btn-primary"
                  style={{ gap: '0.35rem', fontWeight: 700 }}
                >
                  <Send size={15} />
                  <span>{submittingApply ? 'Đang gửi đơn...' : 'Xác nhận nộp đơn (BR-22)'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseSpacesPage;
