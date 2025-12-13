import { gql } from '@apollo/client';

// ============================================================================
// SKILLS TYPES
// ============================================================================

export interface Skill {
  id: string;
  userId: string;
  skillName: string;
  proficiencyLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  yearsOfExperience?: number;
  isPrimary?: boolean;
  endorsements?: number;
  createdAt: string;
  updatedAt: string;
}

export interface SkillInput {
  skillName: string;
  proficiencyLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  yearsOfExperience?: number;
  isPrimary?: boolean;
}

export interface AddSkillsInput {
  skills: SkillInput[];
}

export interface RemoveSkillInput {
  skillId: string;
}

export interface GetUserSkillsResponse {
  getUserSkills: {
    success: boolean;
    message?: string;
    skills: Skill[];
  };
}

export interface AddSkillsResponse {
  addSkills: {
    success: boolean;
    message?: string;
    skills: Skill[];
  };
}

export interface RemoveSkillResponse {
  removeSkill: {
    success: boolean;
    message?: string;
  };
}

// ============================================================================
// SKILLS QUERIES
// ============================================================================

/**
 * Get the current user's skills.
 * 
 * @example
 * ```typescript
 * const { data } = useQuery<GetUserSkillsResponse>(GET_MY_SKILLS);
 * 
 * if (data?.getUserSkills.success) {
 *   console.log(data.getUserSkills.skills);
 * }
 * ```
 */
export const GET_MY_SKILLS = gql`
  query GetMySkills {
    getUserSkills {
      success
      message
      skills {
        id
        userId
        skillName
        proficiencyLevel
        yearsOfExperience
        endorsements
        createdAt
        updatedAt
      }
    }
  }
`;

/**
 * Get another user's skills by userId.
 * 
 * @example
 * ```typescript
 * const { data } = useQuery<GetUserSkillsResponse>(GET_USER_SKILLS, {
 *   variables: { userId: "0538ea6e-42a7-47d6-af92-8a3c34a88498" }
 * });
 * ```
 */
export const GET_USER_SKILLS = gql`
  query GetUserSkills($userId: ID!) {
    getUserSkills(userId: $userId) {
      success
      message
      skills {
        id
        userId
        skillName
        proficiencyLevel
        yearsOfExperience
        endorsements
        createdAt
        updatedAt
      }
    }
  }
`;

// ============================================================================
// SKILLS MUTATIONS
// ============================================================================

/**
 * Add multiple skills to the current user's profile.
 * 
 * @example
 * ```typescript
 * const [addSkills] = useMutation<AddSkillsResponse>(ADD_SKILLS);
 * 
 * await addSkills({
 *   variables: {
 *     input: {
 *       skills: [
 *         {
 *           skillName: "Docker",
 *           proficiencyLevel: "advanced",
 *           yearsOfExperience: 5,
 *           isPrimary: true
 *         },
 *         {
 *           skillName: "Kubernetes",
 *           proficiencyLevel: "intermediate",
 *           yearsOfExperience: 3,
 *           isPrimary: false
 *         }
 *       ]
 *     }
 *   }
 * });
 * ```
 */
export const ADD_SKILLS = gql`
  mutation AddSkills($input: AddSkillsInput!) {
    addSkills(input: $input) {
      success
      message
      skills {
        id
        userId
        skillName
        proficiencyLevel
        yearsOfExperience
        isPrimary
      }
    }
  }
`;

/**
 * Remove a skill from the current user's profile.
 * 
 * @example
 * ```typescript
 * const [removeSkill] = useMutation<RemoveSkillResponse>(REMOVE_SKILL);
 * 
 * await removeSkill({
 *   variables: {
 *     input: { skillId: "a3ee124f-d0c5-4863-94a3-8d40ba0d7b0a" }
 *   }
 * });
 * ```
 */
export const REMOVE_SKILL = gql`
  mutation RemoveSkill($input: RemoveSkillInput!) {
    removeSkill(input: $input) {
      success
      message
    }
  }
`;