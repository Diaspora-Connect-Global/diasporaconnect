'use client';

import { History } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { requiredVotes } from '@/components/circles/motion';
import type { CircleGovernanceRule } from '@/services/gql/types/circles';

import { isKnownMotionKind } from './motionKinds';
import { majorityKey, normaliseFraction, quorumKey, windowParts } from './governanceCopy';

function Row({ label, value, note }: { label: string; value: string; note?: string | null }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-border-subtle py-2.5 last:border-b-0 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
      <dt className="body-small shrink-0 text-text-secondary">{label}</dt>
      <dd className="label-small text-text-primary sm:text-right">
        {value}
        {note ? (
          <span className="caption-small mt-0.5 block font-normal text-text-secondary">
            {note}
          </span>
        ) : null}
      </dd>
    </div>
  );
}

export interface RuleCardProps {
  rule: CircleGovernanceRule;
  /**
   * Today's active member count, used only for the "which is N people right
   * now" aside. Omitted when unknown — an invented number here would read as
   * a promise about a future vote.
   */
  memberCount?: number | null;
  /** Shown only when this kind's rule has actually been amended. */
  onShowHistory?: () => void;
  /** Number of versions, for the history affordance's label. */
  versionCount?: number;
  /** Whether the caller is currently showing this rule's history. Drives `aria-expanded`. */
  historyExpanded?: boolean;
}

/**
 * One motion kind's rule, in plain language.
 *
 * ── THIS IS A CONSTITUTION, NOT A SETTINGS TABLE ────────────────────────────
 * A settings table would print `2/3` and `48` and leave the reader to work out
 * what happens. Someone opening this screen is asking "what would happen if I
 * proposed this?", so every value is a sentence with a subject and a verb, and
 * the fractions appear only where the phrasing would otherwise be imprecise.
 *
 * ── WHERE THE WORDING COMES FROM ────────────────────────────────────────────
 * `Motion.tally()` in circle-service, not from the field names. Two details
 * that the raw numbers actively mislead about, and which the copy therefore
 * states explicitly:
 *
 *   - Quorum counts EVERY ballot, abstentions included: it measures turnout,
 *     not agreement. Reading `quorumNumerator/Denominator` as "how many must
 *     agree" is the natural mistake and it is wrong.
 *   - The majority is computed over YES+NO only, and needs `yes > no` on top of
 *     the fraction. That second condition is why a tie never passes on its own,
 *     and it is invisible in the stored numbers.
 *
 * ── THE "TODAY" ASIDE ───────────────────────────────────────────────────────
 * Quorum is a fraction OF the electorate, and a motion pins its electorate when
 * it opens. Showing today's member count makes the rule concrete, so it is
 * labelled as today's number rather than presented as the threshold a future
 * motion will face — because if two people join tomorrow, it is not.
 */
export function RuleCard({
  rule,
  memberCount,
  onShowHistory,
  versionCount,
  historyExpanded = false,
}: RuleCardProps) {
  const t = useTranslations('circles.governance');
  const tKind = useTranslations('circles.governance.motionKind');

  const kindLabel = isKnownMotionKind(rule.motionKind) ? tKind(rule.motionKind) : rule.motionKind;

  const majority = normaliseFraction(rule.majorityNumerator, rule.majorityDenominator);
  const quorum = normaliseFraction(rule.quorumNumerator, rule.quorumDenominator);
  // Not `window` — that shadows the DOM global inside a client component, and a
  // later reader adding a `window.matchMedia` call here would get a very
  // confusing error.
  const votingWindow = windowParts(rule.votingWindowHours);

  /*
   * `proposerRole` is nullable on the gateway DTO. An absent value is NOT
   * "any member" — who may propose is enforced inside circle-service against
   * this very rule, and guessing it here would state a governance fact this
   * screen does not know. Say "not specified" instead.
   */
  const proposer =
    rule.proposerRole === 'LEAD'
      ? t('proposer.lead')
      : rule.proposerRole === 'MEMBER'
        ? t('proposer.member')
        : t('value.unspecified');

  const tie =
    rule.tieBreaksTo === 'LEAD'
      ? t('tie.lead')
      : rule.tieBreaksTo === 'REJECT'
        ? t('tie.reject')
        : t('value.unspecified');

  /*
   * Ballots needed for quorum at today's size. `requiredVotes` is imported from
   * the motion module rather than re-derived: it rounds UP with integer
   * arithmetic (a 2/3 quorum over 7 needs 5, not 4), and a second copy of that
   * rounding would eventually disagree with the one the tally actually uses.
   */
  const ballotsToday =
    typeof memberCount === 'number' && memberCount > 0
      ? requiredVotes({
          electorateSize: memberCount,
          quorumNumerator: rule.quorumNumerator,
          quorumDenominator: rule.quorumDenominator,
        })
      : null;

  return (
    <section className="rounded-xl border border-border-subtle px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <h3 className="heading-xsmall text-text-primary">{kindLabel}</h3>
        {onShowHistory && versionCount && versionCount > 1 ? (
          <button
            type="button"
            onClick={onShowHistory}
            aria-expanded={historyExpanded}
            className="caption-small flex shrink-0 cursor-pointer items-center gap-1 rounded-full px-2 py-1 text-text-brand transition-colors hover:bg-surface-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-brand"
          >
            <History aria-hidden="true" className="size-3" />
            {t('history.versions', { count: versionCount })}
          </button>
        ) : null}
      </div>

      <dl className="mt-1 flex flex-col">
        <Row label={t('field.proposer')} value={proposer} />
        <Row
          label={t('field.passes')}
          value={t(`majority.${majorityKey(rule.majorityNumerator, rule.majorityDenominator)}`, {
            n: majority.n,
            d: majority.d,
          })}
          note={t('majority.note')}
        />
        <Row
          label={t('field.quorum')}
          value={t(`quorum.${quorumKey(rule.quorumNumerator, rule.quorumDenominator)}`, {
            n: quorum.n,
            d: quorum.d,
          })}
          note={
            ballotsToday !== null
              ? t('quorum.today', { required: ballotsToday, total: memberCount as number })
              : t('quorum.note')
          }
        />
        <Row
          label={t('field.window')}
          value={t(`window.${votingWindow.unit}`, { count: votingWindow.count })}
          note={t('window.note')}
        />
        <Row label={t('field.tie')} value={tie} />
      </dl>
    </section>
  );
}
