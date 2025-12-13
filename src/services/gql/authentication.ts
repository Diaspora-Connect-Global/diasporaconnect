import { gql } from '@apollo/client';

// ============================================================================
// REGISTRATION MUTATIONS
// ============================================================================

/**
 * Registers a new user with email and password.
 * 
 * @description
 * Creates a new user account and sends an OTP to the provided phone number
 * for verification. The registration process requires phone verification
 * before the account is fully activated.
 * 
 * @example
 * ```typescript
 * import { useMutation } from '@apollo/client';
 * import { REGISTER_USER, RegisterUserInput, RegisterUserResponse } from './auth.mutations';
 * 
 * function SignUpForm() {
 *   const [registerUser, { loading, error }] = useMutation<RegisterUserResponse>(REGISTER_USER);
 * 
 *   const handleSubmit = async (formData: RegisterUserInput) => {
 *     try {
 *       const { data } = await registerUser({
 *         variables: {
 *           input: {
 *             email: "user@example.com",
 *             password: "SecurePass@123",
 *             firstName: "John",
 *             lastName: "Doe",
 *             phone: "+233551810814",
 *             country: "GH",
 *             role: "local"
 *           }
 *         }
 *       });
 * 
 *       if (data?.registerUser.success) {
 *         // Store registration token for OTP verification
 *         const token = data.registerUser.registrationToken;
 *         // Navigate to OTP verification page
 *         router.push(`/verify-otp?token=${token}`);
 *       }
 *     } catch (err) {
 *       console.error('Registration failed:', err);
 *     }
 *   };
 * 
 *   return <form onSubmit={handleSubmit}>...</form>;
 * }
 * ```
 * 
 * @returns {RegisterUserResponse} Registration token and verification details
 */
export const REGISTER_USER = gql`
  mutation RegisterUser($input: RegisterUserInput!) {
    registerUser(input: $input) {
      success
      registrationToken
      expiresIn
      message
      verificationMethod
      smsSent
      verificationExpiresAt
      verificationTtlSeconds
      meta {
        registrationFlow
        userEmail
        phoneNumber
      }
    }
  }
`;

/**
 * Completes OAuth registration after social login redirect.
 * 
 * @description
 * After a user authenticates via Google, Facebook, or Twitter, they are
 * redirected back with an OAuth registration token. This mutation completes
 * the registration by adding additional required information (phone, country, role).
 * Similar to regular registration, this also requires phone verification via OTP.
 * 
 * @example
 * ```typescript
 * import { useMutation } from '@apollo/client';
 * import { COMPLETE_OAUTH_REGISTRATION, CompleteOAuthRegistrationResponse } from './auth.mutations';
 * 
 * function CompleteOAuthProfileForm() {
 *   const [completeRegistration] = useMutation<CompleteOAuthRegistrationResponse>(
 *     COMPLETE_OAUTH_REGISTRATION
 *   );
 *   const searchParams = useSearchParams();
 *   const oauthToken = searchParams.get('oauth_token');
 * 
 *   const handleComplete = async (profileData: {
 *     firstName: string;
 *     lastName: string;
 *     phone: string;
 *     country: string;
 *     role: 'diaspora' | 'local';
 *   }) => {
 *     try {
 *       const { data } = await completeRegistration({
 *         variables: {
 *           input: {
 *             oauthRegistrationToken: oauthToken,
 *             ...profileData
 *           }
 *         }
 *       });
 * 
 *       if (data?.completeOAuthRegistration.success) {
 *         const token = data.completeOAuthRegistration.registrationToken;
 *         // Proceed to OTP verification
 *         router.push(`/verify-otp?token=${token}`);
 *       }
 *     } catch (err) {
 *       console.error('OAuth registration completion failed:', err);
 *     }
 *   };
 * 
 *   return <form onSubmit={handleComplete}>...</form>;
 * }
 * ```
 * 
 * @returns {CompleteOAuthRegistrationResponse} Registration token for OTP verification
 */
