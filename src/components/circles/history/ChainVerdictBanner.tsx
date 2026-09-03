'use client';

import { ShieldAlert, ShieldCheck, ShieldQuestion } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { ChainVerdict } from './auditEventCopy';

/**
 * The chain verdict, stated at the top of the decision history.
 *
 * ── WHY THIS IS A FULL-WIDTH CALLOUT AND NOT A GREEN TICK ───────────────────
 * The trail is hash-chained so that a circle can PROVE it decided something —
 * the defence when a removed member claims the platform ejected them. A broken
 * chain is the single most important thing this screen can tell anyone, and a
 * tick in a corner is how important findings get skimmed past. So all three
 * verdicts get the same prominent shape and the reader compares words, not
 * icon colours.
 *
 * ── THREE STATES, NEVER TWO ─────────────────────────────────────────────────
 * "We could not check" is not "verified" and it is not "broken". The gateway
 * returns `chainVerified: false` both when the chain is genuinely broken AND
 * when circle-service is unreachable — deliberately, because it will not assert
 * a verification it did not perform. Rendering the unreachable case as tampering
 * would cry wolf on every restart; rendering it as verified would present an
 * unchecked page as proof. See `chainVerdict()` for how the two are separated.
 *
 * Styling follows `SilenceCallout`: a coloured accent bar over
 * `surface-subtle` with `text-text-primary`, the one pairing documented as
 * legible in both themes. The bar carries no information, so its contrast never
 * has to be read. Note `border-success` / `border-warning` / `border-info` are
 * all RED from a globals.css bug — the accent uses `text-*` tokens instead.
 */
const VERDICT_STYLE: Record<
  ChainVerdict,
  { accent: string; icon: typeof ShieldCheck; iconClass: string }
> = {
  VERIFIED: {
    accent: 'border-text-success',
    icon: ShieldCheck,
    iconClass: 'text-text-success',
  },
  BROKEN: {
    accent: 'border-text-danger',
    icon: ShieldAlert,
    iconClass: 'text-text-danger',
  },
  UNCHECKED: {
    accent: 'border-border-darker',
    icon: ShieldQuestion,
    iconClass: 'text-text-secondary',
  },
};

const VERDICT_KEY: Record<ChainVerdict, string> = {
  VERIFIED: 'verified',
  BROKEN: 'broken',
  UNCHECKED: 'unchecked',
};

export interface ChainVerdictBannerProps {
  verdict: ChainVerdict;
  className?: string;
}

export function ChainVerdictBanner({ verdict, className }: ChainVerdictBannerProps) {
  const t = useTranslations('circles.history.chain');

  const style = VERDICT_STYLE[verdict];
  const key = VERDICT_KEY[verdict];
  const Icon = style.icon;

  return (
    <aside
      className={`rounded-xl border-l-4 ${style.accent} bg-surface-subtle px-4 py-4 ${className ?? ''}`}
      // A broken chain is an alert in the accessibility sense too: it is a
      // finding about the integrity of the record, not a status decoration.
      role={verdict === 'BROKEN' ? 'alert' : undefined}
    >
      <div className="flex items-start gap-2.5">
        <Icon aria-hidden="true" className={`mt-0.5 size-4 shrink-0 ${style.iconClass}`} />
        <div className="min-w-0">
          <p className="label-medium text-text-primary">{t(`${key}.title`)}</p>
          <p className="body-small mt-1 text-text-primary">{t(`${key}.body`)}</p>
        </div>
      </div>
    </aside>
  );
}
