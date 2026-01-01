'use client';

import { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import LoadingScreen from '@/components/custom/LoadingScreen';
import { useUserStore } from '@/store/useUserStore';

export default function OAuthCallbackPage() {
  const params = useSearchParams();
  const router = useRouter();
  const { setTokens, setDeviceMetadata } = useAuthStore();
  const { setUser } = useUserStore();

  useEffect(() => {
    const success = params.get('success') === 'true';

    // Failed OAuth
    if (!success) {
      router.replace('/signin');
      return;
    }

    const sessionToken = params.get('sessionToken');
    const oauthRegistrationRequired = params.get('oauthRegistrationRequired') === 'true';

    // CASE 1: Existing user - has sessionToken
    if (sessionToken) {
      const user = {
        userId: params.get('userId') || '',
        email: params.get('email') || '',
        firstName: decodeURIComponent(params.get('firstName') || ''),
        lastName: decodeURIComponent(params.get('lastName') || ''),
        role: params.get('role') || '',
        middleName:decodeURIComponent(params.get('middleName') || '') ,
        residenceSinceYear: 0,
        residenceSinceMonth: 0,
        connectionCount: 0,
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        
      };

      const deviceMetadata = {
        deviceId: params.get('fingerprint') || '',
        fingerprint: params.get('fingerprint') || '',
        ipAddress: params.get('ipAddress') || '',
        userAgent: params.get('userAgent') || ''
      };

      setTokens({
        sessionToken,
        accessToken: sessionToken,
        refreshToken: params.get('refreshToken') || undefined,
        sessionId: deviceMetadata.deviceId,
        expiresIn: 3600
      });

      setUser(user);
      setDeviceMetadata(deviceMetadata);

      router.replace('/');
      return;
    }

    // CASE 2: New user - needs onboarding
    if (oauthRegistrationRequired) {
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

      const oauthData = {
        oauthRegistrationToken: params.get('oauthRegistrationToken') || '',
        provider: params.get('provider') || '',
        email: params.get('email') || ''
      };

      sessionStorage.setItem('accountFormData', JSON.stringify(formData));
      sessionStorage.setItem('accountFormStep', '1');
      sessionStorage.setItem('oauthRegistration', JSON.stringify(oauthData));

      router.replace('/onboarding');
      return;
    }

    // Fallback - something went wrong
    router.replace('/signin');
  }, [params, router, setTokens, setUser, setDeviceMetadata]);

  return <LoadingScreen />;
}