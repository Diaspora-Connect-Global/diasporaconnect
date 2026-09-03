'use client';

import { useLocale, useTranslations } from 'next-intl';

import { Link } from '@/i18n/navigation';
import { formatDateOnly } from '@/macros/time';
import type { CircleGovernanceRule } from '@/services/gql/types/circles';

import { majorityKey, normaliseFraction, quorumKey, windowParts } from './governanceCopy';

export interface RuleHistoryProps {
  circleId: string;
  /** Every version of ONE motion kind's rule, newest version first. */
  versions: readonly CircleGovernanceRule[];
}

/**
 * How one rule changed over time.
 *
 * ── SUPERSEDED ROWS ARE EVIDENCE, NOT CLUTTER ───────────────────────────────
 * Rules are versioned and never updated in place. A motion pins `ruleId` and
 * `ruleVersion` when it opens and is tallied against that version forever, so
 * this list is how a past decision stays checkable: the version a motion ran
 * under is looked up here, long after the circle has amended the rule twice
 * more. That is also why every version links to the AMEND_RULES motion that
 * introduced it — a rule change is itself a decision the circle voted for, and
 * the vote is one tap away.
 *
 * The seeded original has no `createdByMotionId`. That is not missing data: a
 * new circle is given working defaults so it can function on day one, and no
 * motion introduced them. It is labelled as the starting rule rather than left
 * with an inert link.
 */
export function RuleHistory({ circleId, versions }: RuleHistoryProps) {
  const t = useTranslations('circles.governance');
  const locale = useLocale();

  return (
    <ol className="flex flex-col gap-2 border-l-2 border-border-subtle pl-3">
      {versions.map((rule) => {
        const majority = normaliseFraction(rule.majorityNumerator, rule.majorityDenominator);
        const quorum = normaliseFraction(rule.quorumNumerator, rule.quorumDenominator);
        const votingWindow = windowParts(rule.votingWindowHours);

        const from = rule.effectiveFrom ? formatDateOnly(rule.effectiveFrom, { locale }) : '';
        const until = rule.supersededAt ? formatDateOnly(rule.supersededAt, { locale }) : '';

        return (
          <li key={rule.id} className="flex flex-col gap-0.5">
            <div className="flex flex-wrap items-baseline gap-x-2">
              <span className="label-small text-text-primary">
                {t('history.version', { version: rule.version })}
              </span>
              <span className="caption-small text-text-secondary">
                {until
                  ? t('history.range', { from, until })
                  : t('history.current', { from })}
              </span>
            </div>

            <p className="body-small text-text-primary">
              {t('history.summary', {
                majority: t(
                  `majority.${majorityKey(rule.majorityNumerator, rule.majorityDenominator)}`,
                  { n: majority.n, d: majority.d },
                ),
                quorum: t(
                  `quorum.${quorumKey(rule.quorumNumerator, rule.quorumDenominator)}`,
                  { n: quorum.n, d: quorum.d },
                ),
                window: t(`window.${votingWindow.unit}`, { count: votingWindow.count }),
              })}
            </p>

            {rule.createdByMotionId ? (
              <Link
                href={`/circles/${circleId}/motions/${rule.createdByMotionId}`}
                className="caption-small w-fit text-text-brand underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-brand"
              >
                {t('history.viewMotion')}
              </Link>
            ) : (
              <span className="caption-small text-text-secondary">{t('history.seeded')}</span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
