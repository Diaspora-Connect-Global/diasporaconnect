import type { CircleUser } from '@/hooks/useCircleUsers';
import type { CircleMember } from '@/services/gql/types/circles';

export interface FilterCircleMembersArgs {
  members: CircleMember[];
  usersById: Record<string, CircleUser>;
  query: string;
  currentUserId?: string | null;
  /** The translated word shown on your own row, so searching it matches. */
  youLabel: string;
}

/**
 * Narrow the roster by the search term.
 *
 * Matched on the RESOLVED display name, plus the "You" label on your own row,
 * so the word people can actually see is the word that searches. A member whose
 * profile has not resolved yet keeps an empty name and simply does not match —
 * they are still in the unfiltered list and still counted, never dropped.
 *
 * Pure and separate from the table so the count in the header can stay honest:
 * it reports the whole roster while the table shows the matches.
 */
export function filterCircleMembers({
  members,
  usersById,
  query,
  currentUserId,
  youLabel,
}: FilterCircleMembersArgs): CircleMember[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return members;

  const you = youLabel.toLowerCase();
  return members.filter((member) => {
    const name = (usersById[member.userId]?.name ?? '').toLowerCase();
    const isSelf = member.userId === currentUserId;
    return name.includes(needle) || (isSelf && you.includes(needle));
  });
}
