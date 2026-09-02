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
    <header className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <MotionStatusPill status={motion.status} />
        <span className="caption-small text-text-secondary">
          {t('number', { number: motion.motionNumber })}
        </span>
      </div>

      {motion.title && (
        <h1 className="heading-xsmall text-text-primary">{motion.title}</h1>
      )}

      {motion.proposedBy && (
        <div className="flex items-center gap-2">
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
            <p className="label-small text-text-primary">
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
        <p className="body-medium whitespace-pre-line text-text-primary">
          {motion.rationale}
        </p>
      )}

      {/*
        A PASSED motion that could not be applied (over an entitlement cap, the
        subject already left) comes back as a normal result with
        `enactmentError` set, NOT as a GraphQL error. The circle decided and the
        decision did not land — swallowing that would leave the circle believing
        something happened that did not.
      */}
      {motion.status === 'ENACTMENT_FAILED' && motion.enactmentError && (
        <p className="body-small rounded-lg bg-surface-danger px-3 py-2 text-text-danger">
          {motion.enactmentError}
        </p>
      )}
    </header>
  );
}
