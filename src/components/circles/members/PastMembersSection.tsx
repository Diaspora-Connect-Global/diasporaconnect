'use client';

import { useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { circleUserDisplayName, useCircleUsers } from '@/hooks/useCircleUsers';
import { cn } from '@/lib/utils';
import type { CircleMember } from '@/services/gql/types/circles';

import { PastMemberRow } from './PastMemberRow';

export interface PastMembersSectionProps {
  circleId: string;
  /** Memberships that ended because the person left. */
  left: CircleMember[];
  /** Memberships a passed REMOVE_MEMBER motion ended. */
  removed: CircleMember[];
  /** Memberships the PLATFORM suspended — not the circle's doing. */
  suspended: CircleMember[];
}

/**
 * Everyone who used to be in this circle, and why they are not.
 *
 * ── WHY THE HISTORY IS ON THE ROSTER AT ALL ─────────────────────────────────
 * `circle_membership` rows are never deleted — a departure rewrites the row's
 * status, it does not remove it — and that was a deliberate choice. Showing
 * only the active half made this screen quietly claim the circle had always
 * been its current membership. A member who was voted out in March simply
 * ceased to have existed, along with the motion that decided it.
 *
 * ── ONE SECTION, THREE REASONS, NOT THREE SECTIONS ──────────────────────────
 * Splitting by reason would build a hierarchy of departures — a "removed"
 * bucket sitting under a heading is a wall of shame, and a suspended person
 * filed beside voted-out ones inherits their verdict. One chronological list
 * with a reason on each row states the same facts and ranks nobody.
 *
 * Ordered most recent first. That is a chronology, not a judgement, so it does
 * not carry the objection that keeps the ACTIVE roster in server order — there,
 * sorting leads to the top would restate the hierarchy the lead pill is careful
 * not to imply. Here there is no hierarchy to restate.
 *
 * ── COLLAPSED BY DEFAULT ────────────────────────────────────────────────────
 * Not to hide it — the count is in the always-visible heading, so the fact that
 * people have left is never concealed — but because this list is the one part
 * of the screen that grows for the life of the circle while the active roster
 * is entitlement-capped. Expanding is also what gates identity resolution:
 * `useCircleUsers` issues one profile query PER PERSON and its own contract
 * says not to use it on an unbounded list, so the id array is empty until the
 * section is open and the rows are actually on screen.
 */
export function PastMembersSection({
  circleId,
  left,
  removed,
  suspended,
}: PastMembersSectionProps) {
  const t = useTranslations('circles.members.past');
  const tCommon = useTranslations('circles.common');

  const [expanded, setExpanded] = useState(false);

  /*
   * Merged and ordered by departure, most recent first. The three arrays are
   * disjoint by construction — a unique index on `(circle_id, user_id)` means
   * one membership row per person, so a rejoin flips that row back to ACTIVE
   * rather than adding a second one, and nobody can appear twice here or in
   * both this list and the active roster above.
   *
   * A row with no `leftAt` sorts last rather than first: an absent timestamp is
   * missing data, and letting it float to the top of a "most recent" list would
   * present the least-known departure as the freshest news.
   */
  const pastMembers = useMemo(() => {
    return [...left, ...removed, ...suspended].sort((a, b) => {
      const at = a.leftAt ? new Date(a.leftAt).getTime() : NaN;
      const bt = b.leftAt ? new Date(b.leftAt).getTime() : NaN;
      if (Number.isNaN(at) && Number.isNaN(bt)) return 0;
      if (Number.isNaN(at)) return 1;
      if (Number.isNaN(bt)) return -1;
      return bt - at;
    });
  }, [left, removed, suspended]);

  const { usersById } = useCircleUsers(
    expanded ? pastMembers.map((member) => member.userId) : [],
  );

  // Nothing has ended yet. A "nobody has left" line would be noise on the
  // screen of every circle that has not lost anyone — which is most of them.
  if (pastMembers.length === 0) return null;

  return (
    <section className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setExpanded((open) => !open)}
        aria-expanded={expanded}
        aria-controls="circle-past-members"
        className="flex cursor-pointer items-center justify-between gap-2 rounded-lg py-1 text-left transition-colors hover:bg-surface-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-brand"
      >
        <h2 className="label-large text-text-primary">
          {t('title', { count: pastMembers.length })}
        </h2>
        <ChevronDown
          aria-hidden="true"
          className={cn(
            'size-5 shrink-0 text-text-secondary transition-transform',
            expanded && 'rotate-180',
          )}
        />
      </button>

      <p className="caption-small text-text-secondary">{t('description')}</p>

      {expanded && (
        <ul
          id="circle-past-members"
          className="flex flex-col divide-y divide-border-subtle"
        >
          {pastMembers.map((member) => (
            <PastMemberRow
              key={member.id}
              circleId={circleId}
              member={member}
              user={usersById[member.userId]}
              displayName={circleUserDisplayName(
                usersById[member.userId],
                tCommon('loading'),
              )}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
