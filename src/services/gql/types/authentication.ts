/**
 * @fileoverview Authentication-related type definitions for GraphQL operations.
 * Contains interfaces for user registration, OAuth, OTP verification,
 * password reset, and token refresh operations.
 * @module services/gql/types/authentication
 */

// ============================================================================
// REGISTRATION TYPES
// ============================================================================

/**
 * Input type for user registration with email/password.
 *
 * @interface RegisterUserInput
 * @property {string} email - Valid email address
 * @property {string} password - Strong password (min 8 chars, uppercase, lowercase, number, special char)
 * @property {string} firstName - User's first name
 * @property {string} lastName - User's last name
 * @property {string} phone - Phone number with country code (e.g., +233551810814)
 * @property {string} country - ISO 3166-1 alpha-2 country code (e.g., GH, US, UK)
 * @property {'diaspora' | 'local'} role - User role type
 *
 * @example
 * ```typescript
 * const registerInput: RegisterUserInput = {
 *   email: "user@example.com",
 *   password: "SecurePass@123",
 *   firstName: "John",
 *   lastName: "Doe",
 *   phone: "+233551810814",
 *   country: "GH",
 *   role: "local"
 * };
 * ```
 */
export interface RegisterUserInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  country: string;
  role: 'diaspora' | 'local';
}

/**
 * Metadata returned during registration flow.
 *
 * @interface RegistrationMeta
 * @property {string} registrationFlow - Type of registration flow (e.g., 'standard', 'oauth')
 * @property {string} userEmail - Email used for registration
 * @property {string} phoneNumber - Phone number for OTP verification
 */
export interface RegistrationMeta {
  registrationFlow: string;
  userEmail: string;
  phoneNumber: string;
}

/**
 * Response from user registration mutation.
 *
 * @interface RegisterUserResponse
 * @property {Object} registerUser - Registration result object
 * @property {boolean} registerUser.success - Whether registration was successful
 * @property {string} registerUser.registrationToken - Token for OTP verification (expires in 10 minutes)
 * @property {number} registerUser.expiresIn - Token expiry time in seconds
 * @property {string} registerUser.message - Success or error message
 * @property {string} registerUser.verificationMethod - Method used for verification (typically 'sms')
 * @property {boolean} registerUser.smsSent - Whether SMS was successfully sent
 * @property {string} registerUser.verificationExpiresAt - ISO timestamp when OTP expires
 * @property {number} registerUser.verificationTtlSeconds - OTP validity duration in seconds
 * @property {RegistrationMeta} registerUser.meta - Additional registration metadata
 */
export interface RegisterUserResponse {
  registerUser: {
    success: boolean;
    registrationToken: string;
    expiresIn: number;
    message: string;
    verificationMethod: string;
    smsSent: boolean;
    verificationExpiresAt: string;
    verificationTtlSeconds: number;
    meta: RegistrationMeta;
  };
}

// ============================================================================
// OAUTH REGISTRATION TYPES
// ============================================================================

/**
 * Input type for completing OAuth registration.
 *
 * @interface CompleteOAuthRegistrationInput
 * @property {string} oauthRegistrationToken - Token received from OAuth callback
 * @property {string} firstName - User's first name (may be pre-filled from OAuth)
 * @property {string} lastName - User's last name (may be pre-filled from OAuth)
 * @property {string} phone - Phone number with country code
 * @property {string} country - ISO 3166-1 alpha-2 country code
 * @property {'diaspora' | 'local'} role - User role type
 *
 * @example
 * ```typescript
 * const oauthInput: CompleteOAuthRegistrationInput = {
 *   oauthRegistrationToken: "oauth-token-from-callback",
 *   firstName: "John",
 *   lastName: "Doe",
 *   phone: "+233551810814",
 *   country: "GH",
 *   role: "diaspora"
 * };
 * ```
 */
export interface CompleteOAuthRegistrationInput {
  oauthRegistrationToken: string;
  firstName: string;
  lastName: string;
  phone: string;
  country: string;
  role: 'diaspora' | 'local' | 'community_admin';
}

/**
 * Response from OAuth registration completion mutation.
 * Similar structure to RegisterUserResponse.
 *
 * @interface CompleteOAuthRegistrationResponse
 */
export interface CompleteOAuthRegistrationResponse {
  completeOAuthRegistration: {
    success: boolean;
    message: string;
    registrationToken: string;
    expiresIn: number;
    verificationMethod: string;
    smsSent: boolean;
    verificationExpiresAt: string;
    verificationTtlSeconds: number;
    meta: RegistrationMeta;
  };
}

// ============================================================================
// OTP VERIFICATION TYPES
// ============================================================================

