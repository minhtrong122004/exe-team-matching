import apiClient from './client';
import type {
  GroupReportItemResponse,
  GroupStatStatus,
  PagedResult,
  ReportSnapshotResponse,
  ReportSummaryResponse,
  StudentWithoutGroupResponse,
} from '../types';

export const reportsApi = {
  getSummary: async (): Promise<ReportSummaryResponse> => {
    const response = await apiClient.get<ReportSummaryResponse>('/reports/summary');
    return response.data;
  },

  getSnapshots: async (params: { page?: number; pageSize?: number } = {}): Promise<
    PagedResult<ReportSnapshotResponse>
  > => {
    const response = await apiClient.get<PagedResult<ReportSnapshotResponse>>(
      '/reports/snapshots',
      { params }
    );
    return response.data;
  },

  exportSummaryCsv: async (): Promise<Blob> => {
    const response = await apiClient.get<Blob>('/reports/summary/export', {
      responseType: 'blob',
    });
    return response.data;
  },

  getStudentsWithoutGroup: async (
    params: { major?: string; page?: number; pageSize?: number } = {}
  ): Promise<PagedResult<StudentWithoutGroupResponse>> => {
    const response = await apiClient.get<PagedResult<StudentWithoutGroupResponse>>(
      '/reports/students-without-group',
      { params }
    );
    return response.data;
  },

  getGroups: async (
    params: { status?: GroupStatStatus | ''; page?: number; pageSize?: number } = {}
  ): Promise<PagedResult<GroupReportItemResponse>> => {
    const cleanParams = {
      ...params,
      status: params.status || undefined,
    };
    const response = await apiClient.get<PagedResult<GroupReportItemResponse>>('/reports/groups', {
      params: cleanParams,
    });
    return response.data;
  },
};
