'use client';

import { useTranslations } from 'next-intl';

import {
  StatusPill,
  type StatusPillVariant,
} from '@/components/circles/primitives';
import type { CircleMotionStatus } from '@/services/gql/types/circles';

interface PillSpec {
  /** Key under `circles.motion.status`. */
  labelKey: 'open' | 'passed' | 'failed' | 'closed' | 'withdrawn';
  variant: StatusPillVariant;
}

/**
 * Seven motion states, five labels.
 *
 * Two mappings are deliberate rather than lossy:
 *
 *  - `EXPIRED` reads "Closed", not "Failed". The window ran out without quorum,
 *    so NOTHING happened — that is the product's central promise, and calling it
 *    a failure would imply the circle rejected something it never decided.
 *
 *  - `ENACTMENT_FAILED` reads "Passed" (in warning tone), not "Failed". The vote
 *    passed and the circle DID decide; what failed was applying it. The reason
 *    is surfaced separately from `enactmentError` — see `MotionHeader`. Labelling
 *    the pill "Failed" would tell the circle its decision was rejected, which is
 *    the opposite of what happened.
 */
const STATUS_SPEC: Record<CircleMotionStatus, PillSpec> = {
  OPEN: { labelKey: 'open', variant: 'success' },
  PASSED: { labelKey: 'passed', variant: 'success' },
  ENACTED: { labelKey: 'passed', variant: 'success' },
  ENACTMENT_FAILED: { labelKey: 'passed', variant: 'warning' },
  REJECTED: { labelKey: 'failed', variant: 'danger' },
  EXPIRED: { labelKey: 'closed', variant: 'neutral' },
  WITHDRAWN: { labelKey: 'withdrawn', variant: 'neutral' },
};

export interface MotionStatusPillProps {
  status: CircleMotionStatus;
  className?: string;
}

export function MotionStatusPill({ status, className }: MotionStatusPillProps) {
  const t = useTranslations('circles.motion.status');

  // An unrecognised status from a newer gateway must still render something
  // legible rather than crashing the page it appears on.
  const spec = STATUS_SPEC[status] ?? STATUS_SPEC.WITHDRAWN;

  return (
    <StatusPill
      variant={spec.variant}
      className={className}
      label={t(spec.labelKey)}
      icon={
        status === 'OPEN' ? (
          // A plain dot rather than an icon: the pill normalises `svg` children
          // to 12px, which is twice the size this marker wants.
          <span
            aria-hidden="true"
            className="inline-block size-1.5 shrink-0 rounded-full bg-text-success"
          />
        ) : undefined
      }
    />
  );
}
