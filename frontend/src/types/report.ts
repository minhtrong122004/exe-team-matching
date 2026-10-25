export type GroupStatStatus = 'Recruiting' | 'Full' | 'Locked' | 'Archived';

export interface MajorBreakdownItem {
  major: string;
  totalStudents: number;
  studentsInGroup: number;
  studentsWithoutGroup: number;
}

export interface ReportSummaryResponse {
  generatedAt: string;
  totalStudents: number;
  studentsInGroup: number;
  studentsWithoutGroup: number;
  totalGroups: number;
  recruitingGroups: number;
  fullGroups: number;
  byMajor: MajorBreakdownItem[];
}

export interface ReportSnapshotResponse {
  id: string;
  generatedAt: string;
  totalStudents: number;
  studentsInGroup: number;
  studentsWithoutGroup: number;
  totalGroups: number;
  recruitingGroups: number;
  fullGroups: number;
  byMajor: MajorBreakdownItem[];
}

export interface StudentWithoutGroupResponse {
  userId: string;
  email: string;
  fullName: string;
  major?: string | null;
  updatedAt: string;
}

export interface GroupReportItemResponse {
  groupId: string;
  name: string;
  leaderId: string;
  memberCount: number;
  maxMembers: number;
  status: GroupStatStatus | string;
  updatedAt: string;
}