export const COMPLETE_OAUTH_REGISTRATION = gql`
  mutation CompleteOAuthRegistration($input: CompleteOAuthRegistrationInput!) {
    completeOAuthRegistration(input: $input) {
      success
      message
      registrationToken
      expiresIn
      verificationMethod
      smsSent
      verificationExpiresAt
      verificationTtlSeconds
      meta {
        registrationFlow
        userEmail
        phoneNumber
      }
    }
  }
`;

/**
 * Verifies the OTP code sent during registration.
 * 
 * @description
 * Validates the OTP code sent to the user's phone number and completes
 * the registration process. Upon successful verification, returns a session
 * token for authenticated requests and the user's profile information.
 * 
 * @example
 * ```typescript
 * import { useMutation } from '@apollo/client';
 * import { VERIFY_OTP, VerifyOtpResponse } from './auth.mutations';
 * 
 * function OTPVerificationForm() {
 *   const [verifyOtp, { loading, error }] = useMutation<VerifyOtpResponse>(VERIFY_OTP);
 *   const searchParams = useSearchParams();
 *   const registrationToken = searchParams.get('token');
 * 
 *   const handleVerify = async (otpCode: string) => {
 *     try {
 *       const { data } = await verifyOtp({
 *         variables: {
 *           registrationToken: registrationToken,
 *           otp: otpCode
 *         }
 *       });
 * 
 *       if (data?.verifyRegistrationOtp.success) {
 *         // Store session token in secure storage
 *         localStorage.setItem('sessionToken', data.verifyRegistrationOtp.sessionToken);
 *         
 *         // Store user data
 *         const user = data.verifyRegistrationOtp.user;
 *         
 *         // Check if 2FA is required
 *         if (data.verifyRegistrationOtp.requires2fa) {
 *           router.push('/setup-2fa');
 *         } else {
 *           router.push('/dashboard');
 *         }
 *       }
 *     } catch (err) {
 *       console.error('OTP verification failed:', err);
 *     }
 *   };
 * 
 *   return (
 *     <form onSubmit={(e) => {
 *       e.preventDefault();
 *       handleVerify(otpInput);
 *     }}>
 *       <input type="text" maxLength={6} placeholder="Enter 6-digit code" />
 *       <button type="submit" disabled={loading}>Verify</button>
 *     </form>
 *   );
 * }
 * ```
 * 
 * @returns {VerifyOtpResponse} Session token and user profile
 */
export const VERIFY_OTP = gql`
  mutation VerifyOtp($registrationToken: String!, $otp: String!) {
    verifyRegistrationOtp(registrationToken: $registrationToken, otp: $otp) {
      success
      message
      sessionToken
      requires2fa
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
    }
  }
`;

// ============================================================================
// PASSWORD RESET MUTATIONS
// ============================================================================

/**
 * Initiates password reset process by sending a reset code to user's email.
 * 
 * @description
 * Sends a password reset code to the user's registered email address.
 * The code is time-limited and must be used with the RESET_PASSWORD mutation.
 * 
 * @example
 * ```typescript
 * import { useMutation } from '@apollo/client';
 * import { FORGOT_PASSWORD } from './auth.mutations';
 * 
 * function ForgotPasswordForm() {
 *   const [forgotPassword, { loading, data }] = useMutation(FORGOT_PASSWORD);
 * 
 *   const handleSubmit = async (email: string) => {
 *     try {
 *       await forgotPassword({
 *         variables: { email }
 *       });
 *       
 *       // Show success message
 *       toast.success('Reset code sent to your email');
 *       router.push(`/reset-password?email=${email}`);
 *     } catch (err) {
 *       console.error('Failed to send reset code:', err);
 *       toast.error('Email not found');
 *     }
 *   };
 * 
 *   return <form onSubmit={handleSubmit}>...</form>;
 * }
 * ```
 * 
 * @param {string} email - User's registered email address
 * @returns {boolean} Success status
 */
