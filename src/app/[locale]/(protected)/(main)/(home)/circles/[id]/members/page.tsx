'use client';

import { useCallback } from 'react';
import { useQuery } from '@apollo/client/react';
import { ArrowLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';

import {
  InviteCard,
  InviteLinksPanel,
  MembersList,
  PastMembersSection,
} from '@/components/circles/members';
import { ErrorState } from '@/components/feedback';
import { Skeleton } from '@/components/ui/skeleton';
import { useCircleUsers } from '@/hooks/useCircleUsers';
import { useRouter } from '@/i18n/navigation';
import { CIRCLE_COLUMN_CLASS } from '@/lib/feedColumnLayout';
import { CIRCLE_MEMBERS, MY_CIRCLE_MEMBERSHIP } from '@/services/gql/circles';
import { CIRCLE_PAST_MEMBERS } from '@/services/gql/circles-invites';
import type {
  CircleMembersData,
  CircleMembersVariables,
  MyCircleMembershipData,
  MyCircleMembershipVariables,
} from '@/services/gql/types/circles';
import type {
  CirclePastMembersData,
  CirclePastMembersVariables,
} from '@/services/gql/types/circles-invites';
import { useChatStore } from '@/store/ChatStore';
import { useUserStore } from '@/store/useUserStore';

/**
 * Past members accumulate for the life of the circle while active membership is
 * entitlement-capped, so this is the one list on the screen that grows without
 * bound. Capped per reason and treated as "the most recent"; a circle that
 * outgrows it needs paging, not a bigger number.
 */
const PAST_MEMBERS_LIMIT = 25;

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
 * Circle members — who is here, who used to be, and how to let someone in.
 *
 * ── STILL A ROSTER, NOT A MANAGEMENT CONSOLE ────────────────────────────────
 * Nothing on this screen changes an existing member's standing. There is no
 * remove control and no promote control, because the API offers no mutation for
 * either: removing somebody is the ENACTMENT of a passed REMOVE_MEMBER motion,
 * so a button here would be either dead or a lie about who decided. If removal
 * is ever surfaced from this screen it must read "Propose removal", open a
 * motion, and land the user on that motion.
 *
 * The mutations this screen does reach are all about ADMISSION, which is not a
 * decision about anyone already inside: `inviteToCircle` (any member, one named
 * person) and `mintCircleInviteLink` / `revokeCircleInviteLink` (lead only, a
 * shareable bearer credential).
 *
 * ── FORMER MEMBERS ARE PART OF THE ROSTER ───────────────────────────────────
 * `circle_membership` rows are never deleted; a departure rewrites the status.
 * Showing only the active half let this screen quietly assert the circle had
 * always been its current membership, with the people it voted out — and the
 * motions that decided it — simply absent. Each ending is now labelled with its
 * reason, and a removal links to the motion that caused it.
 *
 * `leaveCircle` still belongs here and is still not wired: the members
 * namespace has no label for the action. Reported rather than invented.
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

  const { data, loading, error, refetch } = useQuery<CircleMembersData, CircleMembersVariables>(
    CIRCLE_MEMBERS,
    {
      variables: { circleId, status: 'MEMBERSHIP_ACTIVE' },
      skip: !circleId,
    },
  );

  const members = data?.circleMembers ?? [];

  /*
   * Former members, in one round trip (three aliased calls). Failures degrade
   * to no section rather than taking the page down: the active roster is what
   * this screen is for, and history is worth less than the list it annotates.
   */
  const { data: pastData } = useQuery<
    CirclePastMembersData,
    CirclePastMembersVariables
  >(CIRCLE_PAST_MEMBERS, {
    variables: { circleId, limit: PAST_MEMBERS_LIMIT },
    skip: !circleId,
    errorPolicy: 'all',
  });

  /*
   * Advisory only — the gateway enforces the same gate and refuses the link
   * operations outright for anyone else. Used to keep the LEAD-only panel, and
   * its LEAD-only query, off every ordinary member's screen: an unskipped
   * `circleInviteLinks` would put a permission error in front of them.
   */
  const { data: membershipData } = useQuery<
    MyCircleMembershipData,
    MyCircleMembershipVariables
  >(MY_CIRCLE_MEMBERSHIP, {
    variables: { circleId },
    skip: !circleId,
    errorPolicy: 'all',
  });
  const isLead = membershipData?.myCircleMembership?.isLead ?? false;

  // Circle membership is entitlement-capped (12 on the free plan), which is the
  // precondition `useCircleUsers` documents for resolving identities one call
  // at a time. Do not reuse this on an unbounded list. Former members are
  // resolved separately, and only once their section is opened.
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
      <div className={CIRCLE_COLUMN_CLASS}>
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

            <PastMembersSection
              circleId={circleId}
              left={pastData?.left ?? []}
              removed={pastData?.removed ?? []}
              suspended={pastData?.suspended ?? []}
            />

            <InviteCard circleId={circleId} />

            {/*
              Minting a shareable link is a lead's call, not a member's: an
              invitation names its addressee, a link is a bearer credential that
              opens the circle to an audience the rest never agreed to.
            */}
            {isLead && <InviteLinksPanel circleId={circleId} />}
          </div>
        )}
      </div>
    </div>
  );
}
