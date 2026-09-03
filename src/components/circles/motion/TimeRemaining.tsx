'use client';

import { Clock } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { Countdown } from '@/components/circles/primitives';

import { formatDeadline } from './formatDeadline';

export interface TimeRemainingProps {
  /** The motion's PINNED `closesAt` — never a window recomputed from today's rule. */
  closesAt: string;
}

/**
 * Absolute deadline plus a live relative countdown.
 *
 * `Countdown` interpolates its own label templates, so the raw ICU-free strings
 * have to reach it unformatted via `t.raw`; calling `t()` on
 * "{days}d {hours}h left" would ask next-intl to resolve placeholders this
 * component does not have values for.
 *
 * `closesAt` is passed already RESOLVED rather than as a template: the
 * primitive interpolates `{datetime}` into that slot, but the shipped message
 * is "Closes {time}", and a mismatched placeholder name would print the brace
 * literally. A string with no braces left in it passes through untouched.
 */
export function TimeRemaining({ closesAt }: TimeRemainingProps) {
  const t = useTranslations('circles.motion');
  const tTime = useTranslations('circles.time');
  const locale = useLocale();

  return (
    <section className="flex flex-col gap-2">
      <h2 className="label-large text-text-primary">{t('timeTitle')}</h2>
      <div className="flex items-start gap-2">
        <Clock
          aria-hidden="true"
          className="mt-0.5 size-4 shrink-0 text-text-secondary"
        />
        <Countdown
          deadline={closesAt}
          variant="both"
          precision="compact"
          labels={{
            closesAt: t('closes', {
              time: formatDeadline(closesAt, locale, 'short'),
            }),
            daysHours: tTime.raw('daysHoursLeft') as string,
            hoursMinutes: tTime.raw('hoursMinutesLeft') as string,
            ended: tTime('closed'),
          }}
        />
      </div>
    </section>
  );
}
