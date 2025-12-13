import { gql } from '@apollo/client';

// ============================================================================
// EDUCATION TYPES
// ============================================================================

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

export interface AddEducationInput {
  institution: string;
  degree: string;
  fieldOfStudy: string;
  startDate: string;
  endDate?: string | null;
  current: boolean;
  activities?: string[];
}

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

export interface DeleteEducationInput {
  educationId: string;
}

export interface GetUserEducationResponse {
  getUserEducation: {
    success: boolean;
    message?: string;
    education: Education[];
  };
}

export interface AddEducationResponse {
  addEducation: {
    success: boolean;
    message?: string;
    education: Education;
  };
}

export interface UpdateEducationResponse {
  updateEducation: {
    success: boolean;
    message?: string;
    education: Education;
  };
}

export interface DeleteEducationResponse {
  deleteEducation: {
    success: boolean;
    message?: string;
  };
}

// ============================================================================
// EDUCATION QUERIES
// ============================================================================

/**
 * Get the current user's education history.
 * 
 * @example
 * ```typescript
 * const { data } = useQuery<GetUserEducationResponse>(GET_MY_EDUCATION);
 * 
 * if (data?.getUserEducation.success) {
 *   console.log(data.getUserEducation.education);
 * }
 * ```
 */
export const GET_MY_EDUCATION = gql`
  query GetMyEducation {
    getUserEducation {
      success
      message
      education {
        id
        userId
        institution
        degree
        fieldOfStudy
        startDate
        endDate
        current
        activities
        createdAt
        updatedAt
      }
    }
  }
`;

/**
 * Get another user's education history by userId.
 * 
 * @example
 * ```typescript
 * const { data } = useQuery<GetUserEducationResponse>(GET_USER_EDUCATION, {
 *   variables: { userId: "0538ea6e-42a7-47d6-af92-8a3c34a88498" }
 * });
 * ```
 */
export const GET_USER_EDUCATION = gql`
  query GetUserEducation($userId: ID!) {
    getUserEducation(userId: $userId) {
      success
      message
      education {
        id
        userId
        institution
        degree
        fieldOfStudy
        startDate
        endDate
        current
        activities
        createdAt
        updatedAt
      }
    }
  }
`;

// ============================================================================
// EDUCATION MUTATIONS
// ============================================================================

/**
 * Add education to the current user's profile.
 * 
 * @example
 * ```typescript
 * const [addEducation] = useMutation<AddEducationResponse>(ADD_EDUCATION);
 * 
 * await addEducation({
 *   variables: {
 *     input: {
 *       institution: "KNUST",
 *       degree: "Bachelor of Science",
 *       fieldOfStudy: "Computer Science",
 *       startDate: "2021-08-01",
 *       endDate: null,
 *       current: true,
 *       activities: [
 *         "Specialized in distributed systems",
 *         "Cloud infrastructure research"
 *       ]
 *     }
 *   }
 * });
 * ```
 */
export const ADD_EDUCATION = gql`
  mutation AddEducation($input: AddEducationInput!) {
    addEducation(input: $input) {
      success
      message
      education {
        id
        userId
        institution
        degree
        fieldOfStudy
        startDate
        endDate
        current
        activities
        createdAt
      }
    }
  }
`;

/**
 * Update an existing education entry.
 * 
 * @example
 * ```typescript
 * const [updateEducation] = useMutation<UpdateEducationResponse>(UPDATE_EDUCATION);
 * 
 * await updateEducation({
 *   variables: {
 *     input: {
 *       educationId: "91882d7e-c689-47fc-8f95-75378a39666f",
 *       degree: "Bachelor of Science (Honors)",
 *       fieldOfStudy: "Computer Science & Engineering",
 *       activities: [
 *         "Specialized in distributed systems",
 *         "Cloud infrastructure research",
 *         "ML capstone"
 *       ]
 *     }
 *   }
 * });
 * ```
 */
export const UPDATE_EDUCATION = gql`
  mutation UpdateEducation($input: UpdateEducationInput!) {
    updateEducation(input: $input) {
      success
      message
      education {
        id
        userId
        institution
        degree
        fieldOfStudy
        startDate
        endDate
        current
        activities
        updatedAt
      }
    }
  }
`;

/**
 * Delete an education entry.
 * 
 * @example
 * ```typescript
 * const [deleteEducation] = useMutation<DeleteEducationResponse>(DELETE_EDUCATION);
 * 
 * await deleteEducation({
 *   variables: {
 *     input: { educationId: "386d3d2d-44a9-4985-b8a9-d6296e588990" }
 *   }
 * });
 * ```
 */
export const DELETE_EDUCATION = gql`
  mutation DeleteEducation($input: DeleteEducationInput!) {
    deleteEducation(input: $input) {
      success
      message
    }
  }
`;