export const FORGOT_PASSWORD = gql`
  mutation ForgotPassword($email: String!) {
    forgotPassword(email: $email)
  }
`;

/**
 * Resets user password using the reset code from email.
 * 
 * @description
 * Validates the reset code and updates the user's password to the new value.
 * The reset code must be valid and not expired.
 * 
 * @example
 * ```typescript
 * import { useMutation } from '@apollo/client';
 * import { RESET_PASSWORD } from './auth.mutations';
 * 
 * function ResetPasswordForm() {
 *   const [resetPassword, { loading }] = useMutation(RESET_PASSWORD);
 *   const searchParams = useSearchParams();
 *   const email = searchParams.get('email');
 * 
 *   const handleSubmit = async (resetCode: string, newPassword: string) => {
 *     try {
 *       await resetPassword({
 *         variables: {
 *           email,
 *           resetCode,
 *           newPassword
 *         }
 *       });
 * 
 *       toast.success('Password reset successful');
 *       router.push('/login');
 *     } catch (err) {
 *       console.error('Password reset failed:', err);
 *       toast.error('Invalid or expired reset code');
 *     }
 *   };
 * 
 *   return <form onSubmit={handleSubmit}>...</form>;
 * }
 * ```
 * 
 * @param {string} email - User's email address
 * @param {string} resetCode - 6-digit code from email
 * @param {string} newPassword - New password (must meet security requirements)
 * @returns {boolean} Success status
 */
export const RESET_PASSWORD = gql`
  mutation ResetPassword($email: String!, $resetCode: String!, $newPassword: String!) {
    resetPassword(email: $email, resetCode: $resetCode, newPassword: $newPassword)
  }
`;

// ============================================================================
// AVAILABILITY QUERIES
// ============================================================================

/**
 * Checks if an email address is available for registration.
 * 
 * @description
 * Queries the database to determine if the provided email is already
 * registered. Useful for real-time validation during sign-up forms.
 * 
 * @example
 * ```typescript
 * import { useLazyQuery } from '@apollo/client';
 * import { CHECK_EMAIL_AVAILABILITY, CheckEmailAvailabilityResponse } from './auth.mutations';
 * 
 * function EmailInput() {
 *   const [checkEmail, { loading, data }] = useLazyQuery<CheckEmailAvailabilityResponse>(
 *     CHECK_EMAIL_AVAILABILITY
 *   );
 * 
 *   const handleEmailBlur = async (email: string) => {
 *     if (!email) return;
 *     
 *     const { data } = await checkEmail({
 *       variables: { email }
 *     });
 * 
 *     if (!data?.isEmailAvailable) {
 *       setError('This email is already registered');
 *     }
 *   };
 * 
 *   return (
 *     <input
 *       type="email"
 *       onBlur={(e) => handleEmailBlur(e.target.value)}
 *       placeholder="Enter your email"
 *     />
 *   );
 * }
 * ```
 * 
 * @param {string} email - Email address to check
 * @returns {boolean} True if available, false if already registered
 */
export const CHECK_EMAIL_AVAILABILITY = gql`
  query CheckEmailAvailability($email: String!) {
    isEmailAvailable(email: $email)
  }
`;

/**
 * Checks if a phone number is available for registration.
 * 
 * @description
 * Queries the database to determine if the provided phone number is already
 * registered. Useful for real-time validation during sign-up forms.
 * 
 * @example
 * ```typescript
 * import { useLazyQuery } from '@apollo/client';
 * import { CHECK_PHONE_AVAILABILITY, CheckPhoneAvailabilityResponse } from './auth.mutations';
 * 
 * function PhoneInput() {
 *   const [checkPhone, { loading }] = useLazyQuery<CheckPhoneAvailabilityResponse>(
 *     CHECK_PHONE_AVAILABILITY
 *   );
 * 
 *   const handlePhoneBlur = async (phone: string) => {
 *     if (!phone || phone.length < 10) return;
 *     
 *     const { data } = await checkPhone({
 *       variables: { phoneNumber: phone }
 *     });
 * 
 *     if (!data?.isPhoneAvailable) {
 *       setError('This phone number is already registered');
 *     }
 *   };
 * 
 *   return (
 *     <input
 *       type="tel"
 *       onBlur={(e) => handlePhoneBlur(e.target.value)}
 *       placeholder="+233551810814"
 *     />
 *   );
 * }
 * ```
 * 
 * @param {string} phoneNumber - Phone number to check (with country code)
 * @returns {boolean} True if available, false if already registered
 */
