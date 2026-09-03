'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLocale } from 'next-intl';
import { cn } from '@/lib/utils';

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * Display strings, taken as props so this file adds no message keys. Each is a
 * template interpolated with `{days}` / `{hours}` / `{minutes}` / `{datetime}`.
 * Callers should pass the `circles.countdown.*` catalogue via `t.raw(...)`
 * once the i18n agent has landed it.
 */
export interface CountdownLabels {
  /** >= 1 day, compact precision — "2d 7h left" */
  daysHours: string;
  /** >= 1 day, coarse precision — "6 days left" */
  days: string;
  /** < 1 day — "7h 30m left" */
  hoursMinutes: string;
  /** < 1 hour — "45m left" */
  minutes: string;
  /** Absolute deadline — "Closes Fri 6pm" */
  closesAt: string;
  /** Terminal state, deadline passed — "Closed" */
  ended: string;
}

export const DEFAULT_COUNTDOWN_LABELS: CountdownLabels = {
  daysHours: '{days}d {hours}h left',
  days: '{days} days left',
  hoursMinutes: '{hours}h {minutes}m left',
  minutes: '{minutes}m left',
  closesAt: 'Closes {datetime}',
  ended: 'Closed',
};

export type CountdownVariant = 'relative' | 'absolute' | 'both';

/** `compact` -> "2d 7h left"; `days` -> "6 days left". */
export type CountdownPrecision = 'compact' | 'days';

export interface CountdownProps {
  /** ISO 8601 deadline. An unparseable value renders nothing. */
  deadline: string;
  variant?: CountdownVariant;
  precision?: CountdownPrecision;
  labels?: Partial<CountdownLabels>;
  /**
   * How the absolute deadline is spelled. Defaults to weekday + hour
   * ("Fri, 6 PM"); pass `{ day: 'numeric', month: 'short', year: 'numeric' }`
   * for the "8 Sep 2025" form.
   */
  absoluteFormat?: Intl.DateTimeFormatOptions;
  /** Below this much time remaining the countdown turns danger-coloured. */
  urgentWithinMs?: number;
  className?: string;
}

function interpolate(
  template: string,
  values: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}

const DEFAULT_ABSOLUTE_FORMAT: Intl.DateTimeFormatOptions = {
  weekday: 'short',
  hour: 'numeric',
};

export function Countdown({
  deadline,
  variant = 'relative',
  precision = 'compact',
  labels,
  absoluteFormat = DEFAULT_ABSOLUTE_FORMAT,
  urgentWithinMs = DAY,
  className,
}: CountdownProps) {
  const locale = useLocale();

  const target = useMemo(() => {
    const parsed = new Date(deadline);
    return Number.isNaN(parsed.getTime()) ? null : parsed.getTime();
  }, [deadline]);

  /*
   * `null` until mounted. Anything derived from `Date.now()` differs between
   * the server render and the first client render, so the relative line is
   * withheld until after hydration. The absolute line depends only on
   * `deadline` and is safe to render immediately.
   */
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
  }, []);

  const remaining = now === null || target === null ? null : target - now;
  const ended = remaining !== null && remaining <= 0;

  /*
   * Seconds matter only in the final hour; elsewhere a per-minute tick keeps a
   * list of these from re-rendering 60x more often than it needs to. `null`
   * stops the timer altogether — before hydration, and once the deadline has
   * passed and there is nothing left to count.
   */
  const tickMs =
    remaining === null || ended ? null : remaining <= HOUR ? SECOND : MINUTE;

  useEffect(() => {
    if (tickMs === null) return;
    const id = window.setInterval(() => setNow(Date.now()), tickMs);
    return () => window.clearInterval(id);
  }, [tickMs]);

  const absolute = useMemo(() => {
    if (target === null) return '';
    return new Intl.DateTimeFormat(locale, absoluteFormat).format(
      new Date(target),
    );
  }, [target, locale, absoluteFormat]);

  if (target === null) return null;

  const text = { ...DEFAULT_COUNTDOWN_LABELS, ...labels };
  const absoluteLine = interpolate(text.closesAt, { datetime: absolute });
  const showAbsolute = variant === 'absolute' || variant === 'both';
  const showRelative = variant === 'relative' || variant === 'both';
  const urgent = remaining !== null && !ended && remaining <= urgentWithinMs;

  let relativeLine: string | null = null;
  if (remaining !== null) {
    if (ended) {
      relativeLine = text.ended;
    } else if (remaining < HOUR) {
      // Floor would show "0m left" for the last 59 seconds.
      relativeLine = interpolate(text.minutes, {
        minutes: Math.max(1, Math.floor(remaining / MINUTE)),
      });
    } else if (remaining < DAY) {
      relativeLine = interpolate(text.hoursMinutes, {
        hours: Math.floor(remaining / HOUR),
        minutes: Math.floor((remaining % HOUR) / MINUTE),
      });
    } else if (precision === 'days') {
      relativeLine = interpolate(text.days, {
        days: Math.floor(remaining / DAY),
      });
    } else {
      relativeLine = interpolate(text.daysHours, {
        days: Math.floor(remaining / DAY),
        hours: Math.floor((remaining % DAY) / HOUR),
      });
    }
  }

  // Once the deadline has passed the absolute "Closes ..." line is a lie, so
  // the terminal state replaces it rather than sitting above it.
  const renderAbsolute = showAbsolute && !ended;
  // Pre-hydration a relative-only Countdown would render empty and shift the
  // layout on mount; the absolute string is deterministic, so it stands in
  // until the first tick lands.
  const renderAbsoluteFallback = showRelative && !showAbsolute && remaining === null;

  return (
    <span
      className={cn('inline-flex flex-col gap-0.5', className)}
      data-ended={ended || undefined}
    >
      {(renderAbsolute || renderAbsoluteFallback) && (
        <span
          className={cn(
            'caption-small',
            urgent ? 'text-text-danger' : 'text-text-primary',
          )}
        >
          {absoluteLine}
        </span>
      )}

      {showRelative && relativeLine !== null && (
        <span
          className={cn(
            'caption-small',
            ended
              ? 'text-text-secondary line-through'
              : urgent
                ? 'text-text-danger'
                : 'text-text-secondary',
          )}
        >
          {relativeLine}
        </span>
      )}
    </span>
  );
}
