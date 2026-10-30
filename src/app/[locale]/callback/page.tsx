'use client';

import { isAllowedWebSignInRole } from '@/lib/webSignInRoles';
import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from '@/i18n/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import LoadingScreen from '@/components/custom/LoadingScreen';
import { useUserStore } from '@/store/useUserStore';
import gqlClient from '@/lib/graph-client';
import { GET_MY_PROFILE, type GetProfileResponse } from '@/services/gql/profile';

export default function OAuthCallbackPage() {
  const params = useSearchParams();
  const router = useRouter();
  const { setTokens, setDeviceMetadata, setRole } = useAuthStore();
  const { setUser } = useUserStore();

  useEffect(() => {
    let cancelled = false;

    const isAllowedUserRole = isAllowedWebSignInRole;

    // The gateway puts tokens and pre-fill data in the URL FRAGMENT, which a
    // browser never sends to a server (so they never reach the web host's
    // request logs, proxies or Referer headers); the query carries routing
    // flags only. The query is still read as a fallback for a gateway that
    // predates that change. Leaving this page with router.replace drops both.
    const hash = new URLSearchParams(
      typeof window !== 'undefined' ? window.location.hash.replace(/^#/, '') : '',
    );
    const pick = (key: string) => hash.get(key) ?? params.get(key);

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

    // Existing user with 2FA enabled — show 2FA code entry.
    // The sign-in form reads the pending-2FA token from sessionStorage once
    // and removes it.
    if (requires2fa) {
      const twoFaSessionToken = pick('twoFaSessionToken');
      if (twoFaSessionToken) {
        sessionStorage.setItem('twoFaSessionToken', twoFaSessionToken);
        router.replace('/signin?oauth2fa=1');
      } else {
        router.replace('/signin');
      }
      return;
    }

    const sessionToken = pick('sessionToken');
    const oauthRegistrationRequired = params.get('oauthRegistrationRequired') === 'true';

    // CASE 1: Existing user - has sessionToken
    if (sessionToken) {
      const role = pick('role') || '';
      if (!isAllowedUserRole(role)) {
        router.replace(`/signin?error=${encodeURIComponent('Access denied. Only local or diaspora users can sign in here.')}`);
        return;
      }

      // Only an older gateway sends the device fingerprint; keep the one this
      // browser already has otherwise.
      const fingerprint = params.get('fingerprint') || '';
      if (fingerprint) {
        setDeviceMetadata({
          deviceId: fingerprint,
          fingerprint,
          ipAddress: params.get('ipAddress') || '',
          userAgent: params.get('userAgent') || ''
        });
      }

      setTokens({
        sessionToken,
        accessToken: sessionToken,
        refreshToken: params.get('refreshToken') || undefined,
        sessionId: fingerprint,
        expiresIn: 3600
      });
      setRole(role);

      // The redirect no longer names the user (no user id or email in a URL),
      // so load the signed-in profile with the new session.
      void (async () => {
        try {
          const { data } = await gqlClient.query<GetProfileResponse>({
            query: GET_MY_PROFILE,
            fetchPolicy: 'network-only',
          });
          if (cancelled) return;
          const profile = data?.getProfile?.success ? data.getProfile.profile : null;
          if (!profile?.userId) throw new Error('profile unavailable');
          setUser({ ...profile, role });
          router.replace('/home');
        } catch {
          if (cancelled) return;
          useAuthStore.getState().clearAuth();
          router.replace(`/signin?error=${encodeURIComponent('Sign in did not complete. Please try again.')}`);
        }
      })();
      return () => {
        cancelled = true;
      };
    }

    // CASE 2: New user - needs onboarding
    if (oauthRegistrationRequired) {
      const formData = {
        firstName: decodeURIComponent(pick('firstName') || ''),
        lastName: decodeURIComponent(pick('lastName') || ''),
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
        oauthRegistrationToken: pick('oauthRegistrationToken') || '',
        provider: pick('provider') || '',
        email: pick('email') || ''
      };

      sessionStorage.setItem('accountFormData', JSON.stringify(formData));
      sessionStorage.setItem('accountFormStep', '1');
      sessionStorage.setItem('oauthRegistration', JSON.stringify(oauthData));

      router.replace('/onboarding');
      return;
    }

    // Fallback - something went wrong
    router.replace('/signin');
  }, [params, router, setTokens, setUser, setDeviceMetadata, setRole]);

  return <LoadingScreen />;
}
