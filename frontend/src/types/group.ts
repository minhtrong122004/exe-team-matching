import type { Major } from './user';
import type { ProjectDomain } from './index';

export type GroupStatusType = 'Empty' | 'Forming' | 'Recruiting' | 'Closed' | 'Full' | 'Locked' | 'Archived' | 'Disbanded';
export type MemberRole = 'Leader' | 'Member';
export type JoinRequestStatus = 'Pending' | 'Accepted' | 'Rejected' | 'Cancelled';
export type InvitationStatus = 'Pending' | 'Accepted' | 'Rejected' | 'Expired';
export type ElectionStatus = 'Active' | 'Passed' | 'Rejected' | 'Expired';

export interface GroupMemberResponse {
  id: string;
  userId: string;
  role: MemberRole;
  joinedAt: string;
  fullName?: string;
  email?: string;
  studentCode?: string;
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
  spaceId?: string | null;
  roomCode?: string | null;
  name: string;
  description?: string | null;
  projectId?: string | null;
  leaderId: string | null;
  maxMembers: number;
  groupThreshold?: number;
  isClosedByLeader?: boolean;
  status: GroupStatusType | string;
  members: GroupMemberResponse[];
  slots: RecruitmentSlotResponse[];
  createdAt: string;
  updatedAt: string;
}

export interface GroupSummaryResponse {
  id: string;
  spaceId?: string | null;
  roomCode?: string | null;
  name: string;
  description?: string | null;
  projectId?: string | null;
  leaderId: string | null;
  maxMembers: number;
  memberCount: number;
  groupThreshold?: number;
  isClosedByLeader?: boolean;
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

export interface RemoveMemberRequest {
  reason: string;
  category?: string;
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

export interface ApplicationVoteResponse {
  voterId: string;
  voterName: string;
  isUpvote: boolean;
  comment?: string | null;
  votedAt: string;
}

export interface JoinRequestResponse {
  id: string;
  groupId: string;
  groupName: string;
  userId: string;
  studentId?: string;
  studentName?: string;
  slotId?: string | null;
  message?: string | null;
  status: JoinRequestStatus;
  createdAt: string;
  decidedAt?: string | null;
  upvotes?: number;
  downvotes?: number;
  votes?: ApplicationVoteResponse[];
}

export interface ElectionVoteResponse {
  voterId: string;
  voterName: string;
  isAgree: boolean;
  votedAt: string;
}

export interface LeaderElectionResponse {
  id: string;
  groupId: string;
  candidateId: string;
  candidateName: string;
  initiatedById: string;
  initiatedByName: string;
  status: ElectionStatus | string;
  startedAt: string;
  expiresAt: string;
  completedAt?: string | null;
  totalAgreed: number;
  totalDisagreed: number;
  totalVotes: number;
  requiredVotesToPass: number;
  totalMembers: number;
  secondsRemaining: number;
  votes: ElectionVoteResponse[];
}

export interface DirectJoinRoomResponse {
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

