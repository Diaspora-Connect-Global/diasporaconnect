'use client';

import { useTranslations } from 'next-intl';

import { ProgressWithLabel } from '@/components/circles/primitives';

export interface QuorumProgressProps {
  /** Ballots cast so far — yes + no + abstain. */
  voted: number;
  /** Ballots the motion's own pinned quorum needs before it counts at all. */
  required: number;
  /** From the tally, computed server-side against the same pinned rule. */
  quorumMet: boolean;
}

/**
 * Progress toward QUORUM — not toward passing.
 *
 * The bar measures `voted / required`, which is what "{voted} of {required}
 * required" says. It turns success-coloured only once quorum is met, and that
 * is a statement about turnout alone: a motion can clear quorum and still be
 * rejected on the majority, so nothing here may be read as an outcome.
 */
export function QuorumProgress({
  voted,
  required,
  quorumMet,
}: QuorumProgressProps) {
  const t = useTranslations('circles.motion');

  // A zero requirement would divide by zero; there is nothing left to reach, so
  // the bar is full.
  const percent = required > 0 ? (voted / required) * 100 : 100;

  return (
    <section className="flex flex-col gap-2">
      <h2 className="label-large text-text-primary">{t('quorumTitle')}</h2>
      <ProgressWithLabel
        value={percent}
        label={t('quorumProgress', { voted, required })}
        tone={quorumMet ? 'success' : 'brand'}
      />
    </section>
  );
}
