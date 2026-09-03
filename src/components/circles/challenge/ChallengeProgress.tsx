'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';

import type { CircleUser } from '@/hooks/useCircleUsers';

import { AvatarGroup } from '../primitives';

const DAY_MS = 86_400_000;

/**
 * Whole days left until `deadline`, or `null` before hydration / with no deadline.
 *
 * Holding `null` until the first effect is the same discipline the `Countdown`
 * primitive uses: anything derived from `Date.now()` differs between the server
 * render and the first client render, and React would flag the mismatch.
 *
 * Recomputed hourly rather than per second — this reads "6 days left", so a
 * tighter tick would re-render the tree sixty times an hour to change nothing.
 */
function useDaysRemaining(deadline: string | null | undefined): number | null {
  const target = useMemo(() => {
    if (!deadline) return null;
    const parsed = new Date(deadline);
    return Number.isNaN(parsed.getTime()) ? null : parsed.getTime();
  }, [deadline]);

  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    if (target === null) return;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 3_600_000);
    return () => window.clearInterval(id);
  }, [target]);

  if (target === null || now === null) return null;
  return Math.max(0, Math.ceil((target - now) / DAY_MS));
}

export interface ChallengeProgressProps {
  /** Distinct people who have entered — one avatar each, never one per entry. */
  participants: CircleUser[];
  endsAt?: string | null;
}

/**
 * "{n} joined", the participant stack, and how long is left.
 *
 * ## Why the ICU message rather than the `Countdown` primitive
 *
 * `Countdown` interpolates flat `{days}` templates, but the catalogue spells
 * this string as an ICU plural (`{days, plural, =1 {1 day left} other {# days
 * left}}`) — a form the primitive cannot consume, and one that five locales
 * genuinely need. Feeding it the raw ICU string would render the braces
 * verbatim; hard-coding "days" would ship "1 days left". So the day count is
 * computed here and handed to `t()`, which is the only thing that can pluralise
 * it correctly. `Countdown` remains the right tool on the screens whose
 * deadline copy is a flat template.
 */
export function ChallengeProgress({
  participants,
  endsAt,
}: ChallengeProgressProps) {
  const t = useTranslations('circles');
  const locale = useLocale();

  const daysLeft = useDaysRemaining(endsAt);

  const endsOn = useMemo(() => {
    if (!endsAt) return '';
    const date = new Date(endsAt);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat(locale, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date);
  }, [endsAt, locale]);

  return (
    <section className="mt-6">
      <h2 className="label-medium text-text-primary">
        {t('challenge.progressTitle')}
      </h2>

      <p className="body-small mt-2 text-text-primary">
        {t('challenge.joined', { count: participants.length })}
      </p>

      {participants.length > 0 && (
        <AvatarGroup
          className="mt-2"
          size="md"
          max={5}
          users={participants.map((participant) => ({
            id: participant.userId,
            // AvatarGroup builds its initials and its `aria-label` roster from
            // `name`, so an unresolved profile gets the loading label rather
            // than an empty bubble.
            name: participant.name ?? t('common.loading'),
            avatarUrl: participant.avatarUrl,
          }))}
        />
      )}

      {(daysLeft !== null || endsOn) && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          {daysLeft !== null ? (
            <span className="label-small text-text-primary">
              {t('challenge.daysLeft', { days: daysLeft })}
            </span>
          ) : (
            <span />
          )}
          {endsOn && (
            <span className="caption-small text-text-secondary">
              {t('challenge.endsOn', { date: endsOn })}
            </span>
          )}
        </div>
      )}
    </section>
  );
}
