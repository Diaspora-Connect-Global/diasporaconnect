import { gql } from '@apollo/client';

// Re-export types from the types folder for backward compatibility
export type {
  LoginInput,
  LoginUser,
  LoginResponse,
  LogoutResponse,
} from './types';

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
 *         sessionStorage.setItem('accessToken', data.login.accessToken);
 *         sessionStorage.setItem('refreshToken', data.login.refreshToken);
 *         sessionStorage.setItem('sessionId', data.login.sessionId);
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
        avatarUrl

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
 *         sessionStorage.removeItem('accessToken');
 *         sessionStorage.removeItem('refreshToken');
 *         sessionStorage.removeItem('sessionId');
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