/**
 * User data returned after successful OTP verification.
 *
 * @interface VerifiedUser
 * @property {string} id - User's unique identifier
 * @property {string} email - User's email address
 * @property {string} firstName - User's first name
 * @property {string} lastName - User's last name
 * @property {string} role - User's role ('diaspora' | 'local')
 */
export interface VerifiedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

/**
 * Device metadata captured during authentication.
 *
 * @interface DeviceMetadata
 * @property {string} fingerprint - Unique device fingerprint
 * @property {string} ipAddress - IP address of the device
 * @property {string} userAgent - Browser/device user agent string
 * @property {string} deviceId - Unique device identifier
 */
export interface DeviceMetadata {
  fingerprint: string;
  ipAddress: string;
  userAgent: string;
  deviceId: string;
}

/**
 * Response from OTP verification mutation.
 *
 * @interface VerifyOtpResponse
 * @property {Object} verifyRegistrationOtp - Verification result
 * @property {boolean} verifyRegistrationOtp.success - Whether verification was successful
 * @property {string} verifyRegistrationOtp.message - Success or error message
 * @property {string} verifyRegistrationOtp.sessionToken - JWT token for authenticated API requests
 * @property {boolean} verifyRegistrationOtp.requires2fa - Whether 2FA setup is required
 * @property {VerifiedUser} verifyRegistrationOtp.user - Verified user's profile data
 * @property {DeviceMetadata} verifyRegistrationOtp.deviceMetadata - Information about the device used
 */
export interface VerifyOtpResponse {
  verifyRegistrationOtp: {
    success: boolean;
    message: string;
    sessionToken: string;
    requires2fa: boolean;
    user: VerifiedUser;
    deviceMetadata: DeviceMetadata;
  };
}

// ============================================================================
// AVAILABILITY CHECK TYPES
// ============================================================================

/**
 * Response from email availability check query.
 *
 * @interface CheckEmailAvailabilityResponse
 * @property {boolean} isEmailAvailable - True if email is available for registration
 */
export interface CheckEmailAvailabilityResponse {
  isEmailAvailable: boolean;
}

/**
 * Response from phone availability check query.
 *
 * @interface CheckPhoneAvailabilityResponse
 * @property {boolean} isPhoneAvailable - True if phone number is available for registration
 */
export interface CheckPhoneAvailabilityResponse {
  isPhoneAvailable: boolean;
}

// ============================================================================
// TOKEN REFRESH TYPES
// ============================================================================

/**
 * Response from refresh token mutation.
 *
 * @interface RefreshTokenResponse
 * @property {Object} refreshToken - Token refresh result
 * @property {boolean} refreshToken.success - Whether the token refresh was successful
 * @property {string} refreshToken.message - Success or error message
 * @property {VerifiedUser} refreshToken.user - Authenticated user profile
 * @property {string} refreshToken.refreshToken - New refresh token (may be rotated)
 * @property {string} refreshToken.sessionToken - New JWT session token
 * @property {string} refreshToken.refreshTokenExpiry - ISO timestamp when refresh token expires
 * @property {string} refreshToken.sessionTokenExpiry - ISO timestamp when session token expires
 */
export interface RefreshTokenResponse {
  refreshToken: {
    success: boolean;
    message: string;
    user: VerifiedUser;
    refreshToken: string;
    sessionToken: string;
    refreshTokenExpiry: string;
    sessionTokenExpiry: string;
  };
}

// ============================================================================
// RESEND OTP TYPES
// ============================================================================

/**
 * Response from resend OTP mutation.
 *
 * @interface ResendRegistrationOtpResponse
 * @property {Object} resendRegistrationOtp - Resend result
 * @property {boolean} resendRegistrationOtp.success - Whether OTP was resent successfully
 * @property {string} resendRegistrationOtp.message - Success or error message
 * @property {string} resendRegistrationOtp.verificationExpiresAt - ISO timestamp when new OTP expires
 * @property {number} resendRegistrationOtp.verificationTtlSeconds - New OTP validity duration
 * @property {boolean} resendRegistrationOtp.smsSent - Whether SMS was successfully sent
 */
export interface ResendRegistrationOtpResponse {
  resendRegistrationOtp: {
    success: boolean;
    message: string;
    verificationExpiresAt: string;
    verificationTtlSeconds: number;
    smsSent: boolean;
  };
}

// ============================================================================
// OAUTH PHONE VERIFICATION (post completeOAuthRegistration)
// ============================================================================

/**
 * Response from OAuth phone OTP verification.
 * On success, backend sets session cookie; user is logged in.
 */
export interface VerifyOAuthPhoneOtpResponse {
  verifyOAuthPhoneOtp: boolean | string;
}

/**
 * Response from resending OAuth OTP (verifyOAuthPhone).
 */
export interface ResendOAuthOtpResponse {
  verifyOAuthPhone: boolean;
}
