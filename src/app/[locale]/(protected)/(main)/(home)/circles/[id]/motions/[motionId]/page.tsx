'use client';

import { useQuery } from '@apollo/client/react';
import { ArrowLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';

import {
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
import { FEED_COLUMN_CLASS } from '@/lib/feedColumnLayout';
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

function MotionSkeleton() {
  return (
    <div className="flex flex-col gap-6 py-2">
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-4 w-20" />
      </div>
      <Skeleton className="h-7 w-3/4" />
      <div className="flex items-center gap-2">
        <Skeleton className="size-8 shrink-0 rounded-full" />
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-40" />
        </div>
      </div>
      <Skeleton className="h-12 w-full" />
      <div className="flex gap-3">
        <Skeleton className="h-20 flex-1 rounded-xl" />
        <Skeleton className="h-20 flex-1 rounded-xl" />
        <Skeleton className="h-20 flex-1 rounded-xl" />
      </div>
      <Skeleton className="h-24 w-full rounded-xl" />
      <Skeleton className="h-32 w-full rounded-xl" />
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
   * Back arrow + page title, matching the app's detail-screen chrome. The arrow
   * is icon-only and carries a generic accessible name rather than the title:
   * labelling it "Motion details" would announce it as a link TO this page,
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
      <span className="label-large text-text-primary">{t('title')}</span>
    </div>
  );

  if (motionLoading && !motion) {
    return (
      <div className="h-app-inner flex overflow-hidden">
        <div className={FEED_COLUMN_CLASS}>
          {header}
          <MotionSkeleton />
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
        <div className={FEED_COLUMN_CLASS}>
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

  return (
    <div className="h-app-inner flex overflow-hidden">
      <div className={FEED_COLUMN_CLASS}>
        {header}

        <div className="flex flex-col gap-6 py-4">
          <MotionHeader motion={motion} />

          <VotePanel
            circleId={circleId}
            motionId={motion.id}
            isOpen={isMotionOpen(motion)}
            closesAt={motion.closesAt}
            isOutsideElectorate={isOutsideElectorate}
            opensAt={motion.opensAt}
            memberJoinedAt={myJoinedAt}
          />

          {/*
            While a motion is OPEN the live tally is the truth; once it is
            decided the outcome columns are the record that was written once, at
            tally, from the pinned thresholds — and never touched again.
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

          <QuorumProgress
            voted={cast}
            required={required}
            quorumMet={tally?.quorumMet ?? false}
          />

          {motion.closesAt && <TimeRemaining closesAt={motion.closesAt} />}

          <SilenceCallout
            required={required}
            total={motion.electorateSize}
            closesAt={motion.closesAt}
          />

          <MotionDetails motion={motion} />

          <ViewDiscussion
            circleId={circleId}
            messageCount={messagesData?.getMessages?.total ?? null}
          />
        </div>
      </div>
    </div>
  );
}
