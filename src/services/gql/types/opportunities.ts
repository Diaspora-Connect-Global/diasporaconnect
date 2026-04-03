import type { Profile } from './profile';

// ─── Enums ────────────────────────────────────────────────────────────────────

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

export enum OpportunityCategoryEnum {
  EMPLOYMENT_CAREER = 'EMPLOYMENT_CAREER',
  EDUCATION_TRAINING = 'EDUCATION_TRAINING',
  FUNDING_GRANTS = 'FUNDING_GRANTS',
  FELLOWSHIPS_LEADERSHIP = 'FELLOWSHIPS_LEADERSHIP',
  BUSINESS_INVESTMENT = 'BUSINESS_INVESTMENT',
  VOLUNTEERING_SOCIAL_IMPACT = 'VOLUNTEERING_SOCIAL_IMPACT',
  EVENT_CREATIVE_INDUSTRY = 'EVENT_CREATIVE_INDUSTRY',
  AGRICULTURE_SUSTAINABILITY = 'AGRICULTURE_SUSTAINABILITY',
  REAL_ESTATE_INFRASTRUCTURE = 'REAL_ESTATE_INFRASTRUCTURE',
  GOVERNMENT_EMBASSY_INITIATIVES = 'GOVERNMENT_EMBASSY_INITIATIVES',
  INNOVATION_RESEARCH = 'INNOVATION_RESEARCH',
  FINANCE_ECONOMICS = 'FINANCE_ECONOMICS',
  RETURN_REINTEGRATION = 'RETURN_REINTEGRATION',
}

export enum DeliveryModeEnum {
  REMOTE = 'REMOTE',
  IN_PERSON = 'IN_PERSON',
  HYBRID = 'HYBRID',
  ONLINE = 'ONLINE',
}

export enum CommitmentTypeEnum {
  FULL_TIME = 'FULL_TIME',
  PART_TIME = 'PART_TIME',
  CONTRACT = 'CONTRACT',
  ONE_TIME = 'ONE_TIME',
  FLEXIBLE = 'FLEXIBLE',
  PROJECT_BASED = 'PROJECT_BASED',
  ONGOING = 'ONGOING',
}

export enum CompensationTypeEnum {
  SALARY = 'SALARY',
  GRANT = 'GRANT',
  STIPEND = 'STIPEND',
  INVESTMENT = 'INVESTMENT',
  PRIZE = 'PRIZE',
  EQUITY = 'EQUITY',
  HONORARIUM = 'HONORARIUM',
  NONE = 'NONE',
}

export enum VisibilityEnum {
  PUBLIC = 'PUBLIC',
  COMMUNITY_ONLY = 'COMMUNITY_ONLY',
  ASSOCIATION_ONLY = 'ASSOCIATION_ONLY',
}

export enum ApplicationMethodEnum {
  EXTERNAL_LINK = 'EXTERNAL_LINK',
  IN_PLATFORM_FORM = 'IN_PLATFORM_FORM',
  EMAIL_REQUEST = 'EMAIL_REQUEST',
}

export enum OwnerTypeEnum {
  USER = 'USER',
  COMMUNITY = 'COMMUNITY',
  ASSOCIATION = 'ASSOCIATION',
}

export enum OpportunityStatusEnum {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  CLOSED = 'CLOSED',
  ARCHIVED = 'ARCHIVED',
}

export enum PriorityLevelEnum {
  HIGH = 'HIGH',
  NORMAL = 'NORMAL',
  LOW = 'LOW',
}

export enum ApplicationStatusEnum {
  PENDING = 'PENDING',
  REVIEWING = 'REVIEWING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  WITHDRAWN = 'WITHDRAWN',
}

// Re-export for backward compatibility
export const OpportunityType = OpportunityTypeEnum;
export const WorkModeEnum = DeliveryModeEnum;
export const EngagementTypeEnum = CommitmentTypeEnum;
export const ApplicationStatus = ApplicationStatusEnum;

export type FormFieldType = 'text' | 'email' | 'textarea' | 'file_upload';

// ─── Objects ──────────────────────────────────────────────────────────────────

export interface FormField {
  key: string;
  label: string;
  type: FormFieldType;
  required: boolean;
}

export interface FormFieldInput {
  key: string;
  label: string;
  type: FormFieldType;
  required: boolean;
}

export interface OpportunityOwnerType {
  id: string;
  name: string;
  avatarUrl?: string;
  type: string;
}

export interface FileRefType {
  path: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
}

