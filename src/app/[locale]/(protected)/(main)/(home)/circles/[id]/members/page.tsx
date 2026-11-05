'use client';

import { useCallback, useMemo, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';

import {
  filterCircleMembers,
  GovernanceCallout,
  InviteCard,
  InviteLinksPanel,
  JoinRequestsSection,
  MembersTable,
  MembersToolbar,
  PastMembersSection,
} from '@/components/circles/members';
import PageLoader from '@/components/custom/PageLoader';
import { ErrorState } from '@/components/feedback';
import { useCircleUsers } from '@/hooks/useCircleUsers';
import { useRouter } from '@/i18n/navigation';
import { CircleScreen, CircleScreenHeading } from '@/components/circles/shell';
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

/** The invite panel the toolbar's button expands, for `aria-controls`. */
const INVITE_PANEL_ID = 'circle-members-invite-panel';

/**
 * Circle members — who is here, who used to be, and how to let someone in.
 *
 * ── STILL A ROSTER, NOT A MANAGEMENT CONSOLE ────────────────────────────────
 * Nothing on this screen changes an existing member's standing. There is no
 * remove control and no promote control, because the API offers no mutation for
 * either: removing somebody is the ENACTMENT of a passed REMOVE_MEMBER motion,
 * so a button here would be either dead or a lie about who decided. The rule is
 * no longer only enforced by omission — `GovernanceCallout` states it under the
 * table, because a members list with no remove button reads as a missing
 * feature until the screen explains that the circle, not an admin, decides.
 * If removal is ever surfaced from this screen it must read "Propose removal",
 * open a motion, and land the user on that motion.
 *
 * The mutations this screen does reach are all about ADMISSION, which is not a
 * decision about anyone already inside: `inviteToCircle` (one named person) and
 * `mintCircleInviteLink` / `revokeCircleInviteLink` (a shareable bearer
 * credential). The gateway limits both to a circle's leads, so any other member
 * who submits the invite form is refused. Both live behind the toolbar's "Invite to
 * circle" disclosure rather than sitting open under the roster — the roster and
 * the governance rule are what the screen is for.
 *
 * ── FORMER MEMBERS ARE PART OF THE ROSTER ───────────────────────────────────
 * `circle_membership` rows are never deleted; a departure rewrites the status.
 * Showing only the active half let this screen quietly assert the circle had
 * always been its current membership, with the people it voted out — and the
 * motions that decided it — simply absent. Each ending is labelled with its
 * reason, and a removal links to the motion that caused it. The callout closes
 * the screen underneath it: those rows are the rule in evidence.
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

  const circleId = typeof params.id === 'string' ? params.id : '';
  const currentUserId = useUserStore((state) => state.user?.userId);

  const [query, setQuery] = useState('');
  const [inviteOpen, setInviteOpen] = useState(false);

  const { data, loading, error, refetch } = useQuery<CircleMembersData, CircleMembersVariables>(
    CIRCLE_MEMBERS,
    {
      variables: { circleId, status: 'MEMBERSHIP_ACTIVE' },
      skip: !circleId,
    },
  );

  const members = useMemo(() => data?.circleMembers ?? [], [data]);

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
   * The table shows the matches; the count beside the title reports the whole
   * roster. Searching narrows what you can see, never what the circle IS.
   */
  const youLabel = t('you');
  const visibleMembers = useMemo(
    () =>
      filterCircleMembers({
        members,
        usersById,
        query,
        currentUserId,
        youLabel,
      }),
    [members, usersById, query, currentUserId, youLabel],
  );

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
   * Page title on the left, search + invite on the right. The shared circle
   * header above already says where you are and links home, so there is no back
   * arrow here. The row stacks on a phone so neither control is squeezed.
   */
  const header = (
    <CircleScreenHeading
      title={t('title')}
      subtitle={tCommon('memberCount', { count: members.length })}
      actions={
        <MembersToolbar
          query={query}
          onQueryChange={setQuery}
          inviteOpen={inviteOpen}
          onToggleInvite={() => setInviteOpen((open) => !open)}
          invitePanelId={INVITE_PANEL_ID}
        />
      }
    />
  );

  return (
    <CircleScreen>
        {header}

        {loading && members.length === 0 ? (
          <PageLoader />
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
          <div className="flex flex-col gap-5">
            {/*
              The wrapper always exists so the toolbar button's `aria-controls`
              always resolves, but its contents mount only when opened —
              `InviteLinksPanel` runs a LEAD-gated query on mount and there is
              no reason to spend it on a member who never asked to invite.
            */}
            <div
              id={INVITE_PANEL_ID}
              hidden={!inviteOpen}
              className="flex flex-col gap-4"
            >
              {inviteOpen && (
                <>
                  <InviteCard circleId={circleId} />

                  {/*
                    Minting a shareable link is a lead's call, not a member's: an
                    invitation names its addressee, a link is a bearer credential
                    that opens the circle to an audience the rest never agreed to.
                  */}
                  {isLead && <InviteLinksPanel circleId={circleId} />}
                </>
              )}
            </div>

            {isLead && <JoinRequestsSection circleId={circleId} />}

            <MembersTable
              members={visibleMembers}
              usersById={usersById}
              currentUserId={currentUserId}
              onSendMessage={handleSendMessage}
              query={query}
            />

            <PastMembersSection
              circleId={circleId}
              left={pastData?.left ?? []}
              removed={pastData?.removed ?? []}
              suspended={pastData?.suspended ?? []}
            />

            {/*
              The footer of the screen, and the point of it. It explains the
              control the roster does not have, and it lands immediately after
              the former-members list — where the "Removed by motion" rows and
              their links to the deciding motions are the evidence for it.
            */}
            <GovernanceCallout />
          </div>
        )}
    </CircleScreen>
  );
}
