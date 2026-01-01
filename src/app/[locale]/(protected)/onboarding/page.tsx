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
  VERIFY_OTP,
  RegisterUserResponse,
  CompleteOAuthRegistrationResponse,
  VerifyOtpResponse
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

  const [registerUser] =
    useMutation<RegisterUserResponse>(REGISTER_USER);

  const [completeOAuthRegistration] =
    useMutation<CompleteOAuthRegistrationResponse>(
      COMPLETE_OAUTH_REGISTRATION
    );

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

    if (savedData) setFormData(JSON.parse(savedData));
    if (savedStep) setCurrentStep(Number(savedStep));
  }, [isOAuth]);

  /* ------------------------------------------------------------------ */
  /* Persist state safely */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    if (isOAuth === null) return;

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
  /* Helpers */
  /* ------------------------------------------------------------------ */
  const updateData = (data: Partial<FormData>) =>
    setFormData(prev => ({ ...prev, ...data }));

  const nextStep = () =>
    setCurrentStep(s => Math.min(s + 1, 7));
  const prevStep = () =>
    setCurrentStep(s => Math.max(s - 1, 1));

  const formatPhone = (phone: string, countryCode: string) => {
    const clean = phone.replace(/[^\d]/g, '');

    // Remove leading 0 if present
    const phoneWithoutLeadingZero = clean.startsWith('0') ? clean.slice(1) : clean;

    // Append country code
    return `${countryCode}${phoneWithoutLeadingZero}`;
  };

  /* ------------------------------------------------------------------ */
  /* Step 4 – Send OTP */
  /* ------------------------------------------------------------------ */
  // page.tsx - Update submitFormA to store expiration time

  const submitFormA = async (continueToNext: boolean = false) => {
    try {
      setSendCodeLoading(true);
      const phone = formatPhone(formData.phoneNumber, formData.countryCode);
      console.log('Formatted Phone:', phone);
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

  /* ------------------------------------------------------------------ */
  /* Step 5 – Verify OTP */
  /* ------------------------------------------------------------------ */
  const submitFormB = async () => {
    try {
      setVerifyOTPLoading(true);
      const token =
        sessionStorage.getItem('registrationToken');

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
        sessionToken: sessionToken,
        refreshToken: '',
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

      sessionStorage.clear();

      toast.success('Phone number verified successfully!');
      nextStep();
    } catch (e: any) {
      toast.error(e.message);
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
          resendCode={async () => await submitFormA(false)}
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
          nextStep={() => router.push('/dashboard')}
          prevStep={prevStep}
        />
      )}
    </>
  );
}
