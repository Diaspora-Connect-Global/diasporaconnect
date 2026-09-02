'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useMutation } from '@apollo/client/react';
import { toast } from 'sonner';

import { ButtonType1, ButtonType2 } from '@/components/custom/button';
import { SUBMIT_CIRCLE_CHALLENGE_ENTRY } from '@/services/gql/circles';
import type {
  CircleChallenge,
  SubmitCircleChallengeEntryData,
  SubmitCircleChallengeEntryVariables,
} from '@/services/gql/types/circles';

import { periodKeyFor } from './periodKey';

export interface JoinChallengeButtonProps {
  circleId: string;
  challenge: CircleChallenge;
  /** True once the viewer has an entry in this challenge. */
  joined: boolean;
  /** Suppresses the CTA until the viewer's entries are known. */
  loading?: boolean;
}

/**
 * The "I'm in!" CTA.
 *
 * Joining a challenge IS submitting an entry — there is no separate membership
 * record — so the button carries the same append-only discipline as the
 * contribution ledger: the idempotency key is minted on the first press and
 * retained across a failure, so a retry after a lost response cannot produce a
 * second entry.
 *
 * The CTA is shown only for an ACTIVE challenge. A draft has not started, and a
 * closed or cancelled one cannot be joined; rendering a disabled button in
 * those states would read as "you are not allowed", which is a different and
 * untrue statement.
 */
export function JoinChallengeButton({
  circleId,
  challenge,
  joined,
  loading = false,
}: JoinChallengeButtonProps) {
  const t = useTranslations('circles');
  const [idempotencyKey, setIdempotencyKey] = useState<string | null>(null);

  const [submitEntry, { loading: submitting }] = useMutation<
    SubmitCircleChallengeEntryData,
    SubmitCircleChallengeEntryVariables
  >(SUBMIT_CIRCLE_CHALLENGE_ENTRY, {
    // By operation name so the mounted entries query refetches with whatever
    // variables it currently holds, updating the "{n} joined" count and stack.
    refetchQueries: ['CircleChallengeEntries'],
    awaitRefetchQueries: true,
  });

  if (challenge.status !== 'CHALLENGE_ACTIVE') return null;

  if (joined) {
    return (
      <ButtonType1 size="lg" className="w-full" disabled>
        {t('challenge.alreadyJoined')}
      </ButtonType1>
    );
  }

  async function join() {
    if (submitting) return;

    const key = idempotencyKey ?? crypto.randomUUID();
    if (idempotencyKey === null) setIdempotencyKey(key);

    try {
      await submitEntry({
        variables: {
          circleId,
          input: {
            challengeId: challenge.id,
            // Derived from the cadence at submit time — there is no scheduler
            // minting periods in advance, and the server reads this key to
            // enforce `maxEntriesPerPeriod`.
            periodKey: periodKeyFor(challenge.cadence),
            idempotencyKey: key,
          },
        },
      });
      setIdempotencyKey(null);
      toast.success(t('challenge.alreadyJoined'));
    } catch {
      // Key deliberately retained — see the note above.
      toast.error(t('errors.join'));
    }
  }

  return (
    <ButtonType2
      size="lg"
      className="w-full"
      onClick={join}
      disabled={submitting || loading}
    >
      {submitting ? t('challenge.joining') : t('challenge.join')}
    </ButtonType2>
  );
}
