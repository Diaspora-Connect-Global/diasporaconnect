import { gql } from '@apollo/client';

/**
 * Two-factor authentication (emailed 6-digit codes).
 *
 * Settings:
 *  - TWO_FACTOR_STATUS — the real server state; the switch shows only this.
 *  - Turning ON is two steps: ENABLE_TWO_FACTOR (password when required →
 *    emails a code), then CONFIRM_TWO_FACTOR (the code turns it on).
 *  - Turning OFF needs the password OR a code from SEND_TWO_FACTOR_DISABLE_CODE.
 *
 * Sign-in: `login` answers `requiresTwoFactor` + `twoFactorToken`; the code is
 * then sent with COMPLETE_TWO_FACTOR_LOGIN (same payload shape as `login`).
 * Google/Facebook sign-ins arrive with the token from the OAuth callback.
 */

export const TWO_FACTOR_STATUS = gql`
  query TwoFactorStatus {
    twoFactorStatus {
      enabled
      method
      passwordRequired
    }
  }
`;

export const ENABLE_TWO_FACTOR = gql`
  mutation EnableTwoFactor($password: String) {
    enableTwoFactor(password: $password) {
      success
      message
      error
    }
  }
`;

/** Enrolment step 2. The backend mutation is named `verifyTwoFactor`. */
export const CONFIRM_TWO_FACTOR = gql`
  mutation ConfirmTwoFactor($code: String!) {
    verifyTwoFactor(code: $code) {
      success
      message
      error
    }
  }
`;

export const SEND_TWO_FACTOR_DISABLE_CODE = gql`
  mutation SendTwoFactorDisableCode {
    sendTwoFactorDisableCode {
      success
      message
      error
    }
  }
`;

export const DISABLE_TWO_FACTOR = gql`
  mutation DisableTwoFactor($password: String, $code: String) {
    disableTwoFactor(password: $password, code: $code) {
      success
      message
      error
    }
  }
`;

export const COMPLETE_TWO_FACTOR_LOGIN = gql`
  mutation CompleteTwoFactorLogin($input: CompleteTwoFactorLoginInput!) {
    completeTwoFactorLogin(input: $input) {
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

export const RESEND_TWO_FACTOR_LOGIN_CODE = gql`
  mutation ResendTwoFactorLoginCode($twoFactorToken: String!) {
    resendTwoFactorLoginCode(twoFactorToken: $twoFactorToken) {
      success
      message
      error
    }
  }
`;
