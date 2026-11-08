import apiClient from './client';
import type {
  PagedResult,
  GroupResponse,
  GroupSummaryResponse,
  CreateGroupRequest,
  UpdateGroupRequest,
  CreateSlotRequest,
  UpdateSlotRequest,
  RecruitmentSlotResponse,
  TransferLeaderRequest,
  RemoveMemberRequest,
  GroupQueryParams,
  JoinRequestResponse,
  CreateJoinRequestPayload,
  InvitationResponse,
  CreateInvitationPayload,
  MatchScoreResponse,
  SuggestedGroupResponse,
  RankedCandidateResponse,
  LeaderElectionResponse,
  DirectJoinRoomResponse,
} from '../types';

export const groupsApi = {
  // ── 1. Group Discovery & Lifecycle ─────────────────────────────────────────
  async getGroups(params?: GroupQueryParams): Promise<PagedResult<GroupSummaryResponse>> {
    const res = await apiClient.get<PagedResult<GroupSummaryResponse>>('/groups', { params });
    return res.data;
  },

  async getMyGroup(): Promise<GroupResponse | null> {
    try {
      const res = await apiClient.get<GroupResponse>('/groups/my');
      return res.data;
    } catch (err: any) {
      if (err?.response?.status === 404) {
        return null;
      }
      throw err;
    }
  },

  async getGroupById(id: string): Promise<GroupResponse> {
    const res = await apiClient.get<GroupResponse>(`/groups/${id}`);
    return res.data;
  },

  async createGroup(payload: CreateGroupRequest): Promise<GroupResponse> {
    const res = await apiClient.post<GroupResponse>('/groups', payload);
    return res.data;
  },

  async updateGroup(id: string, payload: UpdateGroupRequest): Promise<GroupResponse> {
    const res = await apiClient.put<GroupResponse>(`/groups/${id}`, payload);
    return res.data;
  },

  async disbandGroup(id: string): Promise<void> {
    await apiClient.delete(`/groups/${id}`);
  },

  // ── 2. Recruitment Slots ───────────────────────────────────────────────────
  async addSlot(groupId: string, payload: CreateSlotRequest): Promise<RecruitmentSlotResponse> {
    const res = await apiClient.post<RecruitmentSlotResponse>(`/groups/${groupId}/slots`, payload);
    return res.data;
  },

  async updateSlot(
    groupId: string,
    slotId: string,
    payload: UpdateSlotRequest
  ): Promise<RecruitmentSlotResponse> {
    const res = await apiClient.put<RecruitmentSlotResponse>(
      `/groups/${groupId}/slots/${slotId}`,
      payload
    );
    return res.data;
  },

  async deleteSlot(groupId: string, slotId: string): Promise<void> {
    await apiClient.delete(`/groups/${groupId}/slots/${slotId}`);
  },

  // ── 3. Members & Leadership ────────────────────────────────────────────────
  async removeMember(groupId: string, userId: string, payload?: RemoveMemberRequest): Promise<void> {
    if (payload) {
      await apiClient.post(`/groups/${groupId}/members/${userId}/remove`, payload);
    } else {
      await apiClient.delete(`/groups/${groupId}/members/${userId}`);
    }
  },

  async leaveGroup(groupId: string): Promise<void> {
    await apiClient.post(`/groups/${groupId}/leave`);
  },

  async transferLeadership(groupId: string, payload: TransferLeaderRequest): Promise<GroupResponse> {
    const res = await apiClient.put<GroupResponse>(`/groups/${groupId}/leader`, payload);
    return res.data;
  },

  // ── 4. Matching Service (gRPC via Group Service) ───────────────────────────
  async getSuggestedGroups(limit = 10): Promise<SuggestedGroupResponse[]> {
    const res = await apiClient.get<SuggestedGroupResponse[]>('/groups/suggestions', {
      params: { limit },
    });
    return res.data;
  },

  async getMatchScore(groupId: string): Promise<MatchScoreResponse> {
    const res = await apiClient.get<MatchScoreResponse>(`/groups/${groupId}/match-score`);
    return res.data;
  },

  async getRankedCandidates(groupId: string, limit = 10): Promise<RankedCandidateResponse[]> {
    const res = await apiClient.get<RankedCandidateResponse[]>(`/groups/${groupId}/candidates`, {
      params: { limit },
    });
    return res.data;
  },

  // ── 5. Join Requests ───────────────────────────────────────────────────────
  async createJoinRequest(
    groupId: string,
    payload: CreateJoinRequestPayload
  ): Promise<JoinRequestResponse> {
    const res = await apiClient.post<JoinRequestResponse>(
      `/groups/${groupId}/join-requests`,
      payload
    );
    return res.data;
  },

  async getGroupJoinRequests(
    groupId: string,
    params?: { status?: string; page?: number; pageSize?: number }
  ): Promise<PagedResult<JoinRequestResponse>> {
    const res = await apiClient.get<PagedResult<JoinRequestResponse>>(
      `/groups/${groupId}/join-requests`,
      { params }
    );
    return res.data;
  },

  async getMyJoinRequests(params?: {
    status?: string;
    page?: number;
    pageSize?: number;
  }): Promise<PagedResult<JoinRequestResponse>> {
    const res = await apiClient.get<PagedResult<JoinRequestResponse>>('/join-requests/my', {
      params,
    });
    return res.data;
  },

  async acceptJoinRequest(requestId: string): Promise<JoinRequestResponse> {
    const res = await apiClient.put<JoinRequestResponse>(`/join-requests/${requestId}/accept`);
    return res.data;
  },

  async rejectJoinRequest(requestId: string): Promise<JoinRequestResponse> {
    const res = await apiClient.put<JoinRequestResponse>(`/join-requests/${requestId}/reject`);
    return res.data;
  },

  async cancelJoinRequest(requestId: string): Promise<JoinRequestResponse> {
    const res = await apiClient.put<JoinRequestResponse>(`/join-requests/${requestId}/cancel`);
    return res.data;
  },

  // ── 6. Invitations ─────────────────────────────────────────────────────────
  async createInvitation(
    groupId: string,
    payload: CreateInvitationPayload
  ): Promise<InvitationResponse> {
    const res = await apiClient.post<InvitationResponse>(
      `/groups/${groupId}/invitations`,
      payload
    );
    return res.data;
  },

  async getMyInvitations(params?: {
    status?: string;
    page?: number;
    pageSize?: number;
  }): Promise<PagedResult<InvitationResponse>> {
    const res = await apiClient.get<PagedResult<InvitationResponse>>('/invitations/my', {
      params,
    });
    return res.data;
  },

  async acceptInvitation(invitationId: string): Promise<InvitationResponse> {
    const res = await apiClient.put<InvitationResponse>(`/invitations/${invitationId}/accept`);
    return res.data;
  },

  async rejectInvitation(invitationId: string): Promise<InvitationResponse> {
    const res = await apiClient.put<InvitationResponse>(`/invitations/${invitationId}/reject`);
    return res.data;
  },

  // ── 7. Phase 4: Room Lifecycle, Direct Join, Early Close & Leader Elections ──
  async directJoinRoom(groupId: string): Promise<DirectJoinRoomResponse> {
    const res = await apiClient.post<DirectJoinRoomResponse>(`/groups/${groupId}/direct-join`);
    return res.data;
  },

  async closeRecruitment(groupId: string): Promise<GroupResponse> {
    const res = await apiClient.put<GroupResponse>(`/groups/${groupId}/close-recruitment`);
    return res.data;
  },

  async reopenRecruitment(groupId: string): Promise<GroupResponse> {
    const res = await apiClient.put<GroupResponse>(`/groups/${groupId}/reopen-recruitment`);
    return res.data;
  },

  async startElection(groupId: string, candidateId: string): Promise<LeaderElectionResponse> {
    const res = await apiClient.post<LeaderElectionResponse>(`/groups/${groupId}/elections`, {
      candidateId,
    });
    return res.data;
  },

  async voteElection(
    groupId: string,
    electionId: string,
    isAgree: boolean
  ): Promise<LeaderElectionResponse> {
    const res = await apiClient.post<LeaderElectionResponse>(
      `/groups/${groupId}/elections/${electionId}/vote`,
      { isAgree }
    );
    return res.data;
  },

  async getCurrentElection(groupId: string): Promise<LeaderElectionResponse | null> {
    try {
      const res = await apiClient.get<LeaderElectionResponse>(`/groups/${groupId}/elections/current`);
      if (res.status === 204 || !res.data) {
        return null;
      }
      return res.data;
    } catch (err: any) {
      if (err?.response?.status === 204 || err?.response?.status === 404) {
        return null;
      }
      throw err;
    }
  },

  async voteApplication(
    requestId: string,
    isUpvote: boolean,
    comment?: string
  ): Promise<JoinRequestResponse> {
    const res = await apiClient.post<JoinRequestResponse>(`/join-requests/${requestId}/vote`, {
      isUpvote,
      comment: comment?.trim() || undefined,
    });
    return res.data;
  },
};

