'use client';

import { useEffect, useRef } from 'react';
import { useQuery } from '@apollo/client/react';
import { toast } from 'sonner';

import { GET_MY_PROFILE, GetProfileResponse } from '@/services/gql/profile';
import { useAuthStore } from '@/store/useAuthStore';
import { useUserStore } from '@/store/useUserStore';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';

export type ProfileGuardStatus = 'checking' | 'ok' | 'redirecting';

/**
 * Guards protected routes against an authenticated-but-profileless session.
 *
 * An authenticated user can have no server-side profile (failed/partial
 * onboarding, deleted profile, DB reset) — `getProfile` then returns
 * `{ success: false, profile: null }`. The frontend cannot create the missing
 * profile, so the safe behaviour is to clear the session and bounce to
 * `/signin`, matching the existing `clearSessionAndRedirectToSignIn` convention.
 *
 * @param enabled Only run once auth is confirmed and the store is hydrated.
 */
export function useProfileGuard(enabled: boolean): ProfileGuardStatus {
  const router = useRouter();
  const t = useTranslations('common');
  const redirectedRef = useRef(false);

  const { data, loading, error } = useQuery<GetProfileResponse>(GET_MY_PROFILE, {
    skip: !enabled,
  });

  // Definitive missing profile -> sign out + redirect (exactly once).
  useEffect(() => {
    if (!enabled || redirectedRef.current) return;
    const gp = data?.getProfile;
    if (gp && (gp.success === false || gp.profile == null)) {
      redirectedRef.current = true;
      toast.error(t('sessionProfileMissing'));
      useAuthStore.getState().clearAuth();
      useUserStore.getState().clearUser();
      router.replace('/signin');
    }
  }, [enabled, data, router, t]);

  if (!enabled) return 'checking';
  if (redirectedRef.current) return 'redirecting';

  // errorPolicy:'all' means a transient network error can arrive with no data.
  // Only treat `success:false` as definitive; otherwise keep checking so we
  // never sign the user out over a flaky request.
  if (loading || (error && !data)) return 'checking';

  const gp = data?.getProfile;
  if (gp && gp.success && gp.profile) return 'ok';
  return 'checking';
}
