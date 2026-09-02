'use client';

import { useCallback } from 'react';
import { useQuery } from '@apollo/client/react';
import { ArrowLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';

import { InviteCard, MembersList } from '@/components/circles/members';
import { ErrorState } from '@/components/feedback';
import { Skeleton } from '@/components/ui/skeleton';
import { useCircleUsers } from '@/hooks/useCircleUsers';
import { useRouter } from '@/i18n/navigation';
import { FEED_COLUMN_CLASS } from '@/lib/feedColumnLayout';
import { CIRCLE_MEMBERS } from '@/services/gql/circles';
import type { CircleMembersData } from '@/services/gql/types/circles';
import { useChatStore } from '@/store/ChatStore';
import { useUserStore } from '@/store/useUserStore';

function MembersSkeleton() {
  return (
    <div className="flex flex-col gap-4 py-4">
      <Skeleton className="h-10 w-full rounded-full" />
      <Skeleton className="h-5 w-32" />
      {[...Array(5)].map((_, index) => (
        <div key={index} className="flex items-center gap-3">
          <Skeleton className="size-10 shrink-0 rounded-full" />
          <Skeleton className="h-4 w-40" />
        </div>
      ))}
    </div>
  );
}

/**
 * Circle members.
 *
 * This screen is a ROSTER, not a management console. The only mutation it
 * reaches is `inviteToCircle` — adding someone is not a decision about an
 * existing member. Everything that changes somebody else's standing (removal,
 * appointing a lead) is the enactment of a motion, and the API offers no
 * mutation for it at all.
 *
 * `leaveCircle` belongs here too and is deliberately not wired: the members
 * namespace has no label for the action. See the note on `MemberRow`.
 */
export default function CircleMembersPage() {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations('circles.members');
  const tCommon = useTranslations('circles.common');
  const tErrors = useTranslations('circles.errors');
  const tGlobal = useTranslations('common');

  const circleId = typeof params.id === 'string' ? params.id : '';
  const currentUserId = useUserStore((state) => state.user?.userId);

  const { data, loading, error, refetch } = useQuery<CircleMembersData>(
    CIRCLE_MEMBERS,
    {
      variables: { circleId, status: 'MEMBERSHIP_ACTIVE' },
      skip: !circleId,
    },
  );

  const members = data?.circleMembers ?? [];

  // Circle membership is entitlement-capped (12 on the free plan), which is the
  // precondition `useCircleUsers` documents for resolving identities one call
  // at a time. Do not reuse this on an unbounded list.
  const { usersById } = useCircleUsers(members.map((member) => member.userId));

  /*
   * Opening a direct conversation is the app's existing handshake, copied from
   * `useFriendActions.sendMessage`: the chat page reads its target from the
   * store and from `sessionStorage`, and only supports a `gid` deep-link for
   * groups. Writing one and not the other leaves the chat page opening whatever
   * was selected last.
   */
  const handleSendMessage = useCallback(
    (userId: string) => {
      useChatStore.getState().setActiveChat({ id: userId, type: 'direct' });
      sessionStorage.setItem(
        'activeChat',
        JSON.stringify({ id: userId, type: 'direct' }),
      );
      router.push('/chat?t=direct&ct=direct');
    },
    [router],
  );

  /*
   * Back arrow + page title, matching the app's detail-screen chrome. The arrow
   * is icon-only and carries a generic accessible name rather than the title:
   * labelling it "Members" would announce it as a link TO this page,
   * which is where the user already is.
   */
  const header = (
    <div className="flex shrink-0 items-center gap-2">
      <button
        type="button"
        onClick={() => router.push(`/circles/${circleId}`)}
        aria-label={tGlobal('previousPage')}
        className="cursor-pointer rounded-full p-1.5 text-text-primary transition-colors hover:bg-surface-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-brand"
      >
        <ArrowLeft className="size-5" />
      </button>
      <h1 className="label-large text-text-primary">{t('title')}</h1>
    </div>
  );

  return (
    <div className="h-app-inner flex overflow-hidden">
      <div className={FEED_COLUMN_CLASS}>
        {header}

        {loading && members.length === 0 ? (
          <MembersSkeleton />
        ) : error && members.length === 0 ? (
          <div className="flex flex-1 items-center justify-center">
            <ErrorState
              size="lg"
              description={tErrors('loadMembers')}
              retryLabel={tCommon('retry')}
              onRetry={() => void refetch()}
            />
          </div>
        ) : (
          <div className="flex flex-col gap-6 py-4">
            <MembersList
              members={members}
              usersById={usersById}
              currentUserId={currentUserId}
              onSendMessage={handleSendMessage}
            />
            <InviteCard circleId={circleId} />
          </div>
        )}
      </div>
    </div>
  );
}
