'use client';

import { useId, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import {
  readCircleWrite,
  refusalMessageKey,
} from '@/components/circles/governance/mutationOutcome';
import { RadioCard, RadioCardGroup } from '@/components/circles/primitives';
import { ButtonType1, ButtonType2 } from '@/components/custom/button';
import { TextInput } from '@/components/custom/input';
import {
  Select as SelectA,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { circleUserDisplayName, useCircleUsers } from '@/hooks/useCircleUsers';
import { ADD_CIRCLE_PROJECT_GOAL, CIRCLE_MEMBERS } from '@/services/gql/circles-actions';
import type {
  AddCircleProjectGoalData,
  AddCircleProjectGoalVariables,
  CircleGoalScope,
  CircleMember,
  CircleMetricKind,
} from '@/services/gql/types/circles';
import {
  CIRCLE_GOAL_METRIC_ORDER,
  type CircleGoalDraft,
} from '@/services/gql/types/circles-actions';
import { CURRENCIES } from '@/types/money';

import {
  isMoneyDraft,
  normaliseGoalDraft,
  toAddGoalInput,
  validateGoalDraft,
} from './goalDraft';

/**
 * @fileoverview Add a goal to a project.
 * @module components/circles/project/AddGoalForm
 *
 * ── THE TWO QUESTIONS THIS FORM EXISTS TO ASK IN THE RIGHT ORDER ────────────
 *
 *  1. WHOSE goal is it? SHARED is one number the whole circle pushes toward;
 *     INDIVIDUAL is one person's target. They are not a display preference —
 *     `logContribution` refuses anyone but the assignee on an INDIVIDUAL goal,
 *     and the pair is a CHECK constraint. Asked first, because the answer
 *     decides whether an assignee is even collected.
 *
 *  2. WHAT does it measure? AMOUNT is money in minor units with a currency;
 *     COUNT and DURATION are plain decimals with a word. Asked before the
 *     target, because it changes what the target field MEANS — and getting it
 *     wrong is silent, rendering a marathon as "GHS 42.20".
 *
 * ── WHY BOOLEAN IS NOT OFFERED ──────────────────────────────────────────────
 * `CircleMetricKind` has a BOOLEAN member and this form does not show it. A
 * goal needs a positive `targetValue` (`assertStorableMetric`, plus
 * `CHECK (target_value > 0)` on the column), so a done/not-done goal has no
 * target to ask for and would be refused after the form was filled in. A COUNT
 * goal with a target of 1 says the same thing and works.
 *
 * ── THE ASSIGNEE MUST ALREADY BE IN THE CIRCLE ──────────────────────────────
 * circle-service checks it and refuses, because an INDIVIDUAL goal assigned to
 * a non-member *"could never be contributed to"* — valid to the schema, valid
 * to the aggregate, permanently stuck. The picker is therefore built from the
 * circle's ACTIVE members rather than being a free-text id field.
 */

interface MembersData {
  circleMembers?: CircleMember[] | null;
}

const EMPTY_DRAFT: CircleGoalDraft = {
  scope: 'SHARED',
  assigneeUserId: '',
  metricKind: 'COUNT',
  unit: '',
  targetValue: '',
  dueOn: '',
};

export interface AddGoalFormProps {
  circleId: string;
  projectId: string;
  /** Closes the form. When absent the form stays open and simply resets. */
  onDone?: () => void;
}

export function AddGoalForm({ circleId, projectId, onDone }: AddGoalFormProps) {
  const t = useTranslations('circles.newGoal');
  const tActions = useTranslations('circles.actions');
  const tCommon = useTranslations('circles.common');
  const tMembers = useTranslations('circles.members');
  const scopeLabelId = useId();
  const metricLabelId = useId();

  const [draft, setDraft] = useState<CircleGoalDraft>(EMPTY_DRAFT);
  const [showErrors, setShowErrors] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // ACTIVE members only — the prefixed spelling is what the gateway's
  // `$status: CircleMembershipStatus` argument requires. Sending the bare
  // `ACTIVE` the domain uses is a hard GraphQL validation error; see the ENUMS
  // header in `types/circles.ts`.
  const { data: membersData } = useQuery<MembersData>(CIRCLE_MEMBERS, {
    variables: { circleId, status: 'MEMBERSHIP_ACTIVE', limit: 100 },
    skip: draft.scope !== 'INDIVIDUAL',
    errorPolicy: 'all',
  });

  const members = useMemo(
    () => membersData?.circleMembers ?? [],
    [membersData],
  );
  const { usersById } = useCircleUsers(useMemo(() => members.map((m) => m.userId), [members]));

  const [addGoal] = useMutation<
    AddCircleProjectGoalData,
    AddCircleProjectGoalVariables
  >(ADD_CIRCLE_PROJECT_GOAL, {
    refetchQueries: ['CircleProjectGoals', 'CircleProject'],
    awaitRefetchQueries: true,
  });

  const validation = validateGoalDraft(draft);
  const money = isMoneyDraft(draft);

  function set<K extends keyof CircleGoalDraft>(key: K, value: CircleGoalDraft[K]) {
    // Every write goes through `normaliseGoalDraft`, so switching INDIVIDUAL →
    // SHARED cannot leave a stale assignee behind to trip the CHECK constraint.
    setDraft((prev) => normaliseGoalDraft({ ...prev, [key]: value }));
  }

  function changeMetric(next: CircleMetricKind) {
    // The unit means a different thing on either side of this switch — a
    // currency for AMOUNT, a word for the rest — so carrying it across would
    // produce a goal denominated in "km" of money. Cleared, and defaulted to
    // the platform base currency when switching INTO money.
    setDraft((prev) =>
      normaliseGoalDraft({
        ...prev,
        metricKind: next,
        unit: next === 'AMOUNT' ? CURRENCIES[0].value : '',
      }),
    );
  }

  async function submit() {
    if (submitting) return;
    if (!validation.valid) {
      setShowErrors(true);
      return;
    }
    setSubmitting(true);

    try {
      const result = await addGoal({
        variables: { circleId, input: toAddGoalInput(projectId, draft) },
      });

      // `data`, not the absence of a throw — the global `errorPolicy: 'all'`
      // resolves refusals. See `governance/mutationOutcome.ts`.
      const outcome = readCircleWrite(result, (d) => d.addCircleProjectGoal);
      if (!outcome.ok) {
        toast.error(tActions(`writeErrors.${refusalMessageKey(outcome.refusal)}`));
        return;
      }

      toast.success(t('added'));
      setDraft(EMPTY_DRAFT);
      setShowErrors(false);
      onDone?.();
    } catch (error) {
      const outcome = readCircleWrite({ error }, () => null);
      toast.error(tActions(`writeErrors.${refusalMessageKey(outcome.refusal)}`));
    } finally {
      setSubmitting(false);
    }
  }

  const targetError =
    showErrors && validation.errors.targetValue
      ? t(`errors.${validation.errors.targetValue}`)
      : undefined;

  return (
    <div className="space-y-6 rounded-2xl border border-border-subtle p-4">
      <fieldset className="space-y-3" disabled={submitting}>
        <legend id={scopeLabelId} className="label-medium text-text-primary">
          {t('scopeQuestion')}
        </legend>
        <RadioCardGroup
          aria-labelledby={scopeLabelId}
          value={draft.scope}
          onValueChange={(v) => set('scope', v as CircleGoalScope)}
        >
          <RadioCard
            value="SHARED"
            title={t('scopeSharedTitle')}
            description={t('scopeSharedDescription')}
            disabled={submitting}
          />
          <RadioCard
            value="INDIVIDUAL"
            title={t('scopeIndividualTitle')}
            description={t('scopeIndividualDescription')}
            disabled={submitting}
          />
        </RadioCardGroup>
      </fieldset>

      {draft.scope === 'INDIVIDUAL' && (
        <div className="space-y-2">
          <label htmlFor="goal-assignee" className="label-medium text-text-primary">
            {t('assigneeLabel')}
            <span className="ml-1 text-text-danger">*</span>
          </label>
          <SelectA
            value={draft.assigneeUserId || undefined}
            onValueChange={(v) => set('assigneeUserId', v)}
            disabled={submitting}
          >
            <SelectTrigger id="goal-assignee" className="w-full">
              <SelectValue placeholder={t('assigneePlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              {members.map((member) => (
                <SelectItem key={member.userId} value={member.userId}>
                  {circleUserDisplayName(usersById[member.userId], tMembers('lead'))}
                </SelectItem>
              ))}
            </SelectContent>
          </SelectA>
          {showErrors && validation.errors.assigneeUserId && (
            <p className="caption-small text-text-danger">
              {t(`errors.${validation.errors.assigneeUserId}`)}
            </p>
          )}
        </div>
      )}

      <fieldset className="space-y-3" disabled={submitting}>
        <legend id={metricLabelId} className="label-medium text-text-primary">
          {t('metricQuestion')}
        </legend>
        <RadioCardGroup
          aria-labelledby={metricLabelId}
          value={draft.metricKind}
          onValueChange={(v) => changeMetric(v as CircleMetricKind)}
        >
          {CIRCLE_GOAL_METRIC_ORDER.map((kind) => (
            <RadioCard
              key={kind}
              value={kind}
              title={t(`metric.${kind}.title`)}
              description={t(`metric.${kind}.description`)}
              disabled={submitting}
            />
          ))}
        </RadioCardGroup>
      </fieldset>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {money ? (
          <div className="space-y-2">
            <label htmlFor="goal-currency" className="label-medium text-text-primary">
              {t('currencyLabel')}
              <span className="ml-1 text-text-danger">*</span>
            </label>
            <SelectA
              value={draft.unit || undefined}
              onValueChange={(v) => set('unit', v)}
              disabled={submitting}
            >
              <SelectTrigger id="goal-currency" className="w-full">
                <SelectValue placeholder={t('currencyPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((currency) => (
                  <SelectItem key={currency.value} value={currency.value}>
                    {currency.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </SelectA>
          </div>
        ) : (
          <TextInput
            id="goal-unit"
            type="text"
            value={draft.unit}
            onChange={(v: string) => set('unit', v)}
            label={t('unitLabel')}
            placeholder={t('unitPlaceholder')}
            disabled={submitting}
          />
        )}

        <TextInput
          id="goal-target"
          type="text"
          value={draft.targetValue}
          onChange={(v: string) => set('targetValue', v)}
          label={money ? t('targetMoneyLabel') : t('targetLabel')}
          // The currency or unit, so the member can see WHICH number is being
          // asked for. For money this is major units — the ×100 happens once,
          // at submit, in `toAddGoalInput`.
          placeholder={money ? draft.unit || t('targetPlaceholder') : t('targetPlaceholder')}
          required
          disabled={submitting}
          errorMessage={targetError}
        />
      </div>

      <TextInput
        id="goal-due-on"
        type="date"
        value={draft.dueOn}
        onChange={(v: string) => set('dueOn', v)}
        label={t('dueOnLabel')}
        placeholder=""
        disabled={submitting}
      />

      <div className="flex items-center gap-2">
        <ButtonType2 className="flex-1" onClick={submit} disabled={submitting}>
          {submitting ? t('adding') : t('add')}
        </ButtonType2>
        {onDone && (
          <ButtonType1 onClick={onDone} disabled={submitting}>
            {tCommon('cancel')}
          </ButtonType1>
        )}
      </div>
    </div>
  );
}
