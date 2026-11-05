'use client';

import { useTranslations } from 'next-intl';

import { NoResults } from '@/components/feedback';
import { circleUserDisplayName, type CircleUser } from '@/hooks/useCircleUsers';
import type { CircleMember } from '@/services/gql/types/circles';

import { MemberTableRow } from './MemberTableRow';

export interface MembersTableProps {
  /** Already filtered by the caller's search term. */
  members: CircleMember[];
  usersById: Record<string, CircleUser>;
  currentUserId?: string | null;
  onSendMessage: (userId: string) => void;
  /** The live search term, so an empty result can name what was searched for. */
  query: string;
}

const HEAD_CELL =
  'label-small px-4 py-3 text-left whitespace-nowrap text-text-primary';

/**
 * The roster, as a table: Member · Role · Joined.
 *
 * ── ORDER IS THE SERVER'S ───────────────────────────────────────────────────
 * Never sorted here — not by role, not by join date. Floating leads to the top
 * would restate a hierarchy the Role column is deliberately understated about,
 * and the columns are not click-to-sort for the same reason.
 *
 * ── PHONES DROP THE JOINED COLUMN ──────────────────────────────────────────
 * Below `sm` the join date moves under the name, so the message button is never
 * pushed off-screen behind a sideways scroll.
 *
 * ── SCROLLS INSIDE ITSELF ───────────────────────────────────────────────────
 * From `sm` up, the `min-w` on the table keeps four columns legible and the
 * wrapper's `overflow-x-auto` keeps that width from pushing the page body
 * sideways. Widen a column and the table scrolls; it never widens the page.
 *
 * ── AN UNRESOLVED PROFILE IS STILL A MEMBER ─────────────────────────────────
 * `useCircleUsers` resolves identities best-effort and yields a null name when
 * a profile fails. Such a row renders with the loading fallback rather than
 * being dropped: the table is the circle's membership, and a person missing
 * from it under-reports who is in the room.
 */
export function MembersTable({
  members,
  usersById,
  currentUserId,
  onSendMessage,
  query,
}: MembersTableProps) {
  const t = useTranslations('circles.members');
  const tCommon = useTranslations('circles.common');

  const trimmedQuery = query.trim();

  if (members.length === 0) {
    /*
      The message already names the term, so it goes in `title`: `NoResults`
      falls back to rendering the bare `query` as its heading when none is
      given, which would put an unlabelled search term where a sentence
      belongs. With no term there is nothing to have failed to match, so the
      copy says the roster is empty instead of blaming a search.
    */
    return (
      <NoResults
        size="sm"
        title={
          trimmedQuery ? t('noResults', { query: trimmedQuery }) : t('emptyRoster')
        }
      />
    );
  }

  // `relative`: the sr-only header span is absolutely positioned; without a positioned
  // ancestor it escapes this scroller and widens the whole page at 360 px.
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border-subtle bg-surface-default shadow-sm sm:overflow-x-auto">
      <table className="w-full border-collapse text-left sm:min-w-[520px]">
        <thead className="border-b border-border-subtle bg-surface-subtle">
          <tr>
            <th scope="col" className={HEAD_CELL}>
              {t('columns.member')}
            </th>
            <th scope="col" className={HEAD_CELL}>
              {t('columns.role')}
            </th>
            <th scope="col" className={`${HEAD_CELL} max-sm:hidden`}>
              {t('columns.joined')}
            </th>
            {/*
              The actions column carries only the message button, so its header
              is named for that rather than labelled "Actions" — and it is
              visually empty because a one-icon column needs no title.
            */}
            <th scope="col" className={HEAD_CELL}>
              <span className="sr-only">{t('actions.message')}</span>
            </th>
          </tr>
        </thead>

        <tbody className="divide-y divide-border-subtle">
          {members.map((member) => {
            const user = usersById[member.userId];
            return (
              <MemberTableRow
                key={member.id}
                member={member}
                user={user}
                displayName={circleUserDisplayName(user, tCommon('loading'))}
                isCurrentUser={member.userId === currentUserId}
                onSendMessage={onSendMessage}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
