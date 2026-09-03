'use client';

import { useId } from 'react';
import { useTranslations } from 'next-intl';
import { AlertTriangle, Users, Zap } from 'lucide-react';

import { RadioCard, RadioCardGroup } from '@/components/circles/primitives';
import type {
  CircleActionPolicy,
  CircleAllowance,
} from '@/services/gql/types/circles-actions';

import { majorityKey, quorumKey, windowParts } from './governanceCopy';

/**
 * @fileoverview The two things every circle creation form has to say BEFORE
 * the member fills it in: how much allowance is left, and whether this is
 * theirs to do or the circle's to decide.
 * @module components/circles/governance/ActionGate
 *
 * Both live here rather than beside the forms because both are answers to
 * governance questions — one asked of the entitlement snapshot, one of the
 * circle's own rules — and every creation flow asks them identically.
 */

// ---------------------------------------------------------------------------
// Allowance
// ---------------------------------------------------------------------------

export interface AllowanceNoticeProps {
  /** Null when the action has no cap, or the circle has no row for the key. */
  allowance: CircleAllowance | null;
}

/**
 * "2 of 3 used — 1 left", or the refusal, stated before the form.
 *
 * ── WHY THIS IS SHOWN UP FRONT AND NOT AS AN ERROR ──────────────────────────
 * `MAX_ACTIVE_PROJECTS` and `MAX_ACTIVE_CHALLENGES` are enforced inside
 * circle-service against a live COUNT. Nothing else on any screen shows the
 * cap: the plan is not surfaced to ordinary members, and the usage is a COUNT
 * that leaves no trace of having been consulted. A member who fills in a form
 * and is then told "you are at your limit" has no way to have known, and
 * `ENTITLEMENT_LOCK_HIT` exists in the audit trail precisely because *"why
 * can't we start a project?" is otherwise an unanswerable support ticket*.
 *
 * ── RENDERS NOTHING WHEN UNLIMITED ──────────────────────────────────────────
 * Not "unlimited" — nothing. A member on a plan with no cap has no decision to
 * make here, and a badge saying so is noise on every visit. `remaining === null`
 * IS the unlimited case; it is deliberately never `0`, because `hasLimit: false`
 * arrives alongside `limit: 0` and conflating the two turns the most generous
 * plan into the one that can do nothing.
 */
export function AllowanceNotice({ allowance }: AllowanceNoticeProps) {
  const t = useTranslations('circles.actions');

  if (!allowance || allowance.remaining === null) return null;

  if (allowance.locked || allowance.remaining === 0) {
    return (
      <p
        // No coloured border on a card — the icon and `text-text-danger` carry
        // the meaning on their own. (`border-warning` and `border-info` are
        // both red anyway, so a status border here could only ever mislead.)
        className="body-small flex items-start gap-2 rounded-lg border border-border-subtle p-3 text-text-danger"
        role="status"
      >
        <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        <span>
          {t('allowance.none', {
            limit: allowance.limit ?? allowance.current,
          })}
        </span>
      </p>
    );
  }

  return (
    <p className="caption-small text-text-secondary" role="status">
      {t('allowance.remaining', {
        current: allowance.current,
        limit: allowance.limit ?? 0,
        remaining: allowance.remaining,
      })}
    </p>
  );
}

// ---------------------------------------------------------------------------
// Direct, or a motion?
// ---------------------------------------------------------------------------

/** Which route the member has chosen for this action. */
export type ChosenRoute = 'direct' | 'motion';

export interface ActionRouteChoiceProps {
  policy: CircleActionPolicy;
  value: ChosenRoute;
  onChange: (route: ChosenRoute) => void;
  disabled?: boolean;
}

