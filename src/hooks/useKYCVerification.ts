'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  useLazyQuery,
  useMutation,
  useQuery,
} from '@apollo/client/react';
import {
  GET_MY_KYC_PROFILE,
  GET_MY_KYC_STATUS,
  INITIATE_KYC_VERIFICATION,
  KYC_TERMINAL_STATUSES,
  SUBMIT_BUSINESS_KYB,
  SUBMIT_KYC,
} from '@/services/gql/kyc';
import type {
  GetMyKycProfileResponse,
  GetMyKycStatusResponse,
  InitiateKycResponse,
  InitiateKycVerificationResponse,
  KycProfileDTO,
  KycProvider,
  KycStatus,
  KycStatusDTO,
  SubmitBusinessKybInput,
  SubmitBusinessKybResponse,
  SubmitKycInput,
  SubmitKycResponse,
} from '@/services/gql/types/kyc';

const DEFAULT_POLL_INTERVAL_MS = 4000;
const DEFAULT_POLL_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

/** A status is "done" (poll-stopping) when it is one of the terminal states. */
export function isTerminalKycStatus(status: KycStatus | string | undefined): boolean {
  if (!status) return false;
  return KYC_TERMINAL_STATUSES.includes(status as KycStatus);
}

/** Treat APPROVED and VERIFIED as success (vendor module uses VERIFIED). */
export function isVerifiedKycStatus(status: KycStatus | string | undefined): boolean {
  return status === 'APPROVED' || status === 'VERIFIED';
}

export interface PollStatusOptions {
  intervalMs?: number;
  timeoutMs?: number;
  /** Called with the latest status on every poll tick. */
  onTick?: (status: KycStatusDTO) => void;
}

export interface UseKYCVerificationResult {
  // ── status / profile ──────────────────────────────────────────────
  status: KycStatusDTO | null;
  profile: KycProfileDTO | null;
  loading: boolean;
  error: unknown;
  refetchStatus: () => Promise<unknown>;
  refetchProfile: () => Promise<unknown>;

  // ── actions ───────────────────────────────────────────────────────
  initiate: (provider: KycProvider) => Promise<InitiateKycResponse | null>;
  initiating: boolean;
  submitKyc: (input?: SubmitKycInput) => Promise<KycStatusDTO | null>;
  submitting: boolean;
  submitBusinessKyb: (input: SubmitBusinessKybInput) => Promise<KycStatusDTO | null>;
  submittingKyb: boolean;

  // ── polling ───────────────────────────────────────────────────────
  /** Polls getMyKYCStatus until terminal (APPROVED/VERIFIED/REJECTED/EXPIRED) or timeout. */
  pollStatus: (options?: PollStatusOptions) => Promise<KycStatusDTO>;
  isPolling: boolean;
}

/**
 * Single entry point for the end-user KYC flow.
 *
 * Mirrors the useQuery/useMutation + refetchQueries pattern used across the app
 * (see vendors/products/page.tsx). All reads are graceful — the gateway itself
 * degrades to { status: 'NOT_STARTED', kycLevel: 0 } when kyc-service is down,
 * so the UI never needs special-casing for an offline KYC service.
 */
