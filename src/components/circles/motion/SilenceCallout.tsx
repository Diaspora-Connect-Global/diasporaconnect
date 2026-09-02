'use client';

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
 * Deliberately given a full-width card, a 4px accent and 16px type rather than
 * the muted caption a legal footnote would get. A member who reads nothing else
 * on this screen should still leave knowing that letting the window run out
 * changes nothing.
 *
 * Both lines sit at `text-text-primary` on `surface-subtle`, the one pairing
 * documented as legible in both themes. The accent bar carries the colour, and
 * carries no information, so its contrast never has to be read.
 */
export function SilenceCallout({
  required,
  total,
  closesAt,
}: SilenceCalloutProps) {
  const t = useTranslations('circles.motion.callout');
  const locale = useLocale();

  const deadline = formatDeadline(closesAt, locale, 'long');

  return (
    <aside className="rounded-xl border-l-4 border-text-danger bg-surface-subtle px-4 py-4">
      <p className="label-medium text-text-primary">
        {t('failNotice', { required, total, deadline })}
      </p>
      <p className="body-medium mt-2 text-text-primary">{t('silence')}</p>
    </aside>
  );
}
