/**
 * @fileoverview Education-related type definitions for GraphQL operations.
 * Contains interfaces for managing user education history including
 * add, update, delete, and query operations.
 * @module services/gql/types/education
 */

// ============================================================================
// EDUCATION ENTITY TYPE
// ============================================================================

/**
 * Represents an education entry in a user's profile.
 *
 * @interface Education
 * @property {string} id - Unique identifier for the education entry
 * @property {string} userId - ID of the user who owns this education entry
 * @property {string} institution - Name of the educational institution
 * @property {string} degree - Degree obtained (e.g., "Bachelor of Science")
 * @property {string} fieldOfStudy - Field or major of study
 * @property {string} startDate - ISO date string for when education started
 * @property {string | null} [endDate] - ISO date string for when education ended (null if ongoing)
 * @property {boolean} current - Whether the user is currently studying here
 * @property {string[]} [activities] - List of activities, achievements, or notes
 * @property {string} createdAt - ISO timestamp when entry was created
 * @property {string} updatedAt - ISO timestamp when entry was last updated
 *
 * @example
 * ```typescript
 * const education: Education = {
 *   id: "edu-uuid",
 *   userId: "user-uuid",
 *   institution: "KNUST",
 *   degree: "Bachelor of Science",
 *   fieldOfStudy: "Computer Science",
 *   startDate: "2021-08-01",
 *   endDate: null,
 *   current: true,
 *   activities: ["Dean's List", "Programming Club President"],
 *   createdAt: "2024-01-15T10:00:00Z",
 *   updatedAt: "2024-01-15T10:00:00Z"
 * };
 * ```
 */
export interface Education {
  id: string;
  userId: string;
  institution: string;
  degree: string;
  fieldOfStudy: string;
  startDate: string;
  endDate?: string | null;
  current: boolean;
  activities?: string[];
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// EDUCATION INPUT TYPES
// ============================================================================

/**
 * Input for adding a new education entry.
 *
 * @interface AddEducationInput
 * @property {string} institution - Name of the educational institution
 * @property {string} degree - Degree to be/being obtained
 * @property {string} fieldOfStudy - Field or major of study
 * @property {string} startDate - ISO date string for start date
 * @property {string | null} [endDate] - ISO date string for end date (null if ongoing)
 * @property {boolean} current - Whether currently enrolled
 * @property {string[]} [activities] - Optional list of activities or achievements
 *
 * @example
 * ```typescript
 * const input: AddEducationInput = {
 *   institution: "MIT",
 *   degree: "Master of Science",
 *   fieldOfStudy: "Artificial Intelligence",
 *   startDate: "2024-09-01",
 *   endDate: null,
 *   current: true,
 *   activities: ["Research Assistant", "AI Lab Member"]
 * };
 * ```
 */
export interface AddEducationInput {
  institution: string;
  degree: string;
  fieldOfStudy: string;
  startDate: string;
  endDate?: string | null;
  current: boolean;
  activities?: string[];
}

/**
 * Input for updating an existing education entry.
 * All fields except educationId are optional.
 *
 * @interface UpdateEducationInput
 * @property {string} educationId - ID of the education entry to update
 * @property {string} [institution] - Updated institution name
 * @property {string} [degree] - Updated degree
 * @property {string} [fieldOfStudy] - Updated field of study
 * @property {string} [startDate] - Updated start date
 * @property {string | null} [endDate] - Updated end date
 * @property {boolean} [current] - Updated current status
 * @property {string[]} [activities] - Updated activities list
 *
 * @example
 * ```typescript
 * const input: UpdateEducationInput = {
 *   educationId: "edu-uuid",
 *   degree: "Bachelor of Science (Honors)",
 *   activities: ["Dean's List", "Graduated Summa Cum Laude"]
 * };
 * ```
 */
export interface UpdateEducationInput {
  educationId: string;
  institution?: string;
  degree?: string;
  fieldOfStudy?: string;
  startDate?: string;
  endDate?: string | null;
  current?: boolean;
  activities?: string[];
}

/**
 * Input for deleting an education entry.
 *
 * @interface DeleteEducationInput
 * @property {string} educationId - ID of the education entry to delete
 */
export interface DeleteEducationInput {
  educationId: string;
}

// ============================================================================
// EDUCATION RESPONSE TYPES
// ============================================================================

/**
 * Response from getting user's education history.
 *
 * @interface GetUserEducationResponse
 * @property {Object} getUserEducation - Query result
 * @property {boolean} getUserEducation.success - Whether query was successful
 * @property {string} [getUserEducation.message] - Optional message
 * @property {Education[]} getUserEducation.education - Array of education entries
 */
export interface GetUserEducationResponse {
  getUserEducation: {
    success: boolean;
    message?: string;
    education: Education[];
  };
}

/**
 * Response from adding a new education entry.
 *
 * @interface AddEducationResponse
 * @property {Object} addEducation - Mutation result
 * @property {boolean} addEducation.success - Whether creation was successful
 * @property {string} [addEducation.message] - Optional message
 * @property {Education} addEducation.education - Created education entry
 */
export interface AddEducationResponse {
  addEducation: {
    success: boolean;
    message?: string;
    education: Education;
  };
}

/**
 * Response from updating an education entry.
 *
 * @interface UpdateEducationResponse
 * @property {Object} updateEducation - Mutation result
 * @property {boolean} updateEducation.success - Whether update was successful
 * @property {string} [updateEducation.message] - Optional message
 * @property {Education} updateEducation.education - Updated education entry
 */
export interface UpdateEducationResponse {
  updateEducation: {
    success: boolean;
    message?: string;
    education: Education;
  };
}

/**
 * Response from deleting an education entry.
 *
 * @interface DeleteEducationResponse
 * @property {Object} deleteEducation - Mutation result
 * @property {boolean} deleteEducation.success - Whether deletion was successful
 * @property {string} [deleteEducation.message] - Optional message
 */
export interface DeleteEducationResponse {
  deleteEducation: {
    success: boolean;
    message?: string;
  };
}
