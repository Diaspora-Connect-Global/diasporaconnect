'use client';

import { useTranslations } from 'next-intl';

import type { CircleUser } from '@/hooks/useCircleUsers';
import type { CircleMotion } from '@/services/gql/types/circles';

import { DecisionRow } from './DecisionRow';

export interface DecisionsTableProps {
  circleId: string;
  /** Settled motions, newest first — the order the server returned them in. */
  motions: readonly CircleMotion[];
  usersById: Record<string, CircleUser>;
}

/**
 * The decision table.
 *
 * ── A REAL TABLE, NOT A GRID OF DIVS ────────────────────────────────────────
 * Four columns of the same four facts about every decision is tabular data by
 * any definition. `<table>` gives column association for free — a screen reader
 * announces "Rules at the time: 2/3 majority" instead of an unlabelled
 * fragment — and that column is the one nobody can afford to hear out of
 * context.
 *
 * ── SCROLLS IN ITS OWN CONTAINER ────────────────────────────────────────────
 * `min-w-[44rem]` keeps four legible columns; the wrapper scrolls horizontally
 * so a narrow viewport moves the TABLE rather than the page. Cramming the
 * columns instead would wrap "2/3 majority / Quorum 4 of 6" into an unreadable
 * stack, which on this column means an unreadable proof.
 *
 * ── ORDER IS THE SERVER'S ───────────────────────────────────────────────────
 * Newest first, as `circleMotions` returns them. Not re-sorted client-side: the
 * list is a window onto a paged server scan, and re-ordering a partial page
 * produces a sequence that is locally plausible and globally wrong.
 */
export function DecisionsTable({ circleId, motions, usersById }: DecisionsTableProps) {
  const t = useTranslations('circles.history.table');

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[44rem] border-collapse text-left">
        <caption className="sr-only">{t('caption')}</caption>
        <thead>
          <tr className="border-b border-border-subtle">
            <th scope="col" className="caption-small px-3 pb-2 font-normal text-text-secondary">
              {t('motion')}
            </th>
            <th scope="col" className="caption-small px-3 pb-2 font-normal text-text-secondary">
              {t('outcome')}
            </th>
            <th scope="col" className="caption-small px-3 pb-2 font-normal text-text-secondary">
              {t('decided')}
            </th>
            <th scope="col" className="caption-small px-3 pb-2 font-normal text-text-secondary">
              {t('rules')}
            </th>
          </tr>
        </thead>
        <tbody>
          {motions.map((motion) => (
            <DecisionRow
              key={motion.id}
              circleId={circleId}
              motion={motion}
              usersById={usersById}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