/**
 * "Start it now" or "Put it to the circle".
 *
 * ── WHY BOTH ARE OFFERED INSTEAD OF ONE BEING INFERRED ──────────────────────
 * Both mutations exist and both are legitimate. `createCircleProject` is
 * MEMBER-gated at the gateway and `CreateProjectHandler` never consults a
 * governance rule, so any member of a live circle can act immediately.
 * `openCircleMotion(kind: CREATE_PROJECT)` puts the same act to a vote. The
 * choice between them is the circle's culture, not a fact the client can
 * derive — and quietly picking one would remove the ability to say "let's
 * decide this together", which is the entire point of the feature.
 *
 * What governance DOES decide is whether the motion route is open to this
 * member at all: `proposerRole` on the live rule for this kind. That is read,
 * never assumed — the shipped defaults put CREATE_PROJECT and CREATE_CHALLENGE
 * at MEMBER, so hard-coding "leads only" would be wrong out of the box, and a
 * circle that amends its rules would find the UI enforcing the old ones.
 *
 * ── WHY A DISABLED OPTION AND NOT A HIDDEN ONE ──────────────────────────────
 * When a route is unavailable the card stays, disabled, with the reason. A
 * member who cannot propose should learn that their circle reserves this to
 * leads; hiding the card teaches them the option does not exist.
 *
 * With only one route available the control collapses to a single explanatory
 * line, because a radio group of one is a control that cannot be operated.
 */
export function ActionRouteChoice({
  policy,
  value,
  onChange,
  disabled = false,
}: ActionRouteChoiceProps) {
  const t = useTranslations('circles.actions');
  const tGov = useTranslations('circles.governance');
  const labelId = useId();

  const { canActDirectly, canOpenMotion, rule } = policy;

  /**
   * One line describing what a vote would need: what passes it, and for how
   * long. Assembled from the SAME helpers the governance screen uses, so the
   * two cannot describe one rule differently.
   */
  const ruleSummary = (() => {
    if (!rule) return null;
    const majority = tGov(
      `majority.${majorityKey(rule.majorityNumerator, rule.majorityDenominator)}`,
      {
        n: rule.majorityNumerator,
        d: rule.majorityDenominator,
      },
    );
    const quorum = tGov(
      `quorum.${quorumKey(rule.quorumNumerator, rule.quorumDenominator)}`,
      {
        n: rule.quorumNumerator,
        d: rule.quorumDenominator,
      },
    );
    const { unit, count } = windowParts(rule.votingWindowHours);
    const window = tGov(`window.${unit}`, { count });
    return t('route.motionRule', { majority, quorum, window });
  })();

  // Only one way through — state it rather than rendering an inoperable group.
  if (!canActDirectly || !canOpenMotion) {
    return (
      <p className="body-small rounded-lg bg-surface-brand-light p-4 text-text-brand">
        {canActDirectly ? t('route.onlyDirect') : null}
        {canOpenMotion ? t('route.onlyMotion', { rule: ruleSummary ?? '' }) : null}
      </p>
    );
  }

  return (
    <fieldset className="space-y-3" disabled={disabled}>
      <legend id={labelId} className="label-medium text-text-primary">
        {t('route.question')}
      </legend>
      <RadioCardGroup
        aria-labelledby={labelId}
        value={value}
        onValueChange={(next) => onChange(next as ChosenRoute)}
      >
        <RadioCard
          value="direct"
          icon={<Zap aria-hidden="true" />}
          title={t('route.directTitle')}
          description={t('route.directDescription')}
          disabled={disabled}
        />
        <RadioCard
          value="motion"
          icon={<Users aria-hidden="true" />}
          title={t('route.motionTitle')}
          description={ruleSummary ?? t('route.motionDescription')}
          disabled={disabled}
        />
      </RadioCardGroup>
    </fieldset>
  );
}

// ---------------------------------------------------------------------------
// Nothing is available
// ---------------------------------------------------------------------------

export interface ActionBlockedNoticeProps {
  policy: CircleActionPolicy;
}

/**
 * Why neither route is open.
 *
 * `blockedBy` is only ever set when BOTH are shut, so this renders nothing in
 * the common case where one route remains — a member at the project cap can
 * still open a motion, because the cap binds at ENACTMENT, not at proposal.
 */
export function ActionBlockedNotice({ policy }: ActionBlockedNoticeProps) {
  const t = useTranslations('circles.actions');

  if (!policy.blockedBy) return null;

  return (
    <p
      className="body-small flex items-start gap-2 rounded-lg border border-border-subtle p-4 text-text-danger"
      role="status"
    >
      <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <span>{t(`blocked.${policy.blockedBy}`)}</span>
    </p>
  );
}
