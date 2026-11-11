import apiClient from './client';
import type { PagedResult } from '../types';

/**
 * Lời gọi API cho các màn hình Học kỳ / Phòng / Nhóm.
 * Kiểu dữ liệu ở đây khớp đúng DTO của Group Service và User Service (backend), không dùng dữ liệu mẫu.
 */

// ── Kiểu dữ liệu (khớp Group.Services/DTOs) ─────────────────────────────────

export type SpaceStatus = 'Draft' | 'Open' | 'ClosedRegistration' | 'Locked';
export type RoomStatus = 'Empty' | 'Forming' | 'Recruiting' | 'Closed' | 'Locked' | 'Disbanded';

export interface Space {
  id: string;
  semesterCode: string;
  subjectCode: string;
  name: string;
  maxMembersPerGroup: number;
  groupThreshold: number;
  bufferRatio: number;
  maxConcurrentApplies: number;
  registrationDeadline: string;
  status: SpaceStatus;
  totalStudents: number;
  totalRooms: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSpacePayload {
  semesterCode: string;
  subjectCode: string;
  name: string;
  maxMembersPerGroup: number;
  bufferRatio: number;
  maxConcurrentApplies: number;
  /** Bắt buộc và phải sau thời điểm hiện tại (validator Group Service). */
  registrationDeadline: string;
}

export interface SpaceConfigPayload {
  name?: string | null;
  maxMembersPerGroup: number;
  bufferRatio: number;
  maxConcurrentApplies: number;
  registrationDeadline: string;
}

export interface FapStudent {
  studentCode: string;
  fullName: string;
  email: string;
  major: string;
  cohort?: string | null;
  classCode?: string | null;
}

export interface Enrollment {
  id: string;
  spaceId: string;
  studentId: string;
  studentCode: string;
  email: string;
  fullName: string;
  major: string;
  cohort: string;
  classCode?: string | null;
  enrolledAt: string;
  isProfileCompleted: boolean;
}

export interface RoomSummary {
  id: string;
  roomCode?: string | null;
  name: string;
  status: RoomStatus;
  memberCount: number;
  maxMembers: number;
  leaderId?: string | null;
  leaderName?: string | null;
  spaceId?: string | null;
  createdAt: string;
}

export interface GenerateRoomsResult {
  spaceId: string;
  totalStudents: number;
  totalRoomsGenerated: number;
  rooms: RoomSummary[];
}

export interface GroupMember {
  userId: string;
  fullName: string;
  role: 'Leader' | 'Member';
  slotId?: string | null;
  joinedAt: string;
  email?: string | null;
  studentCode?: string | null;
}

export interface GroupSlot {
  id: string;
  requiredMajor?: string | null;
  requiredSkills: string[];
  quantity: number;
  filled: number;
}

export interface GroupDetail {
  id: string;
  name: string;
  description?: string | null;
  leaderId?: string | null;
  leaderName?: string | null;
  projectId?: string | null;
  projectDomain?: string | null;
  memberCount: number;
  maxMembers: number;
  status: RoomStatus;
  members: GroupMember[];
  slots: GroupSlot[];
  createdAt: string;
  updatedAt: string;
  spaceId?: string | null;
  roomCode?: string | null;
  isClosedByLeader: boolean;
}

export interface ApplicationVote {
  voterId: string;
  voterName: string;
  isUpvote: boolean;
  comment?: string | null;
  votedAt: string;
}

export type JoinRequestStatus = 'Pending' | 'Accepted' | 'Rejected' | 'Cancelled';

export interface JoinRequest {
  id: string;
  groupId: string;
  groupName: string;
  slotId?: string | null;
  studentId: string;
  studentName: string;
  message?: string | null;
  status: JoinRequestStatus;
  createdAt: string;
  decidedAt?: string | null;
  upvotes: number;
  downvotes: number;
  votes?: ApplicationVote[] | null;
}

export interface ElectionVote {
  voterId: string;
  voterName: string;
  isAgree: boolean;
  votedAt: string;
}

export interface LeaderElection {
  id: string;
  groupId: string;
  candidateId: string;
  candidateName: string;
  initiatedById: string;
  initiatedByName: string;
  status: string;
  startedAt: string;
  expiresAt: string;
  completedAt?: string | null;
  totalAgreed: number;
  totalDisagreed: number;
  totalVotes: number;
  requiredVotesToPass: number;
  totalMembers: number;
  secondsRemaining: number;
  votes: ElectionVote[];
}

export interface DirectJoinResult {
  groupId: string;
  roomCode?: string | null;
  name: string;
  status: string;
  role: string;
  memberCount: number;
  maxMembers: number;
  joinedAt: string;
  message: string;
}

export interface MatchScore {
  userId: string;
  groupId: string;
  score: number;
  matchedSkills: string[];
  missingSkills: string[];
}

export interface UnmatchedStudent {
  userId: string;
  studentCode: string;
  fullName: string;
  email: string;
  major: string;
  cohort: string;
  techScore: number;
  managementScore: number;
  graphicDesignScore: number;
  marketingScore: number;
  saleScore: number;
}

export interface RoomMemberSummary {
  userId: string;
  fullName: string;
  major?: string | null;
  isLeader: boolean;
  joinedAt: string;
}

export interface RoomDistributionItem {
  roomId: string;
  roomCode: string;
  name: string;
  memberCount: number;
  maxMembers: number;
  leaderId?: string | null;
  leaderName?: string | null;
  members: RoomMemberSummary[];
}

export interface UnmatchedSummary {
  spaceId: string;
  semesterCode: string;
  subjectCode: string;
  status: SpaceStatus;
  totalEnrolled: number;
  totalMatched: number;
  totalUnmatched: number;
  unmatchedStudents: UnmatchedStudent[];
  incompleteRooms: RoomDistributionItem[];
  emptyRooms: RoomDistributionItem[];
  fullRooms: RoomDistributionItem[];
}

export interface AssignedStudent {
  userId: string;
  studentCode: string;
  fullName: string;
  major: string;
  isLeader: boolean;
  managementScore: number;
}

export interface RoomPlan {
  roomId: string;
  roomCode: string;
  name: string;
  leaderId?: string | null;
  leaderName: string;
  isNewlyFormed: boolean;
  memberCountBefore: number;
  memberCountAfter: number;
  addedStudents: AssignedStudent[];
  finalMembers: AssignedStudent[];
  balanceScore: number;
}

export interface DistributePreview {
  spaceId: string;
  totalUnmatched: number;
  totalDistributed: number;
  totalRemaining: number;
  roomPlans: RoomPlan[];
  undersizedRoomCodes?: string[] | null;
}

export interface DistributeConfirm {
  spaceId: string;
  totalDistributed: number;
  totalRemaining: number;
  updatedRoomsCount: number;
  confirmedRoomPlans: RoomPlan[];
}

export interface FinalizeResult {
  spaceId: string;
  status: string;
  lockedRoomsCount: number;
  rejectedRequestsCount: number;
  finalizedAt: string;
  unmatchedStudentsCount: number;
}

export type TransferStatus = 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';

export interface TransferRequest {
  id: string;
  spaceId: string;
  requesterStudentId: string;
  requesterStudentName: string;
  requesterStudentCode: string;
  fromGroupId: string;
  fromGroupCode: string;
  targetGroupId: string;
  targetGroupCode: string;
  swapWithStudentId?: string | null;
  swapWithStudentName?: string | null;
  swapWithStudentCode?: string | null;
  reason: string;
  status: TransferStatus;
  createdAt: string;
  decidedAt?: string | null;
  decisionReason?: string | null;
}

export interface RosterMember {
  studentId: string;
  studentCode: string;
  fullName: string;
  email: string;
  major: string;
  cohort: string;
  role: 'Leader' | 'Member' | string;
  techScore: number;
  managementScore: number;
  graphicDesignScore: number;
  marketingScore: number;
  saleScore: number;
  joinedAt: string;
}

export interface RosterGroup {
  groupId: string;
  roomCode: string;
  groupName: string;
  status: RoomStatus;
  memberCount: number;
  maxMembers: number;
  leaderId?: string | null;
  leaderName?: string | null;
  projectTitle?: string | null;
  members: RosterMember[];
}

export interface SpaceRoster {
  spaceId: string;
  semesterCode: string;
  subjectCode: string;
  name: string;
  status: SpaceStatus;
  totalStudents: number;
  totalGroups: number;
  lockedGroups: number;
  groups: RosterGroup[];
}

/** Hồ sơ công khai của sinh viên (User Service, POST /users/batch) — dùng để lấy điểm 5 kỹ năng. */
export interface CandidateProfile {
  userId: string;
  fullName: string;
  major?: string | null;
  cohort?: string | null;
  techScore: number;
  managementScore: number;
  graphicDesignScore: number;
  marketingScore: number;
  saleScore: number;
  isProfileCompleted: boolean;
  desiredRole?: string | null;
}

// ── Lời gọi API ─────────────────────────────────────────────────────────────

const data = <T,>(p: Promise<{ data: T }>) => p.then((r) => r.data);

export const workspaceApi = {
  // Không gian môn học
  listSpaces: () => data(apiClient.get<Space[]>('/spaces')),
  listMySpaces: () => data(apiClient.get<Space[]>('/spaces/my')),
  createSpace: (payload: CreateSpacePayload) => data(apiClient.post<Space>('/spaces', payload)),
  updateSpaceConfig: (id: string, payload: SpaceConfigPayload) =>
    data(apiClient.put<Space>(`/spaces/${id}/config`, payload)),
  deleteSpace: (id: string) => apiClient.delete(`/spaces/${id}`),
  importFap: (id: string, students: FapStudent[]) =>
    data(apiClient.post<number>(`/spaces/${id}/import-fap`, { students })),
  generateRooms: (id: string) => data(apiClient.post<GenerateRoomsResult>(`/spaces/${id}/generate-rooms`)),
  closeRegistration: (id: string) => data(apiClient.put<Space>(`/spaces/${id}/close-registration`)),
  listEnrollments: (id: string) => data(apiClient.get<Enrollment[]>(`/spaces/${id}/enrollments`)),

  /** API trả tối đa 50 phòng mỗi trang nên đọc lần lượt cho đủ. */
  listRooms: async (id: string): Promise<RoomSummary[]> => {
    const rooms: RoomSummary[] = [];
    for (let page = 1; ; page += 1) {
      const res = await apiClient.get<PagedResult<RoomSummary>>(`/spaces/${id}/rooms`, {
        params: { page, pageSize: 50 },
      });
      rooms.push(...res.data.items);
      if (page >= res.data.totalPages) break;
    }
    return rooms;
  },

  // Điều phối & chốt sổ
  getUnmatchedSummary: (id: string) => data(apiClient.get<UnmatchedSummary>(`/spaces/${id}/unmatched-summary`)),
  previewDistribution: (id: string) => data(apiClient.post<DistributePreview>(`/spaces/${id}/distribute-preview`)),
  confirmDistribution: (id: string) => data(apiClient.post<DistributeConfirm>(`/spaces/${id}/distribute-confirm`)),
  finalizeSpace: (id: string) => data(apiClient.post<FinalizeResult>(`/spaces/${id}/finalize`)),

  // Chuyển nhóm sau chốt sổ
  listTransferRequests: (id: string, status?: TransferStatus) =>
    data(apiClient.get<TransferRequest[]>(`/spaces/${id}/transfer-requests`, { params: { status } })),
  decideTransferRequest: (spaceId: string, requestId: string, approved: boolean, decisionReason?: string) =>
    data(
      apiClient.put<TransferRequest>(`/spaces/${spaceId}/transfer-requests/${requestId}/decide`, {
        approved,
        decisionReason: decisionReason || null,
      })
    ),
  directTransfer: (
    spaceId: string,
    payload: { studentId: string; targetGroupId: string; swapWithStudentId?: string | null; reason: string }
  ) => data(apiClient.post<TransferRequest>(`/spaces/${spaceId}/direct-transfer`, payload)),
  createTransferRequest: (
    spaceId: string,
    payload: { targetGroupId: string; swapWithStudentId?: string | null; reason: string }
  ) => data(apiClient.post<TransferRequest>(`/spaces/${spaceId}/transfer-requests`, payload)),
  listMyTransferRequests: () => data(apiClient.get<TransferRequest[]>('/transfer-requests/my')),
  cancelTransferRequest: (id: string) => data(apiClient.put<TransferRequest>(`/transfer-requests/${id}/cancel`)),

  // Roster & xuất CSV (Giảng viên / Điều phối viên)
  getRoster: (id: string) => data(apiClient.get<SpaceRoster>(`/spaces/${id}/roster`)),
  exportRosterCsv: (id: string) =>
    data(apiClient.get<Blob>(`/spaces/${id}/roster/export-csv`, { responseType: 'blob' })),

  // Phòng / nhóm
  getGroup: (id: string) => data(apiClient.get<GroupDetail>(`/groups/${id}`)),
  /** 204 (chưa có nhóm) trả về null. */
  getMyGroup: async (spaceId?: string): Promise<GroupDetail | null> => {
    const res = await apiClient.get<GroupDetail | ''>('/groups/my', { params: { spaceId } });
    return res.status === 204 || !res.data ? null : res.data;
  },
  updateGroup: (id: string, payload: { name: string; description?: string | null }) =>
    data(apiClient.put<GroupDetail>(`/groups/${id}`, payload)),
  directJoin: (id: string) => data(apiClient.post<DirectJoinResult>(`/groups/${id}/direct-join`)),
  leaveGroup: (id: string) => apiClient.post(`/groups/${id}/leave`),
  removeMember: (id: string, userId: string, reason: string) =>
    apiClient.post(`/groups/${id}/members/${userId}/remove`, { reason }),
  transferLeader: (id: string, newLeaderId: string) =>
    data(apiClient.put<GroupDetail>(`/groups/${id}/leader`, { newLeaderId })),
  closeRecruitment: (id: string) => data(apiClient.put<GroupDetail>(`/groups/${id}/close-recruitment`)),
  reopenRecruitment: (id: string) => data(apiClient.put<GroupDetail>(`/groups/${id}/reopen-recruitment`)),
  getMatchScore: (id: string) => data(apiClient.get<MatchScore>(`/groups/${id}/match-score`)),

  // Bầu Trưởng nhóm
  getCurrentElection: async (groupId: string): Promise<LeaderElection | null> => {
    const res = await apiClient.get<LeaderElection | ''>(`/groups/${groupId}/elections/current`);
    return res.status === 204 || !res.data ? null : res.data;
  },
  startElection: (groupId: string, candidateId: string) =>
    data(apiClient.post<LeaderElection>(`/groups/${groupId}/elections`, { candidateId })),
  voteElection: (groupId: string, electionId: string, isAgree: boolean) =>
    data(apiClient.post<LeaderElection>(`/groups/${groupId}/elections/${electionId}/vote`, { isAgree })),

  // Đơn ứng tuyển
  createJoinRequest: (groupId: string, message: string) =>
    data(apiClient.post<JoinRequest>(`/groups/${groupId}/join-requests`, { message })),
  listGroupJoinRequests: (groupId: string) =>
    data(
      apiClient.get<PagedResult<JoinRequest>>(`/groups/${groupId}/join-requests`, {
        params: { status: 'Pending', page: 1, pageSize: 50 },
      })
    ).then((r) => r.items),
  listMyJoinRequests: () =>
    data(apiClient.get<PagedResult<JoinRequest>>('/join-requests/my', { params: { page: 1, pageSize: 50 } })).then(
      (r) => r.items
    ),
  acceptJoinRequest: (id: string) => data(apiClient.put<JoinRequest>(`/join-requests/${id}/accept`)),
  rejectJoinRequest: (id: string) => data(apiClient.put<JoinRequest>(`/join-requests/${id}/reject`)),
  cancelJoinRequest: (id: string) => data(apiClient.put<JoinRequest>(`/join-requests/${id}/cancel`)),
  voteJoinRequest: (id: string, isUpvote: boolean, comment?: string) =>
    data(apiClient.post<JoinRequest>(`/join-requests/${id}/vote`, { isUpvote, comment: comment || null })),

  // Hồ sơ công khai (điểm 5 kỹ năng)
  getProfiles: async (userIds: string[]): Promise<CandidateProfile[]> => {
    if (userIds.length === 0) return [];
    return data(apiClient.post<CandidateProfile[]>('/users/batch', { userIds }));
  },
};

/** Lấy thông báo lỗi để hiển thị: ưu tiên `detail` của ProblemDetails (CLAUDE.md mục 10). */
export const errorMessage = (err: unknown, fallback = 'Đã có lỗi xảy ra. Vui lòng thử lại.'): string => {
  const e = err as {
    response?: { status?: number; data?: { detail?: string; title?: string; errors?: Record<string, string[]> } };
    message?: string;
  };
  const body = e?.response?.data;
  if (body?.errors) {
    const first = Object.values(body.errors).flat()[0];
    if (first) return first;
  }
  if (body?.detail) return body.detail;
  if (!e?.response) return 'Không kết nối được máy chủ. Vui lòng kiểm tra mạng và thử lại.';
  if (body?.title) return body.title;
  return fallback;
};

/** Mã lỗi nghiệp vụ (`code` trong ProblemDetails), để rẽ nhánh thay vì so sánh chuỗi. */
export const errorCode = (err: unknown): string | undefined =>
  (err as { response?: { data?: { code?: string } } })?.response?.data?.code;

export const SPACE_STATUS_LABEL: Record<SpaceStatus, string> = {
  Draft: 'Bản nháp cấu hình',
  Open: 'Đang mở đăng ký',
  ClosedRegistration: 'Đã đóng đăng ký',
  Locked: 'Đã chốt sổ',
};

/**
 * Tên hiển thị ngắn của không gian: mã môn + phần tên còn lại sau khi bỏ mã môn / mã học kỳ bị lặp.
 * Ví dụ "EXE101 — FA26" → "EXE101"; "Trải nghiệm Khởi nghiệp 1" → "EXE101 · Trải nghiệm Khởi nghiệp 1".
 */
export const spaceLabel = (space: Pick<Space, 'subjectCode' | 'semesterCode' | 'name'>): string => {
  const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const rest = space.name
    .replace(new RegExp(escape(space.subjectCode), 'gi'), '')
    .replace(new RegExp(escape(space.semesterCode), 'gi'), '')
    .replace(/^[\s—–\-·•|:]+|[\s—–\-·•|:]+$/g, '')
    .trim();
  return rest ? `${space.subjectCode} · ${rest}` : space.subjectCode;
};

export const SPACE_PHASE: Record<SpaceStatus, number> = {
  Draft: 1,
  Open: 2,
  ClosedRegistration: 3,
  Locked: 4,
};

export const ROOM_STATUS_LABEL: Record<RoomStatus, string> = {
  Empty: 'Phòng trống',
  Forming: 'Đang lập nhóm',
  Recruiting: 'Đang tuyển',
  Closed: 'Đã đóng tuyển',
  Locked: 'Đã chốt sổ',
  Disbanded: 'Đã giải tán',
};

export const formatDateTime = (iso?: string | null): string => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });
};
