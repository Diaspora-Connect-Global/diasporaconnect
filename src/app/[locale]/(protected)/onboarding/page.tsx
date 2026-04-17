/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useEffect, useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { redirect, useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { Step1 } from './steps/Step1';
import { Step2 } from './steps/Step2';
import { Step3 } from './steps/Step3';
import { Step4 } from './steps/Step4';
import { Step5 } from './steps/Step5';
import { Step6 } from './steps/Step6';
import { Step7 } from './steps/Step7';

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

import { useAuthStore } from '@/store/useAuthStore';
import { useUserStore } from '@/store/useUserStore';

export interface FormData {
  firstName: string;
  lastName: string;
  community: any[];
  communityType: string;
  country: string;
  countryCode: string;
  phoneNumber: string;
  verificationCode: string;
  topics: string[];
  recommendations: string[];
}

export default function CompleteAccount() {
  const router = useRouter();
  const { setTokens, setDeviceMetadata } =
    useAuthStore();
  const { setUser } = useUserStore();

  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    community: [],
    communityType: '',
    country: '',
    countryCode: '',
    phoneNumber: '',
    verificationCode: '',
    topics: [],
    recommendations: []
  });

  const [currentStep, setCurrentStep] = useState(1);
  const [sendCodeLoading, setSendCodeLoading] =
    useState(false);
  const [verifyOTPLoading, setVerifyOTPLoading] =
    useState(false);

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
  const updateData = (data: Partial<FormData>) =>
    setFormData(prev => ({ ...prev, ...data }));

  const nextStep = () =>
    setCurrentStep(s => Math.min(s + 1, 7));
  const prevStep = () =>
    setCurrentStep(s => Math.max(s - 1, 1));

  const formatPhone = (phone: string, countryCode: string) => {
    const raw = (phone || '').trim();
    const countryDigits = (countryCode || '').replace(/\D/g, '');

    if (!raw || !countryDigits) return '';

    // Accept already international format: +<country><number>
    if (raw.startsWith('+')) {
      const normalized = `+${raw.slice(1).replace(/\D/g, '')}`;
      // Enforce consistency between selected country and phone prefix
      return normalized.startsWith(`+${countryDigits}`)
        ? normalized
        : '';
    }

    // Accept international prefix 00<country><number>
    if (raw.startsWith('00')) {
      const normalized = `+${raw.slice(2).replace(/\D/g, '')}`;
      // Enforce consistency between selected country and phone prefix
      return normalized.startsWith(`+${countryDigits}`)
        ? normalized
        : '';
    }

    const digits = raw.replace(/\D/g, '');
    if (!digits) return '';

    // Remove one local trunk zero for local input (e.g. 0470...)
    const localDigits = digits.startsWith('0') ? digits.slice(1) : digits;
    return `+${countryDigits}${localDigits}`;
  };

  /* ------------------------------------------------------------------ */
  /* Complete Onboarding */
  /* ------------------------------------------------------------------ */
  const completeOnboarding = () => {
    // Mark onboarding as completed to prevent cleanup on unmount
    onboardingCompletedRef.current = true;

    // Clear all onboarding-related sessionStorage items
    sessionStorage.removeItem('signupEmail');
    sessionStorage.removeItem('signupPassword');
    sessionStorage.removeItem('signupDeviceId');
    sessionStorage.removeItem('registrationToken');
    sessionStorage.removeItem('accountFormData');
    sessionStorage.removeItem('accountFormStep');
    sessionStorage.removeItem('oauthRegistration');
    sessionStorage.removeItem('otp_expires_at');

    // Navigate to home
    router.push('/');
  };

  /* ------------------------------------------------------------------ */
  /* Step 4 – Send OTP */
  /* ------------------------------------------------------------------ */
  // page.tsx - Update submitFormA to store expiration time

  const submitFormA = async (continueToNext: boolean = false) => {
    try {
      setSendCodeLoading(true);

      if (!formData.countryCode) {
        throw new Error('Please select your country code.');
      }

      const phone = formatPhone(formData.phoneNumber, formData.countryCode);
      if (!phone) {
        throw new Error('Please enter a valid phone number.');
      }

      let token = '';
      let verificationExpiresAt = '';

      if (isOAuth) {
        const { data } = await completeOAuthRegistration({
          variables: {
            input: {
              oauthRegistrationToken: JSON.parse(
                sessionStorage.getItem('oauthRegistration')!
              ).oauthRegistrationToken,
              firstName: formData.firstName,
              lastName: formData.lastName,
              phone,
              country: formData.country,
              role: formData.communityType
            }
          }
        });

        if (!data?.completeOAuthRegistration.success)
          throw new Error(data?.completeOAuthRegistration.message);

        token = data.completeOAuthRegistration.registrationToken;
        verificationExpiresAt = data.completeOAuthRegistration.verificationExpiresAt;
      } else {
        const { data } = await registerUser({
          variables: {
            input: {
              email: sessionStorage.getItem('signupEmail'),
              password: sessionStorage.getItem('signupPassword'),
              firstName: formData.firstName,
              lastName: formData.lastName,
              phone,
              country: formData.country,
              role: formData.communityType
            }
          }
        });

        if (!data?.registerUser.success)
          throw new Error(data?.registerUser.message);

        token = data.registerUser.registrationToken;
        verificationExpiresAt = data.registerUser.verificationExpiresAt;
      }

      // smsSent is not authoritative here; backend may return false while OTP is sent.

      sessionStorage.setItem('registrationToken', token);

      if (verificationExpiresAt) {
        const expirationTime = new Date(verificationExpiresAt).getTime();
        sessionStorage.setItem('otp_expires_at', expirationTime.toString());
      }

      toast.success(continueToNext ? 'Verification code sent!' : 'Code resent successfully!');

      if (continueToNext) {
        nextStep();
      }
    } catch (e: any) {
      toast.error(e.message);
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

      if (!data?.resendRegistrationOtp.success) {
        throw new Error(data?.resendRegistrationOtp.message || 'Unable to resend verification code.');
      }

      if (data.resendRegistrationOtp.verificationExpiresAt) {
        const expirationTime = new Date(data.resendRegistrationOtp.verificationExpiresAt).getTime();
        sessionStorage.setItem('otp_expires_at', expirationTime.toString());
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
    sessionStorage.removeItem('accountFormData');
    sessionStorage.removeItem('accountFormStep');
    sessionStorage.removeItem('oauthRegistration');
    router.push('/signup');
  };

  /* ------------------------------------------------------------------ */
  /* Step 5 – Verify OTP */
  /* ------------------------------------------------------------------ */
  const submitFormB = async () => {
    try {
      setVerifyOTPLoading(true);
      const token =
        sessionStorage.getItem('registrationToken');

      if (!token) {
        toast.error('Your verification session has expired. Please register again.');
        redirectToRegistration();
        return;
      }

      const { data } = await verifyOtp({
        variables: {
          registrationToken: token,
          otp: formData.verificationCode
        }
      });

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
      // (user still needs to complete Steps 6 & 7)
      sessionStorage.removeItem('signupEmail');
      sessionStorage.removeItem('signupPassword');
      sessionStorage.removeItem('signupDeviceId');
      sessionStorage.removeItem('registrationToken');
      sessionStorage.removeItem('otp_expires_at');

      toast.success('Phone number verified successfully!');
      nextStep();
    } catch (e: any) {
      const message = e?.message ?? String(e);
      if (
        message.includes('does not exist') ||
        message.includes('expired')
      ) {
        toast.error('Your verification code has expired. Please register again.');
        redirectToRegistration();
      } else {
        toast.error(message);
      }
    } finally {
      setVerifyOTPLoading(false);
    }
  };

  if (isOAuth === null) return null;

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
          nextStep={nextStep}
          prevStep={prevStep}
        />
      )}
      {currentStep === 4 && (
        <Step4
          data={formData}
          updateData={updateData}
          nextStep={() => submitFormA(true)}
          loading={sendCodeLoading}
          prevStep={prevStep}
        />
      )}
      {currentStep === 5 && (
        <Step5
          data={formData}
          updateData={updateData}
          nextStep={submitFormB}
          loading={verifyOTPLoading}
          prevStep={prevStep}
          resendCode={resendCode}
          resendLoading={sendCodeLoading}

        />
      )}
      {currentStep === 6 && (
        <Step6
          data={formData}
          updateData={updateData}
          nextStep={nextStep}
          prevStep={prevStep}
        />
      )}
      {currentStep === 7 && (
        <Step7
          data={formData}
          updateData={updateData}
          nextStep={completeOnboarding}
          prevStep={prevStep}
        />
      )}
    </>
  );
}
