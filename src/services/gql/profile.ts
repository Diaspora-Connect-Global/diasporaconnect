import { gql } from '@apollo/client';

// Re-export types from the types folder for backward compatibility
export type {
  ProfileCompletion,
  Profile,
  UpdateProfileInput,
  GetProfileResponse,
  UpdateProfileResponse,
  UploadProfilePictureResponse,
  UploadCoverPhotoResponse,
  GetProfileByUsernameResponse,
  UsernameAvailability,
  UsernameAvailabilityResponse,
  UsernameUnavailableReason,
  UpdateUsernameCode,
  UpdateUsernameResult,
  UpdateUsernameResponse,
} from './types';

// ============================================================================
// PROFILE QUERIES
// ============================================================================

/**
 * Get the current user's profile.
 * 
 * @example
 * ```typescript
 * const { data, loading } = useQuery<GetProfileResponse>(GET_MY_PROFILE);
 * if (data?.getProfile.success) {
 *   console.log(data.getProfile.profile);
 * }
 * ```
 */
export const GET_MY_PROFILE = gql`
  query GetMyProfile {
    getProfile {
      success
      message
      profile {
        userId
        username
        usernameChangedAt
        usernameNextChangeAt
        email
        phone
        firstName
        lastName
        middleName
        countryOfOrigin
        residenceCountry
        residenceSinceYear
        residenceSinceMonth
        city
        sector
        industry
        bio
        avatarUrl
        coverPhoto
        gender
        dateOfBirth
        connectionCount
        trustScore
        version
        verificationStatus
        createdAt
        updatedAt
        profileCompletion {
          percentage
          completedSections
          missingSections
        }
      }
    }
  }
`;

/**
 * Get another user's profile by userId.
 * 
 * @example
 * ```typescript
 * const { data } = useQuery<GetProfileResponse>(GET_USER_PROFILE, {
 *   variables: { userId: "b75c6675-e78b-4c6a-82f4-18d4d9a84796" }
 * });
 * ```
 */
export const GET_USER_PROFILE = gql`
  query GetUserProfile($userId: String!) {
    getProfile(userId: $userId) {
      success
      message
      profile {
        userId
        username
        email
        firstName
        middleName
        lastName
        countryOfOrigin
        residenceCountry
        city
        location
        bio
        avatarUrl
        connectionCount
        trustScore
        updatedAt
      }
    connectionStatus
    connectionId
    }
  }
`;

/**
 * Load another user's profile by their username (the `/@username` route).
 * Same selection and response shape as GET_USER_PROFILE, so both routes can
 * feed the same view. Send the NORMALIZED username (lowercase, no '@').
 */
export const GET_PROFILE_BY_USERNAME = gql`
  query GetProfileByUsername($username: String!) {
    profileByUsername(username: $username) {
      success
      message
      profile {
        userId
        username
        email
        firstName
        middleName
        lastName
        countryOfOrigin
        residenceCountry
        city
        location
        bio
        avatarUrl
        connectionCount
        trustScore
        updatedAt
      }
      connectionStatus
      connectionId
    }
  }
`;

/**
 * Is `username` free for the current user? `reason` is INVALID | RESERVED |
 * TAKEN when unavailable. Always query network-only — availability changes.
 */
export const USERNAME_AVAILABILITY = gql`
  query UsernameAvailability($username: String!) {
    usernameAvailability(username: $username) {
      available
      reason
    }
  }
`;

// ============================================================================
// PROFILE MUTATIONS
// ============================================================================

/**
 * Change the current user's username. Refusals RESOLVE with
 * `{ success: false, code }` (INVALID | RESERVED | TAKEN | TOO_SOON) — check
 * `success`, never just the absence of a throw.
 */
export const UPDATE_USERNAME = gql`
  mutation UpdateUsername($username: String!) {
    updateUsername(username: $username) {
      success
      code
      message
      username
      nextChangeAt
    }
  }
`;

// ============================================================================
// PROFILE MUTATIONS (continued)
// ============================================================================

/**
 * Update the current user's profile.
 * 
 * @example
 * ```typescript
 * const [updateProfile] = useMutation<UpdateProfileResponse>(UPDATE_PROFILE);
 * 
 * await updateProfile({
 *   variables: {
 *     input: {
 *       version: 7,
 *       firstName: "John",
 *       lastName: "Doe",
 *       bio: "Software Engineer"
 *     }
 *   }
 * });
 * ```
 */
export const UPDATE_PROFILE = gql`
  mutation UpdateProfile($input: UpdateProfileInput!) {
    updateProfile(input: $input) {
      success
      message
      profile {
        userId
        firstName
        lastName
        email
        countryOfOrigin
        residenceCountry
        sector
        industry
        bio
        avatarUrl
        coverPhoto
        gender
        connectionCount
        version
        verificationStatus
        profileCompletion {
          percentage
          completedSections
          missingSections
        }
        updatedAt
      }
    }
  }
`;

/**
 * Upload a profile picture.
 * 
 * @example
 * ```typescript
 * const [uploadPicture] = useMutation<UploadProfilePictureResponse>(UPLOAD_PROFILE_PICTURE);
 * 
 * await uploadPicture({
 *   variables: { file: imageFile }
 * });
 * ```
 */
export const UPLOAD_PROFILE_PICTURE = gql`
  mutation UploadProfilePicture($file: Upload!) {
    uploadProfilePicture(file: $file) {
      success
      message
      profile {
        userId
        avatarUrl
        profileCompletion {
          percentage
        }
      }
    }
  }
`;

/**
 * Upload a cover photo.
 * 
 * @example
 * ```typescript
 * const [uploadCover] = useMutation<UploadCoverPhotoResponse>(UPLOAD_COVER_PHOTO);
 * 
 * await uploadCover({
 *   variables: { file: coverImageFile }
 * });
 * ```
 */
export const UPLOAD_COVER_PHOTO = gql`
  mutation UploadCoverPhoto($file: Upload!) {
    uploadCoverPhoto(file: $file) {
      success
      message
      profile {
        coverPhoto
        updatedAt
      }
      error
    }
  }
`;