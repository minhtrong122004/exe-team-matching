import apiClient from './client';
import type {
  MarkAllReadResponse,
  NotificationQueryParams,
  NotificationResponse,
  PagedResult,
  UnreadCountResponse,
} from '../types';

export const notificationsApi = {
  getMyNotifications: async (
    params: NotificationQueryParams = {}
  ): Promise<PagedResult<NotificationResponse>> => {
    const response = await apiClient.get<PagedResult<NotificationResponse>>('/notifications', {
      params,
    });
    return response.data;
  },

  getUnreadCount: async (): Promise<UnreadCountResponse> => {
    const response = await apiClient.get<UnreadCountResponse>('/notifications/unread-count');
    return response.data;
  },

  markAsRead: async (id: string): Promise<NotificationResponse> => {
    const response = await apiClient.put<NotificationResponse>(`/notifications/${id}/read`);
    return response.data;
  },

  markAllAsRead: async (): Promise<MarkAllReadResponse> => {
    const response = await apiClient.put<MarkAllReadResponse>('/notifications/read-all');
    return response.data;
  },
};
