'use client';

import { useLocale, useTranslations } from 'next-intl';

import { formatChatTimestamp } from '@/macros/time';
import type { CircleMotion } from '@/services/gql/types/circles';

import { requiredVotes } from './quorum';

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border-subtle py-2.5 last:border-b-0">
      <dt className="body-small text-text-secondary">{label}</dt>
      <dd className="label-small text-right text-text-primary">{value}</dd>
    </div>
  );
}

export interface MotionDetailsProps {
  motion: CircleMotion;
}

/**
 * The rule this motion is actually bound by.
 *
 * ── EVERY VALUE HERE COMES OFF THE MOTION, NOT OFF THE CIRCLE ───────────────
 * `quorumNumerator/Denominator`, `majorityNumerator/Denominator`,
 * `electorateSize`, `opensAt` and `closesAt` are a snapshot pinned when the
 * motion opened. `circleGovernanceRules` answers a different question — what a
 * NEW motion would be opened under — and reading it here would let a passed
 * AMEND_RULES motion retroactively restate the terms of every vote still in
 * progress, which is exactly the guarantee the pinned block exists to make.
 * Do not "simplify" this by querying the circle's current rules.
 */
export function MotionDetails({ motion }: MotionDetailsProps) {
  const t = useTranslations('circles.motion');
  const locale = useLocale();

  const openedAt = motion.opensAt ?? motion.createdAt ?? null;
  const required = requiredVotes(motion);

  return (
    <section className="flex flex-col gap-2">
      <h2 className="label-large text-text-primary">{t('detailsTitle')}</h2>
      <dl className="flex flex-col">
        {openedAt && (
          <DetailRow
            label={t('opened')}
            value={formatChatTimestamp(openedAt, { locale })}
          />
        )}
        <DetailRow
          label={t('electorate')}
          value={t('electorateValue', { count: motion.electorateSize })}
        />
        <DetailRow
          label={t('decisionRule')}
          value={t('decisionRuleValue', {
            n: motion.majorityNumerator,
            d: motion.majorityDenominator,
          })}
        />
        <DetailRow
          label={t('quorumRule')}
          value={t('quorumRuleValue', {
            required,
            total: motion.electorateSize,
          })}
        />
      </dl>
    </section>
  );
}
