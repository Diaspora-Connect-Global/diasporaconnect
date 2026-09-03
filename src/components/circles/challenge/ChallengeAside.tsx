'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Lock } from 'lucide-react';

import { ProgressWithLabel } from '@/components/circles/primitives';
import type {
  CircleChallenge,
  CircleChallengeCadence,
  CircleChallengeEntry,
} from '@/services/gql/types/circles';

import { challengeStatePresentation } from './challengeState';
import { deriveMyProgress } from './myProgress';
import { SubmitEntryForm } from './SubmitEntryForm';
import { verificationModePresentation } from './verificationMode';

const KNOWN_CADENCES: readonly CircleChallengeCadence[] = [
  'ONE_OFF',
  'DAILY',
  'WEEKLY',
  'MONTHLY',
];

/**
 * The cadence, guaranteed to name a message key that exists.
 *
 * The per-period caption is keyed by cadence, so a cadence added to the backend
 * before this catalogue would otherwise reach `t()` as a missing key — which
 * next-intl surfaces as the raw path in the UI. ONE_OFF is the safe fallback
 * for the same reason `periodKeyFor` uses it: it is the only cadence with no
 * recurring period, so it under-claims rather than naming the wrong window.
 */
function cadenceKey(
  cadence: CircleChallengeCadence | null | undefined,
): CircleChallengeCadence {
  return cadence && KNOWN_CADENCES.includes(cadence) ? cadence : 'ONE_OFF';
}

export interface ChallengeAsideProps {
  circleId: string;
  challenge: CircleChallenge;
  /** Every entry loaded for this challenge; filtered to the viewer here. */
  entries: readonly CircleChallengeEntry[];
  /** Null while the session is still resolving — the CTA waits rather than lying. */
  currentUserId: string | null;
  /** Suppresses the CTA until the viewer's entries are known. */
  loading?: boolean;
}

/**
 * "About this challenge" — the rule, the padlock, your standing, and the CTA.
 *
 * The side panel explains the *mechanism* while the main column reports the
 * *facts*: the left says which mode is locked in, the right says what that mode
 * actually means for the person reading it and then offers the one action the
 * screen has. That split is why the lock note lives here rather than under the
 * verification block — it is an explanation of why the block has no controls,
 * not a caption on the block itself.
 */
export function ChallengeAside({
  circleId,
  challenge,
  entries,
  currentUserId,
  loading = false,
}: ChallengeAsideProps) {
  const t = useTranslations('circles.challenge');
  const locale = useLocale();

  const presentation = verificationModePresentation(challenge.verificationMode);
  const state = challengeStatePresentation(challenge.status);
  const progress = deriveMyProgress(challenge, entries, currentUserId);
  const hasPoints = progress !== null && progress.points !== null && progress.points > 0;

  return (
    <div className="rounded-2xl border border-border-subtle p-5">
      <h2 className="label-medium text-text-primary">{t('aboutTitle')}</h2>

      {/*
        Absent when the wire named a mode this client cannot map. Saying nothing
        beats explaining the wrong adjudication rule — see `verificationMode.ts`.
      */}
      {presentation && (
        <p className="body-small mt-2 text-text-secondary">
          {t(presentation.about)}
        </p>
      )}

      {/*
        `surface-brand-light` is the SAME light blue in both themes, so it is
        only legible against `text-text-brand` (navy) — never `text-primary`,
        which inverts to near-white in dark mode.
      */}
      <p className="body-small mt-4 flex items-start gap-2 rounded-2xl bg-surface-brand-light px-4 py-3 text-text-brand">
        <Lock aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        <span>{t('lockNote')}</span>
      </p>

      {progress && (
        <div className="mt-5">
          {progress.percent === null ? (
            /*
             * No `maxEntriesPerPeriod` means no denominator, and a bar with an
             * invented one would put a number on screen that nothing enforces.
             * The count alone is the whole truth available.
             */
            <>
              <p className="label-small text-text-primary">
                {t('yourProgressTitle')}
              </p>
              <p className="body-small mt-1 text-text-secondary">
                {progress.total === 0
                  ? t('yourProgressNone')
                  : t('yourProgressLogged', { count: progress.total })}
              </p>
            </>
          ) : (
            <ProgressWithLabel
              value={progress.percent}
              label={t('yourProgressTitle')}
              showPercentage={false}
              caption={t(`yourProgressCap.${cadenceKey(challenge.cadence)}`, {
                done: progress.loggedThisPeriod,
                cap: progress.cap ?? 0,
              })}
            />
          )}

          {(hasPoints || progress.pending > 0 || progress.claimed !== null) && (
            <ul className="mt-2 space-y-1">
              {hasPoints && (
                <li className="caption-small text-text-secondary">
                  {t('yourProgressPoints', { points: progress.points ?? 0 })}
                </li>
              )}
              {progress.pending > 0 && (
                <li className="caption-small text-text-secondary">
                  {t('yourProgressPending', { count: progress.pending })}
                </li>
              )}
              {progress.claimed !== null && (
                <li className="caption-small text-text-secondary">
                  {/*
                    Unitless: a challenge carries no `metricKind`, so this is the
                    number the member logged and nothing more — appending "books"
                    would be reading the title as a schema. See `myProgress.ts`.
                  */}
                  {t('yourProgressClaimed', {
                    total: new Intl.NumberFormat(locale).format(progress.claimed),
                  })}
                </li>
              )}
            </ul>
          )}
        </div>
      )}

      <div className="mt-5">
        <SubmitEntryForm
          circleId={circleId}
          challenge={challenge}
          entries={entries}
          currentUserId={currentUserId}
          loading={loading}
        />

        {/*
          `SubmitEntryForm` renders nothing unless the challenge is ACTIVE, and
          a CTA that simply is not there reads as a permission the member lacks.
          The lifecycle says otherwise, so it says so out loud.
        */}
        {state && (
          <p className="body-small text-text-secondary">{t(state.note)}</p>
        )}
      </div>
    </div>
  );
}
