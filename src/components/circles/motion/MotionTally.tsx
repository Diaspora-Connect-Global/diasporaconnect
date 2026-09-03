'use client';

import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';

interface TallyCellProps {
  value: number;
  label: string;
  tone: string;
}

function TallyCell({ value, label, tone }: TallyCellProps) {
  return (
    <div className="flex flex-1 flex-col gap-0.5">
      <span className={cn('heading-xsmall', tone)}>{value}</span>
      <span className="caption-small text-text-secondary">{label}</span>
    </div>
  );
}

export interface MotionTallyProps {
  yes: number;
  no: number;
  /** `notVoted` from the tally — electors who have not cast a ballot yet. */
  pending: number;
}

/**
 * The aggregate count, and only the aggregate count.
 *
 * There is deliberately no per-member vote roster anywhere in this feature:
 * individual ballots are never published, so the API exposes a tally and
 * nothing else. Do not add a "who voted how" list here.
 */
export function MotionTally({ yes, no, pending }: MotionTallyProps) {
  const t = useTranslations('circles.motion');

  return (
    <section className="flex flex-col gap-2">
      <h2 className="label-large text-text-primary">{t('tallyTitle')}</h2>
      <div className="flex items-start gap-3">
        <TallyCell value={yes} label={t('tallyYes')} tone="text-text-success" />
        <TallyCell value={no} label={t('tallyNo')} tone="text-text-danger" />
        <TallyCell
          value={pending}
          label={t('tallyPending')}
          tone="text-text-primary"
        />
      </div>
    </section>
  );
}