export interface Opportunity {
  id: string;
  ownerType?: OwnerTypeEnum | 'USER' | 'COMMUNITY' | 'ASSOCIATION';
  ownerId?: string;
  owner?: OpportunityOwnerType;
  type: OpportunityTypeEnum | string;
  category: OpportunityCategoryEnum | string;
  subCategory?: string | null;
  title: string;
  description: string;
  scope?: string | null;
  eligibilityCriteria?: string | null;
  deliveryMode?: DeliveryModeEnum | 'REMOTE' | 'IN_PERSON' | 'HYBRID' | 'ONLINE' | null;
  commitmentType?: CommitmentTypeEnum | 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'ONE_TIME' | 'FLEXIBLE' | 'PROJECT_BASED' | 'ONGOING' | null;
  location?: string | null;
  duration?: string | null;
  visibility?: VisibilityEnum | 'PUBLIC' | 'COMMUNITY_ONLY' | 'ASSOCIATION_ONLY';
  applicationMethod: ApplicationMethodEnum | 'EXTERNAL_LINK' | 'IN_PLATFORM_FORM' | 'EMAIL_REQUEST';
  externalLink?: string | null;
  applicationEmail?: string | null;
  formFields?: FormField[] | null;
  status: OpportunityStatusEnum | 'DRAFT' | 'PUBLISHED' | 'CLOSED' | 'ARCHIVED';
  priorityLevel?: PriorityLevelEnum | 'HIGH' | 'NORMAL' | 'LOW';
  compensationMin?: number | null;
  compensationMax?: number | null;
  compensationCurrency?: string | null;
  compensationType?: CompensationTypeEnum | 'SALARY' | 'GRANT' | 'STIPEND' | 'INVESTMENT' | 'PRIZE' | 'EQUITY' | 'HONORARIUM' | 'NONE' | null;
  benefitsSummary?: string | null;
  eligibilityRegions?: string[] | null;
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
  visibility: string;
  applicationMethod: string;
  scope?: string;
  eligibilityCriteria?: string;
  deliveryMode?: string;
  commitmentType?: string;
  location?: string;
  externalLink?: string;
  applicationEmail?: string;
  formFields?: FormFieldInput[];
  compensationMin?: number;
  compensationMax?: number;
  compensationCurrency?: string;
  compensationType?: string;
  duration?: string;
  eligibilityRegions?: string[];
  benefitsSummary?: string;
  deadline?: string;
  subCategory?: string;
  skills?: string[];
  tags?: string[];
}

export interface UpdateOpportunityInput {
  ownerType?: string;
  ownerId?: string;
  type?: string;
  category?: string;
  title?: string;
  description?: string;
  visibility?: string;
  scope?: string;
  eligibilityCriteria?: string;
  deliveryMode?: string;
  commitmentType?: string;
  location?: string;
  applicationMethod?: string;
  externalLink?: string;
  applicationEmail?: string;
  formFields?: FormFieldInput[];
  compensationMin?: number;
  compensationMax?: number;
  compensationCurrency?: string;
  compensationType?: string;
  duration?: string;
  eligibilityRegions?: string[];
  benefitsSummary?: string;
  deadline?: string;
  subCategory?: string;
  skills?: string[];
  tags?: string[];
}

export interface ListOpportunitiesInput {
  limit?: number;
  offset?: number;
  searchTerm?: string;
  type?: string;
  category?: string;
  subCategory?: string;
  deliveryMode?: string;
  commitmentType?: string;
  location?: string;
  ownerType?: string;
  ownerId?: string;
  sortBy?: 'createdAt' | 'title' | 'deadline' | 'applicationCount';
  sortOrder?: 'ASC' | 'DESC';
}

export interface GetOpportunityFeedInput {
  limit?: number;
  offset?: number;
  category?: string;
  type?: string;
}

// Application Types

export interface Application {
  id: string;
  opportunityId?: string;
  applicantId?: string;
  status: ApplicationStatusEnum | string;
  resumeFileRef?: FileRefType | null;
  coverLetter?: string | null;
  customAnswers?: string | null;
  reviewNotes?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  updatedAt?: string | null;
  opportunity?: Opportunity | null;
  applicantProfile?: Profile | null;
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
  resumeFileRef?: FileRefType;
}

export interface GetUserApplicationsInput {
  limit?: number;
  offset?: number;
  status?: string;
}

// Saved Opportunities Types

export interface SavedOpportunity {
  id: string;
  opportunityId: string;
  userId?: string;
  savedAt: string;
  opportunity?: Opportunity;
}

export interface GetApplicationsInput {
  opportunityId: string;
  limit?: number;
  offset?: number;
  status?: string;
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
  getUserApplications: {
    applications: Application[];
    total: number;
  };
  userApplications?: {
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
  listOpportunities: {
    opportunities: Opportunity[];
    total: number;
  };
}

export interface OpportunityListResponse {
  opportunities: Opportunity[];
  total: number;
}

export interface ApplicationListResponse {
  applications: Application[];
  total: number;
}

export interface SavedOpportunityListResponse {
  savedOpportunities: SavedOpportunity[];
  total: number;
}

export interface OpportunityListResponseData {
  listOpportunities: OpportunityListResponse;
}

export interface SavedOpportunityListResponseData {
  getSavedOpportunities: SavedOpportunityListResponse;
}

export interface ApplicationListResponseData {
  getApplications: ApplicationListResponse;
}

// GraphQL response types

export interface GetOpportunityData {
  getOpportunity: Opportunity | null;
}

export interface CreateOpportunityData {
  createOpportunity: string;
}

export interface SubmitApplicationData {
  submitApplication: string;
}

export interface SaveOpportunityData {
  saveOpportunity: boolean;
}

export interface UnsaveOpportunityData {
  unsaveOpportunity: boolean;
}

export interface GetOpportunityFeedData {
  getOpportunityFeed: {
    opportunities: Opportunity[];
    total: number;
  };
}

export interface GetApplicationData {
  getApplication: Application | null;
}

export interface WithdrawApplicationData {
  withdrawApplication: boolean;
}

export interface GetApplicationsData {
  getApplications: {
    applications: Application[];
    total: number;
  };
}
