/**
 * @fileoverview Sign-in and logout-related type definitions for GraphQL operations.
 * Contains interfaces for user authentication and session management.
 * @module services/gql/types/signin
 */

import type { DeviceMetadata } from './authentication';

// ============================================================================
// LOGIN INPUT TYPES
// ============================================================================

/**
 * Input type for user login.
 *
 * @interface LoginInput
 * @property {string} email - User's registered email address
 * @property {string} password - User's password
 * @property {string} deviceId - Unique device identifier/fingerprint
 * @property {boolean} [rememberMe] - Optional: Keep user logged in for extended period
 * @property {string} [twoFactorCode] - Optional: 6-digit 2FA code (required if 2FA is enabled)
 *
 * @example
 * ```typescript
 * const loginInput: LoginInput = {
 *   email: "user@example.com",
 *   password: "SecurePass@123",
 *   deviceId: "device-fingerprint-uuid",
 *   rememberMe: true
 * };
 * ```
 */
export interface LoginInput {
  email: string;
  password: string;
  deviceId: string;
  rememberMe?: boolean;
  twoFactorCode?: string;
}

// ============================================================================
// LOGIN RESPONSE TYPES
// ============================================================================

/**
 * User information returned after successful login.
 *
 * @interface LoginUser
 * @property {string} id - User's unique identifier
 * @property {string} email - User's email address
 * @property {string} firstName - User's first name
 * @property {string} lastName - User's last name
 * @property {string} role - User's role ('diaspora' | 'local')
 * @property {string} [avatarUrl] - URL to user's profile picture
 */
export interface LoginUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  avatarUrl?: string;
}

/**
 * Response from login mutation.
 *
 * @interface LoginResponse
 * @property {Object} login - Login result
 * @property {boolean} login.success - Whether login was successful
 * @property {string} login.message - Success or error message
 * @property {string} login.sessionToken - Session token for authentication
 * @property {string} login.accessToken - JWT access token for API requests
 * @property {string} login.refreshToken - Token for refreshing expired access tokens
 * @property {string} login.sessionId - Unique session identifier
 * @property {number} login.expiresIn - Token expiry time in seconds
 * @property {boolean} login.requiresTwoFactor - Whether 2FA verification is required
 * @property {string} [login.avatarUrl] - User's avatar URL
 * @property {LoginUser} login.user - Authenticated user's profile data
 * @property {DeviceMetadata} login.deviceMetadata - Information about the login device
 * @property {string} [login.error] - Error message if login failed
 *
 * @example
 * ```typescript
 * // Successful login response
 * const response: LoginResponse = {
 *   login: {
 *     success: true,
 *     message: "Login successful",
 *     sessionToken: "session-token",
 *     accessToken: "jwt-access-token",
 *     refreshToken: "refresh-token",
 *     sessionId: "session-uuid",
 *     expiresIn: 3600,
 *     requiresTwoFactor: false,
 *     user: {
 *       id: "user-uuid",
 *       email: "user@example.com",
 *       firstName: "John",
 *       lastName: "Doe",
 *       role: "local"
 *     },
 *     deviceMetadata: {
 *       fingerprint: "device-fingerprint",
 *       ipAddress: "192.168.1.1",
 *       userAgent: "Mozilla/5.0...",
 *       deviceId: "device-uuid"
 *     }
 *   }
 * };
 * ```
 */
export interface LoginResponse {
  login: {
    success: boolean;
    message: string;
    sessionToken: string;
    accessToken: string;
    refreshToken: string;
    sessionId: string;
    expiresIn: number;
    requiresTwoFactor: boolean;
    avatarUrl?: string;
    user: LoginUser;
    deviceMetadata: DeviceMetadata;
    error?: string;
  };
}

// ============================================================================
// LOGOUT TYPES
// ============================================================================

/**
 * Response from logout mutation.
 *
 * @interface LogoutResponse
 * @property {Object} logout - Logout result
 * @property {boolean} logout.success - Whether logout was successful
 * @property {string} logout.message - Success or error message
 * @property {string} [logout.error] - Error message if logout failed
 *
 * @example
 * ```typescript
 * const response: LogoutResponse = {
 *   logout: {
 *     success: true,
 *     message: "Logout successful"
 *   }
 * };
 * ```
 */
export interface LogoutResponse {
  logout: {
    success: boolean;
    message: string;
    error?: string;
  };
}
