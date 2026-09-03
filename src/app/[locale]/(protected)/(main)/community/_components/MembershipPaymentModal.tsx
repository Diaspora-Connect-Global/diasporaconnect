'use client';

import { useCallback, useMemo } from 'react';

import { MembershipPaymentModal as SharedMembershipPaymentModal } from '@/components/memberships/MembershipPaymentModal';
import type {
  MembershipEntity,
  RequestMembershipResult,
} from '@/types/membership';

interface MembershipPaymentModalProps {
  open: boolean;
  clientSecret: string | null;
  communityId: string;
  communityName?: string;
  /**
   * Real membership id returned by REQUEST_MEMBERSHIP (envelope `.id`). Required
   * so the shared modal's onSuccess(membershipId) callback hands back a true
   * membership id rather than the community id.
   */
  membershipId: string;
  onSuccess: (membershipId: string) => void;
  onClose: () => void;
}

/**
 * Backwards-compat shim. The original community-only modal exposed an
 * `(open, clientSecret, communityId, communityName, onSuccess, onClose)`
 * prop signature where the caller had already invoked REQUEST_MEMBERSHIP and
 * passed the resulting `clientSecret` in. The shared modal owns the request
 * flow itself, so this shim:
 *
 *   1. Synthesizes a minimal `MembershipEntity` from the caller's props.
 *   2. Returns the caller-provided `clientSecret` from the modal's
 *      `requestMembership` callback so the modal jumps straight to Step 2.
 *
 * Consumers (the community discovery page + onboarding Step 7) can keep using
 * this shim verbatim. New consumers should import from
 * `@/components/memberships/MembershipPaymentModal` directly.
 *
 * @deprecated Import from `@/components/memberships/MembershipPaymentModal`.
 */
export function MembershipPaymentModal({
  open,
  clientSecret,
  communityId,
  communityName,
  membershipId,
  onSuccess,
  onClose,
}: MembershipPaymentModalProps) {
  const entity: MembershipEntity = useMemo(
    () => ({
      kind: 'community',
      id: communityId,
      name: communityName ?? '',
      access: {
        visibility: 'PUBLIC',
        joinPolicy: 'PAID',
        paymentType: 'ONE_TIME',
      },
    }),
    [communityId, communityName],
  );

  const requestMembership = useCallback(async (): Promise<RequestMembershipResult> => {
    if (!clientSecret) {
      throw new Error('Missing clientSecret for paid community membership.');
    }
    return {
      membershipId,
      status: 'PENDING_PAYMENT',
      requiresPayment: true,
      clientSecret,
    };
  }, [clientSecret, membershipId]);

  if (!clientSecret) return null;

  return (
    <SharedMembershipPaymentModal
      open={open}
      onClose={onClose}
      entity={entity}
      requestMembership={requestMembership}
      onSuccess={onSuccess}
    />
  );
}
