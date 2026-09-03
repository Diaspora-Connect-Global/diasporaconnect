'use client';

import { useTranslations } from 'next-intl';

import { StatusPill } from '@/components/circles/primitives';

import { outcomeSpecFor } from './decisionCopy';

export interface OutcomePillProps {
  /** `CircleMotionStatus`, typed loosely so a value from a newer gateway still renders. */
  status: string;
  className?: string;
}

/**
 * What happened to one motion, in one chip.
 *
 * Colour is carried here and nowhere else on the row: an outcome is genuinely a
 * status, and a reader scanning a column of them is looking for the one that
 * went badly. The row itself stays uncoloured — a table of decisions striped
 * green and red reads as a scoreboard, and half of these outcomes are not wins
 * or losses at all.
 *
 * The labels are the load-bearing part. See `OUTCOME_SPEC` for why an expired
 * motion must never read as a rejection and why a failed enactment still reads
 * as passed.
 */
export function OutcomePill({ status, className }: OutcomePillProps) {
  const t = useTranslations('circles.history.outcome');

  const spec = outcomeSpecFor(status);

  return (
    <StatusPill
      variant={spec.variant}
      label={t(spec.labelKey)}
      className={`whitespace-nowrap ${className ?? ''}`}
    />
  );
}
