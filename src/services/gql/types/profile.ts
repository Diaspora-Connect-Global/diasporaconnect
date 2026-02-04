/**
 * @fileoverview User profile-related type definitions for GraphQL operations.
 * Contains interfaces for user profiles, profile updates, and profile pictures.
 * @module services/gql/types/profile
 */

// ============================================================================
// PROFILE COMPLETION TYPES
// ============================================================================

/**
 * Profile completion status and progress.
 *
 * @interface ProfileCompletion
 * @property {number} percentage - Completion percentage (0-100)
 * @property {string[]} completedSections - Array of completed section names
 * @property {string[]} missingSections - Array of incomplete section names
 *
 * @example
 * ```typescript
 * const completion: ProfileCompletion = {
 *   percentage: 75,
 *   completedSections: ["basic_info", "education", "skills"],
 *   missingSections: ["work_experience", "bio"]
 * };
 * ```
 */
export interface ProfileCompletion {
  percentage: number;
  completedSections: string[];
  missingSections: string[];
}

// ============================================================================
// PROFILE TYPES
// ============================================================================

/**
 * Complete user profile information.
 *
 * @interface Profile
 * @property {string} userId - Unique user identifier
 * @property {string} email - User's email address
 * @property {string} [phone] - User's phone number
 * @property {string} firstName - User's first name
 * @property {string} lastName - User's last name
 * @property {string} middleName - User's middle name
 * @property {number} residenceSinceYear - Year user started residing in current location
 * @property {number} residenceSinceMonth - Month user started residing in current location
 * @property {string} [city] - User's city
 * @property {string} [countryOfOrigin] - User's country of origin
 * @property {string} [residenceCountry] - User's country of residence
 * @property {string} [location] - General location string
 * @property {string} [sector] - Professional sector
 * @property {string} [industry] - Industry of work
 * @property {string} [bio] - User's biography/about text
 * @property {string} [avatarUrl] - URL to profile picture
 * @property {string} [coverPhoto] - URL to cover/banner photo
 * @property {string} [gender] - User's gender
 * @property {string} [dateOfBirth] - User's date of birth (ISO date string)
 * @property {number} connectionCount - Number of connections
 * @property {number} version - Profile version for optimistic locking
 * @property {string} [verificationStatus] - User's verification status
 * @property {string} createdAt - ISO timestamp when profile was created
 * @property {string} updatedAt - ISO timestamp when profile was last updated
 * @property {ProfileCompletion} [profileCompletion] - Profile completion progress
 * @property {string} role - User's role ('diaspora' | 'local')
 *
 * @example
 * ```typescript
 * const profile: Profile = {
 *   userId: "user-uuid",
 *   email: "john@example.com",
 *   firstName: "John",
 *   lastName: "Doe",
 *   middleName: "",
 *   residenceSinceYear: 2020,
 *   residenceSinceMonth: 6,
 *   city: "Accra",
 *   countryOfOrigin: "GH",
 *   residenceCountry: "GH",
 *   sector: "Technology",
 *   bio: "Software engineer passionate about building great products",
 *   connectionCount: 150,
 *   version: 5,
 *   verificationStatus: "verified",
 *   createdAt: "2024-01-15T10:00:00Z",
 *   updatedAt: "2024-02-01T15:30:00Z",
 *   role: "local"
 * };
 * ```
 */
export interface Profile {
  userId: string;
  email: string;
  phone?: string;
  firstName: string;
  lastName: string;
  middleName: string;
  residenceSinceYear: number;
  residenceSinceMonth: number;
  city?: string;
  countryOfOrigin?: string;
  residenceCountry?: string;
  location?: string;
  sector?: string;
  industry?: string;
  bio?: string;
  avatarUrl?: string;
  coverPhoto?: string;
  gender?: string;
  dateOfBirth?: string;
  connectionCount: number;
  version: number;
  verificationStatus?: string;
  createdAt: string;
  updatedAt: string;
  profileCompletion?: ProfileCompletion;
  role: string;
}

// ============================================================================
// PROFILE INPUT TYPES
// ============================================================================

