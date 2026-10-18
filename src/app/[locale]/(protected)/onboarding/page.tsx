/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useEffect, useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { redirect, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { Step1 } from './steps/Step1';
import { Step2 } from './steps/Step2';
import { Step3 } from './steps/Step3';
import { Step4 } from './steps/Step4';
import { Step5 } from './steps/Step5';

import {
  REGISTER_USER,
  COMPLETE_OAUTH_REGISTRATION,
  RESEND_REGISTRATION_OTP,
  VERIFY_OTP,
  RegisterUserResponse,
  CompleteOAuthRegistrationResponse,
  ResendRegistrationOtpResponse,
  VerifyOtpResponse,
} from '@/services/gql/authentication';
import { SET_ONBOARDING_INTERESTS } from '@/services/gql/postsFeed';
import type {
  SetOnboardingInterestsData,
  SetOnboardingInterestsVars,
} from '@/services/gql/types/recommendation';

import { useAuthStore } from '@/store/useAuthStore';
import { useUserStore } from '@/store/useUserStore';
import { isNetworkError } from '@/lib/authErrorMessages';
import LoadingScreen from '@/components/custom/LoadingScreen';

export interface FormData {
  firstName: string;
  lastName: string;
  /** 'local' | 'diaspora' — sent as `role`. */
  communityType: string;
  country: string;
  verificationCode: string;
  topics: string[];
  recommendations: string[];
  /**
   * Whether the OTP was actually sent by SMS (per auth-service's OTP channel
   * settings — email is always attempted, SMS only when admin-enabled for
   * the user's country). Read off the mutation response; no phone is collected
   * during onboarding, so the code step's copy only ever names the email.
   */
  otpSmsSent?: boolean;
  /** The email the OTP was sent to, from the mutation response's meta.userEmail. */
  otpEmail?: string;
}

/** Steps: 1 name, 2 local/diaspora, 3 country (creates the account), 4 code, 5 topics. */
const TOTAL_STEPS = 5;

export default function CompleteAccount() {
  const t = useTranslations('onboarding');
  const router = useRouter();
  const { setTokens, setDeviceMetadata } =
    useAuthStore();
  const { setUser } = useUserStore();

  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    communityType: '',
    country: '',
    verificationCode: '',
    topics: [],
    recommendations: [],
    otpSmsSent: false,
  });

  const [currentStep, setCurrentStep] = useState(1);
  const [sendCodeLoading, setSendCodeLoading] =
    useState(false);
  const [verifyOTPLoading, setVerifyOTPLoading] =
    useState(false);
  // Persistent form-level error for the country (3, creates the account) and code (4) steps.
  const [formError, setFormError] = useState('');

  const [isOAuth, setIsOAuth] =
    useState<boolean | null>(null);

  // Track if onboarding was completed to prevent cleanup on successful completion
  const onboardingCompletedRef = React.useRef(false);

  const [registerUser] =
    useMutation<RegisterUserResponse>(REGISTER_USER);

  const [completeOAuthRegistration] =
    useMutation<CompleteOAuthRegistrationResponse>(
      COMPLETE_OAUTH_REGISTRATION
    );

  const [resendRegistrationOtp] =
    useMutation<ResendRegistrationOtpResponse>(RESEND_REGISTRATION_OTP);

  const [verifyOtp] =
    useMutation<VerifyOtpResponse>(VERIFY_OTP);

  const [setOnboardingInterests] = useMutation<
    SetOnboardingInterestsData,
    SetOnboardingInterestsVars
  >(SET_ONBOARDING_INTERESTS);

  /* ------------------------------------------------------------------ */
  /* Detect OAuth FIRST */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    const oauth = sessionStorage.getItem('oauthRegistration');
    setIsOAuth(!!oauth);
  }, []);

  /* ------------------------------------------------------------------ */
  /* Load saved onboarding state */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    if (isOAuth === null) return;

    if (!isOAuth) {
      const email = sessionStorage.getItem('signupEmail');
      const password =
        sessionStorage.getItem('signupPassword');

      if (!email || !password) {
        redirect('/signup');
        return;
      }
    }

    const savedData =
      sessionStorage.getItem('accountFormData');
    const savedStep =
      sessionStorage.getItem('accountFormStep');

    // if (savedData) setFormData(JSON.parse(savedData));
    // if (savedStep) setCurrentStep(Number(savedStep));
  }, [isOAuth]);

  /* ------------------------------------------------------------------ */
  /* Persist state safely */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    if (isOAuth === null) return;

    // Don't persist if onboarding is completed
    if (onboardingCompletedRef.current) return;

    sessionStorage.setItem(
      'accountFormData',
      JSON.stringify(formData)
    );
    sessionStorage.setItem(
      'accountFormStep',
      currentStep.toString()
    );
  }, [formData, currentStep, isOAuth]);

  /* ------------------------------------------------------------------ */
  /* Cleanup if user abandons onboarding (browser close/refresh) */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Only cleanup if onboarding wasn't completed
      if (!onboardingCompletedRef.current) {
        console.log('[Onboarding] User closing browser - cleaning up all data including auth');

        // Clear sessionStorage items
        sessionStorage.removeItem('signupEmail');
        sessionStorage.removeItem('signupPassword');
        sessionStorage.removeItem('signupDeviceId');
        sessionStorage.removeItem('registrationToken');
        sessionStorage.removeItem('accountFormData');
        sessionStorage.removeItem('accountFormStep');
        sessionStorage.removeItem('oauthRegistration');
        sessionStorage.removeItem('otp_expires_at');
        sessionStorage.removeItem('otp_ttl_ms');

        // Clear auth state (log them out)
        const { clearAuth } = useAuthStore.getState();
        const { clearUser } = useUserStore.getState();
        clearAuth();
        clearUser();
      }
    };

    // Listen for browser close/tab close/refresh
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  /* ------------------------------------------------------------------ */
  /* Helpers */
  /* ------------------------------------------------------------------ */
  const updateData = (data: Partial<FormData>) => {
    setFormError('');
    setFormData(prev => ({ ...prev, ...data }));
  };

  const nextStep = () => {
    setFormError('');
    setCurrentStep(s => Math.min(s + 1, TOTAL_STEPS));
  };
  const prevStep = () => {
    setFormError('');
    setCurrentStep(s => Math.max(s - 1, 1));
  };

  /* ------------------------------------------------------------------ */
  /* Persist cold-start interest topics into recommendation-service.    */
  /* Best-effort: failures must NOT block onboarding completion.        */
  /* ------------------------------------------------------------------ */
  const persistOnboardingInterests = async () => {
    // Normalize: lowercase + trim, drop empty entries, dedupe.
    // Step5 stores topic keys like `technology` / `artsCulture`; recommendation-
    // service stores topics as lowercase slugs, so we lowercase here.
    const normalized = Array.from(
      new Set(
        (formData.topics ?? [])
          .map((t) => (typeof t === 'string' ? t.trim().toLowerCase() : ''))
          .filter((t): t is string => t.length > 0)
      )
    );

    // Empty topics? Skip the call entirely — don't send an empty array.
    if (normalized.length === 0) return;

    try {
      await setOnboardingInterests({ variables: { topics: normalized } });
    } catch (err) {
      // Recommender will fall back to popular/cold-start content; non-fatal.
      console.warn('[Onboarding] setOnboardingInterests failed; continuing.', err);
    }
  };

  /* ------------------------------------------------------------------ */
  /* Complete Onboarding */
  /* ------------------------------------------------------------------ */
  const completeOnboarding = async () => {
    // Mark onboarding as completed to prevent cleanup on unmount
    onboardingCompletedRef.current = true;

    // Persist interest topics to recommendation-service. User already exists
    // (created in submitFormA) and is authenticated (JWT set in submitFormB),
    // so the recommendation-service can key the profile on the JWT userId.
    // Best-effort — never blocks the finish flow.
    await persistOnboardingInterests();

    // Clear all onboarding-related sessionStorage items
    sessionStorage.removeItem('signupEmail');
    sessionStorage.removeItem('signupPassword');
    sessionStorage.removeItem('signupDeviceId');
    sessionStorage.removeItem('registrationToken');
    sessionStorage.removeItem('accountFormData');
    sessionStorage.removeItem('accountFormStep');
    sessionStorage.removeItem('oauthRegistration');
    sessionStorage.removeItem('otp_expires_at');
    sessionStorage.removeItem('otp_ttl_ms');

    // Navigate to home
    router.push('/home');
  };

  /* ------------------------------------------------------------------ */
  /* Step 3 – Create the account (no phone) and send the code */
  /* ------------------------------------------------------------------ */
  // page.tsx - Update submitFormA to store expiration time

  const submitFormA = async (continueToNext: boolean = false) => {
    try {
      setSendCodeLoading(true);
      setFormError('');

      if (!formData.country) {
        throw new Error(t('location.country.placeholder'));
      }

      let token = '';
      let verificationExpiresAt = '';

      if (isOAuth) {
        const { data, error } = await completeOAuthRegistration({
          variables: {
            input: {
              oauthRegistrationToken: JSON.parse(
                sessionStorage.getItem('oauthRegistration')!
              ).oauthRegistrationToken,
              firstName: formData.firstName,
              lastName: formData.lastName,
              country: formData.country,
              role: formData.communityType
            }
          }
        });

        // errorPolicy 'all': a refusal RESOLVES with data null + error.
        if (error && !data?.completeOAuthRegistration) throw error;
        if (!data?.completeOAuthRegistration.success)
          throw new Error(data?.completeOAuthRegistration.message);

        token = data.completeOAuthRegistration.registrationToken;
        verificationExpiresAt = data.completeOAuthRegistration.verificationExpiresAt;
        updateData({
          otpSmsSent: Boolean(data.completeOAuthRegistration.smsSent),
          otpEmail: data.completeOAuthRegistration.meta?.userEmail || undefined,
        });
      } else {
        const { data, error } = await registerUser({
          variables: {
            input: {
              email: sessionStorage.getItem('signupEmail'),
              password: sessionStorage.getItem('signupPassword'),
              firstName: formData.firstName,
              lastName: formData.lastName,
              country: formData.country,
              role: formData.communityType
            }
          }
        });

        if (error && !data?.registerUser) throw error;
        if (!data?.registerUser.success)
          throw new Error(data?.registerUser.message);

        token = data.registerUser.registrationToken;
        verificationExpiresAt = data.registerUser.verificationExpiresAt;
        updateData({
          otpSmsSent: Boolean(data.registerUser.smsSent),
          otpEmail: data.registerUser.meta?.userEmail || sessionStorage.getItem('signupEmail') || undefined,
        });
      }

      // smsSent is not authoritative here; backend may return false while OTP is sent.

      sessionStorage.setItem('registrationToken', token);

      if (verificationExpiresAt) {
        const expirationTime = new Date(verificationExpiresAt).getTime();
        sessionStorage.setItem('otp_expires_at', expirationTime.toString());
        // Remembered so a resend can restart the countdown: the resend
        // mutation returns only a confirmation message, not a new expiry.
        sessionStorage.setItem('otp_ttl_ms', String(Math.max(0, expirationTime - Date.now())));
      }

      toast.success(continueToNext ? 'Verification code sent!' : 'Code resent successfully!');

      if (continueToNext) {
        nextStep();
      }
    } catch (e: any) {
      // Network failure → toast; validation/business errors → persistent banner.
      if (isNetworkError(e)) {
        toast.error(e.message);
      } else {
        setFormError(e.message);
      }
    } finally {
      setSendCodeLoading(false);
    }
  };

  const resendCode = async () => {
    if (isOAuth) {
      await submitFormA(false);
      return;
    }

    try {
      setSendCodeLoading(true);

      const registrationToken = sessionStorage.getItem('registrationToken');
      if (!registrationToken) {
        toast.error('Your verification session has expired. Please register again.');
        redirectToRegistration();
        return;
      }

      const { data } = await resendRegistrationOtp({
        variables: { registrationToken }
      });

      // A refusal arrives as a GraphQL error (thrown above); success is the
      // gateway's confirmation string.
      if (typeof data?.resendRegistrationOtp !== 'string') {
        throw new Error('Unable to resend verification code.');
      }

      // The new code lives as long as the first one did.
      const ttlMs = Number(sessionStorage.getItem('otp_ttl_ms'));
      if (ttlMs > 0) {
        sessionStorage.setItem('otp_expires_at', String(Date.now() + ttlMs));
      }

      toast.success('Code resent successfully!');
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to resend code.');
    } finally {
      setSendCodeLoading(false);
    }
  };

  /* ------------------------------------------------------------------ */
  /* Redirect to registration (clear token/session and go to signup) */
  /* ------------------------------------------------------------------ */
  const redirectToRegistration = () => {
    sessionStorage.removeItem('signupEmail');
    sessionStorage.removeItem('signupPassword');
    sessionStorage.removeItem('signupDeviceId');
    sessionStorage.removeItem('registrationToken');
    sessionStorage.removeItem('otp_expires_at');
    sessionStorage.removeItem('otp_ttl_ms');
    sessionStorage.removeItem('accountFormData');
    sessionStorage.removeItem('accountFormStep');
    sessionStorage.removeItem('oauthRegistration');
    router.push('/signup');
  };

  /* ------------------------------------------------------------------ */
  /* Step 4 – Verify OTP */
  /* ------------------------------------------------------------------ */
  const submitFormB = async () => {
    try {
      setVerifyOTPLoading(true);
      setFormError('');
      const token =
        sessionStorage.getItem('registrationToken');

      if (!token) {
        toast.error('Your verification session has expired. Please register again.');
        redirectToRegistration();
        return;
      }

      const { data, error } = await verifyOtp({
        variables: {
          registrationToken: token,
          otp: formData.verificationCode
        }
      });

      if (error && !data?.verifyRegistrationOtp) throw error;
      if (!data?.verifyRegistrationOtp.success)
        throw new Error(
          data?.verifyRegistrationOtp.message
        );

      const {
        sessionToken,
        user,
        deviceMetadata,
      } = data.verifyRegistrationOtp;

      setTokens({
        accessToken: sessionToken,
        sessionToken: sessionToken,
        refreshToken: undefined,
        sessionId: deviceMetadata.deviceId,
        expiresIn: 3600
      });

      setUser({
        ...user,
        userId: user.id,
        middleName: '',
        residenceSinceYear: new Date().getFullYear(),
        residenceSinceMonth: new Date().getMonth() + 1,
        bio: '',
        connectionCount: 0,
        version: 0,
        createdAt: '',
        updatedAt: ''
      });
      setDeviceMetadata(deviceMetadata);

      // Clear only signup credentials and registration tokens, NOT onboarding progress
      // (user still needs to pick topics)
      sessionStorage.removeItem('signupEmail');
      sessionStorage.removeItem('signupPassword');
      sessionStorage.removeItem('signupDeviceId');
      sessionStorage.removeItem('registrationToken');
      sessionStorage.removeItem('otp_expires_at');
      sessionStorage.removeItem('otp_ttl_ms');

      toast.success(t('confirmVerification.verified'));
      nextStep();
    } catch (e: any) {
      const message = e?.message ?? String(e);
      if (
        message.includes('does not exist') ||
        message.includes('expired')
      ) {
        toast.error('Your verification code has expired. Please register again.');
        redirectToRegistration();
      } else if (isNetworkError(e)) {
        toast.error(message);
      } else {
        // Wrong code → persistent banner on the OTP step.
        setFormError(message);
      }
    } finally {
      setVerifyOTPLoading(false);
    }
  };

  // Keep the same loader the route boundary (loading.tsx) just showed until we
  // know which flow this is, instead of a blank frame between the two.
  // (Deriving it synchronously would mismatch hydration: this route is
  // server-rendered and sessionStorage only exists in the browser.)
  if (isOAuth === null) return <LoadingScreen />;

  return (
    <>
      {currentStep === 1 && (
        <Step1
          data={formData}
          updateData={updateData}
          nextStep={nextStep}
          isOAuth={false}
        />
      )}
      {currentStep === 2 && (
        <Step2
          data={formData}
          updateData={updateData}
          nextStep={nextStep}
          prevStep={prevStep}
        />
      )}
      {currentStep === 3 && (
        <Step3
          data={formData}
          updateData={updateData}
          nextStep={() => submitFormA(true)}
          loading={sendCodeLoading}
          prevStep={prevStep}
          errorMessage={formError}
        />
      )}
      {currentStep === 4 && (
        <Step4
          data={formData}
          updateData={updateData}
          nextStep={submitFormB}
          loading={verifyOTPLoading}
          prevStep={prevStep}
          resendCode={resendCode}
          resendLoading={sendCodeLoading}
          errorMessage={formError}
        />
      )}
      {currentStep === 5 && (
        <Step5
          data={formData}
          updateData={updateData}
          nextStep={completeOnboarding}
          prevStep={prevStep}
        />
      )}
    </>
  );
}
