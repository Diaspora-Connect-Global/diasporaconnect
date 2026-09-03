/**
 * @fileoverview Work experience-related type definitions for GraphQL operations.
 * Contains interfaces for managing user work history including add, update, delete, and query operations.
 * @module services/gql/types/work_experience
 */

// ============================================================================
// EMPLOYMENT TYPE ENUM
// ============================================================================

/**
 * Employment type options.
 *
 * @enum EmploymentType
 * @property {string} FULL_TIME - Full-time employment
 * @property {string} PART_TIME - Part-time employment
 * @property {string} CONTRACT - Contract/temporary work
 * @property {string} INTERNSHIP - Internship position
 * @property {string} FREELANCE - Freelance/self-employed work
 */
export enum EmploymentType {
  FULL_TIME = 'FULL_TIME',
  PART_TIME = 'PART_TIME',
  CONTRACT = 'CONTRACT',
  INTERNSHIP = 'INTERNSHIP',
  FREELANCE = 'FREELANCE',
}

// ============================================================================
// WORK EXPERIENCE TYPES
// ============================================================================

/**
 * Represents a work experience entry in a user's profile.
 *
 * @interface WorkExperience
 * @property {string} id - Unique identifier for the work experience entry
 * @property {string} userId - ID of the user who owns this entry
 * @property {string} companyName - Name of the company/organization
 * @property {string} role - Job title/role
 * @property {EmploymentType} employmentType - Type of employment
 * @property {string} startDate - ISO date string for start date
 * @property {string | null} [endDate] - ISO date string for end date (null if current)
 * @property {boolean} currentlyWorking - Whether user is currently in this role
 * @property {string} [jobDescription] - Description of responsibilities and achievements
 * @property {string} [skills] - Comma-separated list of skills used
 * @property {string} createdAt - ISO timestamp when entry was created
 * @property {string} updatedAt - ISO timestamp when entry was last updated
 *
 * @example
 * ```typescript
 * const experience: WorkExperience = {
 *   id: "exp-uuid",
 *   userId: "user-uuid",
 *   companyName: "Tech Corp",
 *   role: "Senior Software Engineer",
 *   employmentType: EmploymentType.FULL_TIME,
 *   startDate: "2022-01-01",
 *   endDate: null,
 *   currentlyWorking: true,
 *   jobDescription: "Leading frontend development team",
 *   skills: "React, TypeScript, Node.js",
 *   createdAt: "2024-01-15T10:00:00Z",
 *   updatedAt: "2024-01-15T10:00:00Z"
 * };
 * ```
 */
export interface WorkExperience {
  id: string;
  userId: string;
  companyName: string;
  role: string;
  employmentType: EmploymentType;
  startDate: string;
  endDate?: string | null;
  currentlyWorking: boolean;
  jobDescription?: string;
  skills?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// WORK EXPERIENCE INPUT TYPES
// ============================================================================

/**
 * Input for adding a new work experience entry.
 *
 * @interface AddWorkExperienceInput
 * @property {string} companyName - Name of the company
 * @property {string} role - Job title/role
 * @property {EmploymentType} employmentType - Type of employment
 * @property {string} startDate - ISO date string for start date
 * @property {string | null} [endDate] - ISO date string for end date
 * @property {boolean} currentlyWorking - Whether currently in this role
 * @property {string} [jobDescription] - Job description
 * @property {string} [skills] - Skills used in this role
 *
 * @example
 * ```typescript
 * const input: AddWorkExperienceInput = {
 *   companyName: "Instagram",
 *   role: "ML Engineer",
 *   employmentType: EmploymentType.FULL_TIME,
 *   startDate: "2025-01-01",
 *   endDate: null,
 *   currentlyWorking: true,
 *   jobDescription: "Leading ML infrastructure efforts",
 *   skills: "Python, TensorFlow, Kubernetes"
 * };
 * ```
 */
export interface AddWorkExperienceInput {
  companyName: string;
  role: string;
  employmentType: EmploymentType;
  startDate: string;
  endDate?: string | null;
  currentlyWorking: boolean;
  jobDescription?: string;
  skills?: string;
}

/**
 * Input for updating an existing work experience entry.
 * All fields except workExperienceId are optional.
 *
 * @interface UpdateWorkExperienceInput
 * @property {string} workExperienceId - ID of the entry to update
 * @property {string} [companyName] - Updated company name
 * @property {string} [role] - Updated role
 * @property {EmploymentType} [employmentType] - Updated employment type
 * @property {string} [startDate] - Updated start date
 * @property {string | null} [endDate] - Updated end date
 * @property {boolean} [currentlyWorking] - Updated current status
 * @property {string} [jobDescription] - Updated description
 * @property {string} [skills] - Updated skills
 *
 * @example
 * ```typescript
 * const input: UpdateWorkExperienceInput = {
 *   workExperienceId: "exp-uuid",
 *   role: "Senior ML Engineer",
 *   jobDescription: "Now leading the entire ML platform team"
 * };
 * ```
 */
export interface UpdateWorkExperienceInput {
  workExperienceId: string;
  companyName?: string;
  role?: string;
  employmentType?: EmploymentType;
  startDate?: string;
  endDate?: string | null;
  currentlyWorking?: boolean;
  jobDescription?: string;
  skills?: string;
}

/**
 * Input for deleting a work experience entry.
 *
 * @interface DeleteWorkExperienceInput
 * @property {string} workExperienceId - ID of the entry to delete
 */
export interface DeleteWorkExperienceInput {
  workExperienceId: string;
}

// ============================================================================
// WORK EXPERIENCE RESPONSE TYPES
// ============================================================================

/**
 * Response from getting user's work experience history.
 *
 * @interface GetUserWorkExperienceResponse
 * @property {Object} getUserWorkExperience - Query result
 * @property {boolean} getUserWorkExperience.success - Whether query was successful
 * @property {string} [getUserWorkExperience.message] - Optional message
 * @property {WorkExperience[]} getUserWorkExperience.workExperience - Array of work experience entries
 */
export interface GetUserWorkExperienceResponse {
  getUserWorkExperience: {
    success: boolean;
    message?: string;
    workExperience: WorkExperience[];
  };
}

/**
 * Response from adding a work experience entry.
 *
 * @interface AddWorkExperienceResponse
 * @property {Object} addWorkExperience - Mutation result
 * @property {boolean} addWorkExperience.success - Whether creation was successful
 * @property {string} [addWorkExperience.message] - Optional message
 * @property {WorkExperience} addWorkExperience.workExperience - Created entry
 */
export interface AddWorkExperienceResponse {
  addWorkExperience: {
    success: boolean;
    message?: string;
    workExperience: WorkExperience;
  };
}

/**
 * Response from updating a work experience entry.
 *
 * @interface UpdateWorkExperienceResponse
 * @property {Object} updateWorkExperience - Mutation result
 * @property {boolean} updateWorkExperience.success - Whether update was successful
 * @property {string} [updateWorkExperience.message] - Optional message
 * @property {WorkExperience} updateWorkExperience.workExperience - Updated entry
 */
export interface UpdateWorkExperienceResponse {
  updateWorkExperience: {
    success: boolean;
    message?: string;
    workExperience: WorkExperience;
  };
}

/**
 * Response from deleting a work experience entry.
 *
 * @interface DeleteWorkExperienceResponse
 * @property {Object} deleteWorkExperience - Mutation result
 * @property {boolean} deleteWorkExperience.success - Whether deletion was successful
 * @property {string} [deleteWorkExperience.message] - Optional message
 */
export interface DeleteWorkExperienceResponse {
  deleteWorkExperience: {
    success: boolean;
    message?: string;
  };
}
