'use client';

import { Pin } from 'lucide-react';
import { useTranslations } from 'next-intl';

/**
 * The one caveat this screen cannot be read safely without.
 *
 * ── WHY IT IS WORTH THE SPACE ───────────────────────────────────────────────
 * A motion carries its OWN pinned rule, copied out of the live rule at the
 * moment it opened, and it is tallied against that copy forever. This screen
 * shows TODAY's rules. The two are the same thing right up until somebody
 * amends a rule, and from then on they differ for every motion already in
 * flight.
 *
 * Without this line the screen reads as "the rules governing everything here",
 * and a member checking why an open vote needs 8 of 12 when the card in front
 * of them says "more than half" would reasonably conclude the platform is
 * miscounting. It is not: their motion pinned 2/3 before the amendment landed.
 * That pinning is the guarantee that passing a motion to lower the majority
 * cannot retroactively flip a vote already under way — the property the whole
 * governance model rests on — so the screen that could most easily obscure it
 * is the screen that has to state it.
 *
 * Presented as an accent callout rather than a footnote for the same reason
 * `SilenceCallout` is: `surface-subtle` with `text-text-primary` is the pairing
 * documented as legible in both themes, and the coloured bar carries no
 * information, so its contrast never has to be read. (`border-warning` and
 * `border-info` are both RED from a globals.css bug — never reach for them.)
 */
export interface PinnedRuleNoticeProps {
  className?: string;
}

export function PinnedRuleNotice({ className }: PinnedRuleNoticeProps) {
  const t = useTranslations('circles.governance.pinned');

  return (
    <aside
      className={`rounded-xl border-l-4 border-text-brand bg-surface-subtle px-4 py-4 ${className ?? ''}`}
    >
      <div className="flex items-start gap-2.5">
        <Pin aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-text-brand" />
        <div className="min-w-0">
          <p className="label-medium text-text-primary">{t('title')}</p>
          <p className="body-small mt-1 text-text-primary">{t('body')}</p>
        </div>
      </div>
    </aside>
  );
}
