'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { toast } from 'sonner';

import { GET_MY_PROFILE, GetProfileResponse } from '@/services/gql/profile';
import { useAuthStore } from '@/store/useAuthStore';
import { useUserStore } from '@/store/useUserStore';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import {
  deriveProfileGuardStatus,
  PROFILE_GUARD_MAX_AUTO_RETRIES,
  PROFILE_GUARD_RETRY_DELAYS_MS,
  PROFILE_GUARD_TIMEOUT_MS,
  type ProfileGuardStatus,
} from './profileGuardStatus';

export type { ProfileGuardStatus } from './profileGuardStatus';

export interface ProfileGuardResult {
  status: ProfileGuardStatus;
  /** Start the check again after `'error'` (resets the retry budget + deadline). */
  retry: () => void;
  /** A manual retry is in flight. */
  retrying: boolean;
}

/**
 * Guards protected routes against an authenticated-but-profileless session.
 *
 * An authenticated user can have no server-side profile (failed/partial
 * onboarding, deleted profile, DB reset) — `getProfile` then returns
 * `{ success: false, profile: null }`. The frontend cannot create the missing
 * profile, so the safe behaviour is to clear the session and bounce to
 * `/signin`, matching the existing `clearSessionAndRedirectToSignIn` convention.
 *
 * A transient network error is NOT treated as "no profile" (we never sign a user
 * out over a flaky request). It is retried with backoff a bounded number of
 * times, and the whole check has a deadline; once either is exhausted the
 * status becomes `'error'` so the caller can show a retry, never an endless
 * loader.
 *
 * @param enabled Only run once auth is confirmed and the store is hydrated.
 */
export function useProfileGuard(enabled: boolean): ProfileGuardResult {
  const router = useRouter();
  const t = useTranslations('common');
  const redirectedRef = useRef(false);
  const [attempts, setAttempts] = useState(0);
  const [timedOut, setTimedOut] = useState(false);
  // Bumped by a manual retry to restart the deadline timer.
  const [epoch, setEpoch] = useState(0);

  const { data, loading, error, refetch } = useQuery<GetProfileResponse>(GET_MY_PROFILE, {
    skip: !enabled,
    notifyOnNetworkStatusChange: true,
  });

  const gp = data?.getProfile;
  const hasProfile = !!(gp && gp.success && gp.profile);
  // errorPolicy:'all' means a transient network error can arrive with no data.
  const hasError = !!error && !gp;

  // Definitive missing profile -> sign out + redirect (exactly once).
  useEffect(() => {
    if (!enabled || redirectedRef.current) return;
    if (gp && (gp.success === false || gp.profile == null)) {
      redirectedRef.current = true;
      toast.error(t('sessionProfileMissing'));
      useAuthStore.getState().clearAuth();
      useUserStore.getState().clearUser();
      router.replace('/signin');
    }
  }, [enabled, gp, router, t]);

  // Bounded automatic retry with backoff for transport failures.
  useEffect(() => {
    if (!enabled || !hasError || loading) return;
    if (attempts >= PROFILE_GUARD_MAX_AUTO_RETRIES) return;
    const id = window.setTimeout(() => {
      setAttempts((a) => a + 1);
      refetch().catch(() => {
        /* surfaced through `error`; the next attempt or the deadline handles it */
      });
    }, PROFILE_GUARD_RETRY_DELAYS_MS[attempts]);
    return () => window.clearTimeout(id);
  }, [enabled, hasError, loading, attempts, refetch]);

  // Overall deadline — also covers a request that never settles at all.
  useEffect(() => {
    if (!enabled || hasProfile) return;
    const id = window.setTimeout(() => setTimedOut(true), PROFILE_GUARD_TIMEOUT_MS);
    return () => window.clearTimeout(id);
  }, [enabled, hasProfile, epoch]);

  const retry = useCallback(() => {
    setAttempts(0);
    setTimedOut(false);
    setEpoch((e) => e + 1);
    refetch().catch(() => {
      /* surfaced through `error` */
    });
  }, [refetch]);

  const status = deriveProfileGuardStatus({
    enabled,
    redirected: redirectedRef.current,
    loading,
    hasError,
    hasProfile,
    attempts,
    timedOut,
  });

  return { status, retry, retrying: loading };
}
