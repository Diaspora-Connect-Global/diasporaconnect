'use client';

import { Info } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { formatDeadline } from './formatDeadline';

export interface SilenceCalloutProps {
  /** Ballots this motion's own pinned quorum needs. */
  required: number;
  /** The electorate PINNED when the motion opened, not today's member count. */
  total: number;
  /** The motion's pinned `closesAt`. */
  closesAt?: string | null;
}

/**
 * The guarantee the whole feature exists to make: not voting is not agreeing.
 *
 * Deliberately given a full-width card and 16px type rather than the muted
 * caption a legal footnote would get. A member who reads nothing else on this
 * screen should still leave knowing that letting the window run out changes
 * nothing.
 *
 * ── WHY IT CARRIES NO COLOUR ────────────────────────────────────────────────
 * Both lines sit at `text-text-primary` on `surface-subtle`, the one pairing
 * documented as legible in both themes. A warning tint was the obvious
 * alternative and is wrong twice over: nothing here has gone wrong, and the
 * semantic border tokens (`--border-warning`, `--border-success`,
 * `--border-info`) all resolve to the same red, so an "accent" bar would read
 * as an error. The prominence comes from size and position instead.
 *
 * ── THE NUMBERS ARE THE MOTION'S OWN ────────────────────────────────────────
 * `required` and `total` are the pinned quorum fraction over the pinned
 * electorate, and `closesAt` is pinned too. A sentence promising what happens
 * at the deadline has to be stated in the terms this vote is actually bound by.
 */
export function SilenceCallout({
  required,
  total,
  closesAt,
}: SilenceCalloutProps) {
  const t = useTranslations('circles.motion.callout');
  const locale = useLocale();

  /*
   * ── THE SENTENCE MUST NEVER HAVE A HOLE IN IT ─────────────────────────────
   * `formatDeadline` returns '' for a missing OR unparseable `closesAt`, and
   * this callout — unlike `TimeRemaining` — is rendered unconditionally,
   * because the promise it makes holds whether or not we can name the hour.
   * Interpolating the empty string produced "If fewer than 4 of 6 vote by ,
   * nothing changes." on the one paragraph of this screen that has to be
   * trusted absolutely.
   *
   * So there are two sentences and the deadline decides which. The variant
   * without one says "before voting closes" — vaguer, and TRUE, which is the
   * only property that matters here. Dropping the callout instead was the
   * other option and is the wrong one: a motion whose deadline we cannot
   * render is precisely a motion whose reader still needs telling that
   * silence changes nothing.
   */
  const deadline = formatDeadline(closesAt, locale, 'long');

  return (
    <aside className="flex items-start gap-3 rounded-2xl bg-surface-subtle px-4 py-4 sm:px-5 sm:py-5">
      <Info
        aria-hidden="true"
        className="mt-0.5 size-5 shrink-0 text-text-primary"
      />
      <div className="min-w-0 max-w-prose">
        <p className="label-medium text-text-primary">
          {deadline
            ? t('failNotice', { required, total, deadline })
            : t('failNoticeNoDeadline', { required, total })}
        </p>
        <p className="body-medium mt-1.5 text-text-primary">{t('silence')}</p>
      </div>
    </aside>
  );
}
