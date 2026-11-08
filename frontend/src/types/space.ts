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

