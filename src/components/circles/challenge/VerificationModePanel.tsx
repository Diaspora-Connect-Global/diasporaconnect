'use client';

import { useTranslations } from 'next-intl';
import { Lock } from 'lucide-react';

import { verificationModePresentation } from './verificationMode';

export interface VerificationModePanelProps {
  /**
   * Raw `challenge.verificationMode` — pass it through untouched.
   *
   * Typed as a plain string rather than `CircleVerificationMode` on purpose:
   * the wire carries two spellings for this enum and the point of this panel is
   * that it reads both. Narrowing here would push the trap back out to callers.
   */
  mode: string | null | undefined;
}

/**
 * The locked verification mode.
 *
 * The padlock is not decorative and it is not a permission check the UI is
 * performing: `verificationMode` is frozen server-side the moment a challenge
 * leaves DRAFT, so this panel is a read-only statement of something already
 * settled. It therefore offers no affordance to change it — no disabled
 * control, no "request change" — because a control that could never succeed
 * reads as a missing permission rather than as a decision the circle already
 * made for itself.
 *
 * A challenge whose mode this client cannot name renders nothing rather than
 * guessing at a default; claiming the wrong adjudication rule is worse than
 * staying quiet. See `verificationMode.ts` for which spellings are recognised
 * and why the lookup goes through a normaliser.
 */
export function VerificationModePanel({ mode }: VerificationModePanelProps) {
  const t = useTranslations('circles.challenge');

  const presentation = verificationModePresentation(mode);
  if (!presentation) return null;

  const { icon: ModeIcon, label, description } = presentation;

  return (
    <section className="mt-8">
      <h2 className="label-medium text-text-primary">
        {t('verificationTitle')}
      </h2>

      <div className="mt-3 flex items-start gap-3 rounded-2xl border border-border-subtle p-4">
        <span
          aria-hidden="true"
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-subtle text-text-primary"
        >
          <Lock className="size-4" />
        </span>

        <div className="min-w-0 flex-1">
          <p className="label-small flex items-center gap-2 text-text-primary">
            <ModeIcon className="size-4 shrink-0 text-text-secondary" />
            {t(label)}
          </p>
          <p className="body-small mt-1 text-text-secondary">{t(description)}</p>
        </div>
      </div>
    </section>
  );
}
