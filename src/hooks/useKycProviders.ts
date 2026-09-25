'use client';

import { useMemo } from 'react';
import { useQuery } from '@apollo/client/react';
import { GET_MY_PROFILE, type GetProfileResponse } from '@/services/gql/profile';
import { availableKycProviders } from '@/lib/kycProviders';
import type { KycProvider } from '@/services/gql/types/kyc';

/**
 * Verification methods available to the signed-in user, from their profile
 * country of residence. Reuses the cached GET_MY_PROFILE result (the protected
 * layout's profile guard already loads it), so this normally costs no request.
 * While loading or on error the list is Onfido-only — it works everywhere.
 */
export function useKycProviders(): { providers: KycProvider[]; loading: boolean } {
  const { data, loading } = useQuery<GetProfileResponse>(GET_MY_PROFILE, {
    fetchPolicy: 'cache-first',
  });
  const residence = data?.getProfile?.profile?.residenceCountry;
  const providers = useMemo(() => availableKycProviders(residence), [residence]);
  return { providers, loading };
}
