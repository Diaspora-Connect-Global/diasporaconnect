'use client';

import { useMemo, useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import {
  readCircleWrite,
  refusalMessageKey,
} from '@/components/circles/governance/mutationOutcome';
import { ButtonType1, ButtonType2 } from '@/components/custom/button';
import { TextInput } from '@/components/custom/input';
import { SUBMIT_CIRCLE_CHALLENGE_ENTRY } from '@/services/gql/circles-actions';
import type {
  CircleChallenge,
  CircleChallengeEntry,
  SubmitCircleChallengeEntryData,
  SubmitCircleChallengeEntryVariables,
} from '@/services/gql/types/circles';
import type { CircleEntryDraft } from '@/services/gql/types/circles-actions';

import { periodKeyFor } from './periodKey';

/**
 * @fileoverview "I'm in!" — and everything the claim can carry with it.
 * @module components/circles/challenge/SubmitEntryForm
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  JOINING A CHALLENGE *IS* SUBMITTING AN ENTRY
 * ═══════════════════════════════════════════════════════════════════════════
 * There is no membership record for a challenge and no separate join rpc. A
 * participant is someone with an entry, which is why the participant count on
 * the detail screen is `DISTINCT userId` over the entries.
 *
 * ── `idempotencyKey` IS REQUIRED, NOT OPTIONAL ──────────────────────────────
 * `SubmitCircleChallengeEntryInput.idempotencyKey` is nullable on the GraphQL
 * schema and REQUIRED in fact: `SubmitChallengeEntryHandler` opens with
 * `if (!idempotencyKey) throw new BadRequestException('idempotencyKey is required')`.
 *
 * It is also load-bearing rather than defensive. The entry id is DERIVED from
 * `(challengeId, userId, periodKey, idempotencyKey)` via uuidv5, matching the
 * table's `UNIQUE (challenge_id, user_id, period_key, idempotency_key)`. So a
 * retry addresses the row it already wrote — the pre-flight read finds it and
 * returns it untouched, and because the score row is keyed on the entry id, an
 * HONOUR entry submitted three times is still worth its points once.
 *
 * The key is therefore minted ONCE PER USER ACTION and deliberately KEPT
 * across a failure. Minting it inside the submit handler would defeat the
 * mechanism entirely: every retry would carry a fresh key, derive a fresh id,
 * and record another entry. It is rotated only after a confirmed success.
 *
 * ── ONE ENTRY PER PERIOD, AND THE PERIOD IS A STRING ────────────────────────
 * A recurring challenge has no scheduler minting a row per period. The period
 * is derived from the cadence at SUBMIT time (never at render time — a page
 * left open across midnight would otherwise submit into yesterday), and the
 * server uses it to enforce `maxEntriesPerPeriod`.
 *
 * That is why this component asks "has the viewer an entry for the CURRENT
 * period?" rather than "has the viewer ever entered?". A weekly challenge is
 * meant to be entered again next week, and a permanent "already joined" badge
 * would lock a member out of every period after their first.
 *
 * ⚠ The server CHECKS the period key rather than obeying it: `if (expected &&
 * expected !== periodKey) throw 'period mismatch'`. The client derives in the
 * viewer's LOCAL calendar and the server in its own, so a member submitting
 * near local midnight in a far-from-UTC timezone can be refused outright. That
 * refusal is classified as `PERIOD_MISMATCH` and gets copy asking for a
 * refresh, which is the one thing that resolves it.
 */

export interface SubmitEntryFormProps {
  circleId: string;
  challenge: CircleChallenge;
  /** Every entry loaded for this challenge; filtered to the viewer here. */
  entries: CircleChallengeEntry[];
  /** Null while the session is still resolving — the CTA waits rather than lying. */
  currentUserId: string | null;
  /** Suppresses the CTA until the viewer's entries are known. */
  loading?: boolean;
}

const EMPTY_DRAFT: CircleEntryDraft = { claimValue: '', note: '', evidenceUrl: '' };

export function SubmitEntryForm({
  circleId,
  challenge,
  entries,
  currentUserId,
  loading = false,
}: SubmitEntryFormProps) {
  const t = useTranslations('circles.challenge');
  const tEntry = useTranslations('circles.newEntry');
  const tActions = useTranslations('circles.actions');
  const tCommon = useTranslations('circles.common');

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<CircleEntryDraft>(EMPTY_DRAFT);
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

  /**
   * Has the viewer already entered for the period they would be entering now?
   *
   * Compared against a key derived HERE, at render, purely for the label. The
   * key that is actually SENT is derived again at submit; the two can differ
   * across a midnight, and the submit-time one is the one that must be right.
   */
  const enteredThisPeriod = useMemo(() => {
    if (!currentUserId) return false;
    const period = periodKeyFor(challenge.cadence);
    return entries.some(
      (entry) =>
        entry.userId === currentUserId &&
        // A legacy entry with no stored period belongs to the ONE_OFF bucket,
        // which is also what `periodKeyFor` returns for an absent cadence.
        (entry.periodKey ?? 'ONE_OFF') === period,
    );
  }, [entries, currentUserId, challenge.cadence]);

  const recurring = !!challenge.cadence && challenge.cadence !== 'ONE_OFF';

  // Only an ACTIVE challenge accepts entries. A DRAFT has not started and a
  // CLOSED or CANCELLED one cannot be joined; rendering a disabled button in
  // those states would read as "you are not allowed", which is untrue.
  if (challenge.status !== 'ACTIVE') return null;

  if (enteredThisPeriod) {
    return (
      <ButtonType1 size="lg" className="w-full" disabled>
        {recurring ? tEntry('doneThisPeriod') : t('alreadyJoined')}
      </ButtonType1>
    );
  }

  function openForm() {
    // One key per user action — see the file header. This is the ONLY place a
    // key is minted for a submit that has not yet succeeded.
    setIdempotencyKey(crypto.randomUUID());
    setDraft(EMPTY_DRAFT);
    setOpen(true);
  }

  function closeForm() {
    setOpen(false);
    setDraft(EMPTY_DRAFT);
    setIdempotencyKey(null);
  }

  function set<K extends keyof CircleEntryDraft>(key: K, value: CircleEntryDraft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  async function submit() {
    if (submitting) return;

    const key = idempotencyKey ?? crypto.randomUUID();
    if (idempotencyKey === null) setIdempotencyKey(key);

    try {
      const result = await submitEntry({
        variables: {
          circleId,
          input: {
            challengeId: challenge.id,
            // Derived HERE, at submit — not at render. A page left open across
            // a period boundary would otherwise file into the period it was
            // loaded in.
            periodKey: periodKeyFor(challenge.cadence),
            claimValue: draft.claimValue.trim() || undefined,
            note: draft.note.trim() || undefined,
            evidenceUrl: draft.evidenceUrl.trim() || undefined,
            idempotencyKey: key,
          },
        },
      });

      /*
       * `data`, not the absence of a throw. Under the app's global
       * `errorPolicy: 'all'` a refused mutation RESOLVES with `{ data: null }`,
       * so the previous `try { await } catch` shape here reported a successful
       * join for every refusal. See `governance/mutationOutcome.ts`.
       */
      const outcome = readCircleWrite(result, (d) => d.submitCircleChallengeEntry);
      if (!outcome.ok) {
        // The key is intentionally NOT rotated: the next attempt must reuse it
        // so a request that succeeded but lost its response cannot be recorded
        // a second time.
        toast.error(tActions(`writeErrors.${refusalMessageKey(outcome.refusal)}`));
        return;
      }

      toast.success(
        // An HONOUR entry is born ACCEPTED and mints its points immediately; a
        // LEAD or CIRCLE entry is born PENDING and is worth nothing until the
        // route the challenge declared decides it. Saying "counted" for the
        // second would be a promise the challenge did not make.
        outcome.data.verificationState === 'ACCEPTED'
          ? tEntry('accepted')
          : tEntry('pending'),
      );
      closeForm();
    } catch (error) {
      const outcome = readCircleWrite({ error }, () => null);
      toast.error(tActions(`writeErrors.${refusalMessageKey(outcome.refusal)}`));
    }
  }

  if (!open) {
    return (
      <ButtonType2
        size="lg"
        className="w-full"
        onClick={openForm}
        disabled={loading || !currentUserId}
      >
        {recurring ? tEntry('logThisPeriod') : t('join')}
      </ButtonType2>
    );
  }

  return (
    <div className="space-y-3 rounded-2xl border border-border-subtle p-4">
      <TextInput
        id={`entry-claim-${challenge.id}`}
        type="text"
        value={draft.claimValue}
        onChange={(v: string) => set('claimValue', v)}
        label={tEntry('claimLabel')}
        placeholder={tEntry('claimPlaceholder')}
        disabled={submitting}
      />

      <TextInput
        id={`entry-note-${challenge.id}`}
        type="text"
        value={draft.note}
        onChange={(v: string) => set('note', v)}
        label={tEntry('noteLabel')}
        placeholder={tEntry('notePlaceholder')}
        disabled={submitting}
      />

      {/*
       * Shown only when someone other than the submitter decides. Under HONOUR
       * the entry is accepted on the submitter's word the instant it lands, so
       * asking for proof would imply a review that never happens.
       */}
      {challenge.verificationMode && challenge.verificationMode !== 'HONOUR' && (
        <TextInput
          id={`entry-evidence-${challenge.id}`}
          type="url"
          value={draft.evidenceUrl}
          onChange={(v: string) => set('evidenceUrl', v)}
          label={tEntry('evidenceLabel')}
          placeholder={tEntry('evidencePlaceholder')}
          disabled={submitting}
        />
      )}

      <div className="flex items-center gap-2">
        <ButtonType2 className="flex-1" onClick={submit} disabled={submitting}>
          {submitting ? t('joining') : tEntry('submit')}
        </ButtonType2>
        <ButtonType1 onClick={closeForm} disabled={submitting}>
          {tCommon('cancel')}
        </ButtonType1>
      </div>
    </div>
  );
}
