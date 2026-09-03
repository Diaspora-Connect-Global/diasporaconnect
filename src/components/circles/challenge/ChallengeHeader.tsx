'use client';

import { useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Flag } from 'lucide-react';

import { StatusPill } from '@/components/circles/primitives';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { circleUserDisplayName, type CircleUser } from '@/hooks/useCircleUsers';
import type { CircleChallenge } from '@/services/gql/types/circles';

import { challengeStatePresentation } from './challengeState';

export interface ChallengeHeaderProps {
  challenge: CircleChallenge;
  /** Resolved profile for `challenge.createdBy`, or undefined while it loads. */
  starter: CircleUser | undefined;
}

/**
 * What this is, who started it, when — and what it is called.
 *
 * The kind pill leads because a challenge, a project and a motion all look
 * alike at a glance and behave nothing alike. Beside it sits the lifecycle
 * state, but ONLY when the challenge is not ACTIVE: an "Active" pill next to a
 * live "I'm in!" button says nothing the button does not already say, while a
 * CLOSED or CANCELLED challenge has to announce itself or the missing CTA reads
 * as a permission the member lacks.
 */
export function ChallengeHeader({ challenge, starter }: ChallengeHeaderProps) {
  const t = useTranslations('circles.challenge');
  const tCommon = useTranslations('circles.common');
  const locale = useLocale();

  const state = challengeStatePresentation(challenge.status);

  /*
   * `startsAt` is when the challenge actually began; `createdAt` is only when
   * the row was written. They differ for a challenge proposed by motion, which
   * exists as a DRAFT for the length of the vote — so "Started by … · <date>"
   * must prefer the former or it dates the challenge to its proposal.
   */
  const startedOn = useMemo(() => {
    const iso = challenge.startsAt ?? challenge.createdAt;
    if (!iso) return '';
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat(locale, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date);
  }, [challenge.startsAt, challenge.createdAt, locale]);

  const starterName = circleUserDisplayName(starter, tCommon('loading'));

  return (
    <header>
      <div className="flex flex-wrap items-center gap-2">
        <StatusPill
          variant="brand"
          icon={<Flag aria-hidden="true" />}
          label={t('title')}
        />

        {state && <StatusPill variant={state.variant} label={t(state.label)} />}

        {challenge.createdBy && (
          <div className="flex min-w-0 items-center gap-2">
            <Avatar className="size-5 shrink-0 border border-border-subtle">
              <AvatarImage src={starter?.avatarUrl ?? undefined} alt="" />
              <AvatarFallback className="caption-small bg-surface-subtle text-text-primary">
                {(starterName.charAt(0) || '?').toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <p className="caption-small min-w-0 truncate text-text-secondary">
              {tCommon('startedBy', { name: starterName })}
              {/*
                A raw middle dot rather than a message key: it is punctuation,
                not prose, and the two halves either side of it are already
                translated on their own.
              */}
              {startedOn && ` · ${startedOn}`}
            </p>
          </div>
        )}
      </div>

      <h1 className="heading-small mt-3 text-text-primary">
        {challenge.title}
      </h1>

      {challenge.description && (
        <p className="body-medium mt-2 whitespace-pre-line text-text-secondary">
          {challenge.description}
        </p>
      )}
    </header>
  );
}
