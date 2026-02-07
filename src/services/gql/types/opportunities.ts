// Opportunity Types
export interface Opportunity {
  id: string;
  ownerType: 'USER' | 'COMMUNITY' | 'ASSOCIATION';
  ownerId: string;
  type: 'EMPLOYMENT' | 'SCHOLARSHIP' | 'INVESTMENT' | 'FELLOWSHIP' | 'INITIATIVE' | 'GRANT' | 'PROGRAM' | 'VOLUNTEER' | 'CONTRACT';
  category: 'EMPLOYMENT_CAREER' | 'EDUCATION_TRAINING' | 'FUNDING_GRANTS' | 'FELLOWSHIPS_LEADERSHIP' | 'BUSINESS_INVESTMENT' | 'VOLUNTEERING_SOCIAL_IMPACT';
  title: string;
  description: string;
  responsibilities?: string;
  requirements?: string;
  workMode?: 'REMOTE' | 'HYBRID' | 'ONSITE';
  engagementType?: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT';
  location?: string;
  visibility: 'PUBLIC' | 'COMMUNITY_ONLY' | 'ASSOCIATION_ONLY';
  applicationMethod: 'EXTERNAL_LINK' | 'IN_PLATFORM_FORM' | 'EMAIL_REQUEST';
  externalLink?: string;
  applicationEmail?: string;
  status: 'DRAFT' | 'PUBLISHED' | 'CLOSED' | 'ARCHIVED';
  priorityLevel: 'HIGH' | 'NORMAL' | 'LOW';
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  deadline?: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  closedAt?: string;
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
  workMode?: string;
  location?: string;
  status?: string;
}

export interface GetOpportunityFeedInput {
  limit?: number;
  offset?: number;
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
  status: 'PENDING' | 'REVIEWING' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN';
  resumeFileRef?: string;
  coverLetter?: string;
  customAnswers?: string;
  reviewNotes?: string;
  createdAt: string;
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