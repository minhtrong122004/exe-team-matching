import apiClient from './client';
import type {
  CourseSpaceResponse,
  CreateCourseSpaceRequest,
  UpdateSpaceConfigRequest,
  ImportFapStudentsRequest,
  SpaceEnrollmentResponse,
  GenerateRoomsResponse,
  RoomSummaryResponse,
} from '../types/space';

export const spacesApi = {
  createSpace: async (data: CreateCourseSpaceRequest): Promise<CourseSpaceResponse> => {
    const res = await apiClient.post<CourseSpaceResponse>('/spaces', data);
    return res.data;
  },

  getAllSpaces: async (params?: { semesterCode?: string; status?: string }): Promise<CourseSpaceResponse[]> => {
    const res = await apiClient.get<CourseSpaceResponse[]>('/spaces', { params });
    return res.data;
  },

  getMySpaces: async (): Promise<CourseSpaceResponse[]> => {
    const res = await apiClient.get<CourseSpaceResponse[]>('/spaces/my');
    return res.data;
  },

  getSpaceById: async (id: string): Promise<CourseSpaceResponse> => {
    const res = await apiClient.get<CourseSpaceResponse>(`/spaces/${id}`);
    return res.data;
  },

  updateSpaceConfig: async (id: string, data: UpdateSpaceConfigRequest): Promise<CourseSpaceResponse> => {
    const res = await apiClient.put<CourseSpaceResponse>(`/spaces/${id}/config`, data);
    return res.data;
  },

  importFapStudents: async (id: string, data: ImportFapStudentsRequest): Promise<number> => {
    const res = await apiClient.post<number>(`/spaces/${id}/import-fap`, data);
    return res.data;
  },

  syncMockFapStudents: async (id: string): Promise<number> => {
    const res = await apiClient.post<number>(`/spaces/${id}/sync-mock-fap`);
    return res.data;
  },

  generateRooms: async (id: string): Promise<GenerateRoomsResponse> => {
    const res = await apiClient.post<GenerateRoomsResponse>(`/spaces/${id}/generate-rooms`);
    return res.data;
  },

  getSpaceEnrollments: async (id: string): Promise<SpaceEnrollmentResponse[]> => {
    const res = await apiClient.get<SpaceEnrollmentResponse[]>(`/spaces/${id}/enrollments`);
    return res.data;
  },

  getSpaceRooms: async (id: string, status?: string): Promise<RoomSummaryResponse[]> => {
    const res = await apiClient.get<RoomSummaryResponse[]>(`/spaces/${id}/rooms`, { params: { status } });
    return res.data;
  },
};

