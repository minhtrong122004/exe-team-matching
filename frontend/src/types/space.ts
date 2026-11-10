export type CourseSpaceStatus = 'Draft' | 'Open' | 'ClosedRegistration' | 'Locked';

export type RoomStatus = 'Empty' | 'Forming' | 'Recruiting' | 'Closed' | 'Locked' | 'Full' | 'Disbanded';

export interface CourseSpaceResponse {
  id: string;
  semesterCode: string;
  subjectCode: string;
  name: string;
  maxMembersPerGroup: number;
  groupThreshold: number;
  bufferRatio: number;
  maxConcurrentApplies: number;
  registrationDeadline: string | null;
  status: CourseSpaceStatus;
  totalStudents?: number;
  totalRooms?: number;
  totalEligibleStudents?: number;
  totalRoomsGenerated?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCourseSpaceRequest {
  semesterCode: string;
  subjectCode: string;
  name: string;
  maxMembersPerGroup: number;
  bufferRatio: number;
  maxConcurrentApplies: number;
  registrationDeadline?: string | null;
}

export interface UpdateSpaceConfigRequest {
  maxMembersPerGroup: number;
  bufferRatio: number;
  maxConcurrentApplies: number;
  registrationDeadline?: string | null;
  status: CourseSpaceStatus;
}

export interface FapStudentItem {
  studentCode: string;
  email: string;
  fullName: string;
  major: string;
  cohort?: string | null;
  classCode?: string | null;
}

export interface ImportFapStudentsRequest {
  students: FapStudentItem[];
}

export interface SpaceEnrollmentResponse {
  id: string;
  spaceId: string;
  studentId: string;
  studentCode: string;
  email: string;
  fullName: string;
  major: string;
  cohort?: string | null;
  classCode?: string | null;
  enrolledAt: string;
  isProfileCompleted?: boolean;
}

export interface GenerateRoomsResponse {
  spaceId: string;
  semesterCode?: string;
  subjectCode?: string;
  totalStudents: number;
  maxMembersPerGroup: number;
  bufferRatio: number;
  totalRoomsGenerated: number;
  rooms?: RoomSummaryResponse[];
  roomsCreated?: number;
  roomCodes?: string[];
}

export interface RoomSummaryResponse {
  id: string;
  spaceId?: string | null;
  roomCode?: string | null;
  name: string;
  leaderId?: string | null;
  leaderName?: string | null;
  memberCount: number;
  maxMembers: number;
  status: RoomStatus | string;
  isClosedByLeader?: boolean;
  createdAt?: string | null;
}

export type TransferRequestStatus = 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';

export interface TransferRequestResponse {
  id: string;
  spaceId: string;
  studentId: string;
  studentName: string;
  studentCode: string;
  fromGroupId: string;
  fromGroupCode: string;
  targetGroupId: string;
  targetGroupCode: string;
  swapStudentId?: string | null;
  swapStudentName?: string | null;
  swapStudentCode?: string | null;
  reason: string;
  status: TransferRequestStatus;
  decisionReason?: string | null;
  moderatorId?: string | null;
  requestedAt: string;
  decidedAt?: string | null;
}

export interface CreateTransferRequest {
  targetGroupId: string;
  swapStudentId?: string | null;
  reason: string;
}

export interface DirectTransferRequest {
  studentId: string;
  targetGroupId: string;
  swapStudentId?: string | null;
  reason: string;
}

export interface DecideTransferRequest {
  status: 'Approved' | 'Rejected';
  decisionReason?: string | null;
}

export interface SpaceRosterMemberItem {
  studentId: string;
  studentCode: string;
  fullName: string;
  email: string;
  major: string;
  isLeader: boolean;
  techScore: number;
  managementScore: number;
  designScore: number;
  marketingScore: number;
  saleScore: number;
  joinedAt: string;
}

export interface SpaceRosterGroupItem {
  groupId: string;
  groupCode: string;
  name: string;
  status: string;
  memberCount: number;
  maxMembers: number;
  projectIdeaId?: string | null;
  projectIdeaTitle?: string | null;
  projectIdeaDescription?: string | null;
  members: SpaceRosterMemberItem[];
}

export interface SpaceRosterResponse {
  spaceId: string;
  semesterCode: string;
  subjectCode: string;
  spaceName: string;
  status: string;
  maxMembersPerGroup: number;
  groupThreshold: number;
  totalGroups: number;
  totalStudents: number;
  groups: SpaceRosterGroupItem[];
}


