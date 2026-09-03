'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useMemo } from 'react';

import type { CircleUser } from '@/hooks/useCircleUsers';
import { formatDateOnly } from '@/macros/time';
import type { CircleAuditEvent } from '@/services/gql/types/circles-governance';

import { AuditEntry } from './AuditEntry';

export interface DecisionLogProps {
  circleId: string;
  events: readonly CircleAuditEvent[];
  usersById: Record<string, CircleUser>;
}

interface DayGroup {
  /** Stable key: the ISO calendar date, or `''` for entries with no timestamp. */
  key: string;
  label: string;
  events: CircleAuditEvent[];
}

/**
 * Group consecutive entries by calendar day.
 *
 * Grouped over the list AS GIVEN rather than by re-sorting into day buckets:
 * the server returns strict `seq` order and that order is the record. A row
 * whose `occurredAt` is out of step with its neighbours is itself a finding —
 * re-sorting by date would quietly hide it, and this screen exists to show
 * exactly that kind of thing.
 *
 * A missing `occurredAt` gets its own unlabelled group rather than being
 * folded into whichever day happened to precede it.
 */
function groupByDay(
  events: readonly CircleAuditEvent[],
  locale: string,
): DayGroup[] {
  const groups: DayGroup[] = [];

  for (const event of events) {
    const iso = event.occurredAt ?? '';
    const key = iso ? iso.slice(0, 10) : '';
    const last = groups[groups.length - 1];

    if (last && last.key === key) {
      last.events.push(event);
      continue;
    }

    groups.push({
      key,
      label: iso ? formatDateOnly(iso, { locale }) : '',
      events: [event],
    });
  }

  return groups;
}

/**
 * The decision log itself.
 *
 * ── ORDER ───────────────────────────────────────────────────────────────────
 * Newest first, which is both what circle-service returns (`seq` DESC) and how
 * a log is read. The `seq` on every row makes the direction unambiguous and
 * makes a gap visible; paging walks backwards through the same sequence via the
 * keyset cursor, so what you see is a contiguous window of the real thing and
 * not a re-ordered view of one.
 *
 * An `<ol>` rather than a stack of divs: this is an ordered record, and a
 * screen reader announcing "list, 40 items" with positions is a better
 * description of it than any amount of visual styling.
 */
export function DecisionLog({ circleId, events, usersById }: DecisionLogProps) {
  const t = useTranslations('circles.history');
  const locale = useLocale();

  const groups = useMemo(() => groupByDay(events, locale), [events, locale]);

  return (
    <div className="flex flex-col gap-5">
      {groups.map((group, index) => (
        <section key={`${group.key}-${index}`} className="flex flex-col gap-1">
          {/* `bg-background`, not `bg-surface-default`: this heading floats over
              the PAGE, and the two tokens differ in both themes (#ffffff vs the
              off-white page ground in light, #191919 vs near-black in dark), so
              the wrong one draws a visible band as the log scrolls under it. */}
          <h2 className="caption-small sticky top-0 z-10 bg-background py-1 text-text-secondary">
            {group.label || t('entry.undated')}
          </h2>
          <ol className="flex flex-col">
            {group.events.map((event) => (
              <AuditEntry
                key={event.id}
                circleId={circleId}
                event={event}
                usersById={usersById}
              />
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
