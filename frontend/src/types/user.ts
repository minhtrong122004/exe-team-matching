// Types for User Service and Skills API (CLAUDE.md sections 6, 10)

export type Major = 'SE' | 'AI' | 'IA' | 'GD' | 'MKT' | 'IB' | 'Other';

export type UserAvailability = 'LookingForTeam' | 'InTeam' | 'NotLooking';

export type SkillCategory = 'Technical' | 'Design' | 'Business' | 'Marketing';

export interface SkillResponse {
  id: string;
  name: string;
  category: SkillCategory;
  description?: string | null;
  createdAt: string;
}

export interface UserSkillResponse {
  skillId: string;
  skillName: string;
  category: SkillCategory;
  level: number; // 1 to 5
  createdAt: string;
}

export interface UserProfileResponse {
  userId: string;
  email: string;
  fullName: string;
  role: string;
  studentCode?: string | null;
  campus?: string | null;
  major?: Major | null;
  bio?: string | null;
  desiredRole?: string | null;
  availability: UserAvailability;
  interests: string[];
  skills: UserSkillResponse[];
  createdAt: string;
  updatedAt: string;
}

export interface CandidateProfileResponse {
  userId: string;
  fullName: string;
  role: string;
  campus?: string | null;
  major?: Major | null;
  bio?: string | null;
  desiredRole?: string | null;
  availability: UserAvailability;
  interests: string[];
  skills: UserSkillResponse[];
  createdAt: string;
  updatedAt: string;
}

export interface UpdateUserProfileRequest {
  fullName: string;
  studentCode?: string | null;
  campus?: string | null;
  major?: Major | null;
  bio?: string | null;
  desiredRole?: string | null;
  availability?: UserAvailability;
  interests?: string[] | null;
}

export interface UserSkillItemRequest {
  skillId: string;
  level: number;
}

export interface BatchSetUserSkillsRequest {
  skills: UserSkillItemRequest[];
}

export interface UpdateUserSkillProficiencyRequest {
  level: number;
}

export interface UserSearchFilter {
  search?: string;
  major?: Major;
  skill?: string;
  availability?: UserAvailability;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}
