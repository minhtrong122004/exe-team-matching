import type { Major } from './user';
import type { ProjectDomain } from './index';

export type GroupStatusType = 'Recruiting' | 'Full' | 'Locked' | 'Archived';
export type MemberRole = 'Leader' | 'Member';
export type JoinRequestStatus = 'Pending' | 'Accepted' | 'Rejected' | 'Cancelled';
export type InvitationStatus = 'Pending' | 'Accepted' | 'Rejected' | 'Expired';

export interface GroupMemberResponse {
  id: string;
  userId: string;
  role: MemberRole;
  joinedAt: string;
}

export interface RecruitmentSlotResponse {
  id: string;
  roleName: string;
  major: Major | string;
  requiredSkills: string[];
  quantity: number;
}

export interface GroupResponse {
  id: string;
  name: string;
  description?: string | null;
  projectId?: string | null;
  leaderId: string;
  maxMembers: number;
  status: GroupStatusType | string;
  members: GroupMemberResponse[];
  slots: RecruitmentSlotResponse[];
  createdAt: string;
  updatedAt: string;
}

export interface GroupSummaryResponse {
  id: string;
  name: string;
  description?: string | null;
  projectId?: string | null;
  leaderId: string;
  maxMembers: number;
  memberCount: number;
  status: GroupStatusType | string;
  slots: RecruitmentSlotResponse[];
  createdAt: string;
}

export interface CreateSlotRequest {
  roleName: string;
  major: Major | string;
  requiredSkills?: string[];
  quantity: number;
}

export interface UpdateSlotRequest {
  roleName: string;
  major: Major | string;
  requiredSkills?: string[];
  quantity: number;
}

export interface CreateGroupRequest {
  name: string;
  description?: string;
  projectId?: string | null;
  maxMembers: number;
  slots?: CreateSlotRequest[];
}

export interface UpdateGroupRequest {
  name: string;
  description?: string;
  projectId?: string | null;
  maxMembers: number;
  status: GroupStatusType | string;
}

export interface TransferLeaderRequest {
  newLeaderId: string;
}

export interface GroupQueryParams {
  search?: string;
  status?: GroupStatusType | string;
  domain?: ProjectDomain | string;
  major?: Major | string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export interface JoinRequestResponse {
  id: string;
  groupId: string;
  groupName: string;
  userId: string;
  slotId?: string | null;
  message?: string | null;
  status: JoinRequestStatus;
  createdAt: string;
  decidedAt?: string | null;
}

export interface CreateJoinRequestPayload {
  slotId?: string | null;
  message?: string;
}

export interface InvitationResponse {
  id: string;
  groupId: string;
  groupName: string;
  invitedUserId: string;
  invitedByUserId: string;
  message?: string | null;
  status: InvitationStatus;
  expiresAt: string;
  createdAt: string;
  decidedAt?: string | null;
}

export interface CreateInvitationPayload {
  invitedUserId: string;
  message?: string;
}

export interface MatchScoreResponse {
  userId: string;
  groupId: string;
  score: number;
  matchedSkills: string[];
  missingSkills: string[];
}

export interface SuggestedGroupResponse {
  group: GroupSummaryResponse;
  score: number;
  matchedSkills: string[];
  missingSkills: string[];
}

export interface RankedCandidateResponse {
  userId: string;
  fullName: string;
  major?: string | null;
  desiredRole?: string | null;
  score: number;
  matchedSkills: string[];
  missingSkills: string[];
}

