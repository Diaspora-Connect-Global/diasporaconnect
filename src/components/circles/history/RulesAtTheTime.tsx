'use client';

import { useTranslations } from 'next-intl';

import type { CircleMotion } from '@/services/gql/types/circles';

import { pinnedRuleParts } from './decisionCopy';

export interface RulesAtTheTimeProps {
  motion: CircleMotion;
}

/**
 * The threshold a past decision was actually measured against.
 *
 * ── THIS COLUMN IS THE VISIBLE PROOF OF THE GOVERNANCE INVARIANT ────────────
 * A motion pins its rule — id, version, quorum, majority, tie-break and
 * electorate size — in the INSERT that opens it, and those values are never
 * updated. This component renders that snapshot, straight off the motion, via
 * `pinnedRuleParts`, which is given a `CircleMotion` and no way to reach
 * anything else.
 *
 * If it instead read the circle's CURRENT rule (`circleGovernanceRules`, or a
 * join to `circle_governance_rule`), then the day a circle amended its majority
 * every past decision on this page would silently restate itself under the new
 * threshold. The history would still look legitimate — which is what makes it
 * the worst possible failure here: it would show the platform having rewritten
 * decisions the circle made under different terms. Do not "simplify" this by
 * querying the live rule.
 *
 * A motion decided before an amendment and one decided after will therefore
 * show DIFFERENT fractions on the same screen. That is correct, and it is the
 * whole reason the column exists.
 */
export function RulesAtTheTime({ motion }: RulesAtTheTimeProps) {
  const t = useTranslations('circles.history.rules');

  const { majority, quorum } = pinnedRuleParts(motion);

  // Missing thresholds are stated as missing. Printing "0/0 majority" would
  // look like a rule and be one more false claim about a settled decision.
  if (!majority && !quorum) {
    return <span className="body-small text-text-secondary">{t('unavailable')}</span>;
  }

  const majorityLabel = majority
    ? t(`majority.${majority.key}`, { n: majority.n, d: majority.d })
    : null;

  return (
    <span className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
      {majorityLabel ? (
        <span className="label-small text-text-primary">{majorityLabel}</span>
      ) : null}

      {majorityLabel && quorum ? (
        // Decorative divider only — the two facts are already separate elements,
        // so a screen reader gains nothing from hearing a slash between them.
        <span aria-hidden="true" className="caption-small text-text-tertiary">
          /
        </span>
      ) : null}

      {quorum ? (
        <span className="body-small text-text-secondary">
          {t('quorum', { required: quorum.required, total: quorum.total })}
        </span>
      ) : null}
    </span>
  );
}
