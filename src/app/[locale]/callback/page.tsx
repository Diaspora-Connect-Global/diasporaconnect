'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from '@/i18n/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import LoadingScreen from '@/components/custom/LoadingScreen';
import { useUserStore } from '@/store/useUserStore';

export default function OAuthCallbackPage() {
  const params = useSearchParams();
  const router = useRouter();
  const { setTokens, setDeviceMetadata } = useAuthStore();
  const { setUser } = useUserStore();

  useEffect(() => {
    const isAllowedUserRole = (role?: string | null) => {
      const normalized = (role || '').trim().toLowerCase();
      return normalized === 'local' || normalized === 'diaspora';
    };

    const error = params.get('error');
    const description = params.get('description');

    // Error from backend (access_denied, oauth_failed, missing_code)
    if (error) {
      const message =
        description ||
        (error === 'access_denied'
          ? 'You cancelled sign in.'
          : error === 'oauth_failed'
            ? 'Sign in failed. Please try again.'
            : error === 'missing_code'
              ? 'Sign in did not complete. Please try again.'
              : 'Something went wrong.');
      router.replace(`/signin?error=${encodeURIComponent(message)}`);
      return;
    }

    const success = params.get('success') === 'true';

    if (!success) {
      router.replace('/signin');
      return;
    }

    const requires2fa = params.get('requires2fa') === 'true';
    const twoFaSessionToken = params.get('twoFaSessionToken');

    // Existing user with 2FA enabled — show 2FA code entry
    if (requires2fa && twoFaSessionToken) {
      sessionStorage.setItem('twoFaSessionToken', twoFaSessionToken);
      router.replace('/signin?oauth2fa=1');
      return;
    }

    const sessionToken = params.get('sessionToken');
    const oauthRegistrationRequired = params.get('oauthRegistrationRequired') === 'true';

    // CASE 1: Existing user - has sessionToken
    if (sessionToken) {
      const role = params.get('role') || '';
      if (!isAllowedUserRole(role)) {
        router.replace(`/signin?error=${encodeURIComponent('Access denied. Only local or diaspora users can sign in here.')}`);
        return;
      }

      const user = {
        userId: params.get('userId') || '',
        email: params.get('email') || '',
        firstName: decodeURIComponent(params.get('firstName') || ''),
        lastName: decodeURIComponent(params.get('lastName') || ''),
        role,
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