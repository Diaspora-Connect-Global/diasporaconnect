'use client';

import { Clock } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { Countdown } from '@/components/circles/primitives';

import { formatDeadline } from './formatDeadline';
import { MotionSection } from './MotionSection';

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

  /*
   * An unparseable deadline renders NOTHING, heading included.
   *
   * `Countdown` already bails on a bad date, and `formatDeadline` already
   * returns '' — but between them that produced a "Time remaining" heading
   * with empty space under it, and a "Closes " with the date missing off the
   * end. A section that cannot state a time must not claim to.
   */
  if (!closesAt || Number.isNaN(new Date(closesAt).getTime())) return null;

  return (
    <MotionSection title={t('timeTitle')}>
      <div className="flex items-start gap-2.5">
        <Clock
          aria-hidden="true"
          className="mt-0.5 size-4 shrink-0 text-text-secondary"
        />
        <Countdown
          deadline={closesAt}
          variant="both"
          precision="compact"
          className="min-w-0"
          labels={{
            closesAt: t('closes', {
              time: formatDeadline(closesAt, locale, 'short'),
            }),
            daysHours: tTime.raw('daysHoursLeft') as string,
            hoursMinutes: tTime.raw('hoursMinutesLeft') as string,
            /*
             * The final hour. Without this the primitive falls back to
             * `DEFAULT_COUNTDOWN_LABELS.minutes` — the literal English
             * "{minutes}m left" — so a French or Dutch member watching a motion
             * run out saw English at the one moment the countdown matters most.
             * A default that is a real sentence rather than a placeholder is
             * exactly the kind that ships untranslated unnoticed.
             */
            minutes: tTime.raw('minutesLeft') as string,
            ended: tTime('closed'),
            /*
             * `days` is deliberately absent. It is read only when
             * `precision="days"`, which this component never sets — and the
             * catalogue's `circles.time.daysLeft` is an ICU plural
             * ("{count, plural, ...}"), not the `{days}` template `Countdown`
             * interpolates. Passing it would print the ICU source verbatim.
             */
          }}
        />
      </div>
    </MotionSection>
  );
}
