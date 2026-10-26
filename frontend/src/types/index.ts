export * from './auth';
export * from './user';
export * from './notification';
export * from './report';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: import('./auth').UserRole;
  studentCode?: string;
  campus?: string;
  major?: string;
}

export type ProjectDomain = 
  | 'EdTech' 
  | 'FinTech' 
  | 'ECommerce' 
  | 'FnB' 
  | 'Health' 
  | 'Tourism' 
  | 'Other';

export type ProjectStatus = 
  | 'Draft' 
  | 'Recruiting' 
  | 'Active' 
  | 'Completed' 
  | 'Cancelled';

export interface ProjectItem {
  id: string;
  ownerId: string;
  title: string;
  problem: string;
  solution: string;
  domain: ProjectDomain;
  status: ProjectStatus;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectPayload {
  title: string;
  problem: string;
  solution: string;
  domain: ProjectDomain;
  tags: string[];
}

export interface UpdateProjectPayload {
  title: string;
  problem: string;
  solution: string;
  domain: ProjectDomain;
  status: ProjectStatus;
  tags: string[];
}

export interface PagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasPrevious?: boolean;
  hasNext?: boolean;
}

export type GroupStatus = 'Recruiting' | 'Full' | 'Locked' | 'Disbanded';

export interface GroupItem {
  id: string;
  name: string;
  leaderId: string;
  projectId: string;
  projectTitle?: string;
  domain?: string;
  maxMembers: number;
  memberCount: number;
  status: GroupStatus;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}