export const CHECK_PHONE_AVAILABILITY = gql`
  query CheckPhoneAvailability($phoneNumber: String!) {
    isPhoneAvailable(phoneNumber: $phoneNumber)
  }
`;

// ============================================================================
// TYPESCRIPT INTERFACES
// ============================================================================

/**
 * Input type for user registration with email/password.
 * 
 * @property {string} email - Valid email address
 * @property {string} password - Strong password (min 8 chars, uppercase, lowercase, number, special char)
 * @property {string} firstName - User's first name
 * @property {string} lastName - User's last name
 * @property {string} phone - Phone number with country code (e.g., +233551810814)
 * @property {string} country - ISO 3166-1 alpha-2 country code (e.g., GH, US, UK)
 * @property {'diaspora' | 'local'} role - User role type
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
 * Input type for completing OAuth registration.
 * 
 * @property {string} oauthRegistrationToken - Token received from OAuth callback
 * @property {string} firstName - User's first name (may be pre-filled from OAuth)
 * @property {string} lastName - User's last name (may be pre-filled from OAuth)
 * @property {string} phone - Phone number with country code
 * @property {string} country - ISO 3166-1 alpha-2 country code
 * @property {'diaspora' | 'local'} role - User role type
 */
export interface CompleteOAuthRegistrationInput {
  oauthRegistrationToken: string;
  firstName: string;
  lastName: string;
  phone: string;
  country: string;
  role: 'diaspora' | 'local';
}

/**
 * Response from user registration mutation.
 * 
 * @property {boolean} success - Whether registration was successful
 * @property {string} registrationToken - Token for OTP verification (expires in 10 minutes)
 * @property {number} expiresIn - Token expiry time in seconds
 * @property {string} message - Success or error message
 * @property {string} verificationMethod - Method used for verification (typically 'sms')
 * @property {boolean} smsSent - Whether SMS was successfully sent
 * @property {string} verificationExpiresAt - ISO timestamp when OTP expires
 * @property {number} verificationTtlSeconds - OTP validity duration in seconds
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
    meta: {
      registrationFlow: string;
      userEmail: string;
      phoneNumber: string;
    };
  };
}

/**
 * Response from OAuth registration completion mutation.
 * Identical structure to RegisterUserResponse.
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
    meta: {
      registrationFlow: string;
      userEmail: string;
      phoneNumber: string;
    };
  };
}

/**
 * Response from OTP verification mutation.
 * 
 * @property {boolean} success - Whether verification was successful
 * @property {string} message - Success or error message
 * @property {string} sessionToken - JWT token for authenticated API requests
 * @property {boolean} requires2fa - Whether 2FA setup is required
 * @property {Object} user - Verified user's profile data
 * @property {Object} deviceMetadata - Information about the device used for registration
 */
export interface VerifyOtpResponse {
  verifyRegistrationOtp: {
    success: boolean;
    message: string;
    sessionToken: string;
    requires2fa: boolean;
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
  };
}

/**
 * Response from email availability check query.
 * 
 * @property {boolean} isEmailAvailable - True if email is available for registration
 */
export interface CheckEmailAvailabilityResponse {
  isEmailAvailable: boolean;
}

/**
 * Response from phone availability check query.
 * 
 * @property {boolean} isPhoneAvailable - True if phone number is available for registration
 */
export interface CheckPhoneAvailabilityResponse {
  isPhoneAvailable: boolean;
}