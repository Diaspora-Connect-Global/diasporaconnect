'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useMutation } from '@apollo/client/react';
import { toast } from 'sonner';

import { ButtonType1, ButtonType2 } from '@/components/custom/button';
import { TextInput } from '@/components/custom/input';
import { LOG_CIRCLE_CONTRIBUTION } from '@/services/gql/circles';
import {
  readCircleWrite,
  refusalMessageKey,
} from '@/components/circles/governance/mutationOutcome';
import type {
  CircleProjectGoal,
  LogCircleContributionData,
  LogCircleContributionVariables,
} from '@/services/gql/types/circles';

import { goalCurrency, isMoneyGoal, parseContributionValue } from './metric';

export interface ContributeFormProps {
  circleId: string;
  /** The goal the contribution is logged against. Absent → the CTA is not shown. */
  goal: CircleProjectGoal | null;
}

/**
 * The "Contribute" CTA and the small form behind it.
 *
 * ## The idempotency key is the whole point of this component
 *
 * `logCircleContribution` writes to an APPEND-ONLY ledger. There is no UPDATE
 * and no DELETE: a contribution logged twice is corrected only by logging a
 * third, negative row. So the key is minted ONCE PER USER ACTION — when the
 * form opens — and deliberately **kept across a failed submit** so that a retry
 * (or a request that actually succeeded before the response was lost) collapses
 * into the same ledger row server-side.
 *
 * Minting inside the submit handler instead would defeat the mechanism
 * entirely: every retry would carry a fresh key and log another row, which is
 * exactly the double-count the key exists to prevent. The key is regenerated
 * only after a confirmed success, or when the form is cancelled and reopened —
 * both of which start a genuinely new user action.
 *
 * The key deliberately survives an EDIT to the amount too. If a submit of 500
 * actually landed but lost its response, retrying as 600 under the same key
 * records one row for 500 — visible in the ledger and correctable with a
 * negative row. Rotating the key there would instead record both, silently
 * inflating the goal by 1,100, which is the failure that cannot be spotted.
 *
 * Refetches are addressed by OPERATION NAME rather than `{ query, variables }`
 * because the contributions list owns a growing `limit`; naming the operation
 * refetches whichever instance is actually mounted, with its current variables.
 */
export function ContributeForm({ circleId, goal }: ContributeFormProps) {
  const t = useTranslations('circles');
  const tActions = useTranslations('circles.actions');

  const [open, setOpen] = useState(false);
  const [rawValue, setRawValue] = useState('');
  const [idempotencyKey, setIdempotencyKey] = useState<string | null>(null);

  const [logContribution, { loading }] = useMutation<
    LogCircleContributionData,
    LogCircleContributionVariables
  >(LOG_CIRCLE_CONTRIBUTION, {
    refetchQueries: ['CircleGoalProgress', 'CircleContributions'],
    awaitRefetchQueries: true,
  });

  if (!goal) return null;

  const parsed = parseContributionValue(rawValue, goal);

  function openForm() {
    // One key per user action. See the note above — this is the only place a
    // key is minted for a submit that has not yet succeeded.
    setIdempotencyKey(crypto.randomUUID());
    setRawValue('');
    setOpen(true);
  }

  function closeForm() {
    setOpen(false);
    setRawValue('');
    setIdempotencyKey(null);
  }

  async function submit() {
    if (!goal || parsed === null || loading) return;

    // A key should always exist by now; minting a fallback keeps a stray submit
    // from sending `undefined` into a required field.
    const key = idempotencyKey ?? crypto.randomUUID();
    if (idempotencyKey === null) setIdempotencyKey(key);

    try {
      const result = await logContribution({
        variables: {
          circleId,
          input: { goalId: goal.id, value: parsed, idempotencyKey: key },
        },
      });

      // `data`, not the absence of a throw. The global `errorPolicy: 'all'`
      // makes a REFUSED mutation resolve, so the catch below never saw a server
      // refusal and this reported "contribution saved" over a contribution that
      // was never logged. See `governance/mutationOutcome.ts`.
      const outcome = readCircleWrite(result, (d) => d.logCircleContribution);
      if (!outcome.ok) {
        toast.error(tActions(`writeErrors.${refusalMessageKey(outcome.refusal)}`));
        return;
      }

      toast.success(t('project.contributeSuccess'));
      closeForm();
    } catch (error) {
      // The key is intentionally NOT rotated here: the next attempt must reuse
      // it so a request that succeeded but lost its response cannot be logged
      // a second time.
      const outcome = readCircleWrite({ error }, () => null);
      toast.error(tActions(`writeErrors.${refusalMessageKey(outcome.refusal)}`));
    }
  }

  if (!open) {
    return (
      <div className="space-y-2">
        <ButtonType2
          size="lg"
          className="w-full"
          onClick={openForm}
        >
          {t('project.contribute')}
        </ButtonType2>
        <p className="caption-small text-center text-text-secondary">
          {t('project.contributeHint')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-2xl border border-border-subtle p-4">
      <TextInput
        id={`contribute-${goal.id}`}
        type="text"
        value={rawValue}
        onChange={setRawValue}
        label={t('project.contribute')}
        // The goal's own unit is the clearest hint available without inventing
        // a translated string: "GHS" for money, "km" / "books" for a metric.
        placeholder={
          isMoneyGoal(goal) ? goalCurrency(goal) : goal.unit?.trim() || '0'
        }
        disabled={loading}
      />

      <div className="flex items-center gap-2">
        <ButtonType2
          className="flex-1"
          onClick={submit}
          // Validation is expressed as a disabled CTA rather than an error
          // message: there is no message key for "that is not a number", and a
          // button that cannot be pressed says the same thing without one.
          disabled={parsed === null || loading}
        >
          {loading ? t('project.contributing') : t('project.contribute')}
        </ButtonType2>
        <ButtonType1 onClick={closeForm} disabled={loading}>
          {t('common.cancel')}
        </ButtonType1>
      </div>
    </div>
  );
}
