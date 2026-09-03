'use client';

import { Vote } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';

export interface GovernanceCalloutProps {
  className?: string;
}

/**
 * The single most important thing on this screen.
 *
 * Every members list a user has ever seen carries a remove control, so the
 * absence of one here reads as a missing feature unless the screen says why it
 * is missing. It is not missing: a circle governs itself, the platform supplies
 * the voting machinery and never adjudicates, and a membership row can only
 * reach REMOVED with the id of the motion that removed it attached. This
 * sentence is the whole product rule, in the one place someone goes looking for
 * the button that does not exist.
 *
 * Rendered as a neutral panel rather than a warning: it states how the circle
 * works, and painting it as danger copy would frame self-governance as an
 * obstacle. The only colour on this screen is the Lead status chip.
 */
export function GovernanceCallout({ className }: GovernanceCalloutProps) {
  const t = useTranslations('circles.members');

  return (
    <aside
      className={cn(
        'flex items-start gap-3 rounded-xl border border-border-subtle bg-surface-subtle p-4',
        className,
      )}
    >
      <Vote className="mt-0.5 size-5 shrink-0 text-text-primary" aria-hidden="true" />
      <p className="body-medium text-text-primary">{t('governanceNote')}</p>
    </aside>
  );
}
