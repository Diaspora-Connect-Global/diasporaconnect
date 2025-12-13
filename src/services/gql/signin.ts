import { gql } from '@apollo/client';

// ============================================================================
// LOGIN MUTATIONS
// ============================================================================

/**
 * Authenticates a user with email and password.
 * 
 * @description
 * Logs in a user using their email and password credentials. Supports optional
 * two-factor authentication and device fingerprinting for enhanced security.
 * Returns session tokens for maintaining authenticated state across requests.
 * 
 * @example
 * ```typescript
 * import { useMutation } from '@apollo/client';
 * import { LOGIN_USER, LoginInput, LoginResponse } from './auth.mutations';
 * 
 * function LoginForm() {
 *   const [loginUser, { loading, error }] = useMutation<LoginResponse>(LOGIN_USER);
 * 
 *   const handleSubmit = async (formData: LoginInput) => {
 *     try {
 *       const { data } = await loginUser({
 *         variables: {
 *           input: {
 *             email: "user@example.com",
 *             password: "SecurePass@123",
 *             deviceId: "device-fingerprint-uuid",
 *             rememberMe: true
 *           }
 *         }
 *       });
 * 
 *       if (data?.login.requiresTwoFactor) {
 *         // Navigate to 2FA verification page
 *         router.push('/verify-2fa');
 *       } else if (data?.login.success) {
 *         // Store tokens in secure storage
 *         localStorage.setItem('accessToken', data.login.accessToken);
 *         localStorage.setItem('refreshToken', data.login.refreshToken);
 *         localStorage.setItem('sessionId', data.login.sessionId);
 *         
 *         // Navigate to dashboard
 *         router.push('/dashboard');
 *       }
 *     } catch (err) {
 *       console.error('Login failed:', err);
 *     }
 *   };
 * 
 *   return <form onSubmit={handleSubmit}>...</form>;
 * }
 * ```
 * 
 * @returns {LoginResponse} Session tokens and user profile
 */
export const LOGIN_USER = gql`
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      success
      message
      sessionToken
      accessToken
      refreshToken
      sessionId
      expiresIn
      requiresTwoFactor
      user {
        id
        email
        firstName
        lastName
        role
      }
      deviceMetadata {
        fingerprint
        ipAddress
        userAgent
        deviceId
      }
      error
    }
  }
`;

// ============================================================================
// LOGOUT MUTATIONS
// ============================================================================

/**
 * Logs out the current user session.
 * 
 * @description
 * Terminates the user's current session or optionally all active sessions
 * across all devices. Invalidates the associated session tokens and clears
 * authentication state.
 * 
 * @example
 * ```typescript
 * import { useMutation } from '@apollo/client';
 * import { LOGOUT_USER, LogoutResponse } from './auth.mutations';
 * 
 * function LogoutButton() {
 *   const [logoutUser, { loading }] = useMutation<LogoutResponse>(LOGOUT_USER);
 * 
 *   const handleLogout = async (logoutAllDevices: boolean = false) => {
 *     try {
 *       const { data } = await logoutUser({
 *         variables: {
 *           logoutAllSessions: logoutAllDevices
 *         }
 *       });
 * 
 *       if (data?.logout.success) {
 *         // Clear local storage
 *         localStorage.removeItem('accessToken');
 *         localStorage.removeItem('refreshToken');
 *         localStorage.removeItem('sessionId');
 *         
 *         // Redirect to login page
 *         router.push('/login');
 *       }
 *     } catch (err) {
 *       console.error('Logout failed:', err);
 *     }
 *   };
 * 
 *   return (
 *     <div>
 *       <button onClick={() => handleLogout(false)}>
 *         Logout This Device
 *       </button>
 *       <button onClick={() => handleLogout(true)}>
 *         Logout All Devices
 *       </button>
 *     </div>
 *   );
 * }
 * ```
 * 
 * @param {boolean} logoutAllSessions - If true, logs out from all devices
 * @returns {LogoutResponse} Success status and message
 */
export const LOGOUT_USER = gql`
  mutation Logout($logoutAllSessions: Boolean!) {
    logout(logoutAllSessions: $logoutAllSessions) {
      success
      message
      error
    }
  }
`;

// ============================================================================
// TYPESCRIPT INTERFACES
// ============================================================================

/**
 * Input type for user login.
 * 
 * @property {string} email - User's registered email address
 * @property {string} password - User's password
 * @property {string} deviceId - Unique device identifier/fingerprint
 * @property {boolean} [rememberMe] - Optional: Keep user logged in for extended period
 * @property {string} [twoFactorCode] - Optional: 6-digit 2FA code (required if 2FA is enabled)
 */
export interface LoginInput {
  email: string;
  password: string;
  deviceId: string;
  rememberMe?: boolean;
  twoFactorCode?: string;
}

/**
 * Response from login mutation.
 * 
 * @property {boolean} success - Whether login was successful
 * @property {string} message - Success or error message
 * @property {string} sessionToken - Session token for authentication
 * @property {string} accessToken - JWT access token for API requests
 * @property {string} refreshToken - Token for refreshing expired access tokens
 * @property {string} sessionId - Unique session identifier
 * @property {number} expiresIn - Token expiry time in seconds
 * @property {boolean} requiresTwoFactor - Whether 2FA verification is required
 * @property {Object} user - Authenticated user's profile data
 * @property {Object} deviceMetadata - Information about the login device
 * @property {string} [error] - Error message if login failed
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
    user: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      role: string;
    };
    deviceMetadata: {
      fingerprint: string;
      ipAddress: string;
      userAgent: string;
      deviceId: string;
    };
    error?: string;
  };
}

/**
 * Response from logout mutation.
 * 
 * @property {boolean} success - Whether logout was successful
 * @property {string} message - Success or error message
 * @property {string} [error] - Error message if logout failed
 */
export interface LogoutResponse {
  logout: {
    success: boolean;
    message: string;
    error?: string;
  };
}