import { gql } from '@apollo/client';

// ============================================================================
// WORK EXPERIENCE TYPES
// ============================================================================

export enum EmploymentType {
  FULL_TIME = 'FULL_TIME',
  PART_TIME = 'PART_TIME',
  CONTRACT = 'CONTRACT',
  INTERNSHIP = 'INTERNSHIP',
  FREELANCE = 'FREELANCE',
}

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

export interface DeleteWorkExperienceInput {
  workExperienceId: string;
}

export interface GetUserWorkExperienceResponse {
  getUserWorkExperience: {
    success: boolean;
    message?: string;
    workExperience: WorkExperience[];
  };
}

export interface AddWorkExperienceResponse {
  addWorkExperience: {
    success: boolean;
    message?: string;
    workExperience: WorkExperience;
  };
}

export interface UpdateWorkExperienceResponse {
  updateWorkExperience: {
    success: boolean;
    message?: string;
    workExperience: WorkExperience;
  };
}

export interface DeleteWorkExperienceResponse {
  deleteWorkExperience: {
    success: boolean;
    message?: string;
  };
}

// ============================================================================
// WORK EXPERIENCE QUERIES
// ============================================================================

/**
 * Get the current user's work experience history.
 * 
 * @example
 * ```typescript
 * const { data } = useQuery<GetUserWorkExperienceResponse>(GET_MY_WORK_EXPERIENCE);
 * 
 * if (data?.getUserWorkExperience.success) {
 *   console.log(data.getUserWorkExperience.workExperience);
 * }
 * ```
 */
export const GET_MY_WORK_EXPERIENCE = gql`
  query GetMyWorkExperience {
    getUserWorkExperience {
      success
      message
      workExperience {
        id
        userId
        companyName
        role
        employmentType
        startDate
        endDate
        currentlyWorking
        jobDescription
        skills
        createdAt
        updatedAt
      }
    }
  }
`;

/**
 * Get another user's work experience history by userId.
 * 
 * @example
 * ```typescript
 * const { data } = useQuery<GetUserWorkExperienceResponse>(GET_USER_WORK_EXPERIENCE, {
 *   variables: { userId: "0538ea6e-42a7-47d6-af92-8a3c34a88498" }
 * });
 * ```
 */
export const GET_USER_WORK_EXPERIENCE = gql`
  query GetUserWorkExperience($userId: ID!) {
    getUserWorkExperience(userId: $userId) {
      success
      message
      workExperience {
        id
        userId
        companyName
        role
        employmentType
        startDate
        endDate
        currentlyWorking
        jobDescription
        skills
        createdAt
        updatedAt
      }
    }
  }
`;

// ============================================================================
// WORK EXPERIENCE MUTATIONS
// ============================================================================

/**
 * Add work experience to the current user's profile.
 * 
 * @example
 * ```typescript
 * const [addWorkExperience] = useMutation<AddWorkExperienceResponse>(ADD_WORK_EXPERIENCE);
 * 
 * await addWorkExperience({
 *   variables: {
 *     input: {
 *       companyName: "Instagram",
 *       role: "ML Engineer",
 *       employmentType: "FULL_TIME",
 *       startDate: "2025-01-01",
 *       endDate: "2026-01-01",
 *       currentlyWorking: false,
 *       jobDescription: "Leading the development of cloud infrastructure services",
 *       skills: "Go, Kubernetes, Distributed Systems"
 *     }
 *   }
 * });
 * ```
 */
export const ADD_WORK_EXPERIENCE = gql`
  mutation AddWorkExperience($input: AddWorkExperienceInput!) {
    addWorkExperience(input: $input) {
      success
      message
      workExperience {
        id
        userId
        companyName
        role
        employmentType
        startDate
        endDate
        currentlyWorking
        jobDescription
        skills
        createdAt
      }
    }
  }
`;

/**
 * Update an existing work experience entry.
 * 
 * @example
 * ```typescript
 * const [updateWorkExperience] = useMutation<UpdateWorkExperienceResponse>(UPDATE_WORK_EXPERIENCE);
 * 
 * await updateWorkExperience({
 *   variables: {
 *     input: {
 *       workExperienceId: "21d5b260-3611-43ed-ae4d-928bb6ef0663",
 *       role: "Senior Frontend Engineer",
 *       currentlyWorking: true,
 *       jobDescription: "Leading cloud infra & ML platform efforts",
 *       skills: "Go, Kubernetes, Terraform, Leadership"
 *     }
 *   }
 * });
 * ```
 */
export const UPDATE_WORK_EXPERIENCE = gql`
  mutation UpdateWorkExperience($input: UpdateWorkExperienceInput!) {
    updateWorkExperience(input: $input) {
      success
      message
      workExperience {
        id
        userId
        companyName
        role
        employmentType
        startDate
        endDate
        currentlyWorking
        jobDescription
        skills
        updatedAt
      }
    }
  }
`;

/**
 * Delete a work experience entry.
 * 
 * @example
 * ```typescript
 * const [deleteWorkExperience] = useMutation<DeleteWorkExperienceResponse>(DELETE_WORK_EXPERIENCE);
 * 
 * await deleteWorkExperience({
 *   variables: {
 *     input: { workExperienceId: "5f3a6fdc-b6ad-4ecd-ab70-4047214f4e61" }
 *   }
 * });
 * ```
 */
export const DELETE_WORK_EXPERIENCE = gql`
  mutation DeleteWorkExperience($input: DeleteWorkExperienceInput!) {
    deleteWorkExperience(input: $input) {
      success
      message
    }
  }
`;