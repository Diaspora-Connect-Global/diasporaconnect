'use client';

import { useQuery } from '@apollo/client/react';
import { useTranslations } from 'next-intl';

import { AvatarGroup, StatusPill } from '@/components/circles/primitives';
import { Skeleton } from '@/components/ui/skeleton';
import { circleUserDisplayName, useCircleUsers } from '@/hooks/useCircleUsers';
import { Link } from '@/i18n/navigation';
import { CIRCLE_MEMBERS } from '@/services/gql/circles';
import type {
  CircleMembersData,
  CircleMembersVariables,
} from '@/services/gql/types/circles';

import { SidePanel } from './SidePanel';

/**
 * How many people the rail resolves.
 *
 * `useCircleUsers` issues ONE profile request per id — acceptable for a circle,
 * whose size is entitlement-capped, but not something a rail should scale with.
 * The heading count comes from `Circle.memberCount` (computed server-side over
 * active memberships), so a circle larger than this page still reports its true
 * size and sends you to the members screen for the rest.
 */
const ROSTER_PAGE = 12;

export interface CircleMembersPanelProps {
  circleId: string;
  /** From `Circle.memberCount` — the authoritative count, not this page's length. */
  memberCount: number;
  currentUserId?: string | null;
}

/**
 * Who is in this circle, beside the conversation.
 *
 * ── STILL NOT A MANAGEMENT CONSOLE ──────────────────────────────────────────
 * A row here is a name, an avatar and — for a lead — a small pill. No remove,
 * no promote, no per-row menu, and the order is the server's rather than leads
 * first: removing somebody is the enactment of a passed REMOVE_MEMBER motion,
 * and floating leads to the top would rebuild the hierarchy the pill is
 * deliberately understated about. The full-size roster on the Members screen
 * (`members/MembersTable`) makes the same choice; this is that roster, quieter.
 *
 * It imports NOTHING from `members/` — that screen owns its own layout and has
 * already been restructured once around a table. A rail row is three elements;
 * coupling it to a table cell would break this panel the next time that screen
 * is redesigned.
 */
export function CircleMembersPanel({
  circleId,
  memberCount,
  currentUserId,
}: CircleMembersPanelProps) {
  const t = useTranslations('circles');

  const { data, loading } = useQuery<CircleMembersData, CircleMembersVariables>(
    CIRCLE_MEMBERS,
    {
      // Prefixed spelling: `status` is a gateway FILTER argument. The bare
      // `ACTIVE` read back off a member is a different vocabulary, and sending
      // it here returns an empty list rather than an error.
      variables: { circleId, status: 'MEMBERSHIP_ACTIVE', limit: ROSTER_PAGE, offset: 0 },
      skip: !circleId,
      fetchPolicy: 'cache-and-network',
      // Best-effort: the roster is context beside the chat. A failed read costs
      // the panel, never the screen.
      errorPolicy: 'all',
    },
  );

  const members = data?.circleMembers ?? [];
  const { usersById } = useCircleUsers(members.map((member) => member.userId));

  return (
    <SidePanel
      title={t('members.countTitle', { count: memberCount })}
      action={
        <Link
          href={`/circles/${circleId}/members`}
          className="label-small shrink-0 text-text-brand hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-brand"
        >
          {t('common.seeAll')}
        </Link>
      }
    >
      {loading && members.length === 0 ? (
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="size-8 shrink-0 rounded-full" />
              <Skeleton className="h-3.5 w-28" />
            </div>
          ))}
        </div>
      ) : (
        <ul className="flex flex-col gap-1">
          {members.map((member) => {
            const user = usersById[member.userId];
            const displayName = circleUserDisplayName(user, t('common.loading'));
            const isSelf = member.userId === currentUserId;

            return (
              <li key={member.id} className="flex items-center gap-3 py-1">
                <AvatarGroup
                  size="md"
                  users={[
                    { id: member.userId, name: displayName, avatarUrl: user?.avatarUrl },
                  ]}
                />
                <span className="label-small min-w-0 flex-1 truncate text-text-primary">
                  {isSelf ? t('members.you') : displayName}
                </span>
                {member.role === 'LEAD' && (
                  <StatusPill variant="success" label={t('members.lead')} />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </SidePanel>
  );
}
