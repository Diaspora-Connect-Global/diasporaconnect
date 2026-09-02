'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';

import { SearchInput } from '@/components/custom/input';
import { NoResults } from '@/components/feedback';
import { circleUserDisplayName, type CircleUser } from '@/hooks/useCircleUsers';
import type { CircleMember } from '@/services/gql/types/circles';

import { MemberRow } from './MemberRow';

export interface MembersListProps {
  members: CircleMember[];
  usersById: Record<string, CircleUser>;
  currentUserId?: string | null;
  onSendMessage: (userId: string) => void;
}

/**
 * Search + roster.
 *
 * The list is rendered in the order the server returned it and is never sorted
 * — not by role, not by join date. Floating LEADs to the top would restate a
 * hierarchy the badge is deliberately understated about.
 */
export function MembersList({
  members,
  usersById,
  currentUserId,
  onSendMessage,
}: MembersListProps) {
  const t = useTranslations('circles.members');
  const tCommon = useTranslations('circles.common');

  const [query, setQuery] = useState('');

  /*
   * Matched on the resolved display name, plus "You" on your own row so the
   * word people can actually see is the word that searches. A member whose
   * profile has not resolved yet keeps an empty name and simply does not match
   * — they are still in the unfiltered list, never dropped from the count.
   */
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return members;

    const you = t('you').toLowerCase();
    return members.filter((member) => {
      const name = (usersById[member.userId]?.name ?? '').toLowerCase();
      const isSelf = member.userId === currentUserId;
      return name.includes(needle) || (isSelf && you.includes(needle));
    });
  }, [members, query, usersById, currentUserId, t]);

  return (
    <div className="flex flex-col gap-4">
      <SearchInput
        id="circle-members-search"
        value={query}
        onChange={setQuery}
        // Filtering happens live on every keystroke, so submitting has nothing
        // left to do — the magnifier stays as an affordance, not an action.
        onSearch={() => {}}
        placeholder={t('searchPlaceholder')}
      />

      <h2 className="label-large text-text-primary">
        {t('countTitle', { count: members.length })}
      </h2>

      {filtered.length === 0 ? (
        /*
          The message already names the term, so it goes in `title`:
          `NoResults` falls back to rendering the bare `query` as its heading
          when none is given, which would put an unlabelled search term where a
          sentence belongs.
        */
        <NoResults
          size="sm"
          title={t('noResults', { query: query.trim() })}
        />
      ) : (
        <ul className="flex flex-col divide-y divide-border-subtle">
          {filtered.map((member) => {
            const user = usersById[member.userId];
            return (
              <MemberRow
                key={member.id}
                member={member}
                user={user}
                displayName={circleUserDisplayName(user, tCommon('loading'))}
                isCurrentUser={member.userId === currentUserId}
                onSendMessage={onSendMessage}
              />
            );
          })}
        </ul>
      )}
    </div>
  );
}