export function useKYCVerification(options?: { skip?: boolean }): UseKYCVerificationResult {
  const skip = options?.skip ?? false;

  const {
    data: statusData,
    loading: statusLoading,
    error: statusError,
    refetch: refetchStatus,
  } = useQuery<GetMyKycStatusResponse>(GET_MY_KYC_STATUS, {
    skip,
    fetchPolicy: 'cache-and-network',
    nextFetchPolicy: 'cache-first',
  });

  const {
    data: profileData,
    loading: profileLoading,
    error: profileError,
    refetch: refetchProfile,
  } = useQuery<GetMyKycProfileResponse>(GET_MY_KYC_PROFILE, {
    skip,
    fetchPolicy: 'cache-and-network',
    nextFetchPolicy: 'cache-first',
  });

  const [initiateMutation, { loading: initiating }] =
    useMutation<InitiateKycVerificationResponse>(INITIATE_KYC_VERIFICATION);
  const [submitKycMutation, { loading: submitting }] =
    useMutation<SubmitKycResponse>(SUBMIT_KYC);
  const [submitKybMutation, { loading: submittingKyb }] =
    useMutation<SubmitBusinessKybResponse>(SUBMIT_BUSINESS_KYB);

  // Lazy query used by the poller so it doesn't disturb the live `status` cache binding.
  const [fetchStatus] = useLazyQuery<GetMyKycStatusResponse>(GET_MY_KYC_STATUS, {
    fetchPolicy: 'network-only',
  });

  const [isPolling, setIsPolling] = useState(false);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelledRef = useRef(false);

  // Clean up any in-flight poll on unmount.
  useEffect(() => {
    return () => {
      cancelledRef.current = true;
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  }, []);

  const initiate = useCallback(
    async (provider: KycProvider): Promise<InitiateKycResponse | null> => {
      const res = await initiateMutation({ variables: { provider } });
      return res.data?.initiateKYCVerification ?? null;
    },
    [initiateMutation],
  );

  const submitKyc = useCallback(
    async (input?: SubmitKycInput): Promise<KycStatusDTO | null> => {
      const res = await submitKycMutation({
        variables: { input: input ?? {} },
        refetchQueries: [{ query: GET_MY_KYC_STATUS }, { query: GET_MY_KYC_PROFILE }],
      });
      return res.data?.submitKYC ?? null;
    },
    [submitKycMutation],
  );

  const submitBusinessKyb = useCallback(
    async (input: SubmitBusinessKybInput): Promise<KycStatusDTO | null> => {
      const res = await submitKybMutation({
        variables: { input },
        refetchQueries: [{ query: GET_MY_KYC_STATUS }, { query: GET_MY_KYC_PROFILE }],
      });
      return res.data?.submitBusinessKYB ?? null;
    },
    [submitKybMutation],
  );

  const pollStatus = useCallback(
    (pollOptions?: PollStatusOptions): Promise<KycStatusDTO> => {
      const intervalMs = pollOptions?.intervalMs ?? DEFAULT_POLL_INTERVAL_MS;
      const timeoutMs = pollOptions?.timeoutMs ?? DEFAULT_POLL_TIMEOUT_MS;
      const deadline = Date.now() + timeoutMs;

      cancelledRef.current = false;
      setIsPolling(true);

      return new Promise<KycStatusDTO>((resolve) => {
        const tick = async () => {
          if (cancelledRef.current) {
            setIsPolling(false);
            return;
          }

          let current: KycStatusDTO = { status: 'NOT_STARTED' as KycStatus };
          try {
            const res = await fetchStatus();
            current = res.data?.getMyKYCStatus ?? current;
          } catch {
            // gateway is graceful; treat a transport failure as "keep waiting".
          }

          pollOptions?.onTick?.(current);

          const done = isTerminalKycStatus(current.status);
          const timedOut = Date.now() >= deadline;

          if (done || timedOut || cancelledRef.current) {
            setIsPolling(false);
            // Keep the live bindings fresh once polling resolves.
            void refetchStatus().catch(() => undefined);
            void refetchProfile().catch(() => undefined);
            resolve(current);
            return;
          }

          pollTimerRef.current = setTimeout(tick, intervalMs);
        };

        void tick();
      });
    },
    [fetchStatus, refetchStatus, refetchProfile],
  );

  return {
    status: statusData?.getMyKYCStatus ?? null,
    profile: profileData?.getMyKYCProfile ?? null,
    loading: statusLoading || profileLoading,
    error: statusError ?? profileError ?? null,
    refetchStatus,
    refetchProfile,

    initiate,
    initiating,
    submitKyc,
    submitting,
    submitBusinessKyb,
    submittingKyb,

    pollStatus,
    isPolling,
  };
}
