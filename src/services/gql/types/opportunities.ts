// Enums (align with Opportunity Service GraphQL user API)
export enum OpportunityTypeEnum {
  EMPLOYMENT = 'EMPLOYMENT',
  SCHOLARSHIP = 'SCHOLARSHIP',
  INVESTMENT = 'INVESTMENT',
  FELLOWSHIP = 'FELLOWSHIP',
  INITIATIVE = 'INITIATIVE',
  GRANT = 'GRANT',
  PROGRAM = 'PROGRAM',
  VOLUNTEER = 'VOLUNTEER',
  CONTRACT = 'CONTRACT',
}

export enum ApplicationStatus {
  PENDING = 'PENDING',
  REVIEWING = 'REVIEWING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  WITHDRAWN = 'WITHDRAWN',
}

export interface OpportunityOwnerType {
  id: string;
  name: string;
  avatarUrl?: string;
  type: string;
}

// Re-export for backward compatibility
export const OpportunityType = OpportunityTypeEnum;

export interface FileRefType {
  path: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
}

// Opportunity Types (align with OpportunityType from API)
export interface Opportunity {
  id: string;
  ownerType: 'USER' | 'COMMUNITY' | 'ASSOCIATION';
  ownerId: string;
  owner?: OpportunityOwnerType;
  type: string;
  category: string;
  subCategory?: string | null;
  title: string;
  description: string;
  responsibilities?: string | null;
  requirements?: string | null;
  workMode?: 'REMOTE' | 'HYBRID' | 'ONSITE' | null;
  engagementType?: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | null;
  location?: string | null;
  visibility?: 'PUBLIC' | 'COMMUNITY_ONLY' | 'ASSOCIATION_ONLY';
  applicationMethod: 'EXTERNAL_LINK' | 'IN_PLATFORM_FORM' | 'EMAIL_REQUEST';
  externalLink?: string | null;
  applicationEmail?: string | null;
  status: 'DRAFT' | 'PUBLISHED' | 'CLOSED' | 'ARCHIVED';
  priorityLevel?: 'HIGH' | 'NORMAL' | 'LOW';
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryCurrency?: string | null;
  deadline?: string | null;
  applicationCount?: number | null;
  skills?: string[] | null;
  tags?: string[] | null;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string | null;
  closedAt?: string | null;
  /** Populated when authenticated */
  isSavedByCurrentUser?: boolean | null;
  hasCurrentUserApplied?: boolean | null;
  currentUserApplicationId?: string | null;
}

export interface CreateOpportunityInput {
  ownerType: string;
  ownerId: string;
  type: string;
  category: string;
  title: string;
  description: string;
  responsibilities?: string;
  requirements?: string;
  workMode?: string;
  engagementType?: string;
  location?: string;
  visibility: string;
  applicationMethod: string;
  externalLink?: string;
  applicationEmail?: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  deadline?: string;
  subCategory?: string;
  skills?: string[];
  tags?: string[];
}

export interface UpdateOpportunityInput {
  title?: string;
  description?: string;
  responsibilities?: string;
  requirements?: string;
  workMode?: string;
  engagementType?: string;
  location?: string;
  visibility?: string;
  applicationMethod?: string;
  externalLink?: string;
  applicationEmail?: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  deadline?: string;
}

export interface ListOpportunitiesInput {
  limit?: number;
  offset?: number;
  searchTerm?: string;
  type?: string;
  category?: string;
  subCategory?: string;
  workMode?: string;
  engagementType?: string;
  location?: string;
  ownerType?: string;
  ownerId?: string;
  status?: string;
  sortBy?: 'CREATED_AT' | 'DEADLINE' | 'SALARY' | 'RELEVANCE';
  sortOrder?: 'ASC' | 'DESC';
}

export interface GetOpportunityFeedInput {
  limit?: number;
  offset?: number;
  category?: string;
  type?: string;
}

export interface SetOpportunityPriorityInput {
  opportunityId: string;
  priorityLevel: 'HIGH' | 'NORMAL' | 'LOW';
}

// Application Types
export interface Application {
  id: string;
  opportunityId: string;
  applicantId: string;
  status: ApplicationStatus | string;
  resumeFileRef?: FileRefType | null;
  coverLetter?: string | null;
  customAnswers?: string | null;
  reviewNotes?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  updatedAt?: string | null;
  opportunity?: Opportunity | null;
}

export interface SubmitApplicationInput {
  opportunityId: string;
  applicationData: {
    fullName: string;
    email: string;
    phoneNumber?: string;
    linkedInProfile?: string;
    portfolioUrl?: string;
    coverLetter?: string;
    customAnswers?: string;
  };
  resumeFileRef?: {
    path: string;
    filename: string;
    mimeType: string;
    sizeBytes: number;
  };
}

export interface GetApplicationsInput {
  opportunityId: string;
  limit?: number;
  offset?: number;
  status?: string;
}

export interface GetUserApplicationsInput {
  limit?: number;
  offset?: number;
  status?: string;
}

export interface ReviewApplicationInput {
  applicationId: string;
  reviewNotes?: string;
}

// Saved Opportunities Types
export interface SavedOpportunity {
  id: string;
  opportunityId: string;
  userId: string;
  savedAt: string;
  opportunity?: Opportunity;
}

// Response Types
export interface OpportunitiesResponse {
  opportunities: Opportunity[];
  total: number;
}

export interface ApplicationsResponse {
  applications: Application[];
  total: number;
}

export interface SavedOpportunitiesResponse {
  savedOpportunities: SavedOpportunity[];
  total: number;
}

export interface UserApplicationsResponse {
  userApplications: {
    applications: Application[];
    total: number;
  };
}

export interface GetSavedOpportunitiesData {
  getSavedOpportunities: {
    savedOpportunities: SavedOpportunity[];
    total: number;
  };
}

export interface ListOpportunitiesResponse {
  opportunities: {
    opportunities: Opportunity[];
    total: number;
  };
}

// GraphQL response types for use with useQuery/useMutation
export interface GetOpportunityData {
  getOpportunity: Opportunity | null;
}

export interface CreateOpportunityData {
  createOpportunity: { id: string; title?: string; status?: string; createdAt?: string };
}

export interface SubmitApplicationData {
  submitApplication: string | boolean;
}

export interface SaveOpportunityData {
  saveOpportunity: string | boolean;
}

export interface UnsaveOpportunityData {
  unsaveOpportunity: string | boolean;
}

export interface GetOpportunityFeedData {
  getOpportunityFeed: {
    opportunities: Opportunity[];
    total: number;
  };
}

export interface GetApplicationData {
  application: Application | null;
}

export interface WithdrawApplicationData {
  withdrawApplication: boolean;
}