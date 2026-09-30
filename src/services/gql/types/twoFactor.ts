/**
 * Types for two-factor authentication (emailed 6-digit codes).
 *
 * Refusals RESOLVE as `{ success: false, error }`, where `error` is a stable
 * code (see `src/lib/twoFactorErrors.ts`) — never read success from the absence
 * of a throw.
 */
import type { LoginResponse } from './signin';

export interface TwoFactorStatusData {
  twoFactorStatus: {
    enabled: boolean;
    /** 'email' while enabled; null when off. */
    method: string | null;
    /**
     * Whether turning 2FA on asks for the account password. False for accounts
     * created with Google/Facebook: they never chose a password, so the
     * emailed code alone confirms it is them.
     */
    passwordRequired: boolean;
  };
}

export interface TwoFactorMutationResult {
  success: boolean;
  message?: string | null;
  error?: string | null;
}

export interface EnableTwoFactorData {
  enableTwoFactor: TwoFactorMutationResult;
}

export interface ConfirmTwoFactorData {
  verifyTwoFactor: TwoFactorMutationResult;
}

export interface SendTwoFactorDisableCodeData {
  sendTwoFactorDisableCode: TwoFactorMutationResult;
}

export interface DisableTwoFactorData {
  disableTwoFactor: TwoFactorMutationResult;
}

export interface ResendTwoFactorLoginCodeData {
  resendTwoFactorLoginCode: TwoFactorMutationResult;
}

export interface CompleteTwoFactorLoginData {
  completeTwoFactorLogin: LoginResponse['login'];
}

export interface CompleteTwoFactorLoginInput {
  twoFactorToken: string;
  code: string;
  deviceId?: string;
}
