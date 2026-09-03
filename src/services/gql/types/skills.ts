/**
 * @fileoverview Skills-related type definitions for GraphQL operations.
 * Contains interfaces for managing user skills including add, remove, and query operations.
 * @module services/gql/types/skills
 */

// ============================================================================
// SKILL TYPES
// ============================================================================

/**
 * Proficiency levels for skills.
 *
 * @type ProficiencyLevel
 */
export type ProficiencyLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

/**
 * Represents a skill in a user's profile.
 *
 * @interface Skill
 * @property {string} id - Unique identifier for the skill entry
 * @property {string} userId - ID of the user who owns this skill
 * @property {string} skillName - Name of the skill
 * @property {ProficiencyLevel} proficiencyLevel - Proficiency level
 * @property {number} [yearsOfExperience] - Years of experience with this skill
 * @property {boolean} [isPrimary] - Whether this is a primary/featured skill
 * @property {number} [endorsements] - Number of endorsements received
 * @property {string} createdAt - ISO timestamp when entry was created
 * @property {string} updatedAt - ISO timestamp when entry was last updated
 *
 * @example
 * ```typescript
 * const skill: Skill = {
 *   id: "skill-uuid",
 *   userId: "user-uuid",
 *   skillName: "TypeScript",
 *   proficiencyLevel: "advanced",
 *   yearsOfExperience: 5,
 *   isPrimary: true,
 *   endorsements: 12,
 *   createdAt: "2024-01-15T10:00:00Z",
 *   updatedAt: "2024-01-15T10:00:00Z"
 * };
 * ```
 */
export interface Skill {
  id: string;
  userId: string;
  skillName: string;
  proficiencyLevel: ProficiencyLevel;
  yearsOfExperience?: number;
  isPrimary?: boolean;
  endorsements?: number;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// SKILL INPUT TYPES
// ============================================================================

/**
 * Input for a single skill when adding skills.
 *
 * @interface SkillInput
 * @property {string} skillName - Name of the skill
 * @property {ProficiencyLevel} proficiencyLevel - Proficiency level
 * @property {number} [yearsOfExperience] - Optional years of experience
 * @property {boolean} [isPrimary] - Whether this is a primary skill
 *
 * @example
 * ```typescript
 * const skillInput: SkillInput = {
 *   skillName: "React",
 *   proficiencyLevel: "advanced",
 *   yearsOfExperience: 4,
 *   isPrimary: true
 * };
 * ```
 */
export interface SkillInput {
  skillName: string;
  proficiencyLevel: ProficiencyLevel;
  yearsOfExperience?: number;
  isPrimary?: boolean;
}

/**
 * Input for adding multiple skills at once.
 *
 * @interface AddSkillsInput
 * @property {SkillInput[]} skills - Array of skills to add
 *
 * @example
 * ```typescript
 * const input: AddSkillsInput = {
 *   skills: [
 *     { skillName: "Docker", proficiencyLevel: "advanced", yearsOfExperience: 5, isPrimary: true },
 *     { skillName: "Kubernetes", proficiencyLevel: "intermediate", yearsOfExperience: 3 }
 *   ]
 * };
 * ```
 */
export interface AddSkillsInput {
  skills: SkillInput[];
}

/**
 * Input for removing a skill.
 *
 * @interface RemoveSkillInput
 * @property {string} skillId - ID of the skill to remove
 */
export interface RemoveSkillInput {
  skillId: string;
}

// ============================================================================
// SKILL RESPONSE TYPES
// ============================================================================

/**
 * Response from getting user's skills.
 *
 * @interface GetUserSkillsResponse
 * @property {Object} getUserSkills - Query result
 * @property {boolean} getUserSkills.success - Whether query was successful
 * @property {string} [getUserSkills.message] - Optional message
 * @property {Skill[]} getUserSkills.skills - Array of skills
 */
export interface GetUserSkillsResponse {
  getUserSkills: {
    success: boolean;
    message?: string;
    skills: Skill[];
  };
}

/**
 * Response from adding skills.
 *
 * @interface AddSkillsResponse
 * @property {Object} addSkills - Mutation result
 * @property {boolean} addSkills.success - Whether skills were added successfully
 * @property {string} [addSkills.message] - Optional message
 * @property {Skill[]} addSkills.skills - Array of added skills
 */
export interface AddSkillsResponse {
  addSkills: {
    success: boolean;
    message?: string;
    skills: Skill[];
  };
}

/**
 * Response from removing a skill.
 *
 * @interface RemoveSkillResponse
 * @property {Object} removeSkill - Mutation result
 * @property {boolean} removeSkill.success - Whether removal was successful
 * @property {string} [removeSkill.message] - Optional message
 */
export interface RemoveSkillResponse {
  removeSkill: {
    success: boolean;
    message?: string;
  };
}
