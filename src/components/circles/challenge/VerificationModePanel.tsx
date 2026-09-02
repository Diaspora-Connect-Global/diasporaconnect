'use client';

import type { ComponentType } from 'react';
import { useTranslations } from 'next-intl';
import { HeartHandshake, Lock, UserCheck, Vote } from 'lucide-react';

import type { CircleVerificationMode } from '@/services/gql/types/circles';

/**
 * Each mode's glyph and its two message keys, in the members' own words.
 *
 * The copy matters as much as the mechanism: these three modes ARE the
 * platform-never-adjudicates rule made concrete. The product does not decide
 * whether someone really ran the ten kilometres — the circle does, in one of
 * three ways it chose for itself — so the panel names the people who decide
 * ("we trust each other", "the lead confirms", "the circle votes") rather than
 * describing a system that verifies anything.
 */
const MODE_PRESENTATION: Record<
  CircleVerificationMode,
  { icon: ComponentType<{ className?: string }>; label: string; description: string }
> = {
  HONOUR: {
    icon: HeartHandshake,
    label: 'challenge.verification.trustLabel',
    description: 'challenge.verification.trustDescription',
  },
  LEAD_CONFIRMS: {
    icon: UserCheck,
    label: 'challenge.verification.leadLabel',
    description: 'challenge.verification.leadDescription',
  },
  CIRCLE_CONFIRMS: {
    icon: Vote,
    label: 'challenge.verification.voteLabel',
    description: 'challenge.verification.voteDescription',
  },
};

export interface VerificationModePanelProps {
  mode: CircleVerificationMode | null | undefined;
}

/**
 * The locked verification mode.
 *
 * The lock is not decorative and not a permission check the UI is performing:
 * `verificationMode` is frozen server-side the moment a challenge leaves DRAFT,
 * so this panel is a read-only statement of something already settled. It
 * therefore offers no affordance to change it — no disabled control, no
 * "request change" — because a control that could never succeed reads as a
 * missing permission rather than a decision the circle already made.
 *
 * A challenge with no mode renders nothing rather than guessing at a default;
 * claiming the wrong adjudication rule is worse than staying quiet.
 */
export function VerificationModePanel({ mode }: VerificationModePanelProps) {
  const t = useTranslations('circles');

  if (!mode || !MODE_PRESENTATION[mode]) return null;

  const { icon: Icon, label, description } = MODE_PRESENTATION[mode];

  return (
    <section className="mt-6">
      <h2 className="label-medium text-text-primary">
        {t('challenge.verificationTitle')}
      </h2>

      <div className="mt-2 rounded-2xl border border-border-subtle p-4">
        <div className="flex items-start gap-3">
          <Icon className="mt-0.5 size-4 shrink-0 text-text-primary" />

          <div className="min-w-0 flex-1">
            <p className="label-small text-text-primary">{t(label)}</p>
            <p className="body-small mt-1 text-text-secondary">
              {t(description)}
            </p>
          </div>

          <Lock
            aria-hidden="true"
            className="mt-0.5 size-4 shrink-0 text-text-secondary"
          />
        </div>
      </div>

      {/*
        `surface-brand-light` is the SAME light blue in both themes, so it is
        only legible against `text-text-brand` (navy) — never `text-primary`,
        which inverts to near-white in dark mode.
      */}
      <p className="body-small mt-3 rounded-2xl bg-surface-brand-light px-4 py-3 text-text-brand">
        {t('challenge.lockNote')}
      </p>
    </section>
  );
}
