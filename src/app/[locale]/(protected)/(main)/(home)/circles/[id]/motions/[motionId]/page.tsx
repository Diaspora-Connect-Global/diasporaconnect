'use client';

import { useQuery } from '@apollo/client/react';
import { ArrowLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';

import {
  MOTION_CARD_CLASS,
  MotionActionsMenu,
  MotionCard,
  MotionDetails,
  MotionHeader,
  MotionTally,
  QuorumProgress,
  SilenceCallout,
  TimeRemaining,
  ViewDiscussion,
  VotePanel,
  isMotionOpen,
  requiredVotes,
  votesCast,
} from '@/components/circles/motion';
import { ErrorState } from '@/components/feedback';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from '@/i18n/navigation';
import { CIRCLE_COLUMN_CLASS } from '@/lib/feedColumnLayout';
import {
  CIRCLE_CHAT,
  CIRCLE_MEMBERS,
  CIRCLE_MOTION,
  CIRCLE_MOTION_TALLY,
} from '@/services/gql/circles';
import { GET_MESSAGES } from '@/services/gql/messaging';
import type {
  CircleChatData,
  CircleMembersData,
  CircleMembersVariables,
  CircleMotionData,
  CircleMotionTallyData,
} from '@/services/gql/types/circles';
import type { GetMessagesData } from '@/services/gql/types/messaging';
import { useUserStore } from '@/store/useUserStore';

/**
 * The reading measure for the whole screen.
 *
 * `CIRCLE_COLUMN_CLASS` is deliberately uncapped so the circles sidebar stays
 * pinned to the edge of the viewport (see `lib/feedColumnLayout`), which leaves
 * this page's content free to run the full width of a desktop monitor. It must
 * not: this is a page someone READS before making a decision, and a rationale
 * paragraph set 1600px wide is unreadable. The cap goes on the content, not the
 * column, so the sidebar keeps its position.
 */
const MOTION_MEASURE_CLASS = 'mx-auto flex w-full max-w-3xl flex-col gap-4';

function MotionSkeleton() {
  // The same shell the real cards use, so the skeleton cannot drift away from
  // the layout it stands in for.
  const card = MOTION_CARD_CLASS;
  return (
    <div className={MOTION_MEASURE_CLASS}>
      <div className={card}>
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-4 w-20" />
        </div>
        <Skeleton className="mt-4 h-8 w-3/4" />
        <div className="mt-4 flex items-center gap-3">
          <Skeleton className="size-9 shrink-0 rounded-full" />
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-40" />
          </div>
        </div>
        <Skeleton className="mt-4 h-12 w-full" />
      </div>
      <div className={card}>
        <Skeleton className="h-5 w-16" />
        <div className="mt-3 flex gap-3">
          <Skeleton className="h-20 flex-1 rounded-xl" />
          <Skeleton className="h-20 flex-1 rounded-xl" />
          <Skeleton className="h-20 flex-1 rounded-xl" />
        </div>
      </div>
      <div className={card}>
        <Skeleton className="h-16 w-full" />
        <Skeleton className="mt-4 h-10 w-full" />
      </div>
      <Skeleton className="h-24 w-full rounded-2xl" />
      <Skeleton className="h-44 w-full rounded-2xl" />
    </div>
  );
}

/**
 * Motion detail — the screen where the product's promise is either kept or not.
 *
 * ── EVERYTHING ABOUT THE RULE COMES OFF THE MOTION ──────────────────────────
 * Quorum, majority, electorate size and the deadline are read from the motion's
 * own PINNED snapshot, never from `circleGovernanceRules`. That query describes
 * the rule a NEW motion would open under; rendering a live vote against it would
 * mean a passed AMEND_RULES motion silently restated the terms of every vote
 * already in progress. `circleGovernanceRules` is deliberately not imported here.
 *
 * ── NO BALLOT ROSTER ────────────────────────────────────────────────────────
 * The API exposes an aggregate tally and nothing else, because individual
 * ballots are never published. There is no query for who voted which way and
 * this screen must never grow one.
 */
export default function CircleMotionPage() {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations('circles.motion');
  const tCommon = useTranslations('circles.common');
  const tErrors = useTranslations('circles.errors');
  const tGlobal = useTranslations('common');

  const circleId = typeof params.id === 'string' ? params.id : '';
  const motionId =
    typeof params.motionId === 'string' ? params.motionId : '';

  const currentUserId = useUserStore((state) => state.user?.userId);

  const {
    data: motionData,
    loading: motionLoading,
    error: motionError,
    refetch: refetchMotion,
  } = useQuery<CircleMotionData>(CIRCLE_MOTION, {
    variables: { circleId, motionId },
    skip: !circleId || !motionId,
  });

  const { data: tallyData } = useQuery<CircleMotionTallyData>(
    CIRCLE_MOTION_TALLY,
    {
      variables: { circleId, motionId },
      skip: !circleId || !motionId,
    },
  );

  /*
   * Read only to answer "did I join before this motion opened?".
   *
   * `myCircleMembership` carries role and standing but not `joinedAt`, and the
   * electorate was materialised from the membership table at open time — so the
   * join date is the one fact that decides it. Served `cache-first` because a
   * join date never changes and the members screen issues the identical query.
   */
  const { data: membersData } = useQuery<CircleMembersData, CircleMembersVariables>(CIRCLE_MEMBERS, {
    variables: { circleId, status: 'MEMBERSHIP_ACTIVE' },
    skip: !circleId || !currentUserId,
    fetchPolicy: 'cache-first',
  });

  /*
   * A motion has no thread of its own — it is proposed and argued in the circle
   * chat — so "View discussion" links there and counts that. `getMessages` is
   * asked for a single row purely for its `total`; there is no count-only query.
   */
  const { data: chatData } = useQuery<CircleChatData>(CIRCLE_CHAT, {
    variables: { circleId },
    skip: !circleId,
    fetchPolicy: 'cache-first',
  });

  const conversationId = chatData?.circleChat?.available
    ? chatData.circleChat.conversationId
    : null;

  const { data: messagesData } = useQuery<GetMessagesData>(GET_MESSAGES, {
    variables: { conversationId: conversationId ?? '', limit: 1, offset: 0 },
    skip: !conversationId,
    fetchPolicy: 'cache-first',
  });

  const motion = motionData?.circleMotion ?? null;
  const tally = tallyData?.circleMotionTally ?? null;

  /*
   * Back arrow + page title + overflow, matching the app's detail-screen
   * chrome. The arrow is icon-only and carries a generic accessible name rather
   * than the title: labelling it "Motion details" would announce it as a link
   * TO this page, which is where the user already is.
   *
   * The row keeps its bottom rule and its own padding so it reads as chrome
   * belonging to the viewport, not as the first card in the stack — and it
   * spans the full column while the content below is centred at a reading
   * measure, which is what puts the back arrow at the edge where the eye
   * expects it.
   */
  const header = (
    <div className="flex shrink-0 items-center gap-2 border-b border-border-subtle pb-3">
      <button
        type="button"
        onClick={() => router.push(`/circles/${circleId}`)}
        aria-label={tGlobal('previousPage')}
        className="cursor-pointer rounded-full p-1.5 text-text-primary transition-colors hover:bg-surface-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-brand"
      >
        <ArrowLeft className="size-5" />
      </button>
      <span className="label-large min-w-0 flex-1 truncate text-text-primary">
        {t('title')}
      </span>
      {motion && (
        /*
          No `myCircleMembership` read to feed this: neither action is a lead's.
          Withdrawal is the proposer's own right and enactment is mechanical, so
          the page already holds every fact the menu gates on. Fetching a role
          would suggest one of them is a role's to exercise.
        */
        <MotionActionsMenu
          circleId={circleId}
          motion={motion}
          isProposer={Boolean(
            currentUserId && motion.proposedBy === currentUserId,
          )}
          onChanged={() => void refetchMotion()}
        />
      )}
    </div>
  );

  if (motionLoading && !motion) {
    return (
      <div className="h-app-inner flex overflow-hidden">
        <div className={CIRCLE_COLUMN_CLASS}>
          {header}
          <div className="py-4">
            <MotionSkeleton />
          </div>
        </div>
      </div>
    );
  }

  /*
   * A non-member gets `null` rather than an error — the gateway's membership
   * gate is deliberately quiet about whether the motion exists. Both cases land
   * here and read the same way, which is the intent.
   */
  if (motionError || !motion) {
    return (
      <div className="h-app-inner flex overflow-hidden">
        <div className={CIRCLE_COLUMN_CLASS}>
          {header}
          <div className="flex flex-1 items-center justify-center">
            <ErrorState
              size="lg"
              description={tErrors('loadMotion')}
              retryLabel={tCommon('retry')}
              onRetry={() => void refetchMotion()}
            />
          </div>
        </div>
      </div>
    );
  }

  const required = requiredVotes(motion);
  const cast = tally ? votesCast(tally) : 0;

  /*
   * Positive evidence only. Someone whose membership started after `opensAt`
   * was not in the electorate materialised at open time, and circle-service
   * will refuse their ballot — so say so up front instead of offering three
   * buttons that cannot work. A member row we could not load, or a null
   * `joinedAt`, proves nothing and leaves the buttons alone; the server stays
   * the authority in every case.
   */
  const myJoinedAt = membersData?.circleMembers?.find(
    (member) => member.userId === currentUserId,
  )?.joinedAt;

  const isOutsideElectorate = Boolean(
    myJoinedAt &&
      motion.opensAt &&
      new Date(myJoinedAt).getTime() > new Date(motion.opensAt).getTime(),
  );

  /*
   * Whether `TimeRemaining` will actually render something. It returns null for
   * a missing or unparseable `closesAt`, and the two-column grid below has to
   * know: a lone child in `sm:grid-cols-2` would leave the quorum bar squeezed
   * into the left half with an empty column beside it, which reads as a panel
   * that failed to load rather than as one that had nothing to say.
   */
  const hasDeadline = Boolean(
    motion.closesAt && !Number.isNaN(new Date(motion.closesAt).getTime()),
  );

  return (
    <div className="h-app-inner flex overflow-hidden">
      <div className={CIRCLE_COLUMN_CLASS}>
        {header}

        <div className={`${MOTION_MEASURE_CLASS} py-4`}>
          <MotionCard>
            <MotionHeader motion={motion} />
          </MotionCard>

          <MotionCard>
            <VotePanel
              circleId={circleId}
              motionId={motion.id}
              isOpen={isMotionOpen(motion)}
              closesAt={motion.closesAt}
              isOutsideElectorate={isOutsideElectorate}
              opensAt={motion.opensAt}
              memberJoinedAt={myJoinedAt}
            />
          </MotionCard>

          {/*
            Tally, quorum and deadline are three readings of ONE question —
            where does the vote stand right now — so they share a card rather
            than sitting as three separate panels a reader has to reassemble.
            Quorum and time pair up side by side from `sm` because each is two
            short lines; the tally keeps the full width because three figures
            squeezed into a third of a card stop being scannable.
          */}
          <MotionCard className="flex flex-col gap-5">
            {/*
              While a motion is OPEN the live tally is the truth; once it is
              decided the outcome columns are the record that was written once,
              at tally, from the pinned thresholds — and never touched again.
            */}
            <MotionTally
              yes={tally ? tally.yes : motion.outcomeYes}
              no={tally ? tally.no : motion.outcomeNo}
              pending={
                tally
                  ? tally.notVoted
                  : Math.max(
                      0,
                      motion.electorateSize -
                        (motion.outcomeYes +
                          motion.outcomeNo +
                          motion.outcomeAbstain),
                    )
              }
            />

            <div
              className={`grid gap-5 border-t border-border-subtle pt-5 sm:gap-8 ${
                hasDeadline ? 'sm:grid-cols-2' : ''
              }`}
            >
              <QuorumProgress
                voted={cast}
                required={required}
                quorumMet={tally?.quorumMet ?? false}
              />

              {hasDeadline && motion.closesAt && (
                <TimeRemaining closesAt={motion.closesAt} />
              )}
            </div>
          </MotionCard>

          <SilenceCallout
            required={required}
            total={motion.electorateSize}
            closesAt={motion.closesAt}
          />

          <MotionCard>
            <MotionDetails motion={motion} />
          </MotionCard>

          <ViewDiscussion
            circleId={circleId}
            messageCount={messagesData?.getMessages?.total ?? null}
          />
        </div>
      </div>
    </div>
  );
}