/**
 * Input for updating a user's profile.
 * All fields except version are optional - only include fields you want to update.
 *
 * @interface UpdateProfileInput
 * @property {number} version - Current profile version for optimistic locking
 * @property {string} [firstName] - Updated first name
 * @property {string} [lastName] - Updated last name
 * @property {string} [middleName] - Updated middle name
 * @property {string} [city] - Updated city
 * @property {number} [residenceSinceYear] - Updated residence start year
 * @property {number} [residenceSinceMonth] - Updated residence start month
 * @property {string} [countryOfOrigin] - Updated country of origin
 * @property {string} [residenceCountry] - Updated residence country
 * @property {string} [bio] - Updated biography
 * @property {string} [sector] - Updated professional sector
 * @property {string} [location] - Updated location
 * @property {string} [avatarUrl] - Updated avatar URL
 * @property {string} [coverPhoto] - Updated cover photo URL
 * @property {string} [industry] - Updated industry
 * @property {string} [gender] - Updated gender
 * @property {string} [dateOfBirth] - Updated date of birth
 *
 * @example
 * ```typescript
 * const input: UpdateProfileInput = {
 *   version: 5,
 *   firstName: "John",
 *   lastName: "Doe",
 *   bio: "Updated bio text"
 * };
 * ```
 */
export interface UpdateProfileInput {
  version: number;
  firstName?: string;
  lastName?: string;
  middleName?: string;
  city?: string;
  residenceSinceYear?: number;
  residenceSinceMonth?: number;
  countryOfOrigin?: string;
  residenceCountry?: string;
  bio?: string;
  sector?: string;
  location?: string;
  avatarUrl?: string;
  coverPhoto?: string;
  industry?: string;
  gender?: string;
  dateOfBirth?: string;
}

// ============================================================================
// PROFILE RESPONSE TYPES
// ============================================================================

/**
 * Response from getting a user's profile.
 *
 * @interface GetProfileResponse
 * @property {Object} getProfile - Query result
 * @property {boolean} getProfile.success - Whether query was successful
 * @property {string} [getProfile.message] - Optional message
 * @property {Profile} getProfile.profile - User's profile data
 * @property {string} getProfile.connectionStatus - Connection status with current user
 * @property {string} getProfile.connectionId - Connection ID if connected
 */
export interface GetProfileResponse {
  getProfile: {
    success: boolean;
    message?: string;
    profile: Profile;
    connectionStatus: string;
    connectionId: string;
  };
}

/**
 * Response from updating a user's profile.
 *
 * @interface UpdateProfileResponse
 * @property {Object} updateProfile - Mutation result
 * @property {boolean} updateProfile.success - Whether update was successful
 * @property {string} [updateProfile.message] - Optional message
 * @property {Profile} updateProfile.profile - Updated profile data
 */
export interface UpdateProfileResponse {
  updateProfile: {
    success: boolean;
    message?: string;
    profile: Profile;
  };
}

/**
 * Response from uploading a profile picture.
 *
 * @interface UploadProfilePictureResponse
 * @property {Object} uploadProfilePicture - Mutation result
 * @property {boolean} uploadProfilePicture.success - Whether upload was successful
 * @property {string} [uploadProfilePicture.message] - Optional message
 * @property {Object} uploadProfilePicture.profile - Updated profile data
 * @property {string} uploadProfilePicture.profile.userId - User ID
 * @property {string} uploadProfilePicture.profile.avatarUrl - New avatar URL
 * @property {Object} uploadProfilePicture.profile.profileCompletion - Updated completion
 */
export interface UploadProfilePictureResponse {
  uploadProfilePicture: {
    success: boolean;
    message?: string;
    profile: {
      userId: string;
      avatarUrl: string;
      profileCompletion: {
        percentage: number;
      };
    };
  };
}

/**
 * Response from uploading a cover photo.
 *
 * @interface UploadCoverPhotoResponse
 * @property {Object} uploadCoverPhoto - Mutation result
 * @property {boolean} uploadCoverPhoto.success - Whether upload was successful
 * @property {string} [uploadCoverPhoto.message] - Optional message
 * @property {Object} uploadCoverPhoto.profile - Updated profile data
 * @property {string} uploadCoverPhoto.profile.coverPhoto - New cover photo URL
 * @property {string} uploadCoverPhoto.profile.updatedAt - Update timestamp
 * @property {string} [uploadCoverPhoto.error] - Error message if failed
 */
export interface UploadCoverPhotoResponse {
  uploadCoverPhoto: {
    success: boolean;
    message?: string;
    profile: {
      coverPhoto: string;
      updatedAt: string;
    };
    error?: string;
  };
}
