'use client';

import { useLocale, useTranslations } from 'next-intl';

import { AvatarGroup } from '@/components/circles/primitives';
import { useCircleUser, circleUserDisplayName } from '@/hooks/useCircleUsers';
import { formatChatTimestamp } from '@/macros/time';
import type { CircleMotion } from '@/services/gql/types/circles';

import { MotionStatusPill } from './MotionStatusPill';

export interface MotionHeaderProps {
  motion: CircleMotion;
}

/**
 * Status + number, title, proposer and rationale — everything above the fold on
 * the motion screen except the vote itself.
 */
export function MotionHeader({ motion }: MotionHeaderProps) {
  const t = useTranslations('circles.motion');
  const tCommon = useTranslations('circles.common');
  const locale = useLocale();

  const { user: proposer } = useCircleUser(motion.proposedBy);

  // `circleUserDisplayName`'s fallback is meant to read as a loading gap rather
  // than as a claim that the person does not exist — "Proposed by Loading..."
  // does that, and needs no message key of its own.
  const proposerName = circleUserDisplayName(proposer, tCommon('loading'));

  // `opensAt` is pinned at open time, so this is when the vote actually started
  // and not merely when the row was written.
  const openedAt = motion.opensAt ?? motion.createdAt ?? null;

  return (
    <header className="flex min-w-0 flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <MotionStatusPill status={motion.status} />
        {/*
          The motion number is a stable handle people quote to each other
          ("go and vote on #12"), so it is selectable text and sits at the
          opposite edge from the status rather than trailing it — a member
          scanning for a number should always find it in the same place.
        */}
        <span className="caption-small shrink-0 tabular-nums text-text-secondary">
          {t('number', { number: motion.motionNumber })}
        </span>
      </div>

      {motion.title && (
        <h1 className="heading-xsmall sm:heading-small text-balance text-text-primary">
          {motion.title}
        </h1>
      )}

      {motion.proposedBy && (
        <div className="flex items-center gap-3">
          <AvatarGroup
            size="md"
            users={[
              {
                id: motion.proposedBy,
                name: proposerName,
                avatarUrl: proposer?.avatarUrl,
              },
            ]}
          />
          <div className="min-w-0">
            <p className="label-small truncate text-text-primary">
              {tCommon('proposedBy', { name: proposerName })}
            </p>
            {openedAt && (
              <p className="caption-small text-text-secondary">
                {formatChatTimestamp(openedAt, { locale })}
              </p>
            )}
          </div>
        </div>
      )}

      {motion.rationale && (
        // Capped at a reading measure rather than the card's full width: on a
        // wide desktop an uncapped paragraph runs past 120 characters a line,
        // which is where the eye starts losing its place returning to the left.
        <p className="body-medium max-w-prose whitespace-pre-line text-text-primary">
          {motion.rationale}
        </p>
      )}

      {/*
        A PASSED motion that could not be applied (over an entitlement cap, the
        subject already left) comes back as a normal result with
        `enactmentError` set, NOT as a GraphQL error. The circle decided and the
        decision did not land — swallowing that would leave the circle believing
        something happened that did not.

        ── WHY THERE IS A LEAD-IN AND WHY IT PROMISES NOTHING ─────────────────
        `enactmentError` alone is operator English ("MAX_MEMBERS_LIMIT_REACHED
        (limit=25, usage=25)") presented bare, which reads as though the VOTE
        failed. The lead-in states the two facts that are true and separates
        them: the circle passed this, and applying it did not work.

        It deliberately does NOT say "we'll try again". A leader-locked sweeper
        does retry PASSED motions every few minutes, but it gives up after a
        fixed number of attempts and `enactmentAttempts` is NOT exposed on
        `CircleMotionType` — so this screen genuinely cannot tell "retrying
        shortly" from "permanently given up". Promising a retry we cannot see
        the budget for would be a guess dressed as a status, and the member
        would wait for something that is never coming. The overflow menu offers
        the manual apply instead, which works either way.
      */}
      {motion.status === 'ENACTMENT_FAILED' && motion.enactmentError && (
        <div className="rounded-xl bg-surface-danger px-3 py-2.5">
          <p className="label-small text-text-danger">
            {t('enactmentFailedLead')}
          </p>
          <p className="body-small mt-1 text-text-danger">
            {motion.enactmentError}
          </p>
        </div>
      )}
    </header>
  );
}
