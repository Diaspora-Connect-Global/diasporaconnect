'use client';

import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';

import { MotionSection } from './MotionSection';

interface TallyCellProps {
  value: number;
  label: string;
  tone: string;
}

function TallyCell({ value, label, tone }: TallyCellProps) {
  return (
    /*
      A divider between cells rather than three boxes: the three figures are one
      reading, not three cards, and boxing them would imply each is separately
      actionable. `first:border-l-0` keeps the leading edge clean at every
      breakpoint without a conditional in the parent.
    */
    <div className="flex flex-1 flex-col items-center gap-1 border-l border-border-subtle px-2 py-1 first:border-l-0">
      <span className={cn('heading-xsmall sm:heading-small tabular-nums', tone)}>
        {value}
      </span>
      <span className="caption-small text-center text-text-secondary">
        {label}
      </span>
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
 *
 * ── "PENDING" IS NOT A THIRD OPINION ────────────────────────────────────────
 * The third figure counts electors who have not voted, and it is deliberately
 * rendered in the neutral text colour rather than borrowing Yes's green or No's
 * red. Tinting it either way would suggest silence leans somewhere; it does
 * not, and a motion that closes on nothing but pending votes changes nothing at
 * all. See `SilenceCallout`, which says so in words.
 */
export function MotionTally({ yes, no, pending }: MotionTallyProps) {
  const t = useTranslations('circles.motion');

  return (
    <MotionSection title={t('tallyTitle')}>
      <div className="flex items-stretch">
        <TallyCell value={yes} label={t('tallyYes')} tone="text-text-success" />
        <TallyCell value={no} label={t('tallyNo')} tone="text-text-danger" />
        <TallyCell
          value={pending}
          label={t('tallyPending')}
          tone="text-text-primary"
        />
      </div>
    </MotionSection>
  );
}
