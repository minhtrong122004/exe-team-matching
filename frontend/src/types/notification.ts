export type NotificationType =
  | 'Welcome'
  | 'JoinRequestReceived'
  | 'JoinRequestAccepted'
  | 'JoinRequestRejected'
  | 'InvitationReceived'
  | 'MemberJoined'
  | 'MemberLeft';

export interface NotificationResponse {
  id: string;
  recipientId: string;
  type: NotificationType | string;
  title: string;
  message: string;
  relatedEntityId?: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface UnreadCountResponse {
  unreadCount: number;
}

export interface MarkAllReadResponse {
  updatedCount: number;
}

export interface NotificationQueryParams {
  isRead?: boolean;
  page?: number;
  pageSize?: number;
}
