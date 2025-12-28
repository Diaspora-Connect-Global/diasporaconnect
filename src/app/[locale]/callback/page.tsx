/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';

/**
 * Helper to log messages into sessionStorage
 */
const log = (message: string, data?: any) => {
  const logs = JSON.parse(sessionStorage.getItem('debugLogs') || '[]');
  logs.push({ message, data, timestamp: new Date().toISOString() });
  sessionStorage.setItem('debugLogs', JSON.stringify(logs));
};

/**
 * Helper to download logs as JSON
 */
export const downloadLogs = () => {
  const logs = sessionStorage.getItem('debugLogs') || '[]';
  const blob = new Blob([logs], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `debug_logs_${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

export default function OAuthCallbackPage() {
  const params = useSearchParams();
  const router = useRouter();
  const { setTokens, setUser, setDeviceMetadata } = useAuthStore();

  useEffect(() => {
    log('OAuthCallbackPage mounted', Object.fromEntries(params.entries()));
    log("Parameters ",params)

    const success = params.get('success') === 'true';
    log('Parsed success param', success);

    if (!success) {
      log('Login unsuccessful, redirecting to /signin');
      router.replace('/signin');
      return;
    }

    const oauthRegistrationRequired = params.get('oauthRegistrationRequired') === 'true';
    log('Parsed oauthRegistrationRequired', oauthRegistrationRequired);

    const sessionToken = params.get('sessionToken');
    log('sessionToken param', sessionToken);

    // CASE 1: Existing user → login directly
    if (!oauthRegistrationRequired && sessionToken) {
      log('Existing user detected, preparing user and device metadata');

      const user = {
        userId: params.get('userId'),
        email: params.get('email'),
        firstName: decodeURIComponent(params.get('firstName') || ''),
        lastName: decodeURIComponent(params.get('lastName') || ''),
        role: params.get('role')
      };
      log('User object', user);

      const deviceMetadata = {
        deviceId: params.get('fingerprint'),
        ipAddress: params.get('ipAddress'),
        userAgent: params.get('userAgent')
      };
      log('Device metadata object', deviceMetadata);

      setTokens({
        sessionToken: sessionToken,
        accessToken: sessionToken,
        refreshToken: '',
        sessionId: deviceMetadata.deviceId!,
        expiresIn: 3600
      });
      setUser(user as any);
      setDeviceMetadata(deviceMetadata as any);

      log('Redirecting existing user to /');
      router.replace('/');
      return;
    }

    // CASE 2: New OAuth user → onboarding
    log('New OAuth user detected, preparing onboarding form data');

    const formData = {
      firstName: decodeURIComponent(params.get('firstName') || ''),
      lastName: decodeURIComponent(params.get('lastName') || ''),
      community: [],
      communityType: '',
      country: '',
      countryCode: '',
      phoneNumber: '',
      verificationCode: '',
      topics: [],
      recommendations: []
    };
    log('Prefilled onboarding formData', formData);

    sessionStorage.setItem('accountFormData', JSON.stringify(formData));
    sessionStorage.setItem('accountFormStep', '1');

    const oauthData = {
      oauthRegistrationToken: params.get('oauthRegistrationToken'),
      provider: params.get('provider'),
      email: params.get('email')
    };
    log('Storing oauthRegistration session data', oauthData);

    sessionStorage.setItem('oauthRegistration', JSON.stringify(oauthData));

    log('Redirecting new user to /onboarding');
    router.replace('/onboarding');
  }, [params, router, setTokens, setUser, setDeviceMetadata]);

  return null;
}